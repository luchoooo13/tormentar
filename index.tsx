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
import { ScrollView, Text, View, Pressable, RefreshControl, Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAlerts } from "@/hooks/useAlerts";
import { useAlertPreferences } from "@/hooks/useAlertPreferences";
import { formatAlertTime } from "@/lib/services/weatherService";
import type { AlertSeverity, WeatherAlert } from "@/shared/types/weather";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const SEVERITY_LEVELS: { id: AlertSeverity; label: string; color: string }[] = [
  { id: "leve", label: "Leve", color: "#F59E0B" },
  { id: "moderada", label: "Moderada", color: "#EA580C" },
  { id: "severa", label: "Fuerte", color: "#DC2626" },
];

const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  leve: "#F59E0B",
  moderada: "#EA580C",
  severa: "#DC2626",
};

const SEVERITY_ICONS: Record<AlertSeverity, string> = {
  leve: "cloud-queue",
  moderada: "cloud",
  severa: "cloud-download",
};

/** Sombra suave, compatible con iOS/Android/Web */
const cardShadow = Platform.select({
  web: { boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)" } as any,
  default: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
});

/** Icono acorde a la descripcion del clima actual */
function weatherIconFor(description?: string): keyof typeof MaterialIcons.glyphMap {
  const d = (description ?? "").toLowerCase();
  if (d.includes("tormenta")) return "thunderstorm";
  if (d.includes("lluvia") || d.includes("llovizna")) return "water-drop";
  if (d.includes("nub") && d.includes("pocas")) return "wb-cloudy";
  if (d.includes("nub")) return "cloud";
  if (d.includes("nieve")) return "ac-unit";
  if (d.includes("niebla") || d.includes("bruma")) return "foggy" as any;
  if (d.includes("despejado") || d.includes("claro")) return "wb-sunny";
  return "wb-cloudy";
}

