import * as THREE from 'three';
import {
  FLOORS, HOUSE, box, roundedBox, cylinder, sphere, plane, torus, lathe, tube,
  mergeGroup, seeded, addBalustrade, addPanelFrame,
} from './geom.js';
import {
  sofa, armchair, loveseat, bench, ottoman, diningChair, coffeeTable, sideTable,
  consoleTable, sideboard, diningSet, bed, nightstand, wardrobe, dresser, desk, deskChair,
  bookshelf, fireplace, grandPiano, chandelier, floorLamp, addTableLamp, framedArt, mirror,
  pottedPlant, vase, addVase, sculpture, telescope, kitchenIsland, kitchenRun, vanity, bathtub,
  shower, toilet, cinemaScreen, sectional, easel, gymSet, sunLounger,
} from './furniture.js';

const PI = Math.PI;
const grp = (name) => { const g = new THREE.Group(); g.name = name; return g; };

/* ------------------------------------------------------------------ */
/*  Room metadata                                                     */
/* ------------------------------------------------------------------ */

const SPECS = [
  {
    id: 'salon', floor: 0, name: '大沙龙', nameFr: 'Grand Salon', areaLabel: '礼仪会客厅',
    bounds: [-12.62, -3.18, .70, 7.62], label: [-7.3, 5.3],
    description: '面向南侧花园的礼仪沙龙。壁炉、三角钢琴与两组法式座椅围绕中轴展开，深古铜窗框与丝绒窗帘构成温润的明暗层次。',
    features: ['白玉石壁炉', '三角钢琴', '手工簇绒沙发', '波斯羊毛地毯'],
    palette: ['米白石材', '深古铜', '海军蓝丝绒', '黄铜'],
    doors: [{ side: 'east', u: 4.55, w: 1.65 }, { side: 'north', u: -8.4, w: 1.25 }],
  },
  {
    id: 'dining', floor: 0, name: '餐厅', nameFr: 'Salle à Manger', areaLabel: '宴飨与酒会',
    bounds: [3.18, 12.62, .70, 7.62], label: [8.1, 6.3],
    description: '可容纳八人的核桃木长桌与米色大理石台面居于轴心。餐边柜、酒具与黄铜烛台为正式宴会提供了完整而从容的礼仪序列。',
    features: ['八人核桃木餐桌', '米色大理石台面', '黄铜水晶吊灯', '餐边柜与酒具'],
    palette: ['暖米色', '胡桃木', '亚麻', '古铜'],
    doors: [{ side: 'west', u: 4.55, w: 1.65 }, { side: 'north', u: 8.4, w: 1.25 }],
  },
  {
    id: 'vestibule', floor: 0, name: '门厅', nameFr: 'Vestibule', areaLabel: '迎宾序列',
    bounds: [-2.97, 2.97, 1.28, 7.62], label: [0, 5.25],
    description: '双扇古铜大门之后，是带大理石拼花与穹顶吊灯的门厅。中央圆桌、对称边几和尽头楼梯共同建立法式宅邸的第一重仪式感。',
    features: ['大理石拼花', '中央圆桌', '黄铜吊灯', '对称边几'],
    palette: ['米色大理石', '白色石膏', '黄铜', '深古铜'],
    doors: [{ side: 'south', u: 0, w: 2.9 }, { side: 'west', u: 4.55, w: 1.65 }, { side: 'east', u: 4.55, w: 1.65 }],
  },
  {
    id: 'stair-gf', floor: 0, name: '荣誉楼梯厅', nameFr: 'Escalier d’Honneur', areaLabel: '垂直交通',
    bounds: [-2.97, 2.97, -7.62, 1.28], label: [0, -6.35],
    description: '对称双跑楼梯围绕中央梯井展开，蓝色丝绒地毯与黄铜压杆勾勒出行进方向。挑空尽端的高窗将北向天光引入室内。',
    features: ['对称双跑楼梯', '丝绒踏步地毯', '黄铜压杆', '挑空高窗'],
    palette: ['白色石材', '胡桃木', '海军蓝丝绒', '黄铜'],
    doors: [],
  },
  {
    id: 'library', floor: 0, name: '书房', nameFr: 'Bibliothèque', areaLabel: '藏书与静思',
    bounds: [-12.62, -3.18, -7.62, .47], label: [-7.7, -5.6],
    description: '整墙核桃木书柜与做旧黄铜导轨构成藏书空间。写字台面向花园，壁炉旁设阅读椅，是宅邸中最安静的角落。',
    features: ['整墙书柜', '核桃木写字台', '黄铜阅读灯', '壁炉与阅读椅'],
    palette: ['胡桃木', '墨绿', '黄铜', '米白'],
    doors: [{ side: 'south', u: -8.4, w: 1.25 }, { side: 'east', u: -6.25, w: 1.1 }],
  },
  {
    id: 'kitchen', floor: 0, name: '厨房与早餐区', nameFr: 'Cuisine d’Office', areaLabel: '烹饪与晨间',
    bounds: [3.18, 12.62, -7.62, .47], label: [8.1, -2.25],
    description: '隐藏式冰箱、大理石中岛与黄铜龙头组成专业厨房，北侧早餐角可容纳两人。操作动线与管家通道保持清晰分离。',
    features: ['大理石中岛', '黄铜吊灯', '专业灶具', '早餐角'],
    palette: ['米白烤漆', '白色大理石', '黄铜', '橡木'],
    doors: [{ side: 'south', u: 8.4, w: 1.25 }, { side: 'west', u: -6.25, w: 1.1 }],
  },
  {
    id: 'master-suite', floor: 1, name: '主卧套房', nameFr: 'Suite Principale', areaLabel: '主人私域',
    bounds: [-12.62, -3.18, .70, 7.62], label: [-7.7, 5.1],
    description: '主卧以软包床头墙与鼠尾草绿丝绒建立宁静基调，南向与西向双面采光。书桌、扶手椅与床尾凳完善了休憩、阅读与更衣的完整日常。',
    features: ['簇绒软包床', '鼠尾草丝绒', '手写书桌', '双面采光'],
    palette: ['鼠尾草绿', '亚麻白', '胡桃木', '黄铜'],
    doors: [{ side: 'east', u: 4.75, w: 1.3 }, { side: 'north', u: -5.0, w: 1.25 }],
  },
  {
    id: 'master-bath', floor: 1, name: '主卫', nameFr: 'Bain Principal', areaLabel: '水疗式卫浴',
    bounds: [-12.62, -8.28, -7.62, .47], label: [-10.7, -5.7],
    description: '独立浴缸面向西侧窗景，双台盆与大理石立面延续建筑的米色调。黄铜五金与白瓷共同营造安静、温润的水疗氛围。',
    features: ['独立浴缸', '双台盆', '黄铜五金', '大理石墙面'],
    palette: ['白色大理石', '象牙白', '黄铜', '暖灰'],
    doors: [{ side: 'east', u: -3.2, w: 1.0 }],
  },
  {
    id: 'dressing', floor: 1, name: '衣帽间', nameFr: 'Cabinet de Toilette', areaLabel: '更衣与梳妆',
    bounds: [-8.28, -3.18, -7.62, .47], label: [-5.8, -5.0],
    description: '两侧嵌入式衣柜与中央梳妆台形成高效而私密的更衣空间。穿衣镜、丝绒坐凳与香氛陈列让日常更衣也保有法式仪式感。',
    features: ['嵌入式衣柜', '梳妆台', '穿衣镜', '丝绒坐凳'],
    palette: ['胡桃木', '玫瑰灰', '黄铜', '亚麻'],
    doors: [{ side: 'west', u: -3.2, w: 1.0 }, { side: 'east', u: -6.15, w: 1.0 }, { side: 'south', u: -5.0, w: 1.25 }],
  },
  {
    id: 'guest-1', floor: 1, name: '客卧一', nameFr: 'Chambre d’Amis', areaLabel: '南向客房',
    bounds: [3.18, 12.62, .70, 7.62], label: [7.6, 5.2],
    description: '南向客房以蓝色肌理墙纸与亚麻床品为主调。床尾凳、扶手椅与独立衣柜满足长住客人的完整需求，窗外正对前庭花坛。',
    features: ['软包双人床', '蓝色墙纸', '独立衣柜', '花园景观'],
    palette: ['雾蓝', '亚麻白', '胡桃木', '黄铜'],
    doors: [{ side: 'west', u: 4.75, w: 1.3 }],
  },
  {
    id: 'guest-2', floor: 1, name: '客卧二', nameFr: 'Chambre Jaune', areaLabel: '套房式客卧',
    bounds: [3.18, 8.90, -7.62, .47], label: [6.5, -4.7],
    description: '带独立卫浴的北向客房，床头背倚安静的内墙，写字台面向后花园。暖木色与鼠尾草织物构成适合阅读与休息的淡雅氛围。',
    features: ['独立卫浴', '花园书桌', '嵌入式衣柜', '羊毛地毯'],
    palette: ['鼠尾草', '暖白', '胡桃木', '古铜'],
    doors: [{ side: 'west', u: -6.15, w: 1.1 }],
  },
  {
    id: 'guest-bath', floor: 1, name: '客卫', nameFr: 'Salle d’Eau', areaLabel: '客用卫浴',
    bounds: [8.90, 12.62, -7.62, .47], label: [10.7, -2.2],
    description: '为北向客房服务的独立卫浴，布置小型双台盆、步入式淋浴与黄铜壁灯。窗下是后花园的树木，私密而明亮。',
    features: ['步入式淋浴', '黄铜花洒', '双台盆', '大理石地面'],
    palette: ['白色大理石', '象牙白', '黄铜', '亚麻'],
    doors: [{ side: 'west', u: -6.3, w: .95 }],
  },
  {
    id: 'family-lounge', floor: 1, name: '家庭起居厅', nameFr: 'Salon de Famille', areaLabel: '家庭共处',
    bounds: [-2.97, 2.97, 1.28, 7.62], label: [0, 5.85],
    description: '连接二层各房间的中央家庭厅，两张对置的丝绒双人椅围合茶几，前方法式门通向观景阳台。这里是从公共礼仪层进入私密层的第一处缓冲。',
    features: ['对置双人椅', '观景阳台', '黄铜吊灯', '羊毛地毯'],
    palette: ['灰绿丝绒', '米白', '黄铜', '胡桃木'],
    doors: [{ side: 'south', u: 0, w: 2.05 }, { side: 'north', u: 0, w: 3.1 }],
  },
  {
    id: 'landing-1', floor: 1, name: '二层楼梯厅', nameFr: 'Palier d’Étage', areaLabel: '楼层枢纽',
    bounds: [-2.97, 2.97, -7.62, 1.28], label: [0, -6.7],
    description: '二层楼梯厅以石质栏杆围合梯井，连接四间卧室与家庭起居厅。尽端的长凳与绿植形成短暂停留的安静角落。',
    features: ['梯井栏杆', '石质台面', '长凳', '天光'],
    palette: ['米白', '大理石', '黄铜', '绿植'],
    doors: [{ side: 'west', u: 4.75, w: 1.3 }, { side: 'east', u: 4.75, w: 1.3 }],
  },
  {
    id: 'belvedere', floor: 2, name: '观景厅', nameFr: 'Salon Belvédère', areaLabel: '顶部观景与音乐',
    bounds: [-3.88, 3.88, 1.28, 7.62], label: [0, 6.35],
    description: '位于三层中轴的观景厅，三角形钢琴与观景阳台共同构成宅邸最高处的私人音乐室。南向门窗将天空与花园一并纳入室内。',
    features: ['三角形钢琴', '观景阳台', '黄铜望远镜', '弧形天光'],
    palette: ['海军蓝丝绒', '黑檀', '黄铜', '米白'],
    doors: [{ side: 'south', u: 0, w: 1.95 }, { side: 'north', u: 0, w: 3.2 }],
  },
  {
    id: 'suite-3', floor: 2, name: '客卧套房', nameFr: 'Suite d’Angle', areaLabel: '转角套房',
    bounds: [-12.62, -4.13, .70, 7.62], label: [-7.8, 5.2],
    description: '拥有双面采光的转角客房，床头的玫瑰灰墙纸与丝绒软包延续法式私宅的柔和。西侧衣柜和南向书桌让空间兼具停留与工作。',
    features: ['双面采光', '丝绒软包床', '转角衣柜', '手写书桌'],
    palette: ['玫瑰灰', '亚麻白', '胡桃木', '黄铜'],
    doors: [{ side: 'east', u: 4.75, w: 1.3 }],
  },
  {
    id: 'atelier', floor: 2, name: '画室', nameFr: 'Atelier d’Artiste', areaLabel: '创作与收藏',
    bounds: [4.13, 12.62, .70, 7.62], label: [8.0, 5.9],
    description: '顶层画室以一张大工作台和面向南窗的画架为中心。颜料、画布和雕塑台自由散落，形成松弛而有秩序的创作现场。',
    features: ['大工作台', '南向画架', '雕塑台', '画布与颜料'],
    palette: ['橡木', '亚麻', '赭石', '黄铜'],
    doors: [{ side: 'west', u: 4.75, w: 1.3 }],
  },
  {
    id: 'cinema', floor: 2, name: '私人影院', nameFr: 'Cinéma Privé', areaLabel: '沉浸式影音',
    bounds: [-12.62, -4.13, -7.62, .47], label: [-8.2, -.8],
    description: '以深色丝绒和胡桃木包覆的私人影院，后墙嵌入整幅投影幕。模块沙发与黄铜边几提供六人舒适观影，同时保留完整的声学软包。',
    features: ['整墙投影幕', '模块沙发', '声学软包', '独立投影机'],
    palette: ['深灰丝绒', '黑檀', '胡桃木', '黄铜'],
    doors: [{ side: 'east', u: -6.15, w: 1.2 }],
  },
  {
    id: 'gym', floor: 2, name: '私人健身房', nameFr: 'Salle de Sport', areaLabel: '康体与训练',
    bounds: [4.13, 12.62, -7.62, .47], label: [8.0, -6.4],
    description: '三层后侧的私人健身房以镜面墙延伸空间，跑步机、力量训练与瑜伽区彼此分离。窗外是后花园树冠，运动时仍可见绿意。',
    features: ['整墙镜面', '力量训练区', '瑜伽区', '花园景观'],
    palette: ['黑色橡胶', '胡桃木', '镜面', '黄铜'],
    doors: [{ side: 'west', u: -6.15, w: 1.2 }],
  },
  {
    id: 'landing-3', floor: 2, name: '三层楼梯厅', nameFr: 'Palier du Belvédère', areaLabel: '顶层枢纽',
    bounds: [-3.88, 3.88, -7.62, 1.28], label: [0, -6.7],
    description: '顶层楼梯厅以雕塑和壁灯收束垂直旅程。石质栏杆围合梯井，四周分别通往观景厅、客卧、画室、影院与健身房。',
    features: ['石质栏杆', '雕塑', '壁灯', '梯井'],
    palette: ['米白', '大理石', '黄铜', '胡桃木'],
    doors: [{ side: 'west', u: 4.75, w: 1.3 }, { side: 'east', u: 4.75, w: 1.3 }],
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function scaleUV(geometry, su, sv) {
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return geometry;
}

function floorRect(ctx, mat, x0, x1, z0, z1, uv = 1.8, inset = 0) {
  const w = x1 - x0 - inset * 2, d = z1 - z0 - inset * 2;
  const geo = scaleUV(new THREE.PlaneGeometry(w, d), w / uv, d / uv);
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -PI / 2;
  m.position.set((x0 + x1) / 2, ctx.base + .012, (z0 + z1) / 2);
  m.receiveShadow = true;
  ctx.baseGroup.add(m);
  return m;
}

function wallPlacement(room, side, u, y, offset = .055) {
  const [x0, x1, z0, z1] = room.bounds;
  if (side === 'north') return { pos: [u, y, z0 + offset], ry: 0 };
  if (side === 'south') return { pos: [u, y, z1 - offset], ry: PI };
  if (side === 'east') return { pos: [x1 - offset, y, u], ry: -PI / 2 };
  return { pos: [x0 + offset, y, u], ry: PI / 2 };
}

function curtainGeometry(w, h, amp = .055, seg = 20) {
  const g = new THREE.PlaneGeometry(w, h, seg, 12);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const u = (x / w + .5);
    const fold = Math.sin(u * PI * 8) * amp * (0.9 - 0.25 * Math.abs(y / h));
    pos.setZ(i, fold + Math.sin(u * PI * 2.2) * amp * .35);
  }
  g.computeVertexNormals();
  return g;
}

function makeFeatureWall(ctx, side, u, width, opts = {}) {
  const M = ctx.M;
  const room = ctx.room;
  const g = grp('French_Boiserie_Wall');
  const xf = wallPlacement(room, side, u, ctx.base, .075);
  g.position.set(...xf.pos); g.rotation.y = xf.ry;
  const b = ctx.floor.height;
  const low = opts.low ?? .92;
  const top = opts.top ?? (b - .24);
  const paperMat = opts.paper || M.wallpaper;
  const h = top - low;
  // wallpaper field
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(width, h), paperMat);
  paper.position.set(0, low + h / 2, .012);
  g.add(paper);
  // wainscot: white painted panels below chair rail
  box(g, M.whiteTrim, width + .16, low, .05, 0, low / 2, .02);
  const panelW = Math.max(2, Math.round(width / .62));
  for (let i = 0; i < panelW; i++) {
    const px = -width / 2 + width / panelW * (i + .5);
    addPanelFrame(g, M, px, low * .48, .055, width / panelW - .09, low * .62, 0, .028);
  }
  box(g, M.whiteTrim, width + .28, .075, .12, 0, low, .05); // chair rail
  box(g, M.whiteTrim, width + .22, .16, .08, 0, .08, .04); // baseboard
  box(g, M.whiteTrim, width + .2, .06, .1, 0, top + .01, .04); // cornice
  // vertical boiserie stiles framing the paper
  for (let i = 0; i <= 3; i++) {
    const px = -width / 2 + width / 3 * i;
    box(g, M.whiteTrim, .07, h + .02, .055, px, low + h / 2, .06);
  }
  box(g, M.whiteTrim, width + .2, .07, .065, 0, low + .02, .06);
  // delicate gold filet
  box(g, M.gold, width - .1, .012, .012, 0, top - .06, .085, { cast: false });
  ctx.shell.add(g);
}

