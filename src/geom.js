import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export const HOUSE = {
  halfX: 13.0,
  halfZ: 8.0,
  wall: 0.5,
  innerHalfX: 12.72,
  innerHalfZ: 7.72,
  partition: 0.16,
};

export const FLOORS = [
  {
    index: 0, id: 'floor-0', name: '一层', nameFr: 'Rez-de-chaussée',
    base: 0.35, height: 3.50, slab: 0.34,
    label: '礼仪层 · 会客与宴飨',
    description: '入口门厅、大沙龙、餐厅、书房与厨房，构成法式宅邸的礼仪动线。',
  },
  {
    index: 1, id: 'floor-1', name: '二层', nameFr: 'Premier étage',
    base: 4.10, height: 3.35, slab: 0.28,
    label: '私密层 · 主卧与客房',
    description: '主卧套房、衣帽间、浴室与两间客卧，围绕安静的中央家庭厅展开。',
  },
  {
    index: 2, id: 'floor-2', name: '三层', nameFr: 'Deuxième étage',
    base: 7.70, height: 3.25, slab: 0.26,
    label: '观景层 · 艺术与休闲',
    description: '观景厅、客卧、画室、私人影院与健身房，面向屋顶与花园展开。',
  },
];

export const SITE = { halfX: 27, halfZ: 31 };
export const ROOF_BASE = FLOORS[2].base + FLOORS[2].height; // 10.95
export const STAIR_OPENING = { x0: -2.65, x1: 2.65, z0: -5.55, z1: -0.90 };

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const _m4 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();

export function mat4(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  _e.set(rx, ry, rz);
  _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), _q, new THREE.Vector3(sx, sy, sz));
}

export function box(parent, mat, w, h, d, x, y, z, opts = {}) {
  const m = new THREE.Mesh(UNIT_BOX, mat);
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  if (opts.ry) m.rotation.y = opts.ry;
  if (opts.rx) m.rotation.x = opts.rx;
  if (opts.rz) m.rotation.z = opts.rz;
  m.castShadow = opts.cast !== false;
  m.receiveShadow = opts.receive !== false;
  if (opts.name) m.name = opts.name;
  if (opts.userData) Object.assign(m.userData, opts.userData);
  parent.add(m);
  return m;
}
export function boxMM(parent, mat, w, h, d, x, y, z, opts) { return box(parent, mat, w, h, d, x, y, z, opts); }

export function roundedBox(parent, mat, w, h, d, r, x, y, z, opts = {}) {
  const rr = Math.max(0.003, Math.min(r, w * 0.48, h * 0.48, d * 0.48));
  const g = new RoundedBoxGeometry(w, h, d, opts.segments ?? 2, rr);
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, z);
  if (opts.ry) m.rotation.y = opts.ry;
  if (opts.rx) m.rotation.x = opts.rx;
  if (opts.rz) m.rotation.z = opts.rz;
  m.castShadow = opts.cast !== false;
  m.receiveShadow = opts.receive !== false;
  parent.add(m);
  return m;
}

export function cylinder(parent, mat, rTop, rBot, h, seg, x, y, z, opts = {}) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, seg, opts.heightSeg ?? 1, !!opts.open);
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, z);
  if (opts.ry) m.rotation.y = opts.ry;
  if (opts.rx) m.rotation.x = opts.rx;
  if (opts.rz) m.rotation.z = opts.rz;
  m.castShadow = opts.cast !== false;
  m.receiveShadow = opts.receive !== false;
  parent.add(m);
  return m;
}

export function sphere(parent, mat, r, x, y, z, opts = {}) {
  const g = new THREE.SphereGeometry(r, opts.w ?? 16, opts.h ?? 10);
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, z);
  if (opts.sx || opts.sy || opts.sz) m.scale.set(opts.sx ?? 1, opts.sy ?? 1, opts.sz ?? 1);
  if (opts.ry) m.rotation.y = opts.ry;
  m.castShadow = opts.cast !== false;
  m.receiveShadow = opts.receive !== false;
  parent.add(m);
  return m;
}

export function sphereGeo(parent, mat, r, x, y, z, sx = 1, sy = 1, sz = 1, opts = {}) {
  return sphere(parent, mat, r, x, y, z, { ...opts, sx, sy, sz });
}

