"""Build seamless five-second transparent weather/light overlays for four maps."""

from __future__ import annotations

import json
import math
import random
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parent
LOCATIONS = ROOT.parent
FPS = 10
FRAMES = 50
SIZE = (1672, 941)
HALF = (836, 470)
TAU = 2 * math.pi
NAMES = ("frost-pass", "marsh-crossing", "ruined-cemetery", "forest-outpost")


@lru_cache(maxsize=24)
def glow_mask(radius: int) -> Image.Image:
    diameter = radius * 2 + 1
    mask = Image.new("L", (diameter, diameter))
    px = mask.load()
    for y in range(diameter):
        for x in range(diameter):
            distance = math.hypot(x - radius, y - radius) / radius
            px[x, y] = round(255 * max(0, 1 - distance) ** 2.1)
    return mask


def glow(layer: Image.Image, x: float, y: float, radius: int,
         color: tuple[int, int, int], opacity: float) -> None:
    if opacity <= 0:
        return
    mask = glow_mask(radius).point(lambda value: round(value * opacity))
    patch = Image.new("RGBA", mask.size, color + (0,))
    patch.putalpha(mask)
    layer.alpha_composite(patch, (round(x) - radius, round(y) - radius))


def snow(t: float) -> Image.Image:
    layer = Image.new("RGBA", SIZE)
    draw = ImageDraw.Draw(layer)
    for x0, y0, phase, size, alpha in SNOWFLAKES:
        y = (y0 + SIZE[1] * t) % SIZE[1]
        x = (x0 + 20 * math.sin(TAU * t + phase)) % SIZE[0]
        r = size / 2
        tint = (229, 240, 255, alpha) if size <= 2 else (245, 247, 255, alpha)
        draw.ellipse((x - r, y - r, x + r, y + r), fill=tint)
        if size >= 3:
            draw.line((x - 1, y - 3, x, y - 1), fill=(220, 235, 255, alpha // 3))
    return layer


def fireflies(t: float) -> Image.Image:
    layer = Image.new("RGBA", SIZE)
    for x0, y0, phase, frequency, radius in FIREFLIES:
        x = x0 + 8 * math.sin(TAU * frequency * t + phase)
        y = y0 + 6 * math.cos(TAU * frequency * t + phase)
        intensity = max(0, math.sin(TAU * frequency * t + phase)) ** 2
        if intensity < .1:
            continue
        glow(layer, x, y, radius, (176, 228, 101), .42 * intensity)
        glow(layer, x, y, max(3, radius // 4), (249, 253, 164), .95 * intensity)
        ImageDraw.Draw(layer).ellipse((x - 1, y - 1, x + 1, y + 1),
                                      fill=(255, 255, 197, round(220 * intensity)))
    return layer


def fog(t: float, frame_index: int) -> Image.Image:
    quarter = (SIZE[0] // 4, SIZE[1] // 4)
    mist = Image.new("L", quarter)
    draw = ImageDraw.Draw(mist)
    for x0, y0, rx, ry, phase, alpha in FOG_BLOBS:
        x = x0 + 32 * math.sin(TAU * t + phase)
        y = y0 + 5 * math.cos(TAU * t + phase)
        draw.ellipse(((x - rx) / 4, (y - ry) / 4,
                      (x + rx) / 4, (y + ry) / 4), fill=alpha)
    mist = mist.filter(ImageFilter.GaussianBlur(10))
    mist = mist.resize(SIZE, Image.Resampling.BICUBIC)
    layer = Image.new("RGBA", SIZE, (162, 151, 189, 0))
    layer.putalpha(mist)

    # A single brief pulse in the distant central castle every five seconds.
    if 46 <= frame_index <= 48:
        pulse = (0.55, 1.0, 0.55)[frame_index - 46]
        glow(layer, 553, 87, 50, (255, 190, 84), .35 * pulse)
        glow(layer, 553, 87, 19, (255, 218, 125), .84 * pulse)
        glow(layer, 553, 87, 7, (255, 247, 182), pulse)
    return layer


def lanterns(t: float) -> Image.Image:
    layer = Image.new("RGBA", SIZE)
    for index, (x, y, radius) in enumerate(LANTERNS):
        phase = 0.7 * index
        flicker = .78 + .15 * math.sin(TAU * (3 + index % 2) * t + phase)
        flicker += .07 * math.sin(TAU * 7 * t + phase)
        glow(layer, x, y, radius, (255, 160, 51), .29 * flicker)
        glow(layer, x, y, max(8, radius // 3), (255, 213, 100), .62 * flicker)
    return layer


random_generator = random.Random(20261009)
SNOWFLAKES = [
    (random_generator.randrange(SIZE[0]), random_generator.randrange(SIZE[1]),
     random_generator.random() * TAU, random_generator.choice((1, 1, 2, 2, 3, 4)),
     random_generator.randrange(90, 210))
    for _ in range(230)
]

FIREFLY_ZONES = ((30, 162), (270, 305), (395, 427),
                 (525, 555), (650, 690), (795, 930))
FIREFLIES = [
    (random_generator.randrange(80, 1590),
     random_generator.randrange(*random_generator.choice(FIREFLY_ZONES)),
     random_generator.random() * TAU, random_generator.choice((1, 2, 3)),
     random_generator.randrange(10, 20))
    for _ in range(44)
]

FOG_BLOBS = [
    (random_generator.randrange(-100, 1780),
     random_generator.choice((155, 175, 195, 430, 690, 850, 920)) + random_generator.randrange(-30, 31),
     random_generator.randrange(130, 310), random_generator.randrange(35, 90),
     random_generator.random() * TAU, random_generator.randrange(18, 53))
    for _ in range(30)
]

LANTERNS = (
    (207, 82, 76), (606, 108, 66), (1578, 98, 76),
    (129, 222, 61), (1602, 343, 65), (130, 447, 64),
    (1608, 594, 68), (113, 695, 75), (561, 854, 72),
    (75, 703, 64),
)

RENDERERS = {
    "frost-pass": snow,
    "marsh-crossing": fireflies,
    "ruined-cemetery": fog,
    "forest-outpost": lanterns,
}


def build_location(name: str) -> Image.Image:
    folder = ROOT / name
    folder.mkdir(parents=True, exist_ok=True)
    background = Image.open(LOCATIONS / f"{name}.png").convert("RGBA")
    if background.size != SIZE:
        raise ValueError(f"Unexpected size for {name}: {background.size}")

    previews = []
    sample_index = 47 if name == "ruined-cemetery" else 14
    sample = None
    for index in range(FRAMES):
        t = index / FRAMES
        renderer = RENDERERS[name]
        overlay = renderer(t, index) if name == "ruined-cemetery" else renderer(t)
        overlay.save(folder / f"frame-{index:03d}.png", optimize=True)
        composite = Image.alpha_composite(background, overlay).convert("RGB")
        if index == sample_index:
            sample = composite.copy()
            sample.save(folder / "sample.png", optimize=True)
        previews.append(composite.resize(HALF, Image.Resampling.LANCZOS))
    palette = previews[0].quantize(colors=192, method=Image.Quantize.MEDIANCUT)
    indexed = [frame.quantize(palette=palette, dither=Image.Dither.NONE)
               for frame in previews]
    indexed[0].save(folder / "preview.gif", save_all=True,
                    append_images=indexed[1:], duration=100,
                    loop=0, optimize=False, disposal=2)
    return sample


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    samples = {}
    for name in NAMES:
        samples[name] = build_location(name)
        print(f"built {name}", flush=True)

    overview = Image.new("RGB", (1672, 940), (35, 39, 47))
    for index, name in enumerate(NAMES):
        x, y = (index % 2) * 836, (index // 2) * 470
        overview.paste(samples[name].resize(HALF, Image.Resampling.LANCZOS), (x, y))
    overview.save(ROOT / "overview.png", optimize=True)

    manifest = {
        "frame_size": list(SIZE), "frames_per_location": FRAMES,
        "fps": FPS, "loop_ms": 5000,
        "format": "transparent full-size RGBA PNG overlays",
        "backgrounds": {name: f"../{name}.png" for name in NAMES},
        "effects": {
            "frost-pass": "falling snow",
            "marsh-crossing": "blinking drifting fireflies",
            "ruined-cemetery": "drifting fog and castle light pulse in frames 46-48 (once per 5 seconds)",
            "forest-outpost": "warm flickering halos around existing lamps and fire",
        },
    }
    (ROOT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
