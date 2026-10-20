'use strict';

/**
 * 大学物理实验：铁磁材料 Bm-Hm 与 mu-Hm 曲线
 * 输出：300 dpi PNG（1800 x 1200，适配 A4 实验报告）
 */
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');
const sharp = require('sharp');

const OUT_DIR = __dirname;
const W = 1800;
const H = 1200;

const DATA = {
  H:  [68.7, 93.3, 114.1, 137.4, 171.8, 210.9, 257.7, 343.6, 466.3, 662.6],
  B:  [136, 271, 413, 549, 678, 825, 955, 1100, 1247, 1357],
  mu: [1.98, 2.91, 3.62, 4.00, 3.95, 3.91, 3.71, 3.20, 2.67, 2.05],
};

const STYLE = {
  bg: '#ffffff',
  plotBg: '#ffffff',
  ink: '#18242f',
  axisText: '#1f2d3a',
  muted: '#5d6b7a',
  grid: '#e7ecf2',
  frame: '#28343f',
  bCurve: '#1f5d8b',
  bCurveSoft: 'rgba(31, 93, 139, 0.10)',
  muCurve: '#ad3f4e',
  muCurveSoft: 'rgba(173, 63, 78, 0.10)',
  guide: 'rgba(93, 107, 122, 0.55)',
  legendBorder: '#d7dfe8',
};

const FONT = {
  cn: 'SimHei',
  cnSoft: 'SimSun',
  serif: 'Times New Roman',
};

const layout = {
  left: 218,
  right: 92,
  top: 176,
  bottom: 144,
};
layout.plotW = W - layout.left - layout.right;
layout.plotH = H - layout.top - layout.bottom;
layout.plotRight = layout.left + layout.plotW;
layout.plotBottom = layout.top + layout.plotH;

// ---------- 数值处理 ----------

/** Shape-preserving cubic Hermite (PCHIP interior, secant end slopes). */
function makePchip(xs, ys) {
  const n = xs.length;
  const h = [];
  const delta = [];
  for (let i = 0; i < n - 1; i++) {
    h[i] = xs[i + 1] - xs[i];
    delta[i] = (ys[i + 1] - ys[i]) / h[i];
  }
  const d = new Array(n).fill(0);
  if (n === 2) {
    d[0] = d[1] = delta[0];
  } else {
    d[0] = delta[0];
    d[n - 1] = delta[n - 2];
    for (let i = 1; i < n - 1; i++) {
      if (delta[i - 1] * delta[i] <= 0) {
        d[i] = 0;
      } else {
        const w1 = 2 * h[i] + h[i - 1];
        const w2 = h[i] + 2 * h[i - 1];
        d[i] = (w1 + w2) / (w1 / delta[i - 1] + w2 / delta[i]);
      }
    }
  }

  function evalAt(x) {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (i < n - 2 && x > xs[i + 1]) i++;
    const t = (x - xs[i]) / h[i];
    const t2 = t * t;
    const t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    return h00 * ys[i] + h10 * h[i] * d[i] + h01 * ys[i + 1] + h11 * h[i] * d[i + 1];
  }

  return { evalAt, slopes: d };
}

function sampleCurve(xs, ys, perSegment = 90) {
  const pchip = makePchip(xs, ys);
  const pts = [];
  for (let i = 0; i < xs.length - 1; i++) {
    const steps = perSegment;
    for (let k = 0; k < steps; k++) {
      const x = xs[i] + ((xs[i + 1] - xs[i]) * k) / steps;
      pts.push([x, pchip.evalAt(x)]);
    }
  }
  pts.push([xs[xs.length - 1], ys[ys.length - 1]]);
  return pts;
}

// ---------- 字体与排版 ----------

function fontOf(seg) {
  const style = seg.italic ? 'italic ' : '';
  return `${style}${seg.size}px "${seg.family}"`;
}

function measureSegments(ctx, segments) {
  let total = 0;
  for (const seg of segments) {
    ctx.font = fontOf(seg);
    seg._w = ctx.measureText(seg.text).width;
    total += seg._w;
  }
  return total;
}

/**
 * Draw mixed-font rich text on one baseline.
 * align: left | center | right; baseline is alphabetic.
 */
