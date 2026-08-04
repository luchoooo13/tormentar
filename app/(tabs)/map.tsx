/**
 * Map Screen - Weather Alert Map
 * Pantalla de mapa interactivo con alertas de tormentas
 */

import { ScrollView, Text, View, Pressable } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

// Datos de demostración
const DEMO_ALERTS = [
  {
    id: "1",
    event: "Tormenta Leve",
    description: "Se esperan lluvias ligeras en el área. Condiciones normales.",
    severity: "leve",
    latitude: -34.6037,
    longitude: -58.3816,
    radius: 15,
  },
  {
    id: "2",
    event: "Tormenta Moderada",
    description: "Se esperan tormentas moderadas con vientos de 40-60 km/h.",
    severity: "moderada",
    latitude: -34.5,
    longitude: -58.5,
    radius: 25,
  },
  {
    id: "3",
    event: "Tormenta Severa",
    description: "Alerta de tormenta severa. Vientos superiores a 80 km/h.",
    severity: "severa",
    latitude: -34.7,
    longitude: -58.2,
    radius: 40,
  },
];

export default function MapScreen() {
  const colors = useColors();
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);

  const getSeverityColor = (severity: string) => {
    const colorMap: Record<string, string> = {
      leve: "#FFA500",
      moderada: "#FF6B35",
      severa: "#EF4444",
    };
    return colorMap[severity] || "#FFA500";
  };

  const getSeverityIcon = (severity: string) => {
    const iconMap: Record<string, string> = {
      leve: "cloud-queue",
      moderada: "cloud",
      severa: "cloud-download",
    };
    return iconMap[severity] || "cloud";
  };

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
            Visualiza las áreas afectadas por tormentas
          </Text>
        </View>

        {/* Simulación de mapa */}
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

        {/* Lista de alertas en el mapa */}
        <View className="px-4 py-4">
          <View className="flex-row items-center gap-2 mb-3">
            <MaterialIcons name="warning" size={20} color={colors.error} />
            <Text className="text-lg font-bold text-foreground">Alertas en el Área</Text>
          </View>

          {DEMO_ALERTS.map((alert) => {
            const alertColor = getSeverityColor(alert.severity);
            const alertIcon = getSeverityIcon(alert.severity);
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
                        <MaterialIcons
                          name={alertIcon as any}
                          size={18}
                          color={alertColor}
                        />
                      </View>
                      <View className="flex-1">
                        <Text
                          className="font-semibold text-xs uppercase"
                          style={{ color: alertColor }}
                        >
                          {alert.severity}
                        </Text>
                        <Text className="text-xs text-muted">
                          Radio: {alert.radius} km
                        </Text>
                      </View>
                    </View>
                    <MaterialIcons
                      name={isSelected ? "expand-less" : "expand-more"}
                      size={20}
                      color={colors.muted}
                    />
                  </View>

                  {/* Título */}
                  <Text className="text-base font-bold text-foreground mb-2">
                    {alert.event}
                  </Text>

                  {/* Descripción */}
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
                        {/* Área de cobertura */}
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center gap-2">
                            <MaterialIcons
                              name="circle"
                              size={16}
                              color={colors.muted}
                            />
                            <Text className="text-xs text-muted">Área de cobertura</Text>
                          </View>
                          <Text className="text-xs font-semibold text-foreground">
                            {alert.radius} km de radio
                          </Text>
                        </View>

                        {/* Recomendaciones */}
                        <View className="mt-2 p-3 rounded-lg" style={{ backgroundColor: alertColor + "10" }}>
                          <View className="flex-row items-start gap-2">
                            <MaterialIcons
                              name="lightbulb"
                              size={16}
                              color={alertColor}
                              style={{ marginTop: 2 }}
                            />
                            <View className="flex-1">
                              <Text
                                className="text-xs font-semibold"
                                style={{ color: alertColor }}
                              >
                                Recomendación de Seguridad
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

                        {/* Botón de acción */}
                        <Pressable
                          style={({ pressed }) => ({
                            backgroundColor: alertColor,
                            paddingVertical: 10,
                            paddingHorizontal: 12,
                            borderRadius: 6,
                            opacity: pressed ? 0.8 : 1,
                            marginTop: 8,
                          })}
                        >
                          <View className="flex-row items-center justify-center gap-2">
                            <MaterialIcons name="share" size={16} color="white" />
                            <Text className="text-white text-xs font-semibold">
                              Compartir Alerta
                            </Text>
                          </View>
                        </Pressable>
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
              { color: "#EF4444", label: "Severa", desc: "Alerta crítica" },
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
                  <Text className="text-sm font-semibold text-foreground">
                    {item.label}
                  </Text>
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
