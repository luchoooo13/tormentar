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
import type { WeatherAlert, AlertSeverity } from "@/shared/types/weather";

type AlertsContextValue = ReturnType<typeof useAlerts> & {
  // Cola de alertas nuevas pendientes de mostrar en el pop-up (web).
  popupQueue: WeatherAlert[];
  dismissPopup: (alertId: string) => void;
  // Inyecta una alerta falsa en la cola del popup, sin pasar por la API.
  // Sirve para probar sonido / X / tiempo sin esperar una alerta real.
  pushTestAlert: (severity: AlertSeverity) => void;
  pushLightningTestAlert: () => void;
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

  // Crea una alerta de mentira y la manda directo a la cola del popup,
  // sin tocar la API ni AsyncStorage. Solo para pruebas manuales.
  const pushTestAlert = useCallback(
    (severity: AlertSeverity) => {
      const now = Math.floor(Date.now() / 1000);
      const testAlert: WeatherAlert = {
        id: `test-${severity}-${Date.now()}`,
        event:
          severity === "severa"
            ? "PRUEBA: Riesgo de tormenta fuerte"
            : severity === "moderada"
            ? "PRUEBA: Riesgo de tormenta moderada"
            : "PRUEBA: Condición climática leve",
        description: "Esta es una alerta de prueba generada manualmente, no es real.",
        start: now,
        end: now + 3600,
        sender_name: "Prueba manual",
        severity,
        latitude: alerts.location?.latitude ?? -34.6,
        longitude: alerts.location?.longitude ?? -58.4,
        radius: 10,
      };
      handleNewAlert(testAlert);
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try {
          const title = severity === "severa" ? "🚨 ALERTA DE TORMENTA FUERTE" : `⚠️ Alerta de prueba`;
          new Notification(title, {
            body: `${testAlert.event}\n${testAlert.description}`,
            tag: `tormentar-test-${Date.now()}`,
            icon: "/favicon.ico",
            requireInteraction: true,
          });
        } catch (e) {
          console.warn("No se pudo forzar la notificacion de prueba:", e);
        }
      }
    },
    [alerts.location, handleNewAlert]
  );

  const pushLightningTestAlert = useCallback(() => {
    const now = Math.floor(Date.now() / 1000);
    const lightningAlert: WeatherAlert = {
      id: `lightning-test-${Date.now()}`,
      event: "Tormenta eléctrica fuerte",
      description:
        "PRUEBA: Se han detectado rayos y descargas eléctricas fuertes en la zona.",
      start: now,
      end: now + 3600,
      sender_name: "Sistema de Alerta de Rayos (Prueba)",
      severity: "severa",
      latitude: alerts.location?.latitude ?? -34.6,
      longitude: alerts.location?.longitude ?? -58.4,
      radius: 10,
      tags: ["tormenta"],
    };
    handleNewAlert(lightningAlert);
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("🚨 ALERTA DE TORMENTA FUERTE", {
          body: `${lightningAlert.event}\n${lightningAlert.description}`,
          tag: `tormentar-lightning-test-${Date.now()}`,
          icon: "/favicon.ico",
          requireInteraction: true,
        });
      } catch (e) {
        console.warn("No se pudo forzar la notificacion de rayos:", e);
      }
    }
  }, [alerts.location, handleNewAlert]);

  const value = useMemo(
    () => ({ ...alerts, popupQueue, dismissPopup, pushTestAlert, pushLightningTestAlert }),
    [alerts, popupQueue, dismissPopup, pushTestAlert, pushLightningTestAlert]
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
