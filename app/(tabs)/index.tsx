/**
 * Home Screen - Weather Alerts
 * Pantalla principal con alertas de tormentas reales (Open-Meteo).
 *
 * Antes esta pantalla mostraba una lista fija DEMO_ALERTS que nunca
 * cambiaba y no tenia relacion con la ubicacion real del usuario ni con
 * ningun servicio de clima. Ahora usa useAlerts (ubicacion real +
 * Open-Meteo (servicio gratuito sin API key) + preferencias unificadas) y permite elegir, con
 * checkboxes independientes, que severidades quiere recibir el usuario:
 * leve, moderada y/o fuerte (severa), no un unico "minimo".
 */
import { ScrollView, Text, View, Pressable, RefreshControl } from "react-native";
import { useMemo } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAlertsContext } from "@/lib/alerts-context";
import { useAlertPreferences, SEVERITY_ORDER } from "@/hooks/useAlertPreferences";
import { getNearestRegionPoint } from "@/hooks/useRegionAlerts";
import { formatAlertTime } from "@/lib/services/weatherService";
import { SEVERITY_COLORS, SEVERITY_ICONS } from "@/shared/alertSeverity";
import type { AlertSeverity, WeatherAlert } from "@/shared/types/weather";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const SEVERITY_LEVELS: { id: AlertSeverity; label: string; color: string }[] = [
  { id: "leve", label: "Leve", color: SEVERITY_COLORS.leve },
  { id: "moderada", label: "Moderada", color: SEVERITY_COLORS.moderada },
  { id: "severa", label: "Fuerte", color: SEVERITY_COLORS.severa },
];

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
    regionPoints,
  } = useAlertsContext();

  // Inicio debe mostrar también la alerta de la zona regional donde cae
  // la ubicación. La alerta puntual puede consultar otro bloque del
  // pronóstico y quedar en "Leve", aunque el mosaico regional ya marque
  // "Moderada" para esa celda.
  const regionalCurrentAlert = useMemo(() => {
    if (!location) return null;
    return getNearestRegionPoint(location.latitude, location.longitude, regionPoints)?.alert ?? null;
  }, [location, regionPoints]);

  const homeAlerts = useMemo(() => {
    if (!regionalCurrentAlert) return filteredAlerts;

    const existingIndex = filteredAlerts.findIndex((alert) => alert.id === regionalCurrentAlert.id);
    if (existingIndex < 0) return [regionalCurrentAlert, ...filteredAlerts];

    const existing = filteredAlerts[existingIndex];
    if (SEVERITY_ORDER[regionalCurrentAlert.severity] >= SEVERITY_ORDER[existing.severity]) {
      return filteredAlerts;
    }

    const next = [...filteredAlerts];
    next[existingIndex] = regionalCurrentAlert;
    return next;
  }, [filteredAlerts, regionalCurrentAlert]);

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
          {location && typeof location.latitude === "number" && typeof location.longitude === "number" && (
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

        {/* Aviso si el servicio meteorologico esta disponible */}
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
                No se pudo habilitar el servicio meteorologico. Verifica tu conexion a internet;
                la app usa Open-Meteo (gratuito, sin API key), por lo que no requiere configuracion adicional.
              </Text>
            </View>
          </View>
        )}

        {/* Filtro de severidad mínima: selección única */}
        <View className="px-4 py-3">
          <View className="flex-row items-center gap-2 mb-2">
            <MaterialIcons name="filter-list" size={18} color={colors.foreground} />
            <Text className="text-sm font-semibold text-foreground">
              Severidad mínima que quiero recibir
            </Text>
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

        {/* Alertas */}
        <View className="px-4 py-4">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="warning" size={20} color={colors.error} />
              <Text className="text-lg font-bold text-foreground">Alertas Activas</Text>
            </View>
            {homeAlerts.length > 0 && (
              <View
                style={{
                  backgroundColor: colors.error,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 12,
                }}
              >
                <Text className="text-white text-xs font-semibold">{homeAlerts.length}</Text>
              </View>
            )}
          </View>

          {error && hasApiKey && (
            <View className="bg-surface p-4 rounded-xl border mb-3" style={{ borderColor: colors.error }}>
              <Text className="text-sm text-foreground">{error}</Text>
            </View>
          )}

          {homeAlerts.length > 0 ? (
            <View>{homeAlerts.map(renderAlertCard)}</View>
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
