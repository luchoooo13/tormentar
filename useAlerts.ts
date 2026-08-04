/**
 * useAlerts Hook
 * Trae el pronóstico de Open-Meteo (API gratuita, sin key) y genera
 * alertas propias (leve/moderada/severa) analizando ese pronóstico
 * (antes las pantallas usaban datos hardcodeados de demostración y
 * nunca llamaban a una API real).
 *
 * - Usa la ubicación real del dispositivo (useLocation).
 * - Actualiza según el intervalo único configurado en las preferencias.
 * - Filtra según los niveles de severidad elegidos por el usuario
 *   (leve / moderada / fuerte).
 * - Dispara notificaciones locales solo para alertas nuevas que el
 *   usuario eligió recibir.
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
  const { sendNotification, setupNotificationChannels } = useWeatherNotifications();

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  // IDs de alertas ya vistas, para no volver a notificar lo mismo y
  // para distinguir "alerta nueva" de "alerta que ya estaba".
  const knownAlertIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;

  const fetchAlerts = useCallback(async () => {
    if (!location) return;

    setLoading(true);
    setError(undefined);

    try {
      const data = await getWeatherAlerts(location.latitude, location.longitude);

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
          await sendNotification(alert, {
            soundEnabled: prefs.soundEnabled,
            vibrationEnabled: prefs.vibrationEnabled,
          });
        }
      }

      currentAlerts.forEach((a) => knownAlertIds.current.add(a.id));
      isFirstLoad.current = false;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [location, sendNotification]);

  // Canales de notificación (Android), una sola vez.
  useEffect(() => {
    setupNotificationChannels();
  }, [setupNotificationChannels]);

  // Buscar alertas apenas se conoce la ubicación.
  useEffect(() => {
    if (location) {
      fetchAlerts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.latitude, location?.longitude]);

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
