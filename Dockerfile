FROM node:22-alpine

WORKDIR /app

# Instalar pnpm
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Copiar archivos de dependencias
COPY pnpm-lock.yaml package.json ./

# Instalar dependencias usando el lockfile
RUN pnpm install --frozen-lockfile

# Copiar el resto del código
COPY . .

# Variables de entorno para el build
ARG EXPO_PUBLIC_OPENWEATHER_API_KEY
ENV EXPO_PUBLIC_OPENWEATHER_API_KEY=$EXPO_PUBLIC_OPENWEATHER_API_KEY

# Compilar el servidor (esto genera dist/index.js)
RUN pnpm build

# Exportar la aplicación para web (esto genera los archivos estáticos en dist/)
RUN npx expo export -p web --output-dir dist

# Exponer el puerto
EXPOSE 3000

# Comando para iniciar el servidor
CMD ["node", "dist/index.js"]
