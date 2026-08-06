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
 *
 * NOTA (fix): el sonido antes dependia de archivos mp3 en /public/sounds/
 * que nunca existieron en el proyecto (por eso nunca sonaba, fallaba en
 * silencio). Ahora el sonido se genera por codigo con la Web Audio API,
 * asi no depende de ningun archivo externo.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useAlertsContext } from "@/lib/alerts-context";
import { useAlertPreferences } from "@/hooks/useAlertPreferences";
import {
  SEVERITY_COLORS,
  SEVERITY_ICONS,
  SEVERITY_LABELS,
  SEVERITY_POPUP_DURATION_MS,
  SEVERITY_POPUP_BLINKS,
} from "@/shared/alertSeverity";
import type { WeatherAlert, AlertSeverity } from "@/shared/types/weather";

const STYLE_TAG_ID = "tormentar-alert-popup-styles";
const LOG_TAG = "[TormentarAlertPopup]";

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

// Genera el sonido de alerta con la Web Audio API en vez de depender de
// un archivo .mp3 externo (que no existia en /public/sounds, por eso
// nunca sonaba). Devuelve una funcion para cortar el sonido a mano.
function playSeveritySound(severity: AlertSeverity): () => void {
  if (typeof window === "undefined") return () => {};
  const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return () => {};

  const ctx = new AudioCtx();
  const stopFns: Array<() => void> = [];

  const beep = (startAt: number, freq: number, dur: number, gainValue = 0.18) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const t0 = ctx.currentTime + startAt;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(gainValue, t0 + 0.02);
    gain.gain.linearRampToValueAtTime(0, t0 + dur - 0.02);
    osc.start(t0);
    osc.stop(t0 + dur);
    stopFns.push(() => {
      try {
        osc.stop();
      } catch {}
    });
  };

  if (severity === "leve") {
    // Un par de tonos cortos y suaves.
    beep(0, 660, 0.18);
    beep(0.22, 660, 0.18);
  } else {
    // Patron tipo EAS: tonos mas agudos y repetidos, mas urgente.
    for (let i = 0; i < 4; i++) {
      beep(i * 0.32, 880, 0.22, 0.22);
    }
  }

  return () => {
    stopFns.forEach((fn) => fn());
    ctx.close().catch(() => {});
  };
}

function PopupCard({ alert, onDone }: { alert: WeatherAlert; onDone: () => void }) {
  const { preferences } = useAlertPreferences();
  const stopSoundRef = useRef<(() => void) | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishedRef = useRef(false);

  const color = SEVERITY_COLORS[alert.severity];
  const icon = SEVERITY_ICONS[alert.severity];
  const label = SEVERITY_LABELS[alert.severity];
  const duration = SEVERITY_POPUP_DURATION_MS[alert.severity];
  const shouldBlink = SEVERITY_POPUP_BLINKS[alert.severity];

  const finish = () => {
    // Guard para que onDone no se dispare dos veces (ej: click en la X
    // justo cuando el timeout ya estaba por saltar).
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (stopSoundRef.current) stopSoundRef.current();
    console.log(`${LOG_TAG} cerrando alerta`, alert.id);
    onDone();
  };

  useEffect(() => {
    finishedRef.current = false;
    ensureBlinkStylesInjected();
    console.log(`${LOG_TAG} montada`, { id: alert.id, severity: alert.severity, duration });

    if (preferences.soundEnabled) {
      try {
        stopSoundRef.current = playSeveritySound(alert.severity);
      } catch (err) {
        console.warn(`${LOG_TAG} no se pudo generar el sonido:`, err);
      }
    }

    timeoutRef.current = setTimeout(() => {
      console.log(`${LOG_TAG} timeout cumplido, cerrando`, alert.id);
      finish();
    }, duration);

    return () => {
      console.log(`${LOG_TAG} desmontada (cleanup)`, alert.id);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (stopSoundRef.current) stopSoundRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alert.id]);

  const handleClose = (e?: { stopPropagation?: () => void; preventDefault?: () => void }) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    console.log(`${LOG_TAG} click en X`, alert.id);
    finish();
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
            type="button"
            onClick={handleClose}
            onTouchEnd={handleClose}
            aria-label="Cerrar"
            style={{
              background: "transparent",
              border: "none",
              color: "#9ca3af",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              padding: 8,
              pointerEvents: "auto",
              position: "relative",
              zIndex: 2,
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

  useEffect(() => {
    if (!visible && popupQueue.length > 0) {
      console.log(`${LOG_TAG} tomando siguiente de la cola`, popupQueue[0].id, "cola:", popupQueue.length);
      setVisible(popupQueue[0]);
    }
  }, [visible, popupQueue]);

  if (!visible) return null;
  if (typeof document === "undefined") return null;

  const handleDone = () => {
    dismissPopup(visible.id);
    setVisible(null);
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 999999,
        pointerEvents: "auto",
      }}
    >
      <PopupCard key={visible.id} alert={visible} onDone={handleDone} />
    </div>,
    document.body
  );
}
