"""Build seamless ambient overlays and animated previews for the four maps.

Requires Pillow. The original backgrounds in the parent folder are untouched.
"""

from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw


ROOT = Path(__file__).resolve().parent
MAPS = ROOT.parent
FRAMES = 24
FPS = 12
PREVIEW_SIZE = (960, 540)
SCENES = (
    "forest-outpost",
    "ruined-cemetery",
    "marsh-crossing",
    "frost-pass",
)

# Polygons trace fabric already painted into the static maps. Replacing only
# their pixels keeps the surroundings fixed while the texture billows.
CLOTH = {
    "forest-outpost": (
        ([(451, 65), (482, 80), (523, 84), (559, 73), (591, 69),
          (564, 135), (528, 129), (489, 121), (454, 112)], 5),
        ([(48, 262), (99, 243), (105, 347), (71, 361), (52, 341)], 4),
        ([(1617, 49), (1671, 57), (1671, 160), (1640, 149), (1622, 135)], 4),
    ),
    "frost-pass": (
        ([(163, 65), (218, 51), (226, 144), (176, 159)], 4),
        ([(68, 179), (113, 191), (109, 310), (72, 289)], 4),
        ([(32, 617), (102, 626), (100, 749), (39, 735)], 5),
    ),
}


def wave_cloth(base: Image.Image, layer: Image.Image,
               polygon: list[tuple[int, int]], t: int, amplitude: int) -> None:
    x0 = min(x for x, _ in polygon)
    y0 = min(y for _, y in polygon)
    x1 = max(x for x, _ in polygon) + 1
    y1 = max(y for _, y in polygon) + 1
    source = base.crop((x0, y0, x1, y1))
    warped = Image.new("RGBA", source.size)
    phase = math.tau * t / FRAMES
    for y in range(source.height):
        shift = round(amplitude * math.sin(phase + y / 20))
        row = source.crop((0, y, source.width, y + 1))
        warped.paste(ImageChops.offset(row, shift, 0), (0, y))
    mask = Image.new("L", source.size, 0)
    ImageDraw.Draw(mask).polygon([(x - x0, y - y0) for x, y in polygon], fill=255)
    warped.putalpha(mask)
    layer.alpha_composite(warped, (x0, y0))


def flame(draw: ImageDraw.ImageDraw, x: int, y: int,
          phase: float, seed: float = 0.0) -> None:
    sway = 3 * math.sin(phase * 2 + seed)
    height = 12 + 3 * math.sin(phase * 3 + seed)
    draw.polygon(((x - 5, y + 3), (x - 4, y - 4),
                  (x + sway, y - height), (x + 4, y - 3), (x + 5, y + 3)),
                 fill=(246, 136, 35, 225))
    draw.polygon(((x - 2, y + 2), (x - 1, y - 4),
                  (x + sway * 0.5, y - height * 0.65),
                  (x + 2, y - 3), (x + 3, y + 2)),
                 fill=(255, 224, 116, 235))


def emerging_hand(draw: ImageDraw.ImageDraw, x: int, ground: int,
                  phase: float, seed: float) -> None:
    rise = 18 + 12 * (0.5 + 0.5 * math.sin(phase + seed))
    palm_y = ground - rise
    draw.ellipse((x - 17, ground - 5, x + 18, ground + 5),
                 fill=(26, 26, 34, 210))
    draw.polygon(((x - 5, ground), (x - 7, palm_y + 4),
                  (x + 6, palm_y + 2), (x + 8, ground)),
                 fill=(63, 66, 69, 245))
    draw.line((x - 5, ground - 2, x - 7, palm_y + 4, x + 6, palm_y + 2,
               x + 8, ground), fill=(24, 27, 34, 240), width=3)
    draw.ellipse((x - 10, palm_y - 5, x + 8, palm_y + 8),
                 fill=(75, 79, 78, 250), outline=(28, 29, 34, 255), width=2)
    for i, dx in enumerate((-8, -3, 3, 8)):
        tip_y = palm_y - 14 - (i % 2) * 5 + 2 * math.sin(phase + seed + i)
        draw.line((x + dx, palm_y + 1, x + dx + i - 2, tip_y),
                  fill=(29, 31, 35, 250), width=5)
        draw.line((x + dx, palm_y + 1, x + dx + i - 2, tip_y),
                  fill=(121, 123, 116, 240), width=3)
    draw.line((x - 9, palm_y + 5, x - 17, palm_y - 4),
              fill=(105, 109, 105, 245), width=4)


