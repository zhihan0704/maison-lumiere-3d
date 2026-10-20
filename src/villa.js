import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createMaterials, MATERIAL_NOTES } from './materials.js';
import {
  FLOORS, HOUSE, ROOF_BASE, SITE, mergeGroup, setShadow,
  addBalustrade,
} from './geom.js';
import {
  buildFloorBase, buildFloorShell, buildRoof, buildStair, buildExteriorDetails,
  stairwellRailing, buildFloorCutWalls,
} from './architecture.js';
import { buildGardens, GARDEN_LABELS } from './gardens.js';
import { buildInteriors } from './rooms.js';

function floorTitle(f) {
  return `${f.name} · ${f.label}`;
}

export async function buildVilla(opts = {}) {
  const progress = opts.onProgress || (() => {});
  progress(.04, '生成 PBR 材质');
  const M = createMaterials();
  const root = new THREE.Group();
  root.name = 'Maison_Lumiere_Villa';

  progress(.30, '构筑三层石构立面');
  const floorGroups = [];
  const cutShells = [];
  const stairRoot = new THREE.Group();
  stairRoot.name = 'Staircase';
  stairRoot.userData = { type: 'stairs', alwaysVisible: true };
  for (let i = 0; i < 3; i++) {
    const f = FLOORS[i];
    const fg = new THREE.Group();
    fg.name = `Floor_${i}`;
    fg.userData = { type: 'floor', index: i, id: f.id, name: f.name, nameFr: f.nameFr, base: f.base, height: f.height };
    const base = buildFloorBase(M, i);
    base.name = `FloorBase_${i}`;
    const shell = buildFloorShell(M, i);
    shell.name = `Architecture_${i}`;
    const cutWalls = buildFloorCutWalls(M, i);
    cutWalls.name = `ArchitectureCut_${i}`;
    cutWalls.visible = false;
    fg.add(base, shell, cutWalls);
    cutShells.push(shell);
    if (i < 2) {
      const stair = buildStair(M, i);
      if (stair) {
        mergeGroup(stair);
        stairRoot.add(stair);
      }
    }
    if (i > 0) {
      const rail = stairwellRailing(M, i);
      if (rail) {
        mergeGroup(rail);
        fg.add(rail);
      }
    }
    floorGroups.push(fg);
    root.add(fg);
    progress(.30 + i * .10, `完成${f.name}结构`);
  }
  root.add(stairRoot);

  progress(.62, '布置法式庭院与景观');
  const landscape = buildGardens(M);
  landscape.name = 'Landscape';
  root.add(landscape);

  progress(.76, '陈设二十个室内空间');
  const interiors = buildInteriors(M, floorGroups, cutShells);
  // preserve room metadata in the GLB nodes for downstream use
  for (const room of interiors.rooms) {
    const rg = floorGroups[room.floor].getObjectByName(`Room_${room.id}`);
    if (rg) {
      rg.userData = {
        type: 'room', id: room.id, name: room.name, nameFr: room.nameFr,
        floor: room.floor, area: room.area, description: room.description,
        features: room.features, palette: room.palette,
      };
    }
  }

  progress(.87, '安装屋顶、老虎窗与烟囱');
  const roof = buildRoof(M);
  roof.name = 'Roof';
  setShadow(roof, true, true);
  mergeGroup(roof);
  root.add(roof);

  progress(.91, '完成柱廊、阳台与入口');
  const exteriors = new THREE.Group();
  exteriors.name = 'ExteriorDetails';
  exteriors.userData = { type: 'exterior', hideInFloorView: true };
  buildExteriorDetails(M, exteriors, landscape);
  setShadow(exteriors, true, true);
  mergeGroup(exteriors);
  exteriors.userData.hideInFloorView = true;
  root.add(exteriors);

  // tidy the landscape additions that were made after its merge (portico steps)
  const late = [];
  for (const child of [...landscape.children]) {
    if (!child.userData?.merged && child.type === 'Group') {
      mergeGroup(child);
      child.userData.merged = true;
    }
  }

  progress(.95, '几何校验与自动修正');
  for (const fg of floorGroups) {
    fg.traverse(o => {
      if (o.isMesh) {
        o.castShadow = o.material?.transparent ? false : true;
        o.receiveShadow = true;
      }
    });
  }
  // Preserve a serialisable snapshot of room + floor metadata on the root.
  root.userData = {
    title: 'Maison Lumière · 卢米埃庄园',
    subtitle: 'A Three-Storey French Villa',
    version: '1.0.0',
    architect: 'Procedural Atelier',
    units: 'metres',
    dimensions: { width: 27.4, depth: 17.3, height: 17.2, site: [SITE.halfX * 2, SITE.halfZ * 2] },
    floors: FLOORS.map(f => ({ index: f.index, id: f.id, name: f.name, nameFr: f.nameFr, base: f.base, height: f.height, label: f.label })),
  };

  progress(.98, '准备导出数据');
  const stats = inspectScene(root);
  const manifest = makeManifest(interiors, M, stats);
  return { root, M, floors: floorGroups, landscape, roof, exteriors, interiors, stats, manifest };
}

