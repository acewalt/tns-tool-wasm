# Ndless preview game laboratory

Six original, playable SDK projects exercise the live preview:

| Project | Controls | Coverage |
| --- | --- | --- |
| platformer | Left/Right, Space/Enter | Jumping, gravity, collision, scrolling camera |
| raycaster | Arrows, Space | Software 3D, trigonometry, wall collision, projection |
| pong | Up/Down | Paddle/ball collisions and opponent |
| snake | Arrows, Space to restart | Grid movement, growth and collision |
| blocks | Arrows, Space to drop | Rotation, stacking, row removal |
| sprites | Space | External BMP, color key, clipping, 64–256 sprites |

Esc exits each game. Source is original and provided under the MIT license.
Copy `lab.h` beside the selected `main.c` when creating a project, or use the
generated project ZIPs (`node tools/package-ndless-games.cjs`). `sprites` additionally expects `sprite.bmp` in the
preview's program resources. Output logs expose state used by the automated
gameplay tests; no frame is fabricated from those logs.

The community integration suite separately tests the actual nDoom and
NesNspire sources at pinned revisions. This laboratory is not Mario or Doom;
it provides independent games and reproducible mechanics tests without
commercial game assets.
