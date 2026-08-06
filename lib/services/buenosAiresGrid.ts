/**
 * Grilla de la Provincia de Buenos Aires.
 * Genera una malla fija de puntos (lat/lon) que cubre aproximadamente
 * todo el territorio de la provincia, para poder consultar el
 * pronostico gratuito de OpenWeatherMap en cada punto y estimar donde
 * hay alertas NO OFICIALES sin que el usuario tenga que buscar
 * localidad por localidad.
 */

// Bounding box aproximado de la Provincia de Buenos Aires.
export const BUENOS_AIRES_BBOX = {
  minLat: -41.05,
  maxLat: -33.25,
  minLon: -63.4,
  maxLon: -56.5,
};

export interface GridPoint {
  id: string;
  latitude: number;
  longitude: number;
}

// Espaciado en grados entre puntos de la grilla. ~1 grado de latitud son
// ~111km. OJO: cada punto de la grilla implica una llamada a la API de
// OpenWeatherMap por cada actualizacion, y el plan gratuito tiene un
// limite diario (tipicamente 1.000 llamadas/dia). Con 2.5 grados de
// espaciado, la provincia queda cubierta por unos 12 puntos en vez de
// 50-60, lo que a una actualizacion cada 30 minutos (ver
// REGION_REFRESH_INTERVAL_MS en useRegionAlerts.ts) da ~576 llamadas/dia
// solo para esta grilla, dejando margen para el resto de la app.
// Si tenes un plan pago con mas cupo, podes bajar este numero para mas
// resolucion (ej: 1.5 da ~30 puntos).
export const GRID_SPACING_DEG = 2.5;

// Radio aproximado, en km, de cada celda de la grilla (mitad del
// espaciado). Se usa para dibujar el circulo de cada celda con alerta:
// al ser igual a la mitad de la distancia entre puntos vecinos, las
// celdas contiguas con alerta quedan "pegadas" en el mapa y se ve como
// una zona continua resaltada en vez de puntos sueltos.
export const GRID_CELL_RADIUS_KM = (GRID_SPACING_DEG * 111) / 2;

export function buildBuenosAiresGrid(spacingDeg: number = GRID_SPACING_DEG): GridPoint[] {
  const points: GridPoint[] = [];
  for (let lat = BUENOS_AIRES_BBOX.minLat; lat <= BUENOS_AIRES_BBOX.maxLat; lat += spacingDeg) {
    for (let lon = BUENOS_AIRES_BBOX.minLon; lon <= BUENOS_AIRES_BBOX.maxLon; lon += spacingDeg) {
      points.push({
        id: `${lat.toFixed(2)}:${lon.toFixed(2)}`,
        latitude: Number(lat.toFixed(4)),
        longitude: Number(lon.toFixed(4)),
      });
    }
  }
  return points;
}
