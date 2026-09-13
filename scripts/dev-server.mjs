// Minimal local dev server: serves the static site and mounts api/track.js
// the way Vercel would. No dependencies. `npm run dev` then open localhost:3000.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { default: track } = await import(path.join(root, 'api/track.js').replace(/\\/g, '/').replace(/^([A-Za-z]):/, 'file:///$1:'));
const port = Number(process.env.PORT) || 3000;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  if (url.pathname === '/api/track') {
    const shim = {
      setHeader: (k, v) => res.setHeader(k, v),
      status(code) { res.statusCode = code; return shim; },
      json(body) { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(body)); return shim; },
      end(body) { res.end(body); return shim; },
    };
    try {
      await track({ method: req.method, query: Object.fromEntries(url.searchParams), headers: req.headers, socket: req.socket }, shim);
    } catch (err) {
      res.statusCode = 500; res.end(String(err));
    }
    return;
  }
  const file = path.join(root, url.pathname === '/' ? 'index.html' : url.pathname);
  if (file.startsWith(root) && fs.existsSync(file) && fs.statSync(file).isFile()) {
    res.setHeader('content-type', types[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  } else {
    res.statusCode = 404; res.end('Not found');
  }
}).listen(port, () => console.log(`where-qr dev server: http://localhost:${port}`));
