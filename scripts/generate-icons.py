#!/usr/bin/env python3
"""
Generate square favicon / PWA icons from the Dynasty Prestige logo (DP).

The source logo is wide (1536×1024). "Contain" mode leaves large transparent bands,
so the mark looks tiny in browser tabs. We use cover + center crop so the icon
fills the square and reads much larger at 16–32px.

Regenerate: python3 scripts/generate-icons.py
"""
from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "logo-dp-transparent.png"
OUT = ROOT / "icons"

# >1.0 = slight zoom after cover-scale so the wordmark fills more of the square
# (trades a bit of edge clipping for visibility at favicon size). Tune 1.04–1.12.
COVER_ZOOM = 1.12


def square_icon(src: Image.Image, size: int, zoom: float = COVER_ZOOM) -> Image.Image:
    """Scale logo to cover size×size, center-crop. Transparent edges of source are cropped away."""
    im = src.convert("RGBA")
    w, h = im.size
    base = max(size / w, size / h)
    scale = base * zoom
    nw = max(1, int(round(w * scale)))
    nh = max(1, int(round(h * scale)))
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - size) // 2
    top = (nh - size) // 2
    left = max(0, min(left, nw - size))
    top = max(0, min(top, nh - size))
    return im.crop((left, top, left + size, top + size))


def main() -> None:
    if not SRC.is_file():
        raise SystemExit(f"Missing source: {SRC}")

    OUT.mkdir(parents=True, exist_ok=True)
    logo = Image.open(SRC)

    sizes = {
        "icon-512.png": 512,
        "icon-384.png": 384,
        "icon-256.png": 256,
        "icon-192.png": 192,
        "icon-180.png": 180,
        "icon-128.png": 128,
        "icon-96.png": 96,
        "icon-64.png": 64,
        "icon-48.png": 48,
        "icon-32.png": 32,
        "icon-16.png": 16,
    }
    for name, px in sizes.items():
        square_icon(logo, px).save(OUT / name, optimize=True)

    ico_sizes = [256, 128, 64, 48, 32, 16]
    ico_images = [square_icon(logo, s) for s in ico_sizes]
    ico_path = OUT / "favicon.ico"
    pairs = [(s, s) for s in ico_sizes]
    ico_images[0].save(
        ico_path,
        format="ICO",
        sizes=pairs,
        append_images=ico_images[1:],
    )
    shutil.copyfile(ico_path, ROOT / "favicon.ico")

    print(f"Wrote icons to {OUT} (cover+crop, COVER_ZOOM={COVER_ZOOM})")


if __name__ == "__main__":
    main()
