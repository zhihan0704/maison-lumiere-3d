import fs from 'node:fs';
import path from 'node:path';
import { createCanvas, Canvas, ImageData, Image as CanvasImage } from '@napi-rs/canvas';

/* ------------------------------------------------------------------ */
/*  Minimal browser shim for Three's GLTFExporter                     */
/* ------------------------------------------------------------------ */

const canvasProto = Canvas.prototype;
if (typeof canvasProto.toBlob !== 'function') {
  canvasProto.toBlob = function (callback, type = 'image/png', quality) {
    const buffer = this.toBuffer(type, quality);
    callback(new Blob([buffer], { type }));
  };
}

function makeCanvas(w = 1, h = 1) {
  const canvas = createCanvas(w, h);
  // @napi-rs/canvas exposes a `data()` method on its prototype. GLTFExporter
  // treats any image with a defined `.data` property as a raw DataTexture, so
  // shadow it with undefined on browser-like canvases.
  Object.defineProperty(canvas, 'data', { value: undefined, writable: true, configurable: true });
  return canvas;
}
globalThis.window = globalThis;
globalThis.document = {
  createElement(tag) {
    if (tag === 'canvas') return makeCanvas(1, 1);
    if (tag === 'img') return new CanvasImage();
    return {};
  },
  createElementNS(_ns, tag) { return this.createElement(tag); },
};
globalThis.HTMLCanvasElement = class HTMLCanvasElement {};
Object.defineProperty(globalThis.HTMLCanvasElement, Symbol.hasInstance, {
  value: obj => obj instanceof Canvas,
});
globalThis.HTMLImageElement = class HTMLImageElement {};
Object.defineProperty(globalThis.HTMLImageElement, Symbol.hasInstance, {
  value: obj => obj instanceof CanvasImage,
});
globalThis.Image = CanvasImage;
globalThis.ImageData = ImageData;

class FileReaderShim {
  constructor() { this.result = null; this.onloadend = null; this.onerror = null; }
  #finish(result) {
    this.result = result;
    setTimeout(() => { if (typeof this.onloadend === 'function') this.onloadend(); }, 0);
  }
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(buf => this.#finish(buf)).catch(err => {
      if (typeof this.onerror === 'function') this.onerror(err);
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then(buf => {
      const type = blob.type || 'application/octet-stream';
      this.#finish(`data:${type};base64,${Buffer.from(buf).toString('base64')}`);
    }).catch(err => {
      if (typeof this.onerror === 'function') this.onerror(err);
    });
  }
}
globalThis.FileReader = FileReaderShim;

if (typeof globalThis.URL.createObjectURL !== 'function') {
  globalThis.URL.createObjectURL = () => { throw new Error('createObjectURL is not available in the Node exporter'); };
}

/* ------------------------------------------------------------------ */
/*  Build                                                             */
/* ------------------------------------------------------------------ */

const { buildVilla, exportGLB, inspectScene } = await import('../src/villa.js');

const outDir = path.resolve('output');
fs.mkdirSync(outDir, { recursive: true });
const t0 = Date.now();
console.log('Building Maison Lumière in Node…');
const villa = await buildVilla({ onProgress: (p, msg) => console.log(`${Math.round(p * 100)}% ${msg}`) });
console.log('Scene stats:', villa.stats);
console.log('Validation:', villa.interiors.validation.summary);

// Report actual geometry indexing (reveals whether mergeGroup preserved indices).
let indexedMeshes = 0, nonIndexedMeshes = 0, indexedVerts = 0, nonIndexedVerts = 0;
villa.root.traverse(o => {
  if (!o.isMesh || !o.geometry) return;
  if (o.geometry.index) {
    indexedMeshes++;
    indexedVerts += o.geometry.attributes.position.count;
  } else {
    nonIndexedMeshes++;
    nonIndexedVerts += o.geometry.attributes.position.count;
  }
});
console.log(`Indexing: ${indexedMeshes} indexed / ${nonIndexedMeshes} non-indexed, ${indexedVerts} indexed verts / ${nonIndexedVerts} non-indexed verts`);

fs.writeFileSync(path.join(outDir, 'villa-manifest.json'), JSON.stringify(villa.manifest, null, 2));
fs.writeFileSync(path.join(outDir, 'validation-report.json'), JSON.stringify(villa.interiors.validation, null, 2));
fs.writeFileSync(path.join(outDir, 'scene-stats.json'), JSON.stringify({
  ...villa.stats,
  indexedMeshes, nonIndexedMeshes, indexedVerts, nonIndexedVerts,
  buildSeconds: ((Date.now() - t0) / 1000).toFixed(1),
}, null, 2));

if (!process.argv.includes('--no-export')) {
  console.log('Exporting GLB via Three.GLTFExporter…');
  const buf = await exportGLB(villa.root);
  const raw = path.join(outDir, 'maison-lumiere-villa.raw.glb');
  fs.writeFileSync(raw, Buffer.from(buf));
  console.log(`Raw GLB: ${(buf.byteLength / 1048576).toFixed(2)} MB → ${raw}`);
}
console.log('Done in', ((Date.now() - t0) / 1000).toFixed(1), 's');
