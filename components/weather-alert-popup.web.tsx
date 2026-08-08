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
 * NOTA (fix sonido): los mp3 viven en /public/sounds/alerta-leve.mp3 y
 * /public/sounds/eas-alarm-canada.mp3. Se fuerza play() dentro del
 * mismo gesto/evento que dispara el popup y se atrapa el error si el
 * navegador bloquea el autoplay por falta de interaccion previa del
 * usuario en la pagina.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useAlertsContext } from "@/lib/alerts-context";
import { useAlertPreferences } from "@/hooks/useAlertPreferences";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";
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

// mp3 reales por severidad (viven en /public/sounds).
const SEVERITY_SOUND_URL: Record<AlertSeverity, string> = {
  leve: "/sounds/alerta-leve.mp3",
  moderada: "/sounds/eas-alarm-canada.mp3",
  severa: "/sounds/eas-alarm-canada.mp3",
};

function ensureBlinkStylesInjected() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_TAG_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_TAG_ID;
  style.textContent = `
    @keyframes tormentar-alert-blink {
      0%, 100% {
        border-color: var(--tormentar-alert-color, #EF4444);
        box-shadow: 0 0 0 0 var(--tormentar-alert-color, #EF4444);
        filter: brightness(1);
      }
      50% {
        border-color: transparent;
        box-shadow: 0 0 22px 6px var(--tormentar-alert-color, #EF4444);
        filter: brightness(1.18);
      }
    }
    @keyframes tormentar-alert-slide-in {
      from { transform: translateY(-16px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

// Reproduce el mp3 real segun la severidad. Devuelve una funcion para
// cortar el sonido a mano (usada al cerrar el popup antes de tiempo).
function playSeveritySound(severity: AlertSeverity): () => void {
  if (typeof window === "undefined") return () => {};
  const AudioCtor = (window as any).Audio;
  if (!AudioCtor) return () => {};

  const audio = new AudioCtor(SEVERITY_SOUND_URL[severity]);
  audio.play().catch((err: unknown) => {
    // Los navegadores bloquean el autoplay hasta que hubo alguna
    // interaccion del usuario en la pagina (click, tap, tecla). No es
    // un error fatal: si el usuario ya toco algo antes, esto no pasa.
    console.warn(`${LOG_TAG} no se pudo reproducir el sonido (autoplay bloqueado?):`, err);
  });

  return () => {
    audio.pause();
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
        console.warn(`${LOG_TAG} no se pudo reproducir el sonido:`, err);
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

  // BUG ANTERIOR: la animacion de entrada (slide-in) se ponia con
  // "animation" directo en el inline style, y el parpadeo se aplicaba
  // por separado via className + CSS externo, TAMBIEN con "animation".
  // Como las dos tocan la misma propiedad CSS en el mismo elemento, el
  // inline style (mayor prioridad) pisaba por completo la animacion de
  // parpadeo: nunca llegaba a correr. La solucion es combinar ambas
  // animaciones en un unico valor separado por coma.
  const animationValue = shouldBlink
    ? "tormentar-alert-slide-in 0.25s ease-out, tormentar-alert-blink 0.9s ease-in-out infinite"
    : "tormentar-alert-slide-in 0.25s ease-out";

  return (
    <div
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
        animation: animationValue,
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
  const { notify } = useBrowserNotifications();
  // Alertas por las que YA se disparo la notificacion nativa del
  // navegador, para no repetirla si el mismo item sigue en la cola
  // en renders sucesivos.
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  // Se dispara apenas la alerta entra a la cola, SIN esperar a que le
  // toque el turno de mostrarse como popup en pantalla. Importante
  // porque el popup visual se muestra de a uno (con un timeout que los
  // navegadores frenan en pestañas de fondo); la notificacion nativa
  // no puede depender de eso, tiene que salir apenas hay alerta nueva.
  useEffect(() => {
    for (const alert of popupQueue) {
      if (!notifiedIdsRef.current.has(alert.id)) {
        notifiedIdsRef.current.add(alert.id);
        notify(alert);
      }
    }
  }, [popupQueue, notify]);

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

  // Se monta con un Portal directo a document.body (en vez de quedar
  // anidado dentro del arbol de <Stack>/GestureHandlerRootView) porque
  // Reanimated suele aplicarle transforms a los contenedores de las
  // pantallas, lo que crea un "stacking context" propio en el navegador.
  // Con eso, el zIndex de este popup solo compite DENTRO de ese
  // contexto: se ve arriba visualmente pero los clicks (como el boton
  // de cerrar) a veces terminan capturados por el contenido de abajo.
  // Portal saca al popup de ese arbol por completo y evita el problema.
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
