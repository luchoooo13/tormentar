/**
 * usePushNotifications Hook
 * Notificaciones PUSH reales (Web Push): a diferencia de
 * useWeatherNotifications (que solo suena mientras la pestana del
 * navegador esta abierta), estas llegan al celular/notebook aunque
 * el navegador este cerrado, usando un Service Worker + el estandar
 * Push API (VAPID). Es lo mismo que usan Gmail, WhatsApp Web, etc.
 * para notificarte sin tener la pestana abierta.
 *
 * Solo tiene sentido en web: la app nativa (Android/iOS) ya usa
 * notificaciones push nativas via expo-notifications.
 */
import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { trpc } from "@/lib/trpc";

const PUSH_ENABLED_KEY = "tormentar_push_enabled";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function isPushSupported(): boolean {
  return (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export function usePushNotifications() {
  const [supported] = useState(isPushSupported());
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const publicKeyQuery = trpc.push.publicKey.useQuery(undefined, { enabled: supported });
  const subscribeMutation = trpc.push.subscribe.useMutation();
  const unsubscribeMutation = trpc.push.unsubscribe.useMutation();
  const notifyMutation = trpc.push.notify.useMutation();

  // Al montar: si ya habia una suscripcion activa (de una sesion
  // anterior), reflejarlo en el estado sin volver a pedir permiso.
  useEffect(() => {
    if (!supported) return;
    (async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        const existing = await registration?.pushManager.getSubscription();
        if (existing) setEnabled(true);
      } catch (e) {
        console.error("[Push] Error revisando suscripcion existente:", e);
      }
    })();
  }, [supported]);

  const enablePush = useCallback(async () => {
    if (!supported) {
      setError("Este navegador no soporta notificaciones push.");
      return false;
    }

    setLoading(true);
    setError(undefined);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Permiso de notificaciones denegado.");
        setLoading(false);
        return false;
      }

      let registration;
      try {
        registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;
      } catch (regErr) {
        console.warn("[Push] Error registrando /sw.js, intentando ruta relativa:", regErr);
        registration = await navigator.serviceWorker.register("sw.js", { scope: "./" });
        await navigator.serviceWorker.ready;
      }

      let publicKey = publicKeyQuery.data?.publicKey;
      if (!publicKey) {
        const result = await publicKeyQuery.refetch();
        publicKey = result.data?.publicKey;
      }
      if (!publicKey) {
        throw new Error("No se pudo obtener la clave publica del servidor.");
      }

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Suscripcion invalida.");
      }

      await subscribeMutation.mutateAsync({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });

      await AsyncStorage.setItem(PUSH_ENABLED_KEY, "true");
      setEnabled(true);
      setLoading(false);
      return true;
    } catch (e) {
      console.error("[Push] Error activando notificaciones push:", e);
      setError(e instanceof Error ? e.message : "No se pudo activar las notificaciones push.");
      setLoading(false);
      return false;
    }
  }, [supported, publicKeyQuery, subscribeMutation]);

  const disablePush = useCallback(async () => {
    if (!supported) return;
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await unsubscribeMutation.mutateAsync({ endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
      await AsyncStorage.setItem(PUSH_ENABLED_KEY, "false");
      setEnabled(false);
    } catch (e) {
      console.error("[Push] Error desactivando notificaciones push:", e);
    } finally {
      setLoading(false);
    }
  }, [supported, unsubscribeMutation]);

  // Manda la notificacion push a todos los dispositivos suscriptos,
  // ademas de la notificacion local que ya se muestra en la pestana
  // que detecto la alerta. Best-effort: si falla, no rompe la app.
  const sendPush = useCallback(
    (payload: { title: string; body: string; severity?: string; alertId?: string }) => {
      if (!supported) return;
      notifyMutation.mutate(payload);
    },
    [supported, notifyMutation]
  );

  return { supported, enabled, loading, error, enablePush, disablePush, sendPush };
}
