import * as THREE from 'three';
import {
  box, roundedBox, cylinder, sphere, plane, torus, lathe, tube, mergeGroup,
  addBalustrade, seeded,
} from './geom.js';

const PI = Math.PI;
const group = (name) => { const g = new THREE.Group(); g.name = name; return g; };
const gAdd = (parent, child) => { parent.add(child); return child; };

function legs(g, M, w, d, h, inset = 0.12, style = 'turn', mat = M.walnut) {
  const xs = [-w / 2 + inset, w / 2 - inset];
  const zs = [-d / 2 + inset, d / 2 - inset];
  for (const x of xs) for (const z of zs) {
    if (style === 'turn') {
      lathe(g, mat, [[0.032, 0], [0.055, 0.012], [0.045, 0.045], [0.028, h * .38], [0.048, h * .62], [0.033, h * .82], [0.05, h]], 10, x, 0, z);
      box(g, M.brass, 0.065, 0.025, 0.065, x, 0.013, z);
    } else if (style === 'tapered') {
      cylinder(g, mat, 0.023, 0.039, h, 8, x, h / 2, z);
      box(g, M.brass, 0.055, 0.02, 0.055, x, 0.01, z);
    } else {
      box(g, mat, 0.07, h, 0.07, x, h / 2, z);
      box(g, M.brass, 0.08, 0.02, 0.08, x, 0.01, z);
    }
  }
}

export function sofa(M, opts = {}) {
  const {
    width = 2.7, depth = 1.02, fabric = M.linenCream, accent = M.velvetBlue,
    style = 'louis', legsH = 0.25, tufted = true,
  } = opts;
  const g = group('Sofa');
  const d = depth, w = width;
  const seatH = 0.52;
  legs(g, M, w - .1, d - .12, legsH, 0.16, 'turn');
  box(g, M.walnut, w - .18, .09, d - .18, 0, legsH + .04, 0);
  // upholstered apron
  roundedBox(g, fabric, w - .26, .20, d - .24, .05, 0, legsH + .17, 0);
  // seat cushions (two / three)
  const cushionCount = width > 2.1 ? 3 : 2;
  const cw = (w - .38 - .06 * (cushionCount - 1)) / cushionCount;
  for (let i = 0; i < cushionCount; i++) {
    const x = -w / 2 + .19 + cw / 2 + i * (cw + .06);
    roundedBox(g, fabric, cw, .16, d - .28, .06, x, legsH + .35, .02);
    roundedBox(g, fabric, cw - .04, .05, d - .32, .025, x, legsH + .44, .03);
  }
  // back
  roundedBox(g, fabric, w - .28, .58, .16, .08, 0, legsH + .55, -d / 2 + .13);
  // wood crest
  box(g, M.walnut, w - .22, .065, .11, 0, legsH + .855, -d / 2 + .11);
  const crest = new THREE.Mesh(new THREE.TorusGeometry(.19, .035, 8, 24, PI), M.walnut);
  crest.position.set(0, legsH + .87, -d / 2 + .12); crest.rotation.set(0, 0, 0);
  // subtle centre crest
  g.add(crest);
  if (tufted) {
    for (let x = -w / 2 + .38; x < w / 2 - .25; x += .26) {
      for (let y = 0; y < 2; y++) {
        sphere(g, fabric, .022, x, legsH + .55 + y * .14, -d / 2 + .215, { w: 7, h: 5, cast: false });
        sphere(g, M.brass, .011, x, legsH + .55 + y * .14, -d / 2 + .233, { w: 6, h: 4, cast: false });
      }
    }
  }
  // rolled arms
  for (const sx of [-1, 1]) {
    const ax = sx * (w / 2 - .14);
    roundedBox(g, fabric, .26, .43, d - .22, .09, ax, legsH + .36, .01);
    const roll = cylinder(g, fabric, .135, .135, d - .26, 16, ax, legsH + .60, .01, { rx: PI / 2 });
    sphere(g, fabric, .135, ax, legsH + .60, d / 2 - .13, { sx: .9, sy: .9, sz: 1.1 });
    sphere(g, M.walnut, .055, ax, legsH + .60, d / 2 - .30, { sx: .8, sy: .8, sz: 1.2 });
    // brass nailheads
    for (let i = 0; i < 9; i++) {
      sphere(g, M.brass, .012, ax + sx * .11, legsH + .22 + i * .025, -d / 2 + .25 + i * .075, { w: 5, h: 4, cast: false });
    }
  }
  // feather cushions
  for (let i = 0; i < 2; i++) {
    const m = roundedBox(g, i ? accent : M.linen, .38, .38, .11, .055, (i ? .5 : -.55), legsH + .58, -d / 2 + .30, { rz: (i ? -.18 : .12), ry: (i ? -.2 : .2) });
  }
  g.userData = { kind: 'sofa', width, depth };
  return g;
}

export function armchair(M, opts = {}) {
  const g = sofa(M, { width: 1.02, depth: .92, ...opts });
  g.name = 'Armchair';
  g.userData.kind = 'armchair';
  return g;
}

export function loveseat(M, opts = {}) {
  return sofa(M, { width: 1.78, depth: .96, ...opts });
}

export function bench(M, opts = {}) {
  const { width = 1.35, depth = .46, fabric = M.linenCream } = opts;
  const g = group('Upholstered_Bench');
  legs(g, M, width, depth, .42, .14, 'turn');
  box(g, M.walnut, width - .12, .12, depth - .08, 0, .39, 0);
  roundedBox(g, fabric, width - .08, .18, depth, .05, 0, .52, 0);
  // channel tufting
  for (let x = -width / 2 + .16; x < width / 2 - .1; x += .16) {
    box(g, fabric, .018, .16, depth - .05, x, .525, 0, { cast: false });
  }
  return g;
}

export function ottoman(M, opts = {}) {
  const { r = .46, fabric = M.velvetSage } = opts;
  const g = group('Ottoman');
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * PI * 2 + PI / 4;
    cylinder(g, M.walnut, .025, .045, .24, 8, Math.cos(a) * r * .7, .12, Math.sin(a) * r * .7);
    box(g, M.brass, .055, .02, .055, Math.cos(a) * r * .7, .01, Math.sin(a) * r * .7);
  }
  const body = cylinder(g, fabric, r, r * .95, .3, 24, 0, .38, 0);
  torus(g, M.brass, r * .985, .014, 0, .24, 0, { rx: PI / 2, radial: 40 });
  return g;
}

export function diningChair(M, opts = {}) {
  const { fabric = M.linenCream, wood = M.walnut } = opts;
  const g = group('Louis_Dining_Chair');
  legs(g, M, .54, .54, .43, .08, 'tapered', wood);
  box(g, wood, .52, .07, .52, 0, .39, 0);
  roundedBox(g, fabric, .50, .09, .50, .035, 0, .455, 0);
  // oval back
  const backZ = -.235;
  box(g, wood, .055, .58, .055, -.23, .77, backZ);
  box(g, wood, .055, .58, .055, .23, .77, backZ);
  const torusBack = new THREE.Mesh(new THREE.TorusGeometry(.255, .026, 8, 32), wood);
  torusBack.scale.set(.9, 1.18, 1);
  torusBack.position.set(0, .87, backZ);
  torusBack.castShadow = true; g.add(torusBack);
  const pad = new THREE.Mesh(new THREE.SphereGeometry(.26, 24, 16), fabric);
  pad.scale.set(.82, 1.10, .10);
  pad.position.set(0, .87, backZ - .005);
  pad.castShadow = true; g.add(pad);
  // carved crest
  box(g, wood, .3, .045, .07, 0, 1.14, backZ);
  sphere(g, M.brass, .018, .18, .50, .245, { w: 6, h: 4 });
  return g;
}

export function coffeeTable(M, opts = {}) {
  const { width = 1.75, depth = 1.0, shape = 'oval', top = M.marble } = opts;
  const g = group('Salon_Coffee_Table');
  if (shape === 'oval') {
    const topMesh = cylinder(g, top, 1, 1, .055, 48, 0, .47, 0);
    topMesh.scale.set(width / 2, 1, depth / 2);
    const rim = torus(g, M.brass, 1, .012, 0, .51, 0, { rx: PI / 2, radial: 60 });
    rim.scale.set(width / 2, depth / 2, 1);
    const apron = cylinder(g, M.walnut, .92, .92, .10, 40, 0, .395, 0);
    apron.scale.set(width / 2, 1, depth / 2);
    const lower = cylinder(g, M.walnut, .86, .86, .045, 36, 0, .18, 0);
    lower.scale.set(width / 2, 1, depth / 2);
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * PI * 2 + PI / 4;
      const x = Math.cos(a) * width * .32, z = Math.sin(a) * depth * .34;
      lathe(g, M.walnut, [[.028, 0], [.055, .025], [.035, .16], [.05, .31], [.032, .45]], 10, x, 0, z);
      box(g, M.brass, .07, .028, .07, x, .014, z);
    }
    // coffee-table styling: books + bowl
    box(g, M.books[3], .34, .035, .26, -.25, .525, .05, { ry: .14 });
    box(g, M.books[4], .31, .03, .23, -.23, .557, .04, { ry: .08 });
    const bowl = lathe(g, M.blueCeramic, [[0, 0], [.10, .015], [.17, .07], [.15, .11], [.12, .10]], 24, .3, .53, .05);
    for (let i = 0; i < 4; i++) sphere(g, M.flowers[i % M.flowers.length], .034, .26 + Math.cos(i * 2) * .07, .66, .02 + Math.sin(i * 2) * .06, { w: 8, h: 6 });
  } else {
    box(g, top, width, .055, depth, 0, .47, 0);
    const rim = box(g, M.brass, width + .02, .018, depth + .02, 0, .445, 0);
    box(g, M.walnut, width - .14, .11, depth - .14, 0, .39, 0);
    box(g, M.walnut, width - .24, .04, depth - .24, 0, .16, 0);
    for (const x of [-width / 2 + .12, width / 2 - .12]) for (const z of [-depth / 2 + .12, depth / 2 - .12]) {
      lathe(g, M.walnut, [[.03, 0], [.05, .025], [.035, .2], [.045, .38]], 10, x, 0, z);
      box(g, M.brass, .06, .022, .06, x, .01, z);
    }
    box(g, M.books[2], .34, .035, .25, -.28, .52, .03, { ry: -.1 });
    box(g, M.books[0], .3, .03, .23, -.25, .551, .04, { ry: -.24 });
    addVase(M, g, .32, .50, -.02, .65);
  }
  return g;
}

