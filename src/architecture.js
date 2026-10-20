import * as THREE from 'three';
import {
  HOUSE, FLOORS, ROOF_BASE, STAIR_OPENING, box, roundedBox, cylinder, sphere,
  plane, torus, lathe, tube, balusterGeometry, addBalustrade, addColumn, addPilaster,
  addDentils, addCorbel, addUrn, addStoneSteps, addPanelFrame, mergeGroup, makeBoxGeometry,
} from './geom.js';

const PI = Math.PI;

function grp(name) { const g = new THREE.Group(); g.name = name; return g; }

/* ------------------------------------------------------------------ */
/*  Wall construction with genuine openings                            */
/* ------------------------------------------------------------------ */

export function wallWithOpenings(parent, mat, spec) {
  const {
    axis = 'x', fixed, from, to, base, top, thickness = HOUSE.wall,
    openings = [], name = 'Wall',
  } = spec;
  const g = grp(name);
  const ops = openings.slice().sort((a, b) => a.center - b.center);
  let cursor = from;
  const add = (u0, u1, y0, y1) => {
    if (u1 - u0 < 1e-4 || y1 - y0 < 1e-4) return;
    const len = u1 - u0, cy = (y0 + y1) / 2, h = y1 - y0, mid = (u0 + u1) / 2;
    if (axis === 'x') box(g, mat, len, h, thickness, mid, cy, fixed);
    else box(g, mat, thickness, h, len, fixed, cy, mid);
  };
  for (const op of ops) {
    const l = op.center - op.width / 2, r = op.center + op.width / 2;
    add(cursor, l, base, top);
    if (op.bottom > base + 1e-3) add(l, r, base, op.bottom);
    if (op.top < top - 1e-3) add(l, r, op.top, top);
    cursor = r;
  }
  add(cursor, to, base, top);
  parent.add(g);
  return g;
}

/* ------------------------------------------------------------------ */
/*  Windows, French doors and entrance                                */
/* ------------------------------------------------------------------ */

function pedimentMesh(M, width, height, depth, mat = M.whiteStone) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(0, height);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

export function addWindowPediment(parent, M, width, y, z, roofType = 'triangle') {
  const g = grp('Window_Pediment');
  g.position.set(0, y, z);
  if (roofType === 'triangle') {
    g.add(pedimentMesh(M, width + .35, .42, .22));
    box(g, M.whiteStone, width + .45, .06, .26, 0, .02, .11);
    box(g, M.whiteStone, width + .12, .045, .2, 0, .40, .10);
    sphere(g, M.gold, .055, 0, .43, .14);
  } else {
    // segmental hood
    const t = new THREE.Mesh(new THREE.TorusGeometry(width / 2, .09, 10, 32, PI), M.whiteStone);
    t.position.set(0, 0, .10); t.scale.y = .36; t.castShadow = true; g.add(t);
    box(g, M.whiteStone, width + .3, .08, .2, 0, .015, .09);
  }
  parent.add(g);
  return g;
}

/**
 * Local group faces +z, origin at the bottom-centre of the opening.
 * wall: 'south' | 'north' | 'east' | 'west'; u = lateral world coordinate.
 */
export function addWindow(parent, M, opts) {
  const {
    wall = 'south', u = 0, bottom = 1, width = 1.4, height = 2.2,
    type = 'window', pediment = null, balconyDoor = false, guard = false,
    innerCurtains = false, shutters = false,
  } = opts;
  const g = grp(type === 'french' ? 'French_Door' : 'Window');
  const H = height;
  const frameT = .055, frameDepth = .17;
  const glassW = width - .14, glassH = H - .14;
  // orientation & wall placement
  if (wall === 'south') { g.position.set(u, bottom, HOUSE.halfZ); }
  else if (wall === 'north') { g.position.set(u, bottom, -HOUSE.halfZ); g.rotation.y = PI; }
  else if (wall === 'east') { g.position.set(HOUSE.halfX, bottom, u); g.rotation.y = PI / 2; }
  else { g.position.set(-HOUSE.halfX, bottom, u); g.rotation.y = -PI / 2; }
  // stone reveal / surround
  const zOut = .10;
  box(g, M.whiteStone, width + .54, .12, .36, 0, -.03, zOut + .02);
  box(g, M.whiteStone, width + .42, .07, .30, 0, H + .06, zOut);
  box(g, M.whiteStone, .18, H + .16, .32, -width / 2 - .16, H / 2, zOut);
  box(g, M.whiteStone, .18, H + .16, .32, width / 2 + .16, H / 2, zOut);
  box(g, M.whiteStone, width + .72, .08, .42, 0, H + .17, zOut);
  // carved keystone and rosette
  const keystone = new THREE.Mesh(new THREE.CylinderGeometry(.095, .16, .24, 4), M.whiteStone);
  keystone.rotation.z = PI / 4;
  keystone.scale.z = .62;
  keystone.position.set(0, H + .11, zOut + .17);
  keystone.castShadow = true; g.add(keystone);
  sphere(g, M.gold, .032, 0, H + .12, zOut + .27, { sx: 1, sy: 1, sz: .35 });
  // rusticated blocks under sill
  for (let i = -2; i <= 2; i++) box(g, M.whiteStone, (width + .35) / 5 - .02, .10, .18, i * (width + .35) / 5, -.16, .15);
  // window recess shadow panel
  box(g, M.baseStone, width + .06, H + .02, .08, 0, H / 2, -.215, { cast: false });
  // glass
  // a warm linen sheer glows softly behind the glazing, preventing dead-black windows
  const sheer = new THREE.Mesh(new THREE.PlaneGeometry(glassW * .98, glassH * .98), M.windowSheer);
  sheer.position.set(0, H / 2, -.205);
  sheer.castShadow = false; sheer.receiveShadow = false; g.add(sheer);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(glassW, glassH), M.glass);
  glass.position.set(0, H / 2, -.14);
  glass.castShadow = false; glass.receiveShadow = false;
  g.add(glass);
  // bronze frame: outer frame, mullions and transoms
  const fz = -.08;
  box(g, M.bronze, width, frameT, frameDepth, 0, .04, fz);
  box(g, M.bronze, width, frameT * 1.2, frameDepth, 0, H - .04, fz);
  box(g, M.bronze, frameT, H, frameDepth, -width / 2 + .035, H / 2, fz);
  box(g, M.bronze, frameT, H, frameDepth, width / 2 - .035, H / 2, fz);
  const mullions = type === 'french' ? 2 : (width > 1.5 ? 3 : 2);
  for (let i = 1; i < mullions; i++) {
    box(g, M.bronze, .032, H - .1, .12, -width / 2 + (width / mullions) * i, H / 2, fz);
  }
  const rows = Math.max(2, Math.round(H / .72));
  for (let i = 1; i < rows; i++) box(g, M.bronze, width - .08, .032, .12, 0, i * H / rows, fz);
  // diagonal muntin detail in upper panes
  for (let i = 0; i < mullions; i++) {
    const x0 = -width / 2 + (width / mullions) * (i + .5);
    if (type === 'french') {
      // tall door stiles carry inset panels
      box(g, M.bronze, .018, H * .16, .045, x0, .32, fz + .09);
      box(g, M.bronze, .018, H * .16, .045, x0, .66, fz + .09);
    }
  }
  // handles for French door
  if (type === 'french') {
    box(g, M.bronze, width - .1, .055, .16, 0, .10, fz);
    for (const sx of [-1, 1]) {
      const x = sx * .11;
      tube(g, M.brass, [new THREE.Vector3(x, 1.0, fz + .10), new THREE.Vector3(x, 1.06, fz + .18), new THREE.Vector3(x, 1.1, fz + .10)], .014, 0, 0, 0, { radial: 6, segments: 6 });
      sphere(g, M.brass, .026, x, 1.02, fz + .10);
      cylinder(g, M.brass, .027, .027, .03, 8, x, .98, fz + .08, { rx: PI / 2 });
    }
  }
  // small bronze latch/lock
  sphere(g, M.brass, .025, 0, H * .45, .02);
  // interior sill
  box(g, M.whiteStone, width + .55, .055, .24, 0, -.105, -.28);
  // optional ornate pediment
  if (pediment) addWindowPediment(g, M, width, H + .23, zOut, pediment);
  // low iron guard for tall ground-floor windows
  if (guard) {
    const rail = grp('Window_Guard');
    for (let i = 0; i < 7; i++) {
      const x = -width / 2 + .12 + i * (width - .24) / 6;
      tube(rail, M.iron, [new THREE.Vector3(x, 0, .23), new THREE.Vector3(x, .56, .23)], .012, 0, 0, 0, { radial: 5, segments: 2 });
      sphere(rail, M.iron, .024, x, .57, .23, { w: 6, h: 4 });
    }
    cylinder(rail, M.iron, .016, .016, width, 6, 0, .49, .23, { rz: PI / 2 });
    cylinder(rail, M.iron, .016, .016, width, 6, 0, .12, .23, { rz: PI / 2 });
    for (const sx of [-1, 1]) box(rail, M.iron, .035, .62, .035, sx * (width / 2 - .06), .31, .23);
    g.add(rail);
  }
  parent.add(g);
  return g;
}

