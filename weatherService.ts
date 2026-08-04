/**
 * Weather Service
 * Servicio de clima y alertas basado en Open-Meteo (API 100% gratuita,
 * sin API key ni tarjeta de crédito: https://open-meteo.com).
 *
 * Antes este servicio dependía del "alerts" oficial de OpenWeatherMap
 * One Call 3.0 (requiere API key paga/con tarjeta). Ahora en vez de
 * esperar una alerta oficial, ANALIZAMOS nosotros el pronóstico horario
 * (lluvia, probabilidad de precipitación, ráfagas de viento, tormentas
 * eléctricas, CAPE) y generamos alertas propias clasificadas en
 * leve / moderada / severa (fuerte).
 */

import axios from "axios";
import type { WeatherAlert, WeatherData, AlertSeverity, CurrentWeather } from "@/shared/types/weather";

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

// Open-Meteo no requiere API key, así que el servicio siempre está
// disponible. Se mantiene esta función (y su nombre) para no romper
// las pantallas que ya la usan para mostrar avisos.
export function hasApiKey(): boolean {
  return true;
}

// --- Interpretación de códigos de clima WMO (los usa Open-Meteo) ---
const WEATHER_CODES: Record<number, { description: string; main: string }> = {
  0: { description: "cielo despejado", main: "Clear" },
  1: { description: "mayormente despejado", main: "Clear" },
  2: { description: "parcialmente nublado", main: "Clouds" },
  3: { description: "cielo cubierto", main: "Clouds" },
  45: { description: "niebla", main: "Fog" },
  48: { description: "niebla escarchada", main: "Fog" },
  51: { description: "llovizna leve", main: "Drizzle" },
  53: { description: "llovizna moderada", main: "Drizzle" },
  55: { description: "llovizna intensa", main: "Drizzle" },
  56: { description: "llovizna helada leve", main: "Drizzle" },
  57: { description: "llovizna helada intensa", main: "Drizzle" },
  61: { description: "lluvia leve", main: "Rain" },
  63: { description: "lluvia moderada", main: "Rain" },
  65: { description: "lluvia intensa", main: "Rain" },
  66: { description: "lluvia helada leve", main: "Rain" },
  67: { description: "lluvia helada intensa", main: "Rain" },
  71: { description: "nevadas leves", main: "Snow" },
  73: { description: "nevadas moderadas", main: "Snow" },
  75: { description: "nevadas intensas", main: "Snow" },
  77: { description: "granos de nieve", main: "Snow" },
  80: { description: "chubascos leves", main: "Rain" },
  81: { description: "chubascos moderados", main: "Rain" },
  82: { description: "chubascos violentos", main: "Rain" },
  85: { description: "chubascos de nieve leves", main: "Snow" },
  86: { description: "chubascos de nieve intensos", main: "Snow" },
  95: { description: "tormenta eléctrica", main: "Thunderstorm" },
  96: { description: "tormenta eléctrica con granizo leve", main: "Thunderstorm" },
  99: { description: "tormenta eléctrica con granizo intenso", main: "Thunderstorm" },
};

function getWeatherCodeInfo(code: number) {
  return WEATHER_CODES[code] ?? { description: "condiciones variables", main: "Unknown" };
}

function iconForCode(code: number, isDay = true): string {
  const suffix = isDay ? "d" : "n";
  if (code === 0) return `01${suffix}`;
  if (code <= 2) return `02${suffix}`;
  if (code === 3) return `04${suffix}`;
  if (code === 45 || code === 48) return `50${suffix}`;
  if (code >= 51 && code <= 57) return `09${suffix}`;
  if (code >= 61 && code <= 67) return `10${suffix}`;
  if (code >= 71 && code <= 77) return `13${suffix}`;
  if (code >= 80 && code <= 82) return `09${suffix}`;
  if (code >= 85 && code <= 86) return `13${suffix}`;
  if (code >= 95) return `11${suffix}`;
  return `01${suffix}`;
}

// --- Análisis del pronóstico horario para generar alertas propias ---