export default function HomeScreen() {
  const colors = useColors();
  const { preferences, setMinSeverity } = useAlertPreferences();
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
        className="mb-3 p-4 rounded-2xl"
        style={{
          backgroundColor: colors.surface,
          borderLeftColor: alertColor,
          borderLeftWidth: 4,
          ...cardShadow,
        }}
      >
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-3 flex-1">
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: alertColor + "1A",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <MaterialIcons name={alertIcon as any} size={20} color={alertColor} />
            </View>
            <View className="flex-1">
              <Text
                className="font-bold text-xs"
                style={{ color: alertColor, letterSpacing: 0.5 }}
              >
                {alert.severity === "severa" ? "FUERTE" : alert.severity.toUpperCase()}
              </Text>
              <Text className="text-xs text-muted mt-0.5">Radio de {alert.radius ?? 10} km</Text>
            </View>
          </View>
        </View>

        <Text className="text-base font-bold text-foreground mb-1.5">{alert.event}</Text>

        <Text className="text-sm text-muted mb-3" numberOfLines={3} style={{ lineHeight: 19 }}>
          {alert.description}
        </Text>

        <View
          className="flex-row items-center gap-1.5 pt-2"
          style={{ borderTopWidth: 1, borderTopColor: colors.border }}
        >
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
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />}
      >
        {/* Encabezado tipo "hero" con ubicacion y clima actual */}
        <View
          className="px-5 pt-6 pb-7 mb-4"
          style={{
            backgroundColor: colors.primary,
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28,
          }}
        >
          <View className="flex-row items-center gap-1.5 mb-1">
            <MaterialIcons name="location-on" size={16} color="#FFFFFF" style={{ opacity: 0.85 }} />
            <Text
              className="text-xs font-semibold"
              style={{ color: "#FFFFFF", opacity: 0.85, letterSpacing: 0.5 }}
            >
              UBICACIÓN ACTUAL
            </Text>
          </View>
          <Text className="text-3xl font-extrabold mb-1" style={{ color: "#FFFFFF" }}>
            {location?.city ?? "Buscando ubicación..."}
          </Text>
          {location && (
            <Text className="text-xs mb-4" style={{ color: "#FFFFFF", opacity: 0.75 }}>
              {location.latitude.toFixed(2)}°, {location.longitude.toFixed(2)}°
            </Text>
          )}

          {/* Clima actual, integrado en el hero (solo si hay datos reales) */}
          {weather?.current && (
            <View className="flex-row items-center justify-between mt-2">
              <View className="flex-1">
                <View className="flex-row items-baseline gap-1">
                  <Text className="text-5xl font-extrabold" style={{ color: "#FFFFFF" }}>
                    {Math.round(weather.current.temp)}°
                  </Text>
                  <Text className="text-base" style={{ color: "#FFFFFF", opacity: 0.8 }}>
                    C
                  </Text>
                </View>
                <Text
                  className="text-sm capitalize mb-3"
                  style={{ color: "#FFFFFF", opacity: 0.9 }}
                >
                  {weather.current.weather?.[0]?.description ?? ""}
                </Text>
                <View className="flex-row gap-4">
                  <View className="flex-row items-center gap-1.5">
                    <MaterialIcons name="opacity" size={14} color="#FFFFFF" style={{ opacity: 0.85 }} />
                    <Text className="text-xs" style={{ color: "#FFFFFF", opacity: 0.85 }}>
                      {weather.current.humidity}%
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <MaterialIcons name="air" size={14} color="#FFFFFF" style={{ opacity: 0.85 }} />
                    <Text className="text-xs" style={{ color: "#FFFFFF", opacity: 0.85 }}>
                      {Math.round(weather.current.wind_speed)} m/s
                    </Text>
                  </View>
                </View>
              </View>
              <View
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 38,
                  backgroundColor: "rgba(255,255,255,0.15)",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <MaterialIcons
                  name={weatherIconFor(weather.current.weather?.[0]?.description)}
                  size={40}
                  color="#FFFFFF"
                />
              </View>
            </View>
          )}
        </View>

        {/* Aviso si falta configurar la API key */}
        {!hasApiKey && (
          <View className="px-4 mb-3">
            <View
              className="p-4 rounded-2xl flex-row gap-3"
              style={{ backgroundColor: colors.error + "12", ...cardShadow }}
            >
              <MaterialIcons name="error-outline" size={20} color={colors.error} />
              <View className="flex-1">
                <Text className="text-sm font-bold text-foreground mb-1">
                  Alertas no configuradas
                </Text>
                <Text className="text-xs text-muted" style={{ lineHeight: 17 }}>
                  Falta la variable EXPO_PUBLIC_OPENWEATHER_API_KEY para pedir alertas reales a
                  OpenWeatherMap. Hasta configurarla no se mostrará ninguna alerta.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Filtro de severidad mínima: selección única, estilo segmentado */}
        <View className="px-4 mb-3">
          <View
            className="p-4 rounded-2xl"
            style={{ backgroundColor: colors.surface, ...cardShadow }}
          >
            <View className="flex-row items-center gap-2 mb-3">
              <MaterialIcons name="tune" size={18} color={colors.foreground} />
              <Text className="text-sm font-bold text-foreground">
                Severidad mínima a recibir
              </Text>
            </View>
            <View
              className="flex-row p-1 rounded-xl gap-1"
              style={{ backgroundColor: colors.background }}
            >
              {SEVERITY_LEVELS.map((level) => {
                const isActive = preferences.minSeverity === level.id;
                return (
                  <Pressable
                    key={level.id}
                    onPress={() => setMinSeverity(level.id)}
                    style={({ pressed }) => ({
                      flex: 1,
                      paddingVertical: 9,
                      borderRadius: 9,
                      backgroundColor: isActive ? level.color : "transparent",
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <Text
                      className="text-xs font-bold text-center"
                      style={{ color: isActive ? "#FFFFFF" : colors.muted }}
                    >
                      {level.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text className="text-xs text-muted mt-3" style={{ lineHeight: 16 }}>
              Vas a recibir alertas de{" "}
              <Text style={{ fontWeight: "700", color: colors.foreground }}>
                {preferences.minSeverity === "severa" ? "fuerte" : preferences.minSeverity}
              </Text>{" "}
              en adelante. Se aplica en toda la app (Inicio, Mapa y notificaciones).
            </Text>
          </View>
        </View>

        {/* Alertas */}
        <View className="px-4">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="warning" size={20} color={colors.error} />
              <Text className="text-lg font-bold text-foreground">Alertas activas</Text>
            </View>
            {filteredAlerts.length > 0 && (
              <View
                style={{
                  backgroundColor: colors.error,
                  minWidth: 24,
                  height: 24,
                  paddingHorizontal: 7,
                  borderRadius: 12,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text className="text-white text-xs font-bold">{filteredAlerts.length}</Text>
              </View>
            )}
          </View>

          {error && hasApiKey && (
            <View
              className="p-4 rounded-2xl mb-3 flex-row gap-2 items-center"
              style={{ backgroundColor: colors.error + "12", ...cardShadow }}
            >
              <MaterialIcons name="error-outline" size={18} color={colors.error} />
              <Text className="text-sm text-foreground flex-1">{error}</Text>
            </View>
          )}

          {filteredAlerts.length > 0 ? (
            <View>{filteredAlerts.map(renderAlertCard)}</View>
          ) : (
            !error && (
              <View
                className="p-8 rounded-2xl items-center"
                style={{ backgroundColor: colors.surface, ...cardShadow }}
              >
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: colors.success + "1A",
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <MaterialIcons name="check-circle" size={34} color={colors.success} />
                </View>
                <Text className="text-base font-bold text-foreground">Sin alertas</Text>
                <Text className="text-xs text-muted text-center mt-1" style={{ lineHeight: 17 }}>
                  No hay alertas activas para los niveles seleccionados en tu zona.
                </Text>
              </View>
            )
          )}
        </View>

        <View className="px-4 pt-4">
          <View className="flex-row items-center justify-center gap-1.5">
            <MaterialIcons name="schedule" size={13} color={colors.muted} />
            <Text className="text-xs text-muted">
              Última actualización: {new Date().toLocaleTimeString("es-ES")}
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
