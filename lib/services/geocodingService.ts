/**
 * Geocoding Service
 * Busca coordenadas a partir de un nombre de ciudad.
 *
 * NOTA: `Location.geocodeAsync` de expo-location NO funciona en web
 * (requiere un geocoder nativo de iOS/Android). Por eso, para que la
 * busqueda de ciudad funcione tanto en web como en nativo, usamos la
 * API publica de geocodificacion de Open-Meteo, que no requiere API
 * key y tiene CORS habilitado para poder llamarla desde el navegador.
 */
import axios from "axios";

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

export interface CitySearchResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string; // provincia / estado
}

export interface ReverseGeocodeResult {
  city?: string;
  country?: string;
}

// Geocodificacion inversa (coordenadas -> nombre de ciudad) compatible
// con web. `Location.reverseGeocodeAsync` de expo-location NO funciona
// en navegador (requiere el geocoder nativo de iOS/Android): falla en
// silencio y la ciudad queda vacia para siempre. Usamos BigDataCloud,
// que es gratuito, no pide API key y tiene CORS habilitado.
export async function reverseGeocodeWeb(
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeResult> {
  try {
    const response = await axios.get("https://api.bigdatacloud.net/data/reverse-geocode-client", {
      params: { latitude, longitude, localityLanguage: "es" },
    });

    const data = response.data;
    return {
      city: data?.city || data?.locality || data?.principalSubdivision || undefined,
      country: data?.countryName || undefined,
    };
  } catch (err) {
    console.warn("Error en geocodificacion inversa:", err);
    return {};
  }
}

export async function searchCities(query: string): Promise<CitySearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  try {
    const response = await axios.get(GEOCODING_URL, {
      params: {
        name: trimmed,
        count: 5,
        language: "es",
        format: "json",
      },
    });

    const results = response.data?.results;
    if (!Array.isArray(results)) return [];

    return results.map((r: any) => ({
      id: r.id,
      name: r.name,
      latitude: r.latitude,
      longitude: r.longitude,
      country: r.country,
      admin1: r.admin1,
    }));
  } catch (err) {
    console.error("Error buscando ciudad:", err);
    throw new Error("No se pudo buscar la ciudad. Revisa tu conexion e intenta de nuevo.");
  }
}
