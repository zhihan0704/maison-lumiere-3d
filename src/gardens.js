import * as THREE from 'three';
import {
  SITE, HOUSE, box, roundedBox, cylinder, sphere, plane, torus, lathe, tube,
  addBalustrade, addUrn, addStoneSteps, addColumn, seeded, mergeGroup, setShadow,
} from './geom.js';
import {
  outdoorSofa, gardenBench, gardenDining, sunLounger, pottedPlant, birdbath, statue,
  parseChair,
} from './furniture.js';
import { buildRearTerrace } from './architecture.js';

const PI = Math.PI;
const grp = (name) => { const g = new THREE.Group(); g.name = name; return g; };

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function paved(group, mat, w, d, x, z, y = .018, uvScale = 2.2) {
  const geo = new THREE.PlaneGeometry(w, d);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / uvScale, uv.getY(i) * d / uvScale);
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -PI / 2; m.position.set(x, y, z); m.receiveShadow = true;
  group.add(m);
  return m;
}

function pavingWithJoints(group, M, w, d, x, z, y = .02, uvs = 2.2) {
  paved(group, M.granite, w, d, x, z, y, uvs);
  // darkened granite joints
  const nX = Math.ceil(w / 2.1), nZ = Math.ceil(d / 2.1);
  for (let i = 1; i < nX; i++) {
    const xx = x - w / 2 + i * w / nX;
    box(group, M.graniteDark, .022, .004, d, xx, y + .012, z, { cast: false });
  }
  for (let j = 1; j < nZ; j++) {
    const zz = z - d / 2 + j * d / nZ;
    box(group, M.graniteDark, w, .004, .022, x, y + .012, zz, { cast: false });
  }
  // pale limestone border
  const t = .16;
  box(group, M.whiteStone, w + .12, .055, t, x, y + .012, z - d / 2 - .02, { cast: false });
  box(group, M.whiteStone, w + .12, .055, t, x, y + .012, z + d / 2 + .02, { cast: false });
  box(group, M.whiteStone, t, .055, d, x - w / 2 - .02, y + .012, z, { cast: false });
  box(group, M.whiteStone, t, .055, d, x + w / 2 + .02, y + .012, z, { cast: false });
}

function hedgeBlock(group, M, w, h, d, x, z, y = .0, ry = 0) {
  const g = grp('Clipped_Boxwood_Hedge');
  g.position.set(x, y, z); g.rotation.y = ry;
  roundedBox(g, M.hedge, w, h, d, Math.min(.14, h * .32), 0, h / 2, 0, { segments: 2, cast: true });
  const rand = seeded(Math.round((x + 100) * 7 + (z + 100) * 13));
  const n = Math.max(4, Math.round(w * d * 1.2));
  for (let i = 0; i < n; i++) {
    const sx = (rand() - .5) * (w - .15), sz = (rand() - .5) * (d - .15);
    const s = .08 + rand() * .1;
    sphere(g, M.hedge, s, sx, h - .02 + rand() * .04, sz, { sx: 1.4, sy: .6, sz: 1.1, w: 6, h: 4 });
  }
  group.add(g);
  return g;
}

function topiaryCone(group, M, x, z, scale = 1, baseY = 0) {
  const g = grp('Topiary_Cone');
  g.position.set(x, baseY, z); g.scale.setScalar(scale);
  // terracotta or clipped form
  const geo = new THREE.ConeGeometry(.48, 1.75, 12, 4, false);
  const cone = new THREE.Mesh(geo, M.hedge);
  cone.position.y = .88; cone.castShadow = true; cone.receiveShadow = true; g.add(cone);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * PI * 2 + (i % 3) * .4;
    const yy = .15 + (i % 6) * .26;
    const r = .43 * (1 - yy / 1.9);
    sphere(g, M.hedge, .10 + (i % 3) * .025, Math.cos(a) * r, yy, Math.sin(a) * r, { sx: 1.3, sy: .75, sz: 1.1, w: 6, h: 4 });
  }
  cylinder(g, M.terracotta, .25, .3, .28, 16, 0, .14, 0);
  group.add(g);
  return g;
}

function topiaryBall(group, M, x, z, r = .45, baseY = 0, pot = false) {
  const g = grp('Topiary_Ball');
  g.position.set(x, baseY, z);
  sphere(g, M.hedge, r, 0, r + (pot ? .3 : 0), 0, { w: 14, h: 10 });
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * PI * 2, b = (i % 4) / 4 * PI;
    const rr = r * .97;
    sphere(g, M.hedge, .075, Math.cos(a) * Math.cos(b) * rr, r + (pot ? .3 : 0) + Math.sin(b) * rr, Math.sin(a) * Math.cos(b) * rr, { sx: 1.3, sy: .8, sz: 1.1, w: 5, h: 4 });
  }
  if (pot) lathe(g, M.terracotta, [[0, 0], [.32, 0], [.38, .04], [.33, .36], [.38, .38], [0, .38]], 18, 0, 0, 0);
  group.add(g);
  return g;
}

function columnarTree(group, M, x, z, height = 5.3, seed = 1) {
  const g = grp('Columnar_Tree');
  g.position.set(x, 0, z);
  const rand = seeded(seed);
  cylinder(g, M.bark, .12, .22, height * .55, 8, 0, height * .28, 0);
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * PI * 2 + .4;
    tube(g, M.bark, [new THREE.Vector3(0, height * .35, 0), new THREE.Vector3(Math.cos(a) * .4, height * .55, Math.sin(a) * .4), new THREE.Vector3(Math.cos(a) * .55, height * .7, Math.sin(a) * .55)], .055, 0, 0, 0, { radial: 5, segments: 4 });
  }
  for (let i = 0; i < 18; i++) {
    const a = rand() * PI * 2, rr = rand() * .52;
    const leaf = i % 6 === 0 ? M.foliageDeep : (i % 5 === 0 ? M.foliageGold : M.foliage);
    sphere(g, leaf, .52 + rand() * .32, Math.cos(a) * rr, height * .53 + rand() * height * .4, Math.sin(a) * rr, { sx: .9, sy: 1.3, sz: .9, w: 8, h: 6 });
  }
  for (let i = 0; i < 12; i++) {
    const a = rand() * PI * 2, rr = rand() * .58;
    sphere(g, i % 3 === 0 ? M.foliageGold : M.foliageLight, .2 + rand() * .2, Math.cos(a) * rr, height * .58 + rand() * height * .35, Math.sin(a) * rr, { sx: 1, sy: 1.2, sz: 1, w: 6, h: 5 });
  }
  group.add(g);
  return g;
}

