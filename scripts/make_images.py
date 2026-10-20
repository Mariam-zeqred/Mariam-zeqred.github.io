#!/usr/bin/env python3
"""Make web-sized copies of everything under assets/ into img/.

    python3 scripts/make_images.py

- img/<name>.jpg        long side <= 1600 px, JPEG quality 80 (used in lightboxes / hero)
- img/thumb/<name>.jpg  long side <= 640 px, JPEG quality 78 (used in cards and grids)
- img/<name>.png        logos are copied as PNG, untouched

Originals in assets/ are never modified. Run it again after dropping a new
certificate scan or photo into assets/; existing outputs are overwritten.
Needs Pillow:  pip install pillow
"""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SRC_DIRS = ["photos", "certificates", "app-screens"]
OUT = ROOT / "img"
THUMB = OUT / "thumb"
OUT.mkdir(exist_ok=True)
THUMB.mkdir(exist_ok=True)


def save_jpeg(im: Image.Image, path: Path, max_side: int, quality: int) -> None:
    im = ImageOps.exif_transpose(im)
    if im.mode in ("RGBA", "LA", "P"):
        bg = Image.new("RGB", im.size, (255, 255, 255))
        bg.paste(im.convert("RGBA"), mask=im.convert("RGBA").split()[-1])
        im = bg
    elif im.mode != "RGB":
        im = im.convert("RGB")
    im.thumbnail((max_side, max_side), Image.LANCZOS)
    im.save(path, "JPEG", quality=quality, optimize=True, progressive=True)


for sub in SRC_DIRS:
    for src in sorted((ROOT / "assets" / sub).iterdir()):
        if src.suffix.lower() not in (".jpg", ".jpeg", ".png", ".webp"):
            continue
        with Image.open(src) as im:
            save_jpeg(im, OUT / (src.stem + ".jpg"), 1600, 80)
        with Image.open(src) as im:
            save_jpeg(im, THUMB / (src.stem + ".jpg"), 640, 78)
        print("ok", src.relative_to(ROOT))

for src in sorted((ROOT / "assets" / "logos").iterdir()):
    if src.suffix.lower() == ".png":
        (OUT / src.name).write_bytes(src.read_bytes())
        print("ok", src.relative_to(ROOT))
