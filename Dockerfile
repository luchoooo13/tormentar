FROM node:22-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile

COPY . .

ARG EXPO_PUBLIC_OPENWEATHER_API_KEY
ENV EXPO_PUBLIC_OPENWEATHER_API_KEY=$EXPO_PUBLIC_OPENWEATHER_API_KEY

RUN npx expo export -p web --output-dir dist

EXPOSE 3000
CMD ["node", "server.js"]
