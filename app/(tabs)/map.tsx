/**
 * Map Screen - Weather Alert Map
 * Estilizada con Material Design 3 Expressive.
 */
import { StyleSheet, ScrollView, Text, View, Pressable } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAlerts } from "@/hooks/useAlerts";
import { formatAlertTime } from "@/lib/services/weatherService";
import { ShapeRadius, Elevation } from "@/lib/_core/theme";
import type { AlertSeverity } from "@/shared/types/weather";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

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

const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  leve: "Leve",
  moderada: "Moderada",
  severa: "Fuerte",
};

const LEGEND_ITEMS = [
  { color: "#F57C00", label: "Leve", desc: "Lluvia ligera" },
  { color: "#E64A19", label: "Moderada", desc: "Tormentas con vientos" },
  { color: "#D32F2F", label: "Fuerte", desc: "Alerta crítica" },
];

export default function MapScreen() {
  const colors = useColors();
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);
  const { filteredAlerts, hasApiKey, error } = useAlerts();

  return (
    <ScreenContainer className="flex-1 gap-0" style={{ backgroundColor: colors.background }}>
      <ScrollView className="flex-1">
        {/* Material 3 Large Top App Bar */}
        <View style={[styles.topAppBar, { backgroundColor: colors.primaryContainer }]}>
          <View style={styles.topAppBarRow}>
            <View style={[styles.topAppBarIcon, { backgroundColor: colors.primary + "20" }]}>
              <MaterialIcons name="map" size={26} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.topAppBarTitle, { color: colors.onPrimaryContainer }]}>
                Mapa de Alertas
              </Text>
              <Text style={[styles.topAppBarSubtitle, { color: colors.onPrimaryContainer }]}>
                Visualiza las áreas afectadas por tormentas
              </Text>
            </View>
          </View>
        </View>

        {/* Map Placeholder - Material 3 Card */}
        <View style={styles.mapSection}>
          <View
            style={[
              styles.mapCard,
              {
                backgroundColor: colors.surfaceContainer,
                borderColor: colors.outline,
                ...Elevation[2],
              },
            ]}
          >
            <View style={styles.mapPlaceholder}>
              <MaterialIcons name="map" size={72} color={colors.primary} />
              <Text style={[styles.mapPlaceholderText, { color: colors.onSurface }]}>
                Mapa interactivo
              </Text>
              <Text style={[styles.mapPlaceholderSubtext, { color: colors.onSurfaceVariant }]}>
                Seleccioná una alerta para ver detalles
              </Text>
            </View>
          </View>
        </View>

        {/* Error Card */}
        {!hasApiKey && (
          <View style={styles.section}>
            <View
              style={[
                styles.errorCard,
                { backgroundColor: colors.errorContainer, borderColor: colors.error },
              ]}
            >
              <Text style={[styles.errorTitle, { color: colors.onErrorContainer }]}>
                Alertas no configuradas
              </Text>
              <Text style={[styles.errorDescription, { color: colors.onErrorContainer }]}>
                Falta EXPO_PUBLIC_OPENWEATHER_API_KEY para obtener alertas reales.
              </Text>
            </View>
          </View>
        )}

        {/* Alerts List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="warning" size={20} color={colors.error} />
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
              Alertas en el Área
            </Text>
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

          {filteredAlerts.length === 0 && !error && (
            <View style={[styles.emptyCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.outline }]}>
              <View style={[styles.emptyIconContainer, { backgroundColor: colors.success + "20" }]}>
                <MaterialIcons name="check-circle" size={40} color={colors.success} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>Sin alertas</Text>
              <Text style={[styles.emptyDescription, { color: colors.onSurfaceVariant }]}>
                No hay alertas activas para los niveles seleccionados en tu zona.
              </Text>
            </View>
          )}

          {filteredAlerts.map((alert) => {
            const alertColor = SEVERITY_COLORS[alert.severity];
            const containerColor = SEVERITY_CONTAINER_COLORS[alert.severity];
            const alertIcon = SEVERITY_ICONS[alert.severity];
            const isSelected = selectedAlert === alert.id;

            return (
              <Pressable
                key={alert.id}
                onPress={() => setSelectedAlert(isSelected ? null : alert.id)}
                style={({ pressed }) => [
                  styles.alertCard,
                  {
                    backgroundColor: isSelected
                      ? alertColor + "15"
                      : colors.surfaceContainer,
                    borderColor: isSelected ? alertColor : colors.outline,
                    borderLeftColor: alertColor,
                    borderLeftWidth: 4,
                    ...Elevation[isSelected ? 2 : 1],
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                {/* Card Header */}
                <View style={styles.alertHeader}>
                  <View style={styles.alertHeaderLeft}>
                    <View style={[styles.severityBadge, { backgroundColor: containerColor }]}>
                      <MaterialIcons name={alertIcon as any} size={18} color={alertColor} />
                    </View>
                    <View style={styles.severityInfo}>
                      <Text style={[styles.severityLabel, { color: alertColor }]}>
                        {SEVERITY_LABELS[alert.severity]}
                      </Text>
                      <Text style={[styles.severityRadius, { color: colors.onSurfaceVariant }]}>
                        Radio: {alert.radius ?? 10} km
                      </Text>
                    </View>
                  </View>
                  <MaterialIcons
                    name={isSelected ? "expand-less" : "expand-more"}
                    size={20}
                    color={colors.onSurfaceVariant}
                  />
                </View>

                {/* Alert Title */}
                <Text style={[styles.alertTitle, { color: colors.onSurface }]}>{alert.event}</Text>

                {/* Alert Description */}
                <Text style={[styles.alertDescription, { color: colors.onSurfaceVariant }]}>
                  {alert.description}
                </Text>

                {/* Coordinates */}
                <View style={styles.coordinatesRow}>
                  <MaterialIcons name="location-on" size={14} color={colors.onSurfaceVariant} />
                  <Text style={[styles.coordinatesText, { color: colors.onSurfaceVariant }]}>
                    {alert.latitude.toFixed(2)}°, {alert.longitude.toFixed(2)}°
                  </Text>
                </View>

                {/* Expanded Details */}
                {isSelected && (
                  <View style={[styles.expandedDetails, { borderTopColor: colors.outlineVariant }]}>
                    <View style={styles.detailRow}>
                      <View style={styles.detailRowLeft}>
                        <MaterialIcons name="schedule" size={16} color={colors.onSurfaceVariant} />
                        <Text style={[styles.detailLabel, { color: colors.onSurfaceVariant }]}>
                          Vigencia
                        </Text>
                      </View>
                      <Text style={[styles.detailValue, { color: colors.onSurface }]}>
                        {formatAlertTime(alert.start, alert.end)}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <View style={styles.detailRowLeft}>
                        <MaterialIcons name="circle" size={16} color={colors.onSurfaceVariant} />
                        <Text style={[styles.detailLabel, { color: colors.onSurfaceVariant }]}>
                          Área de cobertura
                        </Text>
                      </View>
                      <Text style={[styles.detailValue, { color: colors.onSurface }]}>
                        {alert.radius ?? 10} km de radio
                      </Text>
                    </View>

                    {/* Safety Recommendation */}
                    <View style={[styles.recommendationCard, { backgroundColor: containerColor }]}>
                      <View style={styles.recommendationRow}>
                        <MaterialIcons name="lightbulb" size={18} color={alertColor} style={{ marginTop: 2 }} />
                        <View style={styles.recommendationContent}>
                          <Text style={[styles.recommendationTitle, { color: alertColor }]}>
                            Recomendación de Seguridad
                          </Text>
                          <Text style={[styles.recommendationText, { color: colors.onSurface }]}>
                            {alert.severity === "severa"
                              ? "Busca refugio inmediatamente. Evita estar en espacios abiertos."
                              : alert.severity === "moderada"
                              ? "Mantente alerta. Evita actividades al aire libre."
                              : "Mantente informado. Lleva un paraguas si sales."}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Legend Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="info" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Leyenda</Text>
          </View>

          <View style={[styles.legendContainer, { backgroundColor: colors.surfaceContainer }]}>
            {LEGEND_ITEMS.map((item) => (
              <View key={item.label} style={[styles.legendRow, { backgroundColor: colors.surfaceContainerLow }]}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <View style={styles.legendText}>
                  <Text style={[styles.legendLabel, { color: colors.onSurface }]}>{item.label}</Text>
                  <Text style={[styles.legendDesc, { color: colors.onSurfaceVariant }]}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  // Top App Bar
  topAppBar: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 28,
    borderBottomLeftRadius: ShapeRadius.extraLarge,
    borderBottomRightRadius: ShapeRadius.extraLarge,
  },
  topAppBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  topAppBarIcon: {
    width: 48,
    height: 48,
    borderRadius: ShapeRadius.large,
    justifyContent: "center",
    alignItems: "center",
  },
  topAppBarTitle: {
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
  },
  topAppBarSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },

  // Map
  mapSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  mapCard: {
    borderRadius: ShapeRadius.extraLarge,
    borderWidth: 1,
    overflow: "hidden",
  },
  mapPlaceholder: {
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  mapPlaceholderText: {
    fontSize: 15,
    fontWeight: "600",
  },
  mapPlaceholderSubtext: {
    fontSize: 12,
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

  // Error Card
  errorCard: {
    borderRadius: ShapeRadius.large,
    borderWidth: 1,
    padding: 16,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  errorDescription: {
    fontSize: 13,
    lineHeight: 18,
  },

  // Info Card
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

  // Empty State
  emptyCard: {
    borderRadius: ShapeRadius.extraLarge,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    marginBottom: 12,
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

  // Alert Card
  alertCard: {
    borderRadius: ShapeRadius.large,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  alertHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  severityBadge: {
    width: 36,
    height: 36,
    borderRadius: ShapeRadius.medium,
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
  severityRadius: {
    fontSize: 11,
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
    marginBottom: 10,
  },
  coordinatesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  coordinatesText: {
    fontSize: 12,
  },

  // Expanded Details
  expandedDetails: {
    paddingTop: 14,
    marginTop: 4,
    borderTopWidth: 1,
    gap: 10,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailLabel: {
    fontSize: 12,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Recommendation
  recommendationCard: {
    borderRadius: ShapeRadius.medium,
    padding: 14,
    marginTop: 4,
  },
  recommendationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 12,
    lineHeight: 17,
  },

  // Legend
  legendContainer: {
    borderRadius: ShapeRadius.large,
    overflow: "hidden",
    gap: 1,
    ...Elevation[1],
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: ShapeRadius.full,
  },
  legendText: {
    flex: 1,
  },
  legendLabel: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  legendDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },

  bottomSpacer: {
    height: 32,
  },
});
