import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/*  Maison Lumière — procedural PBR material library                   */
/*  Every texture is generated deterministically, so the GLB is fully  */
/*  self-contained and reproducible.                                   */
/* ------------------------------------------------------------------ */

let SEED = 0x9e3779b9;
function rand() {
  SEED |= 0;
  SEED = (SEED + 0x6d2b79f5) | 0;
  let t = Math.imul(SEED ^ (SEED >>> 15), 1 | SEED);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function hash2(x, y, seed = 1) {
  let h = Math.imul(x + 374761393, 668265263) ^ Math.imul(y + 1274126177, 2246822519) ^ Math.imul(seed, 3266489917);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function smooth(t) { return t * t * (3 - 2 * t); }
function valueNoise(x, y, grid, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = smooth(x - xi), yf = smooth(y - yi);
  const x0 = ((xi % grid) + grid) % grid;
  const y0 = ((yi % grid) + grid) % grid;
  const x1 = (x0 + 1) % grid, y1 = (y0 + 1) % grid;
  const a = hash2(x0, y0, seed), b = hash2(x1, y0, seed);
  const c = hash2(x0, y1, seed), d = hash2(x1, y1, seed);
  return (a + (b - a) * xf) * (1 - yf) + (c + (d - c) * xf) * yf;
}
function fbm(x, y, { scale = 8, octaves = 5, seed = 1, persistence = 0.52 } = {}) {
  let sum = 0, amp = 1, norm = 0, freq = scale;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise(x * freq, y * freq, freq, seed + o * 131);
    norm += amp;
    amp *= persistence;
    freq *= 2;
  }
  return sum / norm;
}

function canvas2d(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  return { c, ctx, w, h };
}
function clamp255(v) { return Math.max(0, Math.min(255, v)); }
function tex(c, { srgb = false, repeat = 1, mime = 'image/jpeg', anisotropy = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (Array.isArray(repeat)) t.repeat.set(repeat[0], repeat[1]);
  else t.repeat.set(repeat, repeat);
  t.anisotropy = anisotropy;
  t.userData.mimeType = mime;
  t.needsUpdate = true;
  return t;
}
function texturesFromHeight(size, albedoDraw, heightFn, roughFn, opts = {}) {
  const albedo = canvas2d(size);
  albedoDraw(albedo.ctx, size);
  const normal = canvas2d(size);
  const nctx = normal.ctx;
  const img = nctx.createImageData(size, size);
  const rough = canvas2d(size);
  const rctx = rough.ctx;
  const rimg = rctx.createImageData(size, size);
  const heights = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) heights[y * size + x] = heightFn(x, y, size);
  }
  const strength = opts.normalStrength ?? 2.2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const l = heights[y * size + ((x - 1 + size) % size)];
      const r = heights[y * size + ((x + 1) % size)];
      const t = heights[((y - 1 + size) % size) * size + x];
      const b = heights[((y + 1) % size) * size + x];
      let nx = (l - r) * strength, ny = (b - t) * strength, nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len; ny /= len; nz /= len;
      const p = i * 4;
      img.data[p] = (nx * 0.5 + 0.5) * 255;
      img.data[p + 1] = (ny * 0.5 + 0.5) * 255;
      img.data[p + 2] = (nz * 0.5 + 0.5) * 255;
      img.data[p + 3] = 255;
      const rv = clamp255((roughFn ? roughFn(x, y, size) : 0.65) * 255);
      rimg.data[p] = rimg.data[p + 1] = rimg.data[p + 2] = rv;
      rimg.data[p + 3] = 255;
    }
  }
  nctx.putImageData(img, 0, 0);
  rctx.putImageData(rimg, 0, 0);
  return {
    map: tex(albedo.c, { srgb: true, repeat: opts.repeat ?? 1, anisotropy: opts.anisotropy ?? 8 }),
    normalMap: tex(normal.c, { repeat: opts.repeat ?? 1, mime: opts.normalMime ?? 'image/png' }),
    roughnessMap: tex(rough.c, { repeat: opts.repeat ?? 1, mime: 'image/jpeg' }),
  };
}

/* ----------------------------- stucco / limestone ----------------------------- */
function makeStucco() {
  return texturesFromHeight(256,
    (ctx, s) => {
      const im = ctx.createImageData(s, s);
      for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
        const n = fbm(x / s, y / s, { scale: 5, octaves: 5, seed: 7 });
        const micro = hash2(x, y, 3) * 7;
        const c = 226 + (n - 0.5) * 22 + (micro - 3.5);
        const p = (y * s + x) * 4;
        im.data[p] = clamp255(c + 5); im.data[p + 1] = clamp255(c + 1); im.data[p + 2] = clamp255(c - 10); im.data[p + 3] = 255;
      }
      ctx.putImageData(im, 0, 0);
    },
    (x, y, s) => fbm(x / s, y / s, { scale: 9, octaves: 4, seed: 12 }) + 0.018 * Math.sin(x * 0.9) * Math.sin(y * 0.55),
    (x, y, s) => 0.72 + fbm(x / s, y / s, { scale: 6, octaves: 3, seed: 29 }) * 0.16,
    { normalStrength: 1.5, repeat: 1 });
}
function makeTrimStone() {
  // Dense, fine-grain white plaster for cornices, columns and balustrades.
  return texturesFromHeight(128,
    (ctx, s) => {
      const im = ctx.createImageData(s, s);
      for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
        const n = fbm(x / s, y / s, { scale: 8, octaves: 3, seed: 31 });
        const v = 240 + (n - 0.5) * 10;
        const p = (y * s + x) * 4;
        im.data[p] = clamp255(v); im.data[p + 1] = clamp255(v - 1); im.data[p + 2] = clamp255(v - 5); im.data[p + 3] = 255;
      }
      ctx.putImageData(im, 0, 0);
    },
    (x, y, s) => fbm(x / s, y / s, { scale: 14, octaves: 2, seed: 4 }),
    () => 0.26,
    { normalStrength: 0.7, repeat: 1 });
}

