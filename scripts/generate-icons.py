#!/usr/bin/env python3
"""Generate square PWA/favicon PNGs from wide logo (transparent, centered, safe margin)."""
from __future__ import annotations

import os
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "logo-dp-transparent.png"
OUT = ROOT / "icons"


def square_icon(src: Image.Image, size: int, pad_ratio: float = 0.82) -> Image.Image:
    """Fit logo inside size×size with transparent padding (maskable-friendly)."""
    im = src.convert("RGBA")
    w, h = im.size
    box = int(size * pad_ratio)
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

    sizes = {
        "icon-512.png": 512,
        "icon-192.png": 192,
        "icon-180.png": 180,
        "icon-96.png": 96,
        "icon-48.png": 48,
        "icon-32.png": 32,
        "icon-16.png": 16,
    }
    for name, px in sizes.items():
        square_icon(logo, px).save(OUT / name, optimize=True)

    # Multi-resolution ICO for legacy browsers
    i16 = square_icon(logo, 16)
    i32 = square_icon(logo, 32)
    i48 = square_icon(logo, 48)
    ico_path = OUT / "favicon.ico"
    i48.save(
        ico_path,
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
        append_images=[i16, i32],
    )
    # Default URL many browsers request without <link>
    shutil.copyfile(ico_path, ROOT / "favicon.ico")

    print(f"Wrote icons to {OUT} and {ROOT / 'favicon.ico'}")


if __name__ == "__main__":
    main()
