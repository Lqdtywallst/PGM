#!/usr/bin/env python3
"""
Generate square favicon / PWA icons from the Dynasty Prestige logo (DP).

Source: logo-dp-transparent.png — high fill ratio so the mark reads large at 16–512px.
Regenerate: python3 scripts/generate-icons.py
"""
from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
# Official DP wordmark (transparent); same aspect as logo-dp.png
SRC = ROOT / "logo-dp-transparent.png"
OUT = ROOT / "icons"

# ~0.93 = logo uses ~93% of canvas — maximises visible size while keeping a thin safe margin
# for rounded masks (Android / iOS). Slightly below 1.0 avoids edge clipping.
PAD_RATIO = 0.93


def square_icon(src: Image.Image, size: int, pad_ratio: float = PAD_RATIO) -> Image.Image:
    """Fit logo inside size×size with transparent padding."""
    im = src.convert("RGBA")
    w, h = im.size
    box = max(1, int(size * pad_ratio))
    scale = min(box / w, box / h)
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(im, ((size - nw) // 2, (size - nh) // 2), im)
    return canvas


def main() -> None:
    if not SRC.is_file():
        raise SystemExit(f"Missing source: {SRC}")

    OUT.mkdir(parents=True, exist_ok=True)
    logo = Image.open(SRC)

    # PNGs: include common + HiDPI picks (Chrome / Firefox / Safari use different sizes)
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

    # Single .ico with many embedded sizes — Windows / legacy browsers pick the largest they support
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

    print(f"Wrote icons to {OUT} and {ROOT / 'favicon.ico'} (PAD_RATIO={PAD_RATIO})")


if __name__ == "__main__":
    main()
