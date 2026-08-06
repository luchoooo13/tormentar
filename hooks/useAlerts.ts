/**
 * useAlerts Hook
 * Trae alertas REALES desde OpenWeatherMap.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocation } from "@/hooks/useLocation";
import {
  useAlertPreferences,
  getEnabledSeverities,
} from "@/hooks/useAlertPreferences";
import { useWeatherNotifications } from "@/hooks/useWeatherNotifications";
import {
  getWeatherAlerts,
  hasApiKey,
  sortAlertsBySeverity,
} from "@/lib/services/weatherService";
import type { WeatherAlert, WeatherData } from "@/shared/types/weather";

const KNOWN_ALERTS_KEY = "tormentar_known_alerts";

export function useAlerts() {
  const {
    location,
    loading: locationLoading,
    error: locationError,
    getCurrentLocation,
  } = useLocation();
  const { preferences } = useAlertPreferences();
  const {
    sendNotification,
    setupNotificationChannels,
    requestPermissions,
  } = useWeatherNotifications();

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  // IDs de alertas ya vistas, persistidas en AsyncStorage.
  const knownAlertIds = useRef<Set<string>>(new Set());
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;

  // Cargar alertas conocidas al montar
  useEffect(() => {
    const loadKnownAlerts = async () => {
      try {
        const saved = await AsyncStorage.getItem(KNOWN_ALERTS_KEY);
        if (saved) {
          const ids = JSON.parse(saved);
          knownAlertIds.current = new Set(ids);
        }
      } catch (e) {
        console.error("Error loading known alerts", e);
      }
    };
    loadKnownAlerts();
  }, []);

  const fetchAlerts = useCallback(async () => {
    if (!location) return;
    if (typeof location.latitude !== "number" || typeof location.longitude !== "number") {
      setError("La ubicación no es válida todavía. Volvé a intentar en unos segundos.");
      setLoading(false);
      return;
    }

    if (!hasApiKey()) {
      setError(
        "Falta configurar la API key de OpenWeatherMap (EXPO_PUBLIC_OPENWEATHER_API_KEY) para recibir alertas reales."
      );
      setLoading(false);
      return;
    }

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

      if (prefs.notificationsEnabled) {
        const enabledSeverities = getEnabledSeverities(prefs.minSeverity);
        const newRelevantAlerts = currentAlerts.filter(
          (a) =>
            !knownAlertIds.current.has(a.id) &&
            enabledSeverities.includes(a.severity)
        );

        for (const alert of newRelevantAlerts) {
          await sendNotification(alert, {
            soundEnabled: prefs.soundEnabled,
            vibrationEnabled: prefs.vibrationEnabled,
          });
          knownAlertIds.current.add(alert.id);
        }

        // Persistir si hubo cambios
        if (newRelevantAlerts.length > 0) {
          await AsyncStorage.setItem(
            KNOWN_ALERTS_KEY,
            JSON.stringify(Array.from(knownAlertIds.current))
          );
        }
      }

      // Asegurar que todas las alertas actuales se marquen como conocidas
      let changed = false;
      currentAlerts.forEach((a) => {
        if (!knownAlertIds.current.has(a.id)) {
          knownAlertIds.current.add(a.id);
          changed = true;
        }
      });

      if (changed) {
        await AsyncStorage.setItem(
          KNOWN_ALERTS_KEY,
          JSON.stringify(Array.from(knownAlertIds.current))
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [location, sendNotification]);

  // Canales de notificación (Android) y permiso de notificaciones
  useEffect(() => {
    requestPermissions();
    setupNotificationChannels();
  }, [requestPermissions, setupNotificationChannels]);

  // Buscar alertas apenas se conoce la ubicación.
  useEffect(() => {
    if (location) {
      fetchAlerts();
    }
  }, [location?.latitude, location?.longitude, fetchAlerts]);

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