export function sideTable(M, opts = {}) {
  const { r = .32, top = M.marble } = opts;
  const g = group('Guéridon');
  cylinder(g, top, r, r, .045, 28, 0, .64, 0);
  torus(g, M.brass, r * .96, .01, 0, .67, 0, { rx: PI / 2, radial: 28 });
  lathe(g, M.walnut, [[.04, 0], [.12, .03], [.08, .2], [.05, .38], [.10, .58], [.06, .62]], 18, 0, 0, 0);
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * PI * 2;
    const foot = box(g, M.walnut, .26, .04, .06, Math.cos(a) * .12, .035, Math.sin(a) * .12);
    foot.rotation.y = -a;
  }
  return g;
}

export function consoleTable(M, opts = {}) {
  const { width = 1.65, depth = .42, top = M.marble } = opts;
  const g = group('Console');
  box(g, top, width, .052, depth, 0, .85, 0);
  // rectangular brass gallery rail (an oval ring would incorrectly increase depth)
  const gz = depth / 2 + .015;
  for (const x of [-width / 2 + .01, width / 2 - .01]) box(g, M.brass, .012, .028, depth + .03, x, .877, 0, { cast: false });
  for (const z of [-gz, gz]) box(g, M.brass, width + .02, .012, .012, 0, .877, z, { cast: false });
  for (const x of [-width / 2 + .01, width / 2 - .01]) for (const z of [-gz, gz]) sphere(g, M.brass, .018, x, .877, z, { w: 6, h: 4, cast: false });
  box(g, M.walnut, width - .12, .12, depth - .08, 0, .78, 0);
  for (const x of [-width / 2 + .13, width / 2 - .13]) {
    lathe(g, M.walnut, [[.032, 0], [.06, .02], [.035, .16], [.05, .4], [.032, .7]], 10, x, 0, 0);
    box(g, M.brass, .07, .025, .07, x, .012, 0);
  }
  box(g, M.walnut, width - .34, .04, .035, 0, .18, 0);
  return g;
}

export function sideboard(M, opts = {}) {
  const { width = 2.2, depth = .52, height = .92, wood = M.walnut } = opts;
  const g = group('Sideboard');
  box(g, wood, width, .13, depth, 0, height - .08, 0);
  box(g, M.marble, width + .06, .045, depth + .04, 0, height + .015, 0);
  box(g, wood, width - .04, .54, depth - .06, 0, height - .38, .01);
  for (const x of [-width * .25, width * .25]) {
    box(g, wood, width * .46, .42, .035, x, height - .38, depth / 2 + .005);
    box(g, M.brass, .12, .018, .03, x + .15, height - .32, depth / 2 + .04);
  }
  for (const x of [-width / 2 + .1, width / 2 - .1]) for (const z of [-depth / 2 + .1, depth / 2 - .1]) {
    cylinder(g, M.walnut, .028, .04, .14, 8, x, .07, z);
    box(g, M.brass, .055, .02, .055, x, .01, z);
  }
  addVase(M, g, -width * .28, height + .04, 0, .75);
  box(g, M.books[0], .26, .04, .19, width * .24, height + .06, 0, { ry: .15 });
  box(g, M.books[3], .23, .035, .17, width * .26, height + .10, -.01, { ry: -.1 });
  return g;
}

export function diningSet(M, opts = {}) {
  const { seats = 8, wood = M.walnut, top = M.marble } = opts;
  const g = group('Dining_Set');
  const L = 3.25, D = 1.32, H = .76;
  // oval top
  const t = cylinder(g, top, 1, 1, .065, 64, 0, H, 0);
  t.scale.set(L / 2, 1, D / 2);
  const rim = torus(g, M.brass, 1, .012, 0, H + .035, 0, { rx: PI / 2, radial: 64 });
  rim.scale.set(L / 2, D / 2, 1);
  box(g, wood, L - .3, .11, D - .25, 0, H - .05, 0);
  // twin pedestal bases
  for (const x of [-L * .26, L * .26]) {
    lathe(g, wood, [[.28, 0], [.34, .04], [.16, .12], [.11, .32], [.16, .52], [.09, .64]], 16, x, 0, 0);
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * PI * 2;
      const foot = box(g, wood, .48, .045, .09, x + Math.cos(a) * .20, .04, Math.sin(a) * .20);
      foot.rotation.y = -a;
    }
  }
  // chairs
  const chair = (x, z, ry) => {
    const c = diningChair(M, { fabric: M.linenCream, wood });
    c.position.set(x, 0, z); c.rotation.y = ry;
    g.add(c);
  };
  const xs = [-1.02, 0, 1.02];
  for (const x of xs) { chair(x, D / 2 + .40, PI); chair(x, -D / 2 - .40, 0); }
  if (seats >= 8) { chair(L / 2 + .42, 0, -PI / 2); chair(-L / 2 - .42, 0, PI / 2); }
  // centerpiece
  const bowl = lathe(g, M.whiteStone, [[0, 0], [.13, .01], [.26, .08], [.24, .16], [.19, .15]], 28, 0, H + .04, 0);
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * PI * 2;
    const r = .08 + (i % 4) * .052;
    tube(g, M.leavesFresh, [new THREE.Vector3(0, H + .15, 0), new THREE.Vector3(Math.cos(a) * r, H + .28, Math.sin(a) * r), new THREE.Vector3(Math.cos(a + .2) * r * 1.1, H + .36, Math.sin(a + .2) * r * 1.1)], .004, 0, 0, 0, { radial: 3, segments: 5 });
    sphere(g, M.flowers[i % M.flowers.length], .034 + (i % 3) * .008, Math.cos(a + .2) * r * 1.1, H + .37, Math.sin(a + .2) * r * 1.1, { w: 8, h: 6 });
  }
  // candlesticks
  for (const x of [-.72, .72]) {
    cylinder(g, M.brass, .035, .07, .25, 12, x, H + .16, 0);
    cylinder(g, M.brass, .02, .02, .10, 8, x, H + .33, 0);
    cylinder(g, M.candle, .018, .018, .23, 8, x, H + .48, 0);
    sphere(g, M.flame, .022, x, H + .62, 0, { sy: 2.1, w: 7, h: 5 });
  }
  return g;
}

export function bed(M, opts = {}) {
  const {
    width = 1.95, length = 2.16, fabric = M.linenCream, headFabric = M.velvetSage,
    throwMat = M.linenRose, wood = M.walnut, canopy = false,
  } = opts;
  const g = group('Upholstered_Bed');
  const headZ = -length / 2 + .08;
  // legs & frame
  legs(g, M, width + .08, length, .25, .12, 'turn', wood);
  box(g, wood, width + .08, .15, length, 0, .30, 0);
  box(g, wood, width + .13, .10, length + .08, 0, .40, 0);
  // headboard
  roundedBox(g, headFabric, width + .12, 1.22, .13, .06, 0, 1.02, headZ);
  box(g, wood, width + .22, .055, .16, 0, 1.65, headZ - .015);
  box(g, wood, .06, 1.28, .16, -width / 2 - .06, 1.02, headZ);
  box(g, wood, .06, 1.28, .16, width / 2 + .06, 1.02, headZ);
  for (let x = -width / 2 + .32; x < width / 2 - .15; x += .23) {
    for (let j = 0; j < 3; j++) {
      sphere(g, headFabric, .02, x, .74 + j * .19, headZ + .073, { w: 6, h: 5, cast: false });
      sphere(g, M.brass, .011, x, .74 + j * .19, headZ + .087, { w: 5, h: 4, cast: false });
    }
  }
  // mattress and duvet
  roundedBox(g, M.linenCream, width, .30, length - .12, .065, 0, .60, -.01);
  roundedBox(g, fabric, width + .04, .20, length - .38, .075, 0, .77, .07);
  roundedBox(g, fabric, width + .06, .06, length * .55, .03, 0, .84, .22);
  // folded throw at foot
  roundedBox(g, throwMat, width + .05, .055, .50, .025, 0, .895, length / 2 - .32);
  box(g, throwMat, width + .07, .42, .045, 0, .67, length / 2 - .10, { cast: true });
  // pillows
  // pillows sit against the headboard, never at the foot of the bed
  const pillows = [
    [-.48, -.72, M.linenCream, .65, .24, .40, -.22],
    [.48, -.72, M.linenCream, .65, .24, .40, -.22],
    [-.38, -.58, M.linen, .55, .20, .34, -.32],
    [.38, -.58, M.linen, .55, .20, .34, -.32],
    [0, -.72, M.velvetBlue, .68, .18, .32, -.2],
  ];
  for (const [x, z, mat, pw, ph, pd, tilt] of pillows) {
    const p = roundedBox(g, mat, pw, ph, pd, .075, x, .92, z, { rx: tilt, rz: x * .06 });
    p.rotation.y = x * .2;
  }
  // tiny lumbar cushion
  roundedBox(g, M.velvetRust, .36, .18, .16, .06, 0, .94, -.38, { rx: -.22 });
  if (canopy) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      cylinder(g, M.walnut, .035, .045, 2.2, 12, sx * (width / 2 + .1), 1.35, headZ + (sz > 0 ? 1.9 : 0));
      sphere(g, M.brass, .05, sx * (width / 2 + .1), 2.48, headZ + (sz > 0 ? 1.9 : 0));
    }
    box(g, M.linen, width + .3, .05, length + .3, 0, 2.45, -.2);
  }
  g.userData = { kind: 'bed', width, length };
  return g;
}