function floweringTree(group, M, x, z, h = 4.1, seed = 3) {
  const g = grp('Flowering_Tree');
  g.position.set(x, 0, z);
  const rand = seeded(seed);
  cylinder(g, M.bark, .1, .19, h * .62, 8, 0, h * .31, 0);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * PI * 2;
    tube(g, M.bark, [new THREE.Vector3(0, h * .45, 0), new THREE.Vector3(Math.cos(a) * .35, h * .58, Math.sin(a) * .35), new THREE.Vector3(Math.cos(a) * .55, h * .72, Math.sin(a) * .55)], .045, 0, 0, 0, { radial: 4, segments: 4 });
  }
  for (let i = 0; i < 20; i++) {
    const a = rand() * PI * 2, rr = rand() * .9;
    const leaf = i % 7 === 0 ? M.flowers[0] : (i % 4 === 0 ? M.foliageGold : (i % 3 === 0 ? M.foliageLight : M.foliage));
    sphere(g, leaf, .34 + rand() * .25, Math.cos(a) * rr, h * .59 + rand() * h * .32, Math.sin(a) * rr, { sx: 1.2, sy: .9, sz: 1.1, w: 8, h: 6 });
  }
  for (let i = 0; i < 5; i++) {
    const a = rand() * PI * 2, rr = .3 + rand() * .55;
    sphere(g, i % 2 ? M.blossomWhite : M.flowers[0], .07 + rand() * .05, Math.cos(a) * rr, h * .7 + rand() * h * .2, Math.sin(a) * rr, { sx: 1.2, sy: .8, sz: 1.1, w: 6, h: 5, cast: false });
  }
  group.add(g);
  return g;
}

function flowerBed(group, M, x0, x1, z0, z1, y = .07, opts = {}) {
  const g = grp('Flower_Bed');
  const rand = seeded(opts.seed ?? 8);
  const w = x1 - x0, d = z1 - z0;
  box(g, M.soil, w, .05, d, (x0 + x1) / 2, y, (z0 + z1) / 2, { cast: false });
  const kind = opts.kind || 'lavender';
  const density = opts.density ?? .55;
  const count = Math.floor(w * d * density * 4.2);
  for (let i = 0; i < count; i++) {
    const x = x0 + .15 + rand() * (w - .3);
    const z = z0 + .15 + rand() * (d - .3);
    if (kind === 'lavender') {
      cylinder(g, M.leavesFresh, .011, .016, .3 + rand() * .2, 4, x, y + .17, z);
      const yy = y + .34 + rand() * .18;
      for (let j = 0; j < 4; j++) sphere(g, M.flowers[2], .027 + rand() * .016, x + (rand() - .5) * .055, yy + j * .06, z + (rand() - .5) * .055, { sx: .8, sy: 1.7, sz: .8, w: 6, h: 4, cast: false });
    } else if (kind === 'rose') {
      cylinder(g, M.leavesFresh, .009, .013, .3 + rand() * .22, 4, x, y + .15, z);
      sphere(g, M.foliage, .075 + rand() * .045, x, y + .28, z, { sx: 1.3, sy: .8, sz: 1.2, w: 6, h: 4, cast: false });
      for (let f = 0; f < 3; f++) sphere(g, M.flowers[i % 2 === 0 ? 0 : 1], .045 + rand() * .028, x + (rand() - .5) * .14, y + .35 + rand() * .14, z + (rand() - .5) * .14, { w: 7, h: 5, cast: false });
    } else {
      cylinder(g, M.leavesFresh, .01, .014, .24 + rand() * .12, 4, x, y + .14, z);
      for (let f = 0; f < 2; f++) sphere(g, M.flowers[(i + f) % 4], .038 + rand() * .024, x + (rand() - .5) * .08, y + .3 + rand() * .1, z + (rand() - .5) * .08, { w: 6, h: 4, cast: false });
    }
  }
  group.add(g);
  return g;
}

/* A layered, low planting pocket: dark structural foliage, mid greens,
   golden tips and a few taller flowering spires. */
