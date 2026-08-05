/**
 * Settings Screen - Material Design 3 Expressive
 * Pantalla de configuracion con estilo Material 3.
 */
import { useState } from "react";
import { StyleSheet, ScrollView, Text, View, Pressable, Switch, TextInput } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAlertPreferences } from "@/hooks/useAlertPreferences";
import { useLocation } from "@/hooks/useLocation";
import { ShapeRadius, Elevation } from "@/lib/_core/theme";
import type { AlertSeverity } from "@/shared/types/weather";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const SEVERITY_LEVELS: { id: AlertSeverity; label: string; color: string; containerColor: string }[] = [
  { id: "leve", label: "Leve", color: "#F57C00", containerColor: "#FFF3E0" },
  { id: "moderada", label: "Moderada", color: "#E64A19", containerColor: "#FBE9E7" },
  { id: "severa", label: "Fuerte", color: "#D32F2F", containerColor: "#FFEBEE" },
];

export default function SettingsScreen() {
  const colors = useColors();
  const { preferences, updatePreferences, setMinSeverity } = useAlertPreferences();
  const { location } = useLocation();

  const [searchCity, setSearchCity] = useState("");
  const [showCitySearch, setShowCitySearch] = useState(false);

  const SettingRow = ({
    icon,
    title,
    subtitle,
    value,
    onToggle,
  }: {
    icon: string;
    title: string;
    subtitle: string;
    value: boolean;
    onToggle: () => void;
  }) => (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [
        styles.settingRow,
        {
          backgroundColor: colors.surfaceContainer,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.settingIconContainer, { backgroundColor: colors.primaryContainer }]}>
          <MaterialIcons name={icon as any} size={22} color={colors.primary} />
        </View>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingTitle, { color: colors.onSurface }]}>{title}</Text>
          <Text style={[styles.settingSubtitle, { color: colors.onSurfaceVariant }]}>{subtitle}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.outlineVariant, true: colors.primary + "60" }}
        thumbColor={colors.primary}
        ios_backgroundColor={colors.outlineVariant}
      />
    </Pressable>
  );

  return (
    <ScreenContainer className="flex-1 gap-0" style={{ backgroundColor: colors.background }}>
      <ScrollView className="flex-1">
        {/* Material 3 Large Top App Bar */}
        <View style={[styles.topAppBar, { backgroundColor: colors.primaryContainer }]}>
          <View style={styles.topAppBarRow}>
            <View style={[styles.topAppBarIcon, { backgroundColor: colors.primary + "20" }]}>
              <MaterialIcons name="settings" size={26} color={colors.primary} />
            </View>
            <Text style={[styles.topAppBarTitle, { color: colors.onPrimaryContainer }]}>
              Configuración
            </Text>
          </View>
        </View>

        {/* Location Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="location-on" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Ubicación</Text>
          </View>

          <Pressable
            onPress={() => setShowCitySearch(!showCitySearch)}
            style={({ pressed }) => [
              styles.listItem,
              {
                backgroundColor: colors.surfaceContainer,
                opacity: pressed ? 0.85 : 1,
                ...Elevation[1],
              },
            ]}
          >
            <View style={styles.listItemLeft}>
              <View style={[styles.listItemIcon, { backgroundColor: colors.primaryContainer }]}>
                <MaterialIcons name="edit-location" size={20} color={colors.primary} />
              </View>
              <View style={styles.listItemText}>
                <Text style={[styles.listItemTitle, { color: colors.onSurface }]}>
                  Cambiar Ubicación
                </Text>
                <Text style={[styles.listItemSubtitle, { color: colors.onSurfaceVariant }]}>
                  {location?.city ?? "Sin ubicación configurada"}
                </Text>
              </View>
            </View>
            <MaterialIcons name={showCitySearch ? "expand-less" : "expand-more"} size={22} color={colors.onSurfaceVariant} />
          </Pressable>

          {showCitySearch && (
            <View style={styles.searchContainer}>
              <View style={[styles.searchInput, {
                backgroundColor: colors.surfaceContainerLow,
                borderColor: colors.outline,
              }]}>
                <MaterialIcons name="search" size={18} color={colors.onSurfaceVariant} style={styles.searchIcon} />
                <TextInput
                  placeholder="Buscar ciudad..."
                  placeholderTextColor={colors.onSurfaceVariant}
                  value={searchCity}
                  onChangeText={setSearchCity}
                  style={[styles.searchTextInput, { color: colors.onSurface }]}
                />
              </View>
              <Text style={[styles.hint, { color: colors.onSurfaceVariant }]}>
                La búsqueda por nombre de ciudad requiere geocodificación (pendiente de implementar).
              </Text>
            </View>
          )}
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="notifications" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Notificaciones</Text>
          </View>

          <View style={[styles.settingsGroup, { backgroundColor: colors.surfaceContainer }]}>
            <SettingRow
              icon="notifications-active"
              title="Notificaciones"
              subtitle="Recibir alertas de clima"
              value={preferences.notificationsEnabled}
              onToggle={() => updatePreferences({ notificationsEnabled: !preferences.notificationsEnabled })}
            />
            <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />
            <SettingRow
              icon="volume-up"
              title="Sonido"
              subtitle="Reproducir sonido de alerta"
              value={preferences.soundEnabled && preferences.notificationsEnabled}
              onToggle={() => updatePreferences({ soundEnabled: !preferences.soundEnabled })}
            />
            <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />
            <SettingRow
              icon="vibration"
              title="Vibración"
              subtitle="Vibración en alertas"
              value={preferences.vibrationEnabled && preferences.notificationsEnabled}
              onToggle={() => updatePreferences({ vibrationEnabled: !preferences.vibrationEnabled })}
            />
          </View>
        </View>

        {/* Sensitivity Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="tune" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Sensibilidad de alertas</Text>
          </View>

          <View style={[styles.infoCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.outline }]}>
            <Text style={[styles.infoDescription, { color: colors.onSurfaceVariant }]}>
              Elegí la severidad mínima que querés recibir: vas a recibir esa y todo lo que sea
              igual o más grave. Este ajuste es único para toda la app.
            </Text>
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
                        backgroundColor: isActive ? level.containerColor : colors.surfaceContainerLow,
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
          </View>
        </View>

        {/* Update Interval Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="schedule" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Actualización</Text>
          </View>

          <View style={[styles.infoCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.outline }]}>
            <View style={styles.intervalHeader}>
              <Text style={[styles.intervalLabel, { color: colors.onSurface }]}>Intervalo de Actualización</Text>
              <View style={[styles.intervalBadge, { backgroundColor: colors.primaryContainer }]}>
                <Text style={[styles.intervalBadgeText, { color: colors.onPrimaryContainer }]}>
                  {preferences.updateIntervalMinutes} min
                </Text>
              </View>
            </View>

            <View style={styles.intervalRow}>
              {[5, 10, 15, 30].map((interval) => {
                const isActive = preferences.updateIntervalMinutes === interval;
                return (
                  <Pressable
                    key={interval}
                    onPress={() => updatePreferences({ updateIntervalMinutes: interval })}
                    style={({ pressed }) => [
                      styles.intervalChip,
                      {
                        backgroundColor: isActive ? colors.primary : colors.surfaceContainerLow,
                        borderColor: isActive ? colors.primary : colors.outline,
                        opacity: pressed ? 0.85 : 1,
                        ...Elevation[isActive ? 1 : 0],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.intervalChipText,
                        { color: isActive ? colors.onPrimary : colors.onSurface },
                      ]}
                    >
                      {interval}m
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.intervalHint, { color: colors.onSurfaceVariant }]}>
              La app actualizará las alertas cada {preferences.updateIntervalMinutes} minutos
            </Text>
          </View>
        </View>

        {/* Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="info" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Información</Text>
          </View>

          <View style={[styles.settingsGroup, { backgroundColor: colors.surfaceContainer }]}>
            <View style={styles.infoRow}>
              <View style={styles.infoRowLeft}>
                <MaterialIcons name="info" size={18} color={colors.onSurfaceVariant} />
                <Text style={[styles.infoRowLabel, { color: colors.onSurfaceVariant }]}>Versión</Text>
              </View>
              <Text style={[styles.infoRowValue, { color: colors.onSurface }]}>1.0.0</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />
            <View style={styles.infoRow}>
              <View style={styles.infoRowLeft}>
                <MaterialIcons name="cloud" size={18} color={colors.onSurfaceVariant} />
                <Text style={[styles.infoRowLabel, { color: colors.onSurfaceVariant }]}>Fuente de Datos</Text>
              </View>
              <Text style={[styles.infoRowValue, { color: colors.onSurface }]}>OpenWeatherMap</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />
            <View style={styles.infoRow}>
              <View style={styles.infoRowLeft}>
                <MaterialIcons name="developer-mode" size={18} color={colors.onSurfaceVariant} />
                <Text style={[styles.infoRowLabel, { color: colors.onSurfaceVariant }]}>Desarrollador</Text>
              </View>
              <Text style={[styles.infoRowValue, { color: colors.onSurface }]}>Tormentar</Text>
            </View>
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
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 32,
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
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },

  // Setting Row
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: ShapeRadius.medium,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: ShapeRadius.large,
    justifyContent: "center",
    alignItems: "center",
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  settingSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },

  // List Item
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: ShapeRadius.medium,
  },
  listItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  listItemIcon: {
    width: 40,
    height: 40,
    borderRadius: ShapeRadius.large,
    justifyContent: "center",
    alignItems: "center",
  },
  listItemText: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  listItemSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },

  // Search
  searchContainer: {
    marginTop: 12,
    gap: 8,
  },
  searchInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: ShapeRadius.medium,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  hint: {
    fontSize: 12,
    lineHeight: 16,
  },

  // Settings Group
  settingsGroup: {
    borderRadius: ShapeRadius.large,
    overflow: "hidden",
    ...Elevation[1],
  },

  // Divider
  divider: {
    height: 1,
    marginLeft: 56,
  },

  // Info Card
  infoCard: {
    borderRadius: ShapeRadius.large,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  infoDescription: {
    fontSize: 13,
    lineHeight: 18,
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

  // Interval
  intervalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  intervalLabel: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  intervalBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: ShapeRadius.full,
  },
  intervalBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  intervalRow: {
    flexDirection: "row",
    gap: 8,
  },
  intervalChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: ShapeRadius.medium,
    borderWidth: 1,
    alignItems: "center",
  },
  intervalChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  intervalHint: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },

  // Info Row
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoRowLabel: {
    fontSize: 14,
  },
  infoRowValue: {
    fontSize: 14,
    fontWeight: "600",
  },

  bottomSpacer: {
    height: 32,
  },
});
