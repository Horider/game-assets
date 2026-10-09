# Archer arrows: 10 levels

Ten transparent arrow sprites, ordered from level 1 to level 10. Use `level-01.png` through `level-10.png` individually or the horizontal `spritesheet.png` (3620 × 362, ten 362 × 362 cells, left to right). `overview.png` is a labeled preview on a dark background.

Levels **3, 5, 7, and 10** are byte-for-byte copies of the four original arrows in `../archer-arrows/`. Levels **1, 2, 4, 6, 8, and 9** are new designs, fitted to the same transparent 362 × 362 canvas. The `sources/` folder contains all ten inputs, so this pack can be rebuilt on its own. The original four-arrow folder remains intact.

| Level | Design |
| ---: | --- |
| 1 | rough practice arrow with a small iron point |
| 2 | cleaner hunter arrow |
| 3 | original gray-feather broadhead |
| 4 | blue-tipped feather and improved steel broadhead |
| 5 | original blue-feather steel arrow |
| 6 | blue-to-teal feather and engraved silver head |
| 7 | original teal-feather ornate silver arrow |
| 8 | silver, cyan gem and restrained magical glow |
| 9 | silver-gold crystal head and brighter blue magic |
| 10 | original gold and blue enchanted arrow |

Run `build.py` with Pillow to rebuild the ten PNGs, the spritesheet and the overview from the preserved originals and the six generated sources.
