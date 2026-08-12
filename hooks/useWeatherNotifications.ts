/**
 * useWeatherNotifications Hook
 * Hook para manejar notificaciones de alertas de clima
 */

import { useCallback, useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { Audio } from "expo-av";
import { Platform } from "react-native";
import type { WeatherAlert, AlertSeverity } from "@/shared/types/weather";

if (typeof window !== "undefined" && typeof document !== "undefined") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export function useWeatherNotifications() {
  const soundRef = useRef<Audio.Sound | null>(null);

  // FIX: envuelto en useCallback. Antes esta funcion se recreaba en
  // cada render, lo que rompia la dependencia [sendNotification] de
  // fetchAlerts en useAlerts.ts y generaba un loop de fetches en
  // cadena (cada render -> nueva funcion -> efecto se dispara de
  // nuevo -> nuevo render...). Eso causaba fetches superpuestos que
  // hacian reaparecer el popup de alerta justo despues de cerrarlo.
  const requestPermissions = useCallback(async () => {
    try {
      if (Platform.OS === "web") {
        if (typeof Notification === "undefined") return false;
        if (Notification.permission === "granted") return true;
        if (Notification.permission === "denied") return false;
        const permission = await Notification.requestPermission();
        return permission === "granted";
      }

      const { status: existing } = await Notifications.getPermissionsAsync();
      if (existing === "granted") return true;
      const { status } = await Notifications.requestPermissionsAsync();
      return status === "granted";
    } catch (error) {
      console.error("Error requesting notification permissions:", error);
      return false;
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: false,
        });
      } catch (error) {
        console.error("Error setting audio mode:", error);
      }
    };

    setupAudio();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const getNotificationConfig = useCallback((severity: AlertSeverity) => {
    const configs: Record<AlertSeverity, any> = {
      leve: {
        title: "⚠️ Alerta de Clima Leve",
        sound: null,
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
      },
      moderada: {
        title: "⚠️ Alerta de Clima Moderada",
        sound: "default",
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      severa: {
        title: "🚨 ALERTA DE TORMENTA FUERTE",
        sound: "alert",
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
    };
    return configs[severity];
  }, []);

  const playAlertSound = useCallback(async (severity: AlertSeverity) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
      }

      let soundUri: string;

      if (severity === "severa") {
        soundUri = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
      } else if (severity === "moderada") {
        soundUri = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
      } else {
        return;
      }

      const { sound } = await Audio.Sound.createAsync({ uri: soundUri });
      soundRef.current = sound;

      await sound.playAsync();
    } catch (error) {
      console.error("Error playing alert sound:", error);
    }
  }, []);

  const sendNotification = useCallback(
    async (alert: WeatherAlert, options?: { soundEnabled?: boolean; vibrationEnabled?: boolean }) => {
      const soundEnabled = options?.soundEnabled ?? true;
      const vibrationEnabled = options?.vibrationEnabled ?? true;

      try {
        const config = getNotificationConfig(alert.severity);

        // expo-notifications no entrega de forma confiable la notificación
        // del sistema en navegador web. Las alertas de prueba sí aparecían
        // porque usaban directamente la Web Notification API. Usamos el
        // mismo camino para las alertas reales y dejamos Expo para nativo.
        if (Platform.OS === "web") {
          if (typeof Notification === "undefined" || Notification.permission !== "granted") {
            console.warn("[Notifications] Sin permiso web para mostrar alerta real");
            return;
          }

          const options = {
            body: `${alert.event}\n${alert.description}`,
            tag: `tormentar-${alert.id}`,
            icon: "/favicon.ico",
            requireInteraction: alert.severity !== "leve",
            data: {
              alertId: alert.id,
              severity: alert.severity,
              url: "/",
            },
          };

          const registration = await navigator.serviceWorker?.getRegistration();
          if (registration?.showNotification) {
            await registration.showNotification(config.title, options);
          } else {
            const notification = new Notification(config.title, options);
            notification.onclick = () => {
              window.focus();
              notification.close();
            };
          }
          return;
        }

        await Notifications.scheduleNotificationAsync({
          content: {
            title: config.title,
            body: alert.description,
            data: {
              alertId: alert.id,
              latitude: alert.latitude,
              longitude: alert.longitude,
              severity: alert.severity,
              event: alert.event,
            },
            sound: soundEnabled ? config.sound : null,
            priority: config.priority,
            vibrate: vibrationEnabled ? [0, 250, 250, 250] : undefined,
          } as any,
          trigger: null,
        });

        if (soundEnabled && alert.severity !== "leve") {
          await playAlertSound(alert.severity);
        }
      } catch (error) {
        console.error("Error sending notification:", error);
      }
    },
    [getNotificationConfig, playAlertSound]
  );

  const setupNotificationChannels = useCallback(async () => {
    if (Platform.OS !== "android") return;
    await Notifications.setNotificationChannelAsync("weather_alerts", {
      name: "Alertas de Clima",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF6B35",
    } as any);

    await Notifications.setNotificationChannelAsync("storm_alerts", {
      name: "Alertas de Tormentas Severas",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250, 250, 250],
      lightColor: "#EF4444",
    } as any);
  }, []);

  return {
    sendNotification,
    setupNotificationChannels,
    playAlertSound,
    requestPermissions,
  };
}