function drawRich(ctx, segments, x, baseline, align = 'left') {
  const total = measureSegments(ctx, segments);
  let cursor = x;
  if (align === 'center') cursor -= total / 2;
  if (align === 'right') cursor -= total;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  for (const seg of segments) {
    ctx.font = fontOf(seg);
    ctx.fillStyle = seg.color || STYLE.axisText;
    ctx.fillText(seg.text, cursor, baseline + (seg.dy || 0));
    cursor += seg._w;
  }
  ctx.restore();
  return total;
}

function drawRotatedRich(ctx, segments, x, y, align = 'center') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  drawRich(ctx, segments, 0, 0, align);
  ctx.restore();
}

function cn(text, size, color = STYLE.axisText, family = FONT.cn) {
  return { text, size, family, color };
}
function serif(text, size, color = STYLE.axisText, opts = {}) {
  return { text, size, family: FONT.serif, color, ...opts };
}
function sub(text, size, color = STYLE.axisText) {
  return { text, size, family: FONT.serif, color, italic: true, dy: size * 0.31 };
}
function sup(text, size, color = STYLE.axisText) {
  return { text, size, family: FONT.serif, color, dy: -size * 0.44 };
}

function axisXLabel() {
  return [
    cn('磁场强度', 39),
    cn('  ', 12),
    serif('H', 43, STYLE.axisText, { italic: true }),
    sub('m', 29),
    serif('  /  ', 38),
    serif('(', 38),
    serif('A·m', 38),
    sup('−1', 27),
    serif(')', 38),
  ];
}

function axisBLabel() {
  return [
    cn('磁感应强度', 38),
    cn('  ', 10),
    serif('B', 42, STYLE.axisText, { italic: true }),
    sub('m', 29),
    serif('  /  ', 38),
    serif('(', 38),
    serif('10', 38),
    sup('−3', 27),
    serif(' T)', 38),
  ];
}

function axisMuLabel() {
  return [
    cn('磁导率', 38),
    cn('  ', 10),
    serif('μ', 43, STYLE.axisText, { italic: true }),
    serif('  /  ', 38),
    serif('(', 38),
    serif('10', 38),
    sup('−3', 27),
    serif(' H·m', 38),
    sup('−1', 27),
    serif(')', 38),
  ];
}

function titleSegments(figNo, leftSymbol, leftHasSub, rightSymbol, suffix) {
  const segments = [
    cn(`图${figNo}`, 34, '#4d5b69'),
    cn('   ', 16),
    serif(leftSymbol, 50, STYLE.ink, { italic: true }),
  ];
  if (leftHasSub) segments.push(sub('m', 32, STYLE.ink));
  segments.push(
    serif('–', 50, STYLE.ink),
    serif(rightSymbol, 50, STYLE.ink, { italic: true }),
    sub('m', 32, STYLE.ink),
    cn('  ', 16),
    cn(suffix, 48, STYLE.ink)
  );
  return segments;
}

// ---------- 绘图 ----------

