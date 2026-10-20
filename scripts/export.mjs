import fs from 'node:fs';
import path from 'node:path';
import { connectCDP, sleep } from './cdp-util.mjs';

const c = await connectCDP(9228);
c.on('Runtime.exceptionThrown', p => console.log('[exception]', p.exceptionDetails?.exception?.description || p.exceptionDetails?.text));
c.on('Log.entryAdded', p => { if (p.entry.level === 'error') console.log('[log]', p.entry.text); });
await c.send('Runtime.enable');
await c.send('Page.enable');
await c.send('Log.enable');
const downloadDir = path.resolve('downloads');
fs.mkdirSync(downloadDir, { recursive: true });
for (const f of fs.readdirSync(downloadDir)) fs.rmSync(path.join(downloadDir, f), { force: true });
await c.setupDownloads(downloadDir);
await c.goto('http://127.0.0.1:4174/build.html?export=1', 1000);
await c.waitFor('window.__VILLA_READY__ === true', 240000);
const data = await c.evaluate(`({manifest: window.__VILLA__.manifest, validation: window.__VILLA__.validation, stats: window.__VILLA__.stats})`);
fs.writeFileSync('villa-manifest.json', JSON.stringify(data.manifest, null, 2));
fs.writeFileSync('validation-report.json', JSON.stringify(data.validation, null, 2));
console.log('validation', JSON.stringify(data.validation.summary));
console.log('stats', JSON.stringify(data.stats));
console.log('triggering GLB export...');
const size = await c.evaluate('window.__VILLA__.downloadGLB()', true);
console.log('export bytes', size);
const t0 = Date.now();
let glbPath = null;
while (Date.now() - t0 < 300000) {
  const names = fs.readdirSync(downloadDir).filter(n => n.endsWith('.glb'));
  if (names.length) {
    const p = path.join(downloadDir, names[0]);
    const sizeNow = fs.statSync(p).size;
    const prev = globalThis.__prevSize || 0;
    if (sizeNow > 0 && sizeNow === prev) { glbPath = p; break; }
    globalThis.__prevSize = sizeNow;
  }
  await sleep(1000);
}
if (!glbPath) {
  const names = fs.readdirSync(downloadDir);
  throw new Error('GLB download did not complete. Files: ' + names.join(', '));
}
const target = path.resolve('maison-lumiere-villa.glb');
fs.copyFileSync(glbPath, target);
console.log('saved', target, (fs.statSync(target).size / 1048576).toFixed(2), 'MB');
c.ws.close();