export function makeManifest(interiors, M, stats) {
  const rooms = interiors.rooms.map(r => ({
    id: r.id, name: r.name, nameFr: r.nameFr, floor: r.floor, floorName: r.floorName,
    area: r.area, bounds: r.bounds, label3: r.label3, description: r.description,
    features: r.features, palette: r.palette, areaLabel: r.areaLabel,
  }));
  return {
    schema: 'maison-lumiere/v1',
    title: 'Maison Lumière · 卢米埃庄园',
    subtitle: 'A Three-Storey French Villa',
    generated: new Date().toISOString(),
    dimensions: { width: '27.4 m', depth: '17.3 m', height: '17.2 m', site: '54 × 62 m' },
    floors: FLOORS.map(f => ({
      index: f.index, id: f.id, name: f.name, nameFr: f.nameFr, base: f.base, height: f.height,
      label: f.label, description: f.description,
      rooms: rooms.filter(r => r.floor === f.index).map(r => r.id),
    })),
    rooms,
    gardenLabels: GARDEN_LABELS,
    materials: MATERIAL_NOTES,
    validation: interiors.validation,
    stats,
    cameraPresets: {
      hero: { position: [39, 23, 43], target: [0, 5.1, 1.5], fov: 33 },
      front: { position: [0, 11.5, 45], target: [0, 6.4, 0], fov: 31 },
      rear: { position: [0, 10.5, -43], target: [0, 5.2, -3], fov: 33 },
      aerial: { position: [30, 34, 32], target: [0, 3.5, 0], fov: 35 },
    },
  };
}

export function inspectScene(root) {
  let meshes = 0, triangles = 0, vertices = 0, instanced = 0;
  const materials = new Set(), textures = new Set();
  root.updateMatrixWorld(true);
  root.traverse(o => {
    if (o.isMesh) {
      meshes++;
      const g = o.geometry;
      if (!g) return;
      if (g.index) triangles += g.index.count / 3;
      else if (g.attributes.position) triangles += g.attributes.position.count / 3;
      if (g.attributes.position) vertices += g.attributes.position.count;
      if (o.isInstancedMesh) instanced += o.count;
      if (o.material) for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        materials.add(m.uuid);
        for (const key of ['map', 'normalMap', 'roughnessMap', 'emissiveMap', 'aoMap']) {
          if (m[key] && m[key].image) textures.add(m[key].image);
        }
      }
    }
  });
  return {
    meshes, triangles: Math.round(triangles), vertices, instanced,
    materials: materials.size, textures: textures.size,
    floors: 3, rooms: 20, gardenArea: '约 2,900 m²',
    render: 'PBR · realtime shadows · ACES tone mapping',
  };
}

export async function exportGLB(root) {
  const exporter = new GLTFExporter();
  const original = [];
  root.traverse(o => { original.push([o, o.visible]); if (o.visible === false) o.visible = true; });
  const arrayBuffer = await new Promise((resolve, reject) => {
    exporter.parse(root, resolve, reject, {
      binary: true, onlyVisible: true, trs: false, maxTextureSize: 1024,
      includeCustomExtensions: false,
    });
  });
  for (const [o, v] of original) o.visible = v;
  return arrayBuffer;
}

export function countScene(root) {
  return inspectScene(root);
}
