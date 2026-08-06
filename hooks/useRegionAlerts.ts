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
import { useAlertPreferences, getEnabledSeverities } from "@/hooks/useAlertPreferences";
import { getWeatherAlerts, hasApiKey } from "@/lib/services/weatherService";
import {
  buildBuenosAiresGrid,
  GRID_SPACING_DEG,
  GRID_CELL_RADIUS_KM,
  type GridPoint,
} from "@/lib/services/buenosAiresGrid";
import type { WeatherAlert } from "@/shared/types/weather";

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

export function useRegionAlerts() {
  const { preferences } = useAlertPreferences();
  const [alerts, setAlerts] = useState<RegionAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const grid = useRef<GridPoint[]>(buildBuenosAiresGrid());

  const enabledSeverities = getEnabledSeverities(preferences.minSeverity);
  const enabledSeveritiesRef = useRef(enabledSeverities);
  enabledSeveritiesRef.current = enabledSeverities;

  const persistCache = useCallback(async (next: RegionAlert[]) => {
    try {
      await AsyncStorage.setItem(
        REGION_CACHE_KEY,
        JSON.stringify({ timestamp: Date.now(), alerts: next })
      );
    } catch (e) {
      console.error("Error guardando cache de alertas regionales", e);
    }
  }, []);

  const fetchRegion = useCallback(async () => {
    if (!hasApiKey()) return;
    setLoading(true);
    setError(undefined);
    const points = grid.current;
    setProgress({ done: 0, total: points.length });

    const collected: RegionAlert[] = [];
    let index = 0;
    let anyError: string | undefined;

    async function worker() {
      while (index < points.length) {
        const point = points[index++];
        try {
          const data = await getWeatherAlerts(point.latitude, point.longitude);
          const relevant = (data?.alerts || []).filter((a) =>
            enabledSeveritiesRef.current.includes(a.severity)
          );
          relevant.forEach((a) => {
            collected.push({ ...a, gridLatitude: point.latitude, gridLongitude: point.longitude });
          });
        } catch (err) {
          anyError = err instanceof Error ? err.message : "Error desconocido";
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

    setAlerts(Array.from(byId.values()));
    setError(anyError);
    setLoading(false);
    if (!anyError) {
      persistCache(Array.from(byId.values()));
    }
  }, [persistCache]);

  // Al montar: intentar usar la cache si todavia esta fresca (menos de
  // REGION_REFRESH_INTERVAL_MS de antiguedad) para no volver a barrer
  // toda la grilla cada vez que se entra a la pantalla de Mapa. Si esta
  // vencida o no existe, hace el fetch normal.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(REGION_CACHE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as { timestamp: number; alerts: RegionAlert[] };
          const age = Date.now() - parsed.timestamp;
          if (age < REGION_REFRESH_INTERVAL_MS) {
            if (!cancelled) {
              setAlerts(parsed.alerts);
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

  return {
    regionAlerts: alerts,
    regionLoading: loading,
    regionError: error,
    regionProgress: progress,
    refreshRegion: fetchRegion,
    gridSpacingDeg: GRID_SPACING_DEG,
    gridCellRadiusKm: GRID_CELL_RADIUS_KM,
    gridSize: grid.current.length,
  };
}
