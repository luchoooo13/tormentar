const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, 'dist');

// --- SOLO PARA DIAGNOSTICAR, SACAR DESPUÉS ---
// Inyecta la consola Eruda ANTES que el resto del JS de la app, para poder
// ver errores que pasan apenas arranca, sin tener que activarla a mano.
const ERUDA_SNIPPET =
  '<script src="https://cdn.jsdelivr.net/npm/eruda"></script>' +
  '<script>eruda.init();</script>';
// -----------------------------------------------

const server = http.createServer((req, res) => {
  if (req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('pong');
    return;
  }

  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(DIST_DIR, filePath);

  const ext = path.extname(filePath);
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg'
  };

  const sendHtml = (data) => {
    const html = data.toString('utf8').replace('<head>', '<head>' + ERUDA_SNIPPET);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  };

  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(DIST_DIR, 'index.html'), (e, d) => {
        if (e) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
          return;
        }
        sendHtml(d);
      });
      return;
    }

    if (ext === '.html') {
      sendHtml(data);
      return;
    }

    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Serving files from ${DIST_DIR}`);
});