function addSconce(ctx, side, u, y) {
  const M = ctx.M;
  const room = ctx.room;
  const g = grp('Wall_Sconce');
  const p = wallPlacement(room, side, u, ctx.base + y, .10);
  g.position.set(p.pos[0], ctx.base + y, p.pos[2]);
  g.rotation.y = p.ry;
  cylinder(g, M.brass, .045, .06, .11, 12, 0, 0, .02, { rx: PI / 2 });
  tube(g, M.brass, [new THREE.Vector3(0, 0, .06), new THREE.Vector3(0, .1, .19), new THREE.Vector3(0, .2, .17)], .012, 0, 0, 0, { radial: 5, segments: 5 });
  cylinder(g, M.candle, .012, .012, .12, 6, 0, .25, .16);
  sphere(g, M.bulb, .026, 0, .33, .16, { sy: 1.8, w: 7, h: 5 });
  const shade = cylinder(g, M.lampShade, .08, .045, .10, 16, 0, .25, .16, { open: true });
  shade.castShadow = false;
  g.userData.hideInCutaway = true;
  ctx.hiddenGroup.add(g);
}

function addArt(ctx, side, u, y, w, h, art, gold = true) {
  const M = ctx.M;
  if (!art) art = M.art1;
  const p = wallPlacement(ctx.room, side, u, ctx.base + y, .10);
  const a = framedArt(M, { width: w, height: h, art, gold });
  a.position.set(p.pos[0], p.pos[1], p.pos[2]);
  a.rotation.y = p.ry;
  a.userData.hideInCutaway = true;
  ctx.hiddenGroup.add(a);
  return a;
}

function addMirror(ctx, side, u, y, w, h, oval = false) {
  const M = ctx.M;
  const p = wallPlacement(ctx.room, side, u, ctx.base + y, .10);
  const m = mirror(M, { width: w, height: h, shape: oval ? 'oval' : 'rect' });
  m.position.set(p.pos[0], p.pos[1], p.pos[2]);
  m.rotation.y = p.ry;
  m.userData.hideInCutaway = true;
  ctx.hiddenGroup.add(m);
  return m;
}

function addBaseboards(ctx) {
  const M = ctx.M;
  const room = ctx.room;
  const [x0, x1, z0, z1] = room.bounds;
  const h = .16, t = .055;
  const doorGaps = (side) => (room.doors || []).filter(d => d.side === side).map(d => [d.u - d.w / 2 - .06, d.u + d.w / 2 + .06]).sort((a, b) => a[0] - b[0]);
  const segments = (from, to, gaps) => {
    const out = [];
    let c = from;
    for (const [a, b] of gaps) {
      if (b <= c) continue;
      if (a > c) out.push([c, Math.min(a, to)]);
      c = Math.max(c, b);
    }
    if (c < to) out.push([c, to]);
    return out.filter(([a, b]) => b - a > .06);
  };
  const strip = (axis, fixed, a, b) => {
    if (axis === 'x') box(ctx.shell, M.whiteTrim, b - a, h, t, (a + b) / 2, ctx.base + h / 2, fixed);
    else box(ctx.shell, M.whiteTrim, t, h, b - a, fixed, ctx.base + h / 2, (a + b) / 2);
  };
  for (const [a, b] of segments(x0, x1, doorGaps('north'))) strip('x', z0 + t / 2, a, b);
  for (const [a, b] of segments(x0, x1, doorGaps('south'))) strip('x', z1 - t / 2, a, b);
  for (const [a, b] of segments(z0, z1, doorGaps('west'))) strip('z', x0 + t / 2, a, b);
  for (const [a, b] of segments(z0, z1, doorGaps('east'))) strip('z', x1 - t / 2, a, b);
}