export function nightstand(M, opts = {}) {
  const { width = .56, depth = .48, height = .67, lamp = true } = opts;
  const g = group('Nightstand');
  box(g, M.walnut, width, .05, depth, 0, height, 0);
  box(g, M.marble, width + .03, .035, depth + .02, 0, height + .03, 0);
  box(g, M.walnut, width - .03, .44, depth - .05, 0, height - .27, 0);
  for (const y of [height - .38, height - .20]) {
    box(g, M.walnut, width - .1, .018, .02, 0, y, depth / 2 - .012, { cast: false });
    sphere(g, M.brass, .018, 0, y - .015, depth / 2 + .005, { w: 7, h: 5 });
  }
  for (const x of [-width / 2 + .07, width / 2 - .07]) for (const z of [-depth / 2 + .07, depth / 2 - .07]) {
    cylinder(g, M.walnut, .02, .03, .38, 8, x, .19, z);
    box(g, M.brass, .04, .015, .04, x, .008, z);
  }
  if (lamp) addTableLamp(M, g, .04, height + .05, -.02, .68);
  return g;
}

export function wardrobe(M, opts = {}) {
  const { width = 2.2, depth = .64, height = 2.28 } = opts;
  const g = group('Armoire');
  box(g, M.walnut, width, height, depth, 0, height / 2 + .05, 0);
  box(g, M.walnut, width + .12, .10, depth + .12, 0, height + .12, 0);
  box(g, M.walnut, width + .06, .07, depth + .08, 0, .08, 0);
  // two doors with raised moulding, one mirror
  for (const sx of [-1, 1]) {
    const x = sx * width / 4;
    box(g, M.woodPale, width / 2 - .04, height - .16, .025, x, height / 2 + .04, depth / 2 + .013);
    for (const yy of [height * .28, height * .68]) {
      box(g, M.walnut, width / 2 - .22, height * .29, .025, x, yy, depth / 2 + .03);
      box(g, M.walnut, width / 2 - .28, height * .23, .018, x, yy, depth / 2 + .047);
    }
    sphere(g, M.brass, .036, sx * .07, height / 2, depth / 2 + .06);
    box(g, M.brass, .018, .13, .025, sx * .13, height / 2, depth / 2 + .055);
  }
  box(g, M.walnut, .025, height - .16, .04, 0, height / 2 + .04, depth / 2 + .02);
  for (const x of [-width / 2 + .09, width / 2 - .09]) for (const z of [-depth / 2 + .09, depth / 2 - .09]) {
    box(g, M.walnut, .085, .13, .085, x, .065, z);
    box(g, M.brass, .06, .015, .06, x, .008, z);
  }
  return g;
}

export function dresser(M, opts = {}) {
  const { width = 1.7, depth = .5, height = .88 } = opts;
  const g = group('Commode');
  box(g, M.walnut, width, height - .12, depth, 0, height / 2 + .02, 0);
  box(g, M.marble, width + .06, .04, depth + .05, 0, height + .02, 0);
  for (let i = 0; i < 3; i++) {
    box(g, M.woodPale, width - .14, .18, .02, 0, .25 + i * .21, depth / 2 + .01);
    for (const sx of [-1, 1]) {
      const h = cylinder(g, M.brass, .01, .012, .13, 8, sx * .24, .25 + i * .21, depth / 2 + .035, { rz: PI / 2 });
    }
  }
  for (const x of [-width / 2 + .1, width / 2 - .1]) {
    cylinder(g, M.walnut, .033, .055, .18, 8, x, .09, .12, { rx: .2 });
    cylinder(g, M.walnut, .033, .055, .18, 8, x, .09, -.12, { rx: -.2 });
  }
  addVase(M, g, -.5, height + .04, 0, .75);
  box(g, M.books[4], .3, .035, .22, .45, height + .06, 0, { ry: .12 });
  return g;
}

export function desk(M, opts = {}) {
  const { width = 1.9, depth = .92, height = .77 } = opts;
  const g = group('Bureau_Plat');
  box(g, M.walnut, width, .06, depth, 0, height, 0);
  box(g, M.leather, width - .16, .012, depth - .15, 0, height + .035, 0);
  box(g, M.brass, width - .06, .012, depth - .02, 0, height - .026, 0);
  box(g, M.walnut, width - .1, .14, depth - .12, 0, height - .10, 0);
  // three drawers on both shoulders
  for (const sx of [-1, 1]) {
    const bx = sx * width * .27;
    box(g, M.walnut, width * .30, .38, depth - .06, bx, height - .24, 0);
    for (let i = 0; i < 2; i++) {
      box(g, M.woodPale, width * .26, .13, .015, bx, height - .16 - i * .17, depth / 2 - .02);
      sphere(g, M.brass, .021, bx, height - .16 - i * .17, depth / 2 + .002, { w: 7, h: 5 });
    }
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    lathe(g, M.walnut, [[.033, 0], [.055, .02], [.035, .22], [.05, .54], [.032, .7]], 10, sx * (width / 2 - .09), 0, sz * (depth / 2 - .08));
    box(g, M.brass, .06, .022, .06, sx * (width / 2 - .09), .012, sz * (depth / 2 - .08));
  }
  // table accessories
  addTableLamp(M, g, .67, height + .04, -.16, .65);
  box(g, M.books[0], .32, .04, .24, -.55, height + .07, -.16, { ry: .08 });
  box(g, M.books[2], .29, .035, .22, -.52, height + .105, -.15, { ry: .16 });
  box(g, M.ivoryCeramic, .26, .025, .35, .05, height + .06, .15, { ry: .05 });
  cylinder(g, M.ivoryCeramic, .04, .045, .1, 10, -.15, height + .09, .28);
  for (let i = 0; i < 4; i++) cylinder(g, M.walnut, .006, .007, .22, 5, -.11 + i * .025, height + .16, .28, { rz: .12 - i * .06 });
  return g;
}

export function deskChair(M, opts = {}) {
  const g = diningChair(M, { fabric: M.leather, ...opts });
  g.name = 'Desk_Chair';
  return g;
}

export function bookshelf(M, opts = {}) {
  const { width = 2.0, height = 2.85, depth = .34, seed = 3, openCenter = false } = opts;
  const g = group('Bibliothèque');
  const rand = seeded(seed);
  box(g, M.walnut, width, height, .05, 0, height / 2, -depth / 2 + .025);
  for (const sx of [-1, 1]) box(g, M.walnut, .08, height, depth, sx * (width / 2 - .04), height / 2, 0);
  const shelves = 6;
  for (let i = 0; i < shelves; i++) {
    const y = .08 + (height - .16) * i / (shelves - 1);
    box(g, M.walnut, width, .055, depth, 0, y, 0);
    if (i === shelves - 1) continue;
    let cursor = -width / 2 + .12 + (openCenter ? width * .22 : 0);
    const end = width / 2 - .12 - (openCenter ? width * .22 : 0);
    while (cursor < end - .08) {
      const count = 1 + Math.floor(rand() * 4);
      if (rand() < .15) {
        // horizontal stack
        const bw = Math.min(end - cursor, .24 + rand() * .1);
        for (let j = 0; j < count; j++) {
          const bh = .225 + rand() * .08;
          box(g, M.books[Math.floor(rand() * M.books.length)], bw, .045, .19 + rand() * .03, cursor + bw / 2, y + .05 + j * .047, -.01, { ry: (rand() - .5) * .05 });
        }
        cursor += bw + .04;
      } else {
        const bw = .035 + rand() * .045;
        const bh = .22 + rand() * .14;
        box(g, M.books[Math.floor(rand() * M.books.length)], bw, bh, .18 + rand() * .05, cursor + bw / 2, y + bh / 2 + .03, -.015);
        if (rand() < .08) {
          const lean = new THREE.Group();
          box(lean, M.books[Math.floor(rand() * M.books.length)], bw, bh, .17, bw / 2, bh / 2, 0);
          lean.position.set(cursor + bw + .05, y + .03, 0); lean.rotation.z = .22;
          g.add(lean);
        }
        cursor += bw + .008;
      }
    }
    if (i === 2) {
      // bronze bust + books rest
      const bx = width * .29;
      cylinder(g, M.marbleDark, .12, .14, .055, 16, bx, y + .08, 0);
      const bust = sphere(g, M.whiteStone, .11, bx, y + .23, 0, { sx: .8, sy: 1.15, sz: .72 });
      sphere(g, M.whiteStone, .075, bx + .01, y + .36, 0, { sx: 1, sy: 1.1, sz: .9 });
    }
  }
  // crown & base mouldings
  box(g, M.walnut, width + .08, .10, depth + .06, 0, height - .02, .01);
  box(g, M.walnut, width + .06, .09, depth + .04, 0, .045, .01);
  // brass gallery rail
  for (let y of [.44, 1.56, 2.68]) {
    cylinder(g, M.brass, .008, .008, width - .12, 6, 0, y, depth / 2 - .03, { rz: PI / 2 });
  }
  return g;
}

