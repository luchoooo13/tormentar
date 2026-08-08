/**
 * useAlertHistory Hook
 * Lee el historial local de alertas (guardado por useAlerts en cada
 * fetch, ver ALERT_HISTORY_KEY) y expone solo las que ya "pasaron"
 * (end < ahora), mas nuevas primero. Vive aparte de useAlerts porque
 * la pantalla de Historial no necesita ubicacion, notificaciones ni
 * ningun otro efecto secundario, solo leer lo que ya se guardo.
 */
import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AlertSeverity, WeatherAlert } from "@/shared/types/weather";

// Debe coincidir con la clave usada en hooks/useAlerts.ts.
const ALERT_HISTORY_KEY = "tormentar_alert_history";

export function useAlertHistory() {
  const [allHistory, setAllHistory] = useState<WeatherAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await AsyncStorage.getItem(ALERT_HISTORY_KEY);
      const parsed: WeatherAlert[] = raw ? JSON.parse(raw) : [];
      setAllHistory(parsed.sort((a, b) => b.start - a.start));
    } catch (e) {
      console.error("Error loading alert history", e);
      setAllHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const clearHistory = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(ALERT_HISTORY_KEY);
      setAllHistory([]);
    } catch (e) {
      console.error("Error clearing alert history", e);
    }
  }, []);

  const nowSeconds = Math.floor(Date.now() / 1000);
  // "Pasadas" = ya terminaron. Las que siguen activas se ven en Inicio,
  // no tiene sentido duplicarlas aca.
  const pastAlerts = allHistory.filter((a) => a.end < nowSeconds);

  const filterBySeverity = (severity: AlertSeverity | "todas"): WeatherAlert[] =>
    severity === "todas" ? pastAlerts : pastAlerts.filter((a) => a.severity === severity);

  return {
    history: pastAlerts,
    loading,
    refresh: load,
    clearHistory,
    filterBySeverity,
  };
}
