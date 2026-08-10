const http = require('http');
const fs = require('fs');
const path = require('path');
const webpush = require('web-push');

const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, 'dist');
const DATA_DIR = __dirname;
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'subscriptions.json');
const VAPID_KEYS_FILE = path.join(DATA_DIR, 'vapid-keys.json');

// ========== OPEN-METEO ==========
// Mismo proveedor que ya usa la capa Expo/RN (weatherService.ts): gratis,
// sin API key y sin límite de rate. Se pide en UNA sola llamada el clima
// actual de las 26 zonas a la vez (lat/lon separados por coma), en vez de
// 26 llamadas individuales.
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

// Mapea el código WMO de Open-Meteo al código de condición "estilo
// OpenWeatherMap" que ya interpreta classifyCondition() (igual que
// mapWeatherCode() en weatherService.ts, para no duplicar la lógica de
// severidad en dos formatos distintos).
function mapWeatherCode(wmo) {
  const map = {
    0: 800, 1: 801, 2: 802, 3: 804,
    45: 741, 48: 741,
    51: 500, 53: 501, 55: 502, 56: 511, 57: 511,
    61: 500, 63: 501, 65: 502, 66: 511, 67: 511,
    71: 601, 73: 602, 75: 602, 77: 611,
    80: 520, 81: 521, 82: 522,
    85: 621, 86: 622,
    95: 211, 96: 212, 99: 212,
  };
  return map[wmo] ?? 800;
}

// Mismas 26 zonas AMBA que dibuja el mapa en dist/index.html. Si se agrega
// o saca una zona ahí, conviene reflejarlo también acá.
const zonasAmaba = [
  { name: 'Buenos Aires (CABA)', lat: -34.60, lng: -58.38 },
  { name: 'La Plata', lat: -34.92, lng: -57.95 },
  { name: 'Quilmes', lat: -34.73, lng: -58.25 },
  { name: 'San Isidro', lat: -34.47, lng: -58.53 },
  { name: 'Tigre', lat: -34.42, lng: -58.58 },
  { name: 'Morón', lat: -34.65, lng: -58.62 },
  { name: 'Avellaneda', lat: -34.66, lng: -58.37 },
  { name: 'Lanús', lat: -34.70, lng: -58.39 },
  { name: 'San Martín', lat: -34.57, lng: -58.54 },
  { name: 'Vicente López', lat: -34.53, lng: -58.49 },
  { name: 'Lomas de Zamora', lat: -34.76, lng: -58.40 },
  { name: 'San Fernando', lat: -34.44, lng: -58.56 },
  { name: 'Berazategui', lat: -34.76, lng: -58.21 },
  { name: 'Almirante Brown', lat: -34.81, lng: -58.39 },
  { name: 'Esteban Echeverría', lat: -34.82, lng: -58.46 },
  { name: 'Florencio Varela', lat: -34.79, lng: -58.28 },
  { name: 'Escobar', lat: -34.35, lng: -58.79 },
  { name: 'Pilar', lat: -34.46, lng: -58.91 },
  { name: 'Malvinas Argentinas', lat: -34.46, lng: -58.69 },
  { name: 'José C. Paz', lat: -34.53, lng: -58.76 },
  { name: 'Hurlingham', lat: -34.59, lng: -58.63 },
  { name: 'Ituzaingó', lat: -34.65, lng: -58.67 },
  { name: 'Merlo', lat: -34.66, lng: -58.73 },
  { name: 'Moreno', lat: -34.65, lng: -58.79 },
  { name: 'Tres de Febrero', lat: -34.60, lng: -58.57 },
  { name: 'San Miguel', lat: -34.54, lng: -58.71 },
];