export function fireplace(M, opts = {}) {
  const { width = 2.15, height = 1.28, overMantel = true, painting = M.art1 } = opts;
  const g = group('Fireplace');
  box(g, M.whiteStone, width + .18, .12, .84, 0, .06, .12);
  for (const sx of [-1, 1]) {
    box(g, M.whiteStone, .30, height, .42, sx * (width / 2 - .15), height / 2, .12);
    box(g, M.whiteStone, .38, .10, .50, sx * (width / 2 - .19), .10, .14);
    box(g, M.whiteStone, .38, .10, .50, sx * (width / 2 - .19), height * .55, .14);
    box(g, M.whiteStone, .42, .14, .55, sx * (width / 2 - .19), height - .02, .12);
  }
  box(g, M.whiteStone, width, .14, .52, 0, height, .13);
  box(g, M.whiteStone, width + .2, .08, .61, 0, height + .10, .14);
  box(g, M.whiteStone, width + .1, .07, .54, 0, height - .15, .12);
  // inner firebox
  box(g, M.blackLacquer, width - .52, height - .23, .24, 0, (height - .1) / 2 + .08, .11);
  box(g, M.blackLacquer, width - .58, .04, .4, 0, .11, .05);
  // logs
  for (let i = 0; i < 3; i++) {
    cylinder(g, M.walnut, .055, .06, width - .8, 7, 0, .19 + i * .06, .12 + (i % 2) * .03, { rz: PI / 2, ry: i * .16 });
  }
  // warm ember bed
  const ember = new THREE.Mesh(new THREE.CircleGeometry(.4, 20), M.flame);
  ember.rotation.x = -PI / 2; ember.position.set(0, .15, .17); g.add(ember);
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * PI * 2;
    const f = sphere(g, M.flame, .03 + (i % 3) * .01, Math.cos(a) * .25, .26 + (i % 3) * .02, .12 + Math.sin(a) * .05, { sy: 2.4, w: 6, h: 5 });
  }
  // fender and logs basket
  cylinder(g, M.brass, .008, .008, width - .2, 6, 0, .22, .58, { rz: PI / 2 });
  for (const sx of [-1, 1]) cylinder(g, M.brass, .012, .015, .22, 6, sx * (width / 2 - .12), .11, .58);
  // mantel clock and candlesticks
  cylinder(g, M.brass, .12, .15, .05, 20, 0, height + .16, .12);
  const clock = lathe(g, M.giltwood, [[.0, 0], [.13, .01], [.16, .06], [.15, .2], [.10, .23], [.0, .23]], 20, 0, height + .18, .12);
  const face = cylinder(g, M.ivoryCeramic, .095, .095, .018, 24, 0, height + .28, .19, { rx: PI / 2 });
  box(g, M.iron, .006, .07, .006, 0, height + .30, .20);
  for (const sx of [-1, 1]) {
    cylinder(g, M.brass, .018, .025, .24, 8, sx * .65, height + .23, .12);
    cylinder(g, M.candle, .016, .016, .2, 8, sx * .65, height + .44, .12);
    sphere(g, M.flame, .017, sx * .65, height + .56, .12, { sy: 2, w: 6, h: 5 });
  }
  if (overMantel) {
    // mirror above the mantle, kept clear of the ceiling
    const my = height + 1.08;
    box(g, M.giltwood, width * .82, 1.22, .075, 0, my, .02);
    box(g, M.mirror, width * .82 - .18, 1.06, .02, 0, my, .062);
    // crest
    const crest = new THREE.Mesh(new THREE.TorusGeometry(.20, .026, 8, 24, PI), M.giltwood);
    crest.position.set(0, my + .62, .04); crest.castShadow = true; g.add(crest);
    sphere(g, M.gold, .052, 0, my + .69, .04);
  }
  return g;
}

export function grandPiano(M, opts = {}) {
  const g = group('Grand_Piano');
  // body top silhouette
  const s = new THREE.Shape();
  s.moveTo(-.78, 1.0);
  s.lineTo(.78, 1.0);
  s.bezierCurveTo(.88, .55, .86, -.25, .55, -.72);
  s.bezierCurveTo(.25, -1.15, -.25, -1.15, -.48, -.8);
  s.bezierCurveTo(-.72, -.45, -.80, .2, -.78, 1.0);
  const bodyGeo = new THREE.ExtrudeGeometry(s, { depth: .30, bevelEnabled: true, bevelSize: .035, bevelThickness: .035, bevelSegments: 2, curveSegments: 20 });
  bodyGeo.rotateX(PI / 2);
  const body = new THREE.Mesh(bodyGeo, M.blackLacquer);
  body.position.y = .92; body.castShadow = true; body.receiveShadow = true;
  g.add(body);
  // gold band around rim
  const rimGeo = new THREE.ExtrudeGeometry(s, { depth: .02, bevelEnabled: false, curveSegments: 20 });
  rimGeo.rotateX(PI / 2);
  const rim = new THREE.Mesh(rimGeo, M.gold);
  rim.position.y = .925; rim.scale.set(1.005, 1, 1.008); g.add(rim);
  // lid / music desk
  const lid = new THREE.Mesh(bodyGeo.clone(), M.blackLacquer);
  lid.scale.set(.94, 1, .94); lid.position.set(-.02, 1.22, .01);
  lid.rotation.z = .30; g.add(lid);
  // prop stick
  cylinder(g, M.brass, .012, .012, .58, 8, .55, 1.25, -.10, { rz: .25 });
  // keyboard shelf
  box(g, M.blackLacquer, 1.58, .13, .34, 0, .78, 1.0);
  box(g, M.ivoryCeramic, 1.42, .045, .26, 0, .85, 1.03);
  for (let i = 0; i < 28; i++) {
    const x = -.68 + i * (.05);
    box(g, M.ivoryCeramic, .045, .022, .24, x, .86, 1.04, { cast: false });
    if (i % 7 !== 2 && i % 7 !== 6) box(g, M.blackLacquer, .022, .028, .14, x + .026, .878, 1.01, { cast: false });
  }
  box(g, M.blackLacquer, 1.46, .16, .08, 0, .95, .89);
  for (let i = 0; i < 4; i++) box(g, M.ivoryCeramic, .34, .006, .006, 0, .93, .94 + i * .05, { cast: false });
  // legs
  for (const [x, z] of [[-.62, .86], [.62, .86], [0, -.86]]) {
    lathe(g, M.blackLacquer, [[.05, 0], [.09, .08], [.07, .5], [.10, .68], [.13, .76]], 12, x, .02, z);
    box(g, M.brass, .11, .035, .11, x, .017, z);
  }
  // pedals
  box(g, M.brass, .28, .02, .13, 0, .18, .93);
  for (const x of [-.08, 0, .08]) cylinder(g, M.brass, .012, .014, .05, 6, x, .21, .88);
  // piano stool, pulled slightly out from the keyboard
  const benchGroup = group('Piano_Stool');
  benchGroup.position.z = 1.52;
  for (const [x, z] of [[-.34, -.15], [.34, -.15], [-.34, .15], [.34, .15]]) {
    cylinder(benchGroup, M.blackLacquer, .027, .044, .42, 9, x, .21, z);
    box(benchGroup, M.brass, .06, .018, .06, x, .009, z);
  }
  box(benchGroup, M.blackLacquer, .96, .10, .42, 0, .44, 0);
  roundedBox(benchGroup, M.velvetBlue, .9, .13, .37, .045, 0, .55, 0);
  g.add(benchGroup);
  return g;
}