/* ------------------------------- terracotta roof ------------------------------- */
function makeRoofTile() {
  const s = 512, tw = 32, th = 25;
  const heightFn = (x, y) => {
    const yy = (y % th) / th;
    const xx = ((x + Math.floor(y / th) * tw * 0.5) % tw) / tw;
    const hump = Math.sin(Math.PI * Math.pow(xx, 0.72));
    return hump * (0.55 + 0.45 * Math.sin(Math.PI * yy)) + 0.06 * fbm(x / s, y / s, { scale: 18, octaves: 2, seed: 9 });
  };
  return texturesFromHeight(s,
    (ctx) => {
      ctx.fillStyle = '#96958e'; ctx.fillRect(0, 0, s, s);
      for (let row = 0; row < s / th + 1; row++) {
        const y = row * th;
        for (let col = 0; col < s / tw + 2; col++) {
          const x = col * tw - (row % 2) * tw * 0.5;
          const shade = 0.79 + rand() * 0.2;
          const grd = ctx.createLinearGradient(x, 0, x + tw, 0);
          grd.addColorStop(0, `rgba(${88 * shade},${89 * shade},${87 * shade},1)`);
          grd.addColorStop(0.42, `rgba(${181 * shade},${181 * shade},${175 * shade},1)`);
          grd.addColorStop(0.68, `rgba(${160 * shade},${160 * shade},${154 * shade},1)`);
          grd.addColorStop(1, `rgba(${105 * shade},${106 * shade},${102 * shade},1)`);
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.moveTo(x, y + th);
          ctx.lineTo(x, y + th * 0.32);
          ctx.quadraticCurveTo(x + tw * 0.5, y - th * 0.18, x + tw, y + th * 0.32);
          ctx.lineTo(x + tw, y + th);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(60,60,57,.22)'; ctx.lineWidth = 1.4; ctx.stroke();
          ctx.strokeStyle = 'rgba(240,238,226,.28)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x + 2, y + th * 0.75); ctx.lineTo(x + 2, y + th * 0.38); ctx.stroke();
          ctx.fillStyle = 'rgba(44,44,42,.18)';
          ctx.fillRect(x, y + th - 2, tw, 2);
        }
      }
      // lichen and weather bloom
      for (let i = 0; i < 450; i++) {
        const x = rand() * s, y = rand() * s, r = 0.5 + rand() * 2.2;
        ctx.fillStyle = `rgba(${160 + rand() * 30},${158 + rand() * 30},${140 + rand() * 20},${0.05 + rand() * 0.09})`;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
    },
    heightFn,
    (x, y) => 0.58 + heightFn(x, y) * 0.25 + rand() * 0.04,
    { normalStrength: 3.8, repeat: 1, anisotropy: 16 });
}

/* ---------------------------------- marble ---------------------------------- */
function makeMarble(size = 512, tint = [226, 216, 199]) {
  const heightFn = (x, y) => {
    const n = fbm(x / size, y / size, { scale: 4, octaves: 5, seed: 5 });
    return 0.5 + 0.18 * n;
  };
  return texturesFromHeight(size,
    (ctx) => {
      const im = ctx.createImageData(size, size);
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const nx = x / size, ny = y / size;
        const n = fbm(nx, ny, { scale: 3.4, octaves: 6, seed: 14 });
        const warp = fbm(nx + 0.31, ny - 0.18, { scale: 7, octaves: 4, seed: 77 });
        const vein = Math.abs(Math.sin((nx * 7.1 + ny * 4.6 + warp * 3.2) * Math.PI));
        const secondary = Math.abs(Math.sin((nx * 15.3 - ny * 9.1 + n * 5.0) * Math.PI));
        const v = Math.pow(1 - vein, 12) * 0.58 + Math.pow(1 - secondary, 22) * 0.25;
        const grain = (hash2(x, y, 6) - 0.5) * 8 + (n - 0.5) * 12;
        const p = (y * size + x) * 4;
        im.data[p] = clamp255(tint[0] + grain - v * 67);
        im.data[p + 1] = clamp255(tint[1] + grain - v * 61);
        im.data[p + 2] = clamp255(tint[2] + grain - v * 52);
        im.data[p + 3] = 255;
      }
      ctx.putImageData(im, 0, 0);
    },
    heightFn,
    (x, y) => 0.22 + fbm(x / size, y / size, { scale: 5, octaves: 3, seed: 44 }) * 0.09,
    { normalStrength: 0.45, repeat: 1, anisotropy: 16 });
}

/* --------------------------------- wood / parquet --------------------------------- */
function makeWood() {
  return texturesFromHeight(512,
    (ctx, s) => {
      const im = ctx.createImageData(s, s);
      for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
        const nx = x / s, ny = y / s;
        const warp = fbm(nx * 0.5, ny * 3.0, { scale: 4, octaves: 4, seed: 22 });
        const rings = 0.5 + 0.5 * Math.sin((ny * 23 + warp * 5.8 + nx * 1.5) * Math.PI);
        const fibre = fbm(nx * 1.2, ny * 28, { scale: 10, octaves: 3, seed: 3 });
        const grain = Math.pow(rings, 14) * 0.55 + Math.pow(fibre, 5) * 0.25;
        const p = (y * s + x) * 4;
        im.data[p] = clamp255(220 - grain * 94 + (fibre - 0.5) * 18);
        im.data[p + 1] = clamp255(192 - grain * 90 + (fibre - 0.5) * 16);
        im.data[p + 2] = clamp255(151 - grain * 77 + (fibre - 0.5) * 13);
        im.data[p + 3] = 255;
      }
      ctx.putImageData(im, 0, 0);
    },
    (x, y, s) => {
      const nx = x / s, ny = y / s;
      const warp = fbm(nx * 0.5, ny * 3.0, { scale: 4, octaves: 3, seed: 22 });
      return 0.5 + 0.5 * Math.sin((ny * 23 + warp * 5.8 + nx * 1.5) * Math.PI);
    },
    (x, y) => 0.44 + rand() * 0.12,
    { normalStrength: 1.0, repeat: 1, anisotropy: 8 });
}

