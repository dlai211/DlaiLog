// A minimal static file server for the exported web build (dist/).
// Used only by the Playwright end-to-end tests — no dependencies.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = process.argv[2] ?? 'dist';
const port = Number(process.argv[3] ?? 4173);

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = createServer(async (request, response) => {
  try {
    const { pathname } = new URL(request.url ?? '/', `http://localhost:${port}`);
    const relative = decodeURIComponent(pathname).replace(/^[/\\]+/, '');
    let candidate = join(root, normalize(relative));

    try {
      const info = await stat(candidate);
      if (info.isDirectory()) candidate = join(candidate, 'index.html');
    } catch {
      // Extension-less routes are exported as `<route>.html`.
      candidate = `${candidate}.html`;
    }

    const body = await readFile(candidate);
    response.writeHead(200, { 'content-type': CONTENT_TYPES[extname(candidate)] ?? 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain' });
    response.end('Not found');
  }
});

server.listen(port, () => {
  console.log(`Serving ${root} at http://localhost:${port}`);
});