function understoryPlanting(group, M, x, z, radius = .9, seed = 1, opts = {}) {
  const g = grp('Layered_Planting');
  g.position.set(x, 0, z);
  const rand = seeded(seed);
  const greens = [M.foliageDeep, M.foliage, M.foliageGold, M.foliageLight];
  for (let i = 0; i < 8; i++) {
    const a = rand() * PI * 2, rr = Math.sqrt(rand()) * radius * .72;
    sphere(g, greens[i % greens.length], .24 + rand() * .4, Math.cos(a) * rr, .16 + rand() * .44, Math.sin(a) * rr, {
      sx: 1.35, sy: .66, sz: 1.2, w: 7, h: 5, cast: false,
    });
  }
  for (let i = 0; i < 10; i++) {
    const a = rand() * PI * 2, rr = radius * (.55 + rand() * .42);
    const h = .28 + rand() * .44;
    cylinder(g, M.leavesFresh, .008, .014, h, 4, Math.cos(a) * rr, .18, Math.sin(a) * rr);
    sphere(g, i % 4 === 3 ? M.blossomWhite : M.flowers[i % 4], .035 + rand() * .026, Math.cos(a) * rr, .2 + h, Math.sin(a) * rr, {
      sx: .82, sy: 1.5, sz: .82, w: 5, h: 4, cast: false,
    });
  }
  if (opts.hydrangea) {
    for (let i = 0; i < 5; i++) {
      const a = rand() * PI * 2, rr = rand() * radius * .55;
      const mat = i % 2 ? M.blossomBlue : M.blossomWhite;
      sphere(g, M.foliageDeep, .19 + rand() * .12, Math.cos(a) * rr, .28 + rand() * .15, Math.sin(a) * rr, { sx: 1.3, sy: .7, sz: 1.2, w: 6, h: 4, cast: false });
      for (let j = 0; j < 4; j++) {
        sphere(g, mat, .06 + rand() * .035, Math.cos(a) * rr + (rand() - .5) * .28, .43 + rand() * .16, Math.sin(a) * rr + (rand() - .5) * .28, {
          sx: 1.1, sy: .8, sz: 1.1, w: 5, h: 4, cast: false,
        });
      }
    }
  }
  if (opts.rose) {
    for (let i = 0; i < 7; i++) {
      const a = rand() * PI * 2, rr = rand() * radius * .7;
      sphere(g, M.flowers[i % 2], .04 + rand() * .03, Math.cos(a) * rr, .4 + rand() * .3, Math.sin(a) * rr, { w: 6, h: 4, cast: false });
    }
  }
  group.add(g);
  return g;
}

/* A lightweight iron rose arch spanning a side path. */
function roseArch(group, M, x, z) {
  const g = grp('Rose_Arch');
  g.position.set(x, 0, z);
  const points = [];
  for (let i = 0; i <= 16; i++) {
    const a = i / 16 * PI;
    points.push(new THREE.Vector3(Math.cos(a) * 1.48, Math.sin(a) * 2.85, 0));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  const frame = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, .045, 5, false), M.ironGate);
  frame.castShadow = true; frame.receiveShadow = false; g.add(frame);
  for (let i = 1; i < 15; i++) {
    const t = i / 15;
    const p = curve.getPoint(t);
    const r = .12 + (i % 3) * .025;
    sphere(g, i % 5 === 0 ? M.foliageGold : (i % 3 === 0 ? M.foliageDeep : M.foliage), r, p.x, p.y, p.z, {
      sx: 1.1, sy: 1.25, sz: .7, w: 6, h: 4, cast: false,
    });
    if (i % 2 === 0) {
      sphere(g, i % 4 === 0 ? M.flowers[0] : M.blossomWhite, .045, p.x + .08, p.y + .04, p.z + .05, { w: 5, h: 4, cast: false });
    }
  }
  for (const s of [-1, 1]) {
    understoryPlanting(g, M, s * 1.55, 0, .46, 410 + Math.round(x) + s, { rose: true });
  }
  group.add(g);
  return g;
}

function formalBench(group, M, x, z, ry) {
  const b = gardenBench(M);
  b.position.set(x, .01, z); b.rotation.y = ry;
  group.add(b);
}

function gardenLamp(group, M, x, z, h = 2.2) {
  const g = grp('Garden_Lamp');
  g.position.set(x, 0, z);
  cylinder(g, M.iron, .11, .16, .16, 10, 0, .08, 0);
  cylinder(g, M.iron, .025, .045, h, 8, 0, h / 2, 0);
  for (let i = 0; i < 3; i++) torus(g, M.iron, .12, .012, 0, .55 + i * .56, 0, { rx: PI / 2, radial: 16 });
  box(g, M.iron, .34, .48, .34, 0, h + .25, 0);
  box(g, M.bulb, .24, .34, .24, 0, h + .25, 0);
  box(g, M.iron, .42, .04, .42, 0, h + .51, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, M.iron, .025, .48, .025, sx * .18, h + .25, sz * .18);
  sphere(g, M.iron, .055, 0, h + .56, 0);
  group.add(g);
  return g;
}