export function addEntranceDoor(parent, M) {
  const g = grp('Porte_d_Honneur');
  g.position.set(0, FLOORS[0].base, HOUSE.halfZ);
  const W = 2.75, H = 3.18;
  // grand stone doorcase
  box(g, M.whiteStone, W + 1.0, H + .5, .30, 0, H / 2 + .1, .06);
  box(g, M.baseStone, W + .50, H + .12, .36, 0, H / 2 + .02, .16);
  box(g, M.blackLacquer, W, H, .25, 0, H / 2, .18);
  // double doors with glazing
  for (const sx of [-1, 1]) {
    const x = sx * W / 4;
    box(g, M.bronze, W / 2 - .05, H - .08, .10, x, H / 2, .30);
    for (let j = 0; j < 3; j++) {
      box(g, M.glass, W / 2 - .27, .62, .025, x, .48 + j * .76, .36);
      box(g, M.bronze, W / 2 - .22, .035, .04, x, .74 + j * .76, .38);
      box(g, M.bronze, .035, .62, .04, x + (W / 2 - .19) / 2, .48 + j * .76, .38);
    }
    box(g, M.bronze, W / 2 - .06, .45, .06, x, H - .32, .37);
    box(g, M.bronze, W / 2 - .06, .28, .06, x, .25, .37);
    // brass handle and knocker
    tube(g, M.brass, [new THREE.Vector3(x + sx * .18, 1.15, .40), new THREE.Vector3(x + sx * .28, 1.2, .45), new THREE.Vector3(x + sx * .18, 1.28, .40)], .018, 0, 0, 0, { radial: 6, segments: 6 });
    torus(g, M.brass, .08, .012, x - sx * .20, 1.6, .40, { rx: 0, radial: 20 });
  }
  // fanlight
  const fan = new THREE.Mesh(new THREE.CircleGeometry(W / 2 - .1, 32, 0, PI), M.glass);
  fan.position.set(0, H + .08, .32); g.add(fan);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(W / 2, .055, 10, 40, PI), M.bronze);
  arch.position.set(0, H + .08, .34); g.add(arch);
  for (let i = 0; i < 7; i++) {
    const a = i / 6 * PI;
    box(g, M.bronze, .025, W / 2 - .06, .025, Math.cos(a) * (W / 4 - .03), H + .08 + Math.sin(a) * (W / 4 - .03), .34, { rz: a - PI / 2 });
  }
  // transom muntin
  box(g, M.bronze, W + .2, .07, .2, 0, H + .05, .30);
  // stone archivolt and segmental pediment
  const hood = new THREE.Mesh(new THREE.TorusGeometry(W / 2 + .22, .12, 12, 48, PI), M.whiteStone);
  hood.position.set(0, H + .18, .25); hood.castShadow = true; g.add(hood);
  box(g, M.whiteStone, W + 1.1, .12, .36, 0, H + .52, .13);
  sphere(g, M.gold, .08, 0, H + .64, .22);
  // fluted pilasters with plinths
  for (const sx of [-1, 1]) {
    addPilaster(g, M, sx * (W / 2 + .35), .19, .02, H + .15, .55, .15, 0);
  }
  // lanterns
  for (const sx of [-1, 1]) {
    const l = grp('Entrance_Lantern');
    l.position.set(sx * 1.9, 2.3, .45);
    cylinder(l, M.bronze, .02, .025, .34, 8, 0, -.05, 0, { rx: PI / 2 });
    box(l, M.bronze, .23, .38, .23, 0, -.3, .1);
    box(l, M.bulb, .15, .28, .15, 0, -.3, .1);
    box(l, M.bronze, .27, .035, .27, 0, -.09, .1);
    sphere(l, M.bronze, .04, 0, -.51, .1);
    g.add(l);
  }
  parent.add(g);
  return g;
}

/* ------------------------------------------------------------------ */
/*  Balustrades, balconies and roof                                   */
/* ------------------------------------------------------------------ */

function balcony(parent, M, opts) {
  const { x0, x1, z0, z1, y, railH = .82, corbels = true, sides = true, frontOnly = false } = opts;
  const g = grp('Balcony');
  box(g, M.whiteStone, x1 - x0, .16, z1 - z0, (x0 + x1) / 2, y - .08, (z0 + z1) / 2);
  box(g, M.whiteStone, x1 - x0 + .16, .08, z1 - z0 + .16, (x0 + x1) / 2, y, (z0 + z1) / 2);
  box(g, M.marble, x1 - x0 - .12, .018, z1 - z0 - .12, (x0 + x1) / 2, y + .045, (z0 + z1) / 2);
  addBalustrade(g, { mat: M.whiteStone, x0, x1, z0: z1 - .08, z1: z1 - .08, y: y + .055, height: railH, direction: 'x' });
  if (sides && !frontOnly) {
    addBalustrade(g, { mat: M.whiteStone, x0, x1: x0, z0, z1: z1 - .1, y: y + .055, height: railH, direction: 'z' });
    addBalustrade(g, { mat: M.whiteStone, x0: x1, x1, z0, z1: z1 - .1, y: y + .055, height: railH, direction: 'z' });
  }
  if (corbels) {
    for (const x of [x0 + .45, x0 + (x1 - x0) / 2, x1 - .45]) addCorbel(g, M, x, y - .16, z0 + .1, .8, 0);
  }
  parent.add(g);
  return g;
}

export function buildPortico(M, site, exteriors) {
  const g = grp('Front_Portico');
  // terrace platform and steps belong to landscape, columns/balcony to exteriors
  const platformY = FLOORS[0].base;
  const plat = grp('Portico_Terrace');
  box(plat, M.baseStone, 11.2, .34, 2.5, 0, .17, 9.15);
  for (let i = 0; i < 4; i++) box(plat, M.marble, 10.8 - i * .1, .018, .54, 0, .35 + .01, 8.25 + i * .55, { cast: false });
  // three descending steps to garden
  addStoneSteps(plat, M, 0, 10.40, 9.2, 0, .35, 3, 2.15);
  // cheek walls with urns
  for (const sx of [-1, 1]) {
    box(plat, M.baseStone, 1.2, .46, 2.0, sx * 5.15, .23, 10.35);
    box(plat, M.whiteStone, .26, 1.0, .26, sx * 5.15, .8, 10.75);
    addUrn(plat, M, sx * 5.15, 1.28, 10.75, 1.15, { flowers: true });
  }
  site.add(plat);
  // columns
  const colY = FLOORS[0].base;
  const colH = 3.28;
  for (const x of [-4.55, -2.30, 2.30, 4.55]) {
    addColumn(g, M, x, 9.15, colY, colH, .25, { name: 'Portico_Column' });
  }
  // entablature and sculpted frieze
  box(g, M.whiteStone, 10.3, .26, 2.2, 0, colY + colH + .13, 9.15);
  box(g, M.whiteStone, 10.7, .18, 2.4, 0, colY + colH + .33, 9.13);
  box(g, M.stuccoWarm, 10.3, .44, 2.05, 0, colY + colH + .62, 9.15);
  addDentils(g, M, -5.1, 5.1, colY + colH + .40, 10.28);
  // triglyphs / rosettes
  for (let i = -4; i <= 4; i++) {
    box(g, M.whiteStone, .16, .28, .08, i * 1.12, colY + colH + .62, 10.22);
    if (i % 2 === 0) sphere(g, M.gold, .08, i * 1.12, colY + colH + .63, 10.28, { sx: 1, sy: 1, sz: .4 });
  }
  box(g, M.whiteStone, 10.9, .17, 2.55, 0, colY + colH + .91, 9.12);
  const balconyG = balcony(g, M, { x0: -5.55, x1: 5.55, z0: 8.05, z1: 10.22, y: FLOORS[1].base, railH: .84, corbels: false });
  // urns on the main balcony
  for (const sx of [-1, 1]) addUrn(g, M, sx * 5.12, FLOORS[1].base + .06, 9.9, .8, { flowers: true });
  exteriors.add(g);
  return g;
}

