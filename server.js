import { createServer } from 'http';
import { readFileSync, statSync } from 'fs';
import { join, extname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 8080;
const DIST_DIR = resolve(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
};

function getMimeType(filePath) {
  const ext = extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function serveFile(filePath, res) {
  try {
    const stats = statSync(filePath);
    if (!stats.isFile()) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    const content = readFileSync(filePath);
    const mimeType = getMimeType(filePath);
    
    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(content);
  } catch (err) {
    res.writeHead(404);
    res.end('Not Found');
  }
}

function getFilePath(url) {
  let path = url === '/' ? '/index.html' : url;
  // Remove query string
  path = path.split('?')[0];
  const filePath = join(DIST_DIR, path);
  
  // For SPA routing: if file doesn't exist and has an extension, return 404
  // If no extension, assume it's a route and serve index.html
  try {
    const stats = statSync(filePath);
    if (stats.isFile()) {
      return filePath;
    }
  } catch (err) {
    // File doesn't exist
  }
  
  // If no extension, it's likely a route - serve index.html for SPA routing
  if (!extname(path)) {
    return join(DIST_DIR, 'index.html');
  }
  
  return filePath;
}

const server = createServer((req, res) => {
  const filePath = getFilePath(req.url);
  serveFile(filePath, res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