interface HourSample {
  timeIso: string;
  timestamp: number;
  code: number;
  precipProb: number;
  precip: number;
  windSpeed: number; // m/s
  windGust: number; // m/s
  cape: number;
}

const MS_50KMH = 13.9;
const MS_70KMH = 19.4;
const MS_30KMH = 8.3;

function severityForHour(h: HourSample): AlertSeverity | null {
  const isThunder = h.code >= 95;
  const isHeavyRainCode = [65, 67, 82, 96, 99].includes(h.code);
  const isModerateRainCode = [63, 66, 81, 95].includes(h.code);
  const isLightPrecipCode = [45, 48, 51, 53, 55, 56, 61, 71, 73, 75, 77, 80, 85, 86].includes(h.code);

  // Severa (fuerte): tormenta con granizo, ráfagas muy fuertes, lluvia
  // muy intensa o CAPE alto (gran energía disponible para tormentas).
  if (
    h.code === 96 ||
    h.code === 99 ||
    h.windGust >= MS_70KMH ||
    h.precip >= 15 ||
    h.cape >= 2500 ||
    (isThunder && h.windGust >= MS_50KMH)
  ) {
    return "severa";
  }

  // Moderada: tormenta eléctrica simple, lluvia moderada/intensa,
  // ráfagas moderadas o alta probabilidad de precipitación con lluvia real.
  if (
    isThunder ||
    isHeavyRainCode ||
    isModerateRainCode ||
    h.windGust >= MS_50KMH ||
    h.precip >= 4 ||
    h.cape >= 1000 ||
    (h.precipProb >= 70 && h.precip > 0)
  ) {
    return "moderada";
  }

  // Leve: lluvia/llovizna/nieve leve, viento sostenido notable, o
  // probabilidad de lluvia considerable aunque todavía no esté lloviendo.
  if (isLightPrecipCode || h.windSpeed >= MS_30KMH || h.precipProb >= 40) {
    return "leve";
  }

  return null;
}

const SEVERITY_RANK: Record<AlertSeverity, number> = { severa: 3, moderada: 2, leve: 1 };

function describeRun(samples: HourSample[], severity: AlertSeverity, lat: number, lon: number): WeatherAlert {
  const start = samples[0];
  const end = samples[samples.length - 1];
  const maxGust = Math.max(...samples.map((s) => s.windGust));
  const maxProb = Math.max(...samples.map((s) => s.precipProb));
  const totalPrecip = samples.reduce((sum, s) => sum + s.precip, 0);
  // Hora "representativa": la de mayor gravedad dentro del tramo.
  const worst = samples.reduce((a, b) => (severityForRank(b) > severityForRank(a) ? b : a));
  const codeInfo = getWeatherCodeInfo(worst.code);
  const isThunder = worst.code >= 95;

  let event: string;
  if (isThunder) {
    event = severity === "severa" ? "Tormenta eléctrica fuerte" : "Tormenta eléctrica";
  } else if (maxGust >= MS_50KMH) {
    event = severity === "severa" ? "Viento muy fuerte" : "Viento fuerte";
  } else if (totalPrecip >= 4 || maxProb >= 40) {
    event =
      severity === "severa" ? "Lluvia intensa" : severity === "moderada" ? "Lluvia moderada" : "Lluvia leve";
  } else {
    event = "Condiciones adversas";
  }

  const startLabel = new Date(start.timestamp * 1000).toLocaleString("es-AR", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const endLabel = new Date(end.timestamp * 1000).toLocaleString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const parts: string[] = [
    `Se prevé ${codeInfo.description} entre ${startLabel} y ${endLabel}.`,
  ];
  if (maxProb > 0) parts.push(`Probabilidad de precipitación: ${Math.round(maxProb)}%.`);
  if (totalPrecip > 0) parts.push(`Acumulado estimado: ${totalPrecip.toFixed(1)} mm.`);
  if (maxGust > 0) parts.push(`Ráfagas de hasta ${Math.round(maxGust * 3.6)} km/h.`);

  return {
    id: `${severity}-${start.timestamp}-${end.timestamp}`,
    event,
    description: parts.join(" "),
    start: start.timestamp,
    end: end.timestamp + 3600,
    sender_name: "Análisis automático del pronóstico (Open-Meteo)",
    severity,
    latitude: lat,
    longitude: lon,
    radius: 15,
  };
}

function severityForRank(h: HourSample): number {
  const s = severityForHour(h);
  return s ? SEVERITY_RANK[s] : 0;
}

// Recorre el pronóstico horario y agrupa horas consecutivas con
// condiciones adversas en alertas de leve / moderada / severa.
function analyzeForecast(samples: HourSample[], lat: number, lon: number): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  let run: HourSample[] = [];
  let runSeverity: AlertSeverity | null = null;

  const flush = () => {
    if (run.length > 0 && runSeverity) {
      alerts.push(describeRun(run, runSeverity, lat, lon));
    }
    run = [];
    runSeverity = null;
  };

  for (const sample of samples) {
    const severity = severityForHour(sample);
    if (!severity) {
      flush();
      continue;
    }
    if (!runSeverity || SEVERITY_RANK[severity] > SEVERITY_RANK[runSeverity]) {
      runSeverity = severity;
    }
    run.push(sample);
  }
  flush();

  // Alertas más próximas en el tiempo primero, máximo 8 para no saturar la UI.
  return alerts.sort((a, b) => a.start - b.start).slice(0, 8);
}

