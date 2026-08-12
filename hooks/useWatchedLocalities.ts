/**
 * useWatchedLocalities Hook
 * Maneja una lista de "otras localidades" que el usuario agrega a mano
 * (buscandolas por nombre) para ver, en el Mapa, sus alertas NO
 * OFICIALES (mismo criterio estimado que usa el resto de la app: se
 * calculan a partir del pronostico gratuito de Open-Meteo, no son
 * alertas oficiales de ningun servicio meteorologico).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAlertPreferences, getEnabledSeverities } from "@/hooks/useAlertPreferences";
import {
  searchCities,
  type CitySearchResult,
} from "@/lib/services/geocodingService";
import { getWeatherAlerts, sortAlertsBySeverity, hasApiKey } from "@/lib/services/weatherService";
import type { WeatherAlert } from "@/shared/types/weather";
import { UPDATE_INTERVAL_MS } from "@/shared/updateInterval";

const WATCHED_LOCALITIES_KEY = "tormentar_watched_localities";
const SEARCH_DEBOUNCE_MS = 400;

export interface WatchedLocality {
  id: string;
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

export interface LocalityAlertsState {
  alerts: WeatherAlert[];
  loading: boolean;
  error?: string;
}

function localityIdFor(lat: number, lon: number): string {
  return `${lat.toFixed(3)}:${lon.toFixed(3)}`;
}

export function useWatchedLocalities() {
  const { preferences } = useAlertPreferences();
  const [localities, setLocalities] = useState<WatchedLocality[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [alertsByLocality, setAlertsByLocality] = useState<Record<string, LocalityAlertsState>>({});

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CitySearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | undefined>(undefined);

  // Cargar localidades guardadas.
  useEffect(() => {
    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem(WATCHED_LOCALITIES_KEY);
        if (saved) {
          setLocalities(JSON.parse(saved));
        }
      } catch (e) {
        console.error("Error cargando localidades guardadas", e);
      } finally {
        setLoaded(true);
      }
    };
    load();
  }, []);

  const persist = useCallback(async (next: WatchedLocality[]) => {
    setLocalities(next);
    try {
      await AsyncStorage.setItem(WATCHED_LOCALITIES_KEY, JSON.stringify(next));
    } catch (e) {
      console.error("Error guardando localidades", e);
    }
  }, []);

  const addLocality = useCallback(
    (city: CitySearchResult) => {
      const id = localityIdFor(city.latitude, city.longitude);
      setLocalities((prev) => {
        if (prev.some((l) => l.id === id)) return prev;
        const next = [
          ...prev,
          {
            id,
            name: city.name,
            admin1: city.admin1,
            country: city.country,
            latitude: city.latitude,
            longitude: city.longitude,
          },
        ];
        persist(next);
        return next;
      });
      setSearchQuery("");
      setSearchResults([]);
    },
    [persist]
  );

  const removeLocality = useCallback(
    (id: string) => {
      setLocalities((prev) => {
        const next = prev.filter((l) => l.id !== id);
        persist(next);
        return next;
      });
      setAlertsByLocality((prev) => {
        const { [id]: _removed, ...rest } = prev;
        return rest;
      });
    },
    [persist]
  );

  // Busqueda de ciudades con debounce.
  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchError(undefined);
      setSearching(false);
      return;
    }

    setSearching(true);
    setSearchError(undefined);
    const timeout = setTimeout(async () => {
      try {
        const results = await searchCities(query);
        setSearchResults(results);
      } catch (err) {
        setSearchError(err instanceof Error ? err.message : "Error buscando la ciudad");
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Traer alertas (estimadas, no oficiales) de cada localidad guardada.
  const enabledSeverities = getEnabledSeverities(preferences.minSeverity);
  const enabledSeveritiesRef = useRef(enabledSeverities);
  enabledSeveritiesRef.current = enabledSeverities;

  const fetchAlertsFor = useCallback(async (locality: WatchedLocality) => {
    if (!hasApiKey()) return;
    setAlertsByLocality((prev) => ({
      ...prev,
      [locality.id]: { alerts: prev[locality.id]?.alerts ?? [], loading: true, error: undefined },
    }));
    try {
      const data = await getWeatherAlerts(locality.latitude, locality.longitude);
      const alerts = sortAlertsBySeverity(
        (data?.alerts || []).filter((a) => enabledSeveritiesRef.current.includes(a.severity))
      );
      setAlertsByLocality((prev) => ({
        ...prev,
        [locality.id]: { alerts, loading: false, error: undefined },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setAlertsByLocality((prev) => ({
        ...prev,
        [locality.id]: { alerts: prev[locality.id]?.alerts ?? [], loading: false, error: message },
      }));
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all(localities.map((l) => fetchAlertsFor(l)));
  }, [localities, fetchAlertsFor]);

  // Buscar apenas se agrega una localidad nueva.
  useEffect(() => {
    if (!loaded) return;
    localities.forEach((l) => {
      if (!alertsByLocality[l.id]) fetchAlertsFor(l);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, localities]);

  // Actualizacion periodica, mismo intervalo fijo que la ubicacion actual.
  useEffect(() => {
    if (localities.length === 0) return;
    const id = setInterval(refreshAll, UPDATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [localities.length, refreshAll]);

  return {
    localities,
    alertsByLocality,
    searchQuery,
    setSearchQuery,
    searchResults,
    searching,
    searchError,
    addLocality,
    removeLocality,
    refreshAll,
  };
}
