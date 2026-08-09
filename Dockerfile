FROM node:22-alpine

WORKDIR /app

# Instalar pnpm
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Copiar archivos de dependencias
COPY pnpm-lock.yaml package.json ./

# Instalar dependencias. Se usa --no-frozen-lockfile (en vez de
# --frozen-lockfile) porque el pnpm-lock.yaml no siempre se regenera a
# mano junto con package.json (no hay entorno con pnpm a mano para
# correr "pnpm install" localmente antes de cada commit). Con esta
# opcion, pnpm actualiza el lockfile el mismo durante el build en vez
# de exigir que ya coincida de antemano.
RUN pnpm install --no-frozen-lockfile

# Copiar el resto del código
COPY . .

# Variables de entorno para el build
ARG EXPO_PUBLIC_OPENWEATHER_API_KEY
ENV EXPO_PUBLIC_OPENWEATHER_API_KEY=$EXPO_PUBLIC_OPENWEATHER_API_KEY

# 1. Exportar la aplicación para web PRIMERO (esto crea la carpeta dist/ y borra lo que haya)
RUN npx expo export -p web --output-dir dist

# 2. Compilar el servidor DESPUÉS (esto añade index.js a la carpeta dist/ sin borrarla)
RUN pnpm build

# Exponer el puerto
EXPOSE 3000

# Comando para iniciar el servidor
CMD ["node", "dist/index.js"]
