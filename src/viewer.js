import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ================================================================== */
/*  Maison Lumière — interactive viewer                               */
/* ================================================================== */

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = THREE.MathUtils.lerp;
const damp = THREE.MathUtils.damp;
const nextFrame = () => new Promise(resolve => requestAnimationFrame(() => resolve()));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const isMobile = window.matchMedia('(max-width: 760px)').matches;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isWeChat = /MicroMessenger/i.test(navigator.userAgent);
if (isWeChat) document.documentElement.classList.add('is-wechat');
const TWO_PI = Math.PI * 2;

const D = {
  floorButtons: [...document.querySelectorAll('.floor-button')],
  labels: $('btn-labels'),
  rotate: $('btn-rotate'),
  night: $('btn-night'),
  themeLabel: $('theme-label'),
  themeSub: $('theme-sub'),
  reset: $('btn-reset'),
  download: $('btn-download'),
  fullscreen: $('btn-fullscreen'),
  photo: $('btn-photo'),
  audio: $('bg-music'),
  panel: $('btn-panel'),
  panelClose: $('btn-panel-close'),
  sidePanel: $('side-panel'),
  roomList: $('room-list'),
  directoryLevel: $('directory-level'),
  dockFloor: $('dock-floor-name'),
  cutaway: $('btn-cutaway'),
  card: $('room-card'),
  cardClose: $('room-card-close'),
  cardReset: $('card-reset'),
  loader: $('loader'),
  entryGate: $('loading-entry'),
  entryButton: $('entry-button'),
  compatHint: $('compat-hint'),
  bar: $('loader-bar'),
  loaderPct: $('loader-pct'),
  loaderStatus: $('loader-status'),
  toast: $('toast'),
  labelLayer: $('label-layer'),
  validation: $('validation-text'),
  compass: $('compass-needle'),
};

let manifest;
let roomById = new Map();
let gardenById = new Map();
let roomOrder = new Map();
let floorById = new Map();

/* ------------------------------------------------------------------ */
/*  State                                                             */
/* ------------------------------------------------------------------ */

const state = {
  activeFloor: null,
  roomId: null,
  gardenId: null,
  labels: true,
  cutaway: true,
  night: false,
  autoRotate: false,
  panelOpen: !isMobile,
  photo: false,
  ready: false,
  hovered: null,
};

let renderer;
let scene;
let camera;
let controls;
let composer;
let bloomPass;
let gradePass;
let fxaaPass;
let usePostFX = true;
let pmrem;
let daySky, nightSky, dayEnv, nightEnv;
let skyDayMesh, skyNightMesh;
let sun, moon, hemi, fill, ambient, dayFog, nightFog;
let dayNightMix = 0;
let targetDayNightMix = 0;
let glbBuffer = null;
let modelRoot;
let floorGroups = [];
let cutGroups = [];
let roomGroups = new Map();
let hiddenGroups = [];
let archGroups = [];
let roofGroup;
let exteriorGroup;
let landscapeGroup;
let stairGroup;
let stairFlights = [];
let roomLights = new Map();
let exteriorLights = [];
let facadeLights = [];
let waterLights = [];
let waterMaterials = [];
let fountainMist = null;
let fountainFX = null;
let gardenDetail = null;
let atmosphereGroup = null;
let mistSprites = [];
let dustPoints = null;
let sparklePoints = null;
let materialEntries = [];
let allMaterials = new Set();
let roomLabelEls = new Map();
let gardenLabelEls = new Map();
let labelRecords = [];
let selectionGroup;
let selectionFill;
let selectionLine;
let selectionKind = null;
let lastFrame = performance.now();
let introComplete = false;
let firstRenderDone = false;
let renderedFrameCount = 0;
let renderWatchdogTimer = 0;
let toastTimer = 0;
let cameraTween = null;
const opening = { active: false, start: 0 };

/* Night-only opening, graded around the knowledge-base primitives:
   P1 gate push -> P3 facade tilt -> P4 full-estate orbit -> P5/P6 aerial.
   The entire timeline shares one quadratic ease-in-out so the camera never
   holds or stops at a phase seam; position and target use the same timeline. */
const OPENING_GATE_POS = new THREE.Vector3(0, 1.35, 44.0);
const OPENING_GATE_TARGET = new THREE.Vector3(0, 6.4, 9.5);
const OPENING_WALK_POS = new THREE.Vector3(0, 2.05, 26.6);
const OPENING_WALK_TARGET = new THREE.Vector3(0, 7.0, 9.0);
const OPENING_TILT_TARGET = new THREE.Vector3(0, 15.2, 8.5);
const OPENING_ORBIT_POS = new THREE.Vector3(0, 18.0, 44.0);
const OPENING_ORBIT_TARGET = new THREE.Vector3(0, 5.2, 0);
const OPENING_AERIAL_POS = new THREE.Vector3(0, 50.0, 58.0);
const OPENING_AERIAL_TARGET = new THREE.Vector3(0, 1.5, 2.0);
const OPENING_GATE_FOV = isMobile ? 41 : 35;
const OPENING_WALK_FOV = isMobile ? 40 : 34;
const OPENING_TILT_FOV = isMobile ? 41 : 35;
const OPENING_ORBIT_FOV = isMobile ? 45 : 37;
const OPENING_AERIAL_FOV = isMobile ? 46 : 40;
const OPENING_PHASES = [
  { kind: 'push', duration: 5.5 },
  { kind: 'tilt', duration: 3.2 },
  { kind: 'pullback', duration: 4.0 },
  { kind: 'orbit', duration: 12.0 },
  { kind: 'aerial', duration: 4.8 },
  { kind: 'reset', duration: 2.2 },
];
const OPENING_TOTAL = OPENING_PHASES.reduce((sum, phase) => sum + phase.duration, 0);
const _openingPos = new THREE.Vector3();
const _openingTarget = new THREE.Vector3();
const _openingAux = new THREE.Vector3();
let backgroundMusic = null;
let musicPlaying = false;
let musicPlayPending = false;
let musicFallbackHandler = null;

const DUSK_MIST = new THREE.Color(0xf1f4ef);
const NIGHT_MIST = new THREE.Color(0x8198aa);

/* A light hand on the final image: warm highlights, cool lifted shadows,
   a soft screen-space sun halo and a whisper of grain. */
