/**
 * Settings Screen
 * Pantalla de configuracion. Ahora usa useAlertPreferences: la MISMA
 * fuente de datos que Inicio y Mapa, en vez de un estado local propio
 * guardado bajo una clave distinta ("tormentar_settings") que quedaba
 * desincronizada del resto de la app.
 */
import { useState } from "react";
import { ScrollView, Text, View, Pressable, Switch, TextInput, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAlertPreferences } from "@/hooks/useAlertPreferences";
import { useLocation } from "@/hooks/useLocation";
import { useAlertsContext } from "@/lib/alerts-context";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { searchCities, type CitySearchResult } from "@/lib/services/geocodingService";
import type { AlertSeverity } from "@/shared/types/weather";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const SEVERITY_LEVELS: { id: AlertSeverity; label: string; color: string }[] = [
  { id: "leve", label: "Leve", color: "#FFA500" },
  { id: "moderada", label: "Moderada", color: "#FF6B35" },
  { id: "severa", label: "Fuerte", color: "#EF4444" },
];

export default function SettingsScreen() {
  const colors = useColors();
  const { preferences, updatePreferences, setMinSeverity } = useAlertPreferences();
  const { location, loading: locationLoading, error: locationError, getCurrentLocation, setManualLocation } =
    useLocation();
  const { pushTestAlert } = useAlertsContext();
  const {
    supported: pushSupported,
    enabled: pushEnabled,
    loading: pushLoading,
    error: pushError,
    enablePush,
    disablePush,
  } = usePushNotifications();

  const [searchCity, setSearchCity] = useState("");
  const [showCitySearch, setShowCitySearch] = useState(false);
  const [searchResults, setSearchResults] = useState<CitySearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | undefined>(undefined);

  const handleSearchCity = async () => {
    if (searchCity.trim().length < 2) return;
    setSearching(true);
    setSearchError(undefined);
    try {
      const results = await searchCities(searchCity);
      setSearchResults(results);
      if (results.length === 0) {
        setSearchError("No se encontraron ciudades con ese nombre.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error buscando la ciudad";
      setSearchError(message);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectCity = async (city: CitySearchResult) => {
    await setManualLocation(city.latitude, city.longitude);
    setSearchResults([]);
    setSearchCity("");
    setShowCitySearch(false);
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
            <Text className="text-2xl font-bold text-foreground">Configuracion</Text>
          </View>
        </View>

        {/* Sección de Ubicación */}
        <View className="px-4 py-4">
          <View className="flex-row items-center gap-2 mb-3">
            <MaterialIcons name="location-on" size={18} color={colors.foreground} />
            <Text className="text-sm font-semibold text-foreground uppercase">Ubicacion</Text>
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
                    Cambiar Ubicacion
                  </Text>
                  <Text className="text-xs text-muted">
                    {location?.city ?? "Sin ubicacion configurada"}
                  </Text>
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
              <View className="flex-row gap-2">
                <TextInput
                  placeholder="Buscar ciudad..."
                  placeholderTextColor={colors.muted}
                  value={searchCity}
                  onChangeText={setSearchCity}
                  onSubmitEditing={handleSearchCity}
                  returnKeyType="search"
                  style={{
                    flex: 1,
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
                  onPress={handleSearchCity}
                  disabled={searching || searchCity.trim().length < 2}
                  style={({ pressed }) => ({
                    backgroundColor: colors.primary,
                    borderRadius: 8,
                    paddingHorizontal: 16,
                    justifyContent: "center",
                    opacity: pressed || searching || searchCity.trim().length < 2 ? 0.6 : 1,
                  })}
                >
                  {searching ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <MaterialIcons name="search" size={20} color="white" />
                  )}
                </Pressable>
              </View>

              {searchError && <Text className="text-xs" style={{ color: colors.error }}>{searchError}</Text>}

              {searchResults.length > 0 && (
                <View className="gap-1">
                  {searchResults.map((city) => (
                    <Pressable
                      key={city.id}
                      onPress={() => handleSelectCity(city)}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <View
                        className="p-3 rounded-lg border flex-row items-center gap-2"
                        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                      >
                        <MaterialIcons name="place" size={18} color={colors.primary} />
                        <Text className="text-sm text-foreground flex-1">
                          {city.name}
                          {city.admin1 ? `, ${city.admin1}` : ""}
                          {city.country ? ` - ${city.country}` : ""}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}

              <View className="h-px my-1" style={{ backgroundColor: colors.border }} />

              <Pressable
                onPress={getCurrentLocation}
                disabled={locationLoading}
                style={({ pressed }) => ({
                  opacity: pressed || locationLoading ? 0.7 : 1,
                })}
              >
                <View
                  className="p-3 rounded-lg border flex-row items-center gap-2"
                  style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                >
                  {locationLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <MaterialIcons name="my-location" size={18} color={colors.primary} />
                  )}
                  <Text className="text-sm font-semibold text-foreground">
                    {locationLoading ? "Obteniendo ubicacion..." : "Usar mi ubicacion actual"}
                  </Text>
                </View>
              </Pressable>

              {locationError && (
                <Text className="text-xs" style={{ color: colors.error }}>
                  {locationError}
                </Text>
              )}
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
            value={preferences.notificationsEnabled}
            onToggle={() => updatePreferences({ notificationsEnabled: !preferences.notificationsEnabled })}
          />

          {pushSupported && (
            <SettingRow
              icon="phone-iphone"
              title="Notificaciones push"
              subtitle="Recibilas en el celular aunque el navegador este cerrado"
              value={pushEnabled}
              onToggle={() => (pushEnabled ? disablePush() : enablePush())}
            />
          )}

          {pushLoading && (
            <Text className="text-xs text-muted mb-2">Configurando notificaciones push...</Text>
          )}

          {pushError && (
            <Text className="text-xs mb-2" style={{ color: colors.error }}>
              {pushError}
            </Text>
          )}

          <SettingRow
            icon="volume-up"
            title="Sonido"
            subtitle="Reproducir sonido de alerta"
            value={preferences.soundEnabled && preferences.notificationsEnabled}
            onToggle={() => updatePreferences({ soundEnabled: !preferences.soundEnabled })}
          />

          <SettingRow
            icon="vibration"
            title="Vibracion"
            subtitle="Vibracion en alertas"
            value={preferences.vibrationEnabled && preferences.notificationsEnabled}
            onToggle={() => updatePreferences({ vibrationEnabled: !preferences.vibrationEnabled })}
          />
        </View>

        {/* Sección de Sensibilidad (unica en toda la app) */}
        <View className="px-4 py-4">
          <View className="flex-row items-center gap-2 mb-3">
            <MaterialIcons name="tune" size={18} color={colors.foreground} />
            <Text className="text-sm font-semibold text-foreground uppercase">
              Sensibilidad de alertas
            </Text>
          </View>

          <View className="bg-surface p-4 rounded-lg border" style={{ borderColor: colors.border }}>
            <Text className="text-xs text-muted mb-3">
              Elegi la severidad minima que queres recibir: vas a recibir esa y todo lo que sea
              igual o mas grave. Este ajuste es unico para toda la app: se aplica en Inicio,
              Mapa y en las notificaciones push.
            </Text>
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
                      borderRadius: 8,
                      borderWidth: 2,
                      borderColor: isActive ? level.color : colors.border,
                      backgroundColor: isActive ? level.color + "20" : colors.background,
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
          </View>
        </View>

        {/* Sección de Actualización */}
        <View className="px-4 py-4">
          <View className="flex-row items-center gap-2 mb-3">
            <MaterialIcons name="schedule" size={18} color={colors.foreground} />
            <Text className="text-sm font-semibold text-foreground uppercase">Actualizacion</Text>
          </View>

          <View className="bg-surface p-4 rounded-lg border" style={{ borderColor: colors.border }}>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-foreground font-semibold">Intervalo de Actualizacion</Text>
              <View
                style={{
                  backgroundColor: colors.primary,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                }}
              >
                <Text className="text-white text-sm font-bold">
                  {preferences.updateIntervalMinutes} min
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
                      preferences.updateIntervalMinutes === interval ? colors.primary : colors.border,
                    paddingVertical: 8,
                    borderRadius: 6,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text
                    className="text-center font-semibold text-xs"
                    style={{
                      color: preferences.updateIntervalMinutes === interval ? "white" : colors.foreground,
                    }}
                  >
                    {interval}m
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text className="text-xs text-muted mt-3">
              La app actualizara las alertas cada {preferences.updateIntervalMinutes} minutos
            </Text>
          </View>
        </View>

        {/* Sección de Prueba de Alertas (temporal, para testing) */}
        <View className="px-4 py-4">
          <View className="flex-row items-center gap-2 mb-3">
            <MaterialIcons name="bug-report" size={18} color={colors.foreground} />
            <Text className="text-sm font-semibold text-foreground uppercase">
              Probar alertas (no reales)
            </Text>
          </View>

          <View className="bg-surface p-4 rounded-lg border" style={{ borderColor: colors.border }}>
            <Text className="text-xs text-muted mb-3">
              Dispara un popup de alerta falso para probar sonido, boton de cerrar y tiempo en
              pantalla, sin esperar clima real.
            </Text>
            <View className="flex-row gap-2">
              {SEVERITY_LEVELS.map((level) => (
                <Pressable
                  key={level.id}
                  onPress={() => pushTestAlert(level.id)}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: level.color,
                    backgroundColor: level.color + "15",
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text
                    className="text-xs font-semibold text-center"
                    style={{ color: level.color }}
                  >
                    {level.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Sección de Información */}
        <View className="px-4 py-4">
          <View className="flex-row items-center gap-2 mb-3">
            <MaterialIcons name="info" size={18} color={colors.foreground} />
            <Text className="text-sm font-semibold text-foreground uppercase">Informacion</Text>
          </View>

          <View className="bg-surface p-4 rounded-lg border gap-3" style={{ borderColor: colors.border }}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="info" size={16} color={colors.muted} />
                <Text className="text-muted text-sm">Version</Text>
              </View>
              <Text className="text-foreground font-semibold text-sm">1.0.0</Text>
            </View>

            <View className="h-px" style={{ backgroundColor: colors.border }} />

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="cloud" size={16} color={colors.muted} />
                <Text className="text-muted text-sm">Fuente de Datos</Text>
              </View>
              <Text className="text-foreground font-semibold text-sm">OpenWeatherMap</Text>
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

        {/* Espaciador */}
        <View className="h-8" />
      </ScrollView>
    </ScreenContainer>
  );
}
