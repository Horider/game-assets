"""Draw five-frame pixel-art pedestals for every game location.

Every pedestal is drawn on a 64 x 48 logical pixel grid and scaled 2x
without smoothing, so each frame is a transparent 128 x 96 PNG. The
pedestal body is identical in all frames; only small details (grass,
reeds, candle flame, sparkles) move, giving a quiet idle loop.

Run:  python build_pedestals.py   (requires Pillow)
"""

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
W, H = 64, 48
SCALE = 2
FRAMES = 5
DURATION = 180
CX, CY, RX, RY, DEPTH = 32, 27, 25, 8, 9


def hexc(value, alpha=255):
    value = value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4)) + (alpha,)


def shade(color, k):
    r, g, b, a = color
    return (max(0, min(255, int(r * k))), max(0, min(255, int(g * k))),
            max(0, min(255, int(b * k))), a)


def in_ellipse(x, y, cx=CX, cy=CY, rx=RX, ry=RY):
    return ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1.0


def sway(f, phase, amp=1.0):
    return round(amp * math.sin(2 * math.pi * f / FRAMES + phase))


class Canvas:
    def __init__(self):
        self.img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        self.px = self.img.load()

    def put(self, x, y, color):
        if 0 <= x < W and 0 <= y < H:
            if color[3] == 255:
                self.px[x, y] = color
            else:
                base = Image.new("RGBA", (1, 1), self.px[x, y])
                top = Image.new("RGBA", (1, 1), color)
                self.px[x, y] = Image.alpha_composite(base, top).getpixel((0, 0))

    def get(self, x, y):
        return self.px[x, y] if 0 <= x < W and 0 <= y < H else (0, 0, 0, 0)

    def line(self, x0, y0, x1, y1, color):
        steps = max(abs(x1 - x0), abs(y1 - y0), 1)
        for i in range(steps + 1):
            self.put(round(x0 + (x1 - x0) * i / steps),
                     round(y0 + (y1 - y0) * i / steps), color)


def draw_body(c, style, rng):
    """Shadow, side wall, top face and outline of the plinth."""
    # Soft ground shadow.
    for y in range(H):
        for x in range(W):
            if in_ellipse(x, y, CX + 1, CY + DEPTH + 2, RX + 3, RY + 1):
                c.put(x, y, (10, 12, 18, 90))

    top, side = set(), set()
    for y in range(H):
        for x in range(W):
            if in_ellipse(x, y):
                top.add((x, y))
            elif any(in_ellipse(x, y - d) for d in range(DEPTH + 1)):
                side.add((x, y))

    # Side wall: horizontal light falloff plus location-specific pattern.
    for x, y in side:
        rel = (x - (CX - RX)) / (2 * RX)
        k = 1.05 - 0.4 * rel
        upper = next(d for d in range(DEPTH + 1) if in_ellipse(x, y - d))
        k -= 0.012 * (DEPTH - upper)
        color = shade(style["side"], k)
        color = style["side_pattern"](x, y, upper, color, rng)
        c.put(x, y, color)

    # Top face with gentle gradient and speckles.
    for x, y in top:
        dx, dy = (x - CX) / RX, (y - CY) / RY
        k = 1.08 - 0.12 * dx - 0.14 * dy
        color = shade(style["top"], k)
        color = style["top_pattern"](x, y, color, rng)
        c.put(x, y, color)

    # Bright front rim where the top face meets the wall.
    for x, y in top:
        if y >= CY and (x, y + 1) in side:
            c.put(x, y, style["rim"])

    # Dark outline around the whole body.
    body = top | side
    outline = style["outline"]
    for x, y in list(body):
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if (nx, ny) not in body:
                c.put(nx, ny, outline)
    return top, side


# ---------------------------------------------------------------- forest


