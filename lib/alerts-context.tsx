/**
 * AlertsContext
 * Centraliza useAlerts() en un solo lugar (montado en el layout raiz)
 * en vez de que cada pantalla (Inicio, Mapa) llame a useAlerts() por su
 * cuenta. Antes cada pantalla tenia su propio ciclo de fetch y su propio
 * detector de "alertas nuevas" en memoria, lo que ademas de duplicar
 * llamadas a la API hacia que el pop-up de alerta solo pudiera dispararse
 * mientras esa pantalla especifica estuviera montada. Con el contexto
 * viviendo en el layout raiz, las alertas se siguen consultando y el
 * pop-up se puede mostrar sin importar en que pestaña este el usuario.
 */
import { createContext, useContext, useMemo, useState, useCallback, type ReactNode } from "react";
import { useAlerts } from "@/hooks/useAlerts";
import type { WeatherAlert } from "@/shared/types/weather";

type AlertsContextValue = ReturnType<typeof useAlerts> & {
  // Cola de alertas nuevas pendientes de mostrar en el pop-up (web).
  popupQueue: WeatherAlert[];
  dismissPopup: (alertId: string) => void;
};

const AlertsContext = createContext<AlertsContextValue | null>(null);

export function AlertsProvider({ children }: { children: ReactNode }) {
  const [popupQueue, setPopupQueue] = useState<WeatherAlert[]>([]);

  const handleNewAlert = useCallback((alert: WeatherAlert) => {
    setPopupQueue((prev) => (prev.some((a) => a.id === alert.id) ? prev : [...prev, alert]));
  }, []);

  const alerts = useAlerts({ onNewAlert: handleNewAlert });

  const dismissPopup = useCallback((alertId: string) => {
    setPopupQueue((prev) => prev.filter((a) => a.id !== alertId));
  }, []);

  const value = useMemo(
    () => ({ ...alerts, popupQueue, dismissPopup }),
    [alerts, popupQueue, dismissPopup]
  );

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
}

export function useAlertsContext(): AlertsContextValue {
  const ctx = useContext(AlertsContext);
  if (!ctx) {
    throw new Error("useAlertsContext debe usarse dentro de <AlertsProvider>");
  }
  return ctx;
}