function addCurtains(ctx, wall, u, windowWidth, opts = {}) {
  const M = ctx.M;
  const room = ctx.room;
  const g = grp('Silk_Curtains');
  const p = wallPlacement(room, wall, u, ctx.base, .14);
  g.position.set(p.pos[0], ctx.base, p.pos[2]); g.rotation.y = p.ry;
  const top = opts.top ?? 2.92;
  const mat = opts.mat ?? ctx.curtainMat;
  const rodMat = M.brass;
  cylinder(g, rodMat, .018, .018, windowWidth + 1.1, 8, 0, top + .16, .05, { rz: PI / 2 });
  for (const sx of [-1, 1]) {
    sphere(g, rodMat, .055, sx * (windowWidth / 2 + .55), top + .16, .05, { sx: 1.2, sy: 1, sz: 1 });
    sphere(g, rodMat, .028, sx * (windowWidth / 2 + .64), top + .16, .05);
  }
  for (const sx of [-1, 1]) {
    const panel = new THREE.Mesh(curtainGeometry(.62, top, .07), mat);
    panel.position.set(sx * (windowWidth / 2 + .30), top / 2, .10);
    panel.rotation.y = sx * -.28;
    panel.castShadow = true; panel.receiveShadow = true;
    g.add(panel);
    // inner linen sheer
    const sheer = new THREE.Mesh(curtainGeometry(.48, top - .05, .035, 16), M.linenCream);
    sheer.position.set(sx * (windowWidth / 2 - .14), top / 2 - .03, .045);
    sheer.rotation.y = sx * -.12; sheer.castShadow = false; g.add(sheer);
    torus(g, M.brass, .095, .013, sx * (windowWidth / 2 + .25), top * .48, .15, { rx: PI / 2, radial: 16 }).scale.set(1, 1.5, 1);
  }
  // softly scalloped valance
  const val = new THREE.Mesh(curtainGeometry(windowWidth + 1.0, .28, .035, 16), mat);
  val.position.set(0, top - .02, .12); g.add(val);
  box(g, M.gold, windowWidth + 1.0, .015, .018, 0, top - .17, .17, { cast: false });
  g.userData.hideInCutaway = true;
  ctx.hiddenGroup.add(g);
  return g;
}

function addChandelier(ctx, x, z, opts = {}) {
  const M = ctx.M;
  const g = chandelier(M, { tiers: opts.tiers ?? 2, arms: opts.arms ?? 8, drop: opts.drop ?? 1.05, scale: opts.scale ?? 1 });
  g.position.set(x, ctx.base + ctx.floor.height - .03, z);
  g.userData.hideInCutaway = true;
  ctx.hiddenGroup.add(g);
  // ceiling rose
  const rose = grp('Ceiling_Rose');
  rose.position.set(x, ctx.base + ctx.floor.height - .04, z);
  cylinder(rose, M.whiteTrim, opts.scale ? .45 * opts.scale : .45, opts.scale ? .55 * opts.scale : .55, .035, 24, 0, 0, 0);
  torus(rose, M.gold, opts.scale ? .33 * opts.scale : .33, .01, 0, -.026, 0, { rx: PI / 2, radial: 28 });
  rose.userData.hideInCutaway = true;
  ctx.hiddenGroup.add(rose);
  ctx.nightSpots.push({ room: ctx.room.id, kind: 'chandelier', pos: [x, ctx.base + ctx.floor.height - .55, z], color: 0xffc685 });
}

function addPendant(ctx, x, z, opts = {}) {
  const M = ctx.M;
  const g = grp('Brass_Pendant');
  const top = ctx.base + ctx.floor.height - .02;
  g.position.set(x, top, z);
  cylinder(g, M.brass, .008, .008, opts.drop ?? .7, 6, 0, -(opts.drop ?? .7) / 2, 0);
  const y = -(opts.drop ?? .7);
  cylinder(g, M.brass, .16, .19, .05, 20, 0, y, 0);
  cylinder(g, M.lampShade, .13, .23, .22, 22, 0, y - .12, 0, { open: true });
  sphere(g, M.bulb, .032, 0, y - .13, 0);
  g.userData.hideInCutaway = true;
  ctx.hiddenGroup.add(g);
  return g;
}

function register(ctx, id, group, opts = {}) {
  const { x = 0, z = 0, y = 0, ry = 0, kind = 'furniture', fixed = false, collide = true, support = 'floor', hide = false, footprintPad = 0 } = opts;
  group.position.set(x, ctx.base + y, z);
  group.rotation.y = ry;
  group.name = id;
  (hide ? ctx.hiddenGroup : ctx.baseGroup).add(group);
  const item = {
    id, roomId: ctx.room.id, roomName: ctx.room.name, floor: ctx.floor.index, group,
    kind, fixed, collide, support, pad: footprintPad, initial: { x, z, y },
  };
  ctx.items.push(item);
  return group;
}

function addPlant(ctx, id, x, z, size = 1, kind = 'palm', fixed = false) {
  const p = pottedPlant(ctx.M, { size, kind, seed: id.length * 7 + 3 });
  return register(ctx, id, p, { x, z, kind: 'plant', fixed });
}

function addLampOnTable(ctx, parent, x, y, z, scale = 1) {
  addTableLamp(ctx.M, parent, x, y, z, scale);
}

function roundTable(M, opts = {}) {
  const { r = .72, h = .76 } = opts;
  const g = grp('Round_Center_Table');
  cylinder(g, M.marble, r, r, .055, 40, 0, h, 0);
  torus(g, M.brass, r * .96, .014, 0, h + .035, 0, { rx: PI / 2, radial: 40 });
  lathe(g, M.walnut, [[.08, 0], [.18, .04], [.12, .18], [.08, .38], [.14, .58], [.10, h - .06]], 18, 0, 0, 0);
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * PI * 2;
    const foot = box(g, M.walnut, .42, .055, .1, Math.cos(a) * .17, .05, Math.sin(a) * .17);
    foot.rotation.y = -a;
  }
  addVase(M, g, 0, h + .04, 0, 1.1);
  return g;
}

function windowSeat(M, width, fabric = M.linenCream) {
  const g = grp('Window_Seat');
  const d = .48;
  box(g, M.walnut, width, .11, d, 0, .34, 0);
  roundedBox(g, fabric, width - .08, .16, d - .03, .06, 0, .46, 0);
  for (let i = -1; i <= 1; i++) roundedBox(g, i === 0 ? M.velvetRust : M.linen, .34, .34, .14, .06, i * width / 3, .64, -.11, { rx: -.2 });
  for (let i = 0; i < 4; i++) roundedBox(g, fabric, .06, .3, d - .06, .02, -width / 2 + .12 + i * (width - .24) / 3, .3, 0);
  for (const x of [-width / 2 + .1, width / 2 - .1]) for (const z of [-d / 2 + .08, d / 2 - .08]) box(g, M.brass, .05, .32, .05, x, .16, z);
  return g;
}

function barCart(M) {
  const g = grp('Bar_Cart');
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) cylinder(g, M.brass, .015, .018, .82, 8, sx * .46, .41, sz * .24);
    torus(g, M.brass, .16, .012, sx * .46, .06, 0, { ry: PI / 2, radial: 16 });
  }
  for (const y of [.26, .68]) box(g, M.glass, .98, .02, .54, 0, y, 0);
  box(g, M.brass, .98, .025, .025, 0, .86, -.24);
  box(g, M.brass, .98, .025, .025, 0, .86, .24);
  for (let i = 0; i < 6; i++) {
    const x = -.32 + (i % 3) * .3;
    const z = i < 3 ? .1 : -.1;
    lathe(g, i % 2 ? M.blueCeramic : M.ivoryCeramic, [[0, 0], [.045, 0], [.055, .08], [.035, .16], [.04, .2]], 12, x, .70, z);
  }
  cylinder(g, M.brass, .04, .055, .12, 10, .32, .73, .08);
  return g;
}

function compactVanity(M, width = 1.7, depth = .52, height = .84) {
  const g = vanity(M, { width, depth, height });
  return g;
}

function makeupTable(M) {
  const g = grp('Makeup_Vanity');
  const w = 1.35, d = .5, h = .76;
  box(g, M.walnut, w, .05, d, 0, h, 0);
  box(g, M.marble, w + .04, .03, d + .03, 0, h + .025, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) lathe(g, M.walnut, [[.023, 0], [.04, .02], [.025, .3], [.035, h - .08]], 8, sx * (w / 2 - .09), 0, sz * (d / 2 - .07));
  for (const y of [.22, .40]) box(g, M.walnut, w - .16, .12, d - .08, 0, y, 0);
  for (const sx of [-1, 1]) {
    const x = sx * w * .24;
    sphere(g, M.brass, .016, x, .5, d / 2 + .01);
  }
  // mirror and cosmetics
  const mir = mirror(M, { width: .72, height: .82, shape: 'oval', frame: .035 });
  mir.position.set(0, h + .56, -.18); mir.rotation.x = .08; g.add(mir);
  for (let i = 0; i < 4; i++) lathe(g, i % 2 ? M.ivoryCeramic : M.blueCeramic, [[0, 0], [.03, 0], [.035, .09], [.02, .13]], 10, -.4 + i * .19, h + .04, .06);
  box(g, M.linenRose, .35, .045, .22, .34, h + .05, .07, { ry: .1 });
  return g;
}

function artEasel(M) { return easel(M); }

function projector(M) {
  const g = grp('Projector');
  cylinder(g, M.iron, .04, .05, .35, 8, 0, 0, 0);
  box(g, M.blackLacquer, .52, .18, .36, 0, -.28, 0);
  cylinder(g, M.glass, .085, .085, .05, 16, .1, -.28, .2, { rx: PI / 2 });
  for (let i = 0; i < 4; i++) sphere(g, M.bulb, .012, -.15 + i * .1, -.28, .19);
  return g;
}

function yogaMat(M) {
  const g = grp('Yoga_Mat');
  roundedBox(g, M.linenSage, 2.5, .02, 1.0, .06, 0, .015, 0);
  for (let i = 0; i < 3; i++) box(g, M.gold, 2.45, .002, .012, 0, .028, -.42 + i * .42, { cast: false });
  const towel = roundedBox(g, M.linenCream, .45, .03, .3, .04, .75, .03, .15);
  return g;
}

function fullLengthMirror(M) {
  const g = grp('Cheval_Mirror');
  const frame = mirror(M, { width: .72, height: 1.55, frame: .05 });
  frame.position.set(0, 1.45, 0); frame.rotation.x = -.07; g.add(frame);
  for (const sx of [-1, 1]) {
    box(g, M.walnut, .06, 1.75, .06, sx * .42, .875, -.08);
    box(g, M.brass, .018, .02, .4, sx * .42, .06, .1);
  }
  box(g, M.walnut, .9, .055, .36, 0, .035, 0);
  return g;
}

