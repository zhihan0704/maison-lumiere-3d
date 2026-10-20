#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""把下载的原图规范化成卡组可直接使用的素材。

- 统一转 RGB / PNG
- 对带字幕或水印的图做定向裁剪，只保留画面部分
- 按最长边压到 1600px 内，避免 pptx 体积过大

用法: python prepare_images.py
"""
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
SRC = HERE / "raw"
OUT = HERE / "prepared"
OUT.mkdir(exist_ok=True)


def load(name):
    im = Image.open(SRC / name)
    return im.convert("RGB")


def save(im, out_name, box=None, max_edge=1600):
    if box:
        im = im.crop(box)
    w, h = im.size
    if max(w, h) > max_edge:
        scale = max_edge / max(w, h)
        im = im.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    im.save(OUT / out_name, "PNG", optimize=True)
    print(f"{out_name:22s} {im.size[0]}x{im.size[1]}")


jobs = [
    # 3.7 版本宣传图：底部有一行大字标题，裁掉
    ("a-cp.png", "keyart_37.png", (0, 0, 731, 380)),
    # 实机截图：干净，直接用
    ("17173-1.webp", "hsin_ingame.png", None),
    # 官方角色卡被上传者加了水印与攻略字幕：只取卡片上半的立绘
    ("g-913.jpg", "hsin_card.png", (170, 55, 465, 470)),
    # 武器界面截图：左侧是干净立绘，右侧有武器贴图与字幕，只取左侧
    ("4399-02.jpg", "hsin_art.png", (8, 35, 805, 985)),
    # 攻略图带大标题字幕，不用画面，仅保留作参考（不裁剪）
    ("4399-01.jpg", "ref_kit.png", (170, 0, 556, 314)),
]

for src, dst, box in jobs:
    try:
        save(load(src), dst, box)
    except FileNotFoundError:
        print(f"SKIP missing {src}")