function fountain(group, M, x, z, scale = 1) {
  const g = grp('Grand_Fountain');
  g.position.set(x, 0, z); g.scale.setScalar(scale);
  // basin profile: outer stone shell with a blue mosaic interior
  lathe(g, M.whiteStone, [
    [0, 0], [3.05, 0], [3.22, .05], [3.28, .48], [3.10, .55], [2.98, .52], [2.92, .17], [2.78, .17], [2.78, .10], [0, .10],
  ], 48, 0, 0, 0);
  // mosaic floor and water
  const mosaic = new THREE.Mesh(new THREE.CircleGeometry(2.76, 48), M.mosaic);
  mosaic.rotation.x = -PI / 2; mosaic.position.y = .16; g.add(mosaic);
  const water = new THREE.Mesh(new THREE.CircleGeometry(2.72, 48), M.water);
  water.rotation.x = -PI / 2; water.position.y = .30; g.add(water);
  // central pedestal + two-tier bowl
  lathe(g, M.whiteStone, [[0, .2], [.55, .2], [.68, .32], [.34, .55], [.28, .9], [.45, 1.15], [.22, 1.25], [.18, 1.42]], 24, 0, 0, 0);
  lathe(g, M.whiteStone, [[0, 0], [1.22, 0], [1.35, .07], [1.28, .29], [1.0, .34], [.24, .30], [0, .28]], 36, 0, 1.28, 0);
  const upperWater = new THREE.Mesh(new THREE.CircleGeometry(1.16, 36), M.water);
  upperWater.rotation.x = -PI / 2; upperWater.position.y = 1.50; g.add(upperWater);
  lathe(g, M.whiteStone, [[0, 0], [.3, 0], [.38, .05], [.2, .22], [.12, .38], [.16, .62], [.08, .72]], 18, 0, 1.32, 0);
  // sculptural finial
  cylinder(g, M.bronze, .055, .075, .56, 10, 0, 2.55, 0);
  sphere(g, M.bronze, .18, 0, 2.86, 0, { sy: 1.35 });
  for (const sx of [-1, 1]) tube(g, M.bronze, [new THREE.Vector3(0, 2.84, 0), new THREE.Vector3(sx * .25, 3.02, .02), new THREE.Vector3(sx * .38, 3.15, .02)], .035, 0, 0, 0, { radial: 5, segments: 5 });
  // four water jets
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * PI * 2 + PI / 4;
    const p0 = new THREE.Vector3(Math.cos(a) * 1.0, 1.5, Math.sin(a) * 1.0);
    const p1 = new THREE.Vector3(Math.cos(a) * 1.6, 2.0, Math.sin(a) * 1.6);
    const p2 = new THREE.Vector3(Math.cos(a) * 2.15, 1.2, Math.sin(a) * 2.15);
    const p3 = new THREE.Vector3(Math.cos(a) * 2.45, .32, Math.sin(a) * 2.45);
    const curve = new THREE.CatmullRomCurve3([p0, p1, p2, p3]);
    const jet = tube(g, M.waterJet, curve.points, .052, 0, 0, 0, { radial: 6, segments: 22 });
    jet.castShadow = false;
    for (let j = 0; j < 11; j++) {
      const p = curve.getPoint(.12 + j * .08);
      sphere(g, M.waterJet, .038 + (j % 3) * .012, p.x, p.y, p.z, { w: 6, h: 4, cast: false });
    }
  }
  // a central crown jet adds height and sparkle
  const centralCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 3.0, 0), new THREE.Vector3(0, 3.25, 0), new THREE.Vector3(0, 3.15, 0), new THREE.Vector3(0, 1.55, 0),
  ]);
  const centralJet = tube(g, M.waterJet, centralCurve.points, .04, 0, 0, 0, { radial: 6, segments: 18 });
  centralJet.castShadow = false;
  for (let j = 0; j < 10; j++) {
    const p = centralCurve.getPoint(j / 10);
    sphere(g, M.waterJet, .032, p.x + Math.sin(j) * .02, p.y, p.z + Math.cos(j) * .02, { w: 6, h: 4, cast: false });
  }
  // water lilies and gilded taps
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * PI * 2;
    const l = new THREE.Mesh(new THREE.CircleGeometry(.18, 14), M.foliage);
    l.rotation.x = -PI / 2; l.rotation.z = a; l.position.set(Math.cos(a) * 1.8, .31, Math.sin(a) * 1.8); g.add(l);
    if (i % 2 === 0) sphere(g, M.flowers[1], .06, Math.cos(a) * 1.8, .34, Math.sin(a) * 1.8, { sy: 1.25, w: 6, h: 4 });
  }
  // carved stone rim details
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * PI * 2;
    box(g, M.whiteStone, .16, .04, .3, Math.cos(a) * 3.02, .54, Math.sin(a) * 3.02, { ry: -a });
  }
  group.add(g);
  return g;
}

function reflectingPool(group, M) {
  const g = grp('Reflecting_Pool');
  const w = 10.8, d = 6.2, cx = 0, cz = -18.46;
  // basin
  box(g, M.whiteStone, w + .7, .16, d + .7, cx, .07, cz);
  box(g, M.graniteDark, w + .36, .1, d + .36, cx, .15, cz);
  box(g, M.mosaic, w, .03, d, cx, .18, cz);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(w - .1, d - .1), M.water);
  water.rotation.x = -PI / 2; water.position.set(cx, .28, cz); g.add(water);
  // stone coping
  for (const [ww, dd, xx, zz] of [[w + 1.1, .34, 0, d / 2 + .32], [w + 1.1, .34, 0, -d / 2 - .32], [.34, d + .98, w / 2 + .32, 0], [.34, d + .98, -w / 2 - .32, 0]]) {
    box(g, M.whiteStone, ww, .16, dd, xx, .12, zz);
  }
  for (let i = 0; i < 6; i++) {
    const x = -w / 2 + .5 + i * (w - 1) / 5;
    addUrn(g, M, x, .2, cz + d / 2 + .31, .55, {});
  }
  // small end fountains
  for (const sx of [-1, 1]) {
    const fg = grp('Pool_Fountain');
    fg.position.set(sx * 3.5, 0, cz);
    lathe(fg, M.whiteStone, [[0, 0], [.5, 0], [.56, .06], [.37, .2], [.32, .4], [.15, .45]], 20, 0, 0, 0);
    lathe(fg, M.whiteStone, [[0, 0], [.68, 0], [.74, .04], [.62, .12], [.12, .10]], 24, 0, .45, 0);
    cylinder(fg, M.bronze, .03, .04, .6, 8, 0, .7, 0);
    const jet = cylinder(fg, M.waterJet, .015, .05, .9, 8, 0, 1.25, 0, { cast: false });
    g.add(fg);
  }
  // end statue on plinth
  const st = statue(M);
  st.position.set(0, .15, cz - d / 2 - .95); st.rotation.y = 0;
  g.add(st);
  group.add(g);
  return g;
}