export function buildThirdBalcony(M, exteriors) {
  const g = grp('Belvedere_Balcony');
  balcony(g, M, { x0: -3.65, x1: 3.65, z0: 8.02, z1: 9.55, y: FLOORS[2].base, railH: .8, corbels: true });
  for (const sx of [-1, 1]) addUrn(g, M, sx * 3.3, FLOORS[2].base + .06, 9.26, .62, { flowers: true });
  exteriors.add(g);
  return g;
}

export function buildRearBalcony(M, exteriors) {
  const g = grp('Garden_Balcony');
  const y = FLOORS[1].base;
  const x0 = -2.85, x1 = 2.85, z0 = -9.35, z1 = -8.02;
  box(g, M.whiteStone, x1 - x0, .16, z1 - z0, 0, y - .08, (z0 + z1) / 2);
  box(g, M.whiteStone, x1 - x0 + .18, .07, z1 - z0 + .16, 0, y, (z0 + z1) / 2);
  box(g, M.marble, x1 - x0 - .12, .018, z1 - z0 - .1, 0, y + .042, (z0 + z1) / 2);
  addBalustrade(g, { mat: M.whiteStone, x0, x1, z0, z1: z0, y: y + .052, height: .8, direction: 'x' });
  for (const sx of [-1, 1]) addBalustrade(g, { mat: M.whiteStone, x0: sx * (x1 - .06), x1: sx * (x1 - .06), z0, z1: z1 - .08, y: y + .052, height: .8, direction: 'z' });
  for (const x of [-2.2, 0, 2.2]) addCorbel(g, M, x, y - .16, z1 - .1, .82, PI);
  for (const sx of [-1, 1]) addUrn(g, M, sx * 2.55, y + .06, z0 + .22, .65, { flowers: true });
  exteriors.add(g);
  return g;
}

export function buildRearTerrace(M, site) {
  const g = grp('Rear_Terrace');
  const y = .35;
  box(g, M.baseStone, 26.0, .34, 2.25, 0, .17, -9.1);
  box(g, M.marble, 25.7, .02, 2.0, 0, .365, -9.1);
  // central steps to parterre
  addStoneSteps(g, M, 0, -11.25, 8.4, 0, .35, 3, 2.0);
  // balustrade, leaving the stair gap
  addBalustrade(g, { mat: M.whiteStone, x0: -13.05, x1: -4.3, z0: -10.2, z1: -10.2, y: .36, height: .74, direction: 'x' });
  addBalustrade(g, { mat: M.whiteStone, x0: 4.3, x1: 13.05, z0: -10.2, z1: -10.2, y: .36, height: .74, direction: 'x' });
  for (const sx of [-1, 1]) {
    box(g, M.whiteStone, .38, 1.0, .38, sx * 4.3, .86, -10.2);
    addUrn(g, M, sx * 4.3, 1.37, -10.2, 1.0, { flowers: true });
  }
  // terrace lanterns
  for (const x of [-11.2, -5.4, 5.4, 11.2]) {
    cylinder(g, M.iron, .035, .05, 2.2, 8, x, 1.45, -8.35);
    box(g, M.iron, .28, .42, .28, x, 2.58, -8.35);
    box(g, M.bulb, .19, .3, .19, x, 2.58, -8.35);
    sphere(g, M.iron, .055, x, 2.83, -8.35);
  }
  site.add(g);
  return g;
}

/* ------------------------------------------------------------------ */
/*  Roof                                                              */
/* ------------------------------------------------------------------ */

function mansardGeometry() {
  const rings = [
    { x: 13.45, z: 8.42, y: 0 },
    { x: 12.82, z: 7.45, y: 1.33 },
    { x: 9.4, z: 5.12, y: 3.08 },
    { x: 4.9, z: 2.38, y: 4.18 },
    { x: 1.2, z: .75, y: 4.55 },
  ];
  const pos = [], uv = [], idx = [];
  const faces = [
    // [startA, startB] around rectangle; front/right/back/left
    { a: [-1, 1], b: [1, 1] }, // south (z+)
    { a: [1, 1], b: [1, -1] }, // east
    { a: [1, -1], b: [-1, -1] }, // north
    { a: [-1, -1], b: [-1, 1] }, // west
  ];
  for (let r = 0; r < rings.length - 1; r++) {
    const A = rings[r], B = rings[r + 1];
    const slope = Math.hypot((A.x - B.x), (A.y - B.y));
    for (const f of faces) {
      const p0 = new THREE.Vector3(f.a[0] * A.x, A.y, f.a[1] * A.z);
      const p1 = new THREE.Vector3(f.b[0] * A.x, A.y, f.b[1] * A.z);
      const p2 = new THREE.Vector3(f.b[0] * B.x, B.y, f.b[1] * B.z);
      const p3 = new THREE.Vector3(f.a[0] * B.x, B.y, f.a[1] * B.z);
      const baseIndex = pos.length / 3;
      for (const p of [p0, p1, p2, p3]) pos.push(p.x, p.y, p.z);
      const len = r === 0 ? (f.a[0] !== f.b[0] ? A.x * 2 : A.z * 2) : (f.a[0] !== f.b[0] ? (A.x + B.x) : (A.z + B.z));
      uv.push(0, A.y / 2.9, len / 5.0, A.y / 2.9, len / 5.0, B.y / 2.9, 0, B.y / 2.9);
      idx.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex, baseIndex + 2, baseIndex + 3);
    }
  }
  // flat ridge cap
  const A = rings[rings.length - 1];
  const y = A.y;
  const base = pos.length / 3;
  pos.push(-A.x, y, A.z, A.x, y, A.z, A.x, y, -A.z, -A.x, y, -A.z);
  uv.push(0, 0, 1, 0, 1, 1, 0, 1);
  idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.translate(0, ROOF_BASE, 0);
  return g;
}

function dormer(M, opts = {}) {
  const { x = 0, z = 7.3, y = 10.85, width = 1.75, height = 2.35, back = false } = opts;
  const g = grp('Dormer');
  g.position.set(x, y, z);
  if (back) g.rotation.y = PI;
  // white stone face
  box(g, M.whiteStone, width, height, 1.05, 0, height / 2, 0);
  box(g, M.whiteStone, width + .18, .10, 1.15, 0, height + .02, .02);
  // recess and window
  box(g, M.baseStone, width - .3, height - .48, .10, 0, height / 2 + .08, .54);
  box(g, M.bronze, 1.02, 1.28, .08, 0, height / 2 + .03, .60);
  box(g, M.glass, .88, 1.14, .02, 0, height / 2 + .03, .65);
  for (const [xx, yy, ww, hh] of [[0, .0, .022, 1.14], [-.3, 0, .018, 1.14], [.3, 0, .018, 1.14], [0, .0, .88, .02]]) {
    box(g, M.bronze, ww, hh, .03, xx, height / 2 + .03 + yy, .67);
  }
  box(g, M.whiteStone, 1.35, .08, .3, 0, height / 2 - .69, .66);
  // pedimented crown
  const ped = pedimentMesh(M, width + .38, .4, .25);
  ped.position.set(0, height + .08, .48); g.add(ped);
  box(g, M.whiteStone, width + .46, .06, .3, 0, height + .08, .58);
  sphere(g, M.gold, .05, 0, height + .48, .62);
  // small hipped roof cap
  const capG = new THREE.Mesh(new THREE.CylinderGeometry(.1, width * .72, .8, 4, 1), M.roofTile);
  capG.position.set(0, height + .6, .05);
  capG.rotation.y = PI / 4;
  capG.scale.z = .75;
  capG.castShadow = true;
  g.add(capG);
  return g;
}

function chimney(M, x, z, topY) {
  const g = grp('Chimney');
  const base = 12.2;
  const w = 1.18;
  box(g, M.baseStone, w, topY - base, .95, x, (base + topY) / 2, z);
  for (let i = 0; i < 5; i++) box(g, M.baseStone, w + .06, .06, 1.01, x, base + .3 + i * .5, z);
  box(g, M.whiteStone, w + .25, .16, 1.1, x, topY, z);
  for (const sx of [-1, 1]) {
    cylinder(g, M.terracotta, .15, .13, .36, 14, x + sx * .25, topY + .22, z);
    cylinder(g, M.iron, .17, .17, .05, 14, x + sx * .25, topY + .42, z);
  }
  addUrn(g, M, x, topY + .12, z + .75, .55, {});
  return g;
}

