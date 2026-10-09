# Combat assets v1

Transparent fantasy game sprites matching the existing character art.

## Contents

| Folder | Frames | Sequence |
| --- | ---: | --- |
| `axe-impact-dust/` | 5 | ground impact, burst, cloud, dispersal, residual grit |
| `archer-arrows/` | 4 | original arrows, now assigned to levels 3, 5, 7 and 10 |
| `archer-arrows-10/` | 10 | full progression from level 1 to 10 |
| `healing-trace/` | 5 | magical healing effect appearing and fading |
| `sword-swing-trace/` | 5 | silver slash effect appearing and fading |
| `sword-swing/` | 5 | one sword rotating through a swing |
| `paladin-shield/level-1/` to `level-4/` | 5 each | guard, tilt, impact, rebound, guard |

The original animation folders contain `frame-01.png` onward, a horizontal `spritesheet.png`, and the generated `source.png`. All exported frames are 362 × 362 RGBA PNGs on transparent backgrounds. Five-frame sheets are 1810 × 362. The new ten-arrow sheet is 3620 × 362; its cells are ordered by equipment level, not animation pose. See `archer-arrows-10/README.md` for the level map and `archer-arrows-10/overview.png` for its preview.

The animations are one-shot sequences. A starting playback rate of 10 FPS is suitable for testing; tune timing in the game. The shields' first and fifth guard poses can also serve as idle frames. See `overview.png` for a contact sheet.

`build.py` rebuilds the cropped, aligned frames and sheets from the included source strips. It requires Pillow. The sword sequence uses one generated sword rotated into five positions to keep its design consistent.