/** context helper */
class RoomContext {
  constructor(M, floor, room, shell, baseGroup, hiddenGroup, items) {
    this.M = M; this.floor = floor; this.room = room; this.shell = shell;
    this.baseGroup = baseGroup; this.hiddenGroup = hiddenGroup; this.items = items;
    this.base = floor.base;
    this.nightSpots = [];
    const curtainBase = {
      salon: M.velvetBlue, dining: M.velvetRust, vestibule: M.velvetBlue,
      library: M.velvetSage, 'master-suite': M.velvetSage, 'master-bath': M.velvetBlue,
      dressing: M.velvetRust, 'guest-1': M.velvetBlue, 'guest-2': M.velvetSage,
      'guest-bath': M.velvetBlue, 'family-lounge': M.velvetSage, 'belvedere': M.velvetBlue,
      'suite-3': M.velvetRust, atelier: M.velvetRust, gym: M.velvetSage,
    }[room.id] || M.velvetBlue;
    this.curtainMat = curtainBase.clone();
    this.curtainMat.side = THREE.DoubleSide;
    this.curtainMat.name = `${room.id}_silk_curtain`;
    this.curtainAccent = M.velvetRust.clone();
    this.curtainAccent.side = THREE.DoubleSide;
    this.curtainAccent.name = `${room.id}_curtain_accent`;
  }
  floorRect(mat, x0, x1, z0, z1, uv, inset) { return floorRect(this, mat, x0, x1, z0, z1, uv, inset); }
  add(id, group, opts) { return register(this, id, group, opts); }
  featureWall(side, u, width, opts = {}) {
    return makeFeatureWall(this, side, u, width, opts);
  }
  art(side, u, y, w, h, art, gold) { return addArt(this, side, u, y, w, h, art, gold); }
  mirror(side, u, y, w, h, oval) { return addMirror(this, side, u, y, w, h, oval); }
  sconce(side, u, y) { addSconce(this, side, u, y); }
  curtains(wall, u, width, opts) { addCurtains(this, wall, u, width, opts); }
  chandelier(x, z, opts) { addChandelier(this, x, z, opts); }
  pendant(x, z, opts) { addPendant(this, x, z, opts); }
  rug(w, d, x, z, mat, opts = {}) {
    const geo = scaleUV(new THREE.PlaneGeometry(w, d), w / 1.3, d / 1.3);
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -PI / 2; m.rotation.z = opts.ry || 0;
    m.position.set(x, this.base + .031, z);
    m.receiveShadow = true;
    this.baseGroup.add(m);
    return m;
  }
}

/* Content builders are defined below; we use module-level M from a local
   material bundle passed via context to avoid a fragile global. */

function buildSalon(c) {
  const M = c.M, [x0, x1, z0, z1] = c.room.bounds;
  c.floorRect(M.marble, x0, x1, z0, z1, 2.2);
  // inlay border
  for (const [w, d, x, z] of [[x1 - x0 - .5, .08, (x0 + x1) / 2, z0 + .32], [x1 - x0 - .5, .08, (x0 + x1) / 2, z1 - .32], [.08, z1 - z0 - .5, x0 + .32, (z0 + z1) / 2], [.08, z1 - z0 - .5, x1 - .32, (z0 + z1) / 2]]) {
    box(c.shell, M.marbleDark, w, .012, d, x, c.base + .026, z, { cast: false });
  }
  c.rug(5.2, 4.5, -6.9, 3.15, M.rugPersian);
  c.featureWall('north', -5.75, 3.1, { paper: M.wallpaper });
  // fireplace on east partition, pulled in so its stone back sits inside the room
  const fp = fireplace(M, { width: 2.05, height: 1.26 });
  c.add('salon-fireplace', fp, { x: x1 - .30, z: 1.8, ry: -PI / 2, kind: 'fireplace', fixed: true, collide: false, support: 'floor' });
  // main seating faces the fire
  c.add('salon-sofa', sofa(M, { width: 2.75, depth: 1.04, fabric: M.linenCream, accent: M.velvetBlue }), { x: -8.45, z: 2.98, ry: PI / 2, kind: 'sofa', fixed: true });
  const ct = coffeeTable(M, { width: 1.7, depth: .96, shape: 'oval' });
  c.add('salon-coffee-table', ct, { x: -6.35, z: 2.98, ry: PI / 2, kind: 'table', fixed: true });
  c.add('salon-chair-a', armchair(M, { fabric: M.velvetBlue, accent: M.linen }), { x: -4.95, z: 1.92, ry: -PI / 2, kind: 'chair' });
  c.add('salon-chair-b', armchair(M, { fabric: M.velvetBlue, accent: M.linen }), { x: -4.95, z: 4.12, ry: -PI / 2, kind: 'chair' });
  c.add('salon-side-table', sideTable(M), { x: -5.12, z: 3.02, kind: 'table' });
  // piano in the window corner
  c.add('salon-piano', grandPiano(M), { x: -10.2, z: 5.65, ry: PI / 2, kind: 'piano', fixed: true });
  // console + painting on the north wall
  const con = consoleTable(M, { width: 1.55 });
  addVase(M, con, -.38, .88, -.02, .75);
  addLampOnTable(c, con, .42, .88, -.02, .55);
  c.add('salon-console', con, { x: -11.0, z: .95, kind: 'console', fixed: true });
  c.art('north', -11.0, c.floor.height - .74, 1.15, .88, M.art2, true);
  c.sconce('north', -10.28, 2.12); c.sconce('north', -6.5, 2.12);
  c.add('salon-floor-lamp', floorLamp(M), { x: -9.7, z: 6.9, kind: 'lamp' });
  addPlant(c, 'salon-plant', -4.05, 6.95, 1.05, 'palm');
  c.chandelier(-7.4, 3.4, { arms: 10, drop: 1.15, scale: 1.02 });
  c.curtains('south', -6.55, 1.9, { top: 2.96 });
  c.curtains('south', -10.7, 1.5, { top: 2.96 });
  c.curtains('west', 4.9, 1.45, { top: 2.96 });
  c.rug(1.35, 2.0, -10.8, 6.5, M.rugFloral); // piano bench accent rug, non-colliding
}

function buildDining(c) {
  const M = c.M, [x0, x1, z0, z1] = c.room.bounds;
  c.floorRect(M.marble, x0, x1, z0, z1, 2.2);
  for (const [w, d, x, z] of [[x1 - x0 - .55, .09, (x0 + x1) / 2, z0 + .36], [x1 - x0 - .55, .09, (x0 + x1) / 2, z1 - .36], [.09, z1 - z0 - .55, x0 + .36, (z0 + z1) / 2], [.09, z1 - z0 - .55, x1 - .36, (z0 + z1) / 2]]) box(c.shell, M.brass, w, .012, d, x, c.base + .026, z, { cast: false });
  c.rug(6.8, 4.6, 8.0, 4.2, M.rugFloral);
  c.add('dining-table', diningSet(M, { seats: 8 }), { x: 8.0, z: 4.15, kind: 'dining-set', fixed: true });
  const sb = sideboard(M, { width: 2.2, depth: .52 });
  c.add('dining-sideboard', sb, { x: 11.0, z: .96, kind: 'sideboard', fixed: true });
  c.art('north', 11.0, c.floor.height - .72, 1.3, .95, M.art1, true);
  c.featureWall('east', 2.35, 2.5, { paper: M.wallpaperRose });
  c.sconce('east', 1.15, 2.15); c.sconce('east', 3.55, 2.15);
  c.add('dining-cart', barCart(M), { x: 4.25, z: 6.9, kind: 'bar-cart' });
  addPlant(c, 'dining-plant', 4.05, 1.25, .95, 'olive');
  c.add('dining-plant-2', pottedPlant(M, { size: .8, kind: 'hydrangea', seed: 23 }), { x: 12.0, z: 6.85, kind: 'plant' });
  c.chandelier(8.0, 4.15, { arms: 10, drop: 1.1, scale: 1.05 });
  c.curtains('south', 6.55, 1.9, { top: 2.94 });
  c.curtains('south', 10.7, 1.5, { top: 2.94 });
  c.curtains('east', 4.9, 1.45, { top: 2.94 });
}

function buildVestibule(c) {
  const M = c.M, [x0, x1, z0, z1] = c.room.bounds;
  c.floorRect(M.marble, x0, x1, z0, z1, 2.0);
  // central inlaid marble medallion
  const cx = 0, cz = 4.65;
  const med = new THREE.Mesh(new THREE.CircleGeometry(1.6, 48), M.marbleDark);
  med.rotation.x = -PI / 2; med.position.set(cx, c.base + .024, cz); c.baseGroup.add(med);
  const med2 = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.35, 48), M.marble);
  med2.rotation.x = -PI / 2; med2.position.set(cx, c.base + .027, cz); c.baseGroup.add(med2);
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * PI * 2;
    const ray = box(c.baseGroup, M.brass, .025, .006, 1.45, cx + Math.cos(a) * .73, c.base + .03, cz + Math.sin(a) * .73, { ry: -a, cast: false });
  }
  torus(c.baseGroup, M.brass, 1.43, .012, cx, c.base + .03, cz, { rx: PI / 2, radial: 56 });
  c.rug(4.6, 3.5, 0, 4.7, M.rugPersian);
  c.add('vestibule-table', roundTable(M, { r: .78, h: .77 }), { x: 0, z: 4.65, kind: 'center-table', fixed: true });
  for (const sx of [-1, 1]) {
    const con = consoleTable(M, { width: 1.45 });
    addLampOnTable(c, con, -.42, .88, 0, .55);
    addVase(M, con, .38, .88, 0, .7);
    c.add(`vestibule-console-${sx}`, con, { x: sx * 2.56, z: 2.65, ry: -sx * PI / 2, kind: 'console', fixed: true });
    c.mirror(sx < 0 ? 'west' : 'east', 2.55, 1.95, .95, 1.3, true);
    c.sconce(sx < 0 ? 'west' : 'east', 1.55, 1.9);
    c.sconce(sx < 0 ? 'west' : 'east', 3.55, 1.9);
    c.add(`vestibule-plant-${sx}`, pottedPlant(M, { size: .85, kind: 'olive', seed: 11 + sx }), { x: sx * 2.25, z: 7.0, kind: 'plant' });
  }
  c.chandelier(0, 4.65, { arms: 10, drop: 1.0, scale: .92 });
  addPlant(c, 'vestibule-hydrangea', -2.5, 1.6, .7, 'hydrangea');
}

function buildStairHall(c) {
  const M = c.M, [x0, x1, z0, z1] = c.room.bounds;
  c.floorRect(M.marble, x0, x1, z0, z1, 2.0);
  // runner and brass stair details are part of the architectural staircase.
  c.chandelier(0, .55, { arms: 8, drop: 1.25, scale: .8 });
  c.art('south', 0, 0, 1, 1, M.art1, true); // hidden in cutaway; adds a wall accent at the stair
  // stone plinth and a bronze urn beneath the window
  const plinth = grp('Stair_Urn_Plinth');
  box(plinth, M.baseStone, 1.2, .55, .9, 0, .275, 0);
  box(plinth, M.whiteStone, 1.35, .08, 1.02, 0, .59, 0);
  lathe(plinth, M.whiteStone, [[0, 0], [.23, 0], [.28, .06], [.20, .24], [.16, .42], [.24, .55], [.20, .62], [.0, .62]], 22, 0, .63, 0);
  c.add('stair-urn', plinth, { x: 0, z: -6.8, kind: 'urn', fixed: true, collide: false });
  c.sconce('west', .55, 2.25); c.sconce('east', .55, 2.25);
}