function pergolaPavilion(group, M, x, z, side = 1) {
  const g = grp('Garden_Pavilion');
  g.position.set(x, 0, z);
  // gravel floor
  paved(g, M.granite, 5.5, 4.3, 0, 0, .022, 1.8);
  // four white oak posts
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    box(g, M.oak, .17, 2.8, .17, sx * 2.15, 1.4, sz * 1.55);
    box(g, M.whiteStone, .38, .18, .38, sx * 2.15, .09, sz * 1.55);
    box(g, M.whiteStone, .28, .08, .28, sx * 2.15, 2.83, sz * 1.55);
  }
  // beams & rafters
  for (const sx of [-1, 1]) box(g, M.oak, 5.0, .16, .2, 0, 2.92, sx * 1.55);
  for (let i = 0; i < 9; i++) box(g, M.oak, .11, .12, 3.3, -2.2 + i * .55, 3.03, 0);
  for (let i = 0; i < 6; i++) {
    const sx = i % 2 ? 1 : -1;
    const sz = (i / 6) * 3 - 1.3;
    box(g, M.oak, .08, .08, 2.95, sx * 2.1, 2.72, sz);
  }
  // climbing roses on the pergola
  for (let i = 0; i < 18; i++) {
    const sideX = i % 2 ? 1 : -1;
    const yy = .25 + (i % 6) * .42;
    const zz = -1.4 + (i % 4) * .9;
    sphere(g, M.foliage, .17 + (i % 3) * .03, sideX * 2.1, yy, zz, { sx: .8, sy: 1.2, sz: 1, w: 6, h: 4 });
    if (i % 3 === 0) sphere(g, M.flowers[0], .06, sideX * 2.15, yy + .08, zz + .08, { w: 5, h: 4 });
  }
  for (let i = 0; i < 12; i++) {
    const x = -2.1 + (i % 6) * .84, z = i % 2 ? 1.5 : -1.5;
    sphere(g, i % 4 === 0 ? M.foliageDeep : M.foliage, .15, x, 2.84, z, { sx: 1.2, sy: .6, sz: 1, w: 6, h: 4 });
    if (i % 2) sphere(g, M.flowers[0], .055, x + .1, 2.9, z, { w: 5, h: 4 });
  }
  // layered wisteria canopy and hanging racemes add a soft lilac counterpoint
  for (let i = 0; i < 14; i++) {
    const x = -2.25 + (i % 7) * .75;
    const z = (i % 2 ? 1.32 : -1.32) + (i % 3 - 1) * .18;
    sphere(g, i % 4 === 0 ? M.foliageDeep : (i % 3 === 0 ? M.foliageGold : M.foliageLight), .16 + (i % 4) * .022, x, 3.04 + (i % 2) * .04, z, {
      sx: 1.45, sy: .48, sz: .9, w: 6, h: 4, cast: false,
    });
  }
  for (let i = 0; i < 9; i++) {
    const sideX = i % 2 ? 1 : -1;
    const zz = -1.15 + (i % 5) * .57;
    const xx = sideX * (2.08 + (i % 3) * .04);
    cylinder(g, M.leavesFresh, .008, .012, .62, 4, xx, 2.55, zz);
    for (let j = 0; j < 4; j++) {
      sphere(g, j < 3 ? M.wisteria : M.blossomWhite, .052 - j * .006, xx + (j % 2 ? .035 : -.025), 2.27 - j * .105, zz + (j % 2 ? .02 : -.02), {
        sx: .9, sy: 1.6, sz: .9, w: 5, h: 4, cast: false,
      });
    }
  }
  // white linen curtains loosely tied at posts
  const curtainMat = M.linenCream;
  for (const sx of [-1, 1]) {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(.8, 2.3, 8, 1), curtainMat);
    c.position.set(sx * 2.1, 1.55, -1.53); c.rotation.y = sx * .2; c.castShadow = true; g.add(c);
  }
  // furniture: dining on the east, lounge on the west
  if (side > 0) {
    const table = gardenDining(M);
    table.position.set(0, 0, 0); table.scale.setScalar(.9); g.add(table);
  } else {
    const sofa = outdoorSofa(M);
    sofa.position.set(0, .01, -.35); sofa.scale.setScalar(.92); g.add(sofa);
    const ct = grp('Outdoor_Coffee_Table');
    box(ct, M.marbleCool, 1.15, .06, .6, 0, .43, .05);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(ct, M.iron, .06, .4, .06, sx * .48, .2, sz * .22);
    ct.position.set(0, 0, .8); g.add(ct);
    for (const x of [-1.55, 1.55]) {
      const ch = parseChair(M); ch.position.set(x, 0, .85); ch.rotation.y = -x * .8; g.add(ch);
    }
    addVase(M, g, 0, .47, .05, .7);
  }
  // lanterns on posts
  for (const sx of [-1, 1]) {
    box(g, M.iron, .15, .38, .15, sx * 2.15, 2.45, -1.55);
    box(g, M.bulb, .10, .26, .10, sx * 2.15, 2.45, -1.55);
  }
  group.add(g);
  return g;
}

function addVase(M, parent, x, y, z, scale) {
  const v = groupVase(M);
  v.position.set(x, y, z); v.scale.setScalar(scale); parent.add(v);
}
function groupVase(M) {
  const g = grp('Urn_Arrangement');
  lathe(g, M.blueCeramic, [[0, 0], [.10, 0], [.15, .05], [.17, .15], [.11, .26], [.08, .3]], 18, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * PI * 2;
    tube(g, M.leavesFresh, [new THREE.Vector3(0, .28, 0), new THREE.Vector3(Math.cos(a) * .08, .55, Math.sin(a) * .08), new THREE.Vector3(Math.cos(a) * .14, .68, Math.sin(a) * .14)], .005, 0, 0, 0, { radial: 3, segments: 4 });
    sphere(g, M.flowers[i % 3], .035, Math.cos(a) * .14, .7, Math.sin(a) * .14, { w: 7, h: 5 });
  }
  return g;
}