const CinematicGrade = {
  uniforms: {
    tDiffuse: { value: null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uSunScreen: { value: new THREE.Vector2(-2, -2) },
    uHalo: { value: 1 },
    uWarmth: { value: .8 },
    uSaturation: { value: 1.075 },
    uVignette: { value: .10 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform vec2 uSunScreen;
    uniform float uHalo;
    uniform float uWarmth;
    uniform float uSaturation;
    uniform float uVignette;
    varying vec2 vUv;

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 c = texel.rgb;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));

      vec3 warm = vec3(1.045, 1.002, 0.944);
      vec3 cool = vec3(0.974, 0.995, 1.022);
      float warmMix = clamp(uWarmth * (0.5 + 0.5 * smoothstep(0.0, 1.1, l)), 0.0, 1.0);
      c *= mix(cool, warm, warmMix);

      vec3 lift = mix(vec3(0.0015, 0.0025, 0.0055), vec3(0.0055, 0.0022, -0.0015), uWarmth);
      c += lift * (1.0 - smoothstep(0.0, 0.5, l));
      c = mix(vec3(l), c, uSaturation);

      vec2 q = vUv - 0.5;
      q.x *= uResolution.x / max(uResolution.y, 1.0);
      float vig = 1.0 - smoothstep(0.24, 0.93, length(q));
      c *= mix(1.0, vig, uVignette);

      if (uHalo > 0.001 && uSunScreen.x > -0.5) {
        vec2 d = (vUv - uSunScreen) * vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
        float dist = length(d);
        float halo = exp(-dist * 2.35) * 0.048 + exp(-dist * 9.0) * 0.028;
        float angle = atan(d.y, d.x);
        float rays = pow(max(0.0, sin(angle * 12.0 + 1.15)), 14.0) * exp(-dist * 2.8) * 0.046;
        float veil = exp(-dist * 1.35) * 0.012;
        c += vec3(1.0, 0.55, 0.25) * (halo + rays + veil) * uHalo;
      }

      gl_FragColor = vec4(max(c, 0.0), texel.a);
    }
  `,
};

const PALETTE = {
  '米白石材': '#e5dccb', '深古铜': '#3b2d20', '海军蓝丝绒': '#354b5b', '黄铜': '#b08f54',
  '暖米色': '#dcc8b0', '亚麻': '#e3d9c7', '古铜': '#5d4933', '胡桃木': '#684632',
  '白色石膏': '#efe9de', '墨绿': '#566258', '米白': '#ebe4d6', '白色大理石': '#e8e4dc',
  '鼠尾草绿': '#6e7c66', '亚麻白': '#eee6d8', '鼠尾草': '#74806b', '雾蓝': '#9fb2bb',
  '暖白': '#e9e2d5', '白色大理石 ': '#e8e4dc', '胡桃木 ': '#684632', '米色大理石': '#ddd2bf',
  '黑檀': '#2e2a25', '玫瑰灰': '#b6a09c', '浅灰花岗岩': '#a9a69f', '黄杨': '#65795b',
  '薰衣草紫': '#8b82b0', '蓝马赛克': '#4f8fa1', '象牙白': '#efe8db', '暖灰': '#b4aca1',
  '米白石材 ': '#e5dccb', '浅灰花岗岩 ': '#a9a69f', '橄榄绿': '#6c7d57',
  '米白大理石': '#e2d8c7', '深灰丝绒': '#4c4d4a', '镜面': '#c5d2d4', '黑色橡胶': '#333430',
  '金色': '#c4a05e', '暖木色': '#b38b62', '橡木': '#ab8459', '赭石': '#a9774f',
  '玫瑰灰 ': '#b6a09c', '藏蓝': '#2f4352', '深灰': '#545753', '木色': '#8b6546',
  '绿植': '#657b55', '白色': '#efe9dd', '灰蓝': '#8fa4ad', '金色 ': '#c4a05e',
};

function paletteColor(name) {
  if (PALETTE[name]) return PALETTE[name];
  const s = String(name || '');
  if (s.includes('古铜')) return '#3b2d20';
  if (s.includes('黄铜') || s.includes('金')) return '#b18e55';
  if (s.includes('海军蓝') || s.includes('藏蓝')) return '#354b5b';
  if (s.includes('蓝')) return '#8fa6b4';
  if (s.includes('鼠尾草') || s.includes('绿')) return '#6e7c66';
  if (s.includes('玫瑰') || s.includes('粉')) return '#bda5a0';
  if (s.includes('胡桃') || s.includes('木')) return '#735038';
  if (s.includes('大理石')) return '#e3ddd2';
  if (s.includes('白')) return '#eee8dc';
  if (s.includes('灰')) return '#a8a69f';
  return '#b1a58e';
}

function pad2(n) { return String(n).padStart(2, '0'); }
function areaText(n) { return `${Number(n).toFixed(1)} m²`; }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ------------------------------------------------------------------ */
/*  Loader & data                                                     */
/* ------------------------------------------------------------------ */

function setProgress(pct, text) {
  const p = clamp(Math.round(pct), 0, 100);
  if (D.bar) D.bar.style.width = p + '%';
  if (D.loaderPct) D.loaderPct.textContent = p + '%';
  if (text && D.loaderStatus) D.loaderStatus.textContent = text;
}

function loadingError(err) {
  console.error(err);
  const webglIssue = /webgl|context/i.test(String(err?.message || err));
  if (D.loader) {
    D.loader.style.display = 'flex';
    D.loader.classList.remove('is-hidden', 'is-ready');
    D.loader.classList.add('is-error');
    if (D.loaderStatus) D.loaderStatus.textContent = webglIssue ? '当前浏览器无法显示 3D' : '模型载入失败 · ' + (err?.message || String(err));
    if (D.bar) D.bar.style.background = '#9e5f54';
    const body = D.loader.querySelector('.loading-inner');
    if (body && !body.querySelector('.loading-retry')) {
      const note = document.createElement('p');
      note.className = 'loading-retry';
      note.textContent = webglIssue || isWeChat
        ? '请点右上角 ··· → 在浏览器打开；推荐 Chrome / Edge / Safari。'
        : '请确认使用现代浏览器（Chrome / Edge / Safari）并通过 HTTP 或 HTTPS 打开。';
      note.style.cssText = 'font-family:var(--cjk);font-size:10px;letter-spacing:.05em;max-width:390px;line-height:1.8;color:#805f4e;margin:22px 0 0';
      body.appendChild(note);
    }
  }
  showCompatHint();
  window.__VIEWER_ERROR__ = String(err?.stack || err);
}

function showCompatHint() {
  if (!D.compatHint) return;
  D.compatHint.hidden = false;
}

function hideCompatHint() {
  if (!D.compatHint) return;
  D.compatHint.hidden = true;
}

function startRenderWatchdog() {
  clearTimeout(renderWatchdogTimer);
  renderWatchdogTimer = window.setTimeout(() => {
    if (document.hidden) {
      // Do not mistake a backgrounded tab (RAF paused) for a white screen.
      renderWatchdogTimer = window.setTimeout(startRenderWatchdog, 4000);
      return;
    }
    const gl = renderer?.getContext?.();
    const contextLost = !gl || gl.isContextLost();
    const noGeometry = !renderer || renderer.info.render.triangles < 1;
    if (contextLost || renderedFrameCount < 2 || noGeometry) {
      showCompatHint();
    } else {
      hideCompatHint();
    }
  }, 7000);
}

function showEntryGate() {
  if (!D.loader || !D.entryButton) return Promise.resolve();
  D.loader.style.display = 'flex';
  D.loader.classList.remove('is-hidden', 'is-error');
  D.loader.classList.add('is-ready');
  if (D.loaderStatus) D.loaderStatus.textContent = '载入完成 · 准备进入';
  if (D.loaderPct) D.loaderPct.textContent = '100%';
  try { D.entryButton.focus({ preventScroll: true }); }
  catch (err) { D.entryButton.focus(); }
  return new Promise(resolve => {
    const start = () => {
      D.entryButton.removeEventListener('click', start);
      startBackgroundMusicFromEntry();
      resolve();
    };
    D.entryButton.addEventListener('click', start);
  });
}

function hideEntryGate() {
  if (!D.loader) return;
  D.loader.classList.add('is-hidden');
  window.setTimeout(() => { D.loader.style.display = 'none'; }, 1100);
}

async function readData() {
  let rawManifest = $('villa-data')?.textContent?.trim() || '';
  if (!rawManifest || rawManifest.startsWith('__MANIFEST')) {
    const r = await fetch('villa-manifest.json');
    if (!r.ok) throw new Error('Manifest unavailable');
    rawManifest = await r.text();
  }
  manifest = JSON.parse(rawManifest);
  roomById = new Map(manifest.rooms.map(r => [r.id, r]));
  gardenById = new Map(manifest.gardenLabels.map(g => [g.id, g]));
  floorById = new Map(manifest.floors.map(f => [f.index, f]));
  manifest.rooms.forEach((r, i) => roomOrder.set(r.id, i + 1));

  const chunkEls = [...document.querySelectorAll('#glb-data script.glb-chunk')];
  let encoded = chunkEls.length
    ? chunkEls.map(el => el.textContent.trim()).join('')
    : ($('glb-data')?.textContent?.trim() || '');
  if (!encoded || encoded.startsWith('__GLB')) {
    setProgress(8, '读取外部 GLB 文件…');
    const r = await fetch('maison-lumiere-villa.glb');
    if (!r.ok) throw new Error('GLB unavailable');
    return await r.arrayBuffer();
  }
  setProgress(12, '解码嵌入的 GLB 模型…');
  await pause(30);
  const bin = atob(encoded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  encoded = null;
  setProgress(30, 'GLB 数据解码完成');
  return bytes.buffer;
}

/* ------------------------------------------------------------------ */
/*  Sky & environment                                                 */
/* ------------------------------------------------------------------ */

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeSkyTexture(kind) {
  const W = 2048, H = 1024;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const rand = mulberry32(kind === 'night' ? 0x51f0a7 : 0x1977ab);
  const horizon = H * .535;

  if (kind === 'day') {
    // Clear afternoon: a luminous blue sky, high warm sun and only thin
    // high-altitude clouds. Deliberately no heavy dusk haze layer.
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#2f6ba6');
    sky.addColorStop(.16, '#4c8ac0');
    sky.addColorStop(.32, '#74abd2');
    sky.addColorStop(.44, '#a8cde2');
    sky.addColorStop(.505, '#d4e7ee');
    sky.addColorStop(.535, '#e8f2ef');
    sky.addColorStop(.56, '#edf0e4');
    sky.addColorStop(.62, '#c3d2c6');
    sky.addColorStop(1, '#839486');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    // Bright, high afternoon sun with a clean halo rather than a sunset wash.
    const sx = W * .30, sy = H * .31;
    const wideGlow = ctx.createRadialGradient(sx, sy, 0, sx, sy, W * .36);
    wideGlow.addColorStop(0, 'rgba(255,250,232,.58)');
    wideGlow.addColorStop(.16, 'rgba(255,238,196,.24)');
    wideGlow.addColorStop(.46, 'rgba(245,224,184,.07)');
    wideGlow.addColorStop(1, 'rgba(245,224,184,0)');
    ctx.fillStyle = wideGlow; ctx.fillRect(0, 0, W, H);
    const sunCore = ctx.createRadialGradient(sx, sy, 0, sx, sy, W * .062);
    sunCore.addColorStop(0, 'rgba(255,255,247,.98)');
    sunCore.addColorStop(.16, 'rgba(255,247,217,.76)');
    sunCore.addColorStop(.55, 'rgba(255,229,174,.18)');
    sunCore.addColorStop(1, 'rgba(255,220,160,0)');
    ctx.fillStyle = sunCore; ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.filter = 'blur(24px)';
    const cloud = (x, y, w, h, color, alpha) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(w, h));
      g.addColorStop(0, `rgba(${color},${alpha})`);
      g.addColorStop(.42, `rgba(${color},${alpha * .5})`);
      g.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = g;
      ctx.save(); ctx.translate(x, y); ctx.scale(1, h / w); ctx.beginPath(); ctx.arc(0, 0, w, 0, TWO_PI); ctx.fill(); ctx.restore();
    };
    // Sparse, clean white wisps.
    for (let i = 0; i < 15; i++) {
      const x = rand() * W;
      const y = H * (.10 + rand() * .24);
      const w = 60 + rand() * 155, h = 8 + rand() * 24;
      const a = .035 + rand() * .07;
      cloud(x, y, w, h, '255,253,246', a);
      if (x < 260) cloud(x + W, y, w, h, '255,253,246', a);
      if (x > W - 260) cloud(x - W, y, w, h, '255,253,246', a);
    }
    // A few cream cloud bands just above the horizon, not a haze sheet.
    for (let i = 0; i < 6; i++) {
      const x = rand() * W;
      const y = H * (.395 + rand() * .075);
      const w = 100 + rand() * 190, h = 8 + rand() * 18;
      const a = .05 + rand() * .07;
      cloud(x, y, w, h, '255,246,226', a);
      if (x < 260) cloud(x + W, y, w, h, '255,246,226', a);
      if (x > W - 260) cloud(x - W, y, w, h, '255,246,226', a);
    }
    ctx.restore();

    // Very light horizon haze only; the distance stays legible.
    const haze = ctx.createLinearGradient(0, horizon - 42, 0, horizon + 36);
    haze.addColorStop(0, 'rgba(238,244,238,0)');
    haze.addColorStop(.55, 'rgba(242,243,229,.13)');
    haze.addColorStop(1, 'rgba(197,207,190,0)');
    ctx.fillStyle = haze; ctx.fillRect(0, horizon - 42, W, 78);
  } else {
    // Blue hour: dusk still glowing behind the trees.
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#050c15');
    sky.addColorStop(.24, '#0b1724');
    sky.addColorStop(.4, '#1a2a3a');
    sky.addColorStop(.49, '#354250');
    sky.addColorStop(.535, '#5b5151');
    sky.addColorStop(.575, '#2a3030');
    sky.addColorStop(1, '#080d10');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 1150; i++) {
      const x = rand() * W, y = rand() * (horizon - 24), r = rand() < .94 ? .3 + rand() * .75 : 1.1 + rand() * 1.1;
      const a = .14 + rand() * .68;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TWO_PI);
      ctx.fillStyle = `rgba(${221 + rand() * 24},${229 + rand() * 17},255,${a})`; ctx.fill();
    }
    // Moon with a cool, generous halo.
    const mx = W * .695, my = H * .205;
    const moonGlow = ctx.createRadialGradient(mx, my, 0, mx, my, W * .19);
    moonGlow.addColorStop(0, 'rgba(246,244,224,.96)');
    moonGlow.addColorStop(.045, 'rgba(241,238,214,.72)');
    moonGlow.addColorStop(.2, 'rgba(197,214,225,.12)');
    moonGlow.addColorStop(1, 'rgba(185,207,222,0)');
    ctx.fillStyle = moonGlow; ctx.fillRect(0, 0, W, H);
    ctx.beginPath(); ctx.arc(mx, my, W * .015, 0, TWO_PI); ctx.fillStyle = '#eee9cf'; ctx.fill();
    // A pale golden remnant above the horizon.
    const afterglow = ctx.createRadialGradient(W * .33, H * .51, 0, W * .33, H * .51, W * .4);
    afterglow.addColorStop(0, 'rgba(225,173,126,.16)');
    afterglow.addColorStop(.4, 'rgba(174,138,117,.07)');
    afterglow.addColorStop(1, 'rgba(174,138,117,0)');
    ctx.fillStyle = afterglow; ctx.fillRect(0, 0, W, H);
    // Indigo cloud shadows.
    ctx.save(); ctx.filter = 'blur(30px)';
    for (let i = 0; i < 11; i++) {
      const x = rand() * W, y = H * (.22 + rand() * .25), w = 120 + rand() * 280, h = 20 + rand() * 44;
      const g = ctx.createRadialGradient(x, y, 0, x, y, w);
      g.addColorStop(0, `rgba(22,37,54,${.18 + rand() * .17})`);
      g.addColorStop(1, 'rgba(22,37,54,0)');
      ctx.fillStyle = g;
      ctx.save(); ctx.translate(x, y); ctx.scale(1, h / w); ctx.beginPath(); ctx.arc(0, 0, w, 0, TWO_PI); ctx.fill(); ctx.restore();
    }
    ctx.restore();
    const haze = ctx.createLinearGradient(0, horizon - 72, 0, horizon + 38);
    haze.addColorStop(0, 'rgba(197,172,142,0)');
    haze.addColorStop(.6, 'rgba(193,159,126,.10)');
    haze.addColorStop(1, 'rgba(124,143,146,0)');
    ctx.fillStyle = haze; ctx.fillRect(0, horizon - 72, W, 110);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.wrapS = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

function initSky() {
  daySky = makeSkyTexture('day');
  nightSky = makeSkyTexture('night');
  pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  dayEnv = pmrem.fromEquirectangular(daySky).texture;
  nightEnv = pmrem.fromEquirectangular(nightSky).texture;
  // The sky is a pair of cross-fading sky domes so the day/night change can be
  // perfectly linear during the opening; the PMREM environments stay separate.
  scene.background = null;
  scene.environment = dayEnv;
  scene.environmentIntensity = .84;
  // Clear-afternoon air: a very light exponential haze, not a gray veil.
  scene.fog = new THREE.FogExp2(0xd6e6ee, .0032);
  dayFog = { color: new THREE.Color(0xd6e6ee), density: .0032 };
  nightFog = { color: new THREE.Color(0x0f1d2a), density: .012 };
  initSkyDome();
}

function initSkyDome() {
  const makeTexture = src => {
    const tex = src.clone();
    tex.mapping = THREE.UVMapping;
    tex.wrapS = THREE.RepeatWrapping;
    tex.needsUpdate = true;
    return tex;
  };
  const geo = new THREE.SphereGeometry(300, 64, 32);
  // Opaque night dome sits behind everything. The transparent day dome fades
  // over it and is depth-tested so buildings, trees and the garden occlude it.
  const nightMat = new THREE.MeshBasicMaterial({
    map: makeTexture(nightSky), side: THREE.BackSide, depthWrite: false, depthTest: false,
    fog: false, toneMapped: true,
  });
  const dayMat = new THREE.MeshBasicMaterial({
    map: makeTexture(daySky), side: THREE.BackSide, depthWrite: false, depthTest: true,
    fog: false, transparent: true, opacity: 1, toneMapped: true,
  });
  skyNightMesh = new THREE.Mesh(geo, nightMat);
  skyDayMesh = new THREE.Mesh(geo, dayMat);
  for (const mesh of [skyNightMesh, skyDayMesh]) {
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    scene.add(mesh);
  }
  skyNightMesh.renderOrder = -1001;
  skyDayMesh.renderOrder = -1000;
}

/* ------------------------------------------------------------------ */
/*  Renderer / scene / lights                                         */
/* ------------------------------------------------------------------ */

function initRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.45 : 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.03;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-label', '卢米埃庄园三维模型');
  renderer.domElement.tabIndex = 0;
  $('canvas-wrap').appendChild(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, .1, 360);
  camera.position.set(isMobile ? 60 : 40.5, isMobile ? 32 : 20.5, isMobile ? 66 : 46);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 5.0, 1.0);
  controls.enableDamping = true;
  controls.dampingFactor = .055;
  controls.rotateSpeed = .62;
  controls.zoomSpeed = .8;
  controls.panSpeed = .7;
  controls.minDistance = 5;
  controls.maxDistance = 125;
  controls.minPolarAngle = .08;
  controls.maxPolarAngle = Math.PI * .495;
  controls.screenSpacePanning = true;
  controls.autoRotateSpeed = .32;
  controls.update();
  controls.addEventListener('start', () => {
    if (cameraTween) {
      cameraTween = null;
      controls.enabled = true;
    }
    if (state.autoRotate) setAutoRotate(false);
    closeHint();
  });

  usePostFX = !isMobile;
  if (usePostFX) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), .08, .50, 1.02);
    composer.addPass(bloomPass);
    gradePass = new ShaderPass(CinematicGrade);
    gradePass.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    composer.addPass(gradePass);
    composer.addPass(new OutputPass());
    // Native MSAA does not apply to the composer's offscreen target, so add an
    // explicit final FXAA resolve for clean silhouettes and railings.
    fxaaPass = new ShaderPass(FXAAShader);
    const pixelRatio = renderer.getPixelRatio();
    fxaaPass.material.uniforms.resolution.value.set(1 / (window.innerWidth * pixelRatio), 1 / (window.innerHeight * pixelRatio));
    composer.addPass(fxaaPass);
  }

  window.addEventListener('resize', onResize);
  renderer.domElement.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    showCompatHint();
    showToast('图形上下文暂不可用，请用系统浏览器打开');
  });
}

function initLights() {
  hemi = new THREE.HemisphereLight(0xdcecf8, 0x6d6451, .95);
  fill = new THREE.DirectionalLight(0xc1daee, .40);
  fill.position.set(32, 24, 22);
  ambient = new THREE.AmbientLight(0xfff4e5, .09);
  // Clear-afternoon key from the front-left. Strong enough to carve the
  // façade and roof, leaving the right side in a soft readable shade.
  sun = new THREE.DirectionalLight(0xfff0d6, 3.55);
  sun.position.set(-34, 34, 38);
  sun.target.position.set(0, 3.2, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -56;
  sun.shadow.camera.right = 56;
  sun.shadow.camera.top = 56;
  sun.shadow.camera.bottom = -56;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 190;
  // Soft shadows without the shimmer produced by over-aggressive peter-panning
  // or by undersampled shadow edges.
  sun.shadow.bias = -.00022;
  sun.shadow.normalBias = .028;
  sun.shadow.radius = 3;
  moon = new THREE.DirectionalLight(0x9fbbdf, 0);
  moon.position.set(-26, 38, -22);
  moon.target.position.set(0, 4, 0);
  moon.castShadow = false;
  moon.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
  moon.shadow.camera.left = -58;
  moon.shadow.camera.right = 58;
  moon.shadow.camera.top = 58;
  moon.shadow.camera.bottom = -58;
  moon.shadow.camera.near = 1;
  moon.shadow.camera.far = 165;
  moon.shadow.bias = -.00028;
  moon.shadow.normalBias = .03;
  moon.shadow.radius = 4;
  moon.shadow.camera.updateProjectionMatrix();
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(hemi, fill, ambient, sun, sun.target, moon, moon.target);
}

function makeExteriorLights() {
  // path lamp points, aligned with the modelled garden lanterns
  const gardenPoints = [
    [-2.8, 1.9, 12.8], [2.8, 1.9, 12.8], [-4.8, 1.9, 24.5], [4.8, 1.9, 24.5],
    [-6.2, 1.7, -10.6], [6.2, 1.7, -10.6],
  ];
  for (const [x, y, z] of gardenPoints) {
    const light = new THREE.PointLight(0xffc77f, 0, 9, 2.2);
    light.position.set(x, y, z);
    light.visible = false;
    scene.add(light);
    exteriorLights.push({ light, nightIntensity: 8, kind: 'garden' });
  }
  // Cool underwater accents: one broad fountain glow and two lower side
  // sources that graze the mosaic and make the water read as transparent.
  for (const [x, y, z, color, intensity, distance] of [
    [0, .48, 18.3, 0x83d6d3, 8.5, 8],
    [-1.55, .44, 18.05, 0x6fd1df, 5.5, 6.2],
    [1.55, .44, 18.55, 0x6fd1df, 5.5, 6.2],
    [-3.5, .6, -18.46, 0x72c8df, 5, 6],
    [3.5, .6, -18.46, 0x72c8df, 5, 6],
  ]) {
    const light = new THREE.PointLight(color, 0, distance, 2.2);
    light.position.set(x, y, z);
    light.visible = false;
    scene.add(light);
    waterLights.push({ light, nightIntensity: intensity });
  }
  // facade grazing spotlights for the night view
  const spots = [
    [-9.5, .65, 12.2, -9.5, 8.2, 8.15],
    [9.5, .65, 12.2, 9.5, 8.2, 8.15],
    [0, .65, -12.2, 0, 8.5, -8.15],
  ];
  for (const [x, y, z, tx, ty, tz] of spots) {
    const light = new THREE.SpotLight(0xffce96, 0, 24, .64, .92, 2.1);
    light.position.set(x, y, z);
    light.target.position.set(tx, ty, tz);
    light.visible = false;
    scene.add(light, light.target);
    facadeLights.push({ light, nightIntensity: 150 });
  }
}

function makeRoomLights() {
  const litByFloor = {
    0: ['salon', 'dining', 'vestibule', 'library', 'kitchen'],
    1: ['master-suite', 'guest-1', 'family-lounge', 'master-bath', 'guest-2'],
    2: ['belvedere', 'suite-3', 'atelier', 'cinema', 'gym'],
  };
  for (const f of manifest.floors) {
    const ids = litByFloor[f.index] || [];
    for (const id of ids) {
      const r = roomById.get(id);
      if (!r) continue;
      const [x0, x1, z0, z1] = r.bounds;
      const light = new THREE.PointLight(id.includes('bath') ? 0xffd9b0 : 0xffc184, 0, 10, 2.2);
      light.position.set((x0 + x1) / 2, f.base + 2.4, (z0 + z1) / 2);
      light.visible = false;
      scene.add(light);
      // Lowered intensity and a faster distance falloff prevent hot pools of
      // light and highlight popping on nearby glossy floors.
      roomLights.set(id, { light, floor: f.index, nightIntensity: 25 + Math.min(r.area, 70) * .3 });
    }
  }
}

function collectModelParts() {
  const find = (name) => {
    let result = null;
    modelRoot.traverse(o => { if (!result && o.name === name) result = o; });
    return result;
  };
  floorGroups = manifest.floors.map(f => find(`Floor_${f.index}`));
  cutGroups = manifest.floors.map(f => find(`ArchitectureCut_${f.index}`));
  archGroups = manifest.floors.map(f => find(`Architecture_${f.index}`));
  roofGroup = find('Roof');
  exteriorGroup = find('ExteriorDetails');
  landscapeGroup = find('Landscape');
  stairGroup = find('Staircase');
  stairFlights = [];
  if (stairGroup) {
    for (const child of stairGroup.children) {
      const to = Number(child.userData?.stairTo);
      if (Number.isFinite(to)) stairFlights.push({ object: child, to });
    }
  }
  manifest.rooms.forEach(room => {
    const g = find(`Room_${room.id}`);
    if (g) roomGroups.set(room.id, g);
  });
  hiddenGroups = [];
  modelRoot.traverse(o => {
    if (o.isGroup && (o.userData?.hideInCutaway === true || o.name?.startsWith('RoomHidden_'))) hiddenGroups.push(o);
  });
  // environment and material tuning
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const seen = new Set();
  modelRoot.traverse(o => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const mat of mats) {
      if (!mat) continue;
      if (!seen.has(mat.uuid)) {
        seen.add(mat.uuid);
        allMaterials.add(mat);
        prepareMaterial(mat, maxAniso);
      }
    }
    o.castShadow = !mats.some(m => m && m.transparent);
    o.receiveShadow = true;
    o.frustumCulled = true;
  });
  // find pond normal maps for slow surface animation
  const waterNames = new Set(['Pond_Water']);
  for (const mat of allMaterials) {
    if (!waterNames.has(mat.name)) continue;
    for (const key of ['normalMap', 'map']) {
      if (mat[key]) {
        mat[key].wrapS = mat[key].wrapT = THREE.RepeatWrapping;
        mat[key].matrixAutoUpdate = true;
        waterMaterials.push({ texture: mat[key], base: mat[key].offset.clone() });
      }
    }
  }
  // force the cut shells hidden until a floor is selected
  for (const g of cutGroups) if (g) g.visible = false;
  if (roofGroup) roofGroup.visible = true;
  if (exteriorGroup) exteriorGroup.visible = true;
}

function prepareMaterial(mat, maxAniso) {
  const name = mat.name || '';
  const env =
    /Pond_Water|Reflecting_Water/.test(name) ? 3.0 :
    /Glass|Mirror/.test(name) ? 2.2 :
    /Brass|Gold|Bronze/.test(name) ? 1.35 :
    /Marble/.test(name) ? 1.05 :
    /Stone|Stucco|Trim|Boiserie/.test(name) ? .48 :
    /Roof|Ridge/.test(name) ? .4 :
    /Foliage|Boxwood|Leaves|Hedge|Grass/.test(name) ? .42 :
    /Granite|Paving/.test(name) ? .32 : .62;
  mat.envMapIntensity = env;
  for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap']) {
    const tex = mat[key];
    if (tex && tex.isTexture) {
      // Grazing-angle floor texture shimmer is largely a filtering problem:
      // use the hardware's full anisotropic filtering budget.
      tex.anisotropy = Math.min(maxAniso, 16);
      if (key !== 'normalMap' && key !== 'roughnessMap' && key !== 'metalnessMap' && key !== 'aoMap') tex.colorSpace = THREE.SRGBColorSpace;
    }
  }
  if (mat.transparent) {
    mat.depthWrite = false;
    mat.transparent = true;
  }
  // Bring the most visible surfaces closer to a physically believable,
  // cinematographic response under the low dusk sun.
  if (/Pond_Water/.test(name)) {
    mat.color?.setHex(0x4f909b);
    mat.roughness = .034;
    mat.metalness = .20;
    mat.opacity = .82;
    mat.envMapIntensity = 3.5;
    mat.normalScale?.set(.24, .24);
    if ('clearcoat' in mat) { mat.clearcoat = 1.0; mat.clearcoatRoughness = .018; }
  } else if (/Limestone_Stucco|Warm_Stucco/.test(name)) {
    mat.roughness = .85;
    mat.normalScale?.set(1.1, 1.1);
  } else if (/Light_Grey_Clay_Tiles/.test(name)) {
    mat.roughness = .58;
    mat.normalScale?.set(1.22, 1.22);
    mat.color?.setHex(0xc6bbae);
  } else if (/White_Stone_Ornament/.test(name)) {
    mat.roughness = .29;
  } else if (/French_Window_Glass/.test(name)) {
    mat.envMapIntensity = 2.8;
    mat.opacity = .48;
  } else if (/Oak_Herringbone_Parquet/.test(name)) {
    mat.roughness = .66;
    mat.metalness = 0;
    mat.envMapIntensity = .28;
    mat.normalScale?.set(.55, .55);
  } else if (/Beige_Marble|Bianco_Marble|Grey_Marble/.test(name)) {
    mat.roughness = Math.max(mat.roughness, .44);
    mat.metalness = 0;
    mat.envMapIntensity = .52;
    mat.normalScale?.set(.62, .62);
  } else if (/Lawn_Grass/.test(name)) {
    mat.color?.setHex(0x7d9a5e);
    mat.roughness = .92;
    mat.envMapIntensity = .30;
    mat.normalScale?.set(1.25, 1.25);
  } else if (/Clipped_Boxwood|Garden_Foliage|Sunlit_Foliage|Deep_Garden_Foliage|Golden_Garden_Foliage/.test(name)) {
    mat.envMapIntensity = .46;
    mat.normalScale?.set(1.45, 1.45);
  } else if (/Granite|Paving/.test(name)) {
    mat.roughness = .66;
    mat.normalScale?.set(.86, .86);
    mat.envMapIntensity = .38;
  }
  const entry = {
    mat,
    dayIntensity: mat.emissiveIntensity || 0,
    dayColor: mat.emissive ? mat.emissive.clone() : null,
    nightIntensity: 0,
    nightColor: null,
  };
  if (name.includes('Warm_Bulb')) { entry.nightIntensity = 7; }
  else if (name.includes('Candle_Flame')) { entry.nightIntensity = 4.2; }
  else if (name.includes('Silk_Lamp_Shade') || name.includes('Lamp_Shade')) { entry.nightIntensity = 2.3; }
  else if (name.includes('Sheer_Curtain_Behind_Glass')) { entry.nightIntensity = 1.15; entry.nightColor = new THREE.Color(0xffce92); }
  else if (name.includes('French_Window_Glass')) { entry.nightIntensity = .52; entry.nightColor = new THREE.Color(0xffc47e); }
  else if (name.includes('Projection_Screen')) { entry.nightIntensity = .5; entry.nightColor = new THREE.Color(0x4f7896); }
  else if (name.includes('Fountain_Water_Jet')) { entry.nightIntensity = .18; }
  if (entry.nightIntensity > 0) materialEntries.push(entry);
}

function makeFountainMist() {
  const count = isMobile ? 250 : 380;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 4);
  const emitters = [
    { x: 0, y: 3.0, z: 18.3, spread: .26, power: 1.12 },
    { x: -2.45, y: .42, z: 18.3, spread: .14, power: .7 },
    { x: 2.45, y: .42, z: 18.3, spread: .14, power: .7 },
    { x: 0, y: .42, z: 15.85, spread: .14, power: .7 },
    { x: 0, y: .42, z: 20.75, spread: .14, power: .7 },
    { x: -3.5, y: 1.05, z: -18.46, spread: .08, power: .55 },
    { x: 3.5, y: 1.05, z: -18.46, spread: .08, power: .55 },
  ];
  const rnd = mulberry32(1037);
  for (let i = 0; i < count; i++) {
    const e = i % emitters.length;
    seeds[i * 4] = rnd() * TWO_PI;
    seeds[i * 4 + 1] = .35 + rnd() * .65;
    seeds[i * 4 + 2] = e;
    seeds[i * 4 + 3] = rnd();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const spriteCv = document.createElement('canvas');
  spriteCv.width = spriteCv.height = 64;
  const sctx = spriteCv.getContext('2d');
  const rg = sctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  rg.addColorStop(0, 'rgba(248,255,255,.9)');
  rg.addColorStop(.35, 'rgba(208,238,242,.46)');
  rg.addColorStop(1, 'rgba(208,238,242,0)');
  sctx.fillStyle = rg; sctx.fillRect(0, 0, 64, 64);
  const sprite = new THREE.CanvasTexture(spriteCv);
  sprite.colorSpace = THREE.SRGBColorSpace;
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    size: .095, map: sprite, transparent: true, opacity: .54, depthWrite: false,
    color: 0xe3f4f5, sizeAttenuation: true,
  }));
  points.frustumCulled = false;
  points.renderOrder = 3;
  scene.add(points);
  fountainMist = { points, geo, seeds, emitters, t: 0 };
}

function updateFountainMist(dt) {
  if (!fountainMist) return;
  const { geo, seeds, emitters } = fountainMist;
  const arr = geo.attributes.position.array;
  fountainMist.t += dt;
  for (let i = 0; i < arr.length / 3; i++) {
    const angle = seeds[i * 4];
    const speed = seeds[i * 4 + 1];
    const ei = Math.round(seeds[i * 4 + 2]);
    const phase = seeds[i * 4 + 3];
    const e = emitters[ei];
    const life = (fountainMist.t * (0.32 + speed * .18) + phase) % 1;
    const radial = e.spread + life * (0.7 + speed * 1.15) * e.power;
    arr[i * 3] = e.x + Math.cos(angle) * radial;
    arr[i * 3 + 1] = e.y + Math.sin(life * Math.PI) * (1.15 + speed * .8) * e.power - life * .15;
    arr[i * 3 + 2] = e.z + Math.sin(angle) * radial;
  }
  geo.attributes.position.needsUpdate = true;
}

/* ------------------------------------------------------------------ */
/*  Fountain water FX and garden detail                               */
/* ------------------------------------------------------------------ */

function makeDropletTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(.22, 'rgba(232,252,255,.92)');
  g.addColorStop(.55, 'rgba(190,231,240,.42)');
  g.addColorStop(1, 'rgba(190,231,240,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeFountainFX() {
  if (fountainFX) return;
  const rnd = mulberry32(0x7f4c21);
  const group = new THREE.Group();
  group.name = 'Fountain_Particle_FX';
  scene.add(group);
  const droplet = makeDropletTexture();

  // Remove the old static tube jets only inside the grand fountain; the rear
  // reflecting-pool jets keep their original geometry.
  if (modelRoot) {
    modelRoot.traverse(obj => {
      if (!obj.isMesh) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      if (!mats.some(mat => (mat?.name || '').includes('Fountain_Water_Jet'))) return;
      const p = obj.getWorldPosition(new THREE.Vector3());
      if (Math.abs(p.z - 18.3) < 6.5 && Math.abs(p.x) < 5) obj.visible = false;
    });
  }

  const makeDrops = (count, size, opacity, color) => {
    const positions = new Float32Array(count * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      size, map: droplet, transparent: true, opacity, color,
      depthWrite: false, sizeAttenuation: true, alphaTest: .015,
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    points.renderOrder = 4;
    group.add(points);
    return { geo, positions, points };
  };

  const centralCount = isMobile ? 220 : 420;
  const central = makeDrops(centralCount, .058, .82, 0xd8f3fa);
  const centralSeeds = new Float32Array(centralCount * 3);
  for (let i = 0; i < centralCount; i++) {
    centralSeeds[i * 3] = rnd() * TWO_PI;
    centralSeeds[i * 3 + 1] = .55 + rnd() * .75;
    centralSeeds[i * 3 + 2] = rnd();
  }

  const sideCount = isMobile ? 240 : 480;
  const side = makeDrops(sideCount, .047, .68, 0xccecf4);
  const sideSeeds = new Float32Array(sideCount * 4);
  for (let i = 0; i < sideCount; i++) {
    sideSeeds[i * 4] = rnd() * TWO_PI;
    sideSeeds[i * 4 + 1] = .55 + rnd() * .7;
    sideSeeds[i * 4 + 2] = rnd();
    sideSeeds[i * 4 + 3] = i % 4;
  }

  const splashCount = isMobile ? 120 : 240;
  const splash = makeDrops(splashCount, .035, .58, 0xc7eaf2);
  const splashSeeds = new Float32Array(splashCount * 4);
  for (let i = 0; i < splashCount; i++) {
    splashSeeds[i * 4] = rnd() * TWO_PI;
    splashSeeds[i * 4 + 1] = .4 + rnd() * .9;
    splashSeeds[i * 4 + 2] = rnd();
    splashSeeds[i * 4 + 3] = i % 4;
  }

  const rippleGroup = new THREE.Group();
  rippleGroup.name = 'Fountain_Ripples';
  group.add(rippleGroup);
  const ripples = [];
  const ringGeo = new THREE.RingGeometry(.82, 1, 64);
  for (let e = 0; e < 4; e++) {
    const a = e / 4 * TWO_PI + Math.PI / 4;
    const x = Math.cos(a) * 2.45;
    const z = 18.3 + Math.sin(a) * 2.45;
    for (let k = 0; k < 3; k++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xbfeff5, transparent: true, opacity: 0, side: THREE.DoubleSide,
        depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      });
      const ring = new THREE.Mesh(ringGeo, mat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, .342, z);
      ring.renderOrder = 3;
      rippleGroup.add(ring);
      ripples.push({ mesh: ring, mat, x, z, y: .342, maxScale: 1.85, phase: k / 3 + e * .07, rate: .42 + e * .025 });
    }
  }
  // A smaller ripple set in the upper bowl beneath the crown jet.
  for (let k = 0; k < 2; k++) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xc7f2f7, transparent: true, opacity: 0, side: THREE.DoubleSide,
      depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    });
    const ring = new THREE.Mesh(ringGeo, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 1.524, 18.3);
    ring.renderOrder = 3;
    rippleGroup.add(ring);
    ripples.push({ mesh: ring, mat, x: 0, z: 18.3, y: 1.524, maxScale: .92, phase: k / 2, rate: .58 });
  }

  const glowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 62);
    g.addColorStop(0, 'rgba(166,246,245,.8)');
    g.addColorStop(.3, 'rgba(103,220,228,.34)');
    g.addColorStop(1, 'rgba(75,190,210,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  })();
  const glows = [];
  for (const [x, y, z, s, base] of [[0, .42, 18.3, 5.0, .16], [0, 1.54, 18.3, 1.7, .12]]) {
    const mat = new THREE.SpriteMaterial({
      map: glowTex, color: 0x9ceaf0, transparent: true, opacity: base,
      depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(x, y, z);
    sprite.scale.set(s, s, 1);
    sprite.renderOrder = 2;
    group.add(sprite);
    glows.push({ sprite, mat, base });
  }

  fountainFX = { t: 0, central, centralSeeds, side, sideSeeds, splash, splashSeeds, ripples, glows };
}

function updateFountainFX(dt, t) {
  if (!fountainFX) return;
  const fx = fountainFX;
  fx.t += dt;
  const T = fx.t;

  const cArr = fx.central.geo.attributes.position.array;
  for (let i = 0; i < fx.centralSeeds.length / 3; i++) {
    const a = fx.centralSeeds[i * 3];
    const sp = fx.centralSeeds[i * 3 + 1];
    const phase = fx.centralSeeds[i * 3 + 2];
    const life = (T * (.34 + sp * .12) + phase) % 1;
    const age = life * 1.28;
    const r = .015 + life * (.07 + sp * .05);
    const y = 3.04 + (3.3 + sp) * age - 4.4 * age * age;
    cArr[i * 3] = Math.cos(a) * r;
    cArr[i * 3 + 1] = y;
    cArr[i * 3 + 2] = 18.3 + Math.sin(a) * r;
  }
  fx.central.geo.attributes.position.needsUpdate = true;

  const sArr = fx.side.geo.attributes.position.array;
  for (let i = 0; i < fx.sideSeeds.length / 4; i++) {
    const a = fx.sideSeeds[i * 4];
    const sp = fx.sideSeeds[i * 4 + 1];
    const phase = fx.sideSeeds[i * 4 + 2];
    const ei = Math.floor(fx.sideSeeds[i * 4 + 3]);
    const ea = ei / 4 * TWO_PI + Math.PI / 4;
    const life = (T * (.48 + sp * .12) + phase) % 1;
    const age = life * .98;
    const r = 1.0 + (1.45 + sp * .25) * age;
    const y = 1.5 + (1.35 + sp * .35) * age - 2.8 * age * age;
    sArr[i * 3] = Math.cos(ea) * r + Math.cos(a) * .035;
    sArr[i * 3 + 1] = y;
    sArr[i * 3 + 2] = 18.3 + Math.sin(ea) * r + Math.sin(a) * .035;
  }
  fx.side.geo.attributes.position.needsUpdate = true;

  const spArr = fx.splash.geo.attributes.position.array;
  for (let i = 0; i < fx.splashSeeds.length / 4; i++) {
    const a = fx.splashSeeds[i * 4];
    const sp = fx.splashSeeds[i * 4 + 1];
    const phase = fx.splashSeeds[i * 4 + 2];
    const ei = Math.floor(fx.splashSeeds[i * 4 + 3]);
    const ea = ei / 4 * TWO_PI + Math.PI / 4;
    const ox = Math.cos(ea) * 2.45;
    const oz = 18.3 + Math.sin(ea) * 2.45;
    const life = (T * (.9 + sp * .35) + phase) % 1;
    const age = life * .42;
    const r = .14 + age * (1.0 + sp * .5);
    const y = .34 + (1.0 + sp * .4) * age - 4.2 * age * age;
    spArr[i * 3] = ox + Math.cos(a) * r;
    spArr[i * 3 + 1] = y;
    spArr[i * 3 + 2] = oz + Math.sin(a) * r;
  }
  fx.splash.geo.attributes.position.needsUpdate = true;

  for (const r of fx.ripples) {
    const p = (T * r.rate + r.phase) % 1;
    const scale = .12 + p * r.maxScale;
    r.mesh.scale.set(scale, scale, 1);
    r.mat.opacity = Math.sin(Math.PI * Math.min(1, p * 1.15)) * (1 - p) * .3;
  }
  const glowNight = clamp((dayNightMix - .15) / .85, 0, 1);
  for (const g of fx.glows) {
    g.mat.opacity = g.base * glowNight * (.8 + .2 * Math.sin(t * .9 + g.sprite.position.y));
  }
}

function makeGardenDetail() {
  if (gardenDetail) return;
  const rnd = mulberry32(0x39a17d);
  const group = new THREE.Group();
  group.name = 'Garden_Close_Detail';
  scene.add(group);

  const bladeGeo = new THREE.PlaneGeometry(.055, .34, 1, 2);
  bladeGeo.translate(0, .17, 0);
  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: .92, metalness: 0, side: THREE.DoubleSide,
  });
  const grassCount = isMobile ? 900 : 2500;
  const grass = new THREE.InstancedMesh(bladeGeo, bladeMat, grassCount);
  grass.name = 'Close_Lawn_Tufts';
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  let placed = 0;
  for (let attempt = 0; attempt < grassCount * 10 && placed < grassCount; attempt++) {
    const x = -24.8 + rnd() * 49.6;
    const z = 10.8 + rnd() * 18.4;
    if (Math.abs(x) < 2.45) continue;
    if (Math.hypot(x, z - 18.3) < 5.65) continue;
    if (Math.abs(Math.abs(x) - 20.6) < 1.5) continue;
    if (z > 17.2 && z < 19.4) continue;
    const s = .55 + rnd() * .95;
    dummy.position.set(x, .012, z);
    dummy.rotation.set(0, rnd() * TWO_PI, 0);
    dummy.scale.set(s, s * (.8 + rnd() * .45), s);
    dummy.updateMatrix();
    grass.setMatrixAt(placed, dummy.matrix);
    color.setHSL(.235 + rnd() * .045, .28 + rnd() * .12, .22 + rnd() * .10);
    grass.setColorAt(placed, color);
    placed++;
  }
  grass.count = placed;
  grass.instanceMatrix.needsUpdate = true;
  if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
  grass.castShadow = false;
  grass.receiveShadow = true;
  grass.frustumCulled = false;
  group.add(grass);

  const flowerGeo = new THREE.IcosahedronGeometry(.052, 0);
  const flowerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .78, metalness: 0 });
  const flowerCount = isMobile ? 180 : 380;
  const flowers = new THREE.InstancedMesh(flowerGeo, flowerMat, flowerCount);
  flowers.name = 'Close_Flower_Heads';
  const beds = [
    { x: -12.0, z: 15.55 }, { x: 12.0, z: 15.55 },
    { x: -12.0, z: 21.15 }, { x: 12.0, z: 21.15 },
  ];
  const tones = [0xd99da4, 0xecdfc9, 0x8176ad, 0x8ea6bb, 0xd09b43];
  let f = 0;
  for (let attempt = 0; attempt < flowerCount * 8 && f < flowerCount; attempt++) {
    const bed = beds[attempt % beds.length];
    const x = bed.x - 6.3 + rnd() * 12.6;
    const z = bed.z - 1.5 + rnd() * 3.0;
    const s = .65 + rnd() * .9;
    dummy.position.set(x, .18 + rnd() * .18, z);
    dummy.rotation.set(rnd() * .5, rnd() * TWO_PI, rnd() * .5);
    dummy.scale.set(s, s * .8, s);
    dummy.updateMatrix();
    flowers.setMatrixAt(f, dummy.matrix);
    color.setHex(tones[Math.floor(rnd() * tones.length)]);
    flowers.setColorAt(f, color);
    f++;
  }
  flowers.count = f;
  flowers.instanceMatrix.needsUpdate = true;
  if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true;
  flowers.castShadow = false;
  flowers.receiveShadow = true;
  flowers.frustumCulled = false;
  group.add(flowers);

  gardenDetail = { group, grass, flowers };
}

/* Soft ground mist, suspended pollen and cool water glints. These live only
   in the browser layer; the GLB itself stays a clean, portable asset. */
function makeMistTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 256, 128);
  const rnd = mulberry32(0x2f1a6c);
  for (let i = 0; i < 22; i++) {
    const x = 28 + rnd() * 200;
    const y = 46 + rnd() * 52;
    const r = 24 + rnd() * 52;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,248,236,${.06 + rnd() * .08})`);
    g.addColorStop(.55, `rgba(246,234,216,${.025 + rnd() * .04})`);
    g.addColorStop(1, 'rgba(246,234,216,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TWO_PI); ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,250,232,.95)');
  g.addColorStop(.28, 'rgba(255,229,188,.5)');
  g.addColorStop(1, 'rgba(255,229,188,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeAtmosphere() {
  if (atmosphereGroup) return;
  atmosphereGroup = new THREE.Group();
  atmosphereGroup.name = 'Atmospheric_Layer';
  scene.add(atmosphereGroup);

  const mistTex = makeMistTexture();
  const glowTex = makeGlowTexture();
  const rnd = mulberry32(0x7155a3);
  const banks = [
    [-19.5, 2.4, 7.0, 21, 7.2, .10, 0.0],
    [17.5, 2.1, 3.0, 18, 6.4, .09, 1.8],
    [0.0, 2.2, 28.0, 25, 8.0, .11, 3.1],
    [-12.5, 2.6, -8.5, 17, 6.0, .08, 4.4],
    [12.0, 2.4, -23.5, 19, 6.8, .10, 5.5],
  ];
  for (const [x, y, z, sx, sy, op, phase] of banks) {
    const mat = new THREE.SpriteMaterial({
      map: mistTex, color: DUSK_MIST.clone(), transparent: true, opacity: op,
      depthWrite: false, depthTest: true, blending: THREE.NormalBlending, fog: true,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(x, y, z);
    sprite.scale.set(sx, sy, 1);
    sprite.renderOrder = 1;
    atmosphereGroup.add(sprite);
    mistSprites.push({ sprite, mat, x, z, phase, baseOpacity: op * .28, dayOpacity: op * .28, nightOpacity: Math.min(.22, op * 1.6), baseY: y });
  }

  // Suspended pollen / dust in the low sun.
  const dustCount = 220;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = -30 + rnd() * 60;
    dustPos[i * 3 + 1] = 1.2 + rnd() * 11;
    dustPos[i * 3 + 2] = -29 + rnd() * 59;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    size: .058, map: glowTex, transparent: true, opacity: .24, depthWrite: false,
    color: 0xffdfaf, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: true,
  });
  dustPoints = new THREE.Points(dustGeo, dustMat);
  dustPoints.frustumCulled = false;
  dustPoints.renderOrder = 2;
  atmosphereGroup.add(dustPoints);

  // Cool glints on the fountain and mirror pool.
  const glintCount = 110;
  const glintPos = new Float32Array(glintCount * 3);
  for (let i = 0; i < glintCount; i++) {
    let x, z;
    if (i < 42) {
      const a = rnd() * TWO_PI, r = 1.2 + rnd() * 1.3;
      x = Math.cos(a) * r; z = 18.3 + Math.sin(a) * r;
    } else {
      x = -5.1 + rnd() * 10.2; z = -21.2 + rnd() * 5.4;
    }
    glintPos[i * 3] = x;
    glintPos[i * 3 + 1] = .31 + rnd() * .025;
    glintPos[i * 3 + 2] = z;
  }
  const glintGeo = new THREE.BufferGeometry();
  glintGeo.setAttribute('position', new THREE.BufferAttribute(glintPos, 3));
  sparklePoints = new THREE.Points(glintGeo, new THREE.PointsMaterial({
    size: .075, map: glowTex, transparent: true, opacity: .36, depthWrite: false,
    color: 0xffe7bd, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: true,
  }));
  sparklePoints.frustumCulled = false;
  sparklePoints.renderOrder = 2;
  atmosphereGroup.add(sparklePoints);
}

