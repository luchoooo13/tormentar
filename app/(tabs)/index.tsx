/**
 * Home Screen - Weather Alerts
 * Pantalla principal con alertas de tormentas mejorada
 */

import { ScrollView, Text, View, Pressable, RefreshControl } from "react-native";
import { useState, useEffect } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Datos de demostración
const DEMO_LOCATION = {
  city: "Buenos Aires",
  country: "Argentina",
  latitude: -34.6037,
  longitude: -58.3816,
};

const DEMO_WEATHER = {
  temp: 24,
  feels_like: 23,
  humidity: 65,
  wind_speed: 12,
  condition: "Parcialmente nublado",
};

const DEMO_ALERTS = [
  {
    id: "1",
    event: "Tormenta Leve",
    description: "Se esperan lluvias ligeras en el área. Condiciones normales.",
    severity: "leve",
    radius: 15,
    time: "Hoy 14:00 - 15:00",
    icon: "cloud-queue",
  },
  {
    id: "2",
    event: "Tormenta Moderada",
    description: "Se esperan tormentas moderadas con vientos de 40-60 km/h.",
    severity: "moderada",
    radius: 25,
    time: "Hoy 16:00 - 18:00",
    icon: "cloud",
  },
  {
    id: "3",
    event: "Tormenta Severa",
    description: "Alerta de tormenta severa. Vientos superiores a 80 km/h.",
    severity: "severa",
    radius: 40,
    time: "Hoy 18:00 - 20:00",
    icon: "cloud-download",
  },
];

const SEVERITY_LEVELS = [
  { id: "leve", label: "Leve", color: "#FFA500" },
  { id: "moderada", label: "Moderada", color: "#FF6B35" },
  { id: "severa", label: "Severa", color: "#EF4444" },
];