export function chandelier(M, opts = {}) {
  const { tiers = 2, arms = 8, drop = .95, scale = 1 } = opts;
  const g = group('Chandelier');
  g.scale.setScalar(scale);
  // canopy at y=0, chain hangs down
  cylinder(g, M.brass, .09, .12, .08, 16, 0, -.04, 0);
  cylinder(g, M.brass, .018, .018, drop * .55, 8, 0, -.30, 0);
  for (let i = 0; i < 7; i++) torus(g, M.brass, .025, .005, 0, -.12 - i * .055, 0, { rx: PI / 2, radial: 10 });
  const coreY = -drop * .55;
  lathe(g, M.brass, [[0, 0], [.05, .02], [.10, .08], [.08, .20], [.13, .28], [.04, .34], [.03, .42]], 16, 0, coreY - .32, 0);
  // arms
  for (let tier = 0; tier < tiers; tier++) {
    const n = tier === 0 ? arms : Math.max(6, arms - 2);
    const ry = tier === 0 ? 0 : PI / n;
    const rad = tier === 0 ? .64 : .42;
    const yy = coreY - tier * .27;
    for (let i = 0; i < n; i++) {
      const a = i / n * PI * 2 + ry;
      const x = Math.cos(a) * rad, z = Math.sin(a) * rad;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, yy + .08, 0),
        new THREE.Vector3(Math.cos(a) * rad * .32, yy + .14, Math.sin(a) * rad * .32),
        new THREE.Vector3(Math.cos(a) * rad * .78, yy - .05, Math.sin(a) * rad * .78),
        new THREE.Vector3(x, yy + .02, z),
      ]);
      const tubeMesh = tube(g, M.brass, curve.points, .014, 0, 0, 0, { radial: 5, segments: 16 });
      cylinder(g, M.brass, .06, .04, .035, 10, x, yy + .055, z);
      cylinder(g, M.candle, .017, .017, .18, 8, x, yy + .16, z);
      sphere(g, M.bulb, .028, x, yy + .28, z, { sy: 1.7, w: 7, h: 5 });
      for (let j = 0; j < 3; j++) {
        const aa = j / 3 * PI * 2;
        const drop2 = new THREE.Mesh(new THREE.OctahedronGeometry(.028, 0), M.mirror);
        drop2.position.set(x + Math.cos(aa) * .055, yy + .02 - j * .05, z + Math.sin(aa) * .055);
        drop2.scale.y = 1.7; g.add(drop2);
      }
    }
  }
  // crystal bag
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * PI * 2, r = .17 + (i % 3) * .04;
    const cr = new THREE.Mesh(new THREE.OctahedronGeometry(.032, 0), M.mirror);
    cr.position.set(Math.cos(a) * r, coreY - .52 - (i % 4) * .06, Math.sin(a) * r); cr.scale.y = 1.9; g.add(cr);
  }
  sphere(g, M.brass, .07, 0, coreY - .78, 0);
  g.userData = { hideInCutaway: true };
  return g;
}

export function floorLamp(M, opts = {}) {
  const g = group('Floor_Lamp');
  cylinder(g, M.brass, .16, .22, .035, 20, 0, .018, 0);
  cylinder(g, M.marbleDark, .20, .23, .04, 20, 0, .055, 0);
  cylinder(g, M.brass, .022, .022, 1.46, 10, 0, .78, 0);
  torus(g, M.brass, .09, .012, 0, 1.22, 0, { rx: PI / 2, radial: 16 });
  cylinder(g, M.lampShade, .22, .32, .34, 28, 0, 1.57, 0, { open: true });
  cylinder(g, M.brass, .018, .018, .1, 8, 0, 1.78, 0);
  sphere(g, M.bulb, .026, 0, 1.47, 0);
  return g;
}

export function addTableLamp(M, parent, x, y, z, scale = 1) {
  const g = group('Table_Lamp');
  g.position.set(x, y, z); g.scale.setScalar(scale);
  lathe(g, M.brass, [[.0, 0], [.13, .01], [.15, .05], [.07, .12], [.045, .20], [.09, .28], [.06, .34]], 18, 0, 0, 0);
  cylinder(g, M.lampShade, .13, .20, .23, 22, 0, .45, 0, { open: true });
  cylinder(g, M.brass, .012, .012, .08, 8, 0, .56, 0);
  sphere(g, M.bulb, .025, 0, .42, 0);
  parent.add(g);
  return g;
}

export function framedArt(M, opts = {}) {
  const { width = 1.4, height = 1.05, art = M.art1, gold = true, frame = .07 } = opts;
  const g = group('Framed_Art');
  const fm = gold ? M.giltwood : M.walnut;
  box(g, fm, width + frame * 2, height + frame * 2, .07, 0, 0, 0);
  box(g, fm, width + frame * 2.8, .055, .1, 0, height / 2 + frame, .01);
  box(g, fm, width + frame * 2.3, .035, .08, 0, -height / 2 - frame, .01);
  const canvas = new THREE.Mesh(new THREE.PlaneGeometry(width, height), art);
  canvas.position.z = .045; g.add(canvas);
  // inner linen mat/liner
  box(g, M.linenCream, width + .02, .025, .015, 0, height / 2 + .01, .04, { cast: false });
  return g;
}

export function mirror(M, opts = {}) {
  const { width = 1.2, height = 1.65, frame = .075, shape = 'rect' } = opts;
  const g = group('Mirror');
  if (shape === 'oval') {
    const torusMesh = new THREE.Mesh(new THREE.TorusGeometry(1, .055, 8, 48), M.giltwood);
    torusMesh.scale.set(width / 2, height / 2, 1); g.add(torusMesh);
    const mir = new THREE.Mesh(new THREE.CircleGeometry(1, 48), M.mirror);
    mir.scale.set(width / 2 - .04, height / 2 - .04, 1); mir.position.z = -.006; g.add(mir);
    sphere(g, M.gold, .07, 0, height / 2 + .02, 0);
  } else {
    box(g, M.giltwood, width + frame * 2, height + frame * 2, .07, 0, 0, 0);
    box(g, M.mirror, width, height, .02, 0, 0, .045);
    box(g, M.giltwood, width + frame * 3, .08, .10, 0, height / 2 + frame, 0);
  }
  return g;
}

export function pottedPlant(M, opts = {}) {
  const { size = 1, kind = 'palm', pot = M.terracotta, seed = 4 } = opts;
  const g = group('Potted_Plant');
  const rand = seeded(seed);
  const potR = .24 * size, potH = .3 * size;
  lathe(g, pot, [[0, 0], [potR * .72, 0], [potR, .03], [potR * .9, potH * .25], [potR * 1.06, potH * .9], [potR * .94, potH], [0, potH]], 20, 0, 0, 0);
  cylinder(g, M.soil, potR * .9, potR * .95, .025, 16, 0, potH - .01, 0);
  if (kind === 'olive') {
    cylinder(g, M.walnut, .035 * size, .055 * size, .8 * size, 7, 0, potH + .35 * size, 0, { rz: .04 });
    for (let b = 0; b < 4; b++) {
      const a = b / 4 * PI * 2 + .3;
      tube(g, M.walnut, [new THREE.Vector3(0, potH + .5 * size, 0), new THREE.Vector3(Math.cos(a) * .2 * size, potH + .8 * size, Math.sin(a) * .2 * size), new THREE.Vector3(Math.cos(a) * .33 * size, potH + 1.05 * size, Math.sin(a) * .33 * size)], .018 * size, 0, 0, 0, { radial: 4, segments: 8 });
      for (let l = 0; l < 16; l++) {
        const aa = rand() * PI * 2, rr = (.1 + rand() * .32) * size;
        const x = Math.cos(a) * .33 * size + Math.cos(aa) * rr;
        const z = Math.sin(a) * .33 * size + Math.sin(aa) * rr;
        const y = potH + (.9 + rand() * .35) * size;
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(.05 * size, 5, 3), M.foliageLight);
        leaf.scale.set(2.2, .35, .6); leaf.position.set(x, y, z); leaf.rotation.y = aa; leaf.castShadow = true; g.add(leaf);
      }
    }
  } else if (kind === 'hydrangea') {
    for (let s = 0; s < 7; s++) {
      const a = s / 7 * PI * 2;
      tube(g, M.leavesFresh, [new THREE.Vector3(0, potH, 0), new THREE.Vector3(Math.cos(a) * .12, potH + .28, Math.sin(a) * .12), new THREE.Vector3(Math.cos(a) * .2, potH + .42, Math.sin(a) * .2)], .008 * size, 0, 0, 0, { radial: 3, segments: 5 });
      for (let f = 0; f < 4; f++) {
        sphere(g, M.flowers[(s + f) % 2 === 0 ? 0 : 2], .05 * size, Math.cos(a) * .21 + (rand() - .5) * .1, potH + .42 + (rand() - .5) * .1, Math.sin(a) * .21 + (rand() - .5) * .1, { w: 7, h: 5 });
      }
      const leaf = sphere(g, M.leavesFresh, .10 * size, Math.cos(a) * .18, potH + .18, Math.sin(a) * .18, { sx: 1.5, sy: .22, sz: .65 });
      leaf.rotation.y = -a;
    }
  } else {
    // parlour palm
    for (let s = 0; s < 11; s++) {
      const a = s / 11 * PI * 2;
      const len = (.55 + (s % 4) * .12) * size;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, potH, 0),
        new THREE.Vector3(Math.cos(a) * .12 * size, potH + len * .55, Math.sin(a) * .12 * size),
        new THREE.Vector3(Math.cos(a) * .35 * size, potH + len, Math.sin(a) * .35 * size),
      ]);
      tube(g, M.leavesFresh, curve.points, .012 * size, 0, 0, 0, { radial: 4, segments: 8 });
      for (let l = 0; l < 5; l++) {
        const t = .3 + l * .16;
        const p = curve.getPoint(Math.min(t, 1));
        const leaf = sphere(g, M.foliage, .065 * size, p.x + Math.cos(a + 1.3) * .07, p.y + .02, p.z + Math.sin(a + 1.3) * .07, { sx: 2.6, sy: .18, sz: .5 });
        leaf.rotation.y = a + 1.2; leaf.rotation.z = .2;
      }
    }
  }
  g.userData = { kind: 'plant' };
  return g;
}