function makeParquet() {
  const s = 512, w = 64;
  return texturesFromHeight(s,
    (ctx) => {
      ctx.fillStyle = '#8a6748'; ctx.fillRect(0, 0, s, s);
      const plank = (x, y, pw, ph, angle, tone) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
        const grd = ctx.createLinearGradient(0, 0, pw, 0);
        grd.addColorStop(0, `rgb(${150 + tone},${113 + tone * 0.8},${77 + tone * 0.6})`);
        grd.addColorStop(0.45, `rgb(${177 + tone},${137 + tone * 0.8},${94 + tone * 0.6})`);
        grd.addColorStop(1, `rgb(${132 + tone},${98 + tone * 0.8},${65 + tone * 0.6})`);
        ctx.fillStyle = grd; ctx.fillRect(0, 0, pw, ph);
        for (let g = 0; g < 13; g++) {
          const yy = rand() * ph;
          ctx.strokeStyle = `rgba(84,56,37,${0.035 + rand() * 0.08})`;
          ctx.lineWidth = 0.5 + rand() * 1.2;
          ctx.beginPath(); ctx.moveTo(0, yy);
          for (let px = 0; px <= pw; px += 8) ctx.lineTo(px, yy + Math.sin(px * 0.07 + g) * 1.4);
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(58,38,25,.3)'; ctx.lineWidth = 1.5; ctx.strokeRect(0, 0, pw, ph);
        ctx.restore();
      };
      // herringbone pattern with two plank orientations
      for (let y = -1; y < s / (w / 2) + 2; y++) {
        for (let x = -1; x < s / (w / 2) + 2; x++) {
          const ox = x * w * 0.5, oy = y * w * 0.5;
          const flip = (x + y) % 2 === 0;
          plank(ox, oy, w, w / 4, flip ? Math.PI / 4 : -Math.PI / 4, (rand() - 0.5) * 26);
        }
      }
      ctx.globalAlpha = 0.12; ctx.fillStyle = '#f5e1c4'; ctx.fillRect(0, 0, s, s); ctx.globalAlpha = 1;
    },
    (x, y) => {
      const n = fbm(x / s, y / s, { scale: 24, octaves: 2, seed: 8 });
      return n * 0.3 + 0.4;
    },
    (x, y) => 0.38 + fbm(x / s, y / s, { scale: 32, octaves: 2, seed: 13 }) * 0.18,
    { normalStrength: 1.2, repeat: 1, anisotropy: 16 });
}

/* ----------------------------------- fabric ----------------------------------- */
function makeLinen() {
  return texturesFromHeight(256,
    (ctx, s) => {
      const im = ctx.createImageData(s, s);
      for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
        const warp = Math.sin(x * Math.PI * 0.62) * 0.5 + 0.5;
        const weft = Math.sin(y * Math.PI * 0.62) * 0.5 + 0.5;
        const mix = warp * weft;
        const fibre = fbm(x / s, y / s, { scale: 8, octaves: 3, seed: 17 });
        const v = 218 + mix * 15 + (fibre - 0.5) * 24;
        const p = (y * s + x) * 4;
        im.data[p] = clamp255(v + 2); im.data[p + 1] = clamp255(v); im.data[p + 2] = clamp255(v - 5); im.data[p + 3] = 255;
      }
      ctx.putImageData(im, 0, 0);
    },
    (x, y) => 0.5 + 0.5 * Math.sin(x * 1.2) * Math.sin(y * 1.2),
    (x, y) => 0.82 + fbm(x / 256, y / 256, { scale: 10, octaves: 2, seed: 4 }) * 0.08,
    { normalStrength: 0.8, repeat: 2, anisotropy: 4 });
}
function makeVelvet() {
  return texturesFromHeight(256,
    (ctx, s) => {
      const im = ctx.createImageData(s, s);
      for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
        const n = fbm(x / s, y / s, { scale: 5, octaves: 4, seed: 25 });
        const nap = (hash2(x, y, 2) - 0.5) * 8;
        const v = 210 + (n - 0.5) * 22 + nap;
        const p = (y * s + x) * 4;
        im.data[p] = clamp255(v); im.data[p + 1] = clamp255(v); im.data[p + 2] = clamp255(v); im.data[p + 3] = 255;
      }
      ctx.putImageData(im, 0, 0);
    },
    (x, y, s) => fbm(x / s, y / s, { scale: 20, octaves: 2, seed: 23 }),
    (x, y) => 0.7 + fbm(x / 256, y / 256, { scale: 7, octaves: 2, seed: 9 }) * 0.12,
    { normalStrength: 0.55, repeat: 2, anisotropy: 4 });
}