def glow(draw: ImageDraw.ImageDraw, x: float, y: float, radius: int,
         color: tuple[int, int, int], strength: float) -> None:
    for scale, opacity in ((1.8, 0.07), (1.1, 0.15), (0.5, 0.27)):
        r = int(radius * scale)
        alpha = int(255 * strength * opacity)
        draw.ellipse((x - r, y - r, x + r, y + r),
                     fill=(*color, alpha))


def forest(draw: ImageDraw.ImageDraw, t: int, w: int, h: int) -> None:
    phase = math.tau * t / FRAMES
    lamps = ((207, 84), (607, 88), (1574, 95), (123, 215),
             (84, 414), (1611, 351), (560, 843))
    for i, (x, y) in enumerate(lamps):
        flicker = 0.72 + 0.17 * math.sin(phase * 2 + i * 1.8)
        glow(draw, x, y, 35, (255, 155, 52), flicker)
    # Small distant birds stay above the playable rows and flap in offset cycles.
    for i in range(5):
        progress = (t / FRAMES + i * 0.19) % 1.0
        x = 665 + progress * 600
        y = 35 + i * 13 + 5 * math.sin(phase + i)
        wing = 5 + 4 * math.sin(phase * 4 + i * 1.7)
        alpha = int(150 * min(1.0, progress * 9, (1 - progress) * 9))
        color = (22, 27, 31, alpha)
        draw.line((x - 13, y - wing, x, y + 1, x + 13, y - wing),
                  fill=color, width=3)
    # Shifting fold highlights emphasize the movement of the existing canvas.
    tent_shift = 5 * math.sin(phase)
    draw.line((482 + tent_shift, 88, 493 + tent_shift, 119),
              fill=(231, 200, 146, 85), width=3)
    draw.line((541 - tent_shift, 82, 535 - tent_shift, 125),
              fill=(50, 43, 32, 75), width=4)
    for x, y, length in ((78, 258, 91), (1645, 56, 85)):
        fold = 5 * math.sin(phase + y / 70)
        draw.line((x + fold, y + 13, x + fold + 2, y + length),
                  fill=(20, 22, 25, 62), width=3)
    rng = random.Random(2101)
    for i in range(26):
        x0 = rng.randrange(w)
        y0 = rng.choice((rng.randrange(25, 150), rng.randrange(810, h - 12)))
        local = phase + i * 1.71
        x = x0 + 16 * math.sin(local)
        y = y0 + 8 * math.cos(local)
        fade = 0.5 + 0.5 * math.sin(local + 0.7)
        color = (175, 125, 51, int(85 * fade))
        draw.polygon(((x - 4, y), (x + 2, y - 2), (x + 5, y + 1),
                      (x - 1, y + 3)), fill=color)