export function vase(M, opts = {}) {
  const g = group('Porcelain_Vase');
  const mat = opts.mat || M.blueCeramic;
  lathe(g, mat, [[0, 0], [.12, 0], [.17, .04], [.20, .14], [.18, .25], [.11, .33], [.08, .39], [.10, .41], [.07, .42]], 26, 0, 0, 0);
  torus(g, M.gold, .11, .006, 0, .25, 0, { rx: PI / 2 });
  torus(g, M.gold, .085, .005, 0, .10, 0, { rx: PI / 2 });
  return g;
}

export function addVase(M, parent, x, y, z, scale = 1) {
  const v = vase(M);
  v.position.set(x, y, z); v.scale.setScalar(scale); parent.add(v);
  // arrangement
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * PI * 2;
    tube(v, M.leavesFresh, [new THREE.Vector3(0, .4, 0), new THREE.Vector3(Math.cos(a) * .09, .65, Math.sin(a) * .09), new THREE.Vector3(Math.cos(a) * .16, .82, Math.sin(a) * .16)], .005, 0, 0, 0, { radial: 3, segments: 5 });
    sphere(v, M.flowers[i % M.flowers.length], .03 + (i % 3) * .008, Math.cos(a) * .16, .83, Math.sin(a) * .16, { w: 7, h: 5 });
  }
  return v;
}

export function sculpture(M, opts = {}) {
  const g = group('Bronze_Sculpture');
  cylinder(g, M.marbleDark, .18, .22, .6, 22, 0, .3, 0);
  box(g, M.marbleDark, .42, .06, .42, 0, .61, 0);
  // abstract dancing figure
  const body = tube(g, M.bronze, [new THREE.Vector3(0, .64, 0), new THREE.Vector3(.08, 1.05, .03), new THREE.Vector3(-.05, 1.4, 0), new THREE.Vector3(.08, 1.66, -.02)], .06, 0, 0, 0, { radial: 8, segments: 14 });
  sphere(g, M.bronze, .10, .08, 1.76, 0, { w: 12, h: 8 });
  for (const sx of [-1, 1]) {
    tube(g, M.bronze, [new THREE.Vector3(.02, 1.45, 0), new THREE.Vector3(sx * .28, 1.58, sx * .12), new THREE.Vector3(sx * .43, 1.48, sx * .05)], .031, 0, 0, 0, { radial: 6, segments: 8 });
    tube(g, M.bronze, [new THREE.Vector3(0, 1.1, 0), new THREE.Vector3(sx * .15, .88, sx * .08), new THREE.Vector3(sx * .22, .64, 0)], .045, 0, 0, 0, { radial: 6, segments: 8 });
  }
  return g;
}

export function telescope(M, opts = {}) {
  const g = group('Telescope');
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * PI * 2;
    tube(g, M.brass, [new THREE.Vector3(0, .92, 0), new THREE.Vector3(Math.cos(a) * .44, .01, Math.sin(a) * .44)], .016, 0, 0, 0, { radial: 5, segments: 4 });
  }
  cylinder(g, M.brass, .035, .045, .58, 10, 0, 1.1, 0, { rz: -.55 });
  const tubeMain = cylinder(g, M.bronze, .10, .13, .92, 18, .18, 1.4, 0, { rz: -1.0 });
  cylinder(g, M.brass, .145, .145, .12, 18, .50, 1.63, 0, { rz: -1.0 });
  torus(g, M.brass, .1, .015, .35, 1.51, 0, { rz: -1.0 });
  return g;
}

export function kitchenIsland(M, opts = {}) {
  const { width = 3.3, depth = 1.35, height = .92, stone = M.marbleCool } = opts;
  const g = group('Kitchen_Island');
  box(g, M.oak, width - .08, height - .12, depth - .1, 0, (height - .12) / 2 + .05, 0);
  for (const sx of [-1, 1]) for (const z of [-depth / 2 + .08, depth / 2 - .08]) {
    box(g, M.whiteTrim, .07, height - .16, .07, sx * (width / 2 - .06), (height - .16) / 2 + .04, z);
  }
  for (let i = 0; i < 4; i++) {
    box(g, M.oak, width - .5, .025, depth - .02, 0, .16 + i * .17, 0, { cast: false });
  }
  box(g, stone, width + .18, .06, depth + .16, 0, height + .03, 0);
  // shallow sink and brass tap
  box(g, M.marbleDark, .58, .03, .4, -.65, height + .045, 0);
  box(g, M.marbleCool, .53, .05, .35, -.65, height + .032, 0);
  cylinder(g, M.brass, .02, .022, .34, 10, -.65, height + .18, -.23);
  tube(g, M.brass, [new THREE.Vector3(-.65, height + .34, -.23), new THREE.Vector3(-.65, height + .4, -.11), new THREE.Vector3(-.65, height + .35, .02)], .018, 0, 0, 0, { radial: 6, segments: 8 });
  // brass rail & seating
  cylinder(g, M.brass, .012, .012, width - .35, 6, 0, .20, depth / 2 + .02, { rz: PI / 2 });
  // chopping board, bowl, vase
  box(g, M.oak, .45, .035, .3, .6, height + .065, 0);
  for (let i = 0; i < 3; i++) {
    const x = .35 + i * .15;
    const fruit = sphere(g, i % 2 ? M.flowers[3] : M.flowers[0], .055, x, height + .09 + i * .015, .18, { w: 10, h: 7 });
  }
  lathe(g, M.blueCeramic, [[0, 0], [.11, .01], [.16, .07], [.15, .14], [.09, .18]], 22, 1.28, height + .06, 0);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * PI * 2;
    tube(g, M.leavesFresh, [new THREE.Vector3(0, 0, 0), new THREE.Vector3(Math.cos(a) * .08, .25, Math.sin(a) * .08)], .004, 1.28, height + .22, 0, { radial: 3, segments: 3 });
    sphere(g, M.flowers[i % 2 ? 0 : 2], .03, 1.28 + Math.cos(a) * .08, height + .46, Math.sin(a) * .08, { w: 6, h: 4 });
  }
  // 3 stools (tucked under island)
  for (let i = 0; i < 3; i++) {
    const x = -.95 + i * .95;
    const st = group('Kitchen_Stool');
    st.position.set(x, 0, depth / 2 + .32);
    cylinder(st, M.brass, .19, .17, .035, 22, 0, .62, 0);
    roundedBox(st, M.linen, .36, .08, .36, .035, 0, .67, 0);
    for (let j = 0; j < 4; j++) {
      const a = j / 4 * PI * 2 + PI / 4;
      cylinder(st, M.iron, .012, .012, .6, 6, Math.cos(a) * .14, .3, Math.sin(a) * .14);
    }
    for (let j = 0; j < 3; j++) torus(st, M.brass, .16, .008, 0, .14 + j * .14, 0, { rx: PI / 2, radial: 20 });
    g.add(st);
  }
  return g;
}

export function kitchenRun(M, opts = {}) {
  const { width = 5.6, depth = .65, height = .9, side = 'rear' } = opts;
  const g = group('Kitchen_Cabinetry');
  box(g, M.whiteTrim, width, height - .1, depth, 0, (height - .1) / 2 + .07, 0);
  box(g, M.marbleCool, width + .04, .05, depth + .03, 0, height + .03, 0);
  const n = 6;
  for (let i = 0; i < n; i++) {
    const x = -width / 2 + width / n / 2 + i * width / n;
    box(g, M.whiteTrim, width / n - .035, height - .25, .02, x, height / 2, depth / 2 + .01);
    box(g, M.brass, .09, .016, .025, x, height - .12, depth / 2 + .03);
    box(g, M.brass, .014, .12, .02, x, height - .02, depth / 2 + .028);
  }
  // range & hood in centre
  box(g, M.iron, 1.1, .06, depth - .08, 0, height + .055, 0);
  for (let i = 0; i < 4; i++) torus(g, M.iron, .12, .01, -.34 + (i % 2) * .68, height + .09, (i < 2 ? -.1 : .14), { rx: PI / 2, radial: 18 });
  // tall upper cabinetry and hood
  for (const sx of [-1, 1]) {
    box(g, M.ivoryCeramic, width * .27, .7, .36, sx * width * .3, height + .8, -.1);
    for (const y of [height + .6, height + 1.0]) box(g, M.whiteTrim, width * .26, .3, .025, sx * width * .3, y, .085);
  }
  box(g, M.whiteTrim, 1.5, .55, .6, 0, height + 1.3, -.15);
  box(g, M.whiteTrim, 1.3, .35, .45, 0, height + 1.7, -.2);
  for (let i = 0; i < 3; i++) cylinder(g, M.brass, .018, .015, 1.1, 8, -.42 + i * .42, height + .65, 0);
  // integrated refrigerator
  box(g, M.ivoryCeramic, 1.0, 2.2, .65, width / 2 - .7, 1.1, -.2);
  for (const y of [.65, 1.15]) box(g, M.brass, .02, .35, .025, width / 2 - .7, y, .13);
  // open shelves
  for (const y of [height + .58, height + .95]) {
    box(g, M.oak, 1.35, .045, .28, 1.45, y, -.22);
    for (let i = 0; i < 4; i++) {
      const jar = lathe(g, i % 2 ? M.ivoryCeramic : M.blueCeramic, [[0, 0], [.055, 0], [.06, .08], [.04, .12], [.045, .15]], 12, 1.0 + i * .28, y + .025, -.22);
    }
  }
  return g;
}

