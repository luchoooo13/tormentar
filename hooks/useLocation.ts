/**
 * useLocation Hook
 * Hook para obtener y manejar la ubicación del usuario
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

export function useLocation() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  // Obtener ubicación actual
  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      setError(undefined);

      // Solicitar permiso
      let status = "granted";
      if (Platform.OS !== "web") {
        const permission = await Location.requestForegroundPermissionsAsync();
        status = permission.status;
      }
      if (status !== "granted") {
        setError("Permiso de ubicación denegado");
        setLoading(false);
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

      setLocation(newLocation);

      // Guardar en AsyncStorage
      await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(newLocation));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
      console.error("Error getting location:", err);
    } finally {
      setLoading(false);
    }
  };

  // Establecer ubicación manual
  const setManualLocation = async (latitude: number, longitude: number) => {
    const newLocation: LocationData = {
      latitude,
      longitude,
    };

    // Intentar obtener nombre de ciudad
    const cityInfo = await resolveCityName(latitude, longitude);
    newLocation.city = cityInfo.city;
    newLocation.country = cityInfo.country;

    setLocation(newLocation);
    await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(newLocation));
  };

  // Inicializar: obtener ubicación guardada o solicitar nueva
  useEffect(() => {
    const init = async () => {
      try {
        const saved = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          const isValid =
            parsed && typeof parsed.latitude === "number" && typeof parsed.longitude === "number";
          if (isValid) {
            setLocation(parsed);
            setLoading(false);
          } else {
            // Ubicación guardada corrupta o de un formato viejo: descartarla y pedir una nueva.
            await AsyncStorage.removeItem(LOCATION_STORAGE_KEY);
            await getCurrentLocation();
          }
        } else {
          await getCurrentLocation();
        }
      } catch (err) {
        console.error("Error initializing location:", err);
        setLoading(false);
      }
    };

    init();
  }, []);

  return {
    location,
    loading,
    error,
    getCurrentLocation,
    setManualLocation,
  };
}
