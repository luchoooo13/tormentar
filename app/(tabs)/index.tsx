/**
 * Home Screen - Weather Alerts
 * Pantalla principal con alertas de tormentas reales (OpenWeatherMap).
 *
 * Antes esta pantalla mostraba una lista fija DEMO_ALERTS que nunca
 * cambiaba y no tenia relacion con la ubicacion real del usuario ni con
 * ningun servicio de clima. Ahora usa useAlerts (ubicacion real +
 * OpenWeatherMap + preferencias unificadas) y permite elegir, con
 * checkboxes independientes, que severidades quiere recibir el usuario:
 * leve, moderada y/o fuerte (severa), no un unico "minimo".
 */
import { ScrollView, Text, View, Pressable, RefreshControl } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAlerts } from "@/hooks/useAlerts";
import { useAlertPreferences } from "@/hooks/useAlertPreferences";
import { formatAlertTime } from "@/lib/services/weatherService";
import type { AlertSeverity, WeatherAlert } from "@/shared/types/weather";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const SEVERITY_LEVELS: { id: AlertSeverity; label: string; color: string }[] = [
  { id: "leve", label: "Leve", color: "#FFA500" },
  { id: "moderada", label: "Moderada", color: "#FF6B35" },
  { id: "severa", label: "Fuerte", color: "#EF4444" },
];

const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  leve: "#FFA500",
  moderada: "#FF6B35",
  severa: "#EF4444",
};

const SEVERITY_ICONS: Record<AlertSeverity, string> = {
  leve: "cloud-queue",
  moderada: "cloud",
  severa: "cloud-download",
};

export default function HomeScreen() {
  const colors = useColors();
  const { preferences, toggleSeverity } = useAlertPreferences();
  const {
    location,
    filteredAlerts,
    weather,
    loading,
    error,
    hasApiKey,
    refresh,
  } = useAlerts();

  const renderAlertCard = (alert: WeatherAlert) => {
    const alertColor = SEVERITY_COLORS[alert.severity];
    const alertIcon = SEVERITY_ICONS[alert.severity];

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
              <Text className="text-xs text-muted">{alert.radius ?? 10} km</Text>
            </View>
          </View>
        </View>

        <Text className="text-base font-bold text-foreground mb-2">{alert.event}</Text>

        <Text className="text-sm text-muted mb-3" numberOfLines={3} style={{ lineHeight: 18 }}>
          {alert.description}
        </Text>

        <View className="flex-row items-center gap-2">
          <MaterialIcons name="schedule" size={14} color={colors.muted} />
          <Text className="text-xs text-muted">{formatAlertTime(alert.start, alert.end)}</Text>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer className="flex-1 gap-0">
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      >
        {/* Encabezado con ubicacion */}
        <View className="px-4 pt-4 pb-3 border-b" style={{ borderBottomColor: colors.border }}>
          <View className="flex-row items-center gap-2 mb-2">
            <MaterialIcons name="location-on" size={20} color={colors.primary} />
            <Text className="text-xs text-muted font-semibold">UBICACION ACTUAL</Text>
          </View>
          <Text className="text-2xl font-bold text-foreground">
            {location?.city ?? "Buscando ubicacion..."}
          </Text>
          {location && (
            <Text className="text-xs text-muted">
              {location.latitude.toFixed(2)}°, {location.longitude.toFixed(2)}°
            </Text>
          )}
        </View>

        {/* Estado del clima actual (solo si hay datos reales) */}
        {weather?.current && (
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
                <MaterialIcons name="wb-cloudy" size={60} color={colors.primary} />
              </View>
            </View>
          </View>
        )}

        {/* Aviso si falta configurar la API key */}
        {!hasApiKey && (
          <View className="px-4 py-3">
            <View
              className="p-4 rounded-xl border"
              style={{ backgroundColor: colors.surface, borderColor: colors.error }}
            >
              <View className="flex-row items-center gap-2 mb-1">
                <MaterialIcons name="error-outline" size={18} color={colors.error} />
                <Text className="text-sm font-semibold text-foreground">
                  Alertas no configuradas
                </Text>
              </View>
              <Text className="text-xs text-muted">
                Falta la variable EXPO_PUBLIC_OPENWEATHER_API_KEY para poder pedir alertas reales
                a OpenWeatherMap. Hasta configurarla no se mostrara ninguna alerta.
              </Text>
            </View>
          </View>
        )}

        {/* Filtro de severidad: seleccion multiple e independiente */}
        <View className="px-4 py-3">
          <View className="flex-row items-center gap-2 mb-2">
            <MaterialIcons name="filter-list" size={18} color={colors.foreground} />
            <Text className="text-sm font-semibold text-foreground">
              Severidades que quiero recibir
            </Text>
          </View>
          <View className="flex-row gap-2">
            {SEVERITY_LEVELS.map((level) => {
              const isActive = preferences.enabledSeverities.includes(level.id);
              return (
                <Pressable
                  key={level.id}
                  onPress={() => toggleSeverity(level.id)}
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
                  <View className="flex-row items-center justify-center gap-1">
                    <MaterialIcons
                      name={isActive ? "check-box" : "check-box-outline-blank"}
                      size={14}
                      color={isActive ? level.color : colors.muted}
                    />
                    <Text
                      className="text-xs font-semibold text-center"
                      style={{ color: isActive ? level.color : colors.foreground }}
                    >
                      {level.label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Text className="text-xs text-muted mt-2">
            Esta seleccion se usa en toda la app (Inicio, Mapa y notificaciones).
          </Text>
        </View>

        {/* Alertas */}
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

          {error && hasApiKey && (
            <View className="bg-surface p-4 rounded-xl border mb-3" style={{ borderColor: colors.error }}>
              <Text className="text-sm text-foreground">{error}</Text>
            </View>
          )}

          {filteredAlerts.length > 0 ? (
            <View>{filteredAlerts.map(renderAlertCard)}</View>
          ) : (
            !error && (
              <View
                className="bg-surface p-6 rounded-xl border items-center"
                style={{ borderColor: colors.border }}
              >
                <MaterialIcons name="check-circle" size={48} color={colors.success} />
                <Text className="text-base font-semibold text-foreground mt-2">Sin alertas</Text>
                <Text className="text-xs text-muted text-center mt-1">
                  No hay alertas activas para los niveles seleccionados en tu zona.
                </Text>
              </View>
            )
          )}
        </View>

        <View className="px-4 pb-4">
          <View className="flex-row items-center justify-center gap-1">
            <MaterialIcons name="schedule" size={14} color={colors.muted} />
            <Text className="text-xs text-muted">
              Ultima actualizacion: {new Date().toLocaleTimeString("es-ES")}
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
