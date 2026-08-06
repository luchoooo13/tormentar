/**
 * useAlerts Hook
 * Trae alertas REALES desde OpenWeatherMap (antes las pantallas usaban
 * datos hardcodeados de demostración y nunca llamaban a la API real).
 *
 * - Usa la ubicación real del dispositivo (useLocation).
 * - Actualiza según el intervalo único configurado en las preferencias.
 * - Filtra según los niveles de severidad elegidos por el usuario
 *   (leve / moderada / fuerte).
 * - Dispara notificaciones locales solo para alertas nuevas que el
 *   usuario eligió recibir.
 * - Pide permisos de notificación al iniciar para que las alertas
 *   realmente se muestren en Android 13+ e iOS.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "@/hooks/useLocation";
import { useAlertPreferences, getEnabledSeverities } from "@/hooks/useAlertPreferences";
import { useWeatherNotifications } from "@/hooks/useWeatherNotifications";
import { getWeatherAlerts, hasApiKey, sortAlertsBySeverity } from "@/lib/services/weatherService";
import type { WeatherAlert, WeatherData } from "@/shared/types/weather";

export function useAlerts() {
  const {
    location,
    loading: locationLoading,
    error: locationError,
    getCurrentLocation,
  } = useLocation();
  const { preferences } = useAlertPreferences();
  const { sendNotification, setupNotificationChannels, requestPermissions } = useWeatherNotifications();

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  // IDs de alertas ya vistas, para no volver a notificar lo mismo y
  // para distinguir "alerta nueva" de "alerta que ya estaba".
  const knownAlertIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;

  // --- Guard anti-carrera para los requests HTTP ---
  // fetchAlerts puede dispararse por varias causas a la vez: cambio de
  // ubicación, el intervalo periódico, o un refresh manual del usuario.
  // Si dos pedidos quedan en vuelo al mismo tiempo, pueden resolverse
  // en cualquier orden: el más lento (con datos de una ubicación u
  // ocasión ya vieja) puede llegar después y pisar el estado con
  // resultados "incombinables" con lo que el usuario está viendo ahora.
  //
  // Se resuelve con dos cosas juntas:
  // 1) requestIdRef: cada llamada saca un número correlativo. Al volver
  //    la respuesta, si ese número ya no es el más reciente, se
  //    descarta sin tocar el estado (ni loading, ni error, ni weather).
  // 2) AbortController: el pedido anterior se cancela de entrada al
  //    arrancar uno nuevo, para no seguir gastando red en una
  //    respuesta que de todos modos se va a ignorar.
  const requestIdRef = useRef(0);
  const activeControllerRef = useRef<AbortController | null>(null);

  const fetchAlerts = useCallback(async () => {
    if (!location) return;

    if (!hasApiKey()) {
      setError(
        "Falta configurar la API key de OpenWeatherMap (EXPO_PUBLIC_OPENWEATHER_API_KEY) para recibir alertas reales."
      );
      setLoading(false);
      return;
    }

    // Cancela cualquier pedido anterior todavía en vuelo: su resultado
    // ya no le interesa a nadie, sea cual sea la ubicación que pedía.
    activeControllerRef.current?.abort();
    const controller = new AbortController();
    activeControllerRef.current = controller;

    const requestId = ++requestIdRef.current;
    const isStale = () => requestId !== requestIdRef.current;

    setLoading(true);
    setError(undefined);

    try {
      const data = await getWeatherAlerts(location.latitude, location.longitude, controller.signal);

      // Llegó, pero ya hay un pedido más nuevo en curso (o este fue
      // cancelado): se descarta en silencio, sin pisar el estado
      // actual ni mostrar error.
      if (isStale()) return;

      if (!data) {
        setError("No se pudieron obtener las alertas en este momento.");
        setLoading(false);
        return;
      }

      setWeather(data);

      const currentAlerts = data.alerts || [];
      const prefs = preferencesRef.current;

      if (prefs.notificationsEnabled && !isFirstLoad.current) {
        const enabledSeverities = getEnabledSeverities(prefs.minSeverity);
        const newRelevantAlerts = currentAlerts.filter(
          (a) => !knownAlertIds.current.has(a.id) && enabledSeverities.includes(a.severity)
        );
        for (const alert of newRelevantAlerts) {
          // Si mientras se notifica llega un pedido más nuevo, se corta
          // acá: no tiene sentido seguir notificando alertas de una
          // consulta que ya quedó obsoleta.
          if (isStale()) return;
          await sendNotification(alert, {
            soundEnabled: prefs.soundEnabled,
            vibrationEnabled: prefs.vibrationEnabled,
          });
        }
      }

      if (isStale()) return;
      currentAlerts.forEach((a) => knownAlertIds.current.add(a.id));
      isFirstLoad.current = false;
    } catch (err) {
      if (isStale()) return;
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
    } finally {
      if (!isStale()) setLoading(false);
    }
  }, [location, sendNotification]);

  // Canales de notificación (Android) y permiso de notificaciones, una
  // sola vez. Sin pedir el permiso, sendNotification no muestra nada.
  useEffect(() => {
    requestPermissions();
    setupNotificationChannels();
  }, [setupNotificationChannels]);

  // Buscar alertas apenas se conoce la ubicación.
  useEffect(() => {
    if (location) {
      fetchAlerts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.latitude, location?.longitude]);

  // Al desmontar, cancela cualquier pedido que haya quedado en vuelo
  // para no intentar actualizar estado de un componente que ya no
  // existe.
  useEffect(() => {
    return () => {
      activeControllerRef.current?.abort();
    };
  }, []);

  // Actualización periódica según el intervalo único configurado.
  useEffect(() => {
    if (!location) return;
    const intervalMs = preferences.updateIntervalMinutes * 60 * 1000;
    const id = setInterval(fetchAlerts, intervalMs);
    return () => clearInterval(id);
  }, [location, preferences.updateIntervalMinutes, fetchAlerts]);

  const allAlerts: WeatherAlert[] = weather?.alerts || [];
  const enabledSeverities = getEnabledSeverities(preferences.minSeverity);
  const filteredAlerts = sortAlertsBySeverity(
    allAlerts.filter((a) => enabledSeverities.includes(a.severity))
  );

  return {
    location,
    locationLoading,
    locationError,
    getCurrentLocation,
    weather,
    allAlerts,
    filteredAlerts,
    loading: loading || locationLoading,
    error: error || locationError,
    hasApiKey: hasApiKey(),
    refresh: fetchAlerts,
  };
}
