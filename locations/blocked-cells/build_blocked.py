"""Rebuild the closed-cell sprites from their included generated source strips."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
SIZE = 128
FRAMES = 5
ITEMS = {
    "forest-outpost/hay-bale": (104, 85),
    "forest-outpost/mossy-stump": (104, 103),
    "frost-pass/snowdrift": (106, 100),
    "frost-pass/ice-boulders": (104, 103),
    "marsh-crossing/mud-clump": (106, 91),
    "marsh-crossing/root-tangle": (105, 103),
    "ruined-cemetery/gravestone": (87, 110),
    "ruined-cemetery/bone-heap": (104, 103),
}


def visible_box(image: Image.Image) -> tuple[int, int, int, int]:
    mask = image.getchannel("A").point(lambda alpha: 255 if alpha > 40 else 0)
    box = mask.getbbox()
    if box is None:
        raise ValueError("Empty source cell")
    return box


def build_item(name: str, bounds: tuple[int, int]) -> list[Image.Image]:
    folder = ROOT / name
    source = Image.open(folder / "source.png").convert("RGBA")
    cells = [source.crop((round(i * source.width / FRAMES), 0,
                          round((i + 1) * source.width / FRAMES), source.height))
             for i in range(FRAMES)]
    boxes = [visible_box(cell) for cell in cells]
    scale = min(bounds[0] / max(b[2] - b[0] for b in boxes),
                bounds[1] / max(b[3] - b[1] for b in boxes))
    frames = []
    for index, (cell, box) in enumerate(zip(cells, boxes), 1):
        crop = cell.crop(box)
        width = round(crop.width * scale)
        height = round(crop.height * scale)
        sprite = crop.resize((width, height), Image.Resampling.NEAREST)
        frame = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
        frame.alpha_composite(sprite, ((SIZE - width) // 2, 117 - height))
        frame.save(folder / f"frame-{index:02d}.png", optimize=True)
        frames.append(frame)

    sheet = Image.new("RGBA", (SIZE * FRAMES, SIZE), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        sheet.alpha_composite(frame, (i * SIZE, 0))
    sheet.save(folder / "spritesheet.png", optimize=True)
    frames[0].save(folder / "preview.gif", save_all=True,
                   append_images=frames[1:], duration=[180] * FRAMES,
                   loop=0, disposal=2, transparency=0)
    return frames


def build_overview(rows: list[tuple[str, list[Image.Image]]]) -> None:
    scale = 2
    cell = SIZE * scale
    label_width = 230
    gap = 12
    canvas = Image.new("RGB", (label_width + FRAMES * cell + 36,
                               len(rows) * (cell + gap) + 24), "#22262c")
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.load_default()
    for row, (name, frames) in enumerate(rows):
        y = 12 + row * (cell + gap)
        draw.text((14, y + cell // 2 - 6), name, fill="#e3dfd5", font=font)
        for i, frame in enumerate(frames):
            x = label_width + i * cell
            tile = Image.new("RGBA", (cell, cell), "#343a40")
            tile.alpha_composite(frame.resize((cell, cell), Image.Resampling.NEAREST))
            canvas.paste(tile.convert("RGB"), (x, y))
    canvas.save(ROOT / "overview.png", optimize=True)


if __name__ == "__main__":
    build_overview([(name, build_item(name, bounds))
                    for name, bounds in ITEMS.items()])
