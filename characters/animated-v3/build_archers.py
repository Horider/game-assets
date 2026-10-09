"""Build five-frame archer sprite sheets from the generated transparent strips."""

from pathlib import Path

from PIL import Image


HERE = Path(__file__).resolve().parent
SOURCES = HERE / "sources"
CELL = 362
ROWS = ("idle", "run", "shoot")
FRAMES = 5
BASELINE = 340


def strip_frames(path: Path, count: int = FRAMES) -> list[Image.Image]:
    strip = Image.open(path).convert("RGBA")
    result = []
    for index in range(count):
        left = round(index * strip.width / count)
        right = round((index + 1) * strip.width / count)
        result.append(strip.crop((left, 0, right, strip.height)))
    return result


def content(frame: Image.Image) -> Image.Image:
    # Generated strips sometimes leak a piece of the neighboring frame across
    # a cell boundary. Keep the character's largest connected pixel cluster.
    alpha = frame.getchannel("A")
    width, height = frame.size
    pixels = alpha.tobytes()
    visited = bytearray(width * height)
    largest = []
    for start, value in enumerate(pixels):
        if value < 24 or visited[start]:
            continue
        visited[start] = 1
        cluster = []
        stack = [start]
        while stack:
            index = stack.pop()
            cluster.append(index)
            x = index % width
            y = index // width
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1),
                           (x - 1, y - 1), (x + 1, y - 1),
                           (x - 1, y + 1), (x + 1, y + 1)):
                if 0 <= nx < width and 0 <= ny < height:
                    next_index = ny * width + nx
                    if pixels[next_index] >= 24 and not visited[next_index]:
                        visited[next_index] = 1
                        stack.append(next_index)
        if len(cluster) > len(largest):
            largest = cluster
    if not largest:
        raise ValueError("Blank source frame")
    kept = bytearray(width * height)
    for index in largest:
        kept[index] = pixels[index]
    frame.putalpha(Image.frombytes("L", (width, height), bytes(kept)))
    box = frame.getchannel("A").getbbox()
    if box is None:
        raise ValueError("Blank source frame")
    return frame.crop(box)


def build(level: int) -> None:
    frames_by_row = {}
    for row in ROWS:
        if row == "shoot":
            original = strip_frames(SOURCES / f"archer-level-{level}-shoot-no-arrow-source.png")
            revised = strip_frames(SOURCES / f"archer-level-{level}-shoot-final-two.png", 2)
            frames = original[:3] + revised
        else:
            frames = strip_frames(SOURCES / f"archer-level-{level}-{row}-generated.png")
        frames_by_row[row] = [content(frame) for frame in frames]

    sheet = Image.new("RGBA", (FRAMES * CELL, len(ROWS) * CELL))
    previews = []
    for row_index, row in enumerate(ROWS):
        preview_frames = []
        for frame_index, source in enumerate(frames_by_row[row]):
            # Source strips were generated at different native resolutions.
            # Normalize each cropped pose to the same on-sheet sprite height.
            scale = min(315 / source.width, 265 / source.height)
            size = (round(source.width * scale), round(source.height * scale))
            sprite = source.resize(size, Image.Resampling.NEAREST)
            x = frame_index * CELL + (CELL - sprite.width) // 2
            y = row_index * CELL + BASELINE - sprite.height
            sheet.alpha_composite(sprite, (x, y))
            preview = Image.new("RGBA", (CELL, CELL))
            preview.alpha_composite(sprite, ((CELL - sprite.width) // 2, BASELINE - sprite.height))
            preview_frames.append(preview)
        previews.append(preview_frames)

    sheet.save(HERE / f"archer-level-{level}.png", optimize=True)
    for row, preview_frames in zip(ROWS, previews):
        # GIFs are convenience previews; the PNG sheet keeps the full alpha channel.
        preview_frames[0].save(
            HERE / f"archer-level-{level}-{row}-preview.gif",
            save_all=True,
            append_images=preview_frames[1:],
            duration=125,
            loop=0,
            disposal=2,
        )


if __name__ == "__main__":
    for current_level in range(1, 5):
        build(current_level)
