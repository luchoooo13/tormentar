FROM node:22-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json ./
RUN npm install

COPY . .

# La API key de OpenWeatherMap queda "horneada" dentro del bundle web en
# este paso (Expo reemplaza EXPO_PUBLIC_* en tiempo de build, no en runtime).
# Render inyecta automáticamente las env vars del servicio como build args
# con el mismo nombre, así que solo hace falta declarar el ARG.
ARG EXPO_PUBLIC_OPENWEATHER_API_KEY
ENV EXPO_PUBLIC_OPENWEATHER_API_KEY=$EXPO_PUBLIC_OPENWEATHER_API_KEY

# Esto es lo que faltaba: regenerar dist/ con el código actual en cada build.
RUN npx expo export -p web --output-dir dist

EXPOSE 3000
CMD ["node", "server.js"]