function buildLibrary(c) {
  const M = c.M, [x0, x1, z0, z1] = c.room.bounds;
  c.floorRect(M.parquet, x0, x1, z0, z1, 1.2);
  c.rug(5.4, 4.2, -7.6, -4.5, M.rugPersian);
  // two tall bookcases on the inner partition, vertical backs at the wall
  c.add('library-bookcase-a', bookshelf(M, { width: 2.2, height: 2.88, seed: 9 }), { x: -11.25, z: .28, ry: PI, kind: 'bookcase', fixed: true });
  c.add('library-bookcase-b', bookshelf(M, { width: 2.2, height: 2.88, seed: 17 }), { x: -5.78, z: .28, ry: PI, kind: 'bookcase', fixed: true });
  c.add('library-desk', desk(M, { width: 1.9, depth: .92 }), { x: -7.75, z: -4.15, kind: 'desk', fixed: true });
  c.add('library-chair', deskChair(M, { fabric: M.leather }), { x: -7.75, z: -2.95, ry: PI, kind: 'chair' });
  const fp = fireplace(M, { width: 1.9, height: 1.22, overMantel: true, painting: M.art1 });
  c.add('library-fireplace', fp, { x: x1 - .30, z: -2.15, ry: -PI / 2, kind: 'fireplace', fixed: true, collide: false });
  c.add('library-reading-chair', armchair(M, { fabric: M.velvetSage, accent: M.linenRose }), { x: -5.45, z: -2.2, ry: PI / 2, kind: 'chair' });
  c.add('library-reading-table', sideTable(M), { x: -5.4, z: -1.05, kind: 'table' });
  c.add('library-window-seat', windowSeat(M, 1.65, M.linenSage), { x: -10.4, z: -7.24, kind: 'seat', fixed: true });
  c.add('library-floor-lamp', floorLamp(M), { x: -11.65, z: -1.55, kind: 'lamp' });
  addPlant(c, 'library-plant', -11.85, -6.8, .95, 'olive');
  c.featureWall('east', -.55, 1.05, { paper: M.wallpaperBlue, top: 2.9 });
  c.chandelier(-7.6, -3.6, { arms: 8, drop: 1.05, scale: .92 });
  c.curtains('north', -7.1, 1.7, { top: 2.92 });
  c.curtains('north', -10.9, 1.4, { top: 2.92 });
  c.curtains('west', -4.9, 1.45, { top: 2.92 });
  c.art('north', -9.2, 2.45, 1.0, .75, M.art2, true);
}

function buildKitchen(c) {
  const M = c.M, [x0, x1, z0, z1] = c.room.bounds;
  c.floorRect(M.marbleCool, x0, x1, z0, z1, 1.8);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
    if ((i + j) % 2) continue;
    box(c.shell, M.marbleDark, .008, .004, .008, x0 + 1.2 + i * 1.65, c.base + .02, z0 + 1.3 + j * 1.55, { cast: false });
  }
  c.add('kitchen-run', kitchenRun(M, { width: 5.6, depth: .66, height: .92 }), { x: 8.0, z: z0 + .6, kind: 'kitchen', fixed: true });
  c.add('kitchen-island', kitchenIsland(M, { width: 3.3, depth: 1.35 }), { x: 8.4, z: -4.35, kind: 'island', fixed: true });
  c.add('kitchen-pantry', wardrobe(M, { width: 1.8, depth: .62, height: 2.4 }), { x: x1 - .42, z: -1.35, ry: -PI / 2, kind: 'cabinet', fixed: true });
  // breakfast nook
  const bt = roundTable(M, { r: .66, h: .75 });
  const btl = grp('Breakfast_Nook');
  bt.position.set(0, 0, 0); btl.add(bt);
  c.add('kitchen-nook', btl, { x: 5.0, z: -2.25, kind: 'table', fixed: true });
  c.add('kitchen-nook-chair-a', diningChair(M, { fabric: M.linenCream }), { x: 5.0, z: -3.2, ry: 0, kind: 'chair' });
  c.add('kitchen-nook-chair-b', diningChair(M, { fabric: M.linenCream }), { x: 5.0, z: -1.3, ry: PI, kind: 'chair' });
  for (const [x, z] of [[7.2, -4.2], [8.4, -4.2], [9.6, -4.2]]) c.pendant(x, z, { drop: .85 });
  c.add('kitchen-plant', pottedPlant(M, { size: .8, kind: 'olive', seed: 42 }), { x: 4.05, z: -.1, kind: 'plant' });
  c.add('kitchen-bench', bench(M, { width: 1.2, depth: .44, fabric: M.linenSage }), { x: 4.45, z: -4.9, kind: 'bench' });
  c.featureWall('east', 6.2, 1.7, { paper: M.wallpaper, top: 2.9 });
  c.sconce('east', 6.2, 2.2);
}

function buildMasterSuite(c) {
  const M = c.M, [x0, x1, z0, z1] = c.room.bounds;
  c.floorRect(M.parquet, x0, x1, z0, z1, 1.25);
  c.featureWall('north', -7.9, 3.6, { paper: M.wallpaper, top: 3.0 });
  c.rug(5.5, 4.6, -7.9, 3.7, M.rugFloral);
  c.add('master-bed', bed(M, { width: 1.95, length: 2.16, fabric: M.linenCream, headFabric: M.velvetSage, throwMat: M.linenRose }), { x: -7.9, z: 1.92, kind: 'bed', fixed: true });
  c.add('master-nightstand-a', nightstand(M), { x: -9.4, z: 1.55, kind: 'nightstand', fixed: true });
  c.add('master-nightstand-b', nightstand(M), { x: -6.4, z: 1.55, kind: 'nightstand', fixed: true });
  c.add('master-bench', bench(M, { width: 1.4, depth: .46, fabric: M.velvetSage }), { x: -7.9, z: 3.48, kind: 'bench' });
  c.add('master-armchair', armchair(M, { fabric: M.velvetSage, accent: M.linenRose }), { x: -4.95, z: 5.75, ry: -PI / 2 + .35, kind: 'chair' });
  c.add('master-side-table', sideTable(M), { x: -6.2, z: 6.4, kind: 'table' });
  c.add('master-desk', desk(M, { width: 1.8, depth: .88 }), { x: -11.35, z: 5.25, ry: PI / 2, kind: 'desk' });
  c.add('master-desk-chair', deskChair(M, { fabric: M.velvetSage }), { x: -9.9, z: 5.25, ry: -PI / 2, kind: 'chair' });
  const dr = dresser(M, { width: 1.65 });
  addVase(M, dr, -.48, .92, 0, .7);
  c.add('master-dresser', dr, { x: x1 - .28, z: 2.15, ry: -PI / 2, kind: 'dresser' });
  c.add('master-floor-lamp', floorLamp(M), { x: x0 + .8, z: 2.0, kind: 'lamp' });
  addPlant(c, 'master-plant', -4.0, 6.95, .95, 'hydrangea');
  c.chandelier(-7.9, 3.9, { arms: 8, drop: 1.0, scale: .95 });
  c.curtains('south', -7.1, 1.7, { top: 2.96 });
  c.curtains('south', -10.95, 1.4, { top: 2.96 });
  c.curtains('west', 4.9, 1.45, { top: 2.96 });
  c.mirror('east', 2.15, 1.8, .78, 1.15, true);
  c.sconce('north', -9.1, 2.2); c.sconce('north', -6.7, 2.2);
}

function buildMasterBath(c) {
  const M = c.M, [x0, x1, z0, z1] = c.room.bounds;
  c.floorRect(M.marbleCool, x0, x1, z0, z1, 1.0);
  const tub = bathtub(M);
  c.add('bath-tub', tub, { x: -10.85, z: -4.25, kind: 'bathtub', fixed: true });
  const sh = shower(M, { width: 1.55, depth: 1.35 });
  c.add('bath-shower', sh, { x: x0 + .88, z: -1.7, kind: 'shower', fixed: true });
  const van = compactVanity(M, 2.2, .55, .86);
  c.add('bath-vanity', van, { x: -10.35, z: .12, ry: PI, kind: 'vanity', fixed: true });
  c.add('bath-toilet', toilet(M), { x: x0 + .72, z: -6.75, kind: 'toilet', fixed: true });
  c.rug(2.2, 1.4, -9.65, -4.25, M.rugFloral);
  addPlant(c, 'bath-plant', -8.95, -2.25, .65, 'hydrangea');
  c.add('bath-stool', ottoman(M, { r: .32, fabric: M.linenRose }), { x: -9.4, z: -3.75, kind: 'stool' });
  c.pendant(-9.1, -4.25, { drop: .65 });
  c.curtains('west', -4.9, 1.45, { top: 2.92, mat: c.curtainMat });
  c.curtains('north', -10.9, 1.2, { top: 2.92 });
  c.art('east', -3.2, 2.0, .7, .55, M.art1, true);
}

function buildDressing(c) {
  const M = c.M, [x0, x1, z0, z1] = c.room.bounds;
  c.floorRect(M.parquet, x0, x1, z0, z1, 1.25);
  c.rug(4.2, 3.2, -5.7, -3.25, M.rugFloral);
  c.add('dressing-wardrobe-a', wardrobe(M, { width: 2.2, depth: .64, height: 2.28 }), { x: -3.58, z: -1.7, ry: -PI / 2, kind: 'wardrobe', fixed: true });
  c.add('dressing-wardrobe-b', wardrobe(M, { width: 2.2, depth: .64, height: 2.28 }), { x: -7.90, z: -1.0, ry: PI / 2, kind: 'wardrobe', fixed: true });
  c.add('dressing-vanity', makeupTable(M), { x: -5.7, z: -7.0, kind: 'vanity' });
  c.add('dressing-stool', ottoman(M, { r: .36, fabric: M.velvetRose ?? M.linenRose }), { x: -5.7, z: -6.05, kind: 'stool' });
  c.add('dressing-mirror', fullLengthMirror(M), { x: -7.7, z: -6.95, ry: .35, kind: 'mirror', fixed: true, collide: false });
  addPlant(c, 'dressing-plant', -4.35, -6.9, .65, 'hydrangea');
  c.featureWall('east', -4.9, 1.3, { paper: M.wallpaperRose });
  c.chandelier(-5.7, -3.2, { arms: 6, drop: .9, scale: .7 });
}

