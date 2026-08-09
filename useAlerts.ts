/**
 * useAlerts Hook
 * Trae alertas REALES desde Open-Meteo (servicio gratuito sin API key).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocation } from "@/hooks/useLocation";
import {
  useAlertPreferences,
  getEnabledSeverities,
} from "@/hooks/useAlertPreferences";
import { useWeatherNotifications } from "@/hooks/useWeatherNotifications";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import {
  getWeatherAlerts,
  hasApiKey,
  sortAlertsBySeverity,
} from "@/lib/services/weatherService";
import type { WeatherAlert, WeatherData, AlertSeverity } from "@/shared/types/weather";

// Titulos usados tanto en la notificacion local (pestaña abierta) como
// en el push real (llega aunque el navegador este cerrado), para que
// ambas digan lo mismo.
const SEVERITY_PUSH_TITLES: Record<AlertSeverity, string> = {
  leve: "⚠️ Alerta de Clima Leve",
  moderada: "⚠️ Alerta de Clima Moderada",
  severa: "🚨 ALERTA DE TORMENTA FUERTE",
};

const KNOWN_ALERTS_KEY = "tormentar_known_alerts";
// Alertas por las que YA se mando el aviso "del dia" (recordatorio el
// dia que efectivamente arranca la alerta). Es un set SEPARADO de
// knownAlertIds: knownAlertIds evita re-notificar la misma alerta cada
// vez que se vuelve a pedir el pronostico (podria seguir apareciendo
// en cada fetch durante 5 dias), pero antes eso tambien significaba
// que si te avisaban con 5 dias de anticipacion, no habia ningun
// aviso nuevo el dia que la tormenta realmente llegaba - facil
// olvidarse en el medio.
const REMINDED_ALERTS_KEY = "tormentar_reminded_alerts";

// Dos alertas caen "el mismo dia" si coinciden año/mes/dia en hora
// local del dispositivo (no UTC, para que "hoy" sea el dia del usuario).
function isSameLocalDay(unixSeconds: number, reference: Date): boolean {
  const d = new Date(unixSeconds * 1000);
  return (
    d.getFullYear() === reference.getFullYear() &&
    d.getMonth() === reference.getMonth() &&
    d.getDate() === reference.getDate()
  );
}

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
  // Push real (Web Push): llega al celular aunque el navegador este
  // cerrado. sendPush es un no-op silencioso si el usuario no activo
  // "Notificaciones push" en Configuracion.
  const { sendPush } = usePushNotifications();

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  const knownAlertIds = useRef<Set<string>>(new Set());
  const remindedAlertIds = useRef<Set<string>>(new Set());
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;
  const onNewAlertRef = useRef(options?.onNewAlert);
  onNewAlertRef.current = options?.onNewAlert;

  const knownAlertsLoadedRef = useRef<Promise<void> | null>(null);
  if (!knownAlertsLoadedRef.current) {
    knownAlertsLoadedRef.current = (async () => {
      try {
        const [savedKnown, savedReminded] = await Promise.all([
          AsyncStorage.getItem(KNOWN_ALERTS_KEY),
          AsyncStorage.getItem(REMINDED_ALERTS_KEY),
        ]);
        if (savedKnown) {
          knownAlertIds.current = new Set(JSON.parse(savedKnown));
        }
        if (savedReminded) {
          remindedAlertIds.current = new Set(JSON.parse(savedReminded));
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
  // Marca de tiempo del ultimo fetch (exitoso o no), usada para no
  // disparar un refetch extra por "volver a la pestana" si ya hubo uno
  // hace muy poco.
  const lastFetchAtRef = useRef(0);

  const fetchAlerts = useCallback(async () => {
    if (!location) return;
    if (typeof location.latitude !== "number" || typeof location.longitude !== "number") {
      setError("La ubicación no es válida todavía. Volvé a intentar en unos segundos.");
      setLoading(false);
      return;
    }

    if (!hasApiKey()) {
      setError(
        "No se pudo conectar con el servicio meteorologico gratuito (Open-Meteo). Verifica tu conexion a internet."
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

        let remindedChanged = false;

        for (const alert of newRelevantAlerts) {
          // Marcar como conocida ANTES de notificar, no despues: asi
          // si otro fetch se dispara mientras esto corre, ya la ve
          // como conocida y no la vuelve a encolar.
          knownAlertIds.current.add(alert.id);
          await sendNotification(alert, {
            soundEnabled: prefs.soundEnabled,
            vibrationEnabled: prefs.vibrationEnabled,
          });
          sendPush({
            title: SEVERITY_PUSH_TITLES[alert.severity],
            body: alert.description,
            severity: alert.severity,
            alertId: alert.id,
          });
          if (isStale()) return;
          onNewAlertRef.current?.(alert);
          // Si esta alerta recien descubierta ademas arranca HOY (aviso
          // corto), este mismo mensaje ya cumple el rol de "recordatorio
          // del dia": se marca de una para que el bloque de abajo no la
          // vuelva a notificar en el mismo ciclo.
          if (isSameLocalDay(alert.start, new Date())) {
            remindedAlertIds.current.add(alert.id);
            remindedChanged = true;
          }
        }

        if (newRelevantAlerts.length > 0) {
          await AsyncStorage.setItem(
            KNOWN_ALERTS_KEY,
            JSON.stringify(Array.from(knownAlertIds.current))
          );
        }

        // Recordatorio del dia: entre TODAS las alertas relevantes de
        // hoy (sean recien descubiertas o ya conocidas de dias
        // anteriores), las que arrancan hoy segun el dia local del
        // dispositivo y todavia no tuvieron su aviso "del dia" reciben
        // una notificacion aparte. Asi, si te avisaron hace 5 dias que
        // se venia una tormenta, el dia que efectivamente llega te
        // vuelve a sonar igual, en vez de depender de que te hayas
        // acordado solo.
        const today = new Date();
        const todaysReminders = currentAlerts.filter(
          (a) =>
            enabledSeverities.includes(a.severity) &&
            isSameLocalDay(a.start, today) &&
            !remindedAlertIds.current.has(a.id)
        );

        for (const alert of todaysReminders) {
          remindedAlertIds.current.add(alert.id);
          remindedChanged = true;
          await sendNotification(
            { ...alert, description: `Recordatorio de hoy: ${alert.description}` },
            { soundEnabled: prefs.soundEnabled, vibrationEnabled: prefs.vibrationEnabled }
          );
          sendPush({
            title: SEVERITY_PUSH_TITLES[alert.severity],
            body: `Recordatorio de hoy: ${alert.description}`,
            severity: alert.severity,
            alertId: alert.id,
          });
          if (isStale()) return;
          onNewAlertRef.current?.(alert);
        }

        if (remindedChanged) {
          await AsyncStorage.setItem(
            REMINDED_ALERTS_KEY,
            JSON.stringify(Array.from(remindedAlertIds.current))
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
      lastFetchAtRef.current = Date.now();
    }
  }, [location, sendNotification, sendPush]);

  useEffect(() => {
    requestPermissions();
    setupNotificationChannels();
  }, [requestPermissions, setupNotificationChannels]);

  useEffect(() => {
    if (location) {
      fetchAlerts();
    }
  }, [location?.latitude, location?.longitude, fetchAlerts]);

  // Alertas "en vivo" mientras la pagina esta abierta: se re-piden solas
  // cada updateIntervalMinutes, sin que el usuario tenga que refrescar.
  useEffect(() => {
    if (!location) return;
    const intervalMs = preferences.updateIntervalMinutes * 60 * 1000;
    const id = setInterval(fetchAlerts, intervalMs);
    return () => clearInterval(id);
  }, [location, preferences.updateIntervalMinutes, fetchAlerts]);

  // Ademas del intervalo, refrescar apenas la pestana vuelve a estar
  // visible/en foco (por ej. el usuario minimizo el navegador, cambio
  // de pestana un rato, o la compu se suspendio). Sin esto, si el
  // intervalo cae justo mientras la pestana esta en segundo plano (los
  // navegadores frenan los timers ahi), el usuario puede volver y ver
  // datos viejos sin darse cuenta. Se evita golpear la API de mas
  // exigiendo que haya pasado al menos MIN_REFOCUS_GAP_MS desde el
  // ultimo fetch.
  useEffect(() => {
    if (!location || typeof document === "undefined") return;

    const MIN_REFOCUS_GAP_MS = 60 * 1000;

    const maybeRefetch = () => {
      if (document.visibilityState !== "visible") return;
      const elapsed = Date.now() - lastFetchAtRef.current;
      if (elapsed >= MIN_REFOCUS_GAP_MS) {
        fetchAlerts();
      }
    };

    document.addEventListener("visibilitychange", maybeRefetch);
    window.addEventListener("focus", maybeRefetch);
    return () => {
      document.removeEventListener("visibilitychange", maybeRefetch);
      window.removeEventListener("focus", maybeRefetch);
    };
  }, [location, fetchAlerts]);

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
