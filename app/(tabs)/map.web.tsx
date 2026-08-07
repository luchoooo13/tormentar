/**
 * Map Screen - Weather Alert Map (WEB)
 * Version especifica para web (Metro elige este archivo por la
 * extension .web.tsx en vez de map.tsx cuando se compila para
 * navegador).
 *
 * expo-maps (mapas nativos de iOS/Android) NO funciona en web, por
 * lo que antes esta pantalla mostraba solo una caja gris de
 * "Mapa interactivo" como placeholder y nunca se completo. Ahora
 * se dibuja un mapa real con Leaflet + OpenStreetMap (no requiere
 * API key ni configuracion adicional) cargado dinamicamente desde
 * un CDN, con un marcador para la ubicacion del usuario y un
 * circulo por cada alerta (coloreado por severidad, con radio real
 * en km) que al tocarlo muestra el detalle.
 */
import { ScrollView, Text, View, Pressable } from "react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAlertsContext } from "@/lib/alerts-context";
import { useRegionAlerts, type RegionPoint } from "@/hooks/useRegionAlerts";
import { formatAlertTime } from "@/lib/services/weatherService";
import { buildBuenosAiresGrid, BUENOS_AIRES_BBOX } from "@/lib/services/buenosAiresGrid";
import { SEVERITY_COLORS, SEVERITY_ICONS, SEVERITY_LABELS } from "@/shared/alertSeverity";
import type { WeatherAlert } from "@/shared/types/weather";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

let leafletLoadPromise: Promise<any> | null = null;

// Carga Leaflet una sola vez desde CDN (no requiere instalar paquetes npm nuevos).
function loadLeaflet(): Promise<any> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if ((window as any).L) return Promise.resolve((window as any).L);
  if (leafletLoadPromise) return leafletLoadPromise;

  leafletLoadPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS_URL}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS_URL;
      document.head.appendChild(link);
    }

    const script = document.createElement("script");
    script.src = LEAFLET_JS_URL;
    script.async = true;
    script.onload = () => resolve((window as any).L);
    script.onerror = () => reject(new Error("No se pudo cargar el mapa (Leaflet)"));
    document.body.appendChild(script);
  });

  return leafletLoadPromise;
}

