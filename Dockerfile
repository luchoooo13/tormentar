FROM node:22-alpine

WORKDIR /app

# Copiar solo package.json
COPY package.json ./

# Instalar con npm (más estable que pnpm). Se fuerza --include=dev
# porque NODE_ENV=production (seteado en Render) hace que npm salte
# las devDependencies por defecto, y ahi estan "typescript" y
# "tailwindcss", que Metro necesita para poder compilar el proyecto
# (sin ellos, "npx expo export" fallaba en el paso de babel-transformer).
RUN npm install --include=dev

# Copiar código
COPY . .

# Generar el build web estatico a partir del codigo fuente actual.
# Antes esto faltaba: se servia el dist/ que habia quedado commiteado
# en el repo (viejo, de antes de existir app/(tabs)), y nunca se
# actualizaba aunque cambiara el codigo fuente.
RUN npx expo export --platform web

# Crear servidor estático
RUN cat > server.js << 'EOF'
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, 'dist', filePath);
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(__dirname, 'dist', 'index.html'), (e, d) => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(d || '<h1>Tormentar</h1>');
      });
      return;
    }
    const ext = path.extname(filePath);
    const mime = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml'
    };
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`Server on ${PORT}`));
EOF

EXPOSE 3000

CMD ["node", "server.js"]