def forest_side(x, y, d, color, rng):
    # Vertical bark grooves.
    if (x * 7 + d // 3) % 5 == 0:
        return shade(color, 0.72)
    if (x * 3 + y) % 11 == 0:
        return shade(color, 1.15)
    return color


def ring_index(x, y):
    return int(math.hypot((x + 0.5 - CX) / RX, (y + 0.5 - CY) / RY) * 4)


def forest_top(x, y, color, rng):
    # Concentric tree rings on a cut stump, plus one radial crack.
    i = ring_index(x, y)
    if ring_index(x + 1, y) != i or ring_index(x, y + 1) != i:
        return shade(color, 0.8)
    if i == 0 and abs(x - CX) < 2 and abs(y - CY) < 1:
        return shade(color, 0.7)
    if y == CY + (x - CX) // 6 and CX + 6 < x < CX + 20:
        return shade(color, 0.62)
    return color


def forest_decor(c, f, rng):
    grass = [hexc("#4f7a2c"), hexc("#6e9a36"), hexc("#3a5c22")]
    moss = hexc("#5a7f2e")
    # Moss tucked under the front rim (static).
    for x in range(10, 54):
        if rng.random() < 0.35:
            y = max(yy for yy in range(H) if in_ellipse(x, yy)) + 1
            c.put(x, y, moss)
    # Grass tufts around the base, swaying.
    tufts = [(6, 37), (10, 41), (18, 44), (45, 44), (53, 41), (58, 37), (30, 46)]
    for i, (bx, by) in enumerate(tufts):
        for j, (ox, h) in enumerate(((-1, 4), (0, 6), (1, 5), (2, 3))):
            s = sway(f, i * 1.3 + j * 0.6)
            col = grass[(i + j) % 3]
            c.line(bx + ox, by, bx + ox + s, by - h, col)
    # Small red mushroom on the stump (static) and a drifting leaf.
    c.put(44, 21, hexc("#f2e7d0"))
    for x in range(42, 47):
        c.put(x, 19, hexc("#b8322a"))
    for x in range(43, 46):
        c.put(x, 18, hexc("#d9473a"))
    c.put(44, 18, hexc("#f2e7d0"))
    c.put(44, 20, hexc("#e8dcc0"))
    leaf_x = (18, 19, 20, 19, 18)[f]
    leaf_y = (14, 13, 14, 15, 14)[f]
    c.put(leaf_x, leaf_y, hexc("#c87a2a"))
    c.put(leaf_x + 1, leaf_y, hexc("#e09a3a"))


# ------------------------------------------------------------------ marsh


def marsh_side(x, y, d, color, rng):
    # Stacked flat stones with dark seams and green slime.
    if d in (3, 7):
        return shade(color, 0.6)
    if (x + (d // 4) * 4) % 9 == 0:
        return shade(color, 0.65)
    if d < 3 and (x * 13) % 7 == 0:
        return hexc("#5d7a2c")
    return color


def marsh_top(x, y, color, rng):
    # Moss grows in patches, mostly near the rim.
    edge = math.hypot((x + 0.5 - CX) / RX, (y + 0.5 - CY) / RY)
    n = math.sin(x * 0.55) + math.sin(y * 1.4 + x * 0.25) + edge * 1.2
    if n > 2.1:
        return hexc("#6b8a33")
    if n > 1.8:
        return hexc("#7f8f4a")
    if rng.random() < 0.06:
        return shade(color, 0.85)
    return color


def marsh_decor(c, f, rng):
    water = hexc("#2f5a5c", 200)
    ripple = hexc("#7fb2a8")
    # Murky water puddle under the base and a pulsing ripple ring.
    for y in range(H):
        for x in range(W):
            if (in_ellipse(x, y, CX, CY + DEPTH + 3, RX + 4, RY - 2)
                    and not any(in_ellipse(x, y - d) for d in range(DEPTH + 2))):
                c.put(x, y, water)
    rip = (0, 1, 2, 1, 0)[f]
    for x in range(CX - RX - 2 - rip, CX + RX + 3 + rip):
        if (x + f) % 4 == 0:
            c.put(x, CY + DEPTH + 7 + (rip > 1), ripple)
    # Hanging moss strands, gently swinging.
    for i, x in enumerate((15, 30, 46)):
        top_y = max(yy for yy in range(H) if in_ellipse(x, yy)) + 1
        length = 2 + (i % 2) * 2
        s = sway(f, i * 1.1, 0.6)
        for k in range(length):
            c.put(x + (s if k == length - 1 else 0), top_y + k, hexc("#78953a"))
    # Reeds and cattails on both sides.
    reeds = [(2, 38, 9), (4, 40, 13), (6, 42, 8), (58, 42, 10), (60, 40, 14), (62, 38, 8)]
    for i, (bx, by, h) in enumerate(reeds):
        s = sway(f, i * 1.4)
        c.line(bx, by, bx + s, by - h, hexc("#6f8a3a"))
        c.put(bx + s, by - h - 1, hexc("#5a4126"))
        c.put(bx + s, by - h - 2, hexc("#6d4e2c"))
        c.put(bx + s, by - h - 3, hexc("#5a4126"))
        c.put(bx + s, by - h - 4, hexc("#8a9a4a"))
    # One rising bubble.
    by = (44, 43, 42, 41, 44)[f]
    if f < 4:
        c.put(61, by, ripple)


# --------------------------------------------------------------- cemetery


def cemetery_side(x, y, d, color, rng):
    # Old stone blocks with a carved band and cracks.
    if d in (2, 3):
        return shade(color, 0.8) if x % 2 else shade(color, 0.9)
    if d == 6:
        return shade(color, 0.6)
    if d > 6 and (x + 3) % 8 == 0:
        return shade(color, 0.6)
    if d < 2 and x % 8 == 0:
        return shade(color, 0.6)
    return color


def cemetery_top(x, y, color, rng):
    # Big flagstones and a diagonal crack.
    if (x - CX) % 13 == 0 or (y - CY) == 0 and x % 3:
        return shade(color, 0.72)
    if abs((x - 36) - (y - 22) * 2) < 1 and 22 <= y <= 31:
        return shade(color, 0.55)
    if rng.random() < 0.08:
        return hexc("#5e5070")
    return color


def cemetery_decor(c, f, rng):
    ivy = [hexc("#3f5a3a"), hexc("#55704a")]
    # Ivy creeping down the left of the wall (static).
    for k in range(10):
        x = 9 + k // 3
        y = 30 + k
        c.put(x, y, ivy[k % 2])
        if k % 3 == 0:
            c.put(x - 1, y, ivy[1])
    # Dead grass at the base, swaying.
    for i, (bx, by) in enumerate(((6, 39), (14, 43), (50, 43), (57, 39))):
        for j, ox in enumerate((-1, 0, 1)):
            s = sway(f, i * 1.2 + j * 0.8)
            c.line(bx + ox, by, bx + ox + s, by - 3 - j, hexc("#7d6f52"))
    # Candle with flickering flame on the back right of the slab.
    wax = hexc("#e6dcc2")
    for y in range(16, 22):
        c.put(46, y, wax)
        c.put(47, y, shade(wax, 0.85))
    c.put(45, 21, hexc("#d8cdb0"))
    c.put(46, 22, hexc("#d8cdb0"))
    c.put(46, 15, hexc("#3a2c22"))
    flame = [
        [(46, 14), (46, 13), (47, 13), (46, 12)],
        [(46, 14), (46, 13), (46, 12), (46, 11)],
        [(46, 14), (47, 14), (46, 13), (47, 12)],
        [(46, 14), (46, 13), (45, 12), (46, 12)],
        [(46, 14), (46, 13), (46, 12)],
    ][f]
    glow = (255, 190, 90, 40)
    for gx in range(40, 54):
        for gy in range(16, 26):
            if (c.get(gx, gy)[3] == 255
                    and (gx - 46.5) ** 2 + ((gy - 21) * 2) ** 2 < 22 + (f % 2) * 8):
                c.put(gx, gy, glow)
    for k, (fx, fy) in enumerate(flame):
        c.put(fx, fy, hexc("#ffd36a") if k < 2 else hexc("#ff8a2a"))
    # Tiny skull lying on the slab (static).
    for x, y, col in ((18, 23, "#ddd6c4"), (19, 23, "#ddd6c4"), (20, 23, "#c9c0aa"),
                      (18, 24, "#2a2230"), (19, 24, "#ddd6c4"), (20, 24, "#2a2230"),
                      (19, 25, "#bdb39c")):
        c.put(x, y, hexc(col))


# ------------------------------------------------------------------ frost


def frost_side(x, y, d, color, rng):
    if d in (4,):
        return shade(color, 0.7)
    if (x + (d // 5) * 5) % 10 == 0:
        return shade(color, 0.7)
    if (x * 5 + y * 3) % 17 == 0:
        return hexc("#cfe3f0")
    return color


def frost_top(x, y, color, rng):
    r = rng.random()
    if r < 0.04:
        return hexc("#ffffff")
    if r < 0.08:
        return hexc("#c4d8ea")
    return color


def frost_decor(c, f, rng):
    snow = hexc("#f4f8fc")
    snow_dark = hexc("#c8d8e8")
    # Snow drifting over the front rim with a lumpy edge (static).
    for x in range(CX - RX + 1, CX + RX):
        top_y = max(yy for yy in range(H) if in_ellipse(x, yy))
        lump = 1 + int(1.5 + 1.5 * math.sin(x * 0.9) + rng.random())
        for k in range(1, lump):
            c.put(x, top_y + k, snow if k < lump - 1 else snow_dark)
    # Icicles along the front wall, a drop forming on one of them.
    for i, x in enumerate((13, 19, 27, 36, 44, 51)):
        top_y = max(yy for yy in range(H) if in_ellipse(x, yy)) + 3
        length = 3 + (i * 2) % 4
        for k in range(length):
            c.put(x, top_y + k, hexc("#bfe4f7") if k < length - 1 else hexc("#e8f7ff"))
        if k and i == 3:
            drop_y = top_y + length + (0, 0, 1, 2, 3)[f]
            if f > 0:
                c.put(x, drop_y, hexc("#d6f1ff"))
    # Snow piles at the foot.
    for x0, w in ((4, 6), (52, 8)):
        for x in range(x0, x0 + w):
            hgt = 1 + (1 if x0 + 1 < x < x0 + w - 2 else 0)
            for k in range(hgt):
                c.put(x, 40 - k + (x0 > 30) * 1, snow if k else snow_dark)
    # Twinkling ice sparkles that hop around between frames.
    spots = [(14, 38), (40, 41), (25, 40), (49, 38), (33, 42)]
    for k in range(2):
        sx, sy = spots[(f + k * 2) % len(spots)]
        bright = hexc("#ffffff")
        c.put(sx, sy, bright)
        if k == 0:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                c.put(sx + dx, sy + dy, hexc("#d8f2ff"))
    # Snowflake drifting down past the pedestal.
    c.put(56, (6, 9, 12, 15, 18)[f], hexc("#ffffff"))


STYLES = {
    "forest-outpost": dict(
        side=hexc("#6a4a2e"), top=hexc("#b88a58"), rim=hexc("#d4a874"),
        outline=hexc("#1e140c"), side_pattern=forest_side,
        top_pattern=forest_top, decor=forest_decor, title="Лес"),
    "marsh-crossing": dict(
        side=hexc("#6b6650"), top=hexc("#8c8264"), rim=hexc("#a89e7a"),
        outline=hexc("#1a1c14"), side_pattern=marsh_side,
        top_pattern=marsh_top, decor=marsh_decor, title="Болото"),
    "ruined-cemetery": dict(
        side=hexc("#5c5866"), top=hexc("#7d7888"), rim=hexc("#a29cae"),
        outline=hexc("#16131c"), side_pattern=cemetery_side,
        top_pattern=cemetery_top, decor=cemetery_decor, title="Кладбище"),
    "frost-pass": dict(
        side=hexc("#6a7a8e"), top=hexc("#e2ecf6"), rim=hexc("#ffffff"),
        outline=hexc("#18202c"), side_pattern=frost_side,
        top_pattern=frost_top, decor=frost_decor, title="Ледяной перевал"),
}


def render(name, style, f):
    c = Canvas()
    # Same seed every frame, so static details never move.
    draw_body(c, style, random.Random(name))
    style["decor"](c, f, random.Random(name + "-decor"))
    return c.img.resize((W * SCALE, H * SCALE), Image.NEAREST)


def build():
    sheets = {}
    for name, style in STYLES.items():
        folder = ROOT / name
        folder.mkdir(exist_ok=True)
        frames = [render(name, style, f) for f in range(FRAMES)]
        sheet = Image.new("RGBA", (W * SCALE * FRAMES, H * SCALE), (0, 0, 0, 0))
        for i, frame in enumerate(frames):
            frame.save(folder / f"frame-{i + 1:02d}.png")
            sheet.paste(frame, (i * W * SCALE, 0))
        sheet.save(folder / "spritesheet.png")
        bg = (34, 38, 48, 255)
        gif = [Image.alpha_composite(Image.new("RGBA", fr.size, bg), fr).convert("RGB")
               .resize((fr.width * 2, fr.height * 2), Image.NEAREST) for fr in frames]
        gif[0].save(folder / "preview.gif", save_all=True, append_images=gif[1:],
                    duration=DURATION, loop=0)
        sheets[name] = (style["title"], frames)

    # Overview: one row per location, five frames at 2x for readability.
    cell_w, cell_h, label_w = W * SCALE * 2, H * SCALE * 2, 200
    ov = Image.new("RGB", (label_w + cell_w * FRAMES, cell_h * len(sheets)), (34, 38, 48))
    draw = ImageDraw.Draw(ov)
    try:
        font = ImageFont.truetype("arial.ttf", 22)
    except OSError:
        font = ImageFont.load_default()
    for row, (name, (title, frames)) in enumerate(sheets.items()):
        draw.text((16, row * cell_h + cell_h // 2 - 22), title, fill=(230, 230, 235), font=font)
        draw.text((16, row * cell_h + cell_h // 2 + 6), name, fill=(150, 156, 170), font=font)
        for i, fr in enumerate(frames):
            big = fr.resize((cell_w, cell_h), Image.NEAREST)
            ov.paste(big, (label_w + i * cell_w, row * cell_h), big)
    ov.save(ROOT / "overview.png")


if __name__ == "__main__":
    build()
