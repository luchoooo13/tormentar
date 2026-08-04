FROM node:22-alpine

WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml ./

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY . .

# Construir la aplicación
RUN pnpm build

# Exponer puerto
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["pnpm", "start"]
