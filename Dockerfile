FROM node:22-alpine

WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml ./

# Instalar dependencias sin frozen-lockfile
RUN pnpm install --no-frozen-lockfile

# Copiar código fuente
COPY . .

# Construir la app web de Expo
RUN npx expo export --platform web

# Crear servidor estático simple
RUN echo 'const http=require("http"),fs=require("fs"),path=require("path");const PORT=process.env.PORT||3000;const D=path.join(__dirname,"dist");const M={".html":"text/html",".js":"application/javascript",".css":"text/css",".json":"application/json",".png":"image/png",".jpg":"image/jpeg",".svg":"image/svg+xml",".ico":"image/x-icon"};http.createServer((q,s)=>{let u=q.url.split("?")[0];if(u==="/")u="/index.html";const f=path.join(D,u);fs.readFile(f,(e,d)=>{if(e){fs.readFile(path.join(D,"index.html"),(e2,d2)=>{if(e2){s.writeHead(404);s.end("Not found");return;}s.writeHead(200,{"Content-Type":"text/html"});s.end(d2);});return;}s.writeHead(200,{"Content-Type":M[path.extname(f)]||"application/octet-stream"});s.end(d);});}).listen(PORT,()=>console.log("Server on "+PORT));' > /app/serve.js

EXPOSE 3000

CMD ["node", "serve.js"]
