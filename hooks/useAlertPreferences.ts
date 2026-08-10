/**
 * useAlertPreferences Hook
 * Preferencias UNIFICADAS de alertas: unica fuente de verdad para toda
 * la app (Inicio, Mapa y Configuracion leen y escriben el mismo estado).
 *
 * Antes existian dos claves de almacenamiento distintas y desincronizadas
 * ("tormentar_settings" en Configuracion y "tormentar_min_severity" en
 * Inicio). Ahora todo vive en una sola clave, con un cache en memoria y
 * un sistema de listeners para que un cambio hecho en cualquier pantalla
 * se refleje al instante en las demas sin recargar.
 *
 * La sensibilidad es un unico valor "minSeverity" (severidad minima):
 * el usuario elige leve, moderada o fuerte, y recibe esa alerta y todo
 * lo que sea igual o mas grave. Por ejemplo, elegir "moderada" trae
 * alertas moderadas y fuertes, pero no leves.
 */
import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AlertSeverity } from "@/shared/types/weather";

const PREFERENCES_KEY = "tormentar_preferences";

// Orden de gravedad: cuanto mas bajo el numero, mas grave la alerta.
export const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  severa: 0,
  moderada: 1,
  leve: 2,
};

// Dado un umbral minimo, devuelve todos los niveles que hay que
// aceptar (el elegido y todos los mas graves que el).
export function getEnabledSeverities(minSeverity: AlertSeverity): AlertSeverity[] {
  const threshold = SEVERITY_ORDER[minSeverity];
  return (Object.keys(SEVERITY_ORDER) as AlertSeverity[]).filter(
    (severity) => SEVERITY_ORDER[severity] <= threshold
  );
}

export interface AlertPreferences {
  // Severidad minima que el usuario quiere recibir (leve, moderada o
  // fuerte/severa). Unica para toda la app.
  minSeverity: AlertSeverity;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  lightningAlertEnabled: boolean;
  // Intervalo unico de actualizacion, usado por todas las pantallas.
  updateIntervalMinutes: number;
}

export const DEFAULT_PREFERENCES: AlertPreferences = {
  minSeverity: "leve",
  notificationsEnabled: true,
  soundEnabled: true,
  vibrationEnabled: true,
  lightningAlertEnabled: false,
  updateIntervalMinutes: 15,
};

// Cache en memoria compartido entre todos los componentes que usan el
// hook, para que la sensibilidad sea realmente unica en toda la app.
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

  // Elegir la severidad minima (unica seleccion, no multiple).
  const setMinSeverity = useCallback(
    (severity: AlertSeverity) => {
      updatePreferences({ minSeverity: severity });
    },
    [updatePreferences]
  );

  return {
    preferences,
    loading,
    updatePreferences,
    setMinSeverity,
    enabledSeverities: getEnabledSeverities(preferences.minSeverity),
  };
}