export function buildRoof(M) {
  const g = grp('Roof');
  g.name = 'Roof';
  const roofMat = M.roofTile;
  const roof = new THREE.Mesh(mansardGeometry(), roofMat);
  roof.castShadow = true; roof.receiveShadow = true;
  roof.name = 'Mansard_Roof';
  g.add(roof);
  // eave and break mouldings
  const y0 = ROOF_BASE;
  box(g, M.whiteStone, 27.4, .20, 17.3, 0, y0 + .04, 0);
  box(g, M.roofRidge, 27.0, .16, 16.8, 0, y0 + .18, 0);
  // stone band at the change from steep to shallow slope
  const bandY = y0 + 2.78;
  const wx = 19.0, wz = 10.6;
  box(g, M.roofRidge, wx, .12, .35, 0, bandY, wz / 2);
  box(g, M.roofRidge, wx, .12, .35, 0, bandY, -wz / 2);
  box(g, M.roofRidge, .35, .12, wz, wx / 2, bandY, 0);
  box(g, M.roofRidge, .35, .12, wz, -wx / 2, bandY, 0);
  // ridge cap
  box(g, M.roofRidge, 2.8, .14, 1.65, 0, y0 + 4.56, 0);
  // dormers: a symmetrical pair on the garden facade, two at the rear
  for (const x of [-6.6, 6.6]) g.add(dormer(M, { x, z: 8.0, y: y0 + .24, width: 2.0, height: 2.5 }));
  for (const x of [-6.8, 6.8]) g.add(dormer(M, { x, z: -8.0, y: y0 + .24, width: 1.9, height: 2.4, back: true }));
  // chimneys
  for (const [x, z] of [[-9.2, -3.1], [9.2, -3.1], [-9.2, 3.1], [9.2, 3.1]]) g.add(chimney(M, x, z, y0 + 4.55));
  // ridge cresting and weather vane
  for (let i = -3; i <= 3; i++) {
    const x = i * 1.85;
    cylinder(g, M.iron, .018, .02, .7, 6, x, y0 + 4.9, 0);
    sphere(g, M.gold, .06, x, y0 + 5.27, 0);
    tube(g, M.iron, [new THREE.Vector3(x - .16, y0 + 5.05, 0), new THREE.Vector3(x, y0 + 5.17, 0), new THREE.Vector3(x + .16, y0 + 5.05, 0)], .009, 0, 0, 0, { radial: 4, segments: 4 });
  }
  // central finial / weather vane
  cylinder(g, M.iron, .03, .045, 1.4, 8, 0, y0 + 5.05, 0);
  box(g, M.gold, .9, .05, .05, 0, y0 + 5.75, 0);
  box(g, M.gold, .18, .22, .02, .32, y0 + 5.62, .02);
  sphere(g, M.gold, .11, 0, y0 + 5.82, 0);
  // central pediment on the front roof base
  const ped = pedimentMesh(M, 7.5, 1.35, .35);
  ped.position.set(0, y0 + .1, 8.12); g.add(ped);
  box(g, M.whiteStone, 8.0, .14, .48, 0, y0 + .16, 8.18);
  for (let i = -3; i <= 3; i++) box(g, M.whiteStone, .24, .5, .1, i * 1.0, y0 + .3, 8.3);
  sphere(g, M.gold, .13, 0, y0 + 1.45, 8.32);
  // oculus in pediment
  const ring = torus(g, M.whiteStone, .34, .06, 0, y0 + .66, 8.34, { radial: 28, tubular: 8 });
  const glassRound = new THREE.Mesh(new THREE.CircleGeometry(.29, 28), M.glass);
  glassRound.position.set(0, y0 + .66, 8.34); g.add(glassRound);
  // matching rear pediment
  const rped = pedimentMesh(M, 6.2, 1.1, .3);
  rped.position.set(0, y0 + .1, -8.15); rped.rotation.y = PI; g.add(rped);
  box(g, M.whiteStone, 6.7, .13, .44, 0, y0 + .16, -8.2);
  const rring = torus(g, M.whiteStone, .27, .05, 0, y0 + .59, -8.34, { radial: 24, tubular: 8 });
  // dentil cornice around the roof base
  addDentils(g, M, -12.3, 12.3, y0 - .16, 8.44, 'x', 32);
  addDentils(g, M, -12.3, 12.3, y0 - .16, -8.44, 'x', 32);
  addDentils(g, M, -7.5, 7.5, y0 - .16, 12.98, 'z', 22);
  addDentils(g, M, -7.5, 7.5, y0 - .16, -12.98, 'z', 22);
  // low stone roof balustrades flanking the central pediment
  for (const sx of [-1, 1]) {
    const x0 = sx * 4.9, x1 = sx * 10.9;
    box(g, M.whiteStone, 6.2, .16, .5, sx * 7.9, y0 + .18, 8.55);
    addBalustrade(g, { mat: M.whiteStone, x0, x1, z0: 8.55, z1: 8.55, y: y0 + .25, height: .58, direction: 'x' });
    addUrn(g, M, sx * 10.55, y0 + .27, 8.55, .7, { flowers: false });
  }
  // compact stone roof lantern at the ridge
  const lantern = grp('Roof_Lantern');
  const ly = y0 + 4.58;
  cylinder(lantern, M.whiteStone, 1.02, 1.14, .18, 8, 0, ly + .09, 0);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * PI * 2 + PI / 8;
    addColumn(lantern, M, Math.cos(a) * .78, Math.sin(a) * .78, ly + .18, .92, .075, { name: 'Lantern_Column' });
  }
  cylinder(lantern, M.whiteStone, 1.06, 1.06, .13, 8, 0, ly + 1.16, 0);
  cylinder(lantern, M.whiteStone, .82, .74, .10, 8, 0, ly + 1.27, 0);
  const dome = sphere(lantern, M.roofRidge, .7, 0, ly + 1.39, 0, { sy: .55, w: 24, h: 12 });
  cylinder(lantern, M.gold, .02, .028, .68, 8, 0, ly + 1.86, 0);
  sphere(lantern, M.gold, .085, 0, ly + 2.21, 0);
  g.add(lantern);
  g.userData = { hideInFloorView: true };
  return g;
}

/* ------------------------------------------------------------------ */
/*  Floor structure, stairs and wall plans                            */
/* ------------------------------------------------------------------ */

function slabWithOpening(M, baseY, thickness, y, opening) {
  const g = grp('Slab');
  const h = 13.0;
  const z = HOUSE.halfZ;
  // top thickness box pieces around stair opening
  const add = (x0, x1, z0, z1) => {
    box(g, M.baseStone, x1 - x0, thickness, z1 - z0, (x0 + x1) / 2, y - thickness / 2, (z0 + z1) / 2, { cast: false });
    // plaster ceiling lining under the slab
    const lin = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 - .04, z1 - z0 - .04), M.whiteTrim);
    lin.rotation.x = PI / 2; lin.position.set((x0 + x1) / 2, y - thickness - .005, (z0 + z1) / 2); lin.receiveShadow = true; g.add(lin);
  };
  if (!opening) add(-h, h, -z, z);
  else {
    add(-h, h, opening.z1, z);
    add(-h, h, -z, opening.z0);
    add(-h, opening.x0, opening.z0, opening.z1);
    add(opening.x1, h, opening.z0, opening.z1);
  }
  // trim border around opening
  if (opening) {
    for (const [x, zz, w, d] of [
      [0, opening.z1, opening.x1 - opening.x0 + .2, .1],
      [0, opening.z0, opening.x1 - opening.x0 + .2, .1],
      [opening.x1, (opening.z0 + opening.z1) / 2, .1, opening.z1 - opening.z0],
      [opening.x0, (opening.z0 + opening.z1) / 2, .1, opening.z1 - opening.z0],
    ]) box(g, M.brass, w, .035, d, x, y + .03, zz);
  }
  return g;
}

export function buildFloorBase(M, floorIndex) {
  const f = FLOORS[floorIndex];
  const g = grp(`FloorBase_${floorIndex}`);
  if (floorIndex === 0) {
    box(g, M.baseStone, 26.7, .35, 16.7, 0, .175, 0, { cast: false });
    box(g, M.marble, 25.9, .02, 15.9, 0, .352, 0, { cast: false });
    // foundation plinth
    box(g, M.baseStone, 27.1, .28, 17.1, 0, .14, 0);
  } else {
    const slab = slabWithOpening(M, f.base, f.slab, f.base, STAIR_OPENING);
    g.add(slab);
    // corridor / hall paving continuous under room finishes
    const pieces = [
      [-12.72, -2.7, -7.72, 7.72], [2.7, 12.72, -7.72, 7.72],
      [-2.7, 2.7, -7.72, -5.55], [-2.7, 2.7, -.9, 7.72],
    ];
    for (const [x0, x1, z0, z1] of pieces) {
      if (x1 - x0 < .01 || z1 - z0 < .01) continue;
      plane(g, M.marbleCool, x1 - x0, z1 - z0, (x0 + x1) / 2, f.base + .012, (z0 + z1) / 2);
    }
  }
  return g;
}

