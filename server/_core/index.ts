import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "path";
import { fileURLToPath } from "url";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Enable CORS for all routes - reflect the request origin to support credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  // Servir la web exportada por Expo (carpeta dist/, generada en el build
  // con `expo export -p web`). Va DESPUÉS de las rutas /api para que
  // sigan teniendo prioridad; cualquier otra ruta GET devuelve index.html
  // (necesario para las rutas internas de la app, como /settings o /map,
  // al recargar la página o entrar por link directo).
  const distPath = path.join(__dirname, "..", "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(distPath, "index.html"), (err) => {
      if (err) next(err);
    });
  });

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
    startKeepAlive();
  });
}

// Keep-alive: Render (plan free) apaga el servidor despues de ~15 min
// sin recibir trafico HTTP entrante. Para evitarlo, el propio server
// se pinguea a si mismo cada 10 minutos contra su URL publica, lo que
// cuenta como trafico entrante real y resetea el contador de Render.
//
// RENDER_EXTERNAL_URL la define Render automaticamente en cualquier
// Web Service (ver https://render.com/docs/environment-variables).
// Si no existe (por ejemplo corriendo local o en otro hosting), no
// hace nada: no tiene sentido auto-pinguearse fuera de Render.
function startKeepAlive() {
  const externalUrl = process.env.RENDER_EXTERNAL_URL;
  if (!externalUrl) {
    console.log("[keep-alive] RENDER_EXTERNAL_URL no definida, keep-alive desactivado.");
    return;
  }

  const PING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutos (< 15 min limite de Render free)
  const healthUrl = `${externalUrl.replace(/\/$/, "")}/api/health`;

  const ping = async () => {
    try {
      const res = await fetch(healthUrl);
      console.log(`[keep-alive] ping ${res.status} a las ${new Date().toLocaleTimeString()}`);
    } catch (err) {
      console.warn("[keep-alive] fallo el ping:", err instanceof Error ? err.message : err);
    }
  };

  console.log(`[keep-alive] activado, pingueando ${healthUrl} cada ${PING_INTERVAL_MS / 60000} min`);
  setInterval(ping, PING_INTERVAL_MS);
}

startServer().catch(console.error);