export default function MapScreen() {
  const colors = useColors();
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);
  const { location, filteredAlerts, hasApiKey, error } = useAlertsContext();
  const {
    regionAlerts,
    regionPoints,
    regionLoading,
    regionError,
    regionProgress,
    refreshRegion,
    gridSpacingDeg,
  } = useRegionAlerts();

  const mapContainerRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const layersRef = useRef<any[]>([]);
  const [mapError, setMapError] = useState<string | undefined>(undefined);
  const [mapReady, setMapReady] = useState(false);

  // Cuantas veces se subdivide cada celda original de la grilla (la que
  // efectivamente se consulta contra la API) para dibujar el mosaico.
  // Con el espaciado default de 2.5 grados, 5 subdivisiones dan
  // cuadraditos de 0.5 grados (~55km): bastante mas fieles al contorno
  // real que un unico rectangulo de 2.5 grados por punto, sin pedir NI
  // una consulta extra a la API (se sigue usando el mismo puñado de
  // puntos ya consultados; solo se reparte el territorio entre ellos
  // de forma mas fina).
  const MOSAIC_SUBDIVISIONS = 5;

  // Sub-grilla fina fija: no depende de los datos, solo del espaciado,
  // asi que se calcula una sola vez.
  const mosaicGrid = useMemo(
    () => buildBuenosAiresGrid(gridSpacingDeg / MOSAIC_SUBDIVISIONS),
    [gridSpacingDeg]
  );
  const mosaicCellSizeDeg = gridSpacingDeg / MOSAIC_SUBDIVISIONS;

  // Inicializar el mapa una sola vez.
  useEffect(() => {
    let cancelled = false;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !L || !mapContainerRef.current || mapInstanceRef.current) return;

        const map = L.map(mapContainerRef.current).setView([-34.6, -58.4], 10);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;
        setMapReady(true);
      })
      .catch((err) => {
        if (!cancelled) setMapError(err.message ?? "No se pudo cargar el mapa");
      });

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Centrar el mapa en la ubicacion del usuario cuando este disponible.
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    if (typeof location?.latitude !== "number" || typeof location?.longitude !== "number") return;

    const L = (window as any).L;
    const map = mapInstanceRef.current;
    map.setView([location.latitude, location.longitude], 11);

    // Pane propio para el marcador del usuario, por encima del pane de
    // overlays (donde viven los circulos de alertas, z-index 400). Asi
    // el marcador queda SIEMPRE visible por encima de cualquier circulo
    // de alerta, sin importar el orden en que se agreguen al mapa.
    if (!map.getPane("userMarkerPane")) {
      map.createPane("userMarkerPane");
      map.getPane("userMarkerPane").style.zIndex = "650";
    }

    const userIcon = L.divIcon({
      className: "",
      html: `<div style="width:18px;height:18px;border-radius:50%;background:${colors.primary};border:3px solid white;box-shadow:0 0 0 2px ${colors.primary}, 0 1px 6px rgba(0,0,0,0.5)"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    const userMarker = L.marker([location.latitude, location.longitude], {
      icon: userIcon,
      pane: "userMarkerPane",
      zIndexOffset: 1000,
    })
      .addTo(map)
      .bindPopup("Tu ubicacion");

    layersRef.current.push(userMarker);

    return () => {
      userMarker.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, location?.latitude, location?.longitude]);

  // Dibujar un circulo por cada alerta.
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    const L = (window as any).L;
    const map = mapInstanceRef.current;

    const circles: any[] = [];

    filteredAlerts.forEach((alert: WeatherAlert) => {
      if (typeof alert.latitude !== "number" || typeof alert.longitude !== "number") return;

      const color = SEVERITY_COLORS[alert.severity];
      const circle = L.circle([alert.latitude, alert.longitude], {
        radius: (alert.radius ?? 10) * 1000,
        color,
        fillColor: color,
        fillOpacity: 0.25,
        weight: 2,
      }).addTo(map);

      circle.bindPopup(
        `<b>${alert.event}</b><br/>${SEVERITY_LABELS[alert.severity]} - Radio ${alert.radius ?? 10} km`
      );
      circle.on("click", () => setSelectedAlert((prev) => (prev === alert.id ? null : alert.id)));

      circles.push(circle);
    });

    return () => {
      circles.forEach((c) => c.remove());
    };
  }, [mapReady, filteredAlerts]);

  // Dibujar el mosaico de la Provincia de Buenos Aires: en vez de UN
  // rectangulo grande por cada punto de grilla con alerta, se subdivide
  // el territorio en cuadraditos mas chicos (mosaicGrid) y a CADA UNO
  // se le asigna la severidad del punto de grilla real mas cercano
  // (vecino mas proximo). Como regionPoints incluye tambien los puntos
  // SIN alerta (severity: null), los cuadraditos que caen mas cerca de
  // una localidad despejada quedan afuera del area resaltada — se "les
  // saca el cuadrado" — mientras que los que caen mas cerca de un punto
  // con alerta se pintan — se "les agrega el cuadrado" — logrando un
  // contorno bastante mas fiel a donde esta realmente la alerta que un
  // unico rectangulo gigante. No implica ninguna consulta extra a la
  // API: se reparte el mismo puñado de puntos ya pedidos.
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    if (regionPoints.length === 0) return;
    const L = (window as any).L;
    const map = mapInstanceRef.current;

    const layers: any[] = [];
    const halfCell = mosaicCellSizeDeg / 2;

    // Correccion aproximada por latitud: a -35/-40 grados, un grado de
    // longitud mide bastante menos en km que un grado de latitud. Sin
    // esto, el vecino mas cercano se calcularia mal cerca de los bordes
    // este/oeste de la provincia.
    const midLat = (BUENOS_AIRES_BBOX.minLat + BUENOS_AIRES_BBOX.maxLat) / 2;
    const lonScale = Math.cos((midLat * Math.PI) / 180);

    const nearestPoint = (lat: number, lon: number): RegionPoint => {
      let best = regionPoints[0];
      let bestDist = Infinity;
      for (const p of regionPoints) {
        const dLat = lat - p.latitude;
        const dLon = (lon - p.longitude) * lonScale;
        const dist = dLat * dLat + dLon * dLon;
        if (dist < bestDist) {
          bestDist = dist;
          best = p;
        }
      }
      return best;
    };

    mosaicGrid.forEach((cell) => {
      const nearest = nearestPoint(cell.latitude, cell.longitude);
      if (!nearest.severity) return; // localidad despejada: no se dibuja nada aca.

      const color = SEVERITY_COLORS[nearest.severity];
      const bounds: [[number, number], [number, number]] = [
        [cell.latitude - halfCell, cell.longitude - halfCell],
        [cell.latitude + halfCell, cell.longitude + halfCell],
      ];
      const tile = L.rectangle(bounds, {
        color,
        fillColor: color,
        fillOpacity: 0.3,
        stroke: false,
      }).addTo(map);

      const label = nearest.alert?.event ?? SEVERITY_LABELS[nearest.severity];
      tile.bindPopup(
        `<b>${label}</b><br/>${SEVERITY_LABELS[nearest.severity]} (no oficial, estimado por zona)`
      );
      layers.push(tile);
    });

    return () => {
      layers.forEach((l) => l.remove());
    };
  }, [mapReady, regionPoints, mosaicGrid, mosaicCellSizeDeg]);

  // Resaltar/centrar la alerta seleccionada desde la lista.
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !selectedAlert) return;
    const alert = filteredAlerts.find((a) => a.id === selectedAlert);
    if (alert && typeof alert.latitude === "number" && typeof alert.longitude === "number") {
      mapInstanceRef.current.setView([alert.latitude, alert.longitude], 12);
    }
  }, [selectedAlert, mapReady, filteredAlerts]);

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

        {/* Mapa real (Leaflet) */}
        <View className="px-4 py-4">
          <View
            className="w-full rounded-xl border-2 overflow-hidden"
            style={{
              height: 320,
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }}
          >
            {/* @ts-ignore - div nativo del DOM, valido en web */}
            <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />

            {!mapReady && !mapError && (
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                pointerEvents="none"
              >
                <MaterialIcons name="map" size={48} color={colors.muted} />
                <Text className="text-muted text-sm mt-2">Cargando mapa...</Text>
              </View>
            )}
          </View>

          {mapError && (
            <View className="mt-2 p-3 rounded-lg border" style={{ borderColor: colors.error, backgroundColor: colors.surface }}>
              <Text className="text-xs" style={{ color: colors.error }}>{mapError}</Text>
            </View>
          )}

          {!location && !mapError && (
            <Text className="text-xs text-muted mt-2">
              Activa el permiso de ubicacion del navegador (o cargala manualmente en
              Configuracion) para centrar el mapa en tu zona.
            </Text>
          )}
        </View>

        {/* Alertas no oficiales de toda la Provincia de Buenos Aires */}
        <View className="px-4 pb-4">
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="grain" size={20} color="#9333EA" />
              <Text className="text-lg font-bold text-foreground">
                Alertas no oficiales · Provincia de Buenos Aires
              </Text>
            </View>
            <Pressable onPress={refreshRegion} hitSlop={8}>
              <MaterialIcons name="refresh" size={18} color={colors.muted} />
            </Pressable>
          </View>
          <Text className="text-xs text-muted mb-3">
            Barrido automatico de toda la provincia (no hace falta buscar ciudad por ciudad),
            actualizado cada 30 minutos para cuidar el cupo de la API gratuita. Se estima a partir
            del pronostico de OpenWeatherMap: las zonas resaltadas en el mapa, en su color de
            severidad, muestran donde hay alertas estimadas.
          </Text>

          {regionLoading && (
            <Text className="text-xs text-muted mb-2">
              Consultando la provincia... {regionProgress.done}/{regionProgress.total}
            </Text>
          )}

          {regionError && (
            <View className="p-3 rounded-lg border mb-2" style={{ borderColor: colors.error, backgroundColor: colors.surface }}>
              <Text className="text-xs" style={{ color: colors.error }}>{regionError}</Text>
            </View>
          )}

          {!regionLoading && regionAlerts.length === 0 && !regionError ? (
            <Text className="text-xs text-muted">
              No se detectaron alertas estimadas en la provincia por ahora.
            </Text>
          ) : (
            <View className="gap-2">
              {(["severa", "moderada", "leve"] as const)
                .filter((sev) => regionAlerts.some((a) => a.severity === sev))
                .map((sev) => {
                  const count = regionAlerts.filter((a) => a.severity === sev).length;
                  return (
                    <View
                      key={sev}
                      className="flex-row items-center gap-3 p-3 rounded-lg"
                      style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
                    >
                      <View
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: SEVERITY_COLORS[sev],
                        }}
                      />
                      <Text className="text-sm font-semibold" style={{ color: SEVERITY_COLORS[sev] }}>
                        {SEVERITY_LABELS[sev]}
                      </Text>
                      <Text className="text-xs text-muted">
                        {count} {count === 1 ? "zona" : "zonas"} en la provincia
                      </Text>
                    </View>
                  );
                })}
            </View>
          )}
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
                      {typeof alert.latitude === "number" ? alert.latitude.toFixed(2) : "--"}°,{" "}
                      {typeof alert.longitude === "number" ? alert.longitude.toFixed(2) : "--"}°
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
