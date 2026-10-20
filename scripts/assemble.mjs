import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const template = fs.readFileSync(path.join(root, 'viewer.template.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/viewer.css'), 'utf8');
const bundle = fs.readFileSync(path.join(root, 'output/viewer.bundle.js'), 'utf8');
const manifestPath = path.join(root, 'output/villa-manifest.json');
const validationPath = path.join(root, 'output/validation-report.json');
const glbPath = path.join(root, 'output/maison-lumiere-villa.glb');
const audioPath = path.join(root, 'output/background-music.mp3');

const manifest = fs.readFileSync(manifestPath, 'utf8');
const glb = fs.readFileSync(glbPath);
const audio = fs.readFileSync(audioPath);
const glbB64 = glb.toString('base64');
const audioB64 = audio.toString('base64');
const CHUNK = 1_500_000;
const glbChunks = [];
const musicChunks = [];
for (let i = 0; i < glbB64.length; i += CHUNK) {
  glbChunks.push(`<script class="glb-chunk" type="application/octet-stream">${glbB64.slice(i, i + CHUNK)}</script>`);
}
for (let i = 0; i < audioB64.length; i += CHUNK) {
  musicChunks.push(`<script class="music-chunk" type="application/octet-stream">${audioB64.slice(i, i + CHUNK)}</script>`);
}

function escapeScript(text) { return text.replace(/<\/script/gi, '<\\/script'); }
function inject(html, token, value) { return html.split(token).join(value); }

const bundleSafe = escapeScript(bundle);
const manifestSafe = escapeScript(manifest);
const cssSafe = css.replace(/<\/style/gi, '<\\/style');
const glbChunksSafe = glbChunks.join('\n');
const musicChunksSafe = musicChunks.join('\n');

let html = template;
html = inject(html, '__VIEWER_CSS__', cssSafe);
html = inject(html, '__MANIFEST_HTML__', manifestSafe);
html = inject(html, '__GLB_CHUNKS__', glbChunksSafe);
html = inject(html, '__MUSIC_CHUNKS__', musicChunksSafe);
html = inject(html, '__VIEWER_BUNDLE__', bundleSafe);

const leftover = html.match(/__VIEWER_CSS__|__VIEWER_BUNDLE__|__GLB_CHUNKS__|__MUSIC_CHUNKS__|__GLB_BASE64__|__MANIFEST_HTML__/g);
if (leftover) throw new Error('Unreplaced tokens: ' + leftover.join(', '));

const embedded = path.join(root, '法式别墅-交互式3D.html');
fs.writeFileSync(embedded, html);
fs.writeFileSync(path.join(root, 'index.html'), html);

// A lighter option for web servers: model fetched externally, same interface.
let external = template;
external = inject(external, '__VIEWER_CSS__', cssSafe);
external = inject(external, '__MANIFEST_HTML__', manifestSafe);
external = inject(external, '__GLB_CHUNKS__', '');
external = inject(external, '__MUSIC_CHUNKS__', musicChunksSafe);
external = inject(external, '__VIEWER_BUNDLE__', bundleSafe);
fs.writeFileSync(path.join(root, 'index-external.html'), external);

// Publish canonical data next to the viewer.
fs.copyFileSync(glbPath, path.join(root, 'maison-lumiere-villa.glb'));
fs.copyFileSync(manifestPath, path.join(root, 'villa-manifest.json'));
fs.copyFileSync(validationPath, path.join(root, 'validation-report.json'));

const kb = n => (n / 1024).toFixed(1) + ' KB';
const mb = n => (n / 1048576).toFixed(2) + ' MB';
console.log('Built', embedded);
console.log('  inline viewer HTML:', mb(fs.statSync(embedded).size));
console.log('  external viewer:', mb(fs.statSync(path.join(root, 'index-external.html')).size));
console.log('  GLB:', mb(glb.length));
console.log('  viewer JS:', kb(bundle.length));
console.log('  CSS:', kb(css.length));
console.log('  manifest:', kb(Buffer.byteLength(manifest)), '· base64:', mb(glbB64.length), '· chunks:', glbChunks.length);
console.log('  embedded audio:', mb(audio.length), '· base64:', mb(audioB64.length), '· chunks:', musicChunks.length);
