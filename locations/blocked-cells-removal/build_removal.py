"""Build one-shot blocked-cell removal strips from included ImageGen sources."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
IDLE_ROOT = ROOT.parent / "blocked-cells"
SIZE = 128
NAMES = (
    "forest-outpost/hay-bale",
    "forest-outpost/mossy-stump",
    "frost-pass/snowdrift",
    "frost-pass/ice-boulders",
    "marsh-crossing/mud-clump",
    "marsh-crossing/root-tangle",
    "ruined-cemetery/gravestone",
    "ruined-cemetery/bone-heap",
)


def visible_box(image: Image.Image) -> tuple[int, int, int, int]:
    box = image.getchannel("A").point(lambda a: 255 if a > 40 else 0).getbbox()
    if box is None:
        raise ValueError("Empty source cell")
    return box


def build(name: str) -> list[Image.Image]:
    folder = ROOT / name
    source = Image.open(folder / "source.png").convert("RGBA")
    cells = [source.crop((round(i * source.width / 5), 0,
                          round((i + 1) * source.width / 5), source.height))
             for i in range(5)]

    # Align every generated phase to the already-shipped idle sprite.
    intact = Image.open(IDLE_ROOT / name / "frame-01.png").convert("RGBA")
    old_box = visible_box(intact)
    new_box = visible_box(cells[0])
    scale = min((old_box[2] - old_box[0]) / (new_box[2] - new_box[0]),
                (old_box[3] - old_box[1]) / (new_box[3] - new_box[1]))
    old_cx = (old_box[0] + old_box[2]) / 2
    new_cx = (new_box[0] + new_box[2]) / 2
    dx = old_cx - new_cx * scale
    dy = old_box[3] - new_box[3] * scale
    matrix = (1 / scale, 0, -dx / scale,
              0, 1 / scale, -dy / scale)

    frames = [intact]
    for index in (1, 2, 3):
        frame = cells[index].transform((SIZE, SIZE), Image.Transform.AFFINE,
                                       matrix, resample=Image.Resampling.NEAREST,
                                       fillcolor=(0, 0, 0, 0))
        if index == 3:
            alpha = frame.getchannel("A").point(lambda a: round(a * 0.62))
            frame.putalpha(alpha)
        frames.append(frame)
    frames.append(Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0)))

    for i, frame in enumerate(frames, 1):
        frame.save(folder / f"frame-{i:02d}.png", optimize=True)
    sheet = Image.new("RGBA", (SIZE * 5, SIZE), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        sheet.alpha_composite(frame, (i * SIZE, 0))
    sheet.save(folder / "spritesheet.png", optimize=True)
    frames[0].save(folder / "preview.gif", save_all=True,
                   append_images=frames[1:], duration=[140, 140, 150, 160, 180],
                   loop=0, disposal=2, transparency=0)
    return frames


def overview(rows: list[tuple[str, list[Image.Image]]]) -> None:
    cell = 256
    label = 230
    gap = 12
    canvas = Image.new("RGB", (label + 5 * cell + 36,
                               len(rows) * (cell + gap) + 24), "#22262c")
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.load_default()
    for row, (name, frames) in enumerate(rows):
        y = 12 + row * (cell + gap)
        draw.text((14, y + cell // 2 - 6), name, fill="#e3dfd5", font=font)
        for i, frame in enumerate(frames):
            tile = Image.new("RGBA", (cell, cell), "#343a40")
            tile.alpha_composite(frame.resize((cell, cell), Image.Resampling.NEAREST))
            canvas.paste(tile.convert("RGB"), (label + i * cell, y))
    canvas.save(ROOT / "overview.png", optimize=True)


if __name__ == "__main__":
    overview([(name, build(name)) for name in NAMES])