export function vanity(M, opts = {}) {
  const { width = 2.2, depth = .55, height = .86 } = opts;
  const g = group('Double_Vanity');
  // toe-kick plinth so the cabinetry is visibly grounded
  box(g, M.walnut, width - .34, .11, depth - .14, 0, .055, 0);
  box(g, M.brass, width - .5, .012, .02, 0, .11, depth / 2 - .11, { cast: false });
  box(g, M.marbleCool, width + .08, .06, depth + .04, 0, height + .03, 0);
  box(g, M.ivoryCeramic, width - .18, height - .2, depth - .1, 0, height / 2, 0);
  for (const sx of [-1, 1]) {
    box(g, M.ivoryCeramic, .02, .12, depth - .2, sx * width * .12, height - .1, .01);
    box(g, M.brass, .16, .015, .03, sx * width * .3, height - .15, depth / 2 + .01);
    // basin
    cylinder(g, M.ivoryCeramic, .24, .20, .10, 28, sx * width * .26, height + .08, 0);
    cylinder(g, M.marbleCool, .20, .18, .06, 28, sx * width * .26, height + .10, 0);
    cylinder(g, M.brass, .018, .018, .26, 8, sx * width * .26, height + .18, -.22);
    tube(g, M.brass, [new THREE.Vector3(sx * width * .26, height + .30, -.22), new THREE.Vector3(sx * width * .26, height + .34, -.1), new THREE.Vector3(sx * width * .26, height + .26, .0)], .013, 0, 0, 0, { radial: 5, segments: 6 });
    sphere(g, M.brass, .02, sx * width * .26, height + .15, -.22);
  }
  // mirrors + sconces
  for (const sx of [-1, 1]) {
    const m = mirror(M, { width: .78, height: .95, shape: 'rect', frame: .045 });
    m.position.set(sx * width * .26, height + .75, depth / 2 - .12);
    g.add(m);
    for (const ys of [height + .45, height + 1.0]) {
      const s = group('Sconce');
      s.position.set(sx * width * .26 + sx * .55, ys, depth / 2 - .1);
      cylinder(s, M.brass, .04, .06, .08, 12, 0, 0, 0, { rx: PI / 2 });
      cylinder(s, M.candle, .018, .018, .16, 8, 0, .13, .04);
      sphere(s, M.bulb, .026, 0, .24, .04, { sy: 1.6 });
      g.add(s);
    }
  }
  // towels, perfume
  for (let i = 0; i < 3; i++) {
    const t = lathe(g, M.ivoryCeramic, [[0, 0], [.04, 0], [.045, .10], [.02, .12], [.025, .16]], 12, width / 2 - .18 + i * .01, height + .09, -.14);
  }
  return g;
}

export function bathtub(M, opts = {}) {
  const g = group('Freestanding_Bathtub');
  const tub = lathe(g, M.ivoryCeramic, [
    [0.0, 0], [.38, 0], [.46, .04], [.53, .18], [.56, .38], [.58, .55], [.55, .62], [.48, .60], [.46, .5], [.42, .2], [.24, .10], [0, .08],
  ], 32, 0, 0, 0);
  tub.scale.z = .62;
  cylinder(g, M.marbleCool, .68, .62, .045, 36, 0, .02, 0).scale.z = .62;
  // brass floor faucet
  cylinder(g, M.brass, .024, .028, .88, 10, .62, .44, .05);
  tube(g, M.brass, [new THREE.Vector3(.62, .88, .05), new THREE.Vector3(.62, .95, -.06), new THREE.Vector3(.62, .88, -.2)], .016, 0, 0, 0, { radial: 6, segments: 8 });
  // water surface
  const water = new THREE.Mesh(new THREE.CircleGeometry(.52, 32), M.water);
  water.rotation.x = -PI / 2; water.scale.y = .62; water.position.y = .46; g.add(water);
  // rolled towels
  for (let i = 0; i < 2; i++) {
    const t = cylinder(g, M.linenCream, .07, .07, .25, 14, -.42 + i * .16, .55, -.26, { rz: PI / 2 });
    t.rotation.y = .2;
  }
  return g;
}

export function shower(M, opts = {}) {
  const { width = 1.55, depth = 1.4 } = opts;
  const g = group('Walk_In_Shower');
  box(g, M.marbleCool, width, .06, depth, 0, .03, 0);
  for (const [x, z] of [[-width / 2, -depth / 2], [width / 2, -depth / 2], [width / 2, depth / 2]]) {
    box(g, M.brass, .035, 2.1, .035, x, 1.06, z);
  }
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(width, 1.95), M.glassShower);
  glass.position.set(0, 1.08, depth / 2); glass.castShadow = false; g.add(glass);
  const glass2 = new THREE.Mesh(new THREE.PlaneGeometry(depth, 1.95), M.glassShower);
  glass2.position.set(-width / 2, 1.08, 0); glass2.rotation.y = PI / 2; g.add(glass2);
  cylinder(g, M.brass, .11, .11, .03, 20, width / 2 - .15, 2.16, -depth / 2 + .15);
  cylinder(g, M.brass, .022, .022, .14, 8, width / 2 - .15, 2.12, -depth / 2 + .15);
  const head = cylinder(g, M.brass, .12, .13, .035, 22, width / 2 - .15, 2.03, -depth / 2 + .15);
  for (let i = 0; i < 20; i++) {
    const a = i / 20 * PI * 2, r = .03 + (i % 4) * .02;
    cylinder(g, M.brass, .004, .004, .02, 4, width / 2 - .15 + Math.cos(a) * r, 2.01, -depth / 2 + .15 + Math.sin(a) * r);
  }
  // niche shelf
  box(g, M.walnut, .42, .045, .2, 0, 1.25, -depth / 2 + .12);
  for (let i = 0; i < 3; i++) lathe(g, M.ivoryCeramic, [[0, 0], [.04, 0], [.04, .12], [.025, .16]], 10, -.1 + i * .1, 1.28, -depth / 2 + .12);
  return g;
}

export function toilet(M) {
  const g = group('Toilet');
  box(g, M.ivoryCeramic, .4, .35, .45, 0, .2, 0);
  const seat = cylinder(g, M.ivoryCeramic, .22, .22, .05, 24, 0, .4, .03); seat.scale.z = 1.25;
  box(g, M.ivoryCeramic, .44, .5, .18, 0, .52, -.24);
  box(g, M.brass, .18, .015, .03, 0, .58, -.14);
  return g;
}

export function cinemaScreen(M, opts = {}) {
  const { width = 3.8, height = 2.0 } = opts;
  const g = group('Cinema_Screen');
  box(g, M.blackLacquer, width + .25, height + .25, .12, 0, height / 2 + .4, 0);
  box(g, M.screen, width, height, .015, 0, height / 2 + .4, .07);
  for (const sx of [-1, 1]) box(g, M.iron, .05, .5, .28, sx * (width / 2 + .1), .25, -.18);
  return g;
}

