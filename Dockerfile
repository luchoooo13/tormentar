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

# La API key debe estar disponible durante el build de Expo (las
# variables EXPO_PUBLIC_* se incrustan en el JS en el momento de
# `expo export`, no en runtime). Render traduce automáticamente las
# variables configuradas en el dashboard en build args con el mismo
# nombre, pero hay que declararlas acá para que el proceso las vea.
ARG EXPO_PUBLIC_OPENWEATHER_API_KEY
ENV EXPO_PUBLIC_OPENWEATHER_API_KEY=$EXPO_PUBLIC_OPENWEATHER_API_KEY

# Generar el build web estatico a partir del codigo fuente actual (dist/).
RUN npx expo export --platform web

# Compilar el backend real (API: tRPC, auth, etc.) a una carpeta separada
# (server-dist/) para no pisar los archivos estaticos que quedaron en dist/.
RUN npx esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=server-dist

EXPOSE 3000

# server-dist/index.js es el servidor real: expone /api/* (tRPC, auth) y
# ademas sirve los archivos estaticos de dist/ (ver server/_core/index.ts).
CMD ["node", "server-dist/index.js"]
