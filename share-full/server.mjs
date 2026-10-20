import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const app = fs.readFileSync(path.join(root, 'app-source.html'));
const bootstrap = fs.readFileSync(path.join(root, 'index.html'));
const CHUNK_SIZE = 2_000_000;
const chunks = [];
for (let offset = 0; offset < app.length; offset += CHUNK_SIZE) {
  const slice = app.subarray(offset, Math.min(app.length, offset + CHUNK_SIZE));
  chunks.push(zlib.brotliCompressSync(slice, {
    params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9 },
  }));
}
const manifest = Buffer.from(JSON.stringify({ count: chunks.length }));
const port = Number(process.env.PORT || 8081);

http.createServer((req, res) => {
  const route = (req.url || '/').split('?')[0];
  if (route === '/' || route === '/index.html') {
    res.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'content-length': bootstrap.length,
      'cache-control': 'no-store',
    });
    res.end(bootstrap);
    return;
  }
  if (route === '/chunks.json') {
    res.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
      'content-length': manifest.length,
      'cache-control': 'no-store',
    });
    res.end(manifest);
    return;
  }
  const match = /^\/chunk\/(\d+)$/.exec(route);
  if (match) {
    const index = Number(match[1]);
    const body = chunks[index];
    if (!body) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('No such chunk');
      return;
    }
    res.writeHead(200, {
      'content-type': 'application/octet-stream',
      'content-encoding': 'br',
      'content-length': body.length,
      'cache-control': 'no-store',
    });
    res.end(body);
    return;
  }
  if (route === '/test.txt') {
    const body = Buffer.from('cpolar-chunk-ok\n');
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'content-length': body.length });
    res.end(body);
    return;
  }
  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('Not found');
}).listen(port, '127.0.0.1', () => {
  console.log(`Chunked share server on http://127.0.0.1:${port}`);
  console.log(`app ${app.length}  chunks ${chunks.length}  compressed ${chunks.reduce((n, b) => n + b.length, 0)}`);
});