function updateAtmosphere(dt, t) {
  if (!atmosphereGroup) return;
  for (const m of mistSprites) {
    m.sprite.position.x = m.x + Math.sin(t * .022 + m.phase) * 1.9;
    m.sprite.position.z = m.z + Math.cos(t * .016 + m.phase) * 1.3;
    m.sprite.position.y = m.baseY + Math.sin(t * .055 + m.phase) * .08;
    m.mat.opacity = m.baseOpacity * (0.78 + 0.22 * Math.sin(t * .061 + m.phase * 1.7));
  }
  if (dustPoints) {
    dustPoints.rotation.y += dt * .0045;
    dustPoints.material.opacity = lerp(.07, .13, dayNightMix) * (.85 + .15 * Math.sin(t * .4));
  }
  if (sparklePoints) {
    sparklePoints.material.opacity = lerp(.34, .5, dayNightMix) * (.82 + .18 * Math.sin(t * 1.7));
  }
}

/* ------------------------------------------------------------------ */
/*  GLB load and scene assembly                                       */
/* ------------------------------------------------------------------ */

async function loadModel(buffer) {
  setProgress(42, '解析 GLB · 几何与 PBR 材质…');
  await pause(30);
  const loader = new GLTFLoader();
  const gltf = await new Promise((resolve, reject) => loader.parse(buffer, '', resolve, reject));
  setProgress(64, '构建空间与材质…');
  await nextFrame();
  modelRoot = gltf.scene;
  modelRoot.name = 'Maison_Lumiere_Villa';
  modelRoot.updateMatrixWorld(true);
  scene.add(modelRoot);
  setProgress(76, '整理二十个空间与花园…');
  await nextFrame();
  collectModelParts();
  makeRoomLights();
  makeExteriorLights();
  makeFountainMist();
  makeFountainFX();
  makeGardenDetail();
  makeAtmosphere();
  setProgress(88, '建立光线与渲染环境…');
  await nextFrame();
  initSelectionOutline();
  setProgress(94, '准备交互界面…');
  await nextFrame();
  buildDirectory();
  buildLabels();
  updateManifestUI();
  setPanel(state.panelOpen, true);
  // Set up the opening on its night-time start frame and hide all UI before the
  // first visible render. The cinematic timeline begins in boot().
  prepareOpeningScene();
  setProgress(100, '完成');
  await nextFrame();
  renderer.shadowMap.needsUpdate = true;
  if (usePostFX && composer) composer.render();
  else renderer.render(scene, camera);
  firstRenderDone = true;
  state.ready = true;
  window.__VIEWER_READY__ = true;
  document.body.classList.add('viewer-ready');
  // Keep the loader visible as the entry gate. boot() reveals "进入宅邸"
  // and starts the opening only after that user gesture.
}

