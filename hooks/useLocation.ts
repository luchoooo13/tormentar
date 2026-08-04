/**
 * useLocation Hook
 * Hook para obtener y manejar la ubicación del usuario
 */

import { useEffect, useState } from "react";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LocationData } from "@/shared/types/weather";

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
      const { status } = await Location.requestForegroundPermissionsAsync();
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
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: newLocation.latitude,
          longitude: newLocation.longitude,
        });

        if (reverseGeocode.length > 0) {
          const address = reverseGeocode[0];
          newLocation.city = address.city || address.region || undefined;
          newLocation.country = address.country || undefined;
        }
      } catch (e) {
        console.warn("Error getting city name:", e);
      }

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
    try {
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (reverseGeocode.length > 0) {
        const address = reverseGeocode[0];
        newLocation.city = address.city || address.region || undefined;
        newLocation.country = address.country || undefined;
      }
    } catch (e) {
      console.warn("Error getting city name:", e);
    }

    setLocation(newLocation);
    await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(newLocation));
  };

  // Inicializar: obtener ubicación guardada o solicitar nueva
  useEffect(() => {
    const init = async () => {
      try {
        const saved = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
        if (saved) {
          setLocation(JSON.parse(saved));
          setLoading(false);
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
