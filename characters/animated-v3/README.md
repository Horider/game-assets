# Archer animation, levels 1–4

Each `archer-level-N.png` is a transparent 1810 × 1086 sprite sheet with five 362 × 362 frames in each row:

1. Idle
2. Run
3. Shoot

The shoot row contains no nocked or flying projectile. Render the arrow separately. Its five poses are: nock gesture, half draw, full draw, released hand beside the cheek with a returning string, then open hand beside the shoulder with a straight string. The final two poses have complete arms connected through shoulder, elbow, wrist and hand. Level 1 has bare hands; levels 2–4 have gloves.

The GIF files are quick animation previews. The `sources/` strips and `build_archers.py` reproduce the PNG sheets.
