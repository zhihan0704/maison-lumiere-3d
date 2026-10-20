import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(root, 'index.html'));
const audio = fs.readFileSync(path.join(root, 'background-music.mp3'));
const brotli = zlib.brotliCompressSync(html, {
  params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 },
});
const gzip = zlib.gzipSync(html, { level: 9 });
const port = Number(process.env.PORT || 4182);

http.createServer((req, res) => {
  const route = (req.url || '/').split('?')[0];
  if (route === '/' || route === '/index.html') {
    const ae = String(req.headers['accept-encoding'] || '');
    const useBr = /\bbr\b/.test(ae);
    const body = useBr ? brotli : /\bgzip\b/.test(ae) ? gzip : html;
    res.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'content-encoding': useBr ? 'br' : /\bgzip\b/.test(ae) ? 'gzip' : 'identity',
      'content-length': body.length,
      'cache-control': 'no-cache',
      'vary': 'Accept-Encoding',
    });
    res.end(body);
    return;
  }
  if (route === '/background-music.mp3') {
    const range = req.headers.range;
    if (range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (m) {
        const start = m[1] ? Number(m[1]) : 0;
        const end = m[2] ? Number(m[2]) : audio.length - 1;
        if (start <= end && end < audio.length) {
          res.writeHead(206, {
            'content-type': 'audio/mpeg',
            'content-length': end - start + 1,
            'content-range': `bytes ${start}-${end}/${audio.length}`,
            'accept-ranges': 'bytes',
            'cache-control': 'public, max-age=3600',
          });
          res.end(audio.subarray(start, end + 1));
          return;
        }
      }
    }
    res.writeHead(200, {
      'content-type': 'audio/mpeg',
      'content-length': audio.length,
      'accept-ranges': 'bytes',
      'cache-control': 'public, max-age=3600',
    });
    res.end(audio);
    return;
  }
  if (route === '/test.txt') {
    const body = Buffer.from('tunnel-ok\n');
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'content-length': body.length });
    res.end(body);
    return;
  }
  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('Not found');
}).listen(port, '127.0.0.1', () => {
  console.log(`Compressed share server on http://127.0.0.1:${port}`);
  console.log(`raw ${html.length}  br ${brotli.length}  gzip ${gzip.length}`);
});