export default function HomeScreen() {
  const colors = useColors();
  const [refreshing, setRefreshing] = useState(false);
  const [minSeverity, setMinSeverity] = useState("leve");

  // Cargar configuración de severidad mínima
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = await AsyncStorage.getItem("tormentar_min_severity");
        if (saved) {
          setMinSeverity(saved);
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };
    loadSettings();
  }, []);

  // Guardar configuración de severidad mínima
  const updateMinSeverity = async (severity: string) => {
    setMinSeverity(severity);
    try {
      await AsyncStorage.setItem("tormentar_min_severity", severity);
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Simular actualización
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

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

  const getSeverityOrder = (severity: string) => {
    const order: Record<string, number> = {
      severa: 0,
      moderada: 1,
      leve: 2,
    };
    return order[severity] || 3;
  };

  // Filtrar alertas por severidad mínima
  const filteredAlerts = DEMO_ALERTS.filter((alert) => {
    const severityOrder: Record<string, number> = {
      severa: 0,
      moderada: 1,
      leve: 2,
    };
    const minOrder = severityOrder[minSeverity] || 2;
    return severityOrder[alert.severity] <= minOrder;
  }).sort((a, b) => getSeverityOrder(a.severity) - getSeverityOrder(b.severity));

  const renderAlertCard = (alert: any) => {
    const alertColor = getSeverityColor(alert.severity);
    const alertIcon = getSeverityIcon(alert.severity);

    return (
      <Pressable
        key={alert.id}
        style={({ pressed }) => ({
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <View
          className="mb-3 p-4 rounded-xl border-l-4"
          style={{
            backgroundColor: colors.surface,
            borderLeftColor: alertColor,
            borderWidth: 1,
            borderLeftWidth: 4,
            borderColor: colors.border,
          }}
        >
          {/* Encabezado con icono y severidad */}
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
                <Text
                  className="font-semibold capitalize text-xs"
                  style={{ color: alertColor }}
                >
                  {alert.severity.toUpperCase()}
                </Text>
                <Text className="text-xs text-muted">{alert.radius} km</Text>
              </View>
            </View>
            <MaterialIcons name="info" size={20} color={colors.muted} />
          </View>

          {/* Título de alerta */}
          <Text className="text-base font-bold text-foreground mb-2">
            {alert.event}
          </Text>

          {/* Descripción */}
          <Text
            className="text-sm text-muted mb-3"
            numberOfLines={2}
            style={{ lineHeight: 18 }}
          >
            {alert.description}
          </Text>

          {/* Tiempo */}
          <View className="flex-row items-center gap-2 mb-3">
            <MaterialIcons name="schedule" size={14} color={colors.muted} />
            <Text className="text-xs text-muted">{alert.time}</Text>
          </View>

          {/* Botón de acción */}
          <Pressable
            style={({ pressed }) => ({
              backgroundColor: alertColor,
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 6,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <View className="flex-row items-center justify-center gap-2">
              <MaterialIcons name="map" size={16} color="white" />
              <Text className="text-white text-xs font-semibold">Ver en mapa</Text>
            </View>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <ScreenContainer className="flex-1 gap-0">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Encabezado con ubicación */}
        <View className="px-4 pt-4 pb-3 border-b" style={{ borderBottomColor: colors.border }}>
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="location-on" size={20} color={colors.primary} />
              <Text className="text-xs text-muted font-semibold">UBICACIÓN ACTUAL</Text>
            </View>
            <Pressable
              style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <View className="flex-row items-center gap-1">
                <MaterialIcons name="edit-location" size={16} color={colors.primary} />
                <Text className="text-primary font-semibold text-xs">Cambiar</Text>
              </View>
            </Pressable>
          </View>
          <Text className="text-2xl font-bold text-foreground">
            {DEMO_LOCATION.city}
          </Text>
          <Text className="text-xs text-muted">
            {DEMO_LOCATION.latitude.toFixed(2)}°, {DEMO_LOCATION.longitude.toFixed(2)}°
          </Text>
        </View>

        {/* Estado del clima actual */}
        <View className="px-4 py-3">
          <View className="bg-surface p-4 rounded-xl border" style={{ borderColor: colors.border }}>
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <View className="flex-row items-baseline gap-1 mb-2">
                  <MaterialIcons name="thermostat" size={24} color={colors.primary} />
                  <Text className="text-3xl font-bold text-foreground">
                    {Math.round(DEMO_WEATHER.temp)}°
                  </Text>
                  <Text className="text-sm text-muted">C</Text>
                </View>
                <Text className="text-xs text-muted mb-3">{DEMO_WEATHER.condition}</Text>
                <View className="gap-1">
                  <View className="flex-row items-center gap-2">
                    <MaterialIcons name="opacity" size={14} color={colors.muted} />
                    <Text className="text-xs text-muted">
                      Humedad: {DEMO_WEATHER.humidity}%
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <MaterialIcons name="air" size={14} color={colors.muted} />
                    <Text className="text-xs text-muted">
                      Viento: {Math.round(DEMO_WEATHER.wind_speed)} m/s
                    </Text>
                  </View>
                </View>
              </View>
              <View className="items-center">
                <MaterialIcons name="wb-cloudy" size={60} color={colors.primary} />
              </View>
            </View>
          </View>
        </View>

        {/* Filtro de severidad */}
        <View className="px-4 py-3">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="filter-list" size={18} color={colors.foreground} />
              <Text className="text-sm font-semibold text-foreground">
                Severidad mínima para notificaciones
              </Text>
            </View>
          </View>
          <View className="flex-row gap-2">
            {SEVERITY_LEVELS.map((level) => (
              <Pressable
                key={level.id}
                onPress={() => updateMinSeverity(level.id)}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  borderWidth: 2,
                  borderColor: minSeverity === level.id ? level.color : colors.border,
                  backgroundColor:
                    minSeverity === level.id ? level.color + "20" : colors.surface,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  className="text-xs font-semibold text-center"
                  style={{
                    color: minSeverity === level.id ? level.color : colors.foreground,
                  }}
                >
                  {level.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text className="text-xs text-muted mt-2">
            Recibirás notificaciones de {minSeverity} y superior
          </Text>
        </View>

        {/* Alertas */}
        <View className="px-4 py-4">
          {/* Título de alertas */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="warning" size={20} color={colors.error} />
              <Text className="text-lg font-bold text-foreground">
                Alertas Activas
              </Text>
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
                <Text className="text-white text-xs font-semibold">
                  {filteredAlerts.length}
                </Text>
              </View>
            )}
          </View>

          {/* Lista de alertas */}
          {filteredAlerts.length > 0 ? (
            <View>{filteredAlerts.map(renderAlertCard)}</View>
          ) : (
            <View className="bg-surface p-6 rounded-xl border items-center" style={{ borderColor: colors.border }}>
              <MaterialIcons name="check-circle" size={48} color={colors.success} />
              <Text className="text-base font-semibold text-foreground mt-2">
                Sin alertas
              </Text>
              <Text className="text-xs text-muted text-center mt-1">
                No hay alertas de {minSeverity} o superior en tu zona
              </Text>
            </View>
          )}
        </View>

        {/* Última actualización */}
        <View className="px-4 pb-4">
          <View className="flex-row items-center justify-center gap-1">
            <MaterialIcons name="schedule" size={14} color={colors.muted} />
            <Text className="text-xs text-muted">
              Última actualización: {new Date().toLocaleTimeString("es-ES")}
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
