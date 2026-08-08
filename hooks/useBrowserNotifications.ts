/**
 * useBrowserNotifications Hook (WEB)
 * Notificaciones nativas del navegador (Web Notifications API) para que
 * una alerta llegue aunque el usuario no este mirando la pestaña (esta
 * en otra pestaña, minimizado, o con otra app en primer plano) mientras
 * el navegador siga abierto. No reemplaza el popup en pantalla: se
 * dispara ADEMAS, y solo cuando la pestaña no esta visible/enfocada,
 * para no duplicar el aviso cuando el usuario ya esta mirando la app.
 *
 * Limite real de esta API: si el usuario cierra el navegador por
 * completo (no solo la pestaña), esto no puede avisarle - eso
 * requeriria Push API + Service Worker + un servidor que mande el push,
 * que es un cambio de arquitectura mucho mayor. Esto cubre el caso mas
 * comun: pestaña de fondo, otra ventana encima, u otra app activa.
 */
import { useCallback, useEffect, useRef } from "react";
import { SEVERITY_LABELS } from "@/shared/alertSeverity";
import type { WeatherAlert } from "@/shared/types/weather";

const LOG_TAG = "[BrowserNotifications]";

function isSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function useBrowserNotifications() {
  // Evita pedir permiso mas de una vez por sesion si el usuario ya
  // contesto (aceptar/rechazar), sin depender de re-renders.
  const permissionRequestedRef = useRef(false);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported()) return false;
    try {
      if (Notification.permission === "granted") return true;
      if (Notification.permission === "denied") return false;
      permissionRequestedRef.current = true;
      const result = await Notification.requestPermission();
      return result === "granted";
    } catch (e) {
      console.warn(`${LOG_TAG} no se pudo pedir permiso:`, e);
      return false;
    }
  }, []);

  // Solo avisa si la pestaña NO esta visible o NO tiene foco: si el
  // usuario ya esta mirando la app, el popup en pantalla alcanza y
  // una notificacion del sistema seria redundante (y molesta).
  const shouldNotify = useCallback((): boolean => {
    if (!isSupported()) return false;
    if (Notification.permission !== "granted") return false;
    if (typeof document === "undefined") return true;
    return document.visibilityState !== "visible" || !document.hasFocus();
  }, []);

  const notify = useCallback(
    (alert: WeatherAlert) => {
      if (!shouldNotify()) return;
      try {
        const title =
          alert.severity === "severa"
            ? "🚨 ALERTA DE TORMENTA FUERTE"
            : `⚠️ Alerta ${SEVERITY_LABELS[alert.severity]}`;

        const notification = new Notification(title, {
          body: `${alert.event}\n${alert.description}`,
          tag: `tormentar-${alert.id}`,
          icon: "/favicon.ico",
          // Alertas moderadas/severas se quedan en pantalla hasta que
          // el usuario interactue; las leves se auto-descartan solas
          // segun el comportamiento por defecto del sistema operativo.
          requireInteraction: alert.severity !== "leve",
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch (e) {
        console.warn(`${LOG_TAG} no se pudo mostrar la notificacion:`, e);
      }
    },
    [shouldNotify]
  );

  // Pide permiso apenas se monta la app (una sola vez). Si el usuario
  // lo rechaza, simplemente no se vuelve a insistir en esta sesion; el
  // popup en pantalla sigue funcionando igual como respaldo.
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  return { requestPermission, notify, isSupported: isSupported() };
}
