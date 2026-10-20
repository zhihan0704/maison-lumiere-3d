#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""版式自检：在无法用 LibreOffice 出图时，用几何计算替代目视检查。

检查项：
1. 每个形状是否越出幻灯片边界
2. 文本框高度是否装得下文字（按每行可容纳字数估算行数）
3. 形状两两重叠面积是否超过阈值（文字压图 / 文字压文字）
4. 正文字号是否低于 20pt、页脚是否低于 11pt（技能的可读性底线）
"""
import math
from pathlib import Path

from pptx import Presentation
from pptx.util import Emu

DECK = Path(__file__).resolve().parent / "心月狐-人物介绍.pptx"
EMU_IN = 914400.0
SLIDE_W, SLIDE_H = 13.333, 7.5
MIN_BODY_PT = 18          # 中文卡片式版面的正文下限（技能英文原文为 20）
FOOTNOTE_PT = 11

prs = Presentation(str(DECK))
problems = []
notes = []


def cjk_ratio(text):
    if not text:
        return 0.0
    cjk = sum(1 for ch in text if "\u2e80" <= ch <= "\u9fff" or "\uff00" <= ch <= "\uffef")
    return cjk / len(text)


def est_lines(text, width_in, size_pt):
    """按中文字宽≈字号、西文≈0.52×字号 估算折行数。"""
    if not text.strip():
        return 0
    usable_pt = width_in * 72.0
    r = cjk_ratio(text)
    per_char = size_pt * (r + 0.52 * (1 - r))
    per_line = max(1.0, usable_pt / per_char)
    return max(1, math.ceil(len(text) / per_line))


def rect(shape):
    return (shape.left / EMU_IN, shape.top / EMU_IN,
            shape.width / EMU_IN, shape.height / EMU_IN)


def overlap(a, b):
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    ox = max(0.0, min(ax + aw, bx + bw) - max(ax, bx))
    oy = max(0.0, min(ay + ah, by + bh) - max(ay, by))
    return ox * oy


for idx, slide in enumerate(prs.slides, start=1):
    boxes = []
    for shape in slide.shapes:
        x, y, w, h = rect(shape)
        boxes.append((shape, x, y, w, h))

        # 1. 越界
        if x < -0.01 or y < -0.01 or x + w > SLIDE_W + 0.01 or y + h > SLIDE_H + 0.01:
            problems.append(f"P{idx} 越界: {shape.shape_type} 位于 ({x:.2f},{y:.2f}) 尺寸 {w:.2f}x{h:.2f}")

        # 2/4. 文本容量与字号
        if shape.has_text_frame:
            need = 0.0
            for p in shape.text_frame.paragraphs:
                text = "".join(r.text for r in p.runs)
                if not text:
                    continue
                size = next((r.font.size.pt for r in p.runs if r.font.size), 18)
                if size < FOOTNOTE_PT:
                    problems.append(f"P{idx} 字号过小 ({size}pt): {text[:24]}")
                lines = est_lines(text, w, size)
                need += lines * size * 1.25 + (p.space_before.pt if p.space_before else 0)
            need_in = need / 72.0
            if need_in > h + 0.06:
                problems.append(
                    f"P{idx} 文本可能溢出: 需要≈{need_in:.2f}in / 可用 {h:.2f}in :: "
                    f"{shape.text_frame.text[:30].replace(chr(10), ' / ')}"
                )
            else:
                notes.append(f"P{idx} 容量余量 {h - need_in:+.2f}in :: {shape.text_frame.text[:22].replace(chr(10), ' / ')}")

        # 图片信息
        if shape.shape_type == 13:
            notes.append(f"P{idx} 图片 ({x:.2f},{y:.2f}) {w:.2f}x{h:.2f}")

    # 3. 重叠（只报文字框之间的显著重叠，以及文字压图片）
    for i in range(len(boxes)):
        for j in range(i + 1, len(boxes)):
            s1, x1, y1, w1, h1 = boxes[i]
            s2, x2, y2, w2, h2 = boxes[j]
            if not (s1.has_text_frame or s2.has_text_frame):
                continue
            if s1.has_text_frame and s2.has_text_frame:
                # 页脚与正文的正常留白不算
                if abs(y1 - y2) < 0.05:
                    continue
            area = overlap((x1, y1, w1, h1), (x2, y2, w2, h2))
            if area > 0.12:
                t1 = s1.text_frame.text[:16].replace("\n", " ") if s1.has_text_frame else "图片"
                t2 = s2.text_frame.text[:16].replace("\n", " ") if s2.has_text_frame else "图片"
                problems.append(f"P{idx} 重叠 {area:.2f} sqin :: 「{t1}」×「{t2}」")

print(f"slides: {len(prs.slides._sldIdLst)}")
print(f"\n=== 问题 {len(problems)} 项 ===")
for p in problems:
    print("  !", p)
if not problems:
    print("  （无）")

print(f"\n=== 版式记录（前 24 条）===")
for n in notes[:24]:
    print("  -", n)
