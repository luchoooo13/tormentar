/**
 * Home Screen - Weather Alerts
 * Pantalla principal con alertas de tormentas mejorada
 */

import { ScrollView, Text, View, Pressable, RefreshControl, ActivityIndicator } from "react-native";
import { useCallback, useEffect, useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocation } from "@/hooks/useLocation";
import { useAlertPreferences } from "@/hooks/useAlertPreferences";
import { getWeatherAlerts, hasApiKey, sortAlertsBySeverity } from "@/lib/services/weatherService";
import type { AlertSeverity, WeatherData } from "@/shared/types/weather";

// Ubicación de respaldo si el usuario no concede permiso de geolocalización.
const FALLBACK_LOCATION = {
  city: "Buenos Aires",
  country: "Argentina",
  latitude: -34.6037,
  longitude: -58.3816,
};

const SEVERITY_LEVELS: { id: AlertSeverity; label: string; color: string }[] = [
  { id: "leve", label: "Leve", color: "#FFA500" },
  { id: "moderada", label: "Moderada", color: "#FF6B35" },
  { id: "severa", label: "Fuerte", color: "#EF4444" },
];

const SEVERITY_COLOR: Record<AlertSeverity, string> = {
  leve: "#FFA500",
  moderada: "#FF6B35",
  severa: "#EF4444",
};

const SEVERITY_ICON: Record<AlertSeverity, string> = {
  leve: "cloud-queue",
  moderada: "cloud",
  severa: "cloud-download",
};

const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  severa: 0,
  moderada: 1,
  leve: 2,
};

