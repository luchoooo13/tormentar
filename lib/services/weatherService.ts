/**
 * Weather Service
 * Servicio para obtener datos de clima y alertas
 *
 * PROVEEDOR: Open-Meteo (https://open-meteo.com/)
 *   - Gratis, open source, SIN API KEY y sin registro para uso no comercial.
 *   - Endpoint único /v1/forecast que devuelve condiciones actuales Y
 *     pronóstico horario en una sola llamada (antes eran 2 con OpenWeatherMap).
 *   - Pronóstico horario (no cada 3 horas), lo que hace las alertas
 *     estimadas más precisas en inicio y fin.
 *
 * Las "alertas" se estiman a partir de los códigos de condición
 * climática (WMO) y el viento del pronóstico horario, igual que antes
 * con los códigos de OpenWeatherMap, a través del mapeo
 * mapWeatherCode().
 */

import axios from "axios";
import type { WeatherAlert, WeatherData, AlertSeverity } from "@/shared/types/weather";

// Open-Meteo no requiere API key, por lo que hasApiKey() siempre
// devuelve true y la app puede pedir alertas reales sin configuración
// adicional. La variable de entorno se conserva solo por compatibilidad.
const API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY || "";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

// Indica si hay una API key configurada. Con Open-Meteo siempre se
// puede consultar (no hay key), así que la app nunca queda "a ciegas".
export function hasApiKey(): boolean {
  return true;
}

const SEVERITY_ORDER: Record<AlertSeverity, number> = { severa: 0, moderada: 1, leve: 2 };

// Tipo de fenomeno que motivo la alerta.
type Phenomenon = "viento" | "tormenta" | "lluvia" | "nieve";

// Etiqueta de cada fenomeno, ajustada según la severidad con la que
// se dispara (ej. "Viento" en leve, "Viento fuerte" en moderada,
// "Viento muy fuerte" en severa).
const PHENOMENON_LABELS: Record<Phenomenon, Record<AlertSeverity, string>> = {
  viento: { leve: "Viento", moderada: "Viento fuerte", severa: "Viento muy fuerte" },
  tormenta: { leve: "Tormenta eléctrica leve", moderada: "Tormenta eléctrica", severa: "Tormenta eléctrica fuerte" },
  lluvia: { leve: "Lluvia", moderada: "Lluvia fuerte", severa: "Lluvia muy fuerte" },
  nieve: { leve: "Nieve leve", moderada: "Nieve", severa: "Nieve intensa" },
};

interface Classification {
  severity: AlertSeverity;
  // Puede haber mas de un fenomeno empatado en la misma severidad (ej.
  // viento fuerte Y lluvia fuerte al mismo tiempo): se combinan en el
  // mensaje ("Viento fuerte y Lluvia fuerte") en vez de mostrar solo
  // uno y ocultar el otro.
  phenomena: Phenomenon[];
}

/**
 * Mapea el código WMO de Open-Meteo (0-99) al código de condición de
 * OpenWeatherMap que ya interpreta classifyCondition(). Así el motor
 * de severidades no necesita cambios.
 */
function mapWeatherCode(wmo: number): number {
  const map: Record<number, number> = {
    0: 800, // despejado
    1: 801, 2: 802, 3: 804, // nubes
    45: 741, 48: 741, // niebla
    51: 500, 53: 501, 55: 502, 56: 511, 57: 511, // llovizna
    61: 500, 63: 501, 65: 502, 66: 511, 67: 511, // lluvia
    71: 601, 73: 602, 75: 602, 77: 611, // nieve / granizo
    80: 520, 81: 521, 82: 522, // chubascos
    85: 621, 86: 622, // chubascos de nieve
    95: 211, // tormenta eléctrica
    96: 212, 99: 212, // tormenta con granizo
  };
  return map[wmo] ?? 800;
}

