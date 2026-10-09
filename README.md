# Game art assets

Pixel-art assets for a five-lane fantasy defense game.

## Играбельный прототип

Откройте [game/index.html](game/index.html) в браузере. Правила и управление — в [game/README.md](game/README.md), числа баланса — в [game/balance.js](game/balance.js).

## Contents

- `characters/animated-v2/` — four hero classes with idle, run and action poses; the warrior and healer have four levels.
- `characters/combat-assets-v1/` — axe impact dust, ten archer arrow levels, healing and sword effects, a five-frame sword swing, and four five-frame paladin shields.
- `enemies/orcs-animated/` — four orc enemy types, three levels each.
- `locations/*.png` — forest outpost, ruined cemetery, marsh crossing and frost pass backgrounds.
- `locations/animated/` — the earlier animated background overlays and previews.
- `locations/props-animated/` — separate five-frame prop animations, including frog croak, frog jump, white flag, crow, snowball, bubbles, torch and hands.
- `locations/blocked-cells/` — two five-frame closed-cell obstacles for each of the four location backgrounds.
- `locations/blocked-cells-removal/` — five-frame one-shot dissolution animations for those obstacles.
- `locations/effects-v1/` — transparent 50-frame weather and lighting overlays for the four backgrounds. Each loops over five seconds at 10 FPS.

The individual PNGs and source files are committed. Local ZIP files are excluded because they duplicate the unpacked assets. See the README inside each directory for frame sizes and playback details.

## Previews

- [Animated props](locations/props-animated/overview.png)
- [Closed cells](locations/blocked-cells/overview.png)
- [Closed-cell removal](locations/blocked-cells-removal/overview.png)
- [Location effects](locations/effects-v1/overview.png)
