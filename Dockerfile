FROM node:22-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json ./

RUN npm install

COPY . .

# Regenera dist/ a partir del codigo fuente actual (antes esto no se
# ejecutaba nunca: se serv�a un dist/ viejo, congelado, sin relacion
# con los cambios de estilo hechos en app/(tabs)/*.tsx)
RUN npx expo export -p web --output-dir dist

EXPOSE 3000

CMD ["node", "server.js"]