// Se evaluan el viento y el codigo de condicion climatica por
// SEPARADO, cada uno con su propia severidad, y despues se combinan:
// la severidad final es la mas grave de las dos, y el mensaje incluye
// TODOS los fenomenos que hayan alcanzado esa severidad maxima.
function classifyCondition(weatherId: number, windSpeed: number): Classification | null {
  const candidates: { severity: AlertSeverity; phenomenon: Phenomenon }[] = [];

  if (windSpeed >= 17) candidates.push({ severity: "severa", phenomenon: "viento" }); // ~61 km/h
  else if (windSpeed >= 10.8) candidates.push({ severity: "moderada", phenomenon: "viento" }); // ~39 km/h

  if ([202, 212, 232].includes(weatherId)) candidates.push({ severity: "severa", phenomenon: "tormenta" });
  else if (weatherId >= 200 && weatherId <= 232) candidates.push({ severity: "moderada", phenomenon: "tormenta" });
  else if (weatherId === 781 || weatherId === 771) candidates.push({ severity: "severa", phenomenon: "viento" }); // tornado / squalls
  else if ([503, 504].includes(weatherId)) candidates.push({ severity: "severa", phenomenon: "lluvia" });
  else if ([502, 511, 522, 531].includes(weatherId)) candidates.push({ severity: "moderada", phenomenon: "lluvia" });
  else if ([500, 501, 520, 521].includes(weatherId)) candidates.push({ severity: "leve", phenomenon: "lluvia" });
  else if ([602, 622].includes(weatherId)) candidates.push({ severity: "moderada", phenomenon: "nieve" });
  else if ([601, 611, 612, 613, 615, 616, 621].includes(weatherId)) candidates.push({ severity: "leve", phenomenon: "nieve" });

  if (candidates.length === 0) return null;

  const worstSeverity = candidates.reduce(
    (worst, c) => (SEVERITY_ORDER[c.severity] < SEVERITY_ORDER[worst] ? c.severity : worst),
    candidates[0].severity
  );
  const phenomena = Array.from(
    new Set(candidates.filter((c) => c.severity === worstSeverity).map((c) => c.phenomenon))
  );

  return { severity: worstSeverity, phenomena };
}

function buildEventName(severity: AlertSeverity, phenomena: Phenomenon[]): string {
  if (phenomena.length === 0) {
    return severity === "severa"
      ? "Riesgo de tormenta fuerte"
      : severity === "moderada"
      ? "Riesgo de tormenta moderada"
      : "Condición climática leve";
  }
  return phenomena.map((p) => PHENOMENON_LABELS[p][severity]).join(" y ");
}

interface ForecastPoint {
  dt: number;
  weatherId: number;
  description: string;
  windSpeed: number;
}

function buildAlertsFromPoints(
  points: ForecastPoint[],
  latitude: number,
  longitude: number
): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  let open:
    | { start: number; end: number; severity: AlertSeverity; phenomena: Set<Phenomenon>; description: string }
    | null = null;

  const closeOpen = () => {
    if (!open) return;
    const phenomenaList = Array.from(open.phenomena);
    alerts.push({
      id: `${open.start}-${open.end}`,
      event: buildEventName(open.severity, phenomenaList),
      description: `Estimado a partir del pronóstico: ${open.description}.`,
      start: open.start,
      end: open.end,
      sender_name: "Estimación propia (Open-Meteo, gratis)",
      severity: open.severity,
      latitude,
      longitude,
      radius: 10,
      tags: phenomenaList,
    });
    open = null;
  };

  for (const point of points) {
    const classification = classifyCondition(point.weatherId, point.windSpeed);
    if (!classification) {
      closeOpen();
      continue;
    }
    const { severity, phenomena } = classification;
    if (open && SEVERITY_ORDER[severity] <= SEVERITY_ORDER[open.severity]) {
      open.end = point.dt + 3600; // extensión horaria (pronóstico horario)
      if (SEVERITY_ORDER[severity] < SEVERITY_ORDER[open.severity]) {
        // La severidad subio: el fenomeno que la disparo ahora pasa a
        // ser el protagonista del mensaje (se reinicia el set).
        open.severity = severity;
        open.phenomena = new Set(phenomena);
        open.description = point.description;
      } else {
        // Misma severidad que ya veniamos arrastrando: si aparece un
        // fenomeno nuevo a ese mismo nivel (ej. empezo solo con lluvia
        // fuerte y ahora tambien sopla viento fuerte), se suma al
        // mensaje en vez de perderse.
        phenomena.forEach((p) => open!.phenomena.add(p));
      }
    } else if (open) {
      closeOpen();
      open = { start: point.dt, end: point.dt + 3600, severity, phenomena: new Set(phenomena), description: point.description };
    } else {
      open = { start: point.dt, end: point.dt + 3600, severity, phenomena: new Set(phenomena), description: point.description };
    }
  }
  closeOpen();
  return alerts;
}