/* ---------------------------------- surfaces ---------------------------------- */
function makeGranite() {
  return texturesFromHeight(512,
    (ctx, s) => {
      const im = ctx.createImageData(s, s);
      for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
        const n = fbm(x / s, y / s, { scale: 12, octaves: 5, seed: 41 });
        const fleck = hash2(x, y, 33);
        const isFleck = fleck > 0.94 ? 1 : 0;
        const v = 140 + (n - 0.5) * 34 + isFleck * (fleck > 0.975 ? 45 : -25);
        const p = (y * s + x) * 4;
        im.data[p] = clamp255(v + 4); im.data[p + 1] = clamp255(v + 3); im.data[p + 2] = clamp255(v - 2); im.data[p + 3] = 255;
      }
      ctx.putImageData(im, 0, 0);
    },
    (x, y, s) => fbm(x / s, y / s, { scale: 26, octaves: 3, seed: 21 }),
    (x, y, s) => 0.68 + fbm(x / s, y / s, { scale: 9, octaves: 3, seed: 31 }) * 0.14,
    { normalStrength: 2.1, repeat: 1, anisotropy: 16 });
}
function makeGrass() {
  return texturesFromHeight(512,
    (ctx, s) => {
      const im = ctx.createImageData(s, s);
      for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
        const n = fbm(x / s, y / s, { scale: 9, octaves: 5, seed: 11 });
        const blade = Math.pow(Math.abs(Math.sin(x * 0.28 + fbm(x / s, y / s, { scale: 7, octaves: 2, seed: 5 }) * 9)), 18);
        const p = (y * s + x) * 4;
        im.data[p] = clamp255(58 + n * 48 - blade * 17);
        im.data[p + 1] = clamp255(94 + n * 66 + blade * 24);
        im.data[p + 2] = clamp255(46 + n * 36 - blade * 12);
        im.data[p + 3] = 255;
      }
      ctx.putImageData(im, 0, 0);
    },
    (x, y, s) => fbm(x / s, y / s, { scale: 16, octaves: 4, seed: 18 }),
    (x, y, s) => 0.82 + fbm(x / s, y / s, { scale: 11, octaves: 2, seed: 61 }) * 0.12,
    { normalStrength: 1.4, repeat: 20, anisotropy: 8 });
}
function makeHedge() {
  return texturesFromHeight(256,
    (ctx, s) => {
      const im = ctx.createImageData(s, s);
      for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
        const n = fbm(x / s, y / s, { scale: 7, octaves: 5, seed: 15 });
        const leaf = Math.pow(hash2(Math.floor(x / 3), Math.floor(y / 3), 1), 4);
        const p = (y * s + x) * 4;
        const v = n * 0.75 + leaf * 0.35;
        im.data[p] = clamp255(38 + v * 58);
        im.data[p + 1] = clamp255(72 + v * 90);
        im.data[p + 2] = clamp255(38 + v * 46);
        im.data[p + 3] = 255;
      }
      ctx.putImageData(im, 0, 0);
    },
    (x, y, s) => fbm(x / s, y / s, { scale: 18, octaves: 3, seed: 12 }),
    (x, y) => 0.76 + rand() * 0.14,
    { normalStrength: 2.6, repeat: 1, anisotropy: 8 });
}
function makeMosaic() {
  const s = 512, cell = 32;
  return texturesFromHeight(s,
    (ctx) => {
      ctx.fillStyle = '#dfe6e3'; ctx.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y += cell) for (let x = 0; x < s; x += cell) {
        const hue = 0.54 + (hash2(x / cell, y / cell, 2) - 0.5) * 0.06;
        const light = 0.35 + hash2(x / cell, y / cell, 7) * 0.27;
        const col = new THREE.Color().setHSL(hue, 0.62, light);
        ctx.fillStyle = `#${col.getHexString()}`;
        ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
        const grd = ctx.createLinearGradient(x + 2, y + 2, x + cell - 2, y + cell - 2);
        grd.addColorStop(0, 'rgba(255,255,255,.24)');
        grd.addColorStop(0.55, 'rgba(255,255,255,0)');
        grd.addColorStop(1, 'rgba(0,20,30,.22)');
        ctx.fillStyle = grd; ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
      }
    },
    (x, y) => fbm(x / s, y / s, { scale: 45, octaves: 2, seed: 2 }),
    (x, y) => 0.16 + rand() * 0.09,
    { normalStrength: 1.7, repeat: 3, anisotropy: 8 });
}
function makeWater() {
  return texturesFromHeight(256,
    (ctx, s) => {
      const im = ctx.createImageData(s, s);
      for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
        const n = fbm(x / s, y / s, { scale: 5, octaves: 4, seed: 57 });
        const p = (y * s + x) * 4;
        im.data[p] = 120 + n * 24; im.data[p + 1] = 168 + n * 30; im.data[p + 2] = 177 + n * 34; im.data[p + 3] = 255;
      }
      ctx.putImageData(im, 0, 0);
    },
    (x, y, s) => 0.5 + 0.5 * Math.sin(x / s * Math.PI * 6 + fbm(x / s, y / s, { scale: 4, octaves: 3, seed: 92 }) * 8) * Math.sin(y / s * Math.PI * 8),
    () => 0.06,
    { normalStrength: 2.0, repeat: 4, anisotropy: 4 });
}

/* --------------------------------- wallpaper --------------------------------- */
function makeWallpaper() {
  const s = 512;
  const { c, ctx } = canvas2d(s);
  ctx.fillStyle = '#e6dfd2'; ctx.fillRect(0, 0, s, s);
  // fine silk grain
  const im = ctx.getImageData(0, 0, s, s);
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const n = fbm(x / s, y / s, { scale: 11, octaves: 3, seed: 33 });
    const p = (y * s + x) * 4;
    im.data[p] += (n - 0.5) * 10; im.data[p + 1] += (n - 0.5) * 8; im.data[p + 2] += (n - 0.5) * 5;
  }
  ctx.putImageData(im, 0, 0);
  // subtle French damask trellis
  ctx.strokeStyle = 'rgba(171,154,124,.20)'; ctx.lineWidth = 1.1;
  const motif = (cx, cy, sc) => {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(18, -12, 36, -28, 0, -58);
      ctx.bezierCurveTo(-26, -28, -14, -12, 0, 0);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -27, 2.4, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  };
  for (let y = 0; y < s + 128; y += 128) {
    for (let x = 0; x < s + 128; x += 128) {
      motif(x + 64, y + 64, 0.9);
      motif(x, y, 0.55);
    }
  }
  // faint gold vertical pinstripe
  ctx.strokeStyle = 'rgba(182,159,113,.12)'; ctx.lineWidth = 1;
  for (let x = 0; x < s; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, s); ctx.stroke(); }
  return {
    map: tex(c, { srgb: true, repeat: [2, 2], anisotropy: 4 }),
    normalMap: null,
    roughnessMap: null,
  };
}