function stairFlight(parent, M, opts) {
  const { x, z0, z1, base, steps, rise, width, dir = 1 } = opts;
  const depth = Math.abs(z1 - z0) / steps;
  const g = grp('Stair_Flight');
  for (let i = 0; i < steps; i++) {
    const top = base + (i + 1) * rise;
    const z = z0 + dir * (i + .5) * depth;
    box(g, M.baseStone, width, .08, depth + .01, x, top - .04, z);
    // supporting mass beneath each step
    box(g, M.whiteStone, width - .12, (i + 1) * rise - .04, depth - .02, x, base + ((i + 1) * rise - .04) / 2, z);
    // velvet runner
    box(g, M.velvetBlue, width * .52, .018, depth + .025, x, top + .012, z, { cast: false });
    cylinder(g, M.brass, .016, .016, width * .56, 8, x, top + .005, z - depth / 2 + .025, { rz: PI / 2 });
  }
  parent.add(g);
  return g;
}

function ironRailOnStair(parent, M, x, z0, z1, base, y0, y1, side = 1) {
  const g = grp('Stair_Railing');
  const steps = 13;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const z = THREE.MathUtils.lerp(z0, z1, t);
    const yy = THREE.MathUtils.lerp(y0, y1, t);
    cylinder(g, M.iron, .015, .018, .88, 6, x, yy + .44, z);
    sphere(g, M.brass, .027, x, yy + .90, z);
  }
  const hand = tube(g, M.walnut, [new THREE.Vector3(x, y0 + .93, z0), new THREE.Vector3(x, y1 + .93, z1)], .035, 0, 0, 0, { radial: 8, segments: 2 });
  parent.add(g);
  return g;
}

export function buildStair(M, floorIndex = 0) {
  const f = FLOORS[floorIndex];
  const nf = FLOORS[floorIndex + 1];
  if (!nf) return null;
  const base = f.base;
  const target = nf.base;
  const g = grp('Grand_Stair');
  g.userData.hideInFloorView = false;
  g.userData.stairTo = floorIndex + 1;
  const gap = target - base;
  const steps = 9;
  const rise = gap / (steps * 2);
  const landingY = base + steps * rise;
  const depth = 3.75 / steps;
  // first flight, west side, ascending away from the entrance
  stairFlight(g, M, { x: -1.30, z0: -1.15, z1: -4.85, base, steps, rise, width: 2.55, dir: -1 });
  // landing
  box(g, M.baseStone, 5.35, .12, 1.05, 0, landingY - .06, -5.32);
  box(g, M.whiteStone, 5.35, .18, .12, 0, landingY + .05, -5.82);
  box(g, M.velvetBlue, 2.2, .018, .9, 0, landingY + .012, -5.32, { cast: false });
  // second flight, east side, ascending toward the hall
  for (let i = 0; i < steps; i++) {
    const top = landingY + (i + 1) * rise;
    const z = -4.85 + (i + .5) * depth;
    box(g, M.baseStone, 2.55, .08, depth + .01, 1.30, top - .04, z);
    box(g, M.whiteStone, 2.43, (i + 1) * rise - .04, depth - .02, 1.30, landingY + ((i + 1) * rise - .04) / 2, z);
    box(g, M.velvetBlue, 1.32, .018, depth + .025, 1.30, top + .012, z, { cast: false });
    cylinder(g, M.brass, .016, .016, 1.4, 8, 1.30, top + .005, z - depth / 2 + .025, { rz: PI / 2 });
  }
  // top nose into the hall
  box(g, M.baseStone, 2.55, .08, .45, 1.30, target - .04, -1.08);
  // side stringers and newels
  for (const [x, y0, y1, z0, z1] of [
    [-2.62, base, landingY, -1.05, -5.0],
    [2.62, landingY, target, -1.0, -5.0],
  ]) {
    ironRailOnStair(g, M, x, z0, z1, base, y0, y1);
  }
  // central balustrade on the inner edge of each flight
  ironRailOnStair(g, M, -.05, -1.1, -3.9, base, base, landingY - .8);
  ironRailOnStair(g, M, .05, -4.35, -1.0, base, landingY + .55, target - .2);
  // carved newel posts
  for (const [x, z, y] of [[-2.62, -1.05, base], [2.62, -1.0, target]]) {
    lathe(g, M.walnut, [[.10, 0], [.15, .05], [.12, .18], [.17, .38], [.12, .62], [.15, .85], [.08, .98]], 14, x, y, z);
    sphere(g, M.brass, .11, x, y + 1.02, z);
  }
  // under stair panelling
  box(g, M.whiteTrim, .18, 1.25, 3.8, -.02, base + .65, -2.9);
  return g;
}

// Upper-floor balustrade around the stairwell; one side is left open where the
// staircase arrives, making the plan readable from above.
function addSlimRailing(parent, M, opts) {
  const { axis = 'z', fixed, from, to, y, height = .86, spacing = .17 } = opts;
  const g = grp('Slim_Iron_Railing');
  const len = Math.abs(to - from);
  const count = Math.max(3, Math.floor(len / spacing));
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const u = THREE.MathUtils.lerp(from, to, t);
    const x = axis === 'z' ? fixed : u;
    const z = axis === 'z' ? u : fixed;
    cylinder(g, M.iron, .009, .011, height, 5, x, y + height / 2, z);
  }
  if (axis === 'z') {
    box(g, M.walnut, .075, .065, len + .08, fixed, y + height, (from + to) / 2);
    for (const u of [from, to]) {
      box(g, M.iron, .055, .96, .055, fixed, y + .48, u);
      sphere(g, M.brass, .045, fixed, y + 1.0, u);
    }
  } else {
    box(g, M.walnut, len + .08, .065, .075, (from + to) / 2, y + height, fixed);
    for (const u of [from, to]) {
      box(g, M.iron, .055, .96, .055, u, y + .48, fixed);
      sphere(g, M.brass, .045, u, y + 1.0, fixed);
    }
  }
  parent.add(g);
  return g;
}

export function stairwellRailing(M, floorIndex) {
  if (floorIndex === 0) return null;
  const g = grp('Stairwell_Railing');
  const y = FLOORS[floorIndex].base;
  const op = STAIR_OPENING;
  addSlimRailing(g, M, { axis: 'z', fixed: op.x0 - .05, from: op.z0, to: op.z1, y, height: .87 });
  addSlimRailing(g, M, { axis: 'z', fixed: op.x1 + .05, from: op.z0, to: op.z1, y, height: .87 });
  addSlimRailing(g, M, { axis: 'x', fixed: op.z0 - .05, from: op.x0, to: op.x1, y, height: .87 });
  return g;
}

/* ------------------------------------------------------------------ */
/*  Level shells and facade details                                   */
/* ------------------------------------------------------------------ */