/* ------------------------------------------------------------------ */
/*  Scene mode                                                        */
/* ------------------------------------------------------------------ */

function applyVisibility() {
  const active = state.activeFloor;
  floorGroups.forEach((g, i) => { if (g) g.visible = active === null || active === i; });
  if (roofGroup) roofGroup.visible = active === null;
  if (exteriorGroup) exteriorGroup.visible = active === null;
  if (landscapeGroup) landscapeGroup.visible = true;
  if (atmosphereGroup) atmosphereGroup.visible = active === null;
  if (fountainMist?.points) fountainMist.points.visible = active === null;
  if (stairGroup) stairGroup.visible = true;
  // A dollhouse floor shows only the arriving and departing stair flights.
  for (const s of stairFlights) {
    s.object.visible = active === null || s.to === active || s.to === active + 1;
  }
  archGroups.forEach((g, i) => {
    if (!g) return;
    g.visible = active === null ? true : !(state.cutaway && i === active);
  });
  cutGroups.forEach((g, i) => {
    if (!g) return;
    g.visible = active !== null && state.cutaway && i === active;
  });
  hiddenGroups.forEach(g => { g.visible = !(active !== null && state.cutaway); });
  renderer.shadowMap.needsUpdate = true;
}

function applyMode(options = {}) {
  applyVisibility();
  updateFloorUi();
  updateLabelVisibility();
  updateSelectedUi();
  updateNightLights();
  if (options.camera !== false) {
    if (state.roomId) focusRoom(roomById.get(state.roomId), options.animate !== false);
    else if (state.gardenId) focusGarden(gardenById.get(state.gardenId), options.animate !== false);
    else flyToOverview(options.animate !== false);
  }
}