/* ----------------------------------- rugs ----------------------------------- */
function makeRug(kind = 'persian') {
  const s = 512;
  const { c, ctx } = canvas2d(s);
  if (kind === 'persian') {
    ctx.fillStyle = '#9d7652'; ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#e3d3b8'; ctx.fillRect(22, 22, s - 44, s - 44);
    ctx.fillStyle = '#71817a'; ctx.fillRect(44, 44, s - 88, s - 88);
    ctx.fillStyle = '#d9c3a3'; ctx.fillRect(64, 64, s - 128, s - 128);
    const drawPalmette = (cx, cy, r) => {
      ctx.save(); ctx.translate(cx, cy);
      for (let i = 0; i < 12; i++) {
        ctx.rotate(Math.PI / 6);
        ctx.strokeStyle = i % 2 ? '#4d5f57' : '#96724e'; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.ellipse(0, -r * 0.52, r * 0.14, r * 0.32, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.strokeStyle = '#5d4632'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    };
    drawPalmette(s / 2, s / 2, 128);
    for (const [x, y] of [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]]) drawPalmette(s * x, s * y, 54);
    ctx.strokeStyle = '#4b5d55'; ctx.lineWidth = 3;
    ctx.strokeRect(30, 30, s - 60, s - 60);
    ctx.strokeRect(56, 56, s - 112, s - 112);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(245,234,210,${rand() * 0.13})`;
      ctx.fillRect(rand() * s, rand() * s, 1 + rand() * 2, 1 + rand() * 2);
    }
  } else {
    ctx.fillStyle = '#d8c8b6'; ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#b9a18a'; ctx.fillRect(18, 18, s - 36, s - 36);
    ctx.fillStyle = '#e2d6c6'; ctx.fillRect(38, 38, s - 76, s - 76);
    for (let i = 0; i < 55; i++) {
      const x = 50 + rand() * (s - 100), y = 50 + rand() * (s - 100), r = 8 + rand() * 26;
      ctx.fillStyle = `rgba(${120 + rand() * 60},${105 + rand() * 50},${85 + rand() * 45},${0.1 + rand() * 0.25})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      for (let p = 0; p < 7; p++) {
        ctx.strokeStyle = 'rgba(112,96,74,.22)'; ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + Math.cos(p) * r, y + Math.sin(p) * r, x + Math.cos(p) * r * 1.7, y + Math.sin(p) * r * 1.7);
        ctx.stroke();
      }
    }
    ctx.strokeStyle = '#8a735c'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(38, 38); ctx.lineTo(s - 38, 38); ctx.lineTo(s - 38, s - 38); ctx.lineTo(38, s - 38); ctx.closePath(); ctx.stroke();
  }
  // weave normal-ish grain over the top
  for (let y = 0; y < s; y += 3) {
    ctx.fillStyle = 'rgba(255,255,255,.035)'; ctx.fillRect(0, y, s, 1);
  }
  const cloth = makeLinen();
  return {
    map: tex(c, { srgb: true, repeat: 1, anisotropy: 8 }),
    normalMap: cloth.normalMap,
    roughnessMap: cloth.roughnessMap,
  };
}