function makePlot(config) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = STYLE.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = STYLE.plotBg;
  ctx.fillRect(layout.left, layout.top, layout.plotW, layout.plotH);

  const xMin = 0;
  const xMax = config.xMax;
  const yMin = 0;
  const yMax = config.yMax;
  const xTicks = config.xTicks;
  const yTicks = config.yTicks;

  const sx = (v) => layout.left + ((v - xMin) / (xMax - xMin)) * layout.plotW;
  const sy = (v) => layout.plotBottom - ((v - yMin) / (yMax - yMin)) * layout.plotH;

  // Grid (major only, restrained so the curve remains dominant)
  ctx.save();
  ctx.beginPath();
  ctx.rect(layout.left, layout.top, layout.plotW, layout.plotH);
  ctx.clip();
  ctx.strokeStyle = STYLE.grid;
  ctx.lineWidth = 1.25;
  for (const t of xTicks) {
    if (t === xMin) continue;
    const x = Math.round(sx(t)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, layout.top);
    ctx.lineTo(x, layout.plotBottom);
    ctx.stroke();
  }
  for (const t of yTicks) {
    if (t === yMin) continue;
    const y = Math.round(sy(t)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(layout.left, y);
    ctx.lineTo(layout.plotRight, y);
    ctx.stroke();
  }
  ctx.restore();

  // Peak guide for the permeability chart
  if (typeof config.peak === 'number') {
    const px = sx(config.peak);
    const py = sy(config.peakY);
    ctx.save();
    ctx.beginPath();
    ctx.rect(layout.left, layout.top, layout.plotW, layout.plotH);
    ctx.clip();
    ctx.strokeStyle = STYLE.guide;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([6, 7]);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px, layout.plotBottom);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Smooth curve with a subtle halo for print legibility
  const pts = sampleCurve(config.xs, config.ys, 110);
  ctx.save();
  ctx.beginPath();
  ctx.rect(layout.left, layout.top, layout.plotW, layout.plotH);
  ctx.clip();

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = config.softColor;
  ctx.lineWidth = 11;
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    const px = sx(x);
    const py = sy(y);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();

  ctx.strokeStyle = config.color;
  ctx.lineWidth = 4.1;
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    const px = sx(x);
    const py = sy(y);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();

  // Measured points: white core + colored rim, classic lab-report styling
  for (let i = 0; i < config.xs.length; i++) {
    const px = sx(config.xs[i]);
    const py = sy(config.ys[i]);
    ctx.beginPath();
    ctx.arc(px, py, 9.0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = config.color;
    ctx.lineWidth = 3.2;
    ctx.stroke();
  }

  if (typeof config.peak === 'number') {
    const px = sx(config.peak);
    const py = sy(config.peakY);
    ctx.beginPath();
    ctx.arc(px, py, 15.5, 0, Math.PI * 2);
    ctx.strokeStyle = config.softColor;
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  ctx.restore();

  // Minor / major ticks
  ctx.save();
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = `34px "${FONT.serif}"`;
  ctx.fillStyle = STYLE.axisText;
  for (const t of yTicks) {
    const y = sy(t);
    ctx.beginPath();
    ctx.moveTo(layout.left - 12, y);
    ctx.lineTo(layout.left, y);
    ctx.strokeStyle = STYLE.frame;
    ctx.lineWidth = 2.1;
    ctx.stroke();
    ctx.fillText(config.yTickLabel ? config.yTickLabel(t) : String(t), layout.left - 23, y + 1);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (const t of xTicks) {
    const x = sx(t);
    ctx.beginPath();
    ctx.moveTo(x, layout.plotBottom);
    ctx.lineTo(x, layout.plotBottom + 11);
    ctx.strokeStyle = STYLE.frame;
    ctx.lineWidth = 2.1;
    ctx.stroke();
    ctx.fillText(String(t), x, layout.plotBottom + 25);
  }

  // Lightweight minor ticks for graph-paper feel
  ctx.strokeStyle = '#93a0ad';
  ctx.lineWidth = 1.25;
  if (config.xMinor) {
    for (let t = config.xMinor; t < xMax; t += config.xMinor) {
      if (xTicks.includes(t)) continue;
      const x = sx(t);
      ctx.beginPath();
      ctx.moveTo(x, layout.plotBottom);
      ctx.lineTo(x, layout.plotBottom + 5.5);
      ctx.stroke();
    }
  }
  if (config.yMinor) {
    for (let t = config.yMinor; t < yMax; t += config.yMinor) {
      if (yTicks.includes(t)) continue;
      const y = sy(t);
      ctx.beginPath();
      ctx.moveTo(layout.left - 6, y);
      ctx.lineTo(layout.left, y);
      ctx.stroke();
    }
  }

  // Frame
  ctx.strokeStyle = STYLE.frame;
  ctx.lineWidth = 2.3;
  ctx.strokeRect(layout.left, layout.top, layout.plotW, layout.plotH);
  ctx.restore();

  // Title
  drawRich(
    ctx,
    titleSegments(
      config.figNo,
      config.titleLeft,
      config.titleLeftSub !== false,
      config.titleRight,
      config.titleSuffix
    ),
    (layout.left + layout.plotRight) / 2,
    83,
    'center'
  );

  // Axis labels
  drawRich(ctx, axisXLabel(), (layout.left + layout.plotRight) / 2, 1148, 'center');
  const yLabel = config.yLabel();
  drawRotatedRich(ctx, yLabel, 79, (layout.top + layout.plotBottom) / 2, 'center');

  // Optional peak annotation
  if (typeof config.peak === 'number') {
    const x = sx(config.peak);
    const labelX = x + 36;
    const labelY = layout.top + 39;
    drawRich(
      ctx,
      [
        cn('峰值 ', 27, STYLE.muted),
        serif('(', 27, STYLE.muted),
        serif('H', 27, STYLE.muted, { italic: true }),
        sub('m', 19, STYLE.muted),
        serif(' = 137.4, ', 27, STYLE.muted),
        serif('μ', 28, STYLE.muted, { italic: true }),
        serif(' = 4.00', 27, STYLE.muted),
        serif(')', 27, STYLE.muted),
      ],
      labelX,
      labelY,
      'left'
    );
    ctx.save();
    ctx.strokeStyle = 'rgba(93, 107, 122, 0.45)';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(x + 10, sy(config.peakY) - 17);
    ctx.lineTo(labelX - 3, labelY + 6);
    ctx.stroke();
    ctx.restore();
  }

  // Legend
  drawLegend(ctx, config.color, config.figNo === 1 ? 210 : 228);

  return canvas;
}

function drawLegend(ctx, color, boxW) {
  const pad = 16;
  const boxH = 100;
  const bx = layout.plotRight - boxW - 22;
  const by = layout.plotBottom - boxH - 22;

  ctx.save();
  ctx.beginPath();
  roundRect(ctx, bx, by, boxW, boxH, 7);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
  ctx.fill();
  ctx.strokeStyle = STYLE.legendBorder;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  const x1 = bx + pad + 2;
  const x2 = x1 + 45;
  const y1 = by + 34;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y1);
  ctx.stroke();

  ctx.fillStyle = STYLE.muted;
  ctx.font = `26px "${FONT.cn}"`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('平滑曲线', x2 + 16, y1 + 1);

  const y2 = by + 72;
  ctx.beginPath();
  ctx.arc(x1 + 22, y2, 7.8, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.8;
  ctx.stroke();
  ctx.fillStyle = STYLE.muted;
  ctx.font = `26px "${FONT.cn}"`;
  ctx.fillText('实测点', x2 + 16, y2 + 1);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function saveCanvas(canvas, filename) {
  const raw = canvas.toBuffer('image/png');
  const out = path.join(OUT_DIR, filename);
  await sharp(raw)
    .withMetadata({ density: 300 })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(out);
  return out;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const fig1 = makePlot({
    figNo: 1,
    titleLeft: 'B',
    titleLeftSub: true,
    titleRight: 'H',
    titleSuffix: '磁化曲线',
    xs: DATA.H,
    ys: DATA.B,
    xMax: 700,
    yMax: 1400,
    xTicks: [0, 100, 200, 300, 400, 500, 600, 700],
    yTicks: [0, 200, 400, 600, 800, 1000, 1200, 1400],
    xMinor: 20,
    yMinor: 40,
    color: STYLE.bCurve,
    softColor: STYLE.bCurveSoft,
    yLabel: axisBLabel,
  });

  const fig2 = makePlot({
    figNo: 2,
    titleLeft: 'μ',
    titleLeftSub: false,
    titleRight: 'H',
    titleSuffix: '关系曲线',
    xs: DATA.H,
    ys: DATA.mu,
    xMax: 700,
    yMax: 4.5,
    xTicks: [0, 100, 200, 300, 400, 500, 600, 700],
    yTicks: [0, 1, 2, 3, 4, 4.5],
    yTickLabel: (v) => (v === 0 || v === 4.5 ? String(v) : v.toFixed(1)),
    xMinor: 20,
    yMinor: 0.5,
    color: STYLE.muCurve,
    softColor: STYLE.muCurveSoft,
    peak: 137.4,
    peakY: 4.0,
    yLabel: axisMuLabel,
  });

  const files = [];
  files.push(await saveCanvas(fig1, 'fig1_Bm-Hm_magnetization_curve.png'));
  files.push(await saveCanvas(fig2, 'fig2_mu-Hm_permeability_curve.png'));
  console.log(files.join('\n'));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