export default function HomeScreen() {
  const colors = useColors();
  const [refreshing, setRefreshing] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);

  const { location, loading: loadingLocation } = useLocation();
  const { preferences, loading: loadingPrefs, setMinSeverity } = useAlertPreferences();

  const effectiveLocation = location ?? FALLBACK_LOCATION;
  const usingFallbackLocation = !location;

  const fetchWeather = useCallback(async () => {
    setFetchError(null);
    if (!hasApiKey()) {
      setFetchError(
        "Falta configurar la API key de OpenWeatherMap (EXPO_PUBLIC_OPENWEATHER_API_KEY). No se pueden mostrar alertas reales."
      );
      setWeather(null);
      return;
    }
    try {
      const data = await getWeatherAlerts(effectiveLocation.latitude, effectiveLocation.longitude);
      setWeather(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido al consultar el clima.";
      setFetchError(message);
      setWeather(null);
    }
  }, [effectiveLocation.latitude, effectiveLocation.longitude]);

  useEffect(() => {
    if (loadingLocation) return;
    setLoadingWeather(true);
    fetchWeather().finally(() => setLoadingWeather(false));
  }, [loadingLocation, fetchWeather]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWeather();
    setRefreshing(false);
  };

  // Filtrar alertas reales por severidad mínima
  const allAlerts = weather?.alerts ?? [];
  const filteredAlerts = sortAlertsBySeverity(
    allAlerts.filter(
      (alert) => SEVERITY_ORDER[alert.severity] <= SEVERITY_ORDER[preferences.minSeverity]
    )
  );

  const renderAlertCard = (alert: (typeof filteredAlerts)[number]) => {
    const alertColor = SEVERITY_COLOR[alert.severity];
    const alertIcon = SEVERITY_ICON[alert.severity];
    const start = new Date(alert.start * 1000);
    const end = new Date(alert.end * 1000);
    const timeLabel = `${start.toLocaleString("es-ES", { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;

    return (
      <View
        key={alert.id}
        className="mb-3 p-4 rounded-xl border-l-4"
        style={{
          backgroundColor: colors.surface,
          borderLeftColor: alertColor,
          borderWidth: 1,
          borderLeftWidth: 4,
          borderColor: colors.border,
        }}
      >
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-2 flex-1">
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: alertColor + "20",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <MaterialIcons name={alertIcon as any} size={20} color={alertColor} />
            </View>
            <View className="flex-1">
              <Text className="font-semibold capitalize text-xs" style={{ color: alertColor }}>
                {alert.severity === "severa" ? "FUERTE" : alert.severity.toUpperCase()}
              </Text>
              {alert.sender_name ? (
                <Text className="text-xs text-muted">{alert.sender_name}</Text>
              ) : null}
            </View>
          </View>
          <MaterialIcons name="info" size={20} color={colors.muted} />
        </View>

        <Text className="text-base font-bold text-foreground mb-2">{alert.event}</Text>

        <Text className="text-sm text-muted mb-3" numberOfLines={3} style={{ lineHeight: 18 }}>
          {alert.description}
        </Text>

        <View className="flex-row items-center gap-2">
          <MaterialIcons name="schedule" size={14} color={colors.muted} />
          <Text className="text-xs text-muted">{timeLabel}</Text>
        </View>
      </View>
    );
  };

  const showLoading = (loadingLocation || loadingWeather || loadingPrefs) && !refreshing;

  return (
    <ScreenContainer className="flex-1 gap-0">
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Encabezado con ubicación */}
        <View className="px-4 pt-4 pb-3 border-b" style={{ borderBottomColor: colors.border }}>
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="location-on" size={20} color={colors.primary} />
              <Text className="text-xs text-muted font-semibold">
                {usingFallbackLocation ? "UBICACIÓN POR DEFECTO" : "UBICACIÓN ACTUAL"}
              </Text>
            </View>
          </View>
          <Text className="text-2xl font-bold text-foreground">
            {effectiveLocation.city || "Ubicación actual"}
          </Text>
          <Text className="text-xs text-muted">
            {effectiveLocation.latitude.toFixed(2)}°, {effectiveLocation.longitude.toFixed(2)}°
          </Text>
        </View>

        {/* Aviso si no hay API key o falló la consulta */}
        {fetchError && (
          <View className="mx-4 mt-3 p-3 rounded-lg" style={{ backgroundColor: "#EF444420" }}>
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="error-outline" size={18} color="#EF4444" />
              <Text className="text-xs flex-1" style={{ color: "#EF4444" }}>
                {fetchError}
              </Text>
            </View>
          </View>
        )}

        {/* Estado del clima actual (datos reales de OpenWeatherMap) */}
        {showLoading ? (
          <View className="px-4 py-6 items-center">
            <ActivityIndicator color={colors.primary} />
            <Text className="text-xs text-muted mt-2">Consultando OpenWeatherMap...</Text>
          </View>
        ) : weather ? (
          <View className="px-4 py-3">
            <View className="bg-surface p-4 rounded-xl border" style={{ borderColor: colors.border }}>
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <View className="flex-row items-baseline gap-1 mb-2">
                    <MaterialIcons name="thermostat" size={24} color={colors.primary} />
                    <Text className="text-3xl font-bold text-foreground">
                      {Math.round(weather.current.temp)}°
                    </Text>
                    <Text className="text-sm text-muted">C</Text>
                  </View>
                  <Text className="text-xs text-muted mb-3">
                    {weather.current.weather?.[0]?.description ?? ""}
                  </Text>
                  <View className="gap-1">
                    <View className="flex-row items-center gap-2">
                      <MaterialIcons name="opacity" size={14} color={colors.muted} />
                      <Text className="text-xs text-muted">Humedad: {weather.current.humidity}%</Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <MaterialIcons name="air" size={14} color={colors.muted} />
                      <Text className="text-xs text-muted">
                        Viento: {Math.round(weather.current.wind_speed)} m/s
                      </Text>
                    </View>
                  </View>
                </View>
                <View className="items-center">
                  <MaterialIcons name="wb-cloudy" size={60} color={colors.primary} />
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {/* Filtro de severidad mínima (compartido en toda la app) */}
        <View className="px-4 py-3">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="filter-list" size={18} color={colors.foreground} />
              <Text className="text-sm font-semibold text-foreground">
                Severidad mínima para alertar
              </Text>
            </View>
          </View>
          <View className="flex-row gap-2">
            {SEVERITY_LEVELS.map((level) => {
              const isActive = preferences.minSeverity === level.id;
              return (
                <Pressable
                  key={level.id}
                  onPress={() => setMinSeverity(level.id)}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: isActive ? level.color : colors.border,
                    backgroundColor: isActive ? level.color + "20" : colors.surface,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text
                    className="text-xs font-semibold text-center"
                    style={{ color: isActive ? level.color : colors.foreground }}
                  >
                    {level.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text className="text-xs text-muted mt-2">
            Vas a recibir alertas de {preferences.minSeverity === "severa" ? "fuerte" : preferences.minSeverity} en adelante. Se aplica en toda la app (Inicio, Mapa y notificaciones).
          </Text>
        </View>

        {/* Alertas reales */}
        <View className="px-4 py-4">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="warning" size={20} color={colors.error} />
              <Text className="text-lg font-bold text-foreground">Alertas Activas</Text>
            </View>
            {filteredAlerts.length > 0 && (
              <View
                style={{
                  backgroundColor: colors.error,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 12,
                }}
              >
                <Text className="text-white text-xs font-semibold">{filteredAlerts.length}</Text>
              </View>
            )}
          </View>

          {!showLoading && !fetchError && filteredAlerts.length > 0 && (
            <View>{filteredAlerts.map(renderAlertCard)}</View>
          )}

          {!showLoading && !fetchError && filteredAlerts.length === 0 && (
            <View className="bg-surface p-6 rounded-xl border items-center" style={{ borderColor: colors.border }}>
              <MaterialIcons name="check-circle" size={48} color={colors.success} />
              <Text className="text-base font-semibold text-foreground mt-2">Sin alertas</Text>
              <Text className="text-xs text-muted text-center mt-1">
                No hay alertas de {preferences.minSeverity === "severa" ? "fuerte" : preferences.minSeverity} o superior en tu zona
              </Text>
            </View>
          )}
        </View>

        {/* Última actualización */}
        {weather && (
          <View className="px-4 pb-4">
            <View className="flex-row items-center justify-center gap-1">
              <MaterialIcons name="schedule" size={14} color={colors.muted} />
              <Text className="text-xs text-muted">
                Última actualización: {new Date().toLocaleTimeString("es-ES")}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
