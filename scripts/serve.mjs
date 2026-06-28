// Minimal static file server for the built site (dist/). Used by the test runner
// and for quick local previews. Production is served by Cloudflare, not this.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const port = Number(process.env.PORT) || 4173;

// Mirror the global (/*) security headers Cloudflare serves from _headers, so the
// test/dev server reflects production and a dropped CSP is caught by the e2e suite.
const securityHeaders = {};
try {
  const raw = await readFile(join(root, '_headers'), 'utf8');
  let inGlobal = false;
  for (const line of raw.split('\n')) {
    if (line.startsWith('/*')) {
      inGlobal = true;
      continue;
    }
    if (line.trim() && !/^\s/.test(line)) inGlobal = false; // a new path block began
    const m = inGlobal && line.match(/^\s+([\w-]+):\s*(.+?)\s*$/);
    if (m) securityHeaders[m[1]] = m[2];
  }
} catch {
  // No _headers (e.g. an unbuilt tree) — serve without them.
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';

    const filePath = normalize(join(root, pathname));
    if (filePath !== root && !filePath.startsWith(root + sep)) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    let body;
    try {
      body = await readFile(filePath);
    } catch {
      // Single-page fallback.
      body = await readFile(join(root, 'index.html'));
      res.writeHead(200, { 'Content-Type': TYPES['.html'], ...securityHeaders }).end(body);
      return;
    }

    res
      .writeHead(200, {
        'Content-Type': TYPES[extname(filePath)] || 'application/octet-stream',
        ...securityHeaders,
      })
      .end(body);
  } catch {
    res.writeHead(500).end('Server error');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Serving dist/ at http://127.0.0.1:${port}`);
});
