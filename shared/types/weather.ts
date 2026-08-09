/**
 * Weather Alert Types
 * Tipos para alertas de clima (fuente: Open-Meteo, estructura unificada)
 */

export type AlertSeverity = "leve" | "moderada" | "severa";

export interface WeatherAlert {
  id: string;
  event: string;
  description: string;
  start: number; // Unix timestamp
  end: number; // Unix timestamp
  sender_name: string;
  severity: AlertSeverity;
  latitude: number;
  longitude: number;
  radius?: number; // Radio de afectación en km
  tags?: string[];
}

export interface CurrentWeather {
  temp: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  wind_deg: number;
  clouds: number;
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
}

export interface WeatherData {
  lat: number;
  lon: number;
  timezone: string;
  current: CurrentWeather;
  alerts?: WeatherAlert[];
}

export interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}

export interface AlertNotification {
  id: string;
  alert: WeatherAlert;
  timestamp: number;
  read: boolean;
}
