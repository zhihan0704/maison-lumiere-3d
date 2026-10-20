import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, quantize, weld } from '@gltf-transform/functions';

const input = path.resolve(process.argv[2] || 'output/maison-lumiere-villa.raw.glb');
const outDir = path.resolve('output');
const output = path.join(outDir, 'maison-lumiere-villa.glb');
fs.mkdirSync(outDir, { recursive: true });

function glbInfo(file) {
  const buf = fs.readFileSync(file);
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString());
  const binLen = buf.readUInt32LE(20 + jsonLen);
  let images = 0;
  for (const im of json.images || []) images += json.bufferViews[im.bufferView]?.byteLength || 0;
  const meshes = json.meshes || [];
  let prims = 0, indexed = 0, tris = 0;
  for (const mesh of meshes) for (const p of mesh.primitives) {
    prims++;
    if (p.indices !== undefined) indexed++;
    const pos = json.accessors[p.attributes.POSITION];
    const idx = p.indices !== undefined ? json.accessors[p.indices] : null;
    tris += idx ? idx.count / 3 : pos.count / 3;
  }
  return {
    file, bytes: buf.length, mb: +(buf.length / 1048576).toFixed(2), jsonMB: +(jsonLen / 1048576).toFixed(2),
    binMB: +(binLen / 1048576).toFixed(2), imagesMB: +(images / 1048576).toFixed(2),
    meshes: meshes.length, prims, indexed, tris: Math.round(tris),
    extensionsUsed: json.extensionsUsed || [],
  };
}

console.log('INPUT', JSON.stringify(glbInfo(input), null, 2));
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(input);
const root = doc.getRoot();
console.log('Document:', {
  scenes: root.listScenes().length, nodes: root.listNodes().length,
  meshes: root.listMeshes().length, materials: root.listMaterials().length,
  textures: root.listTextures().length,
});

await doc.transform(
  weld({ tolerance: 1e-4 }),
  dedup(),
  prune(),
  quantize({
    quantizePosition: 14,
    quantizeNormal: 10,
    quantizeTexcoord: 12,
    quantizationVolume: 'mesh',
  }),
  dedup(),
  prune(),
);

await io.write(output, doc);
console.log('OUTPUT', JSON.stringify(glbInfo(output), null, 2));
const target = path.resolve('maison-lumiere-villa.glb');
fs.copyFileSync(output, target);
console.log('Copied optimized GLB to', target, (fs.statSync(target).size / 1048576).toFixed(2), 'MB');