function perimeter(group, M) {
  const g = grp('Garden_Perimeter');
  // low stone wall with clipped hedge and regular piers
  const segments = [
    { axis: 'x', fixed: 30.2, from: -25.6, to: 25.6, gate: true },
    { axis: 'x', fixed: -29.6, from: -25.6, to: 25.6 },
    { axis: 'z', fixed: -25.6, from: -29.6, to: 30.2 },
    { axis: 'z', fixed: 25.6, from: -29.6, to: 30.2 },
  ];
  for (const s of segments) {
    const len = s.to - s.from;
    if (s.axis === 'x') {
      const c = (s.from + s.to) / 2;
      if (s.gate) {
        const wing = (len - 8.7) / 2;
        for (const sx of [-1, 1]) {
          const cx = sx * (4.35 + wing / 2);
          box(g, M.baseStone, wing, .48, .42, cx, .24, s.fixed);
          hedgeBlock(g, M, wing, 1.15, .8, cx, s.fixed - .45, 0);
        }
      } else {
        box(g, M.baseStone, len, .48, .42, c, .24, s.fixed);
        hedgeBlock(g, M, len, 1.15, .8, c, s.fixed - .45, 0);
      }
      for (let x = s.from + 2; x < s.to - 1; x += 6.2) {
        if (s.gate && Math.abs(x) < 5.0) continue;
        box(g, M.whiteStone, .65, 2.2, .65, x, 1.1, s.fixed);
        box(g, M.whiteStone, .82, .15, .82, x, 2.25, s.fixed);
        sphere(g, M.whiteStone, .13, x, 2.35, s.fixed);
      }
    } else {
      box(g, M.baseStone, .42, .48, len, s.fixed, .24, (s.from + s.to) / 2);
      hedgeBlock(g, M, .8, 1.15, len, s.fixed - .45 * Math.sign(s.fixed), (s.from + s.to) / 2, 0);
      for (let z = s.from + 2; z < s.to - 1; z += 6.2) {
        box(g, M.whiteStone, .65, 2.2, .65, s.fixed, 1.1, z);
        box(g, M.whiteStone, .82, .15, .82, s.fixed, 2.25, z);
        sphere(g, M.whiteStone, .13, s.fixed, 2.35, z);
      }
    }
  }
  // front gate piers and gilded gate
  for (const sx of [-1, 1]) {
    box(g, M.whiteStone, 1.15, 3.0, 1.15, sx * 4.35, 1.5, 30.2);
    box(g, M.whiteStone, 1.35, .18, 1.35, sx * 4.35, 3.08, 30.2);
    box(g, M.baseStone, 1.25, .3, 1.25, sx * 4.35, .15, 30.2);
    addUrn(g, M, sx * 4.35, 3.28, 30.2, 1.35, { flowers: true });
  }
  // open wrought iron leaves
  for (const dir of [-1, 1]) {
    const leafG = grp('Gate_Leaf');
    leafG.position.set(dir * 4.72, .2, 30.2);
    leafG.rotation.y = dir * .9;
    const W = 3.5;
    for (let i = 0; i < 10; i++) {
      const x = dir * (0.1 + i * .35);
      cylinder(leafG, M.ironGate, .025, .035, 2.35 + (i === 0 || i === 9 ? .3 : 0), 6, x, 1.2, 0);
      sphere(leafG, M.gold, .055, x, 2.48 + (i === 0 || i === 9 ? .3 : 0), 0);
    }
    for (let j = 0; j < 4; j++) {
      const y = .35 + j * .63;
      box(leafG, M.ironGate, W, .055, .07, dir * W / 2, y, 0);
    }
    // decorative scroll
    for (let i = 0; i < 3; i++) {
      const cx = dir * (1.0 + i * .8);
      const torus1 = new THREE.Mesh(new THREE.TorusGeometry(.24, .017, 6, 18, PI * 1.5), M.ironGate);
      torus1.position.set(cx, .9 + (i % 2) * .7, .04); torus1.rotation.z = i * 1.2; leafG.add(torus1);
    }
    g.add(leafG);
  }
  group.add(g);
  return g;
}

function siteBase(group, M) {
  const g = grp('Site');
  // generous lawn extends to the horizon so that no world edge is visible.
  const geo = new THREE.PlaneGeometry(220, 220);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2.75, uv.getY(i) * 2.45);
  const m = new THREE.Mesh(geo, M.grass);
  m.rotation.x = -PI / 2; m.position.y = -.02; m.receiveShadow = true;
  g.add(m);
  // very subtle mown striping to give the lawn scale
  const stripeMat = new THREE.MeshBasicMaterial({ color: 0xdbe5c7, transparent: true, opacity: .024, depthWrite: false });
  for (let i = 0; i < 16; i++) {
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(80, 1.35), stripeMat);
    stripe.rotation.x = -PI / 2; stripe.position.set(0, .002, -28 + i * 3.6); g.add(stripe);
  }
  // hazy distant tree belt gives the park a far horizon
  const distantMat = new THREE.MeshStandardMaterial({ color: 0x506044, roughness: .95 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5b4b3a, roughness: .9 });
  for (let i = 0; i < 44; i++) {
    const a = i / 44 * PI * 2;
    const r = 48 + (i % 5) * 3.2;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const h = 4.2 + (i % 7) * .8;
    cylinder(g, trunkMat, .14, .24, h * .55, 5, x, h * .275, z);
    sphere(g, distantMat, 1.7 + (i % 4) * .4, x, h * .7, z, { sx: 1.2, sy: 1.6, sz: 1.2, w: 6, h: 4 });
  }
  group.add(g);
  return g;
}

