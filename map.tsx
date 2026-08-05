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
import { ScrollView, Text, View, Pressable, Platform } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAlerts } from "@/hooks/useAlerts";
import { formatAlertTime } from "@/lib/services/weatherService";
import type { AlertSeverity } from "@/shared/types/weather";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

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

const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  leve: "Leve",
  moderada: "Moderada",
  severa: "Fuerte",
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

export default function MapScreen() {
  const colors = useColors();
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);
  const { filteredAlerts, hasApiKey, error } = useAlerts();

  return (
    <ScreenContainer className="flex-1 gap-0">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Encabezado tipo "hero" */}
        <View
          className="px-5 pt-6 pb-6 mb-4"
          style={{
            backgroundColor: colors.primary,
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28,
          }}
        >
          <View className="flex-row items-center gap-2 mb-1">
            <MaterialIcons name="map" size={22} color="#FFFFFF" />
            <Text className="text-2xl font-extrabold" style={{ color: "#FFFFFF" }}>
              Mapa de alertas
            </Text>
          </View>
          <Text className="text-xs" style={{ color: "#FFFFFF", opacity: 0.85 }}>
            Visualizá las áreas afectadas por tormentas
          </Text>
        </View>

        {/* Simulacion de mapa */}
        <View className="px-4 mb-3">
          <View
            className="w-full h-64 rounded-2xl items-center justify-center"
            style={{ backgroundColor: colors.surface, ...cardShadow }}
          >
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: colors.primary + "14",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <MaterialIcons name="map" size={38} color={colors.primary} />
            </View>
            <Text className="text-foreground text-sm font-semibold">Mapa interactivo</Text>
            <Text className="text-muted text-xs mt-0.5">
              Seleccioná una alerta para ver detalles
            </Text>
          </View>
        </View>

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
                  Falta EXPO_PUBLIC_OPENWEATHER_API_KEY para obtener alertas reales.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Lista de alertas en el mapa */}
        <View className="px-4">
          <View className="flex-row items-center gap-2 mb-3">
            <MaterialIcons name="warning" size={20} color={colors.error} />
            <Text className="text-lg font-bold text-foreground">Alertas en el área</Text>
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

          {filteredAlerts.length === 0 && !error && (
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
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <View
                  className="mb-3 p-4 rounded-2xl"
                  style={{
                    backgroundColor: isSelected ? alertColor + "0F" : colors.surface,
                    borderLeftColor: alertColor,
                    borderLeftWidth: 4,
                    ...cardShadow,
                  }}
                >
                  {/* Encabezado */}
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center gap-3 flex-1">
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 11,
                          backgroundColor: alertColor + "1A",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <MaterialIcons name={alertIcon as any} size={18} color={alertColor} />
                      </View>
                      <View className="flex-1">
                        <Text
                          className="font-bold text-xs"
                          style={{ color: alertColor, letterSpacing: 0.5 }}
                        >
                          {SEVERITY_LABELS[alert.severity].toUpperCase()}
                        </Text>
                        <Text className="text-xs text-muted mt-0.5">
                          Radio de {alert.radius ?? 10} km
                        </Text>
                      </View>
                    </View>
                    <MaterialIcons
                      name={isSelected ? "expand-less" : "expand-more"}
                      size={20}
                      color={colors.muted}
                    />
                  </View>

                  {/* Titulo */}
                  <Text className="text-base font-bold text-foreground mb-1.5">{alert.event}</Text>

                  {/* Descripcion */}
                  <Text className="text-sm text-muted mb-3" style={{ lineHeight: 19 }}>
                    {alert.description}
                  </Text>

                  {/* Coordenadas */}
                  <View className="flex-row items-center gap-1.5 mb-1">
                    <MaterialIcons name="location-on" size={14} color={colors.muted} />
                    <Text className="text-xs text-muted">
                      {alert.latitude.toFixed(2)}°, {alert.longitude.toFixed(2)}°
                    </Text>
                  </View>

                  {/* Detalles expandidos */}
                  {isSelected && (
                    <View
                      className="mt-2 pt-3"
                      style={{ borderTopWidth: 1, borderTopColor: colors.border }}
                    >
                      <View className="gap-2">
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center gap-2">
                            <MaterialIcons name="schedule" size={16} color={colors.muted} />
                            <Text className="text-xs text-muted">Vigencia</Text>
                          </View>
                          <Text className="text-xs font-bold text-foreground">
                            {formatAlertTime(alert.start, alert.end)}
                          </Text>
                        </View>

                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center gap-2">
                            <MaterialIcons name="circle" size={16} color={colors.muted} />
                            <Text className="text-xs text-muted">Área de cobertura</Text>
                          </View>
                          <Text className="text-xs font-bold text-foreground">
                            {alert.radius ?? 10} km de radio
                          </Text>
                        </View>

                        {/* Recomendaciones */}
                        <View
                          className="mt-2 p-3 rounded-xl"
                          style={{ backgroundColor: alertColor + "0F" }}
                        >
                          <View className="flex-row items-start gap-2">
                            <MaterialIcons
                              name="lightbulb"
                              size={16}
                              color={alertColor}
                              style={{ marginTop: 2 }}
                            />
                            <View className="flex-1">
                              <Text className="text-xs font-bold" style={{ color: alertColor }}>
                                Recomendación de seguridad
                              </Text>
                              <Text className="text-xs text-muted mt-1" style={{ lineHeight: 16 }}>
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
        <View className="px-4 pt-1">
          <View className="flex-row items-center gap-2 mb-3">
            <MaterialIcons name="info" size={18} color={colors.foreground} />
            <Text className="text-sm font-bold text-foreground">Leyenda</Text>
          </View>

          <View
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: colors.surface, ...cardShadow }}
          >
            {[
              { color: "#F59E0B", label: "Leve", desc: "Lluvia ligera" },
              { color: "#EA580C", label: "Moderada", desc: "Tormentas con vientos" },
              { color: "#DC2626", label: "Fuerte", desc: "Alerta crítica" },
            ].map((item, i) => (
              <View
                key={item.label}
                className="flex-row items-center gap-3 p-3"
                style={i > 0 ? { borderTopWidth: 1, borderTopColor: colors.border } : undefined}
              >
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: item.color,
                  }}
                />
                <View className="flex-1">
                  <Text className="text-sm font-bold text-foreground">{item.label}</Text>
                  <Text className="text-xs text-muted">{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
