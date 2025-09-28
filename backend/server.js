const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 4000;
const PUBLIC_DIR = path.join(__dirname, '..', 'frontend');
const DATA_DIR = path.join(__dirname, 'data');

const sendJson = (res, statusCode, payload) => {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
};

const readJsonFile = (fileName) => {
  try {
    const raw = fs.readFileSync(path.join(DATA_DIR, fileName), 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Failed to load data file ${fileName}:`, error);
    return null;
  }
};

const datasets = {
  '/api/overview': 'overview.json',
  '/api/kpis': 'kpis.json',
  '/api/campaigns': 'campaigns.json',
  '/api/alerts': 'alerts.json',
  '/api/integrations': 'integrations.json',
  '/api/reports': 'reports.json',
  '/api/activity': 'activity.json'
};

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname === '/' ? '/index.html' : parsedUrl.pathname;

  if (datasets[parsedUrl.pathname]) {
    const data = readJsonFile(datasets[parsedUrl.pathname]);
    if (!data) {
      sendJson(res, 500, { error: 'Failed to load data source' });
      return;
    }
    sendJson(res, 200, data);
    return;
  }

  const safePath = path.normalize(pathname).replace(/^\/+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      }
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Reach Abiqx dev server listening on http://localhost:${PORT}`);
});
