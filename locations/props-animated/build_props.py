"""Build the corrected five-frame location props from included source PNGs."""

from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parent
FRAME = 128
NAMES = ("frog-croak", "frog-jump", "water-bubbles", "torch",
         "skeleton-hand", "zombie-hand", "snowball", "crow", "flag")
DURATIONS = {
    "frog-croak": (250, 180, 200, 300, 250),
    "frog-jump": (180, 140, 140, 150, 260),
    "water-bubbles": (170, 170, 120, 150, 190),
    "torch": (110, 110, 110, 110, 110),
    "skeleton-hand": (200, 190, 180, 180, 230),
    "zombie-hand": (200, 190, 180, 180, 230),
    "snowball": (140, 130, 130, 130, 170),
    "crow": (480, 130, 330, 210, 440),
    "flag": (140, 140, 140, 140, 140),
}


def visible_box(image: Image.Image) -> tuple[int, int, int, int]:
    box = image.getchannel("A").point(lambda a: 255 if a > 100 else 0).getbbox()
    if box is None:
        raise ValueError("Empty animation frame")
    return box


def largest_sprite(image: Image.Image) -> Image.Image:
    """Keep the frog and remove isolated noise in generated source cells."""
    image = image.convert("RGBA")
    width, height = image.size
    mask = image.getchannel("A").point(lambda a: 255 if a > 100 else 0)
    pixels = mask.load()
    seen = bytearray(width * height)
    best: list[int] = []
    for y in range(height):
        for x in range(width):
            seed = y * width + x
            if not pixels[x, y] or seen[seed]:
                continue
            seen[seed] = 1
            queue = deque([seed])
            component = []
            while queue:
                pos = queue.popleft()
                component.append(pos)
                px, py = pos % width, pos // width
                for ny in range(max(0, py - 1), min(height, py + 2)):
                    for nx in range(max(0, px - 1), min(width, px + 2)):
                        npos = ny * width + nx
                        if pixels[nx, ny] and not seen[npos]:
                            seen[npos] = 1
                            queue.append(npos)
            if len(component) > len(best):
                best = component
    if not best:
        raise ValueError("No frog sprite found")
    only_main = Image.new("L", image.size, 0)
    main_pixels = only_main.load()
    for pos in best:
        main_pixels[pos % width, pos // width] = 255
    # Include semitransparent antialiasing directly around the main sprite.
    only_main = only_main.filter(ImageFilter.MaxFilter(5))
    alpha = image.getchannel("A")
    alpha = Image.composite(alpha, Image.new("L", image.size, 0), only_main)
    alpha = alpha.point(lambda a: 0 if a < 70 else a)
    image.putalpha(alpha)
    return image


def build_frog(name: str) -> None:
    folder = ROOT / name
    source = Image.open(folder / "source.png").convert("RGBA")
    if source.width % 5:
        raise ValueError(f"{name}: expected five equal source cells")
    cell_width = source.width // 5
    cells = [largest_sprite(source.crop((i * cell_width, 200,
                                         (i + 1) * cell_width, 615)))
             for i in range(5)]
    first_box = visible_box(cells[0])
    scale = 54 / (first_box[2] - first_box[0])
    lifts = (0, 0, 0, 0, 0) if name == "frog-croak" else (0, 17, 35, 16, 0)
    for index, (cell, lift) in enumerate(zip(cells, lifts), 1):
        crop = cell.crop(visible_box(cell))
        width = round(crop.width * scale)
        height = round(crop.height * scale)
        sprite = crop.resize((width, height), Image.Resampling.NEAREST)
        frame = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
        left = round(64 - width / 2)
        top = 112 - lift - height
        if min(left, top) < 0 or left + width > FRAME:
            raise ValueError(f"{name} frame {index} is clipped")
        frame.alpha_composite(sprite, (left, top))
        frame.save(folder / f"frame-{index:02d}.png", optimize=True)


def build_white_flag() -> None:
    folder = ROOT / "flag"
    source = Image.open(folder / "source.png").convert("RGBA")
    cell_width = source.width / 5
    cells = [source.crop((round(i * cell_width), 0,
                          round((i + 1) * cell_width), source.height))
             for i in range(5)]
    boxes = [visible_box(cell) for cell in cells]
    scale = min(91 / max(box[2] - box[0] for box in boxes),
                110 / max(box[3] - box[1] for box in boxes))
    for index, (cell, box) in enumerate(zip(cells, boxes), 1):
        crop = cell.crop(box)
        crop.putalpha(crop.getchannel("A").point(lambda a: 0 if a < 80 else a))
        width = round(crop.width * scale)
        height = round(crop.height * scale)
        frame = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
        frame.alpha_composite(crop.resize((width, height), Image.Resampling.NEAREST),
                              (21, 120 - height))
        frame.save(folder / f"frame-{index:02d}.png", optimize=True)


def build_outputs(name: str) -> None:
    folder = ROOT / name
    frames = [Image.open(folder / f"frame-{i:02d}.png").convert("RGBA")
              for i in range(1, 6)]
    strip = Image.new("RGBA", (FRAME * 5, FRAME), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        strip.alpha_composite(frame, (index * FRAME, 0))
    strip.save(folder / "spritesheet.png", optimize=True)

    previews = []
    for frame in frames:
        board = Image.new("RGB", (256, 256), (35, 39, 47))
        large = frame.resize((256, 256), Image.Resampling.NEAREST)
        board.paste(large, (0, 0), large)
        previews.append(board)
    palette = previews[0].quantize(colors=128, method=Image.Quantize.MEDIANCUT)
    indexed = [im.quantize(palette=palette, dither=Image.Dither.NONE)
               for im in previews]
    indexed[0].save(folder / "preview.gif", save_all=True,
                    append_images=indexed[1:], duration=DURATIONS[name],
                    loop=0, optimize=False, disposal=2)


def build_overview() -> None:
    overview = Image.new("RGBA", (800, len(NAMES) * 144 + 20),
                         (35, 39, 47, 255))
    draw = ImageDraw.Draw(overview)
    for row, name in enumerate(NAMES):
        y = 12 + row * 144
        draw.text((12, y + 56), name, fill=(220, 224, 228, 255))
        sheet = Image.open(ROOT / name / "spritesheet.png").convert("RGBA")
        overview.alpha_composite(sheet, (150, y))
    overview.convert("RGB").save(ROOT / "overview.png", optimize=True)


if __name__ == "__main__":
    build_frog("frog-croak")
    build_frog("frog-jump")
    build_white_flag()
    for name in NAMES:
        build_outputs(name)
        print(f"built {name}")
    build_overview()
