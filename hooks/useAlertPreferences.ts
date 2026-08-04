/**
 * useAlertPreferences Hook
 * Preferencias UNIFICADAS de alertas: única fuente de verdad para toda
 * la app (Inicio, Mapa y Configuración leen y escriben el mismo estado).
 *
 * Antes existían dos claves de almacenamiento distintas y desincronizadas
 * ("tormentar_settings" en Configuración y "tormentar_min_severity" en
 * Inicio). Ahora todo vive en una sola clave, con un caché en memoria y
 * un sistema de listeners para que un cambio hecho en cualquier pantalla
 * se refleje al instante en las demás sin recargar.
 */
import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AlertSeverity } from "@/shared/types/weather";

const PREFERENCES_KEY = "tormentar_preferences";

export interface AlertPreferences {
  // Niveles de severidad que el usuario quiere recibir (filtro elegido
  // por el usuario: leve, moderada y/o fuerte).
  enabledSeverities: AlertSeverity[];
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  // Intervalo único de actualización, usado por todas las pantallas.
  updateIntervalMinutes: number;
}

export const DEFAULT_PREFERENCES: AlertPreferences = {
  enabledSeverities: ["leve", "moderada", "severa"],
  notificationsEnabled: true,
  soundEnabled: true,
  vibrationEnabled: true,
  updateIntervalMinutes: 15,
};

// Caché en memoria compartido entre todos los componentes que usan el
// hook, para que la sensibilidad sea realmente única en toda la app.
let memoryCache: AlertPreferences | null = null;
let loadPromise: Promise<AlertPreferences> | null = null;
const listeners = new Set<(prefs: AlertPreferences) => void>();

async function loadPreferences(): Promise<AlertPreferences> {
  try {
    const saved = await AsyncStorage.getItem(PREFERENCES_KEY);
    const parsed = saved ? { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) } : DEFAULT_PREFERENCES;
    memoryCache = parsed;
    return parsed;
  } catch (error) {
    console.error("Error loading alert preferences:", error);
    memoryCache = DEFAULT_PREFERENCES;
    return DEFAULT_PREFERENCES;
  }
}

export function useAlertPreferences() {
  const [preferences, setPreferences] = useState<AlertPreferences>(
    memoryCache ?? DEFAULT_PREFERENCES
  );
  const [loading, setLoading] = useState(memoryCache === null);

  useEffect(() => {
    const listener = (p: AlertPreferences) => setPreferences(p);
    listeners.add(listener);

    if (memoryCache === null) {
      if (!loadPromise) loadPromise = loadPreferences();
      loadPromise.then((p) => {
        listeners.forEach((l) => l(p));
        setLoading(false);
      });
    } else {
      setLoading(false);
    }

    return () => {
      listeners.delete(listener);
    };
  }, []);

  const updatePreferences = useCallback(async (partial: Partial<AlertPreferences>) => {
    const next = { ...(memoryCache ?? DEFAULT_PREFERENCES), ...partial };
    memoryCache = next;
    listeners.forEach((l) => l(next));
    try {
      await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(next));
    } catch (error) {
      console.error("Error saving alert preferences:", error);
    }
  }, []);

  // Activar/desactivar un nivel de severidad (filtro por elección del
  // usuario). No permite dejar todos los niveles apagados: si se
  // desactivara el último, no llegaría ninguna alerta y el usuario
  // probablemente no lo notaría hasta que sea tarde.
  const toggleSeverity = useCallback(
    (severity: AlertSeverity) => {
      const current = memoryCache ?? DEFAULT_PREFERENCES;
      const isEnabled = current.enabledSeverities.includes(severity);
      const nextSeverities = isEnabled
        ? current.enabledSeverities.filter((s) => s !== severity)
        : [...current.enabledSeverities, severity];

      if (nextSeverities.length === 0) return false;

      updatePreferences({ enabledSeverities: nextSeverities });
      return true;
    },
    [updatePreferences]
  );

  return {
    preferences,
    loading,
    updatePreferences,
    toggleSeverity,
  };
}
