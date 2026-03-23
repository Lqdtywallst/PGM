#!/usr/bin/env python3
"""
Generate square favicon / PWA icons from the Dynasty Prestige logo (DP).

Pipeline for maximum legibility at 16–32px tabs:
1. Trim empty transparency from the source PNG (tighter bounds on the wordmark).
2. Cover-scale + center crop with strong zoom so the mark fills the square.
3. Optional supersampling (render 2× then downscale) for sharper downsampling.
4. Composite on a near-black plate so gold/bright pixels contrast on any browser UI.

Regenerate: python3 scripts/generate-icons.py
"""
from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "logo-dp-transparent.png"
OUT = ROOT / "icons"

# Strong zoom after cover — wordmark dominates the square (more edge crop).
COVER_ZOOM = 1.32

# Matches site dark background (~ --bg-primary); improves contrast vs transparent tabs.
PLATE_RGBA = (10, 10, 12, 255)


def trim_transparent(im: Image.Image) -> Image.Image:
    """Crop to bounding box of visible pixels."""
    im = im.convert("RGBA")
    bbox = im.split()[3].getbbox()
    return im.crop(bbox) if bbox else im


def square_icon_raw(im: Image.Image, size: int, zoom: float) -> Image.Image:
    """Cover + center crop to size×size (no plate)."""
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


def on_plate(fg: Image.Image) -> Image.Image:
    s = fg.size[0]
    base = Image.new("RGBA", (s, s), PLATE_RGBA)
    return Image.alpha_composite(base, fg.convert("RGBA"))


def render_icon(logo_trimmed: Image.Image, size: int) -> Image.Image:
    """Hi-res render then downscale for small sizes = less blurry strokes."""
    mult = 2 if size <= 128 else 1
    hi = size * mult
    raw = square_icon_raw(logo_trimmed, hi, COVER_ZOOM)
    if mult > 1:
        raw = raw.resize((size, size), Image.Resampling.LANCZOS)
    out = on_plate(raw)
    if size <= 48:
        out = out.filter(
            ImageFilter.UnsharpMask(radius=0.45, percent=130, threshold=3)
        )
    return out


def main() -> None:
    if not SRC.is_file():
        raise SystemExit(f"Missing source: {SRC}")

    OUT.mkdir(parents=True, exist_ok=True)
    logo = trim_transparent(Image.open(SRC))

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
        render_icon(logo, px).save(OUT / name, optimize=True)

    ico_sizes = [256, 128, 64, 48, 32, 16]
    ico_images = [render_icon(logo, s) for s in ico_sizes]
    ico_path = OUT / "favicon.ico"
    pairs = [(s, s) for s in ico_sizes]
    ico_images[0].save(
        ico_path,
        format="ICO",
        sizes=pairs,
        append_images=ico_images[1:],
    )
    shutil.copyfile(ico_path, ROOT / "favicon.ico")

    print(
        f"Wrote icons to {OUT} (trim+cover ZOOM={COVER_ZOOM}, plate, supersample≤128px)"
    )


if __name__ == "__main__":
    main()