// Obtener datos de clima y alertas (analizadas a partir del pronóstico)
export async function getWeatherAlerts(
  latitude: number,
  longitude: number
): Promise<WeatherData | null> {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        latitude,
        longitude,
        current:
          "temperature_2m,relative_humidity_2m,apparent_temperature,pressure_msl,cloud_cover,wind_speed_10m,wind_direction_10m,weather_code",
        hourly:
          "weather_code,precipitation_probability,precipitation,wind_speed_10m,wind_gusts_10m,cape",
        forecast_days: 2,
        timezone: "auto",
        wind_speed_unit: "ms",
        precipitation_unit: "mm",
      },
    });

    const data = response.data;

    if (!data?.current || !data?.hourly) {
      throw new Error("Open-Meteo devolvió una respuesta incompleta.");
    }

    const hourly = data.hourly;
    const now = Math.floor(Date.now() / 1000);

    const samples: HourSample[] = (hourly.time as string[])
      .map((iso: string, i: number) => ({
        timeIso: iso,
        timestamp: Math.floor(new Date(iso).getTime() / 1000),
        code: hourly.weather_code?.[i] ?? 0,
        precipProb: hourly.precipitation_probability?.[i] ?? 0,
        precip: hourly.precipitation?.[i] ?? 0,
        windSpeed: hourly.wind_speed_10m?.[i] ?? 0,
        windGust: hourly.wind_gusts_10m?.[i] ?? 0,
        cape: hourly.cape?.[i] ?? 0,
      }))
      // Solo horas desde ahora en adelante (no tiene sentido alertar sobre el pasado).
      .filter((s) => s.timestamp >= now - 3600);

    const alerts = analyzeForecast(samples, data.latitude ?? latitude, data.longitude ?? longitude);

    const currentCodeInfo = getWeatherCodeInfo(data.current.weather_code ?? 0);
    const current: CurrentWeather = {
      temp: data.current.temperature_2m,
      feels_like: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      pressure: data.current.pressure_msl,
      wind_speed: data.current.wind_speed_10m,
      wind_deg: data.current.wind_direction_10m,
      clouds: data.current.cloud_cover,
      weather: [
        {
          id: data.current.weather_code ?? 0,
          main: currentCodeInfo.main,
          description: currentCodeInfo.description,
          icon: iconForCode(data.current.weather_code ?? 0),
        },
      ],
    };

    return {
      lat: data.latitude ?? latitude,
      lon: data.longitude ?? longitude,
      timezone: data.timezone ?? "auto",
      current,
      alerts,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const reason = (error.response?.data as any)?.reason;
      if (reason) {
        throw new Error(`Open-Meteo rechazó la consulta: ${reason}`);
      }
      throw new Error(`Error consultando Open-Meteo (${status ?? "sin conexión"}).`);
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
