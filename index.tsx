/**
 * Home Screen - Weather Alerts
 * Pantalla principal con alertas de tormentas reales (OpenWeatherMap).
 * Estilizada con Material Design 3 Expressive.
 */
import { StyleSheet, ScrollView, Text, View, Pressable, RefreshControl } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAlerts } from "@/hooks/useAlerts";
import { useAlertPreferences } from "@/hooks/useAlertPreferences";
import { formatAlertTime } from "@/lib/services/weatherService";
import { ShapeRadius, Elevation } from "@/lib/_core/theme";
import type { AlertSeverity, WeatherAlert } from "@/shared/types/weather";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const SEVERITY_LEVELS: { id: AlertSeverity; label: string; color: string; containerColor: string }[] = [
  { id: "leve", label: "Leve", color: "#F57C00", containerColor: "#FFF3E0" },
  { id: "moderada", label: "Moderada", color: "#E64A19", containerColor: "#FBE9E7" },
  { id: "severa", label: "Fuerte", color: "#D32F2F", containerColor: "#FFEBEE" },
];

const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  leve: "#F57C00",
  moderada: "#E64A19",
  severa: "#D32F2F",
};

const SEVERITY_CONTAINER_COLORS: Record<AlertSeverity, string> = {
  leve: "#FFF3E0",
  moderada: "#FBE9E7",
  severa: "#FFEBEE",
};