function setFloor(floorIndex, options = {}) {
  state.activeFloor = floorIndex;
  state.roomId = null;
  state.gardenId = null;
  closeCard();
  hideSelectionOutline();
  if (options.closePanel && isMobile) setPanel(false);
  applyMode({ camera: true, animate: options.animate !== false });
}

/* ------------------------------------------------------------------ */
/*  Camera                                                            */
/* ------------------------------------------------------------------ */

function getOverviewPose(floor) {
  const mobileScale = isMobile ? 1.42 : 1.0;
  if (floor === null) {
    return {
      position: [40.5 * mobileScale, 20.5 * mobileScale, 46 * mobileScale],
      target: [0, 5.0, 1.2],
      fov: isMobile ? 39 : 33,
    };
  }
  const base = manifest.floors[floor].base;
  return {
    position: [24 * mobileScale, base + 18.5 * (isMobile ? 1.3 : 1), 28 * mobileScale],
    target: [0, base + .8, .8],
    fov: isMobile ? 38 : 34,
  };
}

function flyToPose(pose, duration = 1400) {
  if (!camera || !controls) return;
  if (reduceMotion) {
    camera.position.fromArray(pose.position);
    controls.target.fromArray(pose.target);
    camera.fov = pose.fov; camera.updateProjectionMatrix(); controls.update();
    return;
  }
  cameraTween = {
    start: performance.now(),
    duration,
    fromPos: camera.position.clone(),
    toPos: new THREE.Vector3().fromArray(pose.position),
    fromTarget: controls.target.clone(),
    toTarget: new THREE.Vector3().fromArray(pose.target),
    fromFov: camera.fov,
    toFov: pose.fov,
  };
}

function flyToOverview(animate = true, duration = 1450) {
  flyToPose(getOverviewPose(state.activeFloor), animate ? duration : 1);
}

function jumpToOverview() {
  flyToPose(getOverviewPose(state.activeFloor), 1);
}

function focusRoom(room, animate = true) {
  if (!room) return;
  const f = floorById.get(room.floor);
  const [x0, x1, z0, z1] = room.bounds;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const scale = isMobile ? 1.35 : 1;
  const dist = (Math.max(x1 - x0, z1 - z0) * 1.12 + 6.1) * scale;
  const dir = new THREE.Vector3(.72, .76, 1.02).normalize().multiplyScalar(dist);
  const target = new THREE.Vector3(cx, f.base + 1.15, cz);
  const pos = target.clone().add(dir);
  flyToPose({ position: [pos.x, pos.y, pos.z], target: [target.x, target.y, target.z], fov: isMobile ? 40 : 35 }, animate ? 1250 : 1);
}

function focusGarden(garden, animate = true) {
  if (!garden) return;
  const [x, y, z] = garden.pos;
  const scale = isMobile ? 1.3 : 1;
  flyToPose({
    position: [x + 11 * scale, 7.4 * scale, z + 14 * scale],
    target: [x, Math.max(.3, y * .38), z],
    fov: isMobile ? 42 : 38,
  }, animate ? 1250 : 1);
}