// Obtener datos de clima y alertas (estimadas del pronóstico gratuito)
export async function getWeatherAlerts(
  latitude: number,
  longitude: number
): Promise<WeatherData | null> {
  try {
    // Una sola llamada reemplaza las 2 de OpenWeatherMap: devuelve
    // condiciones actuales + pronóstico horario de 5 días.
    const res = await axios.get(FORECAST_URL, {
      params: {
        latitude,
        longitude,
        current:
          "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,cloud_cover",
        hourly: "temperature_2m,weather_code,wind_speed_10m",
        wind_speed_unit: "ms", // m/s, igual que OpenWeatherMap
        temperature_unit: "celsius",
        timezone: "auto",
        forecast_days: 5,
      },
    });

    const { current, hourly } = res.data;

    // Punto actual (Open-Meteo lo devuelve como current, con timestamp
    // en epoch segundos cuando timeformat=unixtime; aquí usamos la hora
    // actual del sistema como referencia, igual que antes).
    const nowSec = Math.floor(Date.now() / 1000);

    const points: ForecastPoint[] = [
      {
        dt: nowSec,
        weatherId: mapWeatherCode(current?.weather_code ?? 0),
        description: wmoDescription(current?.weather_code),
        windSpeed: current?.wind_speed_10m ?? 0,
      },
      ...(hourly?.time ?? []).map((t: string, i: number) => ({
        dt: Math.floor(new Date(t).getTime() / 1000),
        weatherId: mapWeatherCode(hourly.weather_code[i] ?? 0),
        description: wmoDescription(hourly.weather_code[i]),
        windSpeed: hourly.wind_speed_10m[i] ?? 0,
      })),
    ];

    const alerts = buildAlertsFromPoints(points, latitude, longitude);

    return {
      lat: latitude,
      lon: longitude,
      timezone: res.data.timezone ?? "America/Argentina/Buenos_Aires",
      current: {
        temp: current?.temperature_2m ?? 0,
        feels_like: current?.apparent_temperature ?? current?.temperature_2m ?? 0,
        humidity: current?.relative_humidity_2m ?? 0,
        pressure: current?.surface_pressure ?? 0,
        wind_speed: current?.wind_speed_10m ?? 0,
        wind_deg: current?.wind_direction_10m ?? 0,
        clouds: current?.cloud_cover ?? 0,
        weather: [
          {
            id: mapWeatherCode(current?.weather_code ?? 0),
            main: "",
            description: wmoDescription(current?.weather_code),
            icon: "",
          },
        ],
      },
      alerts,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const detail =
        (error.response?.data as any)?.message ?? JSON.stringify(error.response?.data ?? {});
      console.error("Error de Open-Meteo:", status, detail);
      throw new Error(`Error consultando el servicio meteorológico (${status ?? "sin conexión"}): ${detail}`);
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

// Etiqueta legible de un código de condición WMO (Open-Meteo)
function wmoDescription(code: number | undefined): string {
  if (code === undefined) return "Desconocido";
  const labels: Record<number, string> = {
    0: "Despejado",
    1: "Principalmente despejado",
    2: "Parcialmente nublado",
    3: "Nublado",
    45: "Niebla",
    48: "Niebla con escarcha",
    51: "Llovizna ligera",
    53: "Llovizna moderada",
    55: "Llovizna densa",
    56: "Llovizna helada ligera",
    57: "Llovizna helada densa",
    61: "Lluvia ligera",
    63: "Lluvia moderada",
    65: "Lluvia intensa",
    66: "Lluvia helada ligera",
    67: "Lluvia helada intensa",
    71: "Nevada ligera",
    73: "Nevada moderada",
    75: "Nevada intensa",
    77: "Granizo",
    80: "Chubascos ligeros",
    81: "Chubascos moderados",
    82: "Chubascos violentos",
    85: "Chubascos de nieve ligeros",
    86: "Chubascos de nieve intensos",
    95: "Tormenta eléctrica",
    96: "Tormenta eléctrica con granizo ligero",
    99: "Tormenta eléctrica con granizo intenso",
  };
  return labels[code] ?? "Desconocido";
}
