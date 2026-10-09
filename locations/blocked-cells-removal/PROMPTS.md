# ImageGen prompts for removal sources

Each `source.png` was generated with the built-in ImageGen edit tool, using the corresponding `../blocked-cells/<location>/<variant>/source.png` as the visual reference. The common instruction was: preserve the exact recognizable obstacle, pixel-art style, palette, perspective, equal five-cell horizontal layout and baseline; make a one-shot removal sequence from fully intact through roughly 80%, 50%, 20% solid to only fading particles; keep a transparent background and contain all particles inside each cell.

| Variant | Dissolve particles |
| --- | --- |
| `forest-outpost/hay-bale` | Golden straw fragments and warm dust motes |
| `forest-outpost/mossy-stump` | Wood splinters, moss flecks and golden leaves |
| `frost-pass/snowdrift` | Snow powder and blue ice crystals |
| `frost-pass/ice-boulders` | Ice shards, frost and glints |
| `marsh-crossing/mud-clump` | Mud droplets, olive flecks and swamp mist |
| `marsh-crossing/root-tangle` | Root splinters, moss and green swamp motes |
| `ruined-cemetery/gravestone` | Chipped stone, violet dust and ghostly wisps |
| `ruined-cemetery/bone-heap` | Bone fragments, violet dust and ghostly sparks |

The build script uses the exact existing idle frame as frame 1 and makes frame 5 fully transparent, so the transition starts and ends cleanly in game.