function easeInOutQuad(t) {
  t = clamp(t, 0, 1);
  return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function setOpeningCamera(pos, target, fov) {
  camera.position.copy(pos);
  controls.target.copy(target);
  camera.fov = fov;
  camera.updateProjectionMatrix();
  camera.lookAt(target);
}

function followSkyDome() {
  if (!skyDayMesh || !camera) return;
  skyNightMesh.position.copy(camera.position);
  skyDayMesh.position.copy(camera.position);
}

function prepareOpeningScene() {
  opening.active = true;
  opening.start = 0;
  state.activeFloor = null;
  state.roomId = null;
  state.gardenId = null;
  state.night = true;
  targetDayNightMix = 1;
  dayNightMix = 1;
  closeCard();
  hideSelectionOutline();
  if (cameraTween) cameraTween = null;
  if (controls) controls.enabled = false;
  scene.environment = nightEnv;
  applyMode({ camera: false });
  updateThemeUi();
  setCutawayUi();
  setAutoRotate(false);
  applyDayNightMix();
  renderer.shadowMap.needsUpdate = true;
  setOpeningCamera(OPENING_GATE_POS, OPENING_GATE_TARGET, OPENING_GATE_FOV);
  followSkyDome();
  updateCinematicUniforms();
  document.body.classList.add('cinematic-mode');
}

function beginOpeningCinematic() {
  opening.active = true;
  opening.start = performance.now();
  if (controls) controls.enabled = false;
  cameraTween = null;
  document.body.classList.add('cinematic-mode');
  closeHint();
  // The start of the opening also counts as a playback trigger; if the browser
  // still blocks it, the global gesture listeners remain armed silently.
  tryStartBackgroundMusic();
}

function updateOpeningPhase(phase, t) {
  // The whole timeline is eased globally in updateOpeningCinematic; the local
  // phase progress is linear so the camera never comes to a stop at a seam.
  const e = clamp(t, 0, 1);
  if (phase.kind === 'push') {
    _openingPos.lerpVectors(OPENING_GATE_POS, OPENING_WALK_POS, e);
    _openingTarget.lerpVectors(OPENING_GATE_TARGET, OPENING_WALK_TARGET, e);
    setOpeningCamera(_openingPos, _openingTarget, lerp(OPENING_GATE_FOV, OPENING_WALK_FOV, e));
  } else if (phase.kind === 'tilt') {
    _openingPos.copy(OPENING_WALK_POS);
    _openingTarget.lerpVectors(OPENING_WALK_TARGET, OPENING_TILT_TARGET, e);
    setOpeningCamera(_openingPos, _openingTarget, lerp(OPENING_WALK_FOV, OPENING_TILT_FOV, e));
  } else if (phase.kind === 'pullback') {
    _openingPos.lerpVectors(OPENING_WALK_POS, OPENING_ORBIT_POS, e);
    _openingTarget.lerpVectors(OPENING_TILT_TARGET, OPENING_ORBIT_TARGET, e);
    setOpeningCamera(_openingPos, _openingTarget, lerp(OPENING_TILT_FOV, OPENING_ORBIT_FOV, e));
  } else if (phase.kind === 'orbit') {
    const az = TWO_PI * e;
    _openingPos.set(
      Math.sin(az) * OPENING_ORBIT_POS.z,
      OPENING_ORBIT_POS.y,
      Math.cos(az) * OPENING_ORBIT_POS.z,
    );
    _openingTarget.copy(OPENING_ORBIT_TARGET);
    setOpeningCamera(_openingPos, _openingTarget, OPENING_ORBIT_FOV);
  } else if (phase.kind === 'aerial') {
    _openingPos.lerpVectors(OPENING_ORBIT_POS, OPENING_AERIAL_POS, e);
    _openingTarget.lerpVectors(OPENING_ORBIT_TARGET, OPENING_AERIAL_TARGET, e);
    setOpeningCamera(_openingPos, _openingTarget, lerp(OPENING_ORBIT_FOV, OPENING_AERIAL_FOV, e));
  } else if (phase.kind === 'reset') {
    const pose = getOverviewPose(null);
    _openingAux.fromArray(pose.position);
    _openingPos.lerpVectors(OPENING_AERIAL_POS, _openingAux, e);
    _openingAux.fromArray(pose.target);
    _openingTarget.lerpVectors(OPENING_AERIAL_TARGET, _openingAux, e);
    setOpeningCamera(_openingPos, _openingTarget, lerp(OPENING_AERIAL_FOV, pose.fov, e));
  }
}

function updateOpeningCinematic(now) {
  const elapsed = (now - opening.start) / 1000;
  if (elapsed >= OPENING_TOTAL) {
    finishOpeningCinematic();
    return;
  }
  // One continuous ease-in-out for the entire film. Phase-local progress is
  // linear, so there is no full stop or held frame between the gate, tilt,
  // orbit and aerial moves; position and target still share the same timeline.
  const timeline = easeInOutQuad(elapsed / OPENING_TOTAL) * OPENING_TOTAL;
  let cursor = 0;
  for (const phase of OPENING_PHASES) {
    if (timeline < cursor + phase.duration) {
      updateOpeningPhase(phase, (timeline - cursor) / phase.duration);
      followSkyDome();
      return;
    }
    cursor += phase.duration;
  }
  finishOpeningCinematic();
}

function finishOpeningCinematic() {
  if (!opening.active) return;
  opening.active = false;
  opening.start = 0;
  state.night = true;
  dayNightMix = 1;
  targetDayNightMix = 1;
  scene.environment = nightEnv;
  applyDayNightMix();
  updateNightLights();
  updateThemeUi();
  const pose = getOverviewPose(null);
  camera.position.fromArray(pose.position);
  controls.target.fromArray(pose.target);
  camera.fov = pose.fov;
  camera.updateProjectionMatrix();
  controls.enabled = true;
  controls.update();
  followSkyDome();
  renderer.shadowMap.needsUpdate = true;
  document.body.classList.remove('cinematic-mode');
  document.body.classList.add('ui-return');
  if (D.toast) D.toast.classList.remove('is-visible');
  clearTimeout(toastTimer);
  const revealHint = document.querySelector('.controls-hint');
  if (revealHint) revealHint.classList.remove('is-faded');
  // Re-arm the first-use hint dismissal for the interface phase.
  document.addEventListener('pointerdown', closeHint, { once: true });
  window.setTimeout(() => document.body.classList.remove('ui-return'), 900);
  introComplete = true;
  handleHash();
}

function animateCameraTween(now) {
  if (!cameraTween) return false;
  const t = clamp((now - cameraTween.start) / cameraTween.duration, 0, 1);
  const ease = 1 - Math.pow(1 - t, 3);
  camera.position.lerpVectors(cameraTween.fromPos, cameraTween.toPos, ease);
  controls.target.lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, ease);
  camera.fov = lerp(cameraTween.fromFov, cameraTween.toFov, ease);
  camera.updateProjectionMatrix();
  camera.lookAt(controls.target);
  if (t >= 1) {
    cameraTween = null;
    controls.update();
    introComplete = true;
    return false;
  }
  return true;
}

/* ------------------------------------------------------------------ */
/*  UI: directory, labels, card                                       */
/* ------------------------------------------------------------------ */

function buildDirectory() {
  D.roomList.innerHTML = '';
  for (const f of manifest.floors) {
    const block = document.createElement('div');
    block.className = 'floor-block';
    block.dataset.floor = String(f.index);
    const head = document.createElement('div');
    head.className = 'floor-block-head';
    const rooms = manifest.rooms.filter(r => r.floor === f.index);
    head.innerHTML = `<span>${escapeHtml(f.name)}</span><span class="latin">${escapeHtml(f.nameFr)}</span><span style="margin-left:auto;color:var(--faint);font-family:var(--sans);font-size:7px;letter-spacing:.1em">${pad2(rooms.length)} SPACES</span>`;
    block.appendChild(head);
    let n = 0;
    for (const room of rooms) {
      n++;
      const btn = document.createElement('button');
      btn.className = 'room-item';
      btn.dataset.roomId = room.id;
      btn.setAttribute('aria-label', `查看${room.name}，${areaText(room.area)}`);
      btn.innerHTML = `<span class="room-num">${pad2(n)}</span>
        <span class="room-names"><b>${escapeHtml(room.name)}</b><small>${escapeHtml(room.nameFr)}</small></span>
        <span class="room-area">${room.area.toFixed(0)} m²</span>`;
      btn.addEventListener('click', () => openRoom(room.id));
      block.appendChild(btn);
    }
    D.roomList.appendChild(block);
  }
  updateFloorUi();
}

function setDirectoryFilter() {
  for (const block of D.roomList.querySelectorAll('.floor-block')) {
    block.style.display = state.activeFloor === null || Number(block.dataset.floor) === state.activeFloor ? '' : 'none';
  }
  D.directoryLevel.textContent = state.activeFloor === null
    ? '全部楼层'
    : `${manifest.floors[state.activeFloor].name} · ${manifest.floors[state.activeFloor].nameFr}`;
}

function updateFloorUi() {
  for (const btn of D.floorButtons) {
    const v = btn.dataset.floor;
    const active = v === 'all' ? state.activeFloor === null : Number(v) === state.activeFloor;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-current', active ? 'page' : 'false');
  }
  D.dockFloor.textContent = state.activeFloor === null ? '全貌' : manifest.floors[state.activeFloor].name;
  setDirectoryFilter();
  setCutawayUi();
  document.querySelectorAll('.room-item').forEach(el => {
    el.classList.toggle('is-selected', el.dataset.roomId === state.roomId);
  });
}

function setCutawayUi() {
  if (!D.cutaway) return;
  const visible = state.activeFloor !== null;
  D.cutaway.style.display = visible ? '' : 'none';
  D.cutaway.setAttribute('aria-pressed', state.cutaway ? 'true' : 'false');
}

function buildLabels() {
  D.labelLayer.innerHTML = '';
  labelRecords = [];
  for (const room of manifest.rooms) {
    const el = document.createElement('button');
    el.className = 'map-label';
    el.type = 'button';
    el.dataset.roomId = room.id;
    el.setAttribute('aria-label', `${room.name}，${room.nameFr}，${areaText(room.area)}`);
    el.innerHTML = `<span class="anchor" aria-hidden="true"></span>
      <span class="label-body"><span class="label-index">${pad2(roomOrder.get(room.id))}</span><em>${escapeHtml(room.name)}</em><small>${escapeHtml(room.nameFr)}</small></span>`;
    el.addEventListener('click', e => { e.stopPropagation(); openRoom(room.id); });
    D.labelLayer.appendChild(el);
    roomLabelEls.set(room.id, el);
    labelRecords.push({ el, pos: new THREE.Vector3(...room.label3), type: 'room', id: room.id, floor: room.floor });
  }
  for (const garden of manifest.gardenLabels) {
    const el = document.createElement('button');
    el.className = 'map-label is-garden';
    el.type = 'button';
    el.dataset.gardenId = garden.id;
    el.setAttribute('aria-label', `${garden.name}，${garden.nameFr}`);
    el.innerHTML = `<span class="anchor" aria-hidden="true"></span>
      <span class="label-body"><span class="label-index">G</span><em>${escapeHtml(garden.name)}</em><small>${escapeHtml(garden.nameFr)}</small></span>`;
    el.addEventListener('click', e => { e.stopPropagation(); openGarden(garden.id); });
    D.labelLayer.appendChild(el);
    gardenLabelEls.set(garden.id, el);
    labelRecords.push({ el, pos: new THREE.Vector3(...garden.pos), type: 'garden', id: garden.id });
  }
  updateLabelVisibility();
}

function updateLabelVisibility() {
  if (!state.labels) {
    for (const rec of labelRecords) rec.el.classList.remove('is-visible');
    return;
  }
  for (const rec of labelRecords) {
    const matches = state.activeFloor === null
      ? rec.type === 'garden'
      : rec.type === 'room' && rec.floor === state.activeFloor;
    if (!matches) {
      rec.el.classList.remove('is-visible');
      continue;
    }
    rec.el.classList.toggle('is-dim', Boolean((state.roomId && rec.type === 'room' && rec.id !== state.roomId) || (state.gardenId && rec.type === 'garden' && rec.id !== state.gardenId)));
  }
}

function updateLabels() {
  if (!state.labels || !state.ready) return;
  const w = window.innerWidth, h = window.innerHeight;
  const tmp = new THREE.Vector3();
  for (const rec of labelRecords) {
    const el = rec.el;
    const expectedVisible = state.activeFloor === null ? rec.type === 'garden' : (rec.type === 'room' && rec.floor === state.activeFloor);
    if (!expectedVisible) { el.classList.remove('is-visible'); continue; }
    tmp.copy(rec.pos).project(camera);
    const behind = tmp.z < -1 || tmp.z > 1;
    if (behind) { el.classList.remove('is-visible'); continue; }
    const x = (tmp.x * .5 + .5) * w;
    const y = (-tmp.y * .5 + .5) * h;
    if (x < -80 || x > w + 80 || y < -60 || y > h + 60) { el.classList.remove('is-visible'); continue; }
    el.style.left = `${x.toFixed(1)}px`;
    el.style.top = `${y.toFixed(1)}px`;
    el.classList.add('is-visible');
    el.classList.toggle('is-selected',
      (rec.type === 'room' && rec.id === state.roomId) || (rec.type === 'garden' && rec.id === state.gardenId));
  }
}

function updateSelectedUi() {
  for (const [id, el] of roomLabelEls) {
    el.classList.toggle('is-selected', id === state.roomId);
    el.classList.toggle('is-dim', Boolean(state.roomId && id !== state.roomId));
  }
  for (const [id, el] of gardenLabelEls) {
    el.classList.toggle('is-selected', id === state.gardenId);
    el.classList.toggle('is-dim', Boolean(state.gardenId && id !== state.gardenId));
  }
  document.querySelectorAll('.room-item').forEach(el => el.classList.toggle('is-selected', el.dataset.roomId === state.roomId));
  if (!state.roomId && !state.gardenId) {
    if (!D.card.classList.contains('is-open')) return;
    closeCard();
    hideSelectionOutline();
  }
}

const ROOM_USE = new Map();

function showRoomCard(room, focus) {
  if (!room) return;
  const f = floorById.get(room.floor);
  $('card-index').textContent = `SPACE ${pad2(roomOrder.get(room.id))} · ${f.name}`;
  $('card-title').textContent = room.name;
  $('card-fr').textContent = room.nameFr;
  $('card-area').textContent = areaText(room.area);
  $('card-use').textContent = room.areaLabel || '法式空间';
  $('card-floor').textContent = f.name;
  $('card-description').textContent = room.description;
  const feats = $('card-features');
  feats.innerHTML = '';
  for (const x of room.features || []) {
    const s = document.createElement('span'); s.textContent = x; feats.appendChild(s);
  }
  const pal = $('card-palette');
  pal.innerHTML = '';
  for (const p of room.palette || []) {
    const s = document.createElement('span');
    s.innerHTML = `<i style="--c:${paletteColor(p)}"></i>${escapeHtml(p)}`;
    pal.appendChild(s);
  }
  const [x0, x1, z0, z1] = room.bounds;
  $('card-coords').textContent = `X ${((x0 + x1) / 2).toFixed(1)} · Z ${((z0 + z1) / 2).toFixed(1)} · 标高 +${f.base.toFixed(2)} M`;
  D.card.classList.add('is-open');
  D.card.scrollTop = 0;
  $('card-reset').textContent = '回到本层视角';
  showSelection(room);
}