export function plane(parent, mat, w, d, x, y, z, opts = {}) {
  const g = new THREE.PlaneGeometry(w, d);
  const m = new THREE.Mesh(g, mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  if (opts.ry) m.rotation.z = opts.ry;
  m.receiveShadow = opts.receive !== false;
  m.castShadow = !!opts.cast;
  parent.add(m);
  return m;
}
export function verticalPlane(parent, mat, w, h, x, y, z, ry = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
export function torus(parent, mat, rad, tube, x, y, z, opts = {}) {
  const g = new THREE.TorusGeometry(rad, tube, opts.tubular ?? 8, opts.radial ?? 28, opts.arc ?? Math.PI * 2);
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, z);
  if (opts.rx) m.rotation.x = opts.rx;
  if (opts.ry) m.rotation.y = opts.ry;
  if (opts.rz) m.rotation.z = opts.rz;
  m.castShadow = opts.cast !== false;
  m.receiveShadow = opts.receive !== false;
  parent.add(m);
  return m;
}
export function lathe(parent, mat, points, segs, x, y, z, opts = {}) {
  const g = new THREE.LatheGeometry(points.map(p => new THREE.Vector2(p[0], p[1])), segs);
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, z);
  if (opts.ry) m.rotation.y = opts.ry;
  if (opts.rx) m.rotation.x = opts.rx;
  m.castShadow = opts.cast !== false;
  m.receiveShadow = opts.receive !== false;
  parent.add(m);
  return m;
}
export function tube(parent, mat, points, radius, x = 0, y = 0, z = 0, opts = {}) {
  const curve = new THREE.CatmullRomCurve3(points);
  const g = new THREE.TubeGeometry(curve, opts.segments ?? 20, radius, opts.radial ?? 6, false);
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, z);
  m.castShadow = opts.cast !== false;
  parent.add(m);
  return m;
}

// A reusable classical bottle baluster, merged into a single stone railing.
const BALUSTER_POINTS = [
  [0.055, 0], [0.085, 0.018], [0.075, 0.055], [0.040, 0.10], [0.045, 0.16],
  [0.078, 0.235], [0.088, 0.285], [0.070, 0.345], [0.040, 0.400],
  [0.045, 0.45], [0.082, 0.485], [0.086, 0.52], [0.055, 0.545],
];
export function balusterGeometry(height = 0.78, radialSegments = 10) {
  const g = new THREE.LatheGeometry(BALUSTER_POINTS.map(p => new THREE.Vector2(p[0], p[1] * (height / 0.545))), radialSegments);
  return g;
}

export function addBalustrade(parent, opts) {
  const {
    mat, x0, x1, z0, z1, y, height = 0.74, name = 'Balustrade',
    bottomRail = true, topRail = true, direction = 'x', spacing = 0.31,
  } = opts;
  const g = new THREE.Group(); g.name = name;
  const length = direction === 'x' ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
  const balH = height * 0.72;
  const bg = balusterGeometry(balH);
  const count = Math.max(2, Math.floor(length / spacing));
  const geos = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : (i + 0.5) / count;
    const m = new THREE.Matrix4();
    if (direction === 'x') m.makeTranslation(THREE.MathUtils.lerp(x0, x1, t), y + height * 0.12, z0);
    else m.makeTranslation(x0, y + height * 0.12, THREE.MathUtils.lerp(z0, z1, t));
    geos.push(bg.clone().applyMatrix4(m));
  }
  const merged = mergeGeometries(geos, false);
  const mesh = new THREE.Mesh(merged, mat);
  mesh.castShadow = true; mesh.receiveShadow = true;
  g.add(mesh);
  const railH = height * 0.14;
  if (bottomRail) {
    if (direction === 'x') box(g, mat, length + 0.2, railH, 0.24, (x0 + x1) / 2, y + height * 0.07, z0);
    else box(g, mat, 0.24, railH, length + 0.2, x0, y + height * 0.07, (z0 + z1) / 2);
  }
  if (topRail) {
    if (direction === 'x') box(g, mat, length + 0.3, railH * 1.15, 0.30, (x0 + x1) / 2, y + height - railH * 0.35, z0);
    else box(g, mat, 0.30, railH * 1.15, length + 0.3, x0, y + height - railH * 0.35, (z0 + z1) / 2);
  }
  parent.add(g);
  return g;
}