const SOUTH_WINDOWS = [
  [
    { center: 0, width: 2.75, bottom: .35, top: 3.35, type: 'door' },
    { center: -6.55, width: 1.9, bottom: .85, top: 3.1, type: 'window' },
    { center: 6.55, width: 1.9, bottom: .85, top: 3.1, type: 'window' },
    { center: -10.7, width: 1.5, bottom: .85, top: 3.1, type: 'window' },
    { center: 10.7, width: 1.5, bottom: .85, top: 3.1, type: 'window' },
  ],
  [
    { center: 0, width: 2.05, bottom: 4.14, top: 6.9, type: 'french' },
    { center: -2.7, width: 1.38, bottom: 4.7, top: 6.95, type: 'window' },
    { center: 2.7, width: 1.38, bottom: 4.7, top: 6.95, type: 'window' },
    { center: -7.1, width: 1.7, bottom: 4.72, top: 6.95, type: 'window' },
    { center: 7.1, width: 1.7, bottom: 4.72, top: 6.95, type: 'window' },
    { center: -10.95, width: 1.4, bottom: 4.72, top: 6.95, type: 'window' },
    { center: 10.95, width: 1.4, bottom: 4.72, top: 6.95, type: 'window' },
  ],
  [
    { center: 0, width: 1.95, bottom: 7.74, top: 10.25, type: 'french' },
    { center: -2.75, width: 1.3, bottom: 8.25, top: 10.25, type: 'window' },
    { center: 2.75, width: 1.3, bottom: 8.25, top: 10.25, type: 'window' },
    { center: -7.1, width: 1.6, bottom: 8.25, top: 10.25, type: 'window' },
    { center: 7.1, width: 1.6, bottom: 8.25, top: 10.25, type: 'window' },
    { center: -10.85, width: 1.3, bottom: 8.25, top: 10.25, type: 'window' },
    { center: 10.85, width: 1.3, bottom: 8.25, top: 10.25, type: 'window' },
  ],
];
const NORTH_WINDOWS = [
  [
    { center: 0, width: 2.4, bottom: 1.2, top: 3.45, type: 'window' },
    { center: -7.1, width: 1.7, bottom: .35, top: 3.1, type: 'french' },
    { center: 7.1, width: 1.7, bottom: 1.0, top: 3.1, type: 'window' },
    { center: -10.9, width: 1.4, bottom: 1.0, top: 3.1, type: 'window' },
    { center: 10.9, width: 1.4, bottom: 1.0, top: 3.1, type: 'window' },
  ],
  [
    { center: 0, width: 2.0, bottom: 4.14, top: 6.95, type: 'french' },
    { center: -7.3, width: 1.4, bottom: 4.72, top: 6.95, type: 'window' },
    { center: 7.3, width: 1.4, bottom: 4.72, top: 6.95, type: 'window' },
    { center: -10.9, width: 1.2, bottom: 4.72, top: 6.95, type: 'window' },
    { center: 10.9, width: 1.2, bottom: 4.72, top: 6.95, type: 'window' },
  ],
  [
    { center: 0, width: 1.65, bottom: 8.35, top: 10.28, type: 'window' },
    { center: -7.3, width: 1.35, bottom: 8.25, top: 10.28, type: 'window' },
    { center: 7.3, width: 1.35, bottom: 8.25, top: 10.28, type: 'window' },
    { center: -10.9, width: 1.15, bottom: 8.25, top: 10.28, type: 'window' },
    { center: 10.9, width: 1.15, bottom: 8.25, top: 10.28, type: 'window' },
  ],
];

const SIDE_WINDOWS = [
  [{ c: -4.9, w: 1.45 }, { c: .0, w: 1.45 }, { c: 4.9, w: 1.45 }],
  [{ c: -4.9, w: 1.3 }, { c: .0, w: 1.3 }, { c: 4.9, w: 1.3 }],
  [{ c: -4.9, w: 1.2 }, { c: .0, w: 1.2 }, { c: 4.9, w: 1.2 }],
];

function perimeterStrip(parent, M, mat, y, h, out = .06, thick = .28) {
  const x = HOUSE.halfX + out, z = HOUSE.halfZ + out;
  box(parent, mat, x * 2 + thick * 2, h, thick, 0, y, z + thick / 2);
  box(parent, mat, x * 2 + thick * 2, h, thick, 0, y, -z - thick / 2);
  box(parent, mat, thick, h, z * 2, x + thick / 2, y, 0);
  box(parent, mat, thick, h, z * 2, -x - thick / 2, y, 0);
}

function addFacadeTrim(M, g, fi) {
  const f = FLOORS[fi];
  const y0 = f.base, top = f.base + f.height;
  // stone base course: a hollow perimeter moulding, never a solid slab
  if (fi === 0) {
    perimeterStrip(g, M, M.baseStone, .38, .13, .08, .24);
    perimeterStrip(g, M, M.baseStone, .52, .06, .11, .18);
    box(g, M.baseStone, 5.1, .22, .35, 0, .22, HOUSE.halfZ + .08);
    for (const sx of [-1, 1]) {
      box(g, M.baseStone, 10.8, .55, .35, sx * 7.55, .62, HOUSE.halfZ + .08);
      box(g, M.baseStone, .35, .55, 15.9, sx * (HOUSE.halfX + .08), .62, 0);
    }
    box(g, M.baseStone, 26.6, .55, .35, 0, .62, -HOUSE.halfZ - .08);
  }
  perimeterStrip(g, M, M.whiteStone, y0 + .04, .10, .10, .20);
  perimeterStrip(g, M, M.whiteStone, y0 + .13, .05, .16, .12);
  // mid-level cornice band
  perimeterStrip(g, M, M.whiteStone, top - .08, .09, .06, .22);
  perimeterStrip(g, M, M.whiteStone, top - .16, .05, .10, .12);
  // quoins, all four corners
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const w = i % 2 === 0 ? .85 : .55;
      box(g, M.whiteStone, w, .40, .38, sx * (HOUSE.halfX - w / 2 + .07), y0 + .38 + i * .54, sz * (HOUSE.halfZ + .04));
      box(g, M.whiteStone, .38, .40, w, sx * (HOUSE.halfX + .04), y0 + .38 + i * .54, sz * (HOUSE.halfZ - w / 2 + .07));
    }
  }
  // shallow rustication joints, applied only to the outer faces
  if (fi === 0) {
    for (let i = 0; i < 4; i++) {
      const y = y0 + 1.0 + i * .52;
      box(g, M.whiteStone, 26.2, .018, .035, 0, y, HOUSE.halfZ + .255, { cast: false });
      box(g, M.whiteStone, 26.2, .018, .035, 0, y, -HOUSE.halfZ - .255, { cast: false });
      box(g, M.whiteStone, .035, .018, 15.5, HOUSE.halfX + .255, y, 0, { cast: false });
      box(g, M.whiteStone, .035, .018, 15.5, -HOUSE.halfX - .255, y, 0, { cast: false });
    }
  }
  // carved window surrounds / pediments are added with the windows.
}

