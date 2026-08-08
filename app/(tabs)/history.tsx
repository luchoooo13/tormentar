/**
 * History Screen - Historial de alertas
 * Lista las alertas que ya pasaron (end < ahora), guardadas
 * localmente en cada fetch de useAlerts (ver ALERT_HISTORY_KEY).
 * Permite filtrar por severidad y limpiar el historial completo.
 */
import { useMemo, useState } from "react";
import { Alert, Platform, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAlertHistory } from "@/hooks/useAlertHistory";
import { formatAlertTime } from "@/lib/services/weatherService";
import { SEVERITY_COLORS, SEVERITY_ICONS, SEVERITY_LABELS } from "@/shared/alertSeverity";
import type { AlertSeverity, WeatherAlert } from "@/shared/types/weather";

type SeverityFilter = AlertSeverity | "todas";

const FILTERS: { id: SeverityFilter; label: string; color?: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "leve", label: "Leve", color: SEVERITY_COLORS.leve },
  { id: "moderada", label: "Moderada", color: SEVERITY_COLORS.moderada },
  { id: "severa", label: "Fuerte", color: SEVERITY_COLORS.severa },
];

export default function HistoryScreen() {
  const colors = useColors();
  const { history, loading, refresh, clearHistory, filterBySeverity } = useAlertHistory();
  const [activeFilter, setActiveFilter] = useState<SeverityFilter>("todas");

  const filteredHistory = useMemo(
    () => filterBySeverity(activeFilter),
    [filterBySeverity, activeFilter]
  );

  const handleClear = () => {
    const doClear = () => clearHistory();
    if (Platform.OS === "web") {
      // Alert.alert con botones no tiene confirm nativo en web.
      if (typeof window !== "undefined" && window.confirm("¿Borrar todo el historial de alertas?")) {
        doClear();
      }
      return;
    }
    Alert.alert("Borrar historial", "¿Borrar todo el historial de alertas? Esta acción no se puede deshacer.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Borrar", style: "destructive", onPress: doClear },
    ]);
  };

  const renderHistoryCard = (alert: WeatherAlert) => {
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
          opacity: 0.9,
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
                {SEVERITY_LABELS[alert.severity].toUpperCase()}
              </Text>
              <Text className="text-xs text-muted">{alert.radius ?? 10} km</Text>
            </View>
          </View>
          <View
            className="flex-row items-center gap-1 px-2 py-1 rounded-full"
            style={{ backgroundColor: colors.background }}
          >
            <MaterialIcons name="event-available" size={12} color={colors.muted} />
            <Text className="text-xs text-muted">Finalizada</Text>
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
        <View className="px-4 pt-4 pb-3 border-b" style={{ borderBottomColor: colors.border }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="history" size={22} color={colors.primary} />
              <Text className="text-2xl font-bold text-foreground">Historial</Text>
            </View>
            {history.length > 0 && (
              <Pressable
                onPress={handleClear}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <View className="flex-row items-center gap-1">
                  <MaterialIcons name="delete-outline" size={16} color={colors.error} />
                  <Text className="text-xs font-semibold" style={{ color: colors.error }}>
                    Borrar
                  </Text>
                </View>
              </Pressable>
            )}
          </View>
          <Text className="text-xs text-muted mt-1">Alertas que ya finalizaron en tu zona.</Text>
        </View>

        {/* Filtro por severidad */}
        <View className="px-4 py-3">
          <View className="flex-row gap-2">
            {FILTERS.map((filter) => {
              const isActive = activeFilter === filter.id;
              const color = filter.color ?? colors.primary;
              return (
                <Pressable
                  key={filter.id}
                  onPress={() => setActiveFilter(filter.id)}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: 10,
                    paddingHorizontal: 8,
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: isActive ? color : colors.border,
                    backgroundColor: isActive ? color + "20" : colors.surface,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text
                    className="text-xs font-semibold text-center"
                    style={{ color: isActive ? color : colors.foreground }}
                  >
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Lista */}
        <View className="px-4 py-2 pb-6">
          {filteredHistory.length > 0 && (
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-sm text-muted">
                {filteredHistory.length} alerta{filteredHistory.length === 1 ? "" : "s"}
              </Text>
            </View>
          )}

          {filteredHistory.length > 0 ? (
            <View>{filteredHistory.map(renderHistoryCard)}</View>
          ) : (
            <View
              className="bg-surface p-6 rounded-xl border items-center"
              style={{ borderColor: colors.border }}
            >
              <MaterialIcons name="inbox" size={48} color={colors.muted} />
              <Text className="text-base font-semibold text-foreground mt-2">
                {history.length === 0 ? "Todavía no hay historial" : "Sin resultados"}
              </Text>
              <Text className="text-xs text-muted text-center mt-1">
                {history.length === 0
                  ? "Las alertas finalizadas van a aparecer acá automáticamente."
                  : "No hay alertas pasadas con esta severidad."}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
