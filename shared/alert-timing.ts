import type { WeatherAlert } from "@/shared/types/weather";

export const PREALERT_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * Una alerta se puede notificar cuando sigue vigente y ya comenzó o empieza
 * dentro de las próximas 48 horas. Así no se marcan como conocidas alertas
 * demasiado lejanas antes de que entren en la ventana de prealerta.
 */
export function isAlertInNotificationWindow(
  alert: WeatherAlert,
  nowMs = Date.now()
): boolean {
  const startMs = alert.start * 1000;
  const endMs = alert.end * 1000;

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return false;
  if (endMs <= nowMs) return false;

  return startMs <= nowMs + PREALERT_WINDOW_MS;
}

export function getAlertNotificationPrefix(
  alert: WeatherAlert,
  nowMs = Date.now()
): string {
  const startMs = alert.start * 1000;
  return startMs > nowMs ? "Prealerta: " : "Alerta activa: ";
}