// Misma clasificación que classifyCondition() en dist/index.html.
function classifyCondition(weatherId, windSpeed) {
  if (windSpeed >= 17) return 'severa';
  if (windSpeed >= 10.8) return 'moderada';
  if ([202, 212, 232].includes(weatherId)) return 'severa';
  if (weatherId >= 200 && weatherId <= 232) return 'moderada';
  if (weatherId === 781 || weatherId === 771) return 'severa';
  if ([503, 504].includes(weatherId)) return 'severa';
  if ([502, 511, 522, 531].includes(weatherId)) return 'moderada';
  if ([500, 501, 520, 521].includes(weatherId)) return 'leve';
  if ([602, 622].includes(weatherId)) return 'moderada';
  if ([601, 611, 612, 613, 615, 616, 621].includes(weatherId)) return 'leve';
  return null;
}

const SEVERITY_TITLES = {
  leve: 'Condición leve',
  moderada: 'ALERTA MODERADA',
  severa: 'ALERTA SEVERA',
};

// ========== VAPID KEYS ==========
// Se pueden fijar por variable de entorno (recomendado, así sobreviven a
// los redeploys). Si no están, se generan una vez y se guardan en un
// archivo local; ojo que en Render sin disco persistente ese archivo se
// pierde en cada deploy y los navegadores van a tener que volver a
// suscribirse.
function loadOrCreateVapidKeys() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
    };
  }

  try {
    const saved = JSON.parse(fs.readFileSync(VAPID_KEYS_FILE, 'utf8'));
    if (saved.publicKey && saved.privateKey) return saved;
  } catch (e) {
    // No existe todavía, se genera abajo.
  }

  const keys = webpush.generateVAPIDKeys();
  try {
    fs.writeFileSync(VAPID_KEYS_FILE, JSON.stringify(keys, null, 2));
  } catch (e) {
    console.warn('[Push] No se pudieron guardar las VAPID keys en disco:', e.message);
  }
  console.log('[Push] Generé VAPID keys nuevas. Para que no cambien en cada deploy,');
  console.log('[Push] convendría copiarlas como variables de entorno en Render:');
  console.log('[Push] VAPID_PUBLIC_KEY=' + keys.publicKey);
  console.log('[Push] VAPID_PRIVATE_KEY=' + keys.privateKey);
  return keys;
}

const vapidKeys = loadOrCreateVapidKeys();
webpush.setVapidDetails('mailto:tormentar@example.com', vapidKeys.publicKey, vapidKeys.privateKey);

// ========== SUSCRIPCIONES ==========
function loadSubscriptions() {
  try {
    return JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function saveSubscriptions(subs) {
  try {
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subs, null, 2));
  } catch (e) {
    console.warn('[Push] No se pudieron guardar las suscripciones:', e.message);
  }
}

let subscriptions = loadSubscriptions();

function addSubscription(sub) {
  subscriptions = subscriptions.filter((s) => s.endpoint !== sub.endpoint);
  subscriptions.push(sub);
  saveSubscriptions(subscriptions);
}

function removeSubscription(endpoint) {
  subscriptions = subscriptions.filter((s) => s.endpoint !== endpoint);
  saveSubscriptions(subscriptions);
}

async function sendPushToAll(payload) {
  const body = JSON.stringify(payload);
  const results = await Promise.allSettled(
    subscriptions.map((sub) => webpush.sendNotification(sub, body))
  );

  const stillValid = [];
  results.forEach((result, i) => {
    const sub = subscriptions[i];
    if (result.status === 'fulfilled') {
      stillValid.push(sub);
    } else {
      const statusCode = result.reason && result.reason.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        // Suscripción vencida/revocada: se descarta sola.
      } else {
        console.warn('[Push] Error mandando notificación:', result.reason && result.reason.message);
        stillValid.push(sub);
      }
    }
  });

  if (stillValid.length !== subscriptions.length) {
    subscriptions = stillValid;
    saveSubscriptions(subscriptions);
  }
}

// ========== POLLING DE ALERTAS (server-side) ==========
// Guarda la última severidad conocida por zona para no mandar push
// repetido cada vez que corre el intervalo mientras la tormenta sigue.
const lastZoneSeverity = new Map();