// Merge all meshes below a group into one mesh per material. The group transform
// and its metadata are retained, which keeps floor toggles and layout fixes cheap.
export function mergeGroup(root, opts = {}) {
  root.updateMatrixWorld(true);
  const invRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const meshes = [];
  root.traverse(o => {
    if (o.isMesh && o.geometry && o.visible && o.userData.noMerge !== true) meshes.push(o);
  });
  for (const mesh of meshes) {
    const mat = mesh.material;
    if (!mat || Array.isArray(mat)) continue;
    if (mat.transparent && mat.depthWrite === false && opts.skipTransparent) continue;
    const key = mat.uuid;
    if (!buckets.has(key)) buckets.set(key, { mat, geos: [], cast: false, receive: false, renderOrder: mesh.renderOrder });
    const b = buckets.get(key);
    let g = mesh.geometry.clone();
    for (const name of Object.keys(g.attributes)) {
      if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    }
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) {
      const count = g.attributes.position.count;
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
    }
    // Keep geometry indexed wherever possible. Non-indexed meshes balloon the
    // GLB to several times its necessary size; welding shared vertices fixes it.
    if (!g.index) {
      try { g = mergeVertices(g, 1e-4); } catch (e) { /* keep non-indexed */ }
    }
    const local = new THREE.Matrix4().multiplyMatrices(invRoot, mesh.matrixWorld);
    g.applyMatrix4(local);
    b.geos.push(g);
    b.cast = b.cast || mesh.castShadow;
    b.receive = b.receive || mesh.receiveShadow;
    b.renderOrder = Math.max(b.renderOrder, mesh.renderOrder);
  }
  // Remove all old content, preserving transform & metadata.
  root.clear();
  let count = 0;
  for (const b of buckets.values()) {
    if (!b.geos.length) continue;
    let geos = b.geos;
    if (geos.some(g => !g.index)) geos = geos.map(g => g.index ? g.toNonIndexed() : g);
    let merged;
    try { merged = mergeGeometries(geos, false); } catch (e) { console.warn('merge failed', e); merged = null; }
    if (!merged) {
      for (const g of geos) {
        const m = new THREE.Mesh(g, b.mat); m.castShadow = b.cast; m.receiveShadow = b.receive; root.add(m); count++;
      }
      continue;
    }
    const mesh = new THREE.Mesh(merged, b.mat);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = b.receive;
    mesh.renderOrder = b.renderOrder;
    mesh.name = `${root.name || 'Merged'}_${b.mat.name || 'mat'}`;
    root.add(mesh);
    count++;
  }
  return { meshes: count, sourceMeshes: meshes.length };
}

export function makeBoxGeometry(w, h, d) { return new THREE.BoxGeometry(w, h, d); }

/** A warm stone step run. */
export function addStoneSteps(parent, M, x, z, width, yBase, yTop, steps, depth, opts = {}) {
  const g = new THREE.Group();
  const totalRise = yTop - yBase;
  for (let i = 0; i < steps; i++) {
    const h = totalRise * (i + 1) / steps;
    const d = depth * (steps - i) / steps;
    const zz = z + (depth - d) / 2;
    box(g, M.baseStone, width, h, d, x, yBase + h / 2, zz);
    box(g, M.whiteStone, width + 0.05, 0.045, d + 0.03, x, yBase + h + 0.02, zz, { cast: false });
  }
  parent.add(g);
  return g;
}

/** Raised panel moulding around a wall panel. */
export function addPanelFrame(parent, M, x, y, z, w, h, ry = 0, depth = 0.045) {
  const g = new THREE.Group();
  g.position.set(x, y, z); g.rotation.y = ry;
  const t = 0.045;
  box(g, M.whiteTrim, w, t, depth, 0, h / 2, 0);
  box(g, M.whiteTrim, w, t, depth, 0, -h / 2, 0);
  box(g, M.whiteTrim, t, h, depth, -w / 2, 0, 0);
  box(g, M.whiteTrim, t, h, depth, w / 2, 0, 0);
  box(g, M.whiteTrim, w * 0.42, t * 0.7, depth * 0.8, 0, h * 0.18, 0);
  parent.add(g);
  return g;
}

export function addDentils(parent, M, x0, x1, y, z, dir = 'x', count = 18) {
  const g = new THREE.Group();
  const n = count;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    if (dir === 'x') box(g, M.whiteStone, (x1 - x0) / n * 0.42, 0.17, 0.20, THREE.MathUtils.lerp(x0, x1, t), y, z);
    else box(g, M.whiteStone, 0.20, 0.17, (x1 - x0) / n * 0.42, z, y, THREE.MathUtils.lerp(x0, x1, t));
  }
  parent.add(g);
  return g;
}

export function addCorbel(parent, M, x, y, z, scale = 1, ry = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z); g.rotation.y = ry; g.scale.setScalar(scale);
  box(g, M.whiteStone, 0.26, 0.18, 0.48, 0, 0.08, 0);
  box(g, M.whiteStone, 0.22, 0.38, 0.30, 0, -0.18, -0.02);
  const p = lathe(g, M.whiteStone, [[0.01, 0], [0.09, 0.02], [0.12, 0.16], [0.05, 0.34], [0.015, 0.4]], 10, 0, -0.38, 0.05);
  p.rotation.x = Math.PI;
  parent.add(g);
  return g;
}