def cemetery(draw: ImageDraw.ImageDraw, t: int, w: int, h: int) -> None:
    phase = math.tau * t / FRAMES
    for i, (y, height, opacity) in enumerate(((155, 72, 22), (847, 65, 21))):
        shift = 42 * math.sin(phase + i * 1.5)
        for k in range(5):
            x = -220 + k * 390 + shift + 18 * math.sin(phase + k)
            draw.ellipse((x, y - height, x + 580, y + height),
                         fill=(172, 158, 194, opacity))
    crypt_pulse = max(0.0, math.sin(phase * 2 + 0.35)) ** 3
    crypt_strength = 0.12 + 0.88 * crypt_pulse
    glow(draw, 552, 89, 18, (255, 187, 91), crypt_strength)
    draw.polygon(((546, 73), (558, 73), (560, 114), (545, 114)),
                 fill=(255, 181, 79, int(115 * crypt_strength)))
    draw.polygon(((548, 110), (558, 110), (580, 147), (525, 147)),
                 fill=(249, 162, 67, int(22 * crypt_strength)))
    candles = ((28, 116), (37, 280), (45, 424), (1590, 104),
               (1623, 379), (55, 754), (1625, 779))
    for i, (x, y) in enumerate(candles):
        glow(draw, x, y, 24, (255, 180, 92),
             0.55 + 0.18 * math.sin(phase * 2 + i * 2.1))
    rng = random.Random(2102)
    for i in range(17):
        x0 = rng.randrange(65, w - 65)
        y0 = rng.choice((rng.randrange(80, 180), rng.randrange(790, 890)))
        x = x0 + 12 * math.sin(phase + i)
        y = y0 + 8 * math.cos(phase + i * 0.8)
        alpha = int(100 * (0.45 + 0.45 * math.sin(phase + i * 1.3) ** 2))
        draw.ellipse((x - 2, y - 2, x + 2, y + 2),
                     fill=(209, 226, 189, alpha))
    for i, (x, ground) in enumerate(((365, 890), (687, 905),
                                      (1023, 886), (1400, 901))):
        emerging_hand(draw, x, ground, phase, i * 1.6)


def marsh(draw: ImageDraw.ImageDraw, t: int, w: int, h: int) -> None:
    phase = math.tau * t / FRAMES
    rng = random.Random(2103)
    water_lines = (288, 403, 526, 649)
    for lane_y in water_lines:
        for i in range(14):
            x0 = 128 + i * 108 + rng.randrange(-22, 22)
            x = x0 + 12 * math.sin(phase + i * 0.8)
            y = lane_y + rng.randrange(-8, 9)
            alpha = int(32 + 22 * (0.5 + 0.5 * math.sin(phase * 2 + i)))
            draw.arc((x, y - 3, x + 25, y + 4), 15, 165,
                     fill=(143, 196, 179, alpha), width=2)
    # Frogs hop on the back bank and foreground rocks, away from placement cells.
    for i, (x0, ground) in enumerate(((380, 144), (910, 135),
                                      (1320, 154), (470, 868), (1280, 850))):
        local = phase + i * 1.37
        hop = 18 * max(0, math.sin(local)) ** 2
        x = x0 + 11 * math.sin(local)
        y = ground - hop
        draw.ellipse((x - 18, ground - 3, x + 18, ground + 3),
                     fill=(18, 36, 32, 85))
        draw.line((x - 10, y - 1, x - 18, y + 10, x - 23, y + 8),
                  fill=(85, 108, 63, 245), width=6)
        draw.line((x + 8, y, x + 18, y + 10, x + 23, y + 8),
                  fill=(85, 108, 63, 245), width=6)
        draw.ellipse((x - 15, y - 11, x + 13, y + 4),
                     fill=(48, 78, 48, 255), outline=(18, 32, 28, 255), width=2)
        draw.ellipse((x - 17, y - 17, x + 2, y - 3),
                     fill=(70, 100, 59, 255))
        draw.ellipse((x - 14, y - 16, x - 10, y - 12),
                     fill=(206, 202, 126, 255))
        draw.ellipse((x - 4, y - 16, x, y - 12),
                     fill=(206, 202, 126, 255))
        draw.arc((x - 11, y - 7, x, y - 1), 10, 170,
                 fill=(21, 37, 27, 255), width=2)
        if hop < 3:
            draw.arc((x - 19, ground + 2, x + 19, ground + 11),
                     0, 180, fill=(132, 180, 159, 90), width=2)
    # Drops fall from reeds and land as brief rings in the dark channels.
    for i in range(34):
        x = 60 + rng.randrange(w - 120)
        target = rng.choice((112, 276, 398, 522, 644, 862))
        progress = (t / FRAMES + rng.random()) % 1.0
        y = target - 24 + 24 * progress
        fade = min(1.0, progress * 7, (1 - progress) * 7)
        draw.line((x, y - 4, x - 1, y + 1),
                  fill=(167, 207, 187, int(125 * fade)), width=2)
        if progress > 0.72:
            r = 2 + (progress - 0.72) * 17
            draw.arc((x - r, target - r / 3, x + r, target + r / 3),
                     5, 170, fill=(151, 196, 178, int(70 * fade)), width=1)
    for i in range(30):
        x0 = rng.randrange(30, w - 30)
        y0 = rng.choice((rng.randrange(30, 180), rng.randrange(780, h - 15)))
        x = x0 + 15 * math.sin(phase + i * 1.1)
        y = y0 + 11 * math.cos(phase + i * 1.4)
        strength = 0.45 + 0.45 * math.sin(phase + i * 0.8) ** 2
        glow(draw, x, y, 9, (170, 226, 111), strength)
        draw.ellipse((x - 2, y - 2, x + 2, y + 2),
                     fill=(205, 240, 143, int(160 * strength)))


