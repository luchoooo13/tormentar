/**
 * Map Screen - Weather Alert Map
 * Pantalla de mapa con alertas de tormentas reales.
 *
 * Antes usaba su propia lista DEMO_ALERTS, separada de la de Inicio y
 * de la sensibilidad elegida por el usuario. Ahora usa el mismo hook
 * useAlerts (misma fuente real de datos) y el mismo filtro unico de
 * severidad, para que Inicio y Mapa siempre muestren exactamente las
 * mismas alertas.
 */
import { ScrollView, Text, View, Pressable } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAlerts } from "@/hooks/useAlerts";
import { formatAlertTime } from "@/lib/services/weatherService";
import type { AlertSeverity } from "@/shared/types/weather";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

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

const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  leve: "Leve",
  moderada: "Moderada",
  severa: "Fuerte",
};

export default function MapScreen() {
  const colors = useColors();
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);
  const { filteredAlerts, hasApiKey, error } = useAlerts();

  return (
    <ScreenContainer className="flex-1 gap-0">
      <ScrollView className="flex-1">
        {/* Encabezado */}
        <View className="px-4 pt-4 pb-3 border-b" style={{ borderBottomColor: colors.border }}>
          <View className="flex-row items-center gap-2">
            <MaterialIcons name="map" size={24} color={colors.primary} />
            <Text className="text-2xl font-bold text-foreground">Mapa de Alertas</Text>
          </View>
          <Text className="text-xs text-muted mt-1">
            Visualiza las areas afectadas por tormentas
          </Text>
        </View>

        {/* Simulacion de mapa */}
        <View className="px-4 py-4">
          <View
            className="w-full h-64 rounded-xl border-2 items-center justify-center"
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }}
          >
            <MaterialIcons name="map" size={80} color={colors.muted} />
            <Text className="text-muted text-sm mt-2">Mapa interactivo</Text>
            <Text className="text-muted text-xs">
              (Selecciona una alerta para ver detalles)
            </Text>
          </View>
        </View>

        {!hasApiKey && (
          <View className="px-4 pb-2">
            <View className="p-4 rounded-xl border" style={{ backgroundColor: colors.surface, borderColor: colors.error }}>
              <Text className="text-sm font-semibold text-foreground mb-1">Alertas no configuradas</Text>
              <Text className="text-xs text-muted">
                Falta EXPO_PUBLIC_OPENWEATHER_API_KEY para obtener alertas reales.
              </Text>
            </View>
          </View>
        )}

        {/* Lista de alertas en el mapa */}
        <View className="px-4 py-4">
          <View className="flex-row items-center gap-2 mb-3">
            <MaterialIcons name="warning" size={20} color={colors.error} />
            <Text className="text-lg font-bold text-foreground">Alertas en el Area</Text>
          </View>

          {error && hasApiKey && (
            <View className="bg-surface p-4 rounded-xl border mb-3" style={{ borderColor: colors.error }}>
              <Text className="text-sm text-foreground">{error}</Text>
            </View>
          )}

          {filteredAlerts.length === 0 && !error && (
            <View className="bg-surface p-6 rounded-xl border items-center" style={{ borderColor: colors.border }}>
              <MaterialIcons name="check-circle" size={48} color={colors.success} />
              <Text className="text-base font-semibold text-foreground mt-2">Sin alertas</Text>
              <Text className="text-xs text-muted text-center mt-1">
                No hay alertas activas para los niveles seleccionados en tu zona.
              </Text>
            </View>
          )}

          {filteredAlerts.map((alert) => {
            const alertColor = SEVERITY_COLORS[alert.severity];
            const alertIcon = SEVERITY_ICONS[alert.severity];
            const isSelected = selectedAlert === alert.id;

            return (
              <Pressable
                key={alert.id}
                onPress={() => setSelectedAlert(isSelected ? null : alert.id)}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View
                  className="mb-3 p-4 rounded-xl border-l-4"
                  style={{
                    backgroundColor: isSelected ? alertColor + "15" : colors.surface,
                    borderLeftColor: alertColor,
                    borderLeftWidth: 4,
                    borderWidth: 1,
                    borderColor: isSelected ? alertColor : colors.border,
                  }}
                >
                  {/* Encabezado */}
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center gap-2 flex-1">
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: alertColor + "20",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <MaterialIcons name={alertIcon as any} size={18} color={alertColor} />
                      </View>
                      <View className="flex-1">
                        <Text className="font-semibold text-xs uppercase" style={{ color: alertColor }}>
                          {SEVERITY_LABELS[alert.severity]}
                        </Text>
                        <Text className="text-xs text-muted">Radio: {alert.radius ?? 10} km</Text>
                      </View>
                    </View>
                    <MaterialIcons
                      name={isSelected ? "expand-less" : "expand-more"}
                      size={20}
                      color={colors.muted}
                    />
                  </View>

                  {/* Titulo */}
                  <Text className="text-base font-bold text-foreground mb-2">{alert.event}</Text>

                  {/* Descripcion */}
                  <Text className="text-sm text-muted mb-3">{alert.description}</Text>

                  {/* Coordenadas */}
                  <View className="flex-row items-center gap-2 mb-3">
                    <MaterialIcons name="location-on" size={14} color={colors.muted} />
                    <Text className="text-xs text-muted">
                      {alert.latitude.toFixed(2)}°, {alert.longitude.toFixed(2)}°
                    </Text>
                  </View>

                  {/* Detalles expandidos */}
                  {isSelected && (
                    <View className="pt-3 border-t" style={{ borderTopColor: colors.border }}>
                      <View className="gap-2">
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center gap-2">
                            <MaterialIcons name="schedule" size={16} color={colors.muted} />
                            <Text className="text-xs text-muted">Vigencia</Text>
                          </View>
                          <Text className="text-xs font-semibold text-foreground">
                            {formatAlertTime(alert.start, alert.end)}
                          </Text>
                        </View>

                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center gap-2">
                            <MaterialIcons name="circle" size={16} color={colors.muted} />
                            <Text className="text-xs text-muted">Area de cobertura</Text>
                          </View>
                          <Text className="text-xs font-semibold text-foreground">
                            {alert.radius ?? 10} km de radio
                          </Text>
                        </View>

                        {/* Recomendaciones */}
                        <View className="mt-2 p-3 rounded-lg" style={{ backgroundColor: alertColor + "10" }}>
                          <View className="flex-row items-start gap-2">
                            <MaterialIcons name="lightbulb" size={16} color={alertColor} style={{ marginTop: 2 }} />
                            <View className="flex-1">
                              <Text className="text-xs font-semibold" style={{ color: alertColor }}>
                                Recomendacion de Seguridad
                              </Text>
                              <Text className="text-xs text-muted mt-1">
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
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Leyenda */}
        <View className="px-4 py-4">
          <View className="flex-row items-center gap-2 mb-3">
            <MaterialIcons name="info" size={18} color={colors.foreground} />
            <Text className="text-sm font-semibold text-foreground">Leyenda</Text>
          </View>

          <View className="gap-2">
            {[
              { color: "#FFA500", label: "Leve", desc: "Lluvia ligera" },
              { color: "#FF6B35", label: "Moderada", desc: "Tormentas con vientos" },
              { color: "#EF4444", label: "Fuerte", desc: "Alerta critica" },
            ].map((item) => (
              <View key={item.label} className="flex-row items-center gap-3 p-3 rounded-lg bg-surface">
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: item.color,
                  }}
                />
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">{item.label}</Text>
                  <Text className="text-xs text-muted">{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Espaciador */}
        <View className="h-8" />
      </ScrollView>
    </ScreenContainer>
  );
}