export function buildFloorShell(M, floorIndex) {
  const f = FLOORS[floorIndex];
  const shell = grp(`CUT_Shell_${floorIndex}`);
  shell.userData.cut = true;
  shell.userData.type = 'architecture';
  const interior = grp(`Interior_Walls_${floorIndex}`);
  interior.userData.cut = true;
  const windowsGroup = grp('Windows');
  addFacadeTrim(M, shell, floorIndex);

  // Outer wall openings, including a genuine aperture behind the grand entrance door.
  const southOps = SOUTH_WINDOWS[floorIndex].map(o => floorIndex === 0 && o.type === 'door'
    ? { ...o, width: 2.9, top: f.base + 3.42 }
    : o);
  wallWithOpenings(shell, M.stoneWall, {
    axis: 'x', fixed: HOUSE.halfZ, from: -HOUSE.halfX, to: HOUSE.halfX,
    base: f.base, top: f.base + f.height, thickness: HOUSE.wall,
    openings: southOps, name: 'Facade_South',
  });
  wallWithOpenings(shell, M.stoneWall, {
    axis: 'x', fixed: -HOUSE.halfZ, from: -HOUSE.halfX, to: HOUSE.halfX,
    base: f.base, top: f.base + f.height, thickness: HOUSE.wall,
    openings: NORTH_WINDOWS[floorIndex], name: 'Facade_North',
  });
  const sideBottom = f.base + .65;
  const sideTop = f.base + 2.95;
  for (const [wall, xSign] of [['east', 1], ['west', -1]]) {
    const ops = SIDE_WINDOWS[floorIndex].map(({ c, w }) => ({
      center: c, width: w, bottom: sideBottom, top: sideTop,
    }));
    wallWithOpenings(shell, M.stoneWall, {
      axis: 'z', fixed: xSign * HOUSE.halfX, from: -HOUSE.halfZ, to: HOUSE.halfZ,
      base: f.base, top: f.base + f.height, thickness: HOUSE.wall,
      openings: ops, name: `Facade_${wall}`,
    });
  }

  // giant order pilasters articulate the symmetrical garden facades
  for (const zSign of [1, -1]) {
    for (const px of [-5.35, 5.35]) {
      addPilaster(shell, M, px, zSign * (HOUSE.halfZ + .24), f.base + .18, f.height - .45, .58, .14, zSign > 0 ? 0 : PI);
    }
  }

  // Windows & doors
  for (const o of SOUTH_WINDOWS[floorIndex]) {
    if (o.type === 'door') continue;
    addWindow(windowsGroup, M, {
      wall: 'south', u: o.center, bottom: o.bottom, width: o.width,
      height: o.top - o.bottom, type: o.type,
      pediment: floorIndex === 1 && Math.abs(o.center) > 5 ? 'triangle' : (floorIndex === 0 && Math.abs(o.center) > 5 ? 'segment' : null),
      guard: false,
    });
  }
  for (const o of NORTH_WINDOWS[floorIndex]) {
    addWindow(windowsGroup, M, {
      wall: 'north', u: o.center, bottom: o.bottom, width: o.width, height: o.top - o.bottom,
      pediment: floorIndex === 1 && Math.abs(o.center) > 5 ? 'triangle' : null,
      type: o.type,
    });
  }
  for (const [wall, xSign] of [['east', 1], ['west', -1]]) {
    for (const o of SIDE_WINDOWS[floorIndex]) {
      addWindow(windowsGroup, M, {
        wall, u: o.c, bottom: sideBottom,
        width: o.w, height: sideTop - sideBottom,
        pediment: floorIndex === 1 ? 'segment' : null,
      });
    }
  }
  shell.add(windowsGroup);

  /* interior partitions */
  const t = HOUSE.partition;
  const interiorTop = f.base + f.height;
  if (floorIndex === 0) {
    // west / east spine walls around the central hall
    wallWithOpenings(interior, M.stoneWall, {
      axis: 'z', fixed: -3.1, from: -HOUSE.innerHalfZ, to: HOUSE.innerHalfZ,
      base: f.base, top: interiorTop, thickness: t,
      openings: [
        { center: 4.55, width: 1.65, bottom: f.base, top: f.base + 2.62 },
        { center: -6.25, width: 1.15, bottom: f.base, top: f.base + 2.35 },
      ],
      name: 'Partition_West',
    });
    wallWithOpenings(interior, M.stoneWall, {
      axis: 'z', fixed: 3.1, from: -HOUSE.innerHalfZ, to: HOUSE.innerHalfZ,
      base: f.base, top: interiorTop, thickness: t,
      openings: [
        { center: 4.55, width: 1.65, bottom: f.base, top: f.base + 2.62 },
        { center: -6.25, width: 1.15, bottom: f.base, top: f.base + 2.35 },
      ],
      name: 'Partition_East',
    });
    // front rooms / rear service rooms
    for (const [x0, x1, doorX] of [[-HOUSE.innerHalfX, -3.1, -8.4], [3.1, HOUSE.innerHalfX, 8.4]]) {
      wallWithOpenings(interior, M.stoneWall, {
        axis: 'x', fixed: .55, from: x0, to: x1, base: f.base, top: interiorTop, thickness: t,
        openings: [{ center: doorX, width: 1.25, bottom: f.base, top: f.base + 2.42 }],
        name: 'Partition_Rear',
      });
    }
  } else if (floorIndex === 1) {
    wallWithOpenings(interior, M.stoneWall, {
      axis: 'z', fixed: -3.1, from: -HOUSE.innerHalfZ, to: HOUSE.innerHalfZ,
      base: f.base, top: interiorTop, thickness: t,
      openings: [
        { center: 4.75, width: 1.3, bottom: f.base, top: f.base + 2.55 },
        { center: -6.15, width: 1.1, bottom: f.base, top: f.base + 2.4 },
      ],
      name: 'Partition_West_2',
    });
    wallWithOpenings(interior, M.stoneWall, {
      axis: 'z', fixed: 3.1, from: -HOUSE.innerHalfZ, to: HOUSE.innerHalfZ,
      base: f.base, top: interiorTop, thickness: t,
      openings: [
        { center: 4.75, width: 1.3, bottom: f.base, top: f.base + 2.55 },
        { center: -6.15, width: 1.1, bottom: f.base, top: f.base + 2.4 },
      ],
      name: 'Partition_East_2',
    });
    // master suite division
    wallWithOpenings(interior, M.stoneWall, {
      axis: 'x', fixed: .55, from: -HOUSE.innerHalfX, to: -3.1, base: f.base, top: interiorTop, thickness: t,
      openings: [{ center: -5.0, width: 1.25, bottom: f.base, top: f.base + 2.45 }],
      name: 'Partition_Master_Rear',
    });
    wallWithOpenings(interior, M.stoneWall, {
      axis: 'z', fixed: -8.15, from: -HOUSE.innerHalfZ, to: .55, base: f.base, top: interiorTop, thickness: t,
      openings: [{ center: -3.2, width: 1.0, bottom: f.base, top: f.base + 2.4 }],
      name: 'Partition_Bath_Dressing',
    });
    // guest suite division
    wallWithOpenings(interior, M.stoneWall, {
      axis: 'x', fixed: .55, from: 3.1, to: HOUSE.innerHalfX, base: f.base, top: interiorTop, thickness: t,
      openings: [],
      name: 'Partition_Guest_Rear',
    });
    wallWithOpenings(interior, M.stoneWall, {
      axis: 'z', fixed: 8.95, from: -HOUSE.innerHalfZ, to: .55, base: f.base, top: interiorTop, thickness: t,
      openings: [{ center: -6.3, width: .95, bottom: f.base, top: f.base + 2.35 }],
      name: 'Partition_Guest_Bath',
    });
    // family lounge cased opening to stair hall
    wallWithOpenings(interior, M.stoneWall, {
      axis: 'x', fixed: 1.15, from: -3.1, to: 3.1, base: f.base, top: interiorTop, thickness: t,
      openings: [{ center: 0, width: 3.1, bottom: f.base, top: f.base + 2.65 }],
      name: 'Partition_Lounge',
    });
  } else {
    wallWithOpenings(interior, M.stoneWall, {
      axis: 'z', fixed: -4.0, from: -HOUSE.innerHalfZ, to: HOUSE.innerHalfZ,
      base: f.base, top: interiorTop, thickness: t,
      openings: [
        { center: 4.75, width: 1.3, bottom: f.base, top: f.base + 2.5 },
        { center: -6.15, width: 1.2, bottom: f.base, top: f.base + 2.45 },
      ],
      name: 'Partition_West_3',
    });
    wallWithOpenings(interior, M.stoneWall, {
      axis: 'z', fixed: 4.0, from: -HOUSE.innerHalfZ, to: HOUSE.innerHalfZ,
      base: f.base, top: interiorTop, thickness: t,
      openings: [
        { center: 4.75, width: 1.3, bottom: f.base, top: f.base + 2.5 },
        { center: -6.15, width: 1.2, bottom: f.base, top: f.base + 2.45 },
      ],
      name: 'Partition_East_3',
    });
    wallWithOpenings(interior, M.stoneWall, {
      axis: 'x', fixed: .55, from: -HOUSE.innerHalfX, to: -4.0, base: f.base, top: interiorTop, thickness: t,
      openings: [], name: 'Partition_Studio_Rear',
    });
    wallWithOpenings(interior, M.stoneWall, {
      axis: 'x', fixed: .55, from: 4.0, to: HOUSE.innerHalfX, base: f.base, top: interiorTop, thickness: t,
      openings: [], name: 'Partition_Gym_Rear',
    });
    wallWithOpenings(interior, M.stoneWall, {
      axis: 'x', fixed: 1.2, from: -4.0, to: 4.0, base: f.base, top: interiorTop, thickness: t,
      openings: [{ center: 0, width: 3.2, bottom: f.base, top: f.base + 2.6 }],
      name: 'Partition_Belvedere',
    });
  }
  shell.add(interior);
  // door casings at every opening (interior) for a refined finish
  addDoorCasings(M, shell, floorIndex);
  return shell;
}

function addDoorCasings(M, parent, fi) {
  const f = FLOORS[fi];
  const door = (x, z, ry, w = 1.2, h = 2.4) => {
    const g = grp('Cased_Opening');
    g.position.set(x, f.base, z); g.rotation.y = ry;
    box(g, M.whiteTrim, w + .22, .16, .24, 0, h + .08, 0);
    box(g, M.whiteTrim, .11, h, .22, -w / 2 - .055, h / 2, 0);
    box(g, M.whiteTrim, .11, h, .22, w / 2 + .055, h / 2, 0);
    box(g, M.whiteTrim, w + .3, .07, .28, 0, h + .18, 0);
    box(g, M.gold, w + .12, .018, .03, 0, h + .12, .13);
    parent.add(g);
  };
  if (fi === 0) {
    door(-3.1, 4.55, PI / 2, 1.65, 2.62); door(3.1, 4.55, PI / 2, 1.65, 2.62);
    door(-3.1, -6.25, PI / 2, 1.15, 2.35); door(3.1, -6.25, PI / 2, 1.15, 2.35);
    door(-8.4, .55, 0, 1.25, 2.42); door(8.4, .55, 0, 1.25, 2.42);
  } else if (fi === 1) {
    door(-3.1, 4.75, PI / 2, 1.3, 2.55); door(3.1, 4.75, PI / 2, 1.3, 2.55);
    door(-3.1, -6.15, PI / 2, 1.1, 2.4); door(3.1, -6.15, PI / 2, 1.1, 2.4);
    door(-5.0, .55, 0, 1.25, 2.45); door(-8.15, -3.2, PI / 2, 1.0, 2.4);
    door(8.95, -6.3, PI / 2, .95, 2.35);
    door(0, 1.15, 0, 3.1, 2.65);
  } else {
    door(-4.0, 4.75, PI / 2, 1.3, 2.5); door(4.0, 4.75, PI / 2, 1.3, 2.5);
    door(-4.0, -6.15, PI / 2, 1.2, 2.45); door(4.0, -6.15, PI / 2, 1.2, 2.45);
    door(0, 1.2, 0, 3.2, 2.6);
  }
}

