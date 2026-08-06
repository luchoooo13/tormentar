import "dotenv/config";
import express from "express";
import fs from "fs";
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

  // --- SOLO PARA DIAGNOSTICAR, SACAR DESPUÉS ---
  // Inyecta la consola Eruda ANTES que el resto del JS de la app, para ver
  // errores que pasan apenas arranca, sin tener que activarla a mano.
  const ERUDA_SNIPPET =
    '<script src="https://cdn.jsdelivr.net/npm/eruda"></script>' +
    "<script>eruda.init();</script>";

  const sendIndexWithEruda = (res: express.Response, next: express.NextFunction) => {
    fs.readFile(path.join(distPath, "index.html"), "utf8", (err, html) => {
      if (err) return next(err);
      res.set("Content-Type", "text/html");
      res.send(html.replace("<head>", "<head>" + ERUDA_SNIPPET));
    });
  };

  app.use(express.static(distPath, { index: false }));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    sendIndexWithEruda(res, next);
  });
  // -----------------------------------------------

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