function showGardenCard(garden, focus) {
  if (!garden) return;
  const meta = gardenMeta(garden.id);
  $('card-index').textContent = `GARDEN · 景观节点`;
  $('card-title').textContent = garden.name;
  $('card-fr').textContent = garden.nameFr;
  $('card-area').textContent = meta.area;
  $('card-use').textContent = '花园景观';
  $('card-floor').textContent = '庭院';
  $('card-description').textContent = garden.desc;
  const feats = $('card-features');
  feats.innerHTML = '';
  for (const x of meta.features) {
    const s = document.createElement('span'); s.textContent = x; feats.appendChild(s);
  }
  const pal = $('card-palette');
  pal.innerHTML = '';
  for (const p of meta.palette) {
    const s = document.createElement('span');
    s.innerHTML = `<i style="--c:${paletteColor(p)}"></i>${escapeHtml(p)}`;
    pal.appendChild(s);
  }
  $('card-coords').textContent = `X ${garden.pos[0].toFixed(1)} · Z ${garden.pos[2].toFixed(1)} · 法式园林`;
  $('card-reset').textContent = '回到庄园全貌';
  D.card.classList.add('is-open');
  D.card.scrollTop = 0;
  showSelection(garden);
}

function gardenMeta(id) {
  const map = {
    'garden-fountain': { area: '水景 · 轴线', features: ['蓝玻璃马赛克池底', '四向水柱', '花岗岩圆形广场'], palette: ['浅灰花岗岩', '蓝马赛克', '白色石膏', '黄铜'] },
    'garden-parterre': { area: '4 组花坛', features: ['黄杨矮篱', '薰衣草', '玫瑰与花卉', '对称园艺'], palette: ['黄杨', '薰衣草紫', '玫瑰灰', '浅灰花岗岩'] },
    'garden-allee': { area: '林荫道', features: ['柱状椴树列植', '花岗岩步道', '铁艺大门', '石界桩'], palette: ['浅灰花岗岩', '黄杨', '石灰石', '深古铜'] },
    'garden-pool': { area: '镜面水池', features: ['蓝马赛克池底', '两端喷泉', '日光躺椅', '石质池沿'], palette: ['蓝马赛克', '白色大理石', '柚木', '亚麻白'] },
    'garden-pergola': { area: '户外餐叙', features: ['藤本月季', '防腐木长桌', '白色布艺', '黄铜园灯'], palette: ['橡木', '亚麻白', '黄杨', '黄铜'] },
  };
  return map[id] || { area: '法式园林', features: ['轴线景观', '园艺造景', '石材铺地'], palette: ['黄杨', '浅灰花岗岩', '蓝马赛克', '白色石膏'] };
}

function closeCard() {
  D.card.classList.remove('is-open');
}

function openRoom(id, options = {}) {
  const room = roomById.get(id);
  if (!room) return;
  if (state.activeFloor !== room.floor) {
    state.activeFloor = room.floor;
    state.roomId = null;
    state.gardenId = null;
    applyVisibility();
    updateFloorUi();
  }
  state.roomId = id;
  state.gardenId = null;
  state.cutaway = true;
  applyVisibility();
  showRoomCard(room, true);
  updateSelectedUi();
  updateFloorUi();
  updateNightLights();
  updateLabelVisibility();
  focusRoom(room, options.animate !== false);
  D.card.classList.add('is-open');
  if (isMobile) setPanel(false);
  const row = document.querySelector(`.room-item[data-room-id="${id}"]`);
  if (row && state.panelOpen) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  safeReplaceHash('#' + id);
}

function openGarden(id) {
  const g = gardenById.get(id);
  if (!g) return;
  state.activeFloor = null;
  state.roomId = null;
  state.gardenId = id;
  applyVisibility();
  updateFloorUi();
  updateLabelVisibility();
  updateSelectedUi();
  updateNightLights();
  showGardenCard(g, true);
  focusGarden(g, true);
  if (isMobile) setPanel(false);
  safeReplaceHash('#' + id);
}

function safeReplaceHash(hash) {
  try {
    if (location.hash !== hash) history.replaceState(null, '', hash);
  } catch (e) { /* file:// origins may reject history state changes */ }
}

function closeSelection() {
  state.roomId = null;
  state.gardenId = null;
  hideSelectionOutline();
  closeCard();
  updateSelectedUi();
  updateLabelVisibility();
  if (state.activeFloor === null) {
    // stay at the current overview
  }
  updateFloorUi();
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* no-op */ }
}

function updateNightLights() {
  const nightOn = state.night;
  for (const { light, floor, nightIntensity } of roomLights.values()) {
    const active = nightOn && state.activeFloor !== null && floor === state.activeFloor;
    light.visible = active;
    light.intensity = active ? nightIntensity * dayNightMix : 0;
  }
  for (const item of exteriorLights) { item.light.visible = nightOn; item.light.intensity = nightOn ? item.nightIntensity * dayNightMix : 0; }
  for (const item of waterLights) { item.light.visible = nightOn; item.light.intensity = nightOn ? item.nightIntensity * dayNightMix : 0; }
  for (const item of facadeLights) { item.light.visible = nightOn && state.activeFloor === null; item.light.intensity = item.light.visible ? item.nightIntensity * dayNightMix : 0; }
}

/* ------------------------------------------------------------------ */
/*  Selection overlays                                                */
/* ------------------------------------------------------------------ */

function initSelectionOutline() {
  selectionGroup = new THREE.Group();
  selectionGroup.name = 'Selection_Outline';
  selectionGroup.visible = false;
  selectionGroup.renderOrder = 20;
  scene.add(selectionGroup);
  selectionFill = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ color: 0xc59c5b, transparent: true, opacity: .075, depthWrite: false, side: THREE.DoubleSide, depthTest: false }),
  );
  selectionFill.rotation.x = -Math.PI / 2;
  selectionFill.renderOrder = 21;
  selectionLine = new THREE.Line(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: 0xcda76a, transparent: true, opacity: .9, depthTest: false }),
  );
  selectionLine.renderOrder = 22;
  selectionGroup.add(selectionFill, selectionLine);
}

function showSelection(obj) {
  if (!selectionGroup) return;
  selectionGroup.visible = true;
  if (obj.bounds) {
    const [x0, x1, z0, z1] = obj.bounds;
    const f = floorById.get(obj.floor);
    const y = f.base + .055;
    const w = x1 - x0 - .22, d = z1 - z0 - .22;
    selectionFill.geometry.dispose();
    selectionFill.geometry = new THREE.PlaneGeometry(w, d);
    selectionFill.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
    const pts = [
      new THREE.Vector3(x0 + .11, y + .008, z0 + .11),
      new THREE.Vector3(x1 - .11, y + .008, z0 + .11),
      new THREE.Vector3(x1 - .11, y + .008, z1 - .11),
      new THREE.Vector3(x0 + .11, y + .008, z1 - .11),
      new THREE.Vector3(x0 + .11, y + .008, z0 + .11),
    ];
    selectionLine.geometry.dispose();
    selectionLine.geometry = new THREE.BufferGeometry().setFromPoints(pts);
    selectionKind = 'room';
  } else if (obj.pos) {
    const [x, y0, z] = obj.pos;
    const y = .075;
    selectionFill.geometry.dispose();
    selectionFill.geometry = new THREE.CircleGeometry(2.4, 64);
    selectionFill.position.set(x, y, z);
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const a = i / 64 * TWO_PI;
      pts.push(new THREE.Vector3(x + Math.cos(a) * 2.45, y + .008, z + Math.sin(a) * 2.45));
    }
    selectionLine.geometry.dispose();
    selectionLine.geometry = new THREE.BufferGeometry().setFromPoints(pts);
    selectionKind = 'garden';
  }
}

function hideSelectionOutline() {
  if (selectionGroup) selectionGroup.visible = false;
  selectionKind = null;
}

/* ------------------------------------------------------------------ */
/*  Day / night                                                       */
/* ------------------------------------------------------------------ */

function updateThemeUi() {
  document.body.classList.toggle('night', state.night);
  if (D.themeLabel) D.themeLabel.textContent = state.night ? '夜间' : '日间';
  if (D.themeSub) D.themeSub.textContent = state.night ? 'BLUE HOUR' : 'CLEAR AFTERNOON';
  if (D.night) {
    D.night.setAttribute('aria-pressed', state.night ? 'true' : 'false');
    D.night.title = state.night ? '切换日间光照 (N)' : '切换夜间光照 (N)';
  }
}

function setNight(night, immediate = false) {
  state.night = Boolean(night);
  targetDayNightMix = state.night ? 1 : 0;
  updateThemeUi();
  scene.environment = state.night ? nightEnv : dayEnv;
  if (immediate) {
    dayNightMix = targetDayNightMix;
    applyDayNightMix();
  }
  updateNightLights();
  renderer.shadowMap.needsUpdate = true;
  showToast(state.night ? '蓝调夜色与室内暖光已开启' : '晴朗午后自然光已恢复');
}

function applyDayNightMix() {
  const m = dayNightMix;
  if (sun) sun.intensity = lerp(3.55, 0.015, m);
  if (moon) {
    moon.intensity = lerp(0, .86, m);
    const moonShadow = !isMobile && m > .5;
    if (moon.castShadow !== moonShadow) {
      moon.castShadow = moonShadow;
      if (renderer) renderer.shadowMap.needsUpdate = true;
    }
  }
  if (hemi) {
    hemi.intensity = lerp(.95, .27, m);
    hemi.color.lerpColors(new THREE.Color(0xdcecf8), new THREE.Color(0x304c6a), m);
    hemi.groundColor.lerpColors(new THREE.Color(0x6d6451), new THREE.Color(0x1b2428), m);
  }
  if (fill) fill.intensity = lerp(.40, .12, m);
  if (ambient) ambient.intensity = lerp(.09, .06, m);
  if (scene) {
    scene.environmentIntensity = lerp(.84, .40, m);
    if (scene.fog) {
      scene.fog.color.lerpColors(dayFog.color, nightFog.color, m);
      scene.fog.density = lerp(dayFog.density, nightFog.density, m);
    }
  }
  if (renderer) renderer.toneMappingExposure = lerp(1.03, 1.20, m);
  if (skyDayMesh) skyDayMesh.material.opacity = 1 - m;
  if (sun) {
    const sunShadow = m < .4;
    if (sun.castShadow !== sunShadow) {
      sun.castShadow = sunShadow;
      if (renderer) renderer.shadowMap.needsUpdate = true;
    }
  }
  for (const item of exteriorLights) item.light.intensity = state.night ? item.nightIntensity * m : 0;
  for (const item of waterLights) item.light.intensity = state.night ? item.nightIntensity * m : 0;
  for (const item of facadeLights) item.light.intensity = state.night && state.activeFloor === null ? item.nightIntensity * m : 0;
  for (const item of roomLights.values()) {
    const on = state.night && state.activeFloor !== null && item.floor === state.activeFloor;
    item.light.intensity = on ? item.nightIntensity * m : 0;
  }
  if (bloomPass) {
    bloomPass.strength = lerp(.08, .36, m);
    bloomPass.radius = lerp(.50, .66, m);
    bloomPass.threshold = lerp(1.02, .92, m);
  }
  for (const mist of mistSprites) {
    mist.mat.color.copy(DUSK_MIST).lerp(NIGHT_MIST, m);
    mist.baseOpacity = lerp(mist.dayOpacity, mist.nightOpacity, m);
  }
  for (const e of materialEntries) {
    e.mat.emissiveIntensity = lerp(e.dayIntensity, e.nightIntensity, m);
    if (e.nightColor && e.mat.emissive) {
      e.mat.emissive.copy(e.dayColor).lerp(e.nightColor, m);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  UI wiring                                                         */
/* ------------------------------------------------------------------ */

function setPanel(open, immediate = false) {
  state.panelOpen = Boolean(open);
  document.body.classList.toggle('panel-collapsed', !state.panelOpen);
  if (D.panel) D.panel.setAttribute('aria-pressed', state.panelOpen ? 'true' : 'false');
  if (!state.panelOpen && isMobile) closeHint();
}

function setAutoRotate(on) {
  state.autoRotate = Boolean(on);
  if (controls) controls.autoRotate = state.autoRotate;
  if (D.rotate) {
    D.rotate.classList.toggle('is-on', state.autoRotate);
    D.rotate.setAttribute('aria-pressed', state.autoRotate ? 'true' : 'false');
  }
}

function setPhotoMode(on) {
  state.photo = Boolean(on);
  document.body.classList.toggle('photo-mode', state.photo);
  if (D.photo) {
    D.photo.classList.toggle('is-on', state.photo);
    D.photo.setAttribute('aria-pressed', state.photo ? 'true' : 'false');
  }
  if (state.photo) {
    closeHint();
    if (D.toast) D.toast.classList.remove('is-visible');
  }
}

function resetView() {
  if (state.roomId || state.gardenId) {
    closeSelection();
    if (state.activeFloor !== null) flyToOverview(true);
    else flyToOverview(true);
  } else {
    flyToOverview(true);
  }
  setAutoRotate(false);
}

function updateManifestUI() {
  if (D.validation) {
    const v = manifest.validation?.summary;
    if (v) D.validation.textContent = `几何校验通过 · ${v.autoFixes} 处自动修正`;
  }
  const titleEl = document.querySelector('.panel-intro');
  if (titleEl) {
    titleEl.textContent = '对称石构立面之下，二十个法式空间围绕花园轴线展开。点击空间名称或模型标注，可进入房间并阅读空间说明。';
  }
}

function toast(message) {
  if (!D.toast) return;
  D.toast.textContent = message;
  D.toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => D.toast.classList.remove('is-visible'), 2400);
}
const showToast = toast;

function closeHint() {
  // Ignore clicks that happen during the opening film; the hint must return
  // with the rest of the UI at the final reveal.
  if (opening.active) return;
  const hint = document.querySelector('.controls-hint');
  if (hint) hint.classList.add('is-faded');
}

function downloadGLB() {
  if (!glbBuffer) { showToast('模型尚未载入完成'); return; }
  const blob = new Blob([glbBuffer], { type: 'model/gltf-binary' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'maison-lumiere-villa.glb';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 10000);
  showToast('GLB 模型已开始下载');
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    (document.documentElement.requestFullscreen?.() || Promise.reject(new Error('unsupported')))
      .then(() => {
        D.fullscreen?.setAttribute('aria-pressed', 'true');
        showToast('进入全屏');
      })
      .catch(() => showToast('当前浏览器不支持全屏'));
  } else {
    document.exitFullscreen?.().then(() => D.fullscreen?.setAttribute('aria-pressed', 'false'));
  }
}

/* ------------------------------------------------------------------ */
/*  Background music (embedded, invisible)                            */
/*  Beethoven: Piano Sonata No. 14 "Moonlight", Op. 27 No. 2, I.       */
/*  Noble Music Project performance. The MP3 is base64-embedded in     */
/*  #music-data and decoded to a Blob; no external audio URL is used.  */
/* ------------------------------------------------------------------ */

const MUSIC_VOLUME = .3;

function decodeEmbeddedMusic() {
  const chunks = [...document.querySelectorAll('#music-data script.music-chunk')];
  if (!chunks.length) return null;
  let encoded = chunks.map(el => el.textContent.trim()).join('');
  try {
    const bin = atob(encoded);
    encoded = null;
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: 'audio/mpeg' });
  } catch (err) {
    console.warn('Embedded background music could not be decoded.', err);
    return null;
  }
}

