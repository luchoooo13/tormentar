/**
 * WeatherAlertPopup (WEB)
 * Cartel pop-up que aparece cuando el sistema detecta una alerta NUEVA
 * para la localidad configurada (ubicacion actual). Se monta una sola
 * vez en el layout raiz, asi que se muestra sin importar en que pestaña
 * este el usuario.
 *
 * Reglas pedidas:
 *  - Leve: 10s en pantalla, sin parpadeo, sonido "alerta leve".
 *  - Moderada / Fuerte: 30s en pantalla, parpadea en su propio color,
 *    sonido de alarma EAS (Canada).
 *  - Colores segun severidad (mismos que el resto de la app).
 */
import { useEffect, useRef, useState } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useAlertsContext } from "@/lib/alerts-context";
import { useAlertPreferences } from "@/hooks/useAlertPreferences";
import {
  SEVERITY_COLORS,
  SEVERITY_ICONS,
  SEVERITY_LABELS,
  SEVERITY_POPUP_DURATION_MS,
  SEVERITY_POPUP_BLINKS,
  SEVERITY_SOUND_URL,
} from "@/shared/alertSeverity";
import type { WeatherAlert } from "@/shared/types/weather";

const STYLE_TAG_ID = "tormentar-alert-popup-styles";

// Inyecta el keyframe de parpadeo una sola vez en el documento.
function ensureBlinkStylesInjected() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_TAG_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_TAG_ID;
  style.textContent = `
    @keyframes tormentar-alert-blink {
      0%, 100% { box-shadow: 0 0 0 0 var(--tormentar-alert-color, #EF4444); filter: brightness(1); }
      50% { box-shadow: 0 0 22px 6px var(--tormentar-alert-color, #EF4444); filter: brightness(1.18); }
    }
    .tormentar-alert-popup-blink {
      animation: tormentar-alert-blink 0.9s ease-in-out infinite;
    }
    @keyframes tormentar-alert-slide-in {
      from { transform: translateY(-16px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

function PopupCard({ alert, onDone }: { alert: WeatherAlert; onDone: () => void }) {
  const { preferences } = useAlertPreferences();
  // Tipado como `any` (igual que el resto del archivo del mapa hace con
  // `window.L` de Leaflet) para no depender de que los tipos DOM del
  // navegador esten incluidos en la config de TypeScript del proyecto.
  const audioRef = useRef<any>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const color = SEVERITY_COLORS[alert.severity];
  const icon = SEVERITY_ICONS[alert.severity];
  const label = SEVERITY_LABELS[alert.severity];
  const duration = SEVERITY_POPUP_DURATION_MS[alert.severity];
  const shouldBlink = SEVERITY_POPUP_BLINKS[alert.severity];

  useEffect(() => {
    ensureBlinkStylesInjected();

    if (preferences.soundEnabled && typeof window !== "undefined") {
      const AudioCtor = (window as any).Audio;
      const audio = new AudioCtor(SEVERITY_SOUND_URL[alert.severity]);
      audioRef.current = audio;
      audio.play().catch((err) => {
        // Los navegadores pueden bloquear el autoplay hasta que el
        // usuario haya interactuado con la pagina; no es un error fatal.
        console.warn("No se pudo reproducir el sonido de alerta:", err);
      });
    }

    timeoutRef.current = setTimeout(onDone, duration);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alert.id]);

  const handleClose = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (audioRef.current) audioRef.current.pause();
    onDone();
  };

  return (
    <div
      className={shouldBlink ? "tormentar-alert-popup-blink" : undefined}
      style={{
        ["--tormentar-alert-color" as any]: color,
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        width: "min(380px, calc(100vw - 32px))",
        padding: "14px 14px",
        borderRadius: 14,
        border: `2px solid ${color}`,
        backgroundColor: "#1c1c1eee",
        backdropFilter: "blur(6px)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        animation: "tormentar-alert-slide-in 0.25s ease-out",
        fontFamily: "inherit",
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          minWidth: 38,
          borderRadius: 19,
          backgroundColor: color + "33",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialIcons name={icon as any} size={20} color={color} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ color, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>
            {alert.severity === "severa" ? "🚨 ALERTA " + label.toUpperCase() : "⚠️ ALERTA " + label.toUpperCase()}
          </span>
          <button
            onClick={handleClose}
            aria-label="Cerrar"
            style={{
              background: "transparent",
              border: "none",
              color: "#9ca3af",
              cursor: "pointer",
              fontSize: 16,
              lineHeight: 1,
              padding: 2,
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ color: "#fff", fontSize: 14, fontWeight: 700, marginTop: 2 }}>{alert.event}</div>
        <div style={{ color: "#d1d5db", fontSize: 12, marginTop: 3, lineHeight: 1.4 }}>
          {alert.description}
        </div>
      </div>
    </div>
  );
}

export function WeatherAlertPopup() {
  const { popupQueue, dismissPopup } = useAlertsContext();
  const [visible, setVisible] = useState<WeatherAlert | null>(null);

  // Tomar la siguiente alerta de la cola cuando no haya ninguna visible.
  useEffect(() => {
    if (!visible && popupQueue.length > 0) {
      setVisible(popupQueue[0]);
    }
  }, [visible, popupQueue]);

  if (!visible) return null;

  const handleDone = () => {
    dismissPopup(visible.id);
    setVisible(null);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 9999,
        pointerEvents: "auto",
      }}
    >
      <PopupCard key={visible.id} alert={visible} onDone={handleDone} />
    </div>
  );
}