export function sectional(M, opts = {}) {
  const g = group('Cinema_Sectional');
  const fabric = opts.fabric || M.velvetSage;
  roundedBox(g, fabric, 3.0, .38, 1.0, .08, 0, .3, 0);
  for (let i = 0; i < 3; i++) roundedBox(g, fabric, .92, .15, .84, .06, -.98 + i * .98, .55, .07);
  roundedBox(g, fabric, .32, .52, 1.0, .09, -1.26, .54, 0);
  roundedBox(g, fabric, .32, .52, 1.0, .09, 1.26, .54, 0);
  roundedBox(g, fabric, 3.0, .62, .2, .07, 0, .72, -.43);
  for (let i = 0; i < 3; i++) roundedBox(g, fabric, .86, .42, .12, .05, -.98 + i * .98, .75, -.31, { rx: -.12 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cylinder(g, M.walnut, .025, .035, .16, 8, sx * 1.4, .08, sz * .36);
  return g;
}

export function easel(M, opts = {}) {
  const g = group('Artist_Easel');
  const wood = M.oak;
  for (const sx of [-1, 1]) {
    tube(g, wood, [new THREE.Vector3(sx * .28, 0, .16), new THREE.Vector3(sx * .12, 1.15, 0), new THREE.Vector3(sx * .02, 1.9, -.08)], .022, 0, 0, 0, { radial: 5, segments: 4 });
  }
  tube(g, wood, [new THREE.Vector3(0, 1.95, -.08), new THREE.Vector3(0, 1.2, .28), new THREE.Vector3(0, 0, .55)], .022, 0, 0, 0, { radial: 5, segments: 4 });
  box(g, wood, .85, .05, .24, 0, .82, .02);
  box(g, wood, .66, .045, .16, 0, 1.6, -.02);
  // canvas with painting
  box(g, M.linenCream, .78, .95, .035, 0, 1.26, .04);
  const art = new THREE.Mesh(new THREE.PlaneGeometry(.70, .85), M.art2);
  art.position.set(0, 1.26, .065); g.add(art);
  // palette and brush pot
  cylinder(g, M.walnut, .16, .17, .025, 24, .38, .84, .12);
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * PI * 2;
    sphere(g, M.flowers[i % M.flowers.length], .022, .38 + Math.cos(a) * .09, .865, .12 + Math.sin(a) * .09, { w: 6, h: 4 });
  }
  for (let i = 0; i < 4; i++) cylinder(g, M.walnut, .004, .003, .3, 4, -.28 + i * .04, .97, .25, { rz: .08 });
  return g;
}

export function gymSet(M) {
  const g = group('Home_Gym');
  // rubber mat
  box(g, M.carpet, 2.6, .025, 1.5, 0, .015, 0);
  // weight bench
  for (const x of [-.55, .55]) {
    box(g, M.iron, .08, .42, .45, x, .22, 0);
    box(g, M.iron, .35, .04, .5, x, .03, 0);
  }
  roundedBox(g, M.leather, 1.5, .16, .46, .05, 0, .49, 0);
  box(g, M.leather, .52, .45, .46, 0, .78, -.34, { rx: -.35 });
  // dumbbells rack
  box(g, M.iron, 1.7, .07, .46, 1.7, .24, -.52);
  for (let i = 0; i < 4; i++) {
    const x = 1.1 + i * .38;
    cylinder(g, M.iron, .045, .045, .4, 12, x, .15, -.52, { rz: PI / 2 });
    for (const sx of [-1, 1]) cylinder(g, M.iron, .075, .075, .13, 12, x + sx * .2, .15, -.52, { rz: PI / 2 });
  }
  // exercise bike silhouette
  const bike = group('Exercise_Bike');
  bike.position.set(-1.55, 0, -.35);
  tube(bike, M.iron, [new THREE.Vector3(0, .32, 0), new THREE.Vector3(.25, .65, .1), new THREE.Vector3(.55, .9, .22)], .035, 0, 0, 0, { radial: 6, segments: 6 });
  for (const [x, z] of [[0, .2], [0, -.2]]) torus(bike, M.iron, .18, .02, x, .18, z, { rx: PI / 2, radial: 20 });
  cylinder(bike, M.leather, .14, .16, .08, 20, .38, .78, .15);
  cylinder(bike, M.iron, .03, .03, .45, 8, .7, .95, .02, { rz: -1.2 });
  box(bike, M.iron, .4, .03, .1, .82, 1.15, .02);
  g.add(bike);
  // a slim towel rail; the mirror is wall-mounted separately in the room plan
  box(g, M.brass, 1.0, .03, .03, 1.7, 1.8, -.52);
  for (const sx of [-1, 1]) box(g, M.brass, .03, .32, .03, 1.7 + sx * .45, 1.65, -.52);
  return g;
}

export function sunLounger(M, opts = {}) {
  const g = group('Sun_Lounger');
  const frame = M.oak;
  for (const sx of [-1, 1]) {
    tube(g, frame, [new THREE.Vector3(sx * .33, .06, -.85), new THREE.Vector3(sx * .38, .32, .0), new THREE.Vector3(sx * .33, .30, .75)], .032, 0, 0, 0, { radial: 5, segments: 6 });
  }
  box(g, frame, .72, .07, 1.5, 0, .34, .05);
  roundedBox(g, M.linenCream, .68, .13, 1.38, .05, 0, .44, .05);
  const back = roundedBox(g, M.linenCream, .68, .9, .1, .04, 0, .62, -.82, { rx: -.95 });
  // small cushion
  roundedBox(g, M.linenSage, .34, .16, .22, .05, 0, .58, -.55, { rx: -.6 });
  // wheels
  for (const sx of [-1, 1]) torus(g, M.iron, .06, .01, sx * .33, .07, -.78, { ry: PI / 2, radial: 14 });
  return g;
}

export function gardenBench(M, opts = {}) {
  const g = group('Garden_Bench');
  for (const sx of [-1, 1]) {
    box(g, M.iron, .055, .46, .48, sx * .75, .23, 0);
  }
  for (let i = 0; i < 4; i++) box(g, M.oak, 1.6, .055, .11, 0, .46, -.18 + i * .12);
  for (let i = 0; i < 3; i++) {
    box(g, M.oak, 1.6, .10, .05, 0, .6 + i * .13, -.22);
  }
  return g;
}

export function gardenDining(M, opts = {}) {
  const g = group('Garden_Dining');
  const wood = M.oak;
  // teak table
  for (let i = 0; i < 5; i++) box(g, wood, 1.8, .055, .13, 0, .76, -.36 + i * .17);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, wood, .08, .72, .08, sx * .74, .38, sz * .34);
  // 4 chairs
  for (const [x, z, ry] of [[-.55, .85, PI], [.55, .85, PI], [-.55, -.85, 0], [.55, -.85, 0]]) {
    const c = group('Garden_Chair');
    c.position.set(x, 0, z); c.rotation.y = ry;
    for (const [sx, sz] of [[-.24, .22], [.24, .22], [-.24, -.22], [.24, -.22]]) box(c, wood, .055, .44, .055, sx, .22, sz);
    for (let i = 0; i < 3; i++) box(c, wood, .5, .04, .11, 0, .45, -.15 + i * .14);
    for (let i = 0; i < 3; i++) box(c, wood, .5, .09, .035, 0, .55 + i * .12, -.23);
    g.add(c);
  }
  // white cushions & parasol
  roundedBox(g, M.linenCream, 1.7, .08, .38, .04, 0, .81, 0);
  cylinder(g, wood, .035, .035, 2.2, 8, 0, 1.1, -.35);
  const canopy = cylinder(g, M.linenCream, .02, 1.55, .55, 16, 0, 2.25, -.35, { open: true });
  return g;
}

export function parseChair(M, opts = {}) {
  const g = group('Parsol_Chair');
  for (const [x, z] of [[-.3, .25], [.3, .25], [-.3, -.25], [.3, -.25]]) box(g, M.oak, .055, .4, .055, x, .2, z);
  box(g, M.oak, .7, .05, .6, 0, .42, 0);
  roundedBox(g, M.linenCream, .64, .08, .52, .04, 0, .47, 0);
  box(g, M.oak, .68, .55, .06, 0, .75, -.26, { rx: -.16 });
  return g;
}

export function pergolaBeam(M, length = 4) {
  // Handled by garden builder
  return group('Pergola');
}

export function birdbath(M) {
  const g = group('Stone_Birdbath');
  lathe(g, M.whiteStone, [[.4, 0], [.45, .05], [.3, .15], [.15, .3], [.12, .6], [.2, .72]], 20, 0, 0, 0);
  lathe(g, M.whiteStone, [[0, 0], [.65, .02], [.72, .10], [.65, .14], [.0, .13]], 28, 0, .75, 0);
  const water = new THREE.Mesh(new THREE.CircleGeometry(.62, 28), M.water);
  water.rotation.x = -PI / 2; water.position.y = .86; g.add(water);
  return g;
}

export function statue(M, seed = 1) {
  const g = group('Garden_Statue');
  box(g, M.whiteStone, .86, .18, .86, 0, .09, 0);
  box(g, M.whiteStone, .64, .75, .64, 0, .55, 0);
  const body = tube(g, M.whiteStone, [new THREE.Vector3(0, .95, 0), new THREE.Vector3(.05, 1.35, 0), new THREE.Vector3(-.04, 1.72, 0), new THREE.Vector3(.06, 2.0, 0)], .125, 0, 0, 0, { radial: 10, segments: 12 });
  sphere(g, M.whiteStone, .16, .06, 2.16, 0, { w: 14, h: 10 });
  for (const sx of [-1, 1]) {
    tube(g, M.whiteStone, [new THREE.Vector3(.02, 1.86, 0), new THREE.Vector3(sx * .32, 2.08, sx * .14), new THREE.Vector3(sx * .55, 2.2, sx * .04)], .055, 0, 0, 0, { radial: 6, segments: 8 });
    tube(g, M.whiteStone, [new THREE.Vector3(0, 1.2, 0), new THREE.Vector3(sx * .22, 1.0, sx * .08), new THREE.Vector3(sx * .28, .86, 0)], .07, 0, 0, 0, { radial: 6, segments: 6 });
  }
  return g;
}

export function outdoorSofa(M) {
  const g = group('Outdoor_Sofa');
  box(g, M.oak, 2.4, .28, .9, 0, .25, 0);
  for (let i = 0; i < 3; i++) roundedBox(g, M.linenCream, .72, .18, .78, .06, -.8 + i * .8, .48, .04);
  roundedBox(g, M.linenCream, 2.35, .5, .18, .06, 0, .63, -.36);
  for (const sx of [-1, 1]) roundedBox(g, M.linenCream, .2, .36, .8, .06, sx * 1.1, .52, .02);
  for (const [x, z] of [[-1.1, .35], [1.1, .35], [-1.1, -.35], [1.1, -.35]]) box(g, M.oak, .07, .24, .07, x, .12, z);
  return g;
}
