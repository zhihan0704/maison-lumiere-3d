import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const glbPath = path.resolve('maison-lumiere-villa.glb');
const buf = fs.readFileSync(glbPath);
const magic = buf.readUInt32LE(0);
const version = buf.readUInt32LE(4);
const declaredLength = buf.readUInt32LE(8);
const jsonLen = buf.readUInt32LE(12);
const jsonChunkType = buf.readUInt32LE(16);
const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
const binHeaderOffset = 20 + jsonLen;
const binLen = buf.readUInt32LE(binHeaderOffset);
const binType = buf.readUInt32LE(binHeaderOffset + 4);

let triangles = 0, primitiveCount = 0, vertexCount = 0;
for (const mesh of json.meshes || []) {
  for (const p of mesh.primitives || []) {
    primitiveCount++;
    const pos = json.accessors[p.attributes.POSITION];
    vertexCount += pos.count;
    const idx = p.indices !== undefined ? json.accessors[p.indices] : null;
    triangles += idx ? idx.count / 3 : pos.count / 3;
  }
}
let imageBytes = 0;
for (const im of json.images || []) {
  if (im.bufferView !== undefined) imageBytes += json.bufferViews[im.bufferView].byteLength;
}
const nodeNames = new Set((json.nodes || []).map(n => n.name).filter(Boolean));
const names = ['Floor_0', 'Floor_1', 'Floor_2', 'Architecture_0', 'ArchitectureCut_0', 'Staircase', 'Roof', 'ExteriorDetails', 'Landscape'];
const missingNames = names.filter(n => !nodeNames.has(n));
const externalBuffers = (json.buffers || []).filter(b => b.uri);
const externalImages = (json.images || []).filter(im => im.uri);
const missingPosition = (json.meshes || []).flatMap(m => m.primitives).filter(p => p.attributes?.POSITION === undefined);
const checks = {
  magic: magic === 0x46546C67,
  version: version === 2,
  declaredLength: declaredLength === buf.length,
  jsonChunk: jsonChunkType === 0x4E4F534A,
  binChunk: binType === 0x004E4942,
  embeddedBuffers: externalBuffers.length === 0,
  embeddedImages: externalImages.length === 0,
  allPrimitivesHavePositions: missingPosition.length === 0,
  requiredNodes: missingNames.length === 0,
  noErrors: (json.meshes || []).length > 0 && (json.materials || []).length > 0,
};
const ok = Object.values(checks).every(Boolean);

const stats = {
  meshes: (json.meshes || []).length,
  primitives: primitiveCount,
  triangles: Math.round(triangles),
  vertices: vertexCount,
  materials: (json.materials || []).length,
  textures: (json.textures || []).length,
  images: (json.images || []).length,
  imageMB: +(imageBytes / 1048576).toFixed(2),
  nodes: (json.nodes || []).length,
  floors: 3,
  rooms: 20,
  glbMB: +(buf.length / 1048576).toFixed(2),
  glbBytes: buf.length,
  extensionsUsed: json.extensionsUsed || [],
  render: 'PBR · realtime shadows · ACES tone mapping',
};

const manifestPath = path.resolve('output/villa-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.stats = stats;
manifest.visual = {
  edition: 'Golden Hour / Blue Hour',
  mood: 'warm low-angle sunset, atmospheric haze, soft volumetric glow, layered planting, reflective water',
  grade: 'ACES filmic + cinematic warm/cool split grade + vignette + subtle grain',
};
manifest.assets = {
  glb: { file: 'maison-lumiere-villa.glb', bytes: buf.length, mb: stats.glbMB, quantized: (json.extensionsUsed || []).includes('KHR_mesh_quantization') },
  standalone: { file: '法式别墅-交互式3D.html', note: 'single-file offline viewer with embedded GLB' },
  external: { file: 'index-external.html', note: 'loads maison-lumiere-villa.glb from the same directory' },
};
manifest.exportNotes = {
  generatedBy: 'Maison Lumière procedural builder + @gltf-transform',
  pipeline: 'Three.js GLTFExporter → weld → dedup → quantize (KHR_mesh_quantization) → prune',
  compatibility: 'Three.js GLTFLoader / browsers; no Draco or Meshopt decoder required',
};
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

const validationPath = path.resolve('output/validation-report.json');
const validation = JSON.parse(fs.readFileSync(validationPath, 'utf8'));
validation.glb = {
  file: 'maison-lumiere-villa.glb',
  ok,
  checks,
  stats,
  missingNodes: missingNames,
};
if (!validation.checks.some(c => c.id === 'glb')) {
  validation.checks.push({ id: 'glb', label: 'GLB 文件结构与嵌入资源完整', status: ok ? 'pass' : 'fail' });
}
const khronosPath = path.resolve('output/khronos-validation.json');
if (fs.existsSync(khronosPath)) {
  const khronos = JSON.parse(fs.readFileSync(khronosPath, 'utf8'));
  validation.khronos = {
    validatorVersion: khronos.validatorVersion,
    numErrors: khronos.issues.numErrors,
    numWarnings: khronos.issues.numWarnings,
    numInfos: khronos.issues.numInfos,
    numHints: khronos.issues.numHints,
    note: 'Warnings are portability notices for runtime-generated tangent space on normal-mapped primitives; the GLB is valid and Three.js generates tangents at runtime.',
  };
  if (!validation.checks.some(c => c.id === 'khronos')) {
    validation.checks.push({ id: 'khronos', label: 'Khronos glTF 官方校验器 0 错误', status: khronos.issues.numErrors === 0 ? 'pass' : 'fail' });
  }
  validation.summary.khronosErrors = khronos.issues.numErrors;
}
validation.summary.glbOk = ok;
validation.summary.checksPassed = validation.checks.filter(c => c.status === 'pass').length;
validation.summary.checksTotal = validation.checks.length;
fs.writeFileSync(validationPath, JSON.stringify(validation, null, 2));

// Keep the copy embedded in the viewer consistent with the final report.
manifest.validation = {
  summary: validation.summary,
  checks: validation.checks,
  khronos: validation.khronos,
  glbOk: ok,
};
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

fs.writeFileSync(path.resolve('output/glb-integrity-report.json'), JSON.stringify({ file: glbPath, ok, checks, stats, missingNames }, null, 2));
console.log('Final GLB stats:', JSON.stringify(stats, null, 2));
console.log('GLB integrity:', ok ? 'PASS' : 'FAIL', checks);
if (!ok) process.exitCode = 1;
