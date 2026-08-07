/**
 * useLocation Hook
 * Hook para obtener y manejar la ubicación del usuario.
 *
 * FIX: unificado en un estado GLOBAL compartido (mismo patron que
 * useAlertPreferences.ts: cache en memoria + listeners), en vez de que
 * cada pantalla que llamaba a useLocation() tuviera su propia copia de
 * "location" en estado local.
 *
 * Antes, Configuracion llamaba a su propio useLocation() para buscar y
 * setear una ciudad manualmente, mientras que Inicio y Mapa usaban OTRA
 * instancia distinta (la de adentro de useAlerts(), montada una sola
 * vez en AlertsContext). Cada instancia tenia su propio useState, asi
 * que cuando en Configuracion se elegia una ciudad nueva, esa instancia
 * se actualizaba pero la de Inicio/Mapa no se enteraba: seguian usando
 * la ubicacion vieja hasta que la app se volvia a montar por completo
 * (o sea, hasta refrescar la pagina). Con el estado compartido, apenas
 * se llama a setManualLocation/getCurrentLocation desde CUALQUIER
 * pantalla, todas las demas instancias de useLocation() se enteran al
 * toque (los listeners disparan un re-render), y como fetchAlerts() en
 * useAlerts.ts depende de "location", las alertas se vuelven a pedir
 * automaticamente para la ubicacion nueva sin recargar nada.
 */

import { useEffect, useState } from "react";
import { Platform } from "react-native";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LocationData } from "@/shared/types/weather";
import { reverseGeocodeWeb } from "@/lib/services/geocodingService";

// `Location.reverseGeocodeAsync` de expo-location no funciona en web
// (requiere el geocoder nativo). En web usamos un servicio HTTP en su
// lugar; en nativo seguimos usando el geocoder del sistema operativo.
async function resolveCityName(latitude: number, longitude: number) {
  if (Platform.OS === "web") {
    return reverseGeocodeWeb(latitude, longitude);
  }
  try {
    const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (reverseGeocode.length > 0) {
      const address = reverseGeocode[0];
      return { city: address.city || address.region || undefined, country: address.country || undefined };
    }
  } catch (e) {
    console.warn("Error getting city name:", e);
  }
  return {};
}

const LOCATION_STORAGE_KEY = "tormentar_location";

interface LocationState {
  location: LocationData | null;
  loading: boolean;
  error: string | undefined;
}

// Estado y listeners compartidos por TODAS las instancias de useLocation()
// en la app, igual que memoryCache/listeners en useAlertPreferences.ts.
let stateCache: LocationState = { location: null, loading: true, error: undefined };
let initPromise: Promise<void> | null = null;
const listeners = new Set<(state: LocationState) => void>();

function broadcast(next: Partial<LocationState>) {
  stateCache = { ...stateCache, ...next };
  listeners.forEach((l) => l(stateCache));
}

// Obtener ubicación actual (GPS/navegador). Actualiza el estado global.
async function getCurrentLocationShared() {
  try {
    broadcast({ loading: true, error: undefined });

    let status = "granted";
    if (Platform.OS !== "web") {
      const permission = await Location.requestForegroundPermissionsAsync();
      status = permission.status;
    }
    if (status !== "granted") {
      broadcast({ error: "Permiso de ubicación denegado", loading: false });
      return;
    }

    const currentLocation = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const newLocation: LocationData = {
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude,
    };

    const cityInfo = await resolveCityName(newLocation.latitude, newLocation.longitude);
    newLocation.city = cityInfo.city;
    newLocation.country = cityInfo.country;

    broadcast({ location: newLocation, loading: false, error: undefined });
    await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(newLocation));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error getting location:", err);
    broadcast({ error: message, loading: false });
  }
}

// Establecer ubicación manual (busqueda de ciudad). Actualiza el estado
// global: cualquier pantalla montada se entera al instante.
async function setManualLocationShared(latitude: number, longitude: number) {
  const newLocation: LocationData = { latitude, longitude };

  const cityInfo = await resolveCityName(latitude, longitude);
  newLocation.city = cityInfo.city;
  newLocation.country = cityInfo.country;

  broadcast({ location: newLocation, error: undefined });
  await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(newLocation));
}

async function initLocation(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const isValid =
        parsed && typeof parsed.latitude === "number" && typeof parsed.longitude === "number";
      if (isValid) {
        broadcast({ location: parsed, loading: false });
        return;
      }
      // Ubicación guardada corrupta o de un formato viejo: descartarla y pedir una nueva.
      await AsyncStorage.removeItem(LOCATION_STORAGE_KEY);
    }
    await getCurrentLocationShared();
  } catch (err) {
    console.error("Error initializing location:", err);
    broadcast({ loading: false });
  }
}

export function useLocation() {
  const [state, setState] = useState<LocationState>(stateCache);

  useEffect(() => {
    const listener = (next: LocationState) => setState(next);
    listeners.add(listener);

    if (!initPromise) {
      initPromise = initLocation();
    }
    // Por si initLocation ya termino antes de que este componente se
    // montara, sincronizamos una vez mas con el valor actual.
    setState(stateCache);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    location: state.location,
    loading: state.loading,
    error: state.error,
    getCurrentLocation: getCurrentLocationShared,
    setManualLocation: setManualLocationShared,
  };
}