/* --------------------------------- paintings --------------------------------- */
function makePainting(kind = 1) {
  const { c, ctx } = canvas2d(512, 384);
  if (kind === 1) {
    // impressionist garden at golden hour
    const sky = ctx.createLinearGradient(0, 0, 0, 240);
    sky.addColorStop(0, '#9fb6bd'); sky.addColorStop(0.55, '#d9c6a6'); sky.addColorStop(1, '#e4c59d');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, 512, 384);
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `rgba(${240 + rand() * 15},${225 + rand() * 25},${188 + rand() * 30},${0.1 + rand() * 0.25})`;
      ctx.beginPath(); ctx.ellipse(rand() * 512, 30 + rand() * 110, 20 + rand() * 60, 6 + rand() * 16, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#6f8163'; ctx.beginPath(); ctx.moveTo(0, 238);
    for (let x = 0; x <= 512; x += 24) ctx.lineTo(x, 230 + Math.sin(x * 0.02) * 15 + rand() * 8);
    ctx.lineTo(512, 384); ctx.lineTo(0, 384); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 150; i++) {
      const x = rand() * 512, y = 230 + rand() * 150;
      ctx.fillStyle = i % 3 === 0 ? `rgba(196,132,144,${0.3 + rand() * 0.3})` : `rgba(${78 + rand() * 50},${104 + rand() * 40},${62 + rand() * 35},${0.3 + rand() * 0.35})`;
      ctx.beginPath(); ctx.arc(x, y, 2 + rand() * 7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(238,225,199,.8)';
    ctx.beginPath(); ctx.ellipse(370, 274, 48, 13, 0.2, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = `rgba(${160 + rand() * 80},${140 + rand() * 70},${100 + rand() * 70},${rand() * 0.12})`;
      ctx.fillRect(rand() * 512, rand() * 384, 2 + rand() * 8, 1 + rand() * 3);
    }
  } else {
    // still life with peonies and a blue porcelain vase
    const bg = ctx.createLinearGradient(0, 0, 0, 384);
    bg.addColorStop(0, '#6e7569'); bg.addColorStop(1, '#3f463f');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 512, 384);
    ctx.fillStyle = '#9d8364'; ctx.fillRect(0, 296, 512, 88);
    ctx.fillStyle = '#5a7887';
    ctx.beginPath(); ctx.ellipse(266, 240, 65, 88, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4b6470'; ctx.fillRect(242, 120, 48, 55);
    ctx.strokeStyle = '#d7c9a5'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(266, 234, 52, 65, 0, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 28; i++) {
      const a = rand() * Math.PI * 2, r = rand() * 45;
      const x = 266 + Math.cos(a) * r, y = 150 + Math.sin(a) * r * 0.9;
      ctx.strokeStyle = 'rgba(107,127,86,.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(266, 170); ctx.quadraticCurveTo(x * 0.9 + 30, y - 20, x, y); ctx.stroke();
      ctx.fillStyle = ['#d9a6a5', '#f0d9d5', '#c8868f'][i % 3];
      for (let p = 0; p < 5; p++) {
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(p * 1.25) * 8, y + Math.sin(p * 1.25) * 8, 10, 6, p, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#e8c77f'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    for (let i = 0; i < 600; i++) ctx.fillRect(rand() * 512, rand() * 384, 3, 1);
  }
  // canvas texture and varnish
  for (let y = 0; y < 384; y += 3) {
    ctx.fillStyle = 'rgba(70,55,35,.03)'; ctx.fillRect(0, y, 512, 1);
  }
  return { map: tex(c, { srgb: true, repeat: 1, anisotropy: 8 }) };
}

/* ------------------------------- material assembly ------------------------------- */
export function createMaterials() {
  SEED = 0x51f15e;
  const stucco = makeStucco();
  const trim = makeTrimStone();
  const roof = makeRoofTile();
  const marble = makeMarble(512, [224, 213, 195]);
  const marbleCool = makeMarble(512, [220, 219, 210]);
  const wood = makeWood();
  const parquet = makeParquet();
  const linen = makeLinen();
  const velvet = makeVelvet();
  const granite = makeGranite();
  const grass = makeGrass();
  const hedge = makeHedge();
  const mosaic = makeMosaic();
  const water = makeWater();
  const wallpaper = makeWallpaper();
  const rugPersian = makeRug('persian');
  const rugFloral = makeRug('floral');
  const art1 = makePainting(1);
  const art2 = makePainting(2);

  const std = (name, params) => {
    const m = new THREE.MeshStandardMaterial(params);
    m.name = name;
    return m;
  };
  const phys = (name, params) => {
    const m = new THREE.MeshPhysicalMaterial(params);
    m.name = name;
    return m;
  };

  const M = {};
  M.stoneWall = std('Limestone_Stucco', {
    map: stucco.map, normalMap: stucco.normalMap, roughnessMap: stucco.roughnessMap,
    normalScale: new THREE.Vector2(1.1, 1.1), color: 0xece1cf, roughness: 0.84, metalness: 0.0, envMapIntensity: 0.38,
  });
  M.stuccoWarm = std('Warm_Stucco', {
    map: stucco.map, normalMap: stucco.normalMap, roughnessMap: stucco.roughnessMap,
    color: 0xd8c3a7, roughness: 0.88, metalness: 0.0, envMapIntensity: 0.35,
  });
  M.baseStone = std('Honed_Limestone_Base', {
    map: stucco.map, normalMap: stucco.normalMap, roughnessMap: stucco.roughnessMap,
    color: 0xc2b59f, roughness: 0.7, metalness: 0.0,
  });
  M.whiteStone = phys('White_Stone_Ornament', {
    map: trim.map, normalMap: trim.normalMap, roughnessMap: trim.roughnessMap,
    color: 0xf7f0e4, roughness: 0.29, metalness: 0.0, clearcoat: 0.34, clearcoatRoughness: 0.3, envMapIntensity: 0.6,
  });
  M.whiteTrim = phys('Painted_Boiserie', {
    map: trim.map, normalMap: trim.normalMap,
    color: 0xf6f1e7, roughness: 0.28, metalness: 0.0, clearcoat: 0.32, clearcoatRoughness: 0.35,
  });
  M.roofTile = std('Light_Grey_Clay_Tiles', {
    map: roof.map, normalMap: roof.normalMap, roughnessMap: roof.roughnessMap,
    normalScale: new THREE.Vector2(1.18, 1.18), color: 0xc6bbae, roughness: 0.58, metalness: 0.0, envMapIntensity: 0.42,
  });
  M.roofRidge = std('Ridge_Stone', {
    map: trim.map, normalMap: trim.normalMap, color: 0xb0aca3, roughness: 0.6,
  });
  M.marble = std('Beige_Marble', {
    map: marble.map, normalMap: marble.normalMap, roughnessMap: marble.roughnessMap,
    normalScale: new THREE.Vector2(.65, .65),
    color: 0xffffff, roughness: 0.38, metalness: 0.0, envMapIntensity: 0.72,
  });
  M.marbleCool = std('Bianco_Marble', {
    map: marbleCool.map, normalMap: marbleCool.normalMap, roughnessMap: marbleCool.roughnessMap,
    normalScale: new THREE.Vector2(.65, .65),
    color: 0xffffff, roughness: 0.36, metalness: 0.0, envMapIntensity: 0.7,
  });
  M.marbleDark = std('Grey_Marble', {
    map: marbleCool.map, normalMap: marbleCool.normalMap, roughnessMap: marbleCool.roughnessMap,
    normalScale: new THREE.Vector2(.7, .7),
    color: 0x9c9b93, roughness: 0.42, metalness: 0.0, envMapIntensity: 0.5,
  });
  M.parquet = std('Oak_Herringbone_Parquet', {
    map: parquet.map, normalMap: parquet.normalMap, roughnessMap: parquet.roughnessMap,
    normalScale: new THREE.Vector2(.58, .58),
    color: 0xffffff, roughness: 0.62, metalness: 0.0, envMapIntensity: 0.28,
  });
  M.walnut = std('Walnut_Solid', {
    map: wood.map, normalMap: wood.normalMap, roughnessMap: wood.roughnessMap,
    color: 0x8b6244, roughness: 0.46, metalness: 0.0,
  });
  M.oak = std('Oak_Solid', {
    map: wood.map, normalMap: wood.normalMap, roughnessMap: wood.roughnessMap,
    color: 0xc49b6b, roughness: 0.5, metalness: 0.0,
  });
  M.woodPale = std('Bleached_Oak', {
    map: wood.map, normalMap: wood.normalMap, roughnessMap: wood.roughnessMap,
    color: 0xd4bfa4, roughness: 0.54, metalness: 0.0,
  });
  M.giltwood = std('Giltwood_Frame', {
    map: trim.map, normalMap: trim.normalMap, color: 0xc7a262, roughness: 0.36, metalness: 0.55,
  });
  M.bronze = std('Dark_Bronze_Metal', {
    map: trim.map, normalMap: trim.normalMap, color: 0x3a2d20, roughness: 0.3, metalness: 0.88, envMapIntensity: 0.8,
  });
  M.brass = std('Aged_Brass', {
    map: trim.map, normalMap: trim.normalMap, color: 0xb18e55, roughness: 0.33, metalness: 0.95, envMapIntensity: 1.0,
  });
  M.iron = std('Wrought_Iron', {
    color: 0x242322, roughness: 0.55, metalness: 0.65,
  });
  M.gold = std('Gold_Leaf', {
    color: 0xd2ad63, roughness: 0.28, metalness: 0.9, envMapIntensity: 1.1,
  });
  M.linen = std('Natural_Linen', {
    map: linen.map, normalMap: linen.normalMap, roughnessMap: linen.roughnessMap,
    color: 0xd9cebc, roughness: 0.88, metalness: 0.0,
  });
  M.linenCream = std('Ivory_Linen', {
    map: linen.map, normalMap: linen.normalMap, roughnessMap: linen.roughnessMap,
    color: 0xf1e9da, roughness: 0.9, metalness: 0.0,
  });
  M.linenSage = std('Sage_Linen', {
    map: linen.map, normalMap: linen.normalMap, roughnessMap: linen.roughnessMap,
    color: 0x8f9b86, roughness: 0.9, metalness: 0.0,
  });
  M.linenRose = std('Rose_Linen', {
    map: linen.map, normalMap: linen.normalMap, roughnessMap: linen.roughnessMap,
    color: 0xc7a3a0, roughness: 0.9, metalness: 0.0,
  });
  M.velvetBlue = phys('Navy_Velvet', {
    map: velvet.map, normalMap: velvet.normalMap, roughnessMap: velvet.roughnessMap,
    color: 0x334858, roughness: 0.74, sheen: 1.0, sheenColor: 0x8da7b8, sheenRoughness: 0.42,
  });
  M.velvetRust = phys('Terracotta_Velvet', {
    map: velvet.map, normalMap: velvet.normalMap, roughnessMap: velvet.roughnessMap,
    color: 0x9a5c43, roughness: 0.74, sheen: 1.0, sheenColor: 0xe1a17e, sheenRoughness: 0.42,
  });
  M.velvetSage = phys('Sage_Velvet', {
    map: velvet.map, normalMap: velvet.normalMap, roughnessMap: velvet.roughnessMap,
    color: 0x64715f, roughness: 0.74, sheen: 1.0, sheenColor: 0xb5c3a4, sheenRoughness: 0.42,
  });
  M.leather = std('Cognac_Leather', {
    map: linen.normalMap, normalMap: linen.normalMap, color: 0x8e6248, roughness: 0.58, metalness: 0.02,
  });
  M.carpet = std('Wool_Carpet', {
    map: linen.map, normalMap: linen.normalMap, roughnessMap: linen.roughnessMap,
    color: 0x5d5a54, roughness: 0.98,
  });
  M.granite = std('Flamed_Granite_Paving', {
    map: granite.map, normalMap: granite.normalMap, roughnessMap: granite.roughnessMap,
    color: 0xbab6ae, roughness: 0.72, metalness: 0.0, envMapIntensity: 0.3,
  });
  M.graniteDark = std('Granite_Coping', {
    map: granite.map, normalMap: granite.normalMap, roughnessMap: granite.roughnessMap,
    color: 0x8b8981, roughness: 0.68,
  });
  M.grass = std('Lawn_Grass', {
    map: grass.map, normalMap: grass.normalMap, roughnessMap: grass.roughnessMap,
    color: 0x7f9a5f, roughness: 0.94, metalness: 0.0, envMapIntensity: 0.24,
  });
  M.hedge = std('Clipped_Boxwood', {
    map: hedge.map, normalMap: hedge.normalMap, roughnessMap: hedge.roughnessMap,
    normalScale: new THREE.Vector2(1.3, 1.3), color: 0x536e49, roughness: 0.84, metalness: 0.0,
  });
  M.foliage = std('Garden_Foliage', {
    map: hedge.map, normalMap: hedge.normalMap, normalScale: new THREE.Vector2(1.2, 1.2),
    color: 0x4a6742, roughness: 0.87,
  });
  M.foliageLight = std('Sunlit_Foliage', {
    map: hedge.map, normalMap: hedge.normalMap, normalScale: new THREE.Vector2(1.2, 1.2),
    color: 0x81975b, roughness: 0.86,
  });
  M.foliageDeep = std('Deep_Garden_Foliage', {
    map: hedge.map, normalMap: hedge.normalMap, normalScale: new THREE.Vector2(1.4, 1.4),
    color: 0x355033, roughness: 0.9,
  });
  M.foliageGold = std('Golden_Garden_Foliage', {
    map: hedge.map, normalMap: hedge.normalMap, normalScale: new THREE.Vector2(1.2, 1.2),
    color: 0xa0a45f, roughness: 0.86,
  });
  M.hedgeWarm = std('Sunlit_Boxwood', {
    map: hedge.map, normalMap: hedge.normalMap, normalScale: new THREE.Vector2(1.25, 1.25),
    color: 0x6f8352, roughness: 0.84,
  });
  M.bark = std('Tree_Bark', {
    map: wood.map, normalMap: wood.normalMap, roughnessMap: wood.roughnessMap,
    color: 0x77624d, roughness: 0.92,
  });
  M.mosaic = std('Blue_Glass_Mosaic', {
    map: mosaic.map, normalMap: mosaic.normalMap, roughnessMap: mosaic.roughnessMap,
    color: 0xffffff, roughness: 0.18, metalness: 0.15, envMapIntensity: 1.2,
  });
  M.water = phys('Pond_Water', {
    normalMap: water.normalMap, normalScale: new THREE.Vector2(0.15, 0.15),
    color: 0x4b8792, roughness: 0.055, metalness: 0.24, transparent: true, opacity: 0.76,
    envMapIntensity: 2.9, depthWrite: false, side: THREE.DoubleSide,
    clearcoat: 1.0, clearcoatRoughness: 0.022, reflectivity: 0.62, ior: 1.33,
  });
  M.waterJet = phys('Fountain_Water_Jet', {
    color: 0xd7f1f1, roughness: 0.1, metalness: 0.0, transparent: true, opacity: 0.66,
    emissive: 0xaed4d6, emissiveIntensity: 0.06, depthWrite: false, side: THREE.DoubleSide,
  });
  M.wallpaper = std('Damask_Wallpaper', {
    map: wallpaper.map, color: 0xffffff, roughness: 0.94,
  });
  M.wallpaperBlue = std('Blue_Damask_Wallpaper', {
    map: wallpaper.map, color: 0x9aafb5, roughness: 0.94,
  });
  M.wallpaperRose = std('Rose_Damask_Wallpaper', {
    map: wallpaper.map, color: 0xc8aaa2, roughness: 0.94,
  });
  M.rugPersian = std('Persian_Wool_Rug', {
    map: rugPersian.map, normalMap: rugPersian.normalMap, roughnessMap: rugPersian.roughnessMap,
    roughness: 0.97, color: 0xffffff,
  });
  M.rugFloral = std('Aubusson_Wool_Rug', {
    map: rugFloral.map, normalMap: rugFloral.normalMap, roughnessMap: rugFloral.roughnessMap,
    roughness: 0.97, color: 0xffffff,
  });
  M.art1 = std('Painting_Garden', { map: art1.map, roughness: 0.78 });
  M.art2 = std('Painting_Peonies', { map: art2.map, roughness: 0.78 });
  M.mirror = std('Antique_Mirror', {
    color: 0xd9e2e2, roughness: 0.035, metalness: 1.0, envMapIntensity: 1.5,
  });
  M.glass = phys('French_Window_Glass', {
    color: 0xc3d6d8, roughness: 0.055, metalness: 0.14, transparent: true, opacity: 0.48,
    envMapIntensity: 2.6, side: THREE.DoubleSide, depthWrite: false,
    emissive: 0xd6c3a3, emissiveIntensity: 0.055,
  });
  M.windowSheer = std('Sheer_Curtain_Behind_Glass', {
    map: linen.map, normalMap: linen.normalMap, color: 0xf2e9da, roughness: 0.9,
    transparent: true, opacity: 0.64, side: THREE.DoubleSide, depthWrite: false,
    emissive: 0xe8dcc3, emissiveIntensity: 0.035,
  });
  M.glassShower = phys('Shower_Glass', {
    color: 0xcfe0df, roughness: 0.03, metalness: 0.0, transparent: true, opacity: 0.14,
    side: THREE.DoubleSide, depthWrite: false,
  });
  M.terracotta = std('Terracotta_Planter', {
    map: stucco.map, normalMap: stucco.normalMap, color: 0xb87050, roughness: 0.76,
  });
  M.soil = std('Potting_Soil', { color: 0x41362a, roughness: 1.0 });
  M.ivoryCeramic = std('Ivory_Ceramic', {
    color: 0xf1eadd, roughness: 0.18, metalness: 0.0, envMapIntensity: 0.7,
  });
  M.blueCeramic = std('Blue_And_White_Porcelain', {
    color: 0x6e8d9e, roughness: 0.15, metalness: 0.0,
  });
  M.candle = std('Beeswax_Candle', { color: 0xefe0bd, roughness: 0.6 });
  M.flame = std('Candle_Flame', {
    color: 0xffdca2, emissive: 0xffb55e, emissiveIntensity: 0.0, roughness: 0.3, transparent: true, opacity: 0.9,
  });
  M.lampShade = std('Silk_Lamp_Shade', {
    map: linen.map, normalMap: linen.normalMap, color: 0xf1e3c8, roughness: 0.82,
    emissive: 0xffc77c, emissiveIntensity: 0.0, side: THREE.DoubleSide,
  });
  M.bulb = std('Warm_Bulb', {
    color: 0xffe3b0, emissive: 0xffc477, emissiveIntensity: 0.0, roughness: 0.2,
  });
  M.blackLacquer = std('Black_Lacquer', { color: 0x1e1d1b, roughness: 0.22, metalness: 0.1 });
  M.screen = std('Projection_Screen', { color: 0xd9d5c9, roughness: 0.75, emissive: 0x2d3d48, emissiveIntensity: 0.0 });
  M.books = [
    std('Book_Terracotta', { color: 0x8d5642, roughness: 0.8 }),
    std('Book_Forest', { color: 0x415546, roughness: 0.8 }),
    std('Book_Ochre', { color: 0xaf8a4e, roughness: 0.8 }),
    std('Book_Navy', { color: 0x364451, roughness: 0.8 }),
    std('Book_Cream', { color: 0xcfc2a9, roughness: 0.8 }),
  ];
  M.flowers = [
    std('Peony_Blush', { color: 0xd99da4, roughness: 0.65 }),
    std('Rose_Cream', { color: 0xecdfc9, roughness: 0.65 }),
    std('Lavender_Blue', { color: 0x8176ad, roughness: 0.7 }),
    std('Marigold_Gold', { color: 0xd09b43, roughness: 0.65 }),
  ];
  M.wisteria = std('Wisteria_Lavender', { color: 0xa995c4, roughness: 0.66 });
  M.blossomWhite = std('White_Blossom', { color: 0xefe5d3, roughness: 0.64 });
  M.blossomBlue = std('Hydrangea_Blue', { color: 0x8ea6bb, roughness: 0.67 });
  M.leavesFresh = std('Garden_Green_Leaves', {
    color: 0x557a50, roughness: 0.74, side: THREE.DoubleSide,
  });
  M.ironGate = std('Gate_Iron', { color: 0x252b29, roughness: 0.48, metalness: 0.72 });
  M.poolTile = M.mosaic;

  // architectural glass is slightly different so that window labels can be found.
  M.windowGlassLit = M.glass;

  // Common clipping material list (applied in the viewer for cut-away floor views)
  M.__all = Object.values(M).filter(v => v && v.isMaterial);
  return M;
}

export const MATERIAL_NOTES = {
  facade: '米白色哑光石灰石 + 暖米色真石漆，白色高光石膏装饰',
  metal: '深古铜色窗框、黄铜哑光五金',
  roof: '浅灰色陶瓦，程序化瓦垄法线与风化粗糙度',
  interior: '米色大理石拼花、人字橡木地板、法式护墙板与肌理墙纸',
  garden: '荔枝面浅灰花岗岩、蓝玻璃马赛克池底',
};
