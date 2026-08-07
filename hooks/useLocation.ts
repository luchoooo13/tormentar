/**
 * useLocation Hook
 * Hook para obtener y manejar la ubicación del usuario.
 * Ahora usa un cache en memoria y un sistema de listeners para que
 * la ubicación sea ÚNICA en toda la aplicación. Si se cambia en
 * Configuración, se actualiza al instante en Inicio y Mapa.
 */

import { useEffect, useState, useCallback } from "react";
import { Platform } from "react-native";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LocationData } from "@/shared/types/weather";
import { reverseGeocodeWeb } from "@/lib/services/geocodingService";

const LOCATION_STORAGE_KEY = "tormentar_location";

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

// Estado compartido en memoria
let memoryLocation: LocationData | null = null;
let memoryLoading = true;
let memoryError: string | undefined = undefined;
let loadPromise: Promise<void> | null = null;
const listeners = new Set<(state: { location: LocationData | null; loading: boolean; error?: string }) => void>();

function notifyListeners() {
  const state = { location: memoryLocation, loading: memoryLoading, error: memoryError };
  listeners.forEach((l) => l(state));
}

export function useLocation() {
  const [state, setState] = useState({
    location: memoryLocation,
    loading: memoryLoading,
    error: memoryError,
  });

  // Obtener ubicación actual
  const getCurrentLocation = useCallback(async () => {
    try {
      memoryLoading = true;
      memoryError = undefined;
      notifyListeners();

      // Solicitar permiso
      let status = "granted";
      if (Platform.OS !== "web") {
        const permission = await Location.requestForegroundPermissionsAsync();
        status = permission.status;
      }
      if (status !== "granted") {
        memoryError = "Permiso de ubicación denegado";
        memoryLoading = false;
        notifyListeners();
        return;
      }

      // Obtener ubicación
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newLocation: LocationData = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };

      // Intentar obtener nombre de ciudad
      const cityInfo = await resolveCityName(newLocation.latitude, newLocation.longitude);
      newLocation.city = cityInfo.city;
      newLocation.country = cityInfo.country;

      memoryLocation = newLocation;
      memoryLoading = false;
      notifyListeners();

      // Guardar en AsyncStorage
      await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(newLocation));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      memoryError = message;
      memoryLoading = false;
      notifyListeners();
      console.error("Error getting location:", err);
    }
  }, []);

  // Establecer ubicación manual
  const setManualLocation = useCallback(async (latitude: number, longitude: number) => {
    memoryLoading = true;
    notifyListeners();

    const newLocation: LocationData = {
      latitude,
      longitude,
    };

    // Intentar obtener nombre de ciudad
    const cityInfo = await resolveCityName(latitude, longitude);
    newLocation.city = cityInfo.city;
    newLocation.country = cityInfo.country;

    memoryLocation = newLocation;
    memoryLoading = false;
    notifyListeners();
    await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(newLocation));
  }, []);

  useEffect(() => {
    const listener = (s: { location: LocationData | null; loading: boolean; error?: string }) => setState(s);
    listeners.add(listener);

    const init = async () => {
      if (loadPromise) {
        await loadPromise;
        return;
      }

      loadPromise = (async () => {
        try {
          const saved = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            const isValid =
              parsed && typeof parsed.latitude === "number" && typeof parsed.longitude === "number";
            if (isValid) {
              memoryLocation = parsed;
              memoryLoading = false;
            } else {
              await AsyncStorage.removeItem(LOCATION_STORAGE_KEY);
              await getCurrentLocation();
            }
          } else {
            await getCurrentLocation();
          }
        } catch (err) {
          console.error("Error initializing location:", err);
          memoryLoading = false;
        } finally {
          notifyListeners();
        }
      })();
      await loadPromise;
    };

    if (memoryLoading && !loadPromise) {
      init();
    } else {
      // Si ya cargó o está cargando, sincronizamos el estado local
      setState({ location: memoryLocation, loading: memoryLoading, error: memoryError });
    }

    return () => {
      listeners.delete(listener);
    };
  }, [getCurrentLocation]);

  return {
    location: state.location,
    loading: state.loading,
    error: state.error,
    getCurrentLocation,
    setManualLocation,
  };
}
