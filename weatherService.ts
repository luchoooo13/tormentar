/**
 * Weather Service
 * Servicio para obtener datos de clima y alertas de OpenWeatherMap
 */

import axios from "axios";
import type { WeatherAlert, WeatherData, AlertSeverity } from "@/shared/types/weather";

const API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY || "";
const BASE_URL = "https://api.openweathermap.org/data/3.0/onecall";

// Indica si hay una API key configurada. Sin esto, la app no puede
// consultar alertas reales y las pantallas deben mostrarlo claramente
// en vez de caer en datos de demostración silenciosos.
export function hasApiKey(): boolean {
  return API_KEY.length > 0;
}

// Categorizar alertas por severidad basado en el tipo de evento
function categorizeAlertSeverity(event: string): AlertSeverity {
  const eventLower = event.toLowerCase();

  // Eventos severos
  if (
    eventLower.includes("tornado") ||
    eventLower.includes("severe") ||
    eventLower.includes("hurricane") ||
    eventLower.includes("typhoon") ||
    eventLower.includes("extreme") ||
    eventLower.includes("warning")
  ) {
    return "severa";
  }

  // Eventos moderados
  if (
    eventLower.includes("thunderstorm") ||
    eventLower.includes("storm") ||
    eventLower.includes("heavy") ||
    eventLower.includes("watch")
  ) {
    return "moderada";
  }

  // Eventos leves
  return "leve";
}

// Obtener datos de clima y alertas
export async function getWeatherAlerts(
  latitude: number,
  longitude: number
): Promise<WeatherData | null> {
  if (!hasApiKey()) {
    console.error(
      "Falta configurar EXPO_PUBLIC_OPENWEATHER_API_KEY: no se pueden obtener alertas reales."
    );
    return null;
  }

  try {
    const response = await axios.get(BASE_URL, {
      params: {
        lat: latitude,
        lon: longitude,
        appid: API_KEY,
        units: "metric",
        lang: "es",
      },
    });

    const data = response.data;

    // Procesar alertas y categorizar por severidad
    const alerts: WeatherAlert[] = (data.alerts || []).map((alert: any) => ({
      id: `${alert.start}-${alert.end}`,
      event: alert.event,
      description: alert.description,
      start: alert.start,
      end: alert.end,
      sender_name: alert.sender_name,
      severity: categorizeAlertSeverity(alert.event),
      latitude,
      longitude,
      radius: 10, // Radio por defecto en km
    }));

    return {
      lat: data.lat,
      lon: data.lon,
      timezone: data.timezone,
      current: {
        temp: data.current.temp,
        feels_like: data.current.feels_like,
        humidity: data.current.humidity,
        pressure: data.current.pressure,
        wind_speed: data.current.wind_speed,
        wind_deg: data.current.wind_deg,
        clouds: data.current.clouds,
        weather: data.current.weather,
      },
      alerts,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401) {
        throw new Error(
          "OpenWeatherMap rechazó la API key. Verificá que sea correcta y que tenga habilitado el plan 'One Call 3.0'."
        );
      }
      if (status === 429) {
        throw new Error("Se superó el límite de llamadas a OpenWeatherMap por hoy.");
      }
      throw new Error(`Error consultando OpenWeatherMap (${status ?? "sin conexión"}).`);
    }
    console.error("Error fetching weather data:", error);
    return null;
  }
}

// Obtener solo alertas
export async function getAlerts(
  latitude: number,
  longitude: number
): Promise<WeatherAlert[]> {
  const data = await getWeatherAlerts(latitude, longitude);
  return data?.alerts || [];
}

// Filtrar alertas por severidad
export function filterAlertsBySeverity(
  alerts: WeatherAlert[],
  severity: AlertSeverity
): WeatherAlert[] {
  return alerts.filter((alert) => alert.severity === severity);
}

// Obtener alertas ordenadas por severidad (severa primero)
export function sortAlertsBySeverity(alerts: WeatherAlert[]): WeatherAlert[] {
  const severityOrder = { severa: 0, moderada: 1, leve: 2 };
  return [...alerts].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );
}

// Verificar si una alerta está activa
export function isAlertActive(alert: WeatherAlert): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now >= alert.start && now <= alert.end;
}

// Obtener alertas activas
export function getActiveAlerts(alerts: WeatherAlert[]): WeatherAlert[] {
  return alerts.filter(isAlertActive);
}

// Formatear tiempo de alerta
export function formatAlertTime(startTime: number, endTime: number): string {
  const start = new Date(startTime * 1000);
  const end = new Date(endTime * 1000);

  const startStr = start.toLocaleString("es-ES", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const endStr = end.toLocaleString("es-ES", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${startStr} - ${endStr}`;
}