/* ------------------------------------------------------------------ */
/*  Low-wall cutaway shells for the dollhouse floor-plan views        */
/* ------------------------------------------------------------------ */

function capLowWall(M, group) {
  const pieces = group.children.filter(c => c.isMesh);
  for (const piece of pieces) {
    const { x: sx, y: sy, z: sz } = piece.scale;
    box(group, M.whiteStone, sx + .035, .045, sz + .035,
      piece.position.x, piece.position.y + sy / 2 + .022, piece.position.z);
  }
}

function lowInteriorSpecs(fi) {
  if (fi === 0) {
    return [
      { axis: 'z', fixed: -3.1, from: -HOUSE.innerHalfZ, to: HOUSE.innerHalfZ, thickness: .13, openings: [
        { center: 4.55, width: 1.65, bottom: 0, top: 4 },
        { center: -6.25, width: 1.15, bottom: 0, top: 4 },
      ] },
      { axis: 'z', fixed: 3.1, from: -HOUSE.innerHalfZ, to: HOUSE.innerHalfZ, thickness: .13, openings: [
        { center: 4.55, width: 1.65, bottom: 0, top: 4 },
        { center: -6.25, width: 1.15, bottom: 0, top: 4 },
      ] },
      { axis: 'x', fixed: .55, from: -HOUSE.innerHalfX, to: -3.1, thickness: .13, openings: [{ center: -8.4, width: 1.25, bottom: 0, top: 4 }] },
      { axis: 'x', fixed: .55, from: 3.1, to: HOUSE.innerHalfX, thickness: .13, openings: [{ center: 8.4, width: 1.25, bottom: 0, top: 4 }] },
    ];
  }
  if (fi === 1) {
    return [
      { axis: 'z', fixed: -3.1, from: -HOUSE.innerHalfZ, to: HOUSE.innerHalfZ, thickness: .13, openings: [
        { center: 4.75, width: 1.3, bottom: 0, top: 4 },
        { center: -6.15, width: 1.1, bottom: 0, top: 4 },
      ] },
      { axis: 'z', fixed: 3.1, from: -HOUSE.innerHalfZ, to: HOUSE.innerHalfZ, thickness: .13, openings: [
        { center: 4.75, width: 1.3, bottom: 0, top: 4 },
        { center: -6.15, width: 1.1, bottom: 0, top: 4 },
      ] },
      { axis: 'x', fixed: .55, from: -HOUSE.innerHalfX, to: -3.1, thickness: .13, openings: [{ center: -5.0, width: 1.25, bottom: 0, top: 4 }] },
      { axis: 'x', fixed: .55, from: 3.1, to: HOUSE.innerHalfX, thickness: .13, openings: [] },
      { axis: 'z', fixed: -8.15, from: -HOUSE.innerHalfZ, to: .55, thickness: .13, openings: [{ center: -3.2, width: 1.0, bottom: 0, top: 4 }] },
      { axis: 'z', fixed: 8.95, from: -HOUSE.innerHalfZ, to: .55, thickness: .13, openings: [{ center: -6.3, width: .95, bottom: 0, top: 4 }] },
      { axis: 'x', fixed: 1.15, from: -3.1, to: 3.1, thickness: .13, openings: [{ center: 0, width: 3.1, bottom: 0, top: 4 }] },
    ];
  }
  return [
    { axis: 'z', fixed: -4.0, from: -HOUSE.innerHalfZ, to: HOUSE.innerHalfZ, thickness: .13, openings: [
      { center: 4.75, width: 1.3, bottom: 0, top: 4 },
      { center: -6.15, width: 1.2, bottom: 0, top: 4 },
    ] },
    { axis: 'z', fixed: 4.0, from: -HOUSE.innerHalfZ, to: HOUSE.innerHalfZ, thickness: .13, openings: [
      { center: 4.75, width: 1.3, bottom: 0, top: 4 },
      { center: -6.15, width: 1.2, bottom: 0, top: 4 },
    ] },
    { axis: 'x', fixed: .55, from: -HOUSE.innerHalfX, to: -4.0, thickness: .13, openings: [] },
    { axis: 'x', fixed: .55, from: 4.0, to: HOUSE.innerHalfX, thickness: .13, openings: [] },
    { axis: 'x', fixed: 1.2, from: -4.0, to: 4.0, thickness: .13, openings: [{ center: 0, width: 3.2, bottom: 0, top: 4 }] },
  ];
}

export function buildFloorCutWalls(M, fi) {
  const f = FLOORS[fi];
  const cutTop = f.base + 1.12;
  const g = grp(`ArchitectureCut_${fi}`);
  g.userData = { type: 'architecture-cut', cutaway: true, floor: fi };
  const doorS = SOUTH_WINDOWS[fi]
    .filter(o => o.type === 'door' || o.type === 'french')
    .map(o => ({ center: o.center, width: o.width, bottom: 0, top: 5 }));
  const doorN = NORTH_WINDOWS[fi]
    .filter(o => o.type === 'door' || o.type === 'french')
    .map(o => ({ center: o.center, width: o.width, bottom: 0, top: 5 }));
  const addOuter = (spec) => {
    const w = wallWithOpenings(g, M.stoneWall, {
      ...spec, base: f.base, top: cutTop, thickness: .40,
      openings: (spec.openings || []).map(o => ({ ...o, bottom: f.base, top: cutTop + .2 })),
    });
    capLowWall(M, w);
    return w;
  };
  addOuter({ axis: 'x', fixed: HOUSE.halfZ, from: -HOUSE.halfX, to: HOUSE.halfX, openings: doorS, name: 'Cut_Facade_South' });
  addOuter({ axis: 'x', fixed: -HOUSE.halfZ, from: -HOUSE.halfX, to: HOUSE.halfX, openings: doorN, name: 'Cut_Facade_North' });
  addOuter({ axis: 'z', fixed: -HOUSE.halfX, from: -HOUSE.halfZ, to: HOUSE.halfZ, openings: [], name: 'Cut_Facade_West' });
  addOuter({ axis: 'z', fixed: HOUSE.halfX, from: -HOUSE.halfZ, to: HOUSE.halfZ, openings: [], name: 'Cut_Facade_East' });
  for (const spec of lowInteriorSpecs(fi)) {
    const w = wallWithOpenings(g, M.stoneWall, {
      ...spec, base: f.base, top: cutTop, thickness: .12,
      openings: spec.openings.map(o => ({ ...o, bottom: f.base, top: cutTop + .2 })),
    });
    capLowWall(M, w);
  }
  // A thin brass datum line makes the conceptual cut legible from above.
  for (const [w, d, x, z] of [
    [HOUSE.halfX * 2 + .1, .025, 0, HOUSE.halfZ - .19],
    [HOUSE.halfX * 2 + .1, .025, 0, -HOUSE.halfZ + .19],
    [.025, HOUSE.halfZ * 2 + .1, HOUSE.halfX - .19, 0],
    [.025, HOUSE.halfZ * 2 + .1, -HOUSE.halfX + .19, 0],
  ]) box(g, M.brass, w, .012, d, x, cutTop + .003, z, { cast: false });
  mergeGroup(g);
  return g;
}

export function buildExteriorDetails(M, exteriors, site) {
  buildPortico(M, site, exteriors);
  buildThirdBalcony(M, exteriors);
  buildRearBalcony(M, exteriors);
  // front entrance door belongs to the facade
  const dg = grp('Entrance');
  addEntranceDoor(dg, M);
  exteriors.add(dg);
  // wall lanterns and pilasters
  const lights = grp('Facade_Lanterns');
  for (const [x, y, z] of [[-3.7, 2.55, 8.35], [3.7, 2.55, 8.35], [-4.95, 6.2, 8.35], [4.95, 6.2, 8.35], [0, 9.8, 8.35]]) {
    const l = grp('Wall_Lantern');
    l.position.set(x, y, z);
    box(l, M.bronze, .14, .04, .32, 0, .32, -.05, { rx: -.2 });
    box(l, M.bronze, .23, .36, .23, 0, .12, .12);
    box(l, M.bulb, .16, .28, .16, 0, .12, .12);
    sphere(l, M.bronze, .035, 0, -.09, .12);
    lights.add(l);
  }
  exteriors.add(lights);
  // urns on the balcony corners
  
  // roof lanterns at the axis? handled by roof group
  exteriors.userData.hideInFloorView = true;
  return exteriors;
}
