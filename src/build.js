import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildVilla, exportGLB, inspectScene, makeManifest } from './villa.js';
import { FLOORS } from './geom.js';

const statusEl = document.getElementById('status');
const errEl = document.getElementById('error');
const stage = document.getElementById('stage');

function fail(err) {
  console.error(err);
  errEl.style.display = 'block';
  errEl.textContent = `${err?.stack || err}`;
  statusEl.textContent = '构建失败: ' + (err?.message || err);
}
window.addEventListener('error', e => fail(e.error || e.message));
window.addEventListener('unhandledrejection', e => fail(e.reason));

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xaebec8);
const camera = new THREE.PerspectiveCamera(33, window.innerWidth / window.innerHeight, .1, 400);
camera.position.set(39, 23, 43);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), .05).texture;
scene.environmentIntensity = .5;
const hemi = new THREE.HemisphereLight(0xe5eef5, 0x77705f, 1.1);
const sun = new THREE.DirectionalLight(0xffebcc, 2.5);
sun.position.set(35, 45, 36); sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
sun.shadow.camera.left = -45; sun.shadow.camera.right = 45; sun.shadow.camera.top = 45; sun.shadow.camera.bottom = -45;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 130; sun.shadow.bias = -.0006;
const fill = new THREE.DirectionalLight(0xb6ccdd, .6); fill.position.set(-30, 20, -25);
scene.add(hemi, sun, fill, new THREE.AmbientLight(0xffffff, .18));
const target = new THREE.Vector3(0, 5, 1);

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function setCamera(position, look, fov = 33) {
  camera.position.set(...position);
  camera.fov = fov; camera.updateProjectionMatrix();
  camera.lookAt(new THREE.Vector3(...look));
}

try {
  statusEl.textContent = '生成 PBR 材质与程序化纹理…';
  const t0 = performance.now();
  const villa = await buildVilla({ onProgress: (p, msg) => { statusEl.textContent = `${Math.round(p * 100)}% · ${msg}`; } });
  const { root, manifest, interiors, floors, landscape, roof, exteriors } = villa;
  scene.add(root);
  setCamera([39, 23, 43], [0, 5.1, 1.5]);
  const seconds = ((performance.now() - t0) / 1000).toFixed(1);
  statusEl.textContent = `${manifest.validation.ok ? '✓' : '!'} 构建完成 · ${seconds}s · ${interiors.rooms.length} 个空间\n几何 ${villa.stats.meshes} meshes / ${villa.stats.triangles.toLocaleString()} tris`;
  window.__VILLA_MODEL__ = root;

  window.__VILLA__ = {
    ready: true,
    manifest,
    validation: manifest.validation,
    stats: villa.stats,
    villa,
    setCamera,
    setDayNight(night) {
      if (night) { scene.background.set(0x0b1520); hemi.intensity = .25; sun.intensity = .12; fill.intensity = .2; renderer.toneMappingExposure = 1.2; }
      else { scene.background.set(0xaebec8); hemi.intensity = 1.1; sun.intensity = 2.5; fill.intensity = .6; renderer.toneMappingExposure = 1.0; }
    },
    setFloor(fi) {
      floors.forEach((f, i) => f.visible = fi === null || i === fi);
      roof.visible = fi === null;
      exteriors.visible = fi === null;
      landscape.visible = true;
    },
    async downloadGLB() {
      statusEl.textContent = '正在导出 GLB…';
      const buf = await exportGLB(root);
      const blob = new Blob([buf], { type: 'model/gltf-binary' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'maison-lumiere-villa.glb';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 10000);
      statusEl.textContent = `GLB 已导出 · ${(buf.byteLength / 1048576).toFixed(2)} MB`;
      window.__GLB_READY__ = true;
      return buf.byteLength;
    },
    screenshotReady: true,
  };
  window.__VILLA_READY__ = true;
  console.log('VILLA_READY', JSON.stringify({ stats: villa.stats, validation: manifest.validation.summary }));
} catch (err) {
  window.__VILLA_ERROR__ = String(err?.stack || err);
  fail(err);
}