def frost(draw: ImageDraw.ImageDraw, t: int, w: int, h: int) -> None:
    phase = math.tau * t / FRAMES
    rng = random.Random(2104)
    for i in range(260):
        x0 = rng.randrange(w)
        y0 = rng.randrange(h)
        progress = (t / FRAMES + rng.random()) % 1.0
        x = x0 + 35 * progress + 15 * math.sin(phase + i * 0.7)
        y = (y0 + progress * 135) % h
        fade = min(1.0, progress * 8, (1 - progress) * 8)
        size = 1 if i % 3 else 2
        draw.ellipse((x - size, y - size, x + size, y + size),
                     fill=(230, 241, 250, int((135 if size == 1 else 175) * fade)))
    for i in range(32):
        x0 = rng.randrange(w)
        y = rng.randrange(70, h - 60)
        progress = (t / FRAMES + rng.random()) % 1.0
        x = (x0 + 170 * progress) % w
        fade = min(1.0, progress * 7, (1 - progress) * 7)
        draw.line((x, y, x + 25, y - 5),
                  fill=(230, 240, 249, int(65 * fade)), width=2)
    for i, (x, y) in enumerate(((132, 145), (113, 311), (53, 611))):
        glow(draw, x, y, 28, (255, 153, 63),
             0.6 + 0.2 * math.sin(phase * 2 + i * 1.6))
        flame(draw, x, y, phase, i * 1.3)
    for i, (x, y, length) in enumerate(((194, 70, 82), (89, 185, 107),
                                        (64, 630, 104))):
        fold = 4 * math.sin(phase + i)
        draw.line((x + fold, y, x + fold + 2, y + length),
                  fill=(155, 180, 205, 78), width=3)


EFFECTS = {
    "forest-outpost": forest,
    "ruined-cemetery": cemetery,
    "marsh-crossing": marsh,
    "frost-pass": frost,
}


def build(scene: str) -> None:
    base = Image.open(MAPS / f"{scene}.png").convert("RGBA")
    size = base.size
    out = ROOT / scene
    out.mkdir(parents=True, exist_ok=True)
    preview_frames = []
    for t in range(FRAMES):
        layer = Image.new("RGBA", size, (0, 0, 0, 0))
        for polygon, amplitude in CLOTH.get(scene, ()):
            wave_cloth(base, layer, polygon, t, amplitude)
        effects = Image.new("RGBA", size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(effects, "RGBA")
        EFFECTS[scene](draw, t, *size)
        layer = Image.alpha_composite(layer, effects)
        layer.save(out / f"overlay_{t:03d}.png", optimize=True)
        composite = Image.alpha_composite(base, layer).convert("RGB")
        preview_frames.append(composite.resize(PREVIEW_SIZE, Image.Resampling.LANCZOS))
    palette = preview_frames[0].quantize(colors=128, method=Image.Quantize.MEDIANCUT)
    indexed = [frame.quantize(palette=palette, dither=Image.Dither.NONE)
               for frame in preview_frames]
    indexed[0].save(ROOT / f"{scene}-preview.gif", save_all=True,
                    append_images=indexed[1:], duration=round(1000 / FPS),
                    loop=0, optimize=True, disposal=2)


if __name__ == "__main__":
    ROOT.mkdir(parents=True, exist_ok=True)
    for name in SCENES:
        build(name)
        print(f"built {name}")