const SEVERITY_ICONS: Record<AlertSeverity, string> = {
  leve: "cloud-queue",
  moderada: "cloud",
  severa: "flash-on",
};

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
    const containerColor = SEVERITY_CONTAINER_COLORS[alert.severity];
    const alertIcon = SEVERITY_ICONS[alert.severity];

    return (
      <View
        key={alert.id}
        style={[
          styles.alertCard,
          {
            backgroundColor: colors.surfaceContainer,
            borderColor: colors.outline,
            ...Elevation[1],
          },
        ]}
      >
        <View style={styles.alertHeader}>
          <View style={[styles.severityBadge, { backgroundColor: containerColor }]}>
            <MaterialIcons name={alertIcon as any} size={20} color={alertColor} />
          </View>
          <View style={styles.severityInfo}>
            <Text
              className="font-semibold"
              style={[styles.severityLabel, { color: alertColor }]}
            >
              {alert.severity === "severa" ? "FUERTE" : alert.severity.toUpperCase()}
            </Text>
            <Text style={[styles.radiusText, { color: colors.onSurfaceVariant }]}>
              {alert.radius ?? 10} km de radio
            </Text>
          </View>
        </View>

        <Text style={[styles.alertTitle, { color: colors.onSurface }]}>{alert.event}</Text>

        <Text style={[styles.alertDescription, { color: colors.onSurfaceVariant }]} numberOfLines={3}>
          {alert.description}
        </Text>

        <View style={styles.alertTimeRow}>
          <MaterialIcons name="schedule" size={14} color={colors.onSurfaceVariant} />
          <Text style={[styles.alertTime, { color: colors.onSurfaceVariant }]}>
            {formatAlertTime(alert.start, alert.end)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer className="flex-1 gap-0" style={{ backgroundColor: colors.background }}>
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />
        }
      >
        {/* Material 3 Large Top App Bar Header */}
        <View style={[styles.topAppBar, { backgroundColor: colors.primaryContainer }]}>
          <View style={styles.locationRow}>
            <View style={[styles.locationIconContainer, { backgroundColor: colors.primary + "20" }]}>
              <MaterialIcons name="location-on" size={22} color={colors.primary} />
            </View>
            <View style={styles.locationTextContainer}>
              <Text style={[styles.locationLabel, { color: colors.onPrimaryContainer }]}>
                UBICACION ACTUAL
              </Text>
              <Text style={[styles.locationName, { color: colors.onPrimaryContainer }]}>
                {location?.city ?? "Buscando ubicacion..."}
              </Text>
              {location && (
                <Text style={[styles.locationCoords, { color: colors.onPrimaryContainer }]}>
                  {location.latitude.toFixed(2)}°, {location.longitude.toFixed(2)}°
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Weather Card - Material 3 Elevated Card */}
        {weather?.current && (
          <View style={styles.weatherSection}>
            <View
              style={[
                styles.weatherCard,
                {
                  backgroundColor: colors.surfaceContainer,
                  borderColor: colors.outline,
                  ...Elevation[2],
                },
              ]}
            >
              <View style={styles.weatherTopRow}>
                <View style={styles.weatherLeft}>
                  <View style={styles.temperatureRow}>
                    <MaterialIcons name="thermostat" size={28} color={colors.primary} />
                    <Text style={[styles.temperatureText, { color: colors.onSurface }]}>
                      {Math.round(weather.current.temp)}°
                    </Text>
                    <Text style={[styles.temperatureUnit, { color: colors.onSurfaceVariant }]}>C</Text>
                  </View>
                  <Text style={[styles.weatherDesc, { color: colors.onSurfaceVariant }]}>
                    {weather.current.weather?.[0]?.description ?? ""}
                  </Text>
                </View>
                <MaterialIcons name="wb-cloudy" size={56} color={colors.primary} />
              </View>
              <View style={styles.weatherDetails}>
                <View style={[styles.weatherDetail, { backgroundColor: colors.surfaceContainerLow }]}>
                  <MaterialIcons name="opacity" size={16} color={colors.primary} />
                  <Text style={[styles.weatherDetailText, { color: colors.onSurface }]}>
                    Humedad: {weather.current.humidity}%
                  </Text>
                </View>
                <View style={[styles.weatherDetail, { backgroundColor: colors.surfaceContainerLow }]}>
                  <MaterialIcons name="air" size={16} color={colors.primary} />
                  <Text style={[styles.weatherDetailText, { color: colors.onSurface }]}>
                    Viento: {Math.round(weather.current.wind_speed)} m/s
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Error Card - API Key missing */}
        {!hasApiKey && (
          <View style={styles.section}>
            <View
              style={[
                styles.errorCard,
                {
                  backgroundColor: colors.errorContainer,
                  borderColor: colors.error,
                },
              ]}
            >
              <View style={styles.errorHeader}>
                <MaterialIcons name="error-outline" size={20} color={colors.onErrorContainer} />
                <Text style={[styles.errorTitle, { color: colors.onErrorContainer }]}>
                  Alertas no configuradas
                </Text>
              </View>
              <Text style={[styles.errorDescription, { color: colors.onErrorContainer }]}>
                Falta la variable EXPO_PUBLIC_OPENWEATHER_API_KEY para poder pedir alertas reales
                a OpenWeatherMap. Hasta configurarla no se mostrara ninguna alerta.
              </Text>
            </View>
          </View>
        )}

        {/* Severity Filter - Material 3 Filter Chips */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="filter-list" size={20} color={colors.onSurface} />
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
              Severidad minima
            </Text>
          </View>
          <View style={styles.chipRow}>
            {SEVERITY_LEVELS.map((level) => {
              const isActive = preferences.minSeverity === level.id;
              return (
                <Pressable
                  key={level.id}
                  onPress={() => setMinSeverity(level.id)}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      borderColor: isActive ? level.color : colors.outline,
                      backgroundColor: isActive ? level.containerColor : colors.surfaceContainer,
                      opacity: pressed ? 0.85 : 1,
                      ...Elevation[isActive ? 1 : 0],
                    },
                  ]}
                >
                  {isActive && (
                    <MaterialIcons name="check" size={14} color={level.color} style={styles.chipCheck} />
                  )}
                  <Text
                    style={[
                      styles.chipLabel,
                      { color: isActive ? level.color : colors.onSurfaceVariant },
                    ]}
                  >
                    {level.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.sectionHint, { color: colors.onSurfaceVariant }]}>
            Vas a recibir alertas de {preferences.minSeverity === "severa" ? "fuerte" : preferences.minSeverity} en adelante. Se aplica en toda la app.
          </Text>
        </View>

        {/* Alerts Section */}
        <View style={styles.alertsSection}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="warning" size={20} color={colors.error} />
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Alertas Activas</Text>
            {filteredAlerts.length > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.error }]}>
                <Text style={styles.badgeText}>{filteredAlerts.length}</Text>
              </View>
            )}
          </View>

          {error && hasApiKey && (
            <View
              style={[
                styles.infoCard,
                { backgroundColor: colors.surfaceContainer, borderColor: colors.error },
              ]}
            >
              <Text style={[styles.infoText, { color: colors.onSurface }]}>{error}</Text>
            </View>
          )}

          {filteredAlerts.length > 0 ? (
            <View>{filteredAlerts.map(renderAlertCard)}</View>
          ) : (
            !error && (
              <View style={[styles.emptyCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.outline }]}>
                <View style={[styles.emptyIconContainer, { backgroundColor: colors.success + "20" }]}>
                  <MaterialIcons name="check-circle" size={40} color={colors.success} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>Sin alertas</Text>
                <Text style={[styles.emptyDescription, { color: colors.onSurfaceVariant }]}>
                  No hay alertas activas para los niveles seleccionados en tu zona.
                </Text>
              </View>
            )
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <MaterialIcons name="schedule" size={14} color={colors.onSurfaceVariant} />
            <Text style={[styles.footerText, { color: colors.onSurfaceVariant }]}>
              Ultima actualizacion: {new Date().toLocaleTimeString("es-ES")}
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  // Top App Bar
  topAppBar: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: ShapeRadius.extraLarge,
    borderBottomRightRadius: ShapeRadius.extraLarge,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  locationIconContainer: {
    width: 44,
    height: 44,
    borderRadius: ShapeRadius.large,
    justifyContent: "center",
    alignItems: "center",
  },
  locationTextContainer: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  locationName: {
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
  },
  locationCoords: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },

  // Weather
  weatherSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  weatherCard: {
    borderRadius: ShapeRadius.extraLarge,
    borderWidth: 1,
    padding: 20,
    overflow: "hidden",
  },
  weatherTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  weatherLeft: {
    flex: 1,
  },
  temperatureRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginBottom: 8,
  },
  temperatureText: {
    fontSize: 48,
    fontWeight: "700",
    lineHeight: 52,
  },
  temperatureUnit: {
    fontSize: 16,
    lineHeight: 20,
  },
  weatherDesc: {
    fontSize: 14,
    lineHeight: 18,
  },
  weatherDetails: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  weatherDetail: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: ShapeRadius.medium,
  },
  weatherDetailText: {
    fontSize: 12,
    fontWeight: "500",
  },

  // Sections
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
  },
  sectionHint: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 8,
  },

  // Chips
  chipRow: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: ShapeRadius.medium,
    borderWidth: 1,
  },
  chipCheck: {
    marginRight: 4,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Alert Card
  alertsSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: ShapeRadius.full,
    marginLeft: "auto",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  alertCard: {
    borderRadius: ShapeRadius.large,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  severityBadge: {
    width: 40,
    height: 40,
    borderRadius: ShapeRadius.large,
    justifyContent: "center",
    alignItems: "center",
  },
  severityInfo: {
    flex: 1,
  },
  severityLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  radiusText: {
    fontSize: 12,
    marginTop: 2,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    marginBottom: 8,
  },
  alertDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  alertTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  alertTime: {
    fontSize: 12,
  },

  // Cards
  errorCard: {
    borderRadius: ShapeRadius.large,
    borderWidth: 1,
    padding: 16,
  },
  errorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  errorDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  infoCard: {
    borderRadius: ShapeRadius.large,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyCard: {
    borderRadius: ShapeRadius.extraLarge,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: ShapeRadius.extraLarge,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  emptyDescription: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },

  // Footer
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 12,
  },
});
