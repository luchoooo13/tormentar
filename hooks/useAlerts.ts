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

interface UseAlertsOptions {
  onNewAlert?: (alert: WeatherAlert) => void;
}

export function useAlerts(options?: UseAlertsOptions) {
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

  const knownAlertIds = useRef<Set<string>>(new Set());
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;
  const onNewAlertRef = useRef(options?.onNewAlert);
  onNewAlertRef.current = options?.onNewAlert;

  const knownAlertsLoadedRef = useRef<Promise<void> | null>(null);
  if (!knownAlertsLoadedRef.current) {
    knownAlertsLoadedRef.current = (async () => {
      try {
        const saved = await AsyncStorage.getItem(KNOWN_ALERTS_KEY);
        if (saved) {
          const ids = JSON.parse(saved);
          knownAlertIds.current = new Set(ids);
        }
      } catch (e) {
        console.error("Error loading known alerts", e);
      }
    })();
  }

  // FIX: guard anti-carrera. Antes, si dos fetchAlerts() quedaban en
  // vuelo al mismo tiempo (posible por el loop de renders que causaba
  // el bug de useWeatherNotifications, o simplemente por un refresh
  // manual mientras el intervalo automatico tambien disparaba uno),
  // los dos leian knownAlertIds ANTES de que el otro terminara de
  // marcar la alerta como conocida. Los dos la trataban como "nueva"
  // y los dos llamaban a onNewAlert, asi que la alerta volvia a
  // encolarse para el popup incluso despues de que el usuario ya la
  // habia cerrado. requestIdRef descarta el resultado de cualquier
  // fetch que ya no sea el mas reciente.
  const requestIdRef = useRef(0);

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

    const requestId = ++requestIdRef.current;
    const isStale = () => requestId !== requestIdRef.current;

    setLoading(true);
    setError(undefined);

    try {
      await knownAlertsLoadedRef.current;
      const data = await getWeatherAlerts(location.latitude, location.longitude);

      // Llegó, pero ya hay un fetch más nuevo en curso: se descarta en
      // silencio para no notificar/mostrar el popup con datos viejos.
      if (isStale()) return;

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
          // Marcar como conocida ANTES de notificar, no despues: asi
          // si otro fetch se dispara mientras esto corre, ya la ve
          // como conocida y no la vuelve a encolar.
          knownAlertIds.current.add(alert.id);
          await sendNotification(alert, {
            soundEnabled: prefs.soundEnabled,
            vibrationEnabled: prefs.vibrationEnabled,
          });
          if (isStale()) return;
          onNewAlertRef.current?.(alert);
        }

        if (newRelevantAlerts.length > 0) {
          await AsyncStorage.setItem(
            KNOWN_ALERTS_KEY,
            JSON.stringify(Array.from(knownAlertIds.current))
          );
        }
      }

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
      if (isStale()) return;
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
    } finally {
      if (!isStale()) setLoading(false);
    }
  }, [location, sendNotification]);

  useEffect(() => {
    requestPermissions();
    setupNotificationChannels();
  }, [requestPermissions, setupNotificationChannels]);

  useEffect(() => {
    if (location) {
      fetchAlerts();
    }
  }, [location?.latitude, location?.longitude, fetchAlerts]);

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