function buildGuest1(c) {
  const M = c.M, [x0, x1, z0, z1] = c.room.bounds;
  c.floorRect(M.parquet, x0, x1, z0, z1, 1.25);
  c.featureWall('north', 7.6, 3.5, { paper: M.wallpaperBlue, top: 2.95 });
  c.rug(5.2, 4.3, 7.6, 3.9, M.rugFloral);
  c.add('guest1-bed', bed(M, { width: 1.9, length: 2.12, fabric: M.linenCream, headFabric: M.velvetBlue, throwMat: M.linenSage }), { x: 7.6, z: 1.92, kind: 'bed', fixed: true });
  c.add('guest1-nightstand-a', nightstand(M), { x: 6.1, z: 1.55, kind: 'nightstand', fixed: true });
  c.add('guest1-nightstand-b', nightstand(M), { x: 9.1, z: 1.55, kind: 'nightstand', fixed: true });
  c.add('guest1-bench', bench(M, { width: 1.28, depth: .44, fabric: M.velvetBlue }), { x: 7.6, z: 3.45, kind: 'bench' });
  c.add('guest1-wardrobe', wardrobe(M, { width: 2.2, depth: .64, height: 2.28 }), { x: x1 - .36, z: 3.0, ry: -PI / 2, kind: 'wardrobe', fixed: true });
  c.add('guest1-chair', armchair(M, { fabric: M.velvetBlue, accent: M.linen }), { x: 10.35, z: 6.15, ry: -2.3, kind: 'chair' });
  c.add('guest1-side', sideTable(M), { x: 11.45, z: 6.15, kind: 'table' });
  addLampOnTable(c, c.items[c.items.length - 1].group, 0, .67, 0, .72);
  addPlant(c, 'guest1-plant', 4.05, 1.2, .85, 'hydrangea');
  c.chandelier(7.6, 4.0, { arms: 6, drop: .92, scale: .8 });
  c.curtains('south', 7.1, 1.7, { top: 2.92 });
  c.curtains('south', 10.95, 1.4, { top: 2.92, mat: c.curtainMat });
  c.curtains('east', 4.9, 1.4, { top: 2.92 });
  c.sconce('north', 5.9, 2.2); c.sconce('north', 9.3, 2.2);
}

function buildGuest2(c) {
  const M = c.M, [x0, x1, z0, z1] = c.room.bounds;
  c.floorRect(M.parquet, x0, x1, z0, z1, 1.25);
  c.featureWall('west', -2.5, 3.2, { paper: M.wallpaper, top: 2.9 });
  c.rug(4.6, 4.1, 5.5, -2.6, M.rugPersian);
  c.add('guest2-bed', bed(M, { width: 1.9, length: 2.12, fabric: M.linenCream, headFabric: M.velvetSage, throwMat: M.linenRose }), { x: 4.45, z: -2.55, ry: PI / 2, kind: 'bed', fixed: true });
  c.add('guest2-nightstand-a', nightstand(M), { x: 3.62, z: -3.9, ry: PI / 2, kind: 'nightstand', fixed: true });
  c.add('guest2-nightstand-b', nightstand(M), { x: 3.62, z: -1.2, ry: PI / 2, kind: 'nightstand', fixed: true });
  c.add('guest2-bench', bench(M, { width: 1.2, depth: .42, fabric: M.velvetSage }), { x: 6.35, z: -2.55, ry: PI / 2, kind: 'bench' });
  c.add('guest2-desk', desk(M, { width: 1.7, depth: .82 }), { x: 7.05, z: -6.95, kind: 'desk' });
  c.add('guest2-chair', deskChair(M, { fabric: M.leather }), { x: 7.05, z: -5.65, ry: PI, kind: 'chair' });
  c.add('guest2-wardrobe', wardrobe(M, { width: 2.0, depth: .62, height: 2.28 }), { x: x1 - .40, z: -1.35, ry: -PI / 2, kind: 'wardrobe', fixed: true });
  c.add('guest2-chair', armchair(M, { fabric: M.velvetSage, accent: M.linenRose }), { x: 7.95, z: -4.55, ry: -2.0, kind: 'chair' });
  addPlant(c, 'guest2-plant', 8.3, .0, .65, 'hydrangea');
  c.chandelier(6.2, -3.0, { arms: 6, drop: .92, scale: .76 });
  c.curtains('north', 7.3, 1.4, { top: 2.92 });
  c.sconce('west', -2.5, 2.1);
}

function buildGuestBath(c) {
  const M = c.M, [x0, x1, z0, z1] = c.room.bounds;
  c.floorRect(M.marbleCool, x0, x1, z0, z1, .9);
  const van = compactVanity(M, 1.8, .5, .84);
  c.add('guestbath-vanity', van, { x: 10.75, z: -7.28, kind: 'vanity', fixed: true });
  c.add('guestbath-shower', shower(M, { width: 1.5, depth: 1.25 }), { x: x1 - .82, z: -4.25, kind: 'shower', fixed: true });
  c.add('guestbath-toilet', toilet(M), { x: 9.35, z: -5.15, kind: 'toilet', fixed: true });
  c.rug(2.0, 1.2, 10.7, -4.0, M.rugFloral);
  addPlant(c, 'guestbath-plant', 9.2, -.1, .55, 'hydrangea');
  c.pendant(10.7, -4.2, { drop: .6 });
  c.curtains('north', 10.9, 1.2, { top: 2.9 });
  c.art('west', -.6, 2.0, .6, .8, M.art2, true);
}

function buildFamilyLounge(c) {
  const M = c.M, [x0, x1, z0, z1] = c.room.bounds;
  c.floorRect(M.parquet, x0, x1, z0, z1, 1.25);
  c.rug(4.5, 4.9, 0, 4.35, M.rugPersian);
  c.add('lounge-loveseat-a', loveseat(M, { fabric: M.velvetSage, accent: M.linenRose }), { x: 0, z: 2.75, ry: 0, kind: 'sofa', fixed: true });
  c.add('lounge-loveseat-b', loveseat(M, { fabric: M.velvetSage, accent: M.linenRose }), { x: 0, z: 6.22, ry: PI, kind: 'sofa', fixed: true });
  c.add('lounge-table', coffeeTable(M, { width: 1.35, depth: .8, shape: 'oval' }), { x: 0, z: 4.45, kind: 'table', fixed: true });
  c.add('lounge-armchair', armchair(M, { fabric: M.linenCream, accent: M.velvetBlue }), { x: 2.1, z: 4.45, ry: -PI / 2, kind: 'chair' });
  c.add('lounge-plant', pottedPlant(M, { size: .9, kind: 'hydrangea', seed: 8 }), { x: -2.3, z: 6.9, kind: 'plant' });
  c.add('lounge-floor-lamp', floorLamp(M), { x: -2.25, z: 2.0, kind: 'lamp' });
  c.chandelier(0, 4.35, { arms: 8, drop: .95, scale: .76 });
  c.curtains('south', 0, 2.05, { top: 2.92 });
  c.mirror('east', 3.65, 1.65, .6, .9, true);
  c.art('west', 3.9, 1.9, .7, .85, M.art1, true);
}

function buildLanding1(c) {
  const M = c.M;
  c.chandelier(0, -6.55, { arms: 4, drop: .75, scale: .55 });
  c.add('landing1-bench', bench(M, { width: 1.4, depth: .46, fabric: M.velvetSage }), { x: 0, z: -7.05, kind: 'bench' });
  c.add('landing1-plant', pottedPlant(M, { size: 1.0, kind: 'palm', seed: 53 }), { x: 2.25, z: -7.0, kind: 'plant' });
  c.mirror('east', .25, 1.75, .62, .95, true);
}

function buildBelvedere(c) {
  const M = c.M, [x0, x1, z0, z1] = c.room.bounds;
  c.floorRect(M.parquet, x0, x1, z0, z1, 1.25);
  for (const [w, d, x, z] of [[x1 - x0 - .6, .08, (x0 + x1) / 2, z0 + .4], [x1 - x0 - .6, .08, (x0 + x1) / 2, z1 - .4]]) box(c.shell, M.marbleDark, w, .012, d, x, c.base + .026, z, { cast: false });
  c.rug(4.6, 3.6, 0, 3.0, M.rugPersian);
  c.add('belvedere-piano', grandPiano(M), { x: -1.15, z: 3.55, ry: 0, kind: 'piano', fixed: true });
  c.add('belvedere-chair', armchair(M, { fabric: M.velvetBlue, accent: M.linen }), { x: 2.45, z: 2.9, ry: -2.2, kind: 'chair' });
  c.add('belvedere-side', sideTable(M), { x: 2.9, z: 4.0, kind: 'table' });
  c.add('belvedere-console', consoleTable(M, { width: 1.4 }), { x: 3.58, z: 5.45, ry: -PI / 2, kind: 'console', fixed: true });
  addVase(M, c.items[c.items.length - 1].group, 0, .88, 0, .7);
  c.add('belvedere-telescope', telescope(M), { x: 2.75, z: 6.85, ry: -PI / 2, kind: 'telescope' });
  c.add('belvedere-daybed', armchair(M, { fabric: M.linenCream, accent: M.velvetRust }), { x: -2.6, z: 6.35, ry: .7, kind: 'chair' });
  addPlant(c, 'belvedere-plant', -3.35, 1.9, .9, 'palm');
  c.chandelier(0, 4.25, { arms: 8, drop: 1.15, scale: .8 });
  c.curtains('south', 0, 1.95, { top: 2.98, mat: c.curtainMat });
  c.curtains('south', -2.75, 1.3, { top: 2.98 });
  c.curtains('south', 2.75, 1.3, { top: 2.98 });
  c.art('west', 4.0, 1.9, .9, .7, M.art1, true);
}

function buildSuite3(c) {
  const M = c.M, [x0, x1, z0, z1] = c.room.bounds;
  c.floorRect(M.parquet, x0, x1, z0, z1, 1.25);
  c.featureWall('north', -7.9, 3.5, { paper: M.wallpaperRose, top: 2.95 });
  c.rug(5.2, 4.3, -7.9, 3.7, M.rugFloral);
  c.add('suite3-bed', bed(M, { width: 1.9, length: 2.12, fabric: M.linenCream, headFabric: M.velvetRust, throwMat: M.linenSage }), { x: -7.9, z: 1.92, kind: 'bed', fixed: true });
  c.add('suite3-nightstand-a', nightstand(M), { x: -9.4, z: 1.55, kind: 'nightstand', fixed: true });
  c.add('suite3-nightstand-b', nightstand(M), { x: -6.4, z: 1.55, kind: 'nightstand', fixed: true });
  c.add('suite3-bench', bench(M, { width: 1.3, depth: .44, fabric: M.velvetRust }), { x: -7.9, z: 3.48, kind: 'bench' });
  c.add('suite3-wardrobe', wardrobe(M, { width: 2.2, depth: .64, height: 2.28 }), { x: -12.22, z: 3.1, ry: PI / 2, kind: 'wardrobe', fixed: true });
  c.add('suite3-desk', desk(M, { width: 1.75, depth: .86 }), { x: -11.25, z: 5.25, ry: PI / 2, kind: 'desk' });
  c.add('suite3-chair', deskChair(M, { fabric: M.velvetRust }), { x: -9.85, z: 5.25, ry: -PI / 2, kind: 'chair' });
  c.add('suite3-armchair', armchair(M, { fabric: M.linenCream, accent: M.velvetRust }), { x: -5.85, z: 6.15, ry: -PI / 2 - .35, kind: 'chair' });
  c.add('suite3-side', sideTable(M), { x: -6.1, z: 6.4, kind: 'table' });
  addPlant(c, 'suite3-plant', -4.35, 6.95, .8, 'hydrangea');
  c.chandelier(-7.9, 3.9, { arms: 6, drop: .95, scale: .78 });
  c.curtains('south', -7.1, 1.6, { top: 2.92 });
  c.curtains('south', -10.85, 1.3, { top: 2.92 });
  c.curtains('west', 4.9, 1.4, { top: 2.92 });
  c.sconce('north', -9.1, 2.2); c.sconce('north', -6.7, 2.2);
}