function removeMusicFallback() {
  if (!musicFallbackHandler) return;
  for (const evt of ['pointerdown', 'pointerup', 'keydown', 'wheel', 'touchstart', 'touchend']) {
    window.removeEventListener(evt, musicFallbackHandler, true);
  }
  musicFallbackHandler = null;
}

function tryStartBackgroundMusic() {
  const audio = backgroundMusic;
  if (!audio || musicPlaying || musicPlayPending) return;
  musicPlayPending = true;
  try {
    const playResult = audio.play();
    if (playResult && typeof playResult.then === 'function') {
      playResult.then(() => {
        musicPlaying = true;
        musicPlayPending = false;
        removeMusicFallback();
      }).catch(() => {
        // Autoplay is blocked (or media is not ready yet). The one-time gesture
        // listeners stay armed and will retry silently on the next interaction.
        musicPlayPending = false;
      });
    } else {
      musicPlaying = true;
      musicPlayPending = false;
      removeMusicFallback();
    }
  } catch (err) {
    musicPlayPending = false;
  }
}

function installMusicFallback() {
  if (musicFallbackHandler || musicPlaying) return;
  musicFallbackHandler = () => {
    if (musicPlaying) {
      removeMusicFallback();
      return;
    }
    // A gesture can arrive while the initial autoplay promise is still pending;
    // retry explicitly instead of being swallowed by the pending guard.
    musicPlayPending = false;
    tryStartBackgroundMusic();
  };
  for (const evt of ['pointerdown', 'pointerup', 'keydown', 'wheel', 'touchstart', 'touchend']) {
    window.addEventListener(evt, musicFallbackHandler, {
      capture: true,
      passive: evt !== 'keydown',
    });
  }
}

function initBackgroundMusic() {
  const audio = D.audio;
  if (!audio) return;
  audio.loop = true;
  audio.volume = MUSIC_VOLUME;
  audio.preload = 'auto';
  const blob = decodeEmbeddedMusic();
  if (!blob) {
    // Optional split-preview fallback; the canonical single-file build always
    // carries embedded chunks, so this path is not used there.
    audio.src = new URL('background-music.mp3', location.href).href;
    backgroundMusic = audio;
    return;
  }
  audio.src = URL.createObjectURL(blob);
  backgroundMusic = audio;
}

function startBackgroundMusicFromEntry() {
  // The entry click is a real user gesture. Start playback inside that same
  // gesture so the score is audible from the opening's first camera frame.
  installMusicFallback();
  tryStartBackgroundMusic();
}

function bindUI() {
  D.floorButtons.forEach(btn => btn.addEventListener('click', () => {
    const v = btn.dataset.floor;
    if (v === 'all') setFloor(null, { animate: true, closePanel: isMobile });
    else setFloor(Number(v), { animate: true, closePanel: isMobile });
  }));
  D.labels?.addEventListener('click', () => {
    state.labels = !state.labels;
    D.labels.classList.toggle('is-on', state.labels);
    D.labels.setAttribute('aria-pressed', state.labels ? 'true' : 'false');
    updateLabelVisibility();
    updateLabels();
    showToast(state.labels ? '空间标注已显示' : '空间标注已隐藏');
  });
  D.rotate?.addEventListener('click', () => {
    setAutoRotate(!state.autoRotate);
    showToast(state.autoRotate ? '自动环绕已开启' : '自动环绕已关闭');
  });
  D.night?.addEventListener('click', () => setNight(!state.night));
  D.reset?.addEventListener('click', resetView);
  D.download?.addEventListener('click', downloadGLB);
  D.fullscreen?.addEventListener('click', toggleFullscreen);
  D.photo?.addEventListener('click', () => setPhotoMode(!state.photo));
  D.panel?.addEventListener('click', () => setPanel(!state.panelOpen));
  D.panelClose?.addEventListener('click', () => setPanel(false));
  D.cutaway?.addEventListener('click', () => {
    state.cutaway = !state.cutaway;
    D.cutaway.setAttribute('aria-pressed', state.cutaway ? 'true' : 'false');
    applyVisibility();
    updateLabelVisibility();
    renderer.shadowMap.needsUpdate = true;
    showToast(state.cutaway ? '墙体剖切已开启' : '完整墙体显示');
  });
  D.cardClose?.addEventListener('click', closeSelection);
  D.cardReset?.addEventListener('click', () => {
    closeSelection();
    flyToOverview(true);
  });
  document.getElementById('brand')?.addEventListener('click', e => {
    e.preventDefault();
    state.activeFloor = null;
    state.roomId = null;
    state.gardenId = null;
    closeCard();
    hideSelectionOutline();
    applyMode({ camera: true, animate: true });
  });
  window.addEventListener('keydown', e => {
    if (opening.active) return;
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    if (e.key === '0') { e.preventDefault(); setFloor(null, { animate: true }); }
    else if (e.key === '1') { e.preventDefault(); setFloor(0, { animate: true }); }
    else if (e.key === '2') { e.preventDefault(); setFloor(1, { animate: true }); }
    else if (e.key === '3') { e.preventDefault(); setFloor(2, { animate: true }); }
    else if (e.key.toLowerCase() === 'n') { e.preventDefault(); setNight(!state.night); }
    else if (e.key.toLowerCase() === 'l') { D.labels?.click(); }
    else if (e.key.toLowerCase() === 'c' && state.activeFloor !== null) { D.cutaway?.click(); }
    else if (e.key.toLowerCase() === 'r') { e.preventDefault(); resetView(); }
    else if (e.key.toLowerCase() === 'h') { e.preventDefault(); setPhotoMode(!state.photo); }
    else if (e.key === 'Escape') {
      if (state.photo) setPhotoMode(false);
      else if (state.roomId || state.gardenId) closeSelection();
      else if (state.panelOpen && isMobile) setPanel(false);
    }
  });
  window.addEventListener('hashchange', () => handleHash());
  document.addEventListener('pointerdown', closeHint, { once: true });
}

function onResize() {
  if (!renderer || !camera) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.45 : 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (composer) {
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(window.innerWidth, window.innerHeight);
  }
  renderer.shadowMap.needsUpdate = true;
  if (gradePass) gradePass.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
  if (fxaaPass) {
    const pixelRatio = renderer.getPixelRatio();
    fxaaPass.material.uniforms.resolution.value.set(1 / (window.innerWidth * pixelRatio), 1 / (window.innerHeight * pixelRatio));
  }
}

function handleHash() {
  if (opening.active) return;
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id || !state.ready) return;
  if (roomById.has(id)) openRoom(id);
  else if (gardenById.has(id)) openGarden(id);
}

/* ------------------------------------------------------------------ */
/*  Render loop                                                       */
/* ------------------------------------------------------------------ */

const _sunProject = new THREE.Vector3();
const _sunDirection = new THREE.Vector3();
const _cameraForward = new THREE.Vector3();

function updateCinematicUniforms() {
  if (!gradePass) return;
  camera.updateMatrixWorld();
  const u = gradePass.uniforms;
  u.uHalo.value = (1 - dayNightMix) * .92;
  // Clear-afternoon grade for daytime, preserving the previous blue-hour look.
  u.uWarmth.value = lerp(.80, .24, dayNightMix);
  u.uSaturation.value = lerp(1.075, 1.08, dayNightMix);
  u.uVignette.value = lerp(.10, .135, dayNightMix);
  if (!sun || dayNightMix > .55) {
    u.uSunScreen.value.set(-2, -2);
    return;
  }
  _sunDirection.copy(sun.position).normalize().multiplyScalar(260);
  _sunProject.copy(_sunDirection).project(camera);
  camera.getWorldDirection(_cameraForward);
  const facing = _sunDirection.sub(camera.position).normalize().dot(_cameraForward);
  if (facing > .02 && _sunProject.z < 1 && _sunProject.x > -.35 && _sunProject.x < 1.35 && _sunProject.y > -.35 && _sunProject.y < 1.35) {
    u.uSunScreen.value.set(_sunProject.x * .5 + .5, _sunProject.y * .5 + .5);
  } else {
    u.uSunScreen.value.set(-2, -2);
  }
}

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - lastFrame) / 1000, .05);
  lastFrame = now;
  if (!state.ready) return;
  renderedFrameCount++;
  if (opening.active) {
    updateOpeningCinematic(now);
  } else if (cameraTween) {
    animateCameraTween(now);
  } else {
    controls.update();
    camera.updateMatrixWorld();
  }
  followSkyDome();
  // graceful day/night interpolation
  if (Math.abs(dayNightMix - targetDayNightMix) > .001) {
    dayNightMix = damp(dayNightMix, targetDayNightMix, 4.5, dt);
    applyDayNightMix();
  }
  // Two-scale drift keeps the water normal field from looking like a single
  // sliding texture; the second frequency adds the fine broken ripples.
  const t = now * .001;
  for (const w of waterMaterials) {
    w.texture.offset.set(
      w.base.x + Math.sin(t * .085) * .016 + Math.sin(t * .021 + 1.3) * .006,
      w.base.y + t * .009 + Math.cos(t * .047) * .005,
    );
    w.texture.rotation = Math.sin(t * .013) * .035;
    w.texture.updateMatrix();
  }
  updateFountainMist(dt);
  updateFountainFX(dt, t);
  updateAtmosphere(dt, t);
  updateCinematicUniforms();
  updateLabels();
  if (selectionGroup && selectionGroup.visible) {
    const pulse = .68 + Math.sin(t * 2.2) * .16;
    if (selectionLine?.material) selectionLine.material.opacity = pulse;
    if (selectionFill?.material) selectionFill.material.opacity = .055 + pulse * .028;
  }
  if (D.compass) D.compass.style.transform = `rotate(${controls.getAzimuthalAngle()}rad)`;
  if (firstRenderDone) {
    if (usePostFX && composer) composer.render();
    else renderer.render(scene, camera);
  }
}

/* ------------------------------------------------------------------ */
/*  Boot                                                              */
/* ------------------------------------------------------------------ */

async function boot() {
  try {
    if (!window.WebGLRenderingContext) throw new Error('当前浏览器不支持 WebGL');
    const probe = document.createElement('canvas');
    const probeGL = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!probeGL) throw new Error('WebGL context unavailable');
    probeGL.getExtension('WEBGL_lose_context')?.loseContext();
    setProgress(4, '初始化渲染器与光照…');
    initRenderer();
    initLights();
    setProgress(8, '生成日间与夜间天空…');
    await nextFrame();
    initSky();
    setProgress(11, '读取建筑模型数据…');
    await nextFrame();
    glbBuffer = await readData();
    buildDirectoryStatic();
    await loadModel(glbBuffer);
    bindUI();
    setPanel(state.panelOpen, true);
    setAutoRotate(false);
    updateThemeUi();
    setCutawayUi();
    await showEntryGate();
    hideEntryGate();
    beginOpeningCinematic();
    requestAnimationFrame(animate);
    startRenderWatchdog();
  } catch (err) {
    loadingError(err);
  }
}

/* Minimal pre-load directory placeholder (real list is built after GLB load). */
function buildDirectoryStatic() {
  D.roomList.innerHTML = '<div style="padding:24px;color:var(--muted);font-family:var(--cjk);font-size:10px;letter-spacing:.08em">空间目录载入中…</div>';
}

window.addEventListener('beforeunload', () => {
  if (renderer) renderer.dispose();
});

// Decode the embedded MP3 at page load. Playback is deliberately deferred
// until the entry-gate click so it starts with the opening's first frame.
initBackgroundMusic();

boot();

/* Expose a small QA / integration API. */
window.__VIEWER__ = {
  get state() { return { ...state }; },
  get ready() { return state.ready; },
  get scene() { return scene; },
  get camera() { return camera; },
  get controls() { return controls; },
  get manifest() { return manifest; },
  get renderer() { return renderer; },
  setFloor: (f) => setFloor(f === null || f === 'all' ? null : Number(f)),
  setRoom: (id) => openRoom(id),
  setNight: (v) => setNight(v),
  setLabels: (v) => { if (state.labels !== Boolean(v)) D.labels?.click(); },
  setCutaway: (v) => { if (state.cutaway !== Boolean(v)) D.cutaway?.click(); },
  reset: resetView,
  download: downloadGLB,
  setPanel: (v) => setPanel(v),
  setPhoto: (v) => setPhotoMode(v),
};
