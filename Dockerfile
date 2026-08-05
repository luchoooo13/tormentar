FROM node:22-alpine

WORKDIR /app

# Copiar solo package.json
COPY package.json ./

# Instalar con npm (más estable que pnpm). Se fuerza --include=dev
# porque NODE_ENV=production (seteado en Render) hace que npm salte
# las devDependencies por defecto, y ahi estan "typescript", "tailwindcss"
# y "esbuild", que hacen falta para compilar el proyecto.
RUN npm install --include=dev

# Copiar código
COPY . .

# Generar el build web estatico a partir del codigo fuente actual (dist/).
RUN npx expo export --platform web

# Compilar el backend real (API: tRPC, auth, etc.) a una carpeta separada
# (server-dist/) para no pisar los archivos estaticos que quedaron en dist/.
RUN npx esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=server-dist

EXPOSE 3000

# server-dist/index.js es el servidor real: expone /api/* (tRPC, auth) y
# ademas sirve los archivos estaticos de dist/ (ver server/_core/index.ts).
CMD ["node", "server-dist/index.js"]
