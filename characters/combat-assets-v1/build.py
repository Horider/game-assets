"""Split the generated source strips into engine-ready transparent sprites."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
CELL = 362
PADDING = 16
SETS = [
    ("axe-impact-dust", 5, "bottom"),
    ("archer-arrows", 4, "center"),
    ("healing-trace", 5, "bottom"),
    ("sword-swing-trace", 5, "center"),
    ("sword-swing", 5, "center"),
    *((f"paladin-shield/level-{level}", 5, "center") for level in range(1, 5)),
]


def bounds(im):
    return im.getchannel("A").point(lambda a: 255 if a > 12 else 0).getbbox()


def split_source(source, count):
    width, height = source.size
    return [
        source.crop((round(i * width / count), 0, round((i + 1) * width / count), height))
        for i in range(count)
    ]


def sword_frames(source):
    """Use one generated sword for a consistent five-pose swing."""
    first_sword = source.crop((0, 0, 350, source.height))
    blade = first_sword.crop(bounds(first_sword))
    scale = 270 / blade.height
    blade = blade.resize((round(blade.width * scale), 270), Image.Resampling.LANCZOS)
    neutral = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    neutral.alpha_composite(blade, ((CELL - blade.width) // 2, (CELL - blade.height) // 2))
    return [neutral.rotate(angle, resample=Image.Resampling.BICUBIC) for angle in (0, -35, -80, -125, -165)]


def main():
    preview = Image.new("RGBA", (5 * 190 + 180, len(SETS) * 200), "#1b1c23")
    draw = ImageDraw.Draw(preview)
    font = ImageFont.load_default()
    for row, (folder, count, anchor) in enumerate(SETS):
        directory = ROOT / folder
        source = Image.open(directory / "source.png").convert("RGBA")
        pieces = sword_frames(source) if folder == "sword-swing" else split_source(source, count)
        boxes = [bounds(piece) for piece in pieces]
        if any(box is None for box in boxes):
            raise ValueError(f"Empty frame in {folder}")
        max_width = max(box[2] - box[0] for box in boxes)
        max_height = max(box[3] - box[1] for box in boxes)
        scale = min((CELL - 2 * PADDING) / max_width, (CELL - 2 * PADDING) / max_height)
        sheet = Image.new("RGBA", (count * CELL, CELL), (0, 0, 0, 0))
        draw.text((8, row * 200 + 8), folder, fill="white", font=font)
        for index, (piece, box) in enumerate(zip(pieces, boxes), 1):
            content = piece.crop(box)
            size = (max(1, round(content.width * scale)), max(1, round(content.height * scale)))
            content = content.resize(size, Image.Resampling.LANCZOS)
            frame = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
            x = (CELL - size[0]) // 2
            y = CELL - PADDING - size[1] if anchor == "bottom" else (CELL - size[1]) // 2
            frame.alpha_composite(content, (x, y))
            frame.save(directory / f"frame-{index:02d}.png")
            sheet.alpha_composite(frame, ((index - 1) * CELL, 0))
            thumb = frame.resize((180, 180), Image.Resampling.LANCZOS)
            preview.alpha_composite(thumb, (180 + (index - 1) * 190, row * 200 + 10))
        sheet.save(directory / "spritesheet.png")
        print(f"{folder}: {count} frames, {CELL}x{CELL} each, sheet {sheet.size}")
    preview.convert("RGB").save(ROOT / "overview.png")


if __name__ == "__main__":
    main()
