/**
 * Constantes compartidas de severidad de alertas.
 * Antes cada pantalla (Inicio, Mapa) definia su propia copia de colores
 * e iconos por severidad, lo que hacia facil que se desincronizaran.
 * Ahora todo vive en un solo lugar.
 */
import type { AlertSeverity } from "@/shared/types/weather";

export const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  leve: "#16A34A",
  moderada: "#F97316",
  severa: "#DC2626",
};

export const SEVERITY_ICONS: Record<AlertSeverity, string> = {
  leve: "cloud-queue",
  moderada: "cloud",
  severa: "cloud-download",
};

export const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  leve: "Leve",
  moderada: "Moderada",
  severa: "Fuerte",
};

// Duracion en pantalla del cartel pop-up de alerta, por severidad.
export const SEVERITY_POPUP_DURATION_MS: Record<AlertSeverity, number> = {
  leve: 10_000,
  moderada: 30_000,
  severa: 30_000,
};

// Si el cartel debe parpadear en su color mientras esta en pantalla.
export const SEVERITY_POPUP_BLINKS: Record<AlertSeverity, boolean> = {
  leve: false,
  moderada: true,
  severa: true,
};

// Sonido a reproducir cuando se dispara el pop-up de alerta (servidos
// desde /public, por lo que quedan disponibles en la raiz del sitio web).
export const SEVERITY_SOUND_URL: Record<AlertSeverity, string> = {
  leve: "/sounds/alerta-leve.mp3",
  moderada: "/sounds/eas-alarm-canada.mp3",
  severa: "/sounds/eas-alarm-canada.mp3",
};
