#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""生成《鸣潮》心月狐（心 / Hsin）人物介绍卡组。

设计遵循 academic-pptx 技能的规范：
- 每页一个「行动标题」（完整句子陈述结论），连读即完整叙事（ghost deck test）
- 每页 ≤40 字正文、一页一图、图左文右、正文字号 ≥20pt、单一无衬线字体
- 每处借用素材在页脚标注来源，末页为完整引用清单
配色不用技能默认的深蓝，而取自角色自身的红黑金，避免装饰性配色。
"""
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Emu, Inches, Pt
from PIL import Image

HERE = Path(__file__).resolve().parent
ASSETS = HERE / "assets" / "prepared"
OUT = HERE / "心月狐-人物介绍.pptx"

# ---------- 设计令牌 ----------
FONT = "微软雅黑"          # 单一无衬线字体
INK = RGBColor(0x1A, 0x1A, 0x1A)
MUTED = RGBColor(0x6E, 0x6E, 0x6E)
ACCENT = RGBColor(0xB3, 0x1E, 0x2E)      # 角色主色：朱红
ACCENT_2 = RGBColor(0x8A, 0x6D, 0x3B)    # 次强调：金
W = 13.333
H = 7.5
M = 0.6                                   # 统一页边距
BODY_W = W - 2 * M

prs = Presentation()
prs.slide_width = Inches(W)
prs.slide_height = Inches(H)
BLANK = prs.slide_layouts[6]


def add_slide():
    return prs.slides.add_slide(BLANK)


def textbox(slide, x, y, w, h):
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = 0
    tf.margin_top = tf.margin_bottom = 0
    return tf


def para(tf, text, size, bold=False, color=INK, first=False, space_before=0,
         line=1.18, bullet=False, indent=0.0):
    p = tf.paragraphs[0] if first else tf.add_paragraph()
    p.line_spacing = line
    p.space_before = Pt(space_before)
    if indent:
        p.left_indent = Inches(indent)
        p.first_line_indent = Inches(-0.22)
    r = p.add_run()
    r.text = ("• " + text) if bullet else text
    r.font.name = FONT
    r.font.size = Pt(size)
    r.font.bold = bold
    r.font.color.rgb = color
    return p


def action_title(slide, text, size=26):
    """行动标题：完整句子，24–28pt 粗体。"""
    tf = textbox(slide, M, 0.45, BODY_W, 1.05)
    para(tf, text, size, bold=True, color=INK, first=True, line=1.1)


def source(slide, text):
    """页脚素材来源，12pt 弱化色。"""
    tf = textbox(slide, M, H - 0.62, BODY_W, 0.4)
    para(tf, text, 11, color=MUTED, first=True)


def fit_image(slide, path, box):
    """等比缩放放进 box=(x, y, w, h)，返回实际占位。"""
    x, y, bw, bh = box
    iw, ih = Image.open(path).size
    scale = min(bw / iw, bh / ih)
    w, h = iw * scale, ih * scale
    left = x + (bw - w) / 2
    top = y + (bh - h) / 2
    slide.shapes.add_picture(str(path), Inches(left), Inches(top), Inches(w), Inches(h))
    return left, top, w, h


def figure_caption(slide, text, x, y, w, align=PP_ALIGN.LEFT):
    tf = textbox(slide, x, y, w, 0.4)
    p = para(tf, text, 12, color=MUTED, first=True, line=1.05)
    p.alignment = align


def annotation(slide, text, x, y, w):
    """图上关键结论标注：朱红加粗，避免观众自己找。"""
    tf = textbox(slide, x, y, w, 0.5)
    para(tf, text, 14, bold=True, color=ACCENT, first=True, line=1.05)


def bullets(slide, items, x, y, w, h, size=20, gap=12):
    tf = textbox(slide, x, y, w, h)
    for i, (text, bold) in enumerate(items):
        para(tf, text, size, bold=bold, color=INK, first=(i == 0),
             space_before=0 if i == 0 else gap, bullet=True, indent=0.28, line=1.22)


# ============ 1. 封面 ============
s = add_slide()
tf = textbox(s, M, 1.55, 7.2, 0.5)
para(tf, "《鸣潮》人物介绍", 18, color=ACCENT, first=True)
tf = textbox(s, M, 2.05, 7.4, 2.2)
para(tf, "心月狐", 54, bold=True, color=INK, first=True, line=1.05)
para(tf, "首位可玩的岁主共鸣者", 26, bold=True, color=ACCENT, space_before=6)
tf = textbox(s, M, 4.35, 7.4, 1.0)
para(tf, "游戏内名称「心」（Hsin）· 五星 · 导电 · 音感仪 · 出身梦州", 18,
     color=INK, first=True, line=1.3)
para(tf, "3.7 版本「镜锁妄世，心照红尘」· 共 10 页", 18, color=MUTED, space_before=6)
fit_image(s, ASSETS / "keyart_37.png", (0.45, 5.45, 8.4, 1.42))
source(s, "封面图：3.7 版本宣传图，转自 4399 手游网《鸣潮 3.7 卡池角色介绍》。角色与图像版权归库洛游戏所有。")

# ============ 2. 为什么值得认识 ============
s = add_slide()
action_title(s, "她不是又一位狐耳角色，而是《鸣潮》首个可玩的岁主共鸣者")
bullets(s, [
    ("此前「岁主」只存在于世界观与剧情之中——玩家能读到、见到，却无法操作", False),
    ("「心」把这一层设定首次变为可操控的战斗单位，角色分量因此不同", True),
    ("同版本另一位五星「锁暝」也来自梦州，两人共享协同攻击机制", False),
], M, 1.85, 7.4, 3.4)
figure_caption(s, "图：3.7 版本「镜锁妄世，心照红尘」宣传图，转自 4399 手游网。", M, 5.9, 7.4)
fit_image(s, ASSETS / "keyart_37.png", (8.25, 1.8, 4.5, 4.4))
source(s, "资料来源：17173《鸣潮》3.7 新角色实机演示报道；4399 手游网《鸣潮》3.7 卡池角色介绍。")

# ============ 3. 基本档案 ============
s = add_slide()
action_title(s, "她的档案：五星导电输出，武器音感仪，出身梦州")
rows = [
    ("名称", "心月狐（游戏内「心」／英文 Hsin）"),
    ("稀有度", "五星"),
    ("属性", "导电（电磁效应体系）"),
    ("武器", "音感仪（专属）"),
    ("出身", "梦州"),
    ("定位", "导电输出，主打共鸣技能伤害"),
]
y = 1.95
for i, (k, v) in enumerate(rows):
    tf = textbox(s, M, y, 1.35, 0.5)
    para(tf, k, 18, bold=True, color=ACCENT, first=True)
    tf = textbox(s, M + 1.45, y, 5.4, 0.5)
    para(tf, v, 18, color=INK, first=True)
    y += 0.68
fit_image(s, ASSETS / "hsin_ingame.png", (7.9, 1.75, 4.85, 4.6))
annotation(s, "↑ 实机画面：白发狐耳 + 红黑金配色，与「国风机关」场景同框", 7.9, 6.35, 4.85)
source(s, "资料来源：17173 实机演示报道、4399《鸣潮 V3.7 心月狐攻略》；图为 17173 新闻配图。")

# ============ 4. 视觉设计 ============
s = add_slide()
action_title(s, "视觉上，狐、机关、红黑金三件事同时讲清楚了她的身份")
bullets(s, [
    ("白发狐耳与赤瞳：一眼识别为狐，且与「月」「火」的妖异气质一致", False),
    ("红黑为主、金色描边：妖艳而非可爱，符合岁主身份的压迫感", False),
    ("赤足与高质感足饰：把「不履尘世」的设定穿在身上", False),
    ("服装上有金属构件与流苏：呼应她精通机关构造的设定", True),
], 5.5, 1.95, 7.2, 3.4)
fit_image(s, ASSETS / "hsin_card.png", (M, 1.75, 4.3, 4.55))
figure_caption(s, "图：官方角色卡（玩家转载），转自 4399 手游网攻略。", M, 6.38, 4.5)
source(s, "资料来源：17173 实机演示报道的角色造型与性格描述；角色卡为官方「共鸣者展示」素材的玩家转载。")

# ============ 5. 梦州的机关师 ============
s = add_slide()
action_title(s, "在世界观里，她是梦州城机关术的创作者，而不只是使用者")
bullets(s, [
    ("精通机关构造技艺，梦州城内诸多经典精巧机关均出自她手", True),
    ("能力底色因此是「造物」而非「法术」——她的战斗读作操控，而非施法", False),
    ("热爱尘世烟火与世间喜乐，性格灵动，与岁主的威权身份形成反差", False),
], M, 2.0, BODY_W, 3.4)
tf = textbox(s, M, 5.6, BODY_W, 0.7)
para(tf, "一句话理解：她是「先造出世界，再走进世界」的角色。", 20,
     bold=True, color=ACCENT, first=True)
source(s, "资料来源：17173《鸣潮》3.7 新角色实机演示报道（2026-09-03）。")

# ============ 6. 万相分形 ============
s = add_slide()
action_title(s, "她的专属异能「万相分形」让一个人同时成为多个人")
bullets(s, [
    ("化一为众：由一个本体分化出多个个体", True),
    ("多体共存：分化出的个体同时在场、同时行动", False),
    ("互通感知：所有个体共享同一套感知，行动因此可以协同", False),
    ("这解释了实机演示里她为何能一边操控机关、一边本体作战", False),
], M, 2.0, BODY_W, 3.5)
tf = textbox(s, M, 5.75, BODY_W, 1.0)
para(tf, "读法：分形不是召唤术，", 23, bold=True, color=ACCENT, first=True, line=1.1)
para(tf, "　　　是「同一意识占据多个身体」。", 23, bold=True, color=ACCENT, space_before=2, line=1.1)
source(s, "资料来源：17173《鸣潮》3.7 新角色实机演示报道；9game《共鸣者「心」、「锁暝」演示发布》。")

# ============ 7. 双形态 ============
s = add_slide()
action_title(s, "战斗上她有两套形态：常规形态与白狐形态")
bullets(s, [
    ("双形态作战是她的核心机制，也是上手门槛主要来源", True),
    ("形态切换承接「万相分形」的设定：同一意识，不同形体", False),
    ("输出属性为导电，专属武器为音感仪，围绕共鸣技能组织伤害", False),
    ("定位是主 C：队伍资源向她集中，收益高于分摊", False),
], M, 2.0, 7.4, 3.7)
fit_image(s, ASSETS / "hsin_art.png", (8.15, 1.75, 4.6, 4.3))
figure_caption(s, "图：实机立绘，转自 4399 手游网攻略（已裁去字幕）。", 8.15, 6.15, 4.6)
source(s, "资料来源：17173 实机演示报道（双形态、导电、音感仪）；4399《鸣潮 V3.7 心月狐攻略》（定位）。")

# ============ 8. 配队 ============
s = add_slide()
action_title(s, "配队上，她与「锁暝」的协同攻击把双导电变成一套机制")
bullets(s, [
    ("锁暝 → 心：切换时触发周期性雷击，持续压制敌人", False),
    ("心 → 锁暝：反向切换召唤枪状造物，持续输出伤害", False),
    ("两边都是五星导电，队伍思路因此从「堆增伤」变为「排切换顺序」", True),
    ("她自身主打共鸣技能伤害，队友需围绕这一点提供增益与充能", False),
], M, 2.0, 7.4, 4.0)
ref = [
    ("名称", "心月狐（心 / Hsin）"),
    ("元素", "导电"),
    ("武器", "音感仪"),
    ("搭档", "锁暝（五星 · 导电 · 迅刀）"),
]
y = 2.15
for k, v in ref:
    tf = textbox(s, 8.4, y, 1.1, 0.5)
    para(tf, k, 16, bold=True, color=ACCENT, first=True)
    tf = textbox(s, 9.5, y, 3.3, 0.5)
    para(tf, v, 16, color=INK, first=True)
    y += 0.62
source(s, "资料来源：17173 实机演示报道（协同攻击机制的触发方向）；4399 攻略（共鸣技能伤害定位）。")

# ============ 9. 结论 ============
s = add_slide()
action_title(s, "结论：她值得认识的三条理由")
bullets(s, [
    ("设定分量：首位可玩的岁主共鸣者，把世界观里最高一层角色交到玩家手上", True),
    ("机制新意：万相分形 + 双形态，让「一人多体」成为可操作的核心玩法", False),
    ("配队价值：与锁暝组成双导电协同，切换顺序本身成为输出手段", False),
], M, 2.0, BODY_W, 3.3)
tf = textbox(s, M, 5.5, BODY_W, 0.8)
para(tf, "3.7 版本「镜锁妄世，心照红尘」— 这页留给提问。", 18, color=MUTED, first=True)
source(s, "本页为结论页，按技能规范在问答环节保持停留，其后为引用清单。")

# ============ 10. 引用 ============
s = add_slide()
action_title(s, "引用与素材来源", size=26)
refs = [
    "17173. 双五星重磅亮相，《鸣潮》3.7 新角色实机演示全公开. 2026-09-03. https://news.17173.com/content/09032026/161256505.shtml",
    "4399 手游网. 【鸣潮 V3.7】心月狐攻略. 2026-09-30. https://a.4399.cn/gl/54260661_335993.html",
    "4399 手游网. 鸣潮 V3.7 版本抽卡建议 / 卡池角色介绍. https://a.4399.cn/gl/54262799_335993.html",
    "9game. 大雷狐娘岁主《鸣潮》共鸣者「心」、「锁暝」演示发布. https://a.9game.cn/mingchao/12062117.html",
    "Notebookcheck. Wuthering Waves confirms Hsin as game's first playable Sentinel. https://www.notebookcheck.net/Wuthering-Waves-confirms-Hsin-as-game-s-first-playable-Sentinel.1383580.0.html",
    "库洛游戏. 共鸣者展示｜心. 鸣潮官方网站. https://wutheringwaves.kurogames.com/zh-tw/main/news/detail/5481",
    "图像素材：3.7 版本宣传图、实机截图与角色卡均取自上述报道与攻略页；角色形象、画面与商标版权归库洛游戏（Kuro Games）所有，此处仅用于非商业性介绍。",
]
tf = textbox(s, M, 1.75, BODY_W, 5.1)
for i, r in enumerate(refs):
    para(tf, r, 12 if i < len(refs) - 1 else 11,
         color=INK if i < len(refs) - 1 else MUTED,
         first=(i == 0), space_before=0 if i == 0 else 7,
         bullet=True, indent=0.28, line=1.12)

prs.save(OUT)
print(f"saved: {OUT}")
print(f"slides: {len(prs.slides.__iter__.__self__._sldIdLst)}")
