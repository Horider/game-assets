"""Build ten aligned arrow levels while preserving the four existing PNGs."""

from pathlib import Path
from shutil import copyfile

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
CELL = 362
PRESERVED = {3, 5, 7, 10}


def make_new_arrow(level: int, destination: Path):
    source = Image.open(ROOT / "sources" / f"level-{level:02d}.png").convert("RGBA")
    box = source.getchannel("A").point(lambda a: 255 if a > 12 else 0).getbbox()
    if box is None:
        raise ValueError(f"Empty source for level {level}")
    arrow = source.crop(box)
    scale = min(330 / arrow.width, 300 / arrow.height)
    size = (round(arrow.width * scale), round(arrow.height * scale))
    arrow = arrow.resize(size, Image.Resampling.LANCZOS)
    frame = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    frame.alpha_composite(arrow, ((CELL - size[0]) // 2, (CELL - size[1]) // 2))
    frame.save(destination)


def main():
    sheet = Image.new("RGBA", (CELL * 10, CELL), (0, 0, 0, 0))
    preview = Image.new("RGBA", (CELL * 5, CELL * 2), "#1b1c23")
    draw = ImageDraw.Draw(preview)
    font = ImageFont.load_default()
    for level in range(1, 11):
        destination = ROOT / f"level-{level:02d}.png"
        if level in PRESERVED:
            copyfile(ROOT / "sources" / f"level-{level:02d}.png", destination)
        else:
            make_new_arrow(level, destination)
        frame = Image.open(destination).convert("RGBA")
        sheet.alpha_composite(frame, ((level - 1) * CELL, 0))
        col, row = (level - 1) % 5, (level - 1) // 5
        preview.alpha_composite(frame, (col * CELL, row * CELL))
        draw.text((col * CELL + 15, row * CELL + 15), f"LEVEL {level:02d}", fill="white", font=font)
    sheet.save(ROOT / "spritesheet.png")
    preview.convert("RGB").save(ROOT / "overview.png")


if __name__ == "__main__":
    main()