export function buildGardens(M) {
  const g = grp('Landscape');
  siteBase(g, M);
  buildRearTerrace(M, g);

  /* ---------------- approaches and terraces ---------------- */
  // forecourt path from the front steps to the gate, and the central plaza
  pavingWithJoints(g, M, 3.8, 5.1, 0, 12.2, .021, 2.0);
  paved(g, M.granite, 3.4, 7.4, 0, 24.8, .019, 2.2);
  // circular plaza around the fountain
  const ringPath = new THREE.Mesh(new THREE.RingGeometry(3.32, 5.25, 64), M.granite);
  ringPath.rotation.x = -PI / 2; ringPath.position.set(0, .023, 18.3); ringPath.receiveShadow = true; g.add(ringPath);
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * PI * 2;
    const x = Math.cos(a) * 5.15, z = 18.3 + Math.sin(a) * 5.15;
    box(g, M.graniteDark, .35, .004, .035, x, .035, z, { ry: -a, cast: false });
  }
  // cross path
  pavingWithJoints(g, M, 34.0, 2.0, 0, 18.3, .017, 2.1);
  // side paths
  for (const x of [-20.6, 20.6]) paved(g, M.granite, 2.4, 16.7, x, 18.4, .018, 2.2);
  // rear axis and cross paths
  paved(g, M.granite, 4.2, 3.0, 0, -11.8, .021, 2.0);
  paved(g, M.granite, 3.5, 4.2, 0, -12.0, .021, 2.0);
  pavingWithJoints(g, M, 29.5, 2.3, 0, -12.6, .02, 2.1);
  for (const x of [-20.6, 20.6]) paved(g, M.granite, 2.3, 17.8, x, -20.4, .019, 2.2);
  pavingWithJoints(g, M, 34.4, 2.2, 0, -26.2, .017, 2.2);
  paved(g, M.granite, 3.2, 7.1, 0, -26.0, .019, 2.2);

  /* ---------------- front parterres ---------------- */
  const beds = [
    { x: -12.0, z: 15.55 }, { x: 12.0, z: 15.55 },
    { x: -12.0, z: 21.15 }, { x: 12.0, z: 21.15 },
  ];
  for (let bi = 0; bi < beds.length; bi++) {
    const b = beds[bi];
    const bw = 14.0, bd = 4.0;
    // soil and formal border
    flowerBed(g, M, b.x - bw / 2 + .35, b.x + bw / 2 - .35, b.z - bd / 2 + .35, b.z + bd / 2 - .35, .03, { density: .18, kind: bi % 2 ? 'mixed' : 'lavender', seed: 100 + bi });
    hedgeBlock(g, M, bw, .42, .32, b.x, b.z - bd / 2, 0);
    hedgeBlock(g, M, bw, .42, .32, b.x, b.z + bd / 2, 0);
    hedgeBlock(g, M, .32, .42, bd, b.x - bw / 2, b.z, 0);
    hedgeBlock(g, M, .32, .42, bd, b.x + bw / 2, b.z, 0);
    // three inner parterre lozenges with clipped topiary
    for (let k = -1; k <= 1; k++) {
      const cx = b.x + k * 4.2;
      const cz = b.z;
      const w = 3.15, d = 2.15;
      hedgeBlock(g, M, w, .28, .17, cx, cz - d / 2, .04);
      hedgeBlock(g, M, w, .28, .17, cx, cz + d / 2, .04);
      hedgeBlock(g, M, .17, .28, d, cx - w / 2, cz, .04);
      hedgeBlock(g, M, .17, .28, d, cx + w / 2, cz, .04);
      flowerBed(g, M, cx - w / 2 + .2, cx + w / 2 - .2, cz - d / 2 + .2, cz + d / 2 - .2, .045, { density: .55, kind: k === 0 ? 'rose' : 'mixed', seed: 210 + bi * 10 + k });
      topiaryCone(g, M, cx + 1.05, cz + .0, .55 + (k === 0 ? .12 : 0), .45);
      topiaryBall(g, M, cx - 1.0, cz, .24, .38);
    }
    // corner urns and topiary spheres
    for (const sx of [-1, 1]) {
      topiaryBall(g, M, b.x + sx * (bw / 2 - .55), b.z - bd / 2 - .5, .42, 0, true);
      addUrn(g, M, b.x + sx * (bw / 2 + .55), .02, b.z + bd / 2 + .55, .65, { flowers: true });
    }
    formalBench(g, M, b.x - bw / 2 + 1.6, b.z + bd / 2 + 1.4, 0);
    formalBench(g, M, b.x + bw / 2 - 1.6, b.z + bd / 2 + 1.4, 0);
  }

  /* ---------------- grand fountain ---------------- */
  fountain(g, M, 0, 18.3, 1.0);
  // four clipped cones frame the fountain
  for (const [x, z] of [[-5.8, 13.3], [5.8, 13.3], [-5.8, 23.4], [5.8, 23.4]]) topiaryCone(g, M, x, z, .95, 0);
  // lavender ribbons accompany the approach to the gate, beyond the fountain ring
  for (const sx of [-1, 1]) {
    const z0 = 23.9, z1 = 28.9;
    flowerBed(g, M, sx > 0 ? 2.2 : -2.9, sx > 0 ? 2.9 : -2.2, z0, z1, .035, { density: .9, kind: 'lavender', seed: 910 + (sx + 4) * 13 });
    hedgeBlock(g, M, .5, .26, z1 - z0, sx * 2.29, (z0 + z1) / 2, .02);
  }
  // path lamps
  for (const [x, z] of [[-2.8, 12.8], [2.8, 12.8], [-4.8, 24.5], [4.8, 24.5], [-18.8, 12.2], [18.8, 12.2]]) gardenLamp(g, M, x, z, 2.2);

  /* ---------------- rear pool garden ---------------- */
  reflectingPool(g, M);
  for (const [x, z] of [[-7.2, -12.5], [7.2, -12.5], [-7.2, -24.6], [7.2, -24.6]]) topiaryCone(g, M, x, z, 1.05, 0);
  for (const [x, z] of [[-7.05, -16.6], [7.05, -16.6], [-7.05, -20.2], [7.05, -20.2]]) {
    const l = sunLounger(M); l.position.set(x, 0, z); l.rotation.y = x < 0 ? PI / 2 : -PI / 2; g.add(l);
  }
  // poolside parasols
  for (const x of [-7.05, 7.05]) {
    cylinder(g, M.oak, .03, .045, 2.3, 8, x, 1.15, -18.4);
    const c = cylinder(g, M.linenCream, .04, 1.35, .46, 18, x, 2.25, -18.4, { open: true });
  }
  // rear side parterres: rose beds edged in box, held clear of the pavilions
  for (const sx of [-1, 1]) {
    const x0 = sx > 0 ? 8.6 : -19.8, x1 = sx > 0 ? 19.8 : -8.6;
    for (const cz of [-23.7]) {
      flowerBed(g, M, x0 + .4, x1 - .4, cz - 1.9, cz + 1.9, .03, { density: .24, kind: 'rose', seed: 320 + Math.round(cz * (sx + 2)) });
      hedgeBlock(g, M, x1 - x0, .35, .26, (x0 + x1) / 2, cz - 1.9, .01);
      hedgeBlock(g, M, x1 - x0, .35, .26, (x0 + x1) / 2, cz + 1.9, .01);
      hedgeBlock(g, M, .26, .35, 3.8, x0, cz, .01);
      hedgeBlock(g, M, .26, .35, 3.8, x1, cz, .01);
      for (const xx of [x0 + .9, (x0 + x1) / 2, x1 - .9]) topiaryBall(g, M, xx, cz, .34, .02, false);
    }
  }
  // rear pavilions, pushed outward to preserve clear sightlines
  pergolaPavilion(g, M, 18.7, -12.7, 1);
  pergolaPavilion(g, M, -18.7, -12.7, -1);
  for (const [x, z] of [[-6.2, -10.6], [6.2, -10.6], [-21.5, -15.8], [21.5, -15.8], [-21.5, -23.7], [21.5, -23.7]]) gardenLamp(g, M, x, z, 2.0);

  // garden ornaments / bird bath in a quiet corner
  const bb = birdbath(M); bb.position.set(-20.0, 0, -27.2); g.add(bb);
  const st = statue(M); st.position.set(20.0, 0, -27.2); st.rotation.y = -PI / 2; g.add(st);

  /* ---------------- allée trees, gate, perimeter ---------------- */
  let seed = 1;
  for (const x of [-23.3, -10.0, 10.0, 23.3]) {
    for (const z of [13.8, 20.7, 27.4, -16.6, -22.8]) {
      columnarTree(g, M, x, z, 4.7 + (seed % 3) * .5, seed++);
      understoryPlanting(g, M, x + ((seed % 3) - 1) * .28, z + .15, .66, 7100 + seed, { rose: seed % 3 === 0 });
    }
  }
  for (const [x, z] of [[-22.0, 8.5], [22.0, 8.5], [-22.0, -11.2], [22.0, -11.2]]) {
    floweringTree(g, M, x, z, 4.0, seed++);
    understoryPlanting(g, M, x, z, .78, 7300 + seed, { hydrangea: true });
  }
  // rose arches at the entrances to the side walks
  roseArch(g, M, -20.6, 10.3);
  roseArch(g, M, 20.6, 10.3);
  // hydrangea and rose pockets soften the pavilion plinths and pool edges
  for (const [x, z, sd] of [
    [-15.4, -9.4, 801], [15.4, -9.4, 802], [-15.4, -16.4, 803], [15.4, -16.4, 804],
    [-8.8, -14.2, 805], [8.8, -14.2, 806],
  ]) {
    understoryPlanting(g, M, x, z, .62, sd, { hydrangea: sd % 2 === 0, rose: sd % 2 === 1 });
  }
  perimeter(g, M);

  // clipped hedge rooms at far corners to frame the park
  for (const sx of [-1, 1]) {
    hedgeBlock(g, M, 3.7, 1.15, .75, sx * 17.0, 27.6, 0);
    hedgeBlock(g, M, .75, 1.15, 4.2, sx * 15.15, 25.6, 0);
    hedgeBlock(g, M, 3.2, .6, .5, sx * 21.7, 28.2, 0);
  }

  // layered flower borders along the side paths
  for (const [x, z, w, d] of [[-22.9, 18.4, 1.6, 14.0], [22.9, 18.4, 1.6, 14.0], [-22.9, -19.2, 1.6, 8.0], [22.9, -19.2, 1.6, 8.0]]) {
    flowerBed(g, M, x - w / 2, x + w / 2, z - d / 2, z + d / 2, .03, { density: .45, kind: 'mixed', seed: 800 + Math.round(x) });
  }

  // dry-stone edging to lawn parterres
  for (const sx of [-1, 1]) {
    box(g, M.graniteDark, .18, .10, 13.0, sx * 20.9, .05, 18.3);
    box(g, M.graniteDark, .18, .10, 12.8, sx * 20.9, .05, -20.2);
  }

  // gather static garden geometry into a few material batches
  mergeGroup(g);
  setShadow(g, true, true);
  // water should not cast opaque shadows; keep it soft
  g.traverse(o => { if (o.isMesh && o.material && o.material.transparent) { o.castShadow = false; o.renderOrder = 2; } });
  g.userData = { type: 'landscape' };
  return g;
}