function buildAtelier(c) {
  const M = c.M, [x0, x1, z0, z1] = c.room.bounds;
  c.floorRect(M.parquet, x0, x1, z0, z1, 1.2);
  // painter's worktable
  const wt = grp('Atelier_Worktable');
  const w = 2.3, d = 1.05, h = .82;
  box(wt, M.oak, w, .06, d, 0, h, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(wt, M.oak, .07, h, .07, sx * (w / 2 - .1), h / 2, sz * (d / 2 - .1));
  box(wt, M.oak, w - .35, .06, .4, 0, .28, 0);
  for (let i = 0; i < 8; i++) {
    const mat = [M.blueCeramic, M.terracotta, M.ivoryCeramic][i % 3];
    lathe(wt, mat, [[0, 0], [.04, 0], [.045, .08], [.03, .13], [.035, .16]], 10, -.8 + i * .22, h + .04, -.28 + (i % 2) * .18);
  }
  for (let i = 0; i < 5; i++) cylinder(wt, M.walnut, .006, .004, .34, 4, -.6 + i * .14, h + .14, .3, { rz: .25 - i * .12, ry: i * .4 });
  box(wt, M.art2, .55, .38, .02, .62, h + .01, .03, { rx: -PI / 2 + .06, ry: .06 });
  c.add('atelier-worktable', wt, { x: 7.8, z: 3.35, kind: 'table', fixed: true });
  c.add('atelier-stool', ottoman(M, { r: .3, fabric: M.linenSage }), { x: 7.8, z: 2.2, kind: 'stool' });
  // easel by the south windows
  c.add('atelier-easel', artEasel(M), { x: 10.5, z: 5.9, ry: PI, kind: 'easel' });
  // paint cabinet
  c.add('atelier-cabinet', bookshelf(M, { width: 1.9, height: 2.3, seed: 77 }), { x: x1 - .42, z: 1.72, ry: -PI / 2, kind: 'cabinet', fixed: true });
  c.add('atelier-sculpture', sculpture(M), { x: 5.2, z: 1.35, kind: 'sculpture' });
  c.add('atelier-chair', armchair(M, { fabric: M.linenCream, accent: M.velvetRust }), { x: 6.25, z: 6.15, ry: -.6, kind: 'chair' });
  c.add('atelier-side', sideTable(M), { x: 6.2, z: 6.55, kind: 'table' });
  addPlant(c, 'atelier-plant', 4.55, 6.9, .9, 'palm');
  c.rug(4.4, 3.2, 7.8, 4.35, M.rugPersian);
  c.chandelier(7.8, 4.4, { arms: 4, drop: .8, scale: .55 });
  c.pendant(10.4, 5.9, { drop: .8 });
  c.curtains('south', 7.1, 1.6, { top: 2.92 });
  c.curtains('south', 10.85, 1.3, { top: 2.92 });
  c.art('west', 4.9, 1.85, .8, .62, M.art2, true);
  c.sconce('west', 6.55, 2.2);
}

function buildCinema(c) {
  const M = c.M, [x0, x1, z0, z1] = c.room.bounds;
  c.floorRect(M.carpet, x0, x1, z0, z1, 2.2);
  // dark acoustic panelling
  for (let i = 0; i < 4; i++) {
    box(c.shell, M.carpet, .05, 2.1, 1.2, x0 + .03, c.base + 1.3, -6.2 + i * 1.35, { cast: false });
    box(c.shell, M.carpet, .05, 2.1, 1.2, x1 - .03, c.base + 1.3, -6.2 + i * 1.35, { cast: false });
  }
  c.add('cinema-screen', cinemaScreen(M, { width: 3.8, height: 2.0 }), { x: -8.3, z: z0 + .36, kind: 'screen', fixed: true, collide: false, support: 'floor' });
  c.add('cinema-console', sideboard(M, { width: 2.0, depth: .45, height: .74 }), { x: -8.3, z: z0 + .92, kind: 'console', fixed: true });
  c.add('cinema-sofa', sectional(M, { fabric: M.carpet }), { x: -8.3, z: -3.2, ry: PI, kind: 'sofa', fixed: true });
  c.add('cinema-table-a', sideTable(M), { x: -10.4, z: -2.2, kind: 'table' });
  c.add('cinema-table-b', sideTable(M), { x: -6.2, z: -2.2, kind: 'table' });
  c.rug(4.4, 3.0, -8.3, -5.25, M.rugPersian);
  c.add('cinema-projector', projector(M), { x: -8.3, y: 2.72, z: -1.05, kind: 'projector', fixed: true, collide: false, support: 'ceiling', hide: true });
  c.add('cinema-loveseat', loveseat(M, { fabric: M.carpet, accent: M.velvetRust }), { x: -6.35, z: -5.95, ry: PI / 2, kind: 'sofa' });
  c.add('cinema-plant', pottedPlant(M, { size: .8, kind: 'olive', seed: 91 }), { x: -11.9, z: -6.7, kind: 'plant' });
  c.pendant(-8.3, -1.2, { drop: .55, shade: true });
  c.sconce('east', -1.0, 2.1);
  c.art('east', -.8, 1.9, .8, .62, M.art1, false);
}

function buildGym(c) {
  const M = c.M, [x0, x1, z0, z1] = c.room.bounds;
  c.floorRect(M.parquet, x0, x1, z0, z1, 1.2);
  const mat = grp('Gym_Rubber_Floor');
  box(mat, M.carpet, 4.6, .035, 2.8, 0, .018, 0);
  c.add('gym-floor', mat, { x: 7.8, z: -4.7, kind: 'floor-mat', fixed: true, collide: false });
  c.add('gym-set', gymSet(M), { x: 7.5, z: -4.55, kind: 'gym', fixed: true, collide: false });
  c.add('gym-yoga', yogaMat(M), { x: 10.7, z: -5.8, kind: 'mat' });
  c.add('gym-bench', bench(M, { width: 1.15, depth: .43, fabric: M.leather }), { x: 10.8, z: -1.55, kind: 'bench' });
  c.add('gym-mirror', fullLengthMirror(M), { x: 6.0, z: -1.2, ry: -.2, kind: 'mirror', fixed: true, collide: false });
  // wall mirror on the inner partition
  const m = mirror(M, { width: 3.2, height: 1.8, frame: .05 });
  const p = wallPlacement(c.room, 'south', 8.5, c.base + 1.55, .08);
  m.position.set(p.pos[0], p.pos[1], p.pos[2]); m.rotation.y = p.ry; m.scale.set(1, 1, 1);
  m.userData.hideInCutaway = true; c.hiddenGroup.add(m);
  c.add('gym-tea-table', sideTable(M), { x: 11.7, z: -1.0, kind: 'table' });
  addPlant(c, 'gym-plant', 5.0, .0, .7, 'olive');
  c.pendant(9.0, -4.7, { drop: .7 });
  c.curtains('north', 7.3, 1.35, { top: 2.9 });
  c.curtains('north', 10.9, 1.15, { top: 2.9 });
  c.art('east', -1.0, 2.1, .7, .5, M.art1, false);
}

function buildLanding3(c) {
  const M = c.M;
  c.add('landing3-sculpture', sculpture(M), { x: 2.5, z: -6.9, kind: 'sculpture' });
  c.add('landing3-bench', bench(M, { width: 1.25, depth: .44, fabric: M.velvetRust }), { x: 0, z: -7.05, kind: 'bench' });
  c.chandelier(0, .6, { arms: 4, drop: .8, scale: .5 });
  c.mirror('west', -.2, 1.8, .7, 1.0, true);
}

const BUILDERS = {
  salon: buildSalon, dining: buildDining, vestibule: buildVestibule, 'stair-gf': buildStairHall,
  library: buildLibrary, kitchen: buildKitchen,
  'master-suite': buildMasterSuite, 'master-bath': buildMasterBath, dressing: buildDressing,
  'guest-1': buildGuest1, 'guest-2': buildGuest2, 'guest-bath': buildGuestBath,
  'family-lounge': buildFamilyLounge, 'landing-1': buildLanding1,
  belvedere: buildBelvedere, 'suite-3': buildSuite3, atelier: buildAtelier,
  cinema: buildCinema, gym: buildGym, 'landing-3': buildLanding3,
};

/* ------------------------------------------------------------------ */
/*  Validation + automatic correction                                 */
/* ------------------------------------------------------------------ */

function bboxOf(obj) {
  obj.updateWorldMatrix(true, true);
  return new THREE.Box3().setFromObject(obj);
}

function isVagueDoorBlocked(room, item, bboxes) {
  if (!item.collide || item.support !== 'floor') return null;
  const box3 = bboxes.get(item);
  if (!box3) return null;
  for (const d of room.doors || []) {
    let zone;
    const depth = .85;
    if (d.side === 'north') zone = new THREE.Box3(new THREE.Vector3(d.u - d.w / 2 - .12, -10, room.bounds[2]), new THREE.Vector3(d.u + d.w / 2 + .12, 20, room.bounds[2] + depth));
    else if (d.side === 'south') zone = new THREE.Box3(new THREE.Vector3(d.u - d.w / 2 - .12, -10, room.bounds[3] - depth), new THREE.Vector3(d.u + d.w / 2 + .12, 20, room.bounds[3]));
    else if (d.side === 'west') zone = new THREE.Box3(new THREE.Vector3(room.bounds[0], -10, d.u - d.w / 2 - .12), new THREE.Vector3(room.bounds[0] + depth, 20, d.u + d.w / 2 + .12));
    else zone = new THREE.Box3(new THREE.Vector3(room.bounds[1] - depth, -10, d.u - d.w / 2 - .12), new THREE.Vector3(room.bounds[1], 20, d.u + d.w / 2 + .12));
    if (box3.intersectsBox(zone)) return d;
  }
  return null;
}

export function validateLayout(M, roomsData, items) {
  const fixes = [];
  const collisions = [];
  const failures = [];
  const roomsById = new Map(roomsData.map(r => [r.id, r]));
  const itemsByRoom = new Map();
  for (const it of items) {
    if (!itemsByRoom.has(it.roomId)) itemsByRoom.set(it.roomId, []);
    itemsByRoom.get(it.roomId).push(it);
  }
  const bboxes = new Map();

  const refresh = () => {
    for (const it of items) {
      it.group.updateWorldMatrix(true, true);
      bboxes.set(it, bboxOf(it.group));
    }
  };
  const roomStatus = (it, checkBounds = true) => {
    const r = roomsById.get(it.roomId);
    const b = bboxes.get(it);
    if (!b) return { bad: true, reason: 'empty' };
    if (it.support === 'wall' || it.support === 'ceiling') return { bad: false };
    if (!Number.isFinite(b.min.x) || b.isEmpty()) return { bad: true, reason: 'empty' };
    let bad = false, reason = '';
    const [x0, x1, z0, z1] = r.bounds;
    const eps = .025;
    if (b.min.x < x0 - eps || b.max.x > x1 + eps || b.min.z < z0 - eps || b.max.z > z1 + eps) {
      bad = true; reason = 'outside room bounds';
    }
    const fl = FLOORS[it.floor].base;
    if (it.support === 'floor' && Math.abs(b.min.y - fl) > .04) { bad = true; reason = 'not resting on floor'; }
    if (b.max.y > fl + FLOORS[it.floor].height - .03) { bad = true; reason = 'crosses ceiling'; }
    if (checkBounds && it.collide && isVagueDoorBlocked(r, it, bboxes)) { bad = true; reason = 'blocks a doorway'; }
    return { bad, reason };
  };
  const collides = (a, b) => {
    if (!a.collide || !b.collide) return false;
    if (a.support !== 'floor' || b.support !== 'floor') return false;
    const A = bboxes.get(a), B = bboxes.get(b);
    if (!A || !B) return false;
    const ix = Math.min(A.max.x, B.max.x) - Math.max(A.min.x, B.min.x);
    const iz = Math.min(A.max.z, B.max.z) - Math.max(A.min.z, B.min.z);
    const iy = Math.min(A.max.y, B.max.y) - Math.max(A.min.y, B.min.y);
    return ix > .035 && iz > .035 && iy > .03;
  };
  const overlapsAny = (item, exclusions = new Set()) => {
    for (const other of items) {
      if (other === item || other.roomId !== item.roomId || exclusions.has(other)) continue;
      if (collides(item, other)) return other;
    }
    return null;
  };

  refresh();
  let failed = [];
  let anyBlocked = true;
  let passes = 0;
  while (anyBlocked && passes < 18) {
    anyBlocked = false;
    for (const it of items) {
      if (it.support === 'wall' || it.support === 'ceiling') continue;
      const st = roomStatus(it);
      const overlap = it.collide ? overlapsAny(it) : null;
      if (!st.bad && !overlap) continue;
      anyBlocked = true;
      const issue = st.bad ? st.reason : 'overlaps another object';
      if (it.fixed) { failed.push({ id: it.id, issue, fixed: true }); continue; }
      const b = bboxes.get(it);
      const room = roomsById.get(it.roomId);
      let dx = 0, dz = 0, dy = 0;
      if (st.reason === 'outside room bounds') {
        if (b.min.x < room.bounds[0] + .02) dx = room.bounds[0] + .02 - b.min.x;
        if (b.max.x > room.bounds[1] - .02) dx = room.bounds[1] - .02 - b.max.x;
        if (b.min.z < room.bounds[2] + .02) dz = room.bounds[2] + .02 - b.min.z;
        if (b.max.z > room.bounds[3] - .02) dz = room.bounds[3] - .02 - b.max.z;
        it.group.position.x += dx; it.group.position.z += dz;
        it.group.updateWorldMatrix(true, true);
        bboxes.set(it, bboxOf(it.group));
        if (overlapsAny(it) || isVagueDoorBlocked(room, it, bboxes)) { /* fall through to search */ }
        else {
          if (dx || dz) fixes.push({ id: it.id, room: it.roomId, issue, from: [b.min.x, b.min.z], to: [it.group.position.x, it.group.position.z], dy: 0 });
          continue;
        }
      } else if (st.reason === 'not resting on floor') {
        dy = FLOORS[it.floor].base - b.min.y;
        it.group.position.y += dy;
        it.group.updateWorldMatrix(true, true);
        bboxes.set(it, bboxOf(it.group));
        if (!overlapsAny(it)) {
          fixes.push({ id: it.id, room: it.roomId, issue, from: [it.group.position.x, it.group.position.z], to: [it.group.position.x, it.group.position.z], dy });
          continue;
        }
      }
      // search a nearby free x/z grid slot
      const r0 = it.group.position.clone();
      let moved = false;
      const candidates = [];
      for (let s = .10; s <= 1.6; s += .10) for (let a = 0; a < 24; a++) candidates.push([Math.cos(a / 24 * PI * 2) * s, Math.sin(a / 24 * PI * 2) * s]);
      for (const [ox, oz] of candidates) {
        it.group.position.x = r0.x + ox; it.group.position.z = r0.z + oz;
        it.group.updateWorldMatrix(true, true);
        const bb = bboxOf(it.group);
        const [rx0, rx1, rz0, rz1] = room.bounds;
        const inRoom = bb.min.x >= rx0 + .03 && bb.max.x <= rx1 - .03 && bb.min.z >= rz0 + .03 && bb.max.z <= rz1 - .03;
        if (!inRoom) continue;
        bboxes.set(it, bb);
        if (!overlapsAny(it) && !isVagueDoorBlocked(room, it, bboxes)) {
          moved = true;
          fixes.push({ id: it.id, room: it.roomId, issue, from: [r0.x, r0.z], to: [it.group.position.x, it.group.position.z], dy: 0 });
          break;
        }
      }
      if (!moved) {
        it.group.position.copy(r0);
        it.group.updateWorldMatrix(true, true);
        bboxes.set(it, bboxOf(it.group));
        failed.push({ id: it.id, issue, fixed: false });
      }
    }
    refresh();
    passes++;
  }

  // Final explicit checks
  const roomSummaries = [];
  for (const room of roomsData) {
    const arr = itemsByRoom.get(room.id) || [];
    let floorCount = 0, collisionsHere = 0;
    for (let i = 0; i < arr.length; i++) {
      const a = arr[i];
      if (a.support === 'floor' && a.collide) floorCount++;
      const st = roomStatus(a);
      if (st.bad) {
        const bb = bboxes.get(a);
        failures.push({
          room: room.id, id: a.id, issue: st.reason,
          bounds: bb ? [ +bb.min.x.toFixed(2), +bb.max.x.toFixed(2), +bb.min.z.toFixed(2), +bb.max.z.toFixed(2) ] : null,
          roomBounds: room.bounds,
        });
      }
      for (let j = i + 1; j < arr.length; j++) {
        const b = arr[j];
        if (collides(a, b)) {
          collisionsHere++;
          const ba = bboxes.get(a), bb = bboxes.get(b);
          collisions.push({
            room: room.id, a: a.id, b: b.id,
            aBounds: ba ? [ +ba.min.x.toFixed(2), +ba.max.x.toFixed(2), +ba.min.z.toFixed(2), +ba.max.z.toFixed(2) ] : null,
            bBounds: bb ? [ +bb.min.x.toFixed(2), +bb.max.x.toFixed(2), +bb.min.z.toFixed(2), +bb.max.z.toFixed(2) ] : null,
          });
        }
      }
    }
    roomSummaries.push({
      id: room.id, name: room.name, floor: room.floor,
      area: +( (room.bounds[1] - room.bounds[0]) * (room.bounds[3] - room.bounds[2]) ).toFixed(1),
      items: arr.length, collidable: floorCount, collisions: collisionsHere,
    });
  }

  // labels checked in plan
  for (const room of roomsData) {
    const [x, z] = room.label;
    const [x0, x1, z0, z1] = room.bounds;
    if (x < x0 || x > x1 || z < z0 || z > z1) failures.push({ room: room.id, id: 'label', issue: 'label outside room' });
  }

  const checkIds = [
    ['bounds', '家具均在房间边界内'],
    ['overlap', '家具之间无穿模/重叠'],
    ['support', '落地家具均有地面支撑'],
    ['ceiling', '所有物件低于净空'],
    ['doors', '门洞与主要通道保持净空'],
    ['labels', '房间标签落位于对应空间'],
  ];
  const failingIds = new Set(failures.map(f => f.issue));
  const checks = checkIds.map(([key, label]) => {
    let bad = false;
    if (key === 'bounds') bad = failures.some(f => /bounds/.test(f.issue));
    if (key === 'overlap') bad = collisions.length > 0;
    if (key === 'support') bad = failures.some(f => /resting|floor/.test(f.issue));
    if (key === 'ceiling') bad = failures.some(f => /ceiling/.test(f.issue));
    if (key === 'doors') bad = failures.some(f => /door/.test(f.issue));
    if (key === 'labels') bad = failures.some(f => f.id === 'label');
    return { id: key, label, status: bad ? 'fail' : 'pass' };
  });
  const totalObjects = items.filter(i => i.support === 'floor').length;
  return {
    ok: failures.length === 0 && collisions.length === 0,
    generatedAt: new Date().toISOString(),
    engine: 'Maison Validation 1.0',
    summary: {
      rooms: roomsData.length, floors: 3, furnitureObjects: totalObjects,
      collidableObjects: roomSummaries.reduce((s, r) => s + r.collidable, 0),
      autoFixes: fixes.length, collisions: collisions.length, failures: failures.length,
      totalArea: +roomsData.reduce((s, r) => s + (r.bounds[1] - r.bounds[0]) * (r.bounds[3] - r.bounds[2]), 0).toFixed(1),
    },
    checks, fixes, collisions, failures, rooms: roomSummaries,
  };
}

/* ------------------------------------------------------------------ */
/*  Public builder                                                    */
/* ------------------------------------------------------------------ */

export function buildInteriors(M, floorGroups, cutShells) {
  const roomsData = SPECS.map(s => {
    const [x0, x1, z0, z1] = s.bounds;
    const f = FLOORS[s.floor];
    return {
      ...s,
      area: +((x1 - x0) * (z1 - z0)).toFixed(1),
      floorName: f.name,
      floorBase: f.base,
      labelY: f.base + 1.58,
      label3: [s.label[0], f.base + 1.58, s.label[1]],
    };
  });
  const items = [];
  for (let fi = 0; fi < 3; fi++) {
    const floor = FLOORS[fi];
    const floorGroup = floorGroups[fi];
    const cutShell = cutShells[fi];
    for (const room of roomsData.filter(r => r.floor === fi)) {
      const roomGroup = grp(`Room_${room.id}`);
      const baseGroup = grp(`RoomBase_${room.id}`);
      const hiddenGroup = grp(`RoomHidden_${room.id}`);
      hiddenGroup.userData.hideInCutaway = true;
      floorGroup.add(roomGroup);
      roomGroup.add(baseGroup, hiddenGroup);
      const c = new RoomContext(M, floor, room, cutShell, baseGroup, hiddenGroup, items);
      try {
        BUILDERS[room.id](c);
        addBaseboards(c);
      } catch (err) {
        console.error('Room build failed:', room.id, err);
        throw err;
      }
    }
  }
  // Validate the intact per-object groups first, applying automatic nudges.
  const validation = validateLayout(M, roomsData, items);
  // Only after the layout has been stabilised do we batch geometry for web.
  for (let fi = 0; fi < 3; fi++) {
    for (const room of roomsData.filter(r => r.floor === fi)) {
      const group = floorGroups[fi].getObjectByName(`Room_${room.id}`);
      if (!group) continue;
      for (const child of [...group.children]) mergeGroup(child);
    }
  }
  // the wallpapers and mouldings went into cutShell; merge those now
  for (const shell of cutShells) mergeGroup(shell);
  return { rooms: roomsData, items, validation };
}

export const ROOM_SPECS = SPECS;
