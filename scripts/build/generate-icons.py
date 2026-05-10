#!/usr/bin/env python3
"""
Generate square favicon / PWA icons from the Dynasty Prestige logo (DP).

Tuned for a “big company” tab icon: comfortable inner safe area (~80% of the
square, similar to Material / Apple adaptive-icon guidance), not edge‑to‑edge.
Still: trim source alpha, cover-crop the mark, dark plate, light supersampling.

Regenerate: python3 scripts/build/generate-icons.py
"""
from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "logo-dp-transparent.png"
OUT = ROOT / "icons"

# Cover scale on the *inner* square only (1.0 = flush inner bounds, slight >1 = tighter crop).
COVER_ZOOM = 1.04

# Fraction of final canvas used by the mark (rest = breathing room, like Google / corporate favicons).
SAFE_FRAC = 0.80

# Matches site dark background (~ --bg-primary).
PLATE_RGBA = (10, 10, 12, 255)


def trim_transparent(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    bbox = im.split()[3].getbbox()
    return im.crop(bbox) if bbox else im


def square_icon_raw(im: Image.Image, size: int, zoom: float) -> Image.Image:
    """Cover + center crop to size×size."""
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
    inner = max(1, int(round(size * SAFE_FRAC)))
    mult = 2 if size <= 128 else 1
    hi_inner = inner * mult

    raw = square_icon_raw(logo_trimmed, hi_inner, COVER_ZOOM)
    if mult > 1:
        raw = raw.resize((inner, inner), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    off = (size - inner) // 2
    canvas.paste(raw, (off, off), raw)

    out = on_plate(canvas)
    if size <= 48:
        out = out.filter(
            ImageFilter.UnsharpMask(radius=0.35, percent=95, threshold=4)
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

    print(f"Wrote icons to {OUT} (SAFE_FRAC={SAFE_FRAC}, COVER_ZOOM={COVER_ZOOM})")


if __name__ == "__main__":
    main()