export const GARDEN_LABELS = [
  { id: 'garden-fountain', name: '法式喷泉', nameFr: 'Fontaine d’Axe', pos: [0, 1.7, 18.3], kind: 'garden', desc: '以浅灰花岗岩铺就的圆形广场为中心，四出水柱汇入蓝马赛克池底，是前庭的视觉焦点。' },
  { id: 'garden-parterre', name: '镜像花坛', nameFr: 'Parterres Brodés', pos: [-12, 1.6, 18.7], kind: 'garden', desc: '黄杨矮篱围合出规整的刺绣花坛，薰衣草与玫瑰按轴线对称种植，四季皆有香气与色彩。' },
  { id: 'garden-allee', name: '林荫步道', nameFr: 'Allée Cavalière', pos: [20.8, 1.8, 18.4], kind: 'garden', desc: '列植的柱状椴树与低矮绿篱共同框定中央轴线，浅灰荔枝面花岗岩步道延伸至铁艺大门。' },
  { id: 'garden-pool', name: '后池与日光台', nameFr: 'Miroir d’Eau', pos: [0, 1.6, -18.5], kind: 'garden', desc: '后花园的镜面水池以蓝色玻璃马赛克铺底，两端设小喷泉与日光躺椅，倒映建筑北立面。' },
  { id: 'garden-pergola', name: '藤架餐叙', nameFr: 'Pergola de Roses', pos: [17.0, 2.0, -12.6], kind: 'garden', desc: '白色木柱攀满藤本月季，防腐木户外餐桌配白色布艺坐垫，适合花园中的长桌晚宴。' },
];
