/**
 * Weather Service
 * Servicio para obtener datos de clima y alertas de OpenWeatherMap
 *
 * Usa el plan FREE (sin tarjeta de crédito) que incluye:
 *   - Current Weather 2.5 (/data/2.5/weather)
 *   - 5 day / 3 hour forecast 2.5 (/data/2.5/forecast)
 *
 * One Call 3.0/4.0 NO se usa porque exige suscripción con tarjeta.
 * Las "alertas" se estiman a partir de los códigos de condición
 * climática y el viento del pronóstico de 5 días.
 */

import axios from "axios";
import type { WeatherAlert, WeatherData, AlertSeverity } from "@/shared/types/weather";

const API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY || "";
// Endpoints del plan FREE real (sin tarjeta de crédito).
const CURRENT_URL = "https://api.openweathermap.org/data/2.5/weather";
const FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";

// Indica si hay una API key configurada. Sin esto, la app no puede
// consultar alertas reales y las pantallas deben mostrarlo claramente
// en vez de caer en datos de demostración silenciosos.
export function hasApiKey(): boolean {
  return API_KEY.length > 0;
}

const SEVERITY_ORDER: Record<AlertSeverity, number> = { severa: 0, moderada: 1, leve: 2 };

// Tipo de fenomeno que motivo la alerta. Antes solo se guardaba la
// severidad (leve/moderada/severa) y el mensaje siempre decia
// genericamente "Riesgo de tormenta ...", sin distinguir si el motivo
// fue viento, lluvia, tormenta electrica o nieve.
type Phenomenon = "viento" | "tormenta" | "lluvia" | "nieve";

// Etiqueta de cada fenomeno, ya ajustada segun la severidad con la que
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

// El plan free no incluye alertas oficiales (eso vive solo en One Call
// 3.0/4.0, que exige tarjeta). Estimamos el riesgo a partir de los
// códigos de condición climática y el viento del pronóstico de 5 días
// / 3 horas. No son alertas oficiales del servicio meteorológico.
//
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
      sender_name: "Estimación propia (OpenWeatherMap, plan free)",
      severity: open.severity,
      latitude,
      longitude,
      radius: 10,
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
      open.end = point.dt + 3 * 3600;
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
      open = { start: point.dt, end: point.dt + 3 * 3600, severity, phenomena: new Set(phenomena), description: point.description };
    } else {
      open = { start: point.dt, end: point.dt + 3 * 3600, severity, phenomena: new Set(phenomena), description: point.description };
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
  if (!hasApiKey()) {
    console.error("Falta configurar EXPO_PUBLIC_OPENWEATHER_API_KEY.");
    return null;
  }

  try {
    const [currentRes, forecastRes] = await Promise.all([
      axios.get(CURRENT_URL, {
        params: { lat: latitude, lon: longitude, appid: API_KEY, units: "metric", lang: "es" },
      }),
      axios.get(FORECAST_URL, {
        params: { lat: latitude, lon: longitude, appid: API_KEY, units: "metric", lang: "es" },
      }),
    ]);

    const current = currentRes.data;
    const forecastList = forecastRes.data?.list || [];

    const points: ForecastPoint[] = [
      {
        dt: Math.floor(Date.now() / 1000),
        weatherId: current.weather?.[0]?.id ?? 800,
        description: current.weather?.[0]?.description ?? "",
        windSpeed: current.wind?.speed ?? 0,
      },
      ...forecastList.map((item: any) => ({
        dt: item.dt,
        weatherId: item.weather?.[0]?.id ?? 800,
        description: item.weather?.[0]?.description ?? "",
        windSpeed: item.wind?.speed ?? 0,
      })),
    ];

    const alerts = buildAlertsFromPoints(points, latitude, longitude);

    return {
      lat: current.coord?.lat ?? latitude,
      lon: current.coord?.lon ?? longitude,
      timezone: current.timezone,
      current: {
        temp: current.main.temp,
        feels_like: current.main.feels_like,
        humidity: current.main.humidity,
        pressure: current.main.pressure,
        wind_speed: current.wind?.speed ?? 0,
        wind_deg: current.wind?.deg ?? 0,
        clouds: current.clouds?.all ?? 0,
        weather: current.weather,
      },
      alerts,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401) {
        throw new Error(
          "OpenWeatherMap rechazó la API key (401). Puede tardar hasta 2 horas en activarse una key recién creada."
        );
      }
      if (status === 429) {
        throw new Error("Se superó el límite de llamadas a OpenWeatherMap por hoy.");
      }
      const detail =
        (error.response?.data as any)?.message ?? JSON.stringify(error.response?.data ?? {});
      console.error("Error de OpenWeatherMap:", status, detail);
      throw new Error(`Error consultando OpenWeatherMap (${status ?? "sin conexión"}): ${detail}`);
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