async function checkZonesAndNotify() {
  if (subscriptions.length === 0) return; // nadie suscripto, no hace falta pegarle a la API

  const severityOrder = { severa: 0, moderada: 1, leve: 2 };
  const newAlerts = [];

  const latitudes = zonasAmaba.map((z) => z.lat).join(',');
  const longitudes = zonasAmaba.map((z) => z.lng).join(',');

  let results;
  try {
    const url =
      `${FORECAST_URL}?latitude=${latitudes}&longitude=${longitudes}` +
      `&current=weather_code,wind_speed_10m&wind_speed_unit=ms&timezone=auto`;
    const res = await fetch(url);
    const data = await res.json();
    // Con múltiples ubicaciones, Open-Meteo devuelve un array (una entrada
    // por zona, en el mismo orden en que se mandaron lat/lon).
    results = Array.isArray(data) ? data : [data];
  } catch (e) {
    console.error('[Push] Error consultando Open-Meteo:', e.message);
    return;
  }

  zonasAmaba.forEach((zona, i) => {
    const zoneData = results[i];
    if (!zoneData || !zoneData.current) return;

    const weatherId = mapWeatherCode(zoneData.current.weather_code);
    const wind = zoneData.current.wind_speed_10m ?? 0;
    const severity = classifyCondition(weatherId, wind);
    const previous = lastZoneSeverity.get(zona.name);

    if (severity) {
      const isNew = !previous || severityOrder[severity] < severityOrder[previous];
      if (isNew && (severity === 'moderada' || severity === 'severa')) {
        newAlerts.push({ zone: zona.name, severity });
      }
      lastZoneSeverity.set(zona.name, severity);
    } else {
      lastZoneSeverity.delete(zona.name);
    }
  });

  if (newAlerts.length === 0) return;

  newAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  for (const alert of newAlerts) {
    await sendPushToAll({
      title: SEVERITY_TITLES[alert.severity],
      body: `Se detectó una tormenta ${alert.severity} en ${alert.zone}.`,
      severity: alert.severity,
      alertId: `${alert.zone}-${Date.now()}`,
      url: '/',
    });
  }
}

// Revisa las zonas cada 5 minutos (mismo intervalo que usa el cliente).
setInterval(() => {
  checkZonesAndNotify().catch((e) => console.error('[Push] Error chequeando zonas:', e));
}, 5 * 60 * 1000);

// ========== BODY PARSING (sin dependencias) ==========
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) req.destroy(); // límite básico anti-abuso
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

// ========== SERVER ==========
const server = http.createServer(async (req, res) => {
  // Endpoint de ping para keep-alive
  if (req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('pong');
    return;
  }

  if (req.url === '/vapid-public-key' && req.method === 'GET') {
    sendJson(res, 200, { publicKey: vapidKeys.publicKey });
    return;
  }

  if (req.url === '/subscribe' && req.method === 'POST') {
    try {
      const sub = await readJsonBody(req);
      if (!sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
        sendJson(res, 400, { error: 'Suscripción inválida' });
        return;
      }
      addSubscription(sub);
      sendJson(res, 200, { success: true });
    } catch (e) {
      sendJson(res, 400, { error: 'JSON inválido' });
    }
    return;
  }

  if (req.url === '/unsubscribe' && req.method === 'POST') {
    try {
      const { endpoint } = await readJsonBody(req);
      if (endpoint) removeSubscription(endpoint);
      sendJson(res, 200, { success: true });
    } catch (e) {
      sendJson(res, 400, { error: 'JSON inválido' });
    }
    return;
  }

  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(DIST_DIR, filePath);

  const ext = path.extname(filePath);
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg',
  };

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Si no encuentra el archivo, sirve index.html (para SPA)
      fs.readFile(path.join(DIST_DIR, 'index.html'), (e, d) => {
        if (e) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(d);
      });
      return;
    }

    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Serving files from ${DIST_DIR}`);
  console.log(`Suscripciones push cargadas: ${subscriptions.length}`);
});
