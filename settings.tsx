/**
 * Settings Screen
 * Pantalla de configuración mejorada con Material Design 3
 */

import { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  Switch,
  TextInput,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useAlertPreferences } from "@/hooks/useAlertPreferences";
import type { AlertSeverity } from "@/shared/types/weather";

const SEVERITY_LEVELS: { id: AlertSeverity; label: string; color: string }[] = [
  { id: "leve", label: "Leve", color: "#FFA500" },
  { id: "moderada", label: "Moderada", color: "#FF6B35" },
  { id: "severa", label: "Fuerte", color: "#EF4444" },
];

export default function SettingsScreen() {
  const colors = useColors();
  const { preferences: settings, updatePreferences, setMinSeverity } = useAlertPreferences();

  const [searchCity, setSearchCity] = useState("");
  const [showCitySearch, setShowCitySearch] = useState(false);

  // Cambiar notificaciones
  const toggleNotifications = () => {
    updatePreferences({ notificationsEnabled: !settings.notificationsEnabled });
  };

  // Cambiar sonido
  const toggleSound = () => {
    updatePreferences({ soundEnabled: !settings.soundEnabled });
  };

  // Cambiar vibración
  const toggleVibration = () => {
    updatePreferences({ vibrationEnabled: !settings.vibrationEnabled });
  };

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
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View className="flex-row items-center justify-between p-3 rounded-lg mb-2" style={{ backgroundColor: colors.surface }}>
        <View className="flex-row items-center gap-3 flex-1">
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.primary + "20",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <MaterialIcons name={icon as any} size={20} color={colors.primary} />
          </View>
          <View className="flex-1">
            <Text className="text-foreground font-semibold text-sm">{title}</Text>
            <Text className="text-muted text-xs">{subtitle}</Text>
          </View>
        </View>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: colors.primary }}
        />
      </View>
    </Pressable>
  );

  return (
    <ScreenContainer className="flex-1 gap-0">
      <ScrollView className="flex-1">
        {/* Encabezado */}
        <View className="px-4 pt-4 pb-3 border-b" style={{ borderBottomColor: colors.border }}>
          <View className="flex-row items-center gap-2">
            <MaterialIcons name="settings" size={24} color={colors.primary} />
            <Text className="text-2xl font-bold text-foreground">Configuración</Text>
          </View>
        </View>

        {/* Sección de Ubicación */}
        <View className="px-4 py-4">
          <View className="flex-row items-center gap-2 mb-3">
            <MaterialIcons name="location-on" size={18} color={colors.foreground} />
            <Text className="text-sm font-semibold text-foreground uppercase">Ubicación</Text>
          </View>

          <Pressable
            onPress={() => setShowCitySearch(!showCitySearch)}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View
              className="p-3 rounded-lg border flex-row items-center justify-between"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
              }}
            >
              <View className="flex-row items-center gap-2 flex-1">
                <MaterialIcons name="edit-location" size={20} color={colors.primary} />
                <View className="flex-1">
                  <Text className="text-foreground font-semibold text-sm">
                    Cambiar Ubicación
                  </Text>
                  <Text className="text-xs text-muted">Buenos Aires, Argentina</Text>
                </View>
              </View>
              <MaterialIcons
                name={showCitySearch ? "expand-less" : "expand-more"}
                size={20}
                color={colors.muted}
              />
            </View>
          </Pressable>

          {showCitySearch && (
            <View className="mt-3 gap-2">
              <TextInput
                placeholder="Buscar ciudad..."
                placeholderTextColor={colors.muted}
                value={searchCity}
                onChangeText={setSearchCity}
                style={{
                  backgroundColor: colors.surface,
                  color: colors.foreground,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 14,
                }}
              />
              <Pressable
                style={({ pressed }) => ({
                  backgroundColor: colors.primary,
                  padding: 12,
                  borderRadius: 8,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <View className="flex-row items-center justify-center gap-2">
                  <MaterialIcons name="search" size={18} color="white" />
                  <Text className="text-white font-semibold">Buscar</Text>
                </View>
              </Pressable>
            </View>
          )}
        </View>

        {/* Sección de Notificaciones */}
        <View className="px-4 py-4">
          <View className="flex-row items-center gap-2 mb-3">
            <MaterialIcons name="notifications" size={18} color={colors.foreground} />
            <Text className="text-sm font-semibold text-foreground uppercase">Notificaciones</Text>
          </View>

          <SettingRow
            icon="notifications-active"
            title="Notificaciones"
            subtitle="Recibir alertas de clima"
            value={settings.notificationsEnabled}
            onToggle={toggleNotifications}
          />

          <SettingRow
            icon="volume-up"
            title="Sonido"
            subtitle="Reproducir sonido de alerta"
            value={settings.soundEnabled && settings.notificationsEnabled}
            onToggle={toggleSound}
          />

          <SettingRow
            icon="vibration"
            title="Vibración"
            subtitle="Vibración en alertas"
            value={settings.vibrationEnabled && settings.notificationsEnabled}
            onToggle={toggleVibration}
          />
        </View>

        {/* Sección de Actualización */}
        <View className="px-4 py-4">
          <View className="flex-row items-center gap-2 mb-3">
            <MaterialIcons name="schedule" size={18} color={colors.foreground} />
            <Text className="text-sm font-semibold text-foreground uppercase">Actualización</Text>
          </View>

          <View className="bg-surface p-4 rounded-lg border" style={{ borderColor: colors.border }}>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-foreground font-semibold">Intervalo de Actualización</Text>
              <View
                style={{
                  backgroundColor: colors.primary,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                }}
              >
                <Text className="text-white text-sm font-bold">
                  {settings.updateIntervalMinutes} min
                </Text>
              </View>
            </View>

            <View className="flex-row gap-2">
              {[5, 10, 15, 30].map((interval) => (
                <Pressable
                  key={interval}
                  onPress={() => updatePreferences({ updateIntervalMinutes: interval })}
                  style={({ pressed }) => ({
                    flex: 1,
                    backgroundColor:
                      settings.updateIntervalMinutes === interval
                        ? colors.primary
                        : colors.border,
                    paddingVertical: 8,
                    borderRadius: 6,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text
                    className="text-center font-semibold text-xs"
                    style={{
                      color:
                        settings.updateIntervalMinutes === interval
                          ? "white"
                          : colors.foreground,
                    }}
                  >
                    {interval}m
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text className="text-xs text-muted mt-3">
              La app actualizará las alertas cada {settings.updateIntervalMinutes} minutos
            </Text>
          </View>
        </View>

        {/* Sección de Severidad mínima */}
        <View className="px-4 py-4">
          <View className="flex-row items-center gap-2 mb-3">
            <MaterialIcons name="filter-list" size={18} color={colors.foreground} />
            <Text className="text-sm font-semibold text-foreground uppercase">
              Severidad mínima
            </Text>
          </View>

          <View className="bg-surface p-4 rounded-lg border" style={{ borderColor: colors.border }}>
            <View className="flex-row gap-2">
              {SEVERITY_LEVELS.map((level) => {
                const isActive = settings.minSeverity === level.id;
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
            <Text className="text-xs text-muted mt-3">
              Vas a recibir alertas de {settings.minSeverity === "severa" ? "fuerte" : settings.minSeverity} en adelante. Este ajuste es el mismo en Inicio, Mapa y notificaciones.
            </Text>
          </View>
        </View>

        {/* Sección de Información */}
        <View className="px-4 py-4">
          <View className="flex-row items-center gap-2 mb-3">
            <MaterialIcons name="info" size={18} color={colors.foreground} />
            <Text className="text-sm font-semibold text-foreground uppercase">Información</Text>
          </View>

          <View className="bg-surface p-4 rounded-lg border gap-3" style={{ borderColor: colors.border }}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="info" size={16} color={colors.muted} />
                <Text className="text-muted text-sm">Versión</Text>
              </View>
              <Text className="text-foreground font-semibold text-sm">1.0.0</Text>
            </View>

            <View className="h-px" style={{ backgroundColor: colors.border }} />

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="cloud" size={16} color={colors.muted} />
                <Text className="text-muted text-sm">Fuente de Datos</Text>
              </View>
              <Text className="text-foreground font-semibold text-sm">Open-Meteo</Text>
            </View>

            <View className="h-px" style={{ backgroundColor: colors.border }} />

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="developer-mode" size={16} color={colors.muted} />
                <Text className="text-muted text-sm">Desarrollador</Text>
              </View>
              <Text className="text-foreground font-semibold text-sm">Tormentar</Text>
            </View>
          </View>
        </View>

        {/* Botón de ayuda */}
        <View className="px-4 py-4">
          <Pressable
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View className="bg-primary p-4 rounded-lg flex-row items-center justify-center gap-2">
              <MaterialIcons name="help" size={20} color="white" />
              <Text className="text-white font-semibold">Necesitas ayuda?</Text>
            </View>
          </Pressable>
        </View>

        {/* Espaciador */}
        <View className="h-8" />
      </ScrollView>
    </ScreenContainer>
  );
}
