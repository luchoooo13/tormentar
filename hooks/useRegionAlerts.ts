/**
 * useRegionAlerts Hook
 * Reemplaza la busqueda manual de "otras localidades" (ciudad por
 * ciudad) por una grilla fija que cubre automaticamente TODA la
 * Provincia de Buenos Aires. Consulta el pronostico gratuito de
 * OpenWeatherMap en cada punto de la grilla y arma una lista de
 * alertas estimadas (NO oficiales, mismo criterio que el resto de la
 * app) para pintar directamente en el mapa como zonas resaltadas.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAlertPreferences, getEnabledSeverities, SEVERITY_ORDER } from "@/hooks/useAlertPreferences";
import { getWeatherAlerts, hasApiKey, isAlertActive } from "@/lib/services/weatherService";
import {
  buildBuenosAiresGrid,
  GRID_SPACING_DEG,
  GRID_CELL_RADIUS_KM,
  type GridPoint,
} from "@/lib/services/buenosAiresGrid";
import type { AlertSeverity, WeatherAlert } from "@/shared/types/weather";

// Cuantos puntos de la grilla se consultan en simultaneo. Evita pegarle
// a la API gratuita de OpenWeatherMap con muchos pedidos al mismo tiempo.
const CONCURRENCY = 5;

// Intervalo de actualizacion PROPIO de la grilla regional, independiente
// del intervalo configurado para la ubicacion personal (que suele ser
// mucho mas corto). Barrer 12 puntos cada pocos minutos consumiria el
// cupo diario de la API gratuita muy rapido; cada 30 minutos alcanza
// para detectar tormentas nuevas sin gastar de mas.
const REGION_REFRESH_INTERVAL_MS = 30 * 60 * 1000;

// Cache en disco: si el usuario entra y sale de la pantalla de Mapa
// varias veces, no vuelve a barrer toda la grilla cada vez que se monta
// el componente; reusa el resultado mientras no este vencido.
const REGION_CACHE_KEY = "tormentar_region_alerts_cache";

export interface RegionAlert extends WeatherAlert {
  // Punto de grilla del que salio esta alerta (se usa para dibujar la
  // celda resaltada en el mapa, independientemente de si la alerta en
  // si trae o no latitude/longitude propios).
  gridLatitude: number;
  gridLongitude: number;
}

// Estado ACTUAL (ahora mismo) de un punto de la grilla: incluye tambien
// los puntos SIN alerta (severity: null). Antes solo se guardaban los
// puntos con alerta, lo que hacia imposible saber donde terminaba una
// zona con alerta y empezaba una sin alerta: solo se sabia "aca hay
// alerta", nunca "aca NO hay". Con los puntos limpios tambien
// guardados, se puede recortar el area en el mapa contra las
// localidades vecinas que estan despejadas (y viceversa).
export interface RegionPoint {
  latitude: number;
  longitude: number;
  severity: AlertSeverity | null;
  alert?: RegionAlert;
}

interface RegionCache {
  timestamp: number;
  alerts: RegionAlert[];
  points: RegionPoint[];
}

export function useRegionAlerts() {
  const { preferences } = useAlertPreferences();
  const [alerts, setAlerts] = useState<RegionAlert[]>([]);
  const [points, setPoints] = useState<RegionPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const grid = useRef<GridPoint[]>(buildBuenosAiresGrid());

  const enabledSeverities = getEnabledSeverities(preferences.minSeverity);
  const enabledSeveritiesRef = useRef(enabledSeverities);
  enabledSeveritiesRef.current = enabledSeverities;

  const persistCache = useCallback(async (next: RegionAlert[], nextPoints: RegionPoint[]) => {
    try {
      const cache: RegionCache = { timestamp: Date.now(), alerts: next, points: nextPoints };
      await AsyncStorage.setItem(REGION_CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      console.error("Error guardando cache de alertas regionales", e);
    }
  }, []);

  const fetchRegion = useCallback(async () => {
    if (!hasApiKey()) return;
    setLoading(true);
    setError(undefined);
    const gridPoints = grid.current;
    setProgress({ done: 0, total: gridPoints.length });

    const collected: RegionAlert[] = [];
    const collectedPoints: RegionPoint[] = [];
    let index = 0;
    let anyError: string | undefined;

    async function worker() {
      while (index < gridPoints.length) {
        const point = gridPoints[index++];
        try {
          const data = await getWeatherAlerts(point.latitude, point.longitude);
          const relevant = (data?.alerts || []).filter((a) =>
            enabledSeveritiesRef.current.includes(a.severity)
          );
          const relevantWithGrid: RegionAlert[] = relevant.map((a) => ({
            ...a,
            gridLatitude: point.latitude,
            gridLongitude: point.longitude,
          }));
          relevantWithGrid.forEach((a) => collected.push(a));

          // Severidad AHORA MISMO en este punto: entre las alertas
          // vigentes en este instante, la mas grave. Si no hay ninguna
          // vigente ahora (aunque haya alguna estimada para mas
          // adelante en el pronostico), el punto queda "limpio" para
          // el mosaico del mapa.
          const activeNow = relevantWithGrid
            .filter(isAlertActive)
            .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
          const current = activeNow[0];

          collectedPoints.push({
            latitude: point.latitude,
            longitude: point.longitude,
            severity: current ? current.severity : null,
            alert: current,
          });
        } catch (err) {
          anyError = err instanceof Error ? err.message : "Error desconocido";
          collectedPoints.push({ latitude: point.latitude, longitude: point.longitude, severity: null });
        } finally {
          setProgress((prev) => ({ ...prev, done: prev.done + 1 }));
        }
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    // Dedupe por id: el mismo sistema de tormenta puede aparecer en
    // varios puntos de grilla vecinos.
    const byId = new Map<string, RegionAlert>();
    collected.forEach((a) => {
      if (!byId.has(a.id)) byId.set(a.id, a);
    });
    const dedupedAlerts = Array.from(byId.values());

    setAlerts(dedupedAlerts);
    setPoints(collectedPoints);
    setError(anyError);
    setLoading(false);
    if (!anyError) {
      persistCache(dedupedAlerts, collectedPoints);
    }
  }, [persistCache]);

  // Al montar: intentar usar la cache si todavia esta fresca (menos de
  // REGION_REFRESH_INTERVAL_MS de antiguedad) para no volver a barrer
  // toda la grilla cada vez que se entra a la pantalla de Mapa. Si esta
  // vencida, no existe, o es de un formato viejo (sin "points"), hace
  // el fetch normal.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(REGION_CACHE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as Partial<RegionCache>;
          const age = Date.now() - (parsed.timestamp ?? 0);
          if (age < REGION_REFRESH_INTERVAL_MS && Array.isArray(parsed.points)) {
            if (!cancelled) {
              setAlerts(parsed.alerts ?? []);
              setPoints(parsed.points);
            }
            return;
          }
        }
      } catch (e) {
        console.error("Error leyendo cache de alertas regionales", e);
      }
      if (!cancelled) fetchRegion();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Actualizacion periodica con el intervalo PROPIO de la grilla (30
  // min), no con el intervalo de la ubicacion personal.
  useEffect(() => {
    const id = setInterval(fetchRegion, REGION_REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchRegion]);

  // Al volver a la pestana (foco/visibilidad), revisar si la cache ya
  // vencio y, si es asi, barrer la grilla de nuevo. Esto cubre el caso
  // en que el intervalo de 30 min cae mientras la pestana esta en
  // segundo plano (los navegadores frenan los timers ahi) y el usuario
  // vuelve encontrandose con datos viejos sin saberlo.
  useEffect(() => {
    if (typeof document === "undefined") return;

    const maybeRefetch = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const saved = await AsyncStorage.getItem(REGION_CACHE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as Partial<RegionCache>;
          const age = Date.now() - (parsed.timestamp ?? 0);
          if (age < REGION_REFRESH_INTERVAL_MS && Array.isArray(parsed.points)) return;
        }
      } catch (e) {
        console.error("Error leyendo cache de alertas regionales", e);
      }
      fetchRegion();
    };

    document.addEventListener("visibilitychange", maybeRefetch);
    window.addEventListener("focus", maybeRefetch);
    return () => {
      document.removeEventListener("visibilitychange", maybeRefetch);
      window.removeEventListener("focus", maybeRefetch);
    };
  }, [fetchRegion]);

  return {
    regionAlerts: alerts,
    regionPoints: points,
    regionLoading: loading,
    regionError: error,
    regionProgress: progress,
    refreshRegion: fetchRegion,
    gridSpacingDeg: GRID_SPACING_DEG,
    gridCellRadiusKm: GRID_CELL_RADIUS_KM,
    gridSize: grid.current.length,
  };
}