/** A classical column with base, shaft and composite capital. */
export function addColumn(parent, M, x, z, baseY, height, radius = 0.23, opts = {}) {
  const g = new THREE.Group();
  g.position.set(x, baseY, z);
  const h = height;
  const shaftBottom = 0.28;
  const shaftTop = h - 0.42;
  const shaftH = shaftTop - shaftBottom;
  // plinth, torus and shaft
  box(g, M.whiteStone, radius * 3.0, 0.13, radius * 3.0, 0, 0.065, 0);
  cylinder(g, M.whiteStone, radius * 1.48, radius * 1.64, 0.14, 20, 0, 0.20, 0);
  torus(g, M.whiteStone, radius * 0.86, 0.028, 0, 0.29, 0, { rx: Math.PI / 2, radial: 20, tubular: 6 });
  cylinder(g, M.whiteStone, radius * 0.92, radius * 1.0, shaftH, 24, 0, shaftBottom + shaftH / 2, 0);
  // shallow fluting
  const fluteCount = 16;
  for (let i = 0; i < fluteCount; i++) {
    const a = (i / fluteCount) * Math.PI * 2;
    const r = radius * 0.972;
    const m = box(g, M.whiteStone, 0.014, shaftH * 0.94, 0.01,
      Math.cos(a) * r, shaftBottom + shaftH / 2, Math.sin(a) * r);
    m.rotation.y = -a;
    m.castShadow = false;
  }
  torus(g, M.whiteStone, radius * 0.98, 0.032, 0, shaftTop, 0, { rx: Math.PI / 2, radial: 20 });
  // composite capital
  cylinder(g, M.whiteStone, radius * 1.24, radius * 0.96, 0.16, 20, 0, shaftTop + 0.10, 0);
  box(g, M.whiteStone, radius * 2.55, 0.055, radius * 2.55, 0, shaftTop + 0.21, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    sphere(g, M.whiteStone, radius * 0.32, sx * radius * 0.78, shaftTop + 0.22, sz * radius * 0.78, { w: 10, h: 8 });
  }
  box(g, M.whiteStone, radius * 2.9, 0.10, radius * 2.9, 0, h - 0.10, 0);
  torus(g, M.whiteStone, radius * 1.18, 0.024, 0, shaftTop + 0.27, 0, { rx: Math.PI / 2, radial: 24 });
  g.name = opts.name || 'Classical_Column';
  parent.add(g);
  return g;
}

export function addPilaster(parent, M, x, z, baseY, height, width = 0.55, depth = 0.16, ry = 0) {
  const g = new THREE.Group();
  g.position.set(x, baseY, z); g.rotation.y = ry;
  box(g, M.whiteStone, width * 1.25, 0.14, depth + 0.08, 0, 0.07, 0);
  box(g, M.whiteStone, width, height * 0.78, depth, 0, height * 0.39 + 0.12, 0);
  for (let i = -2; i <= 2; i++) {
    box(g, M.whiteStone, width * 0.11, height * 0.7, depth + 0.025, i * width * 0.16, height * 0.39 + 0.12, 0.008);
  }
  box(g, M.whiteStone, width * 1.35, 0.18, depth + 0.10, 0, height * 0.79, 0);
  box(g, M.whiteStone, width * 1.6, 0.15, depth + 0.18, 0, height * 0.88, 0);
  box(g, M.whiteStone, width * 1.45, 0.10, depth + 0.13, 0, height * 0.82, 0);
  parent.add(g);
  return g;
}

export function addUrn(parent, M, x, y, z, scale = 1, opts = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(scale);
  const profile = [
    [0.0, 0], [0.28, 0], [0.30, 0.035], [0.18, 0.09], [0.14, 0.16], [0.24, 0.34],
    [0.31, 0.48], [0.27, 0.60], [0.16, 0.69], [0.19, 0.72], [0.29, 0.76], [0.25, 0.80],
  ];
  lathe(g, M.whiteStone, profile, 20, 0, 0, 0);
  torus(g, M.whiteStone, 0.18, 0.025, 0, 0.57, 0);
  if (opts.flowers) {
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2;
      tube(g, M.leavesFresh, [new THREE.Vector3(0, .78, 0), new THREE.Vector3(Math.cos(a) * .12, 1.0 + (i % 3) * .04, Math.sin(a) * .12), new THREE.Vector3(Math.cos(a) * .24, 1.08 + (i % 4) * .04, Math.sin(a) * .24)], 0.006, 0, 0, 0, { radial: 4, segments: 6 });
      sphere(g, M.flowers[i % M.flowers.length], 0.035, Math.cos(a) * .24, 1.10 + (i % 4) * .04, Math.sin(a) * .24, { w: 7, h: 5 });
    }
  }
  parent.add(g);
  return g;
}

// deterministic layout / decor random
export function seeded(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function setShadow(group, cast = true, receive = true) {
  group.traverse(o => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = receive; } });
  return group;
}
