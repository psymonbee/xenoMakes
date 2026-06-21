# ASSETS.md — the sprite map for Coin Quest

This file lists **every individual PNG** in `./assets`, grouped by type, with a
plain-English description of each. It's the map we re-read whenever we build
something new. Future prompts can just say *"use the knight"* or *"use a red
flag"* and we look the name up here.

- **Art pack:** Kenney *Platformer Pack* (the "Base pack", 360-asset edition) — **CC0 / public domain**, free to use however you like.
- **All sprites are 70×70 pixels**, except the **characters** (~66×92) and the **backgrounds** (256×256, tileable).
- Paths below are relative to the project root, e.g. `assets/items/coinGold.png`.

---

## characters — `assets/characters/`
Three playable characters (p1 = green alien, p2 = pink, p3 = blue/grey). Each
has the same 5 poses. The game currently uses **p1**.

| File | Description |
|------|-------------|
| `p1_front.png` | Green alien facing forward — the normal standing/running look. **(used as the player)** |
| `p1_stand.png` | Green alien standing tall, side profile. |
| `p1_jump.png` | Green alien in a jumping/leaping pose. **(used while in the air)** |
| `p1_duck.png` | Green alien crouching/ducking down. |
| `p1_hurt.png` | Green alien with a hurt/dizzy face. |
| `p2_front.png` `p2_stand.png` `p2_jump.png` `p2_duck.png` `p2_hurt.png` | Same 5 poses for the **pink** character. |
| `p3_front.png` `p3_stand.png` `p3_jump.png` `p3_duck.png` `p3_hurt.png` | Same 5 poses for the **blue/grey** character. |

> To switch the player to the pink one, change `p1_front.png` → `p2_front.png`
> and `p1_jump.png` → `p2_jump.png` in `main.js`.

---

## tiles — `assets/tiles/`
The building blocks of the world. Most come in **6 material families** that all
share the same naming pattern, plus a set of one-off props.

### How tile names work (read this once and you can read them all)
A tile name is **material + position suffix**:

| Suffix | Means |
|--------|-------|
| `Mid` | a flat top piece (the surface you walk on) |
| `Left` / `Right` | the left/right end cap of a ledge |
| `Center` | a solid fill block (used *under* the ground) |
| `Center_rounded` | a fill block with softer corners |
| `Half`, `HalfLeft`, `HalfMid`, `HalfRight` | thin (half-height) platform pieces |
| `Cliff Left/Right` (+`Alt`) | the vertical sides of a cliff |
| `Hill Left/Right` (+`2`) | sloped/diagonal hill pieces |
| `Ledge Left/Right` | small floating-ledge end caps |
| *(plain name, e.g. `grass.png`)* | a single standalone block |

So `grassMid.png` = grassy walk-on top, `dirtCenter.png` = dirt fill, etc.

### Material families (each has all the suffixes above)
- **grass** (20 files) — green grassy ground. *The game uses `grassMid.png` (top) and `grassCenter.png` (fill).*
  `grass.png` `grassMid.png` `grassLeft.png` `grassRight.png` `grassCenter.png` `grassCenter_rounded.png` `grassHalf.png` `grassHalfLeft.png` `grassHalfMid.png` `grassHalfRight.png` `grassCliffLeft.png` `grassCliffLeftAlt.png` `grassCliffRight.png` `grassCliffRightAlt.png` `grassHillLeft.png` `grassHillLeft2.png` `grassHillRight.png` `grassHillRight2.png` `grassLedgeLeft.png` `grassLedgeRight.png`
- **dirt** (20 files) — brown earth, same set: `dirt.png` `dirtMid.png` `dirtLeft.png` `dirtRight.png` `dirtCenter.png` `dirtCenter_rounded.png` `dirtHalf.png` `dirtHalfLeft.png` `dirtHalfMid.png` `dirtHalfRight.png` `dirtCliffLeft.png` `dirtCliffLeftAlt.png` `dirtCliffRight.png` `dirtCliffRightAlt.png` `dirtHillLeft.png` `dirtHillLeft2.png` `dirtHillRight.png` `dirtHillRight2.png` `dirtLedgeLeft.png` `dirtLedgeRight.png`
- **sand** (20 files) — desert sand, same set: `sand.png` `sandMid.png` `sandLeft.png` `sandRight.png` `sandCenter.png` `sandCenter_rounded.png` `sandHalf.png` `sandHalfLeft.png` `sandHalfMid.png` `sandHalfRight.png` `sandCliffLeft.png` `sandCliffLeftAlt.png` `sandCliffRight.png` `sandCliffRightAlt.png` `sandHillLeft.png` `sandHillLeft2.png` `sandHillRight.png` `sandHillRight2.png` `sandLedgeLeft.png` `sandLedgeRight.png`
- **snow** (20 files) — snowy ground, same set: `snow.png` `snowMid.png` `snowLeft.png` `snowRight.png` `snowCenter.png` `snowCenter_rounded.png` `snowHalf.png` `snowHalfLeft.png` `snowHalfMid.png` `snowHalfRight.png` `snowCliffLeft.png` `snowCliffLeftAlt.png` `snowCliffRight.png` `snowCliffRightAlt.png` `snowHillLeft.png` `snowHillLeft2.png` `snowHillRight.png` `snowHillRight2.png` `snowLedgeLeft.png` `snowLedgeRight.png`
- **stone** (19 files) — grey rock, same set (no plain `stoneHillLeft/Right`): `stone.png` `stoneMid.png` `stoneLeft.png` `stoneRight.png` `stoneCenter.png` `stoneCenter_rounded.png` `stoneHalf.png` `stoneHalfLeft.png` `stoneHalfMid.png` `stoneHalfRight.png` `stoneCliffLeft.png` `stoneCliffLeftAlt.png` `stoneCliffRight.png` `stoneCliffRightAlt.png` `stoneHillLeft2.png` `stoneHillRight2.png` `stoneLedgeLeft.png` `stoneLedgeRight.png` `stoneWall.png` (solid grey brick wall)
- **castle** (20 files) — dark castle blocks: `castle.png` `castleMid.png` `castleLeft.png` `castleRight.png` `castleCenter.png` `castleCenter_rounded.png` `castleHalf.png` `castleHalfLeft.png` `castleHalfMid.png` `castleHalfRight.png` `castleCliffLeft.png` `castleCliffLeftAlt.png` `castleCliffRight.png` `castleCliffRightAlt.png` `castleHillLeft.png` `castleHillLeft2.png` `castleHillRight.png` `castleHillRight2.png` `castleLedgeLeft.png` `castleLedgeRight.png`

### Boxes & crates
| File | Description |
|------|-------------|
| `box.png` | Wooden crate. **(used in the game as a step)** |
| `boxAlt.png` | Alternate wooden crate. |
| `boxEmpty.png` | An opened/empty crate. |
| `boxCoin.png` `boxCoinAlt.png` | "?" coin block (two styles). |
| `boxCoin_disabled.png` `boxCoinAlt_disabled.png` | Used-up coin block (greyed out). |
| `boxItem.png` `boxItemAlt.png` | "?" item block (two styles). |
| `boxItem_disabled.png` `boxItemAlt_disabled.png` | Used-up item block. |
| `boxExplosive.png` `boxExplosiveAlt.png` | Explosive/TNT crate (two styles). |
| `boxExplosive_disabled.png` | Defused explosive crate. |
| `boxWarning.png` | Crate with a yellow warning stripe. |

### Hills (big background shapes)
| File | Description |
|------|-------------|
| `hill_large.png` / `hill_largeAlt.png` | Large rolling background hill (two colours). |
| `hill_small.png` / `hill_smallAlt.png` | Small background hill (two colours). |

### Other props & decorations
| File | Description |
|------|-------------|
| `brickWall.png` | Plain red brick wall block. |
| `bridge.png` | Flat wooden bridge plank. |
| `bridgeLogs.png` | Bridge made of round logs. |
| `door_closedTop.png` / `door_closedMid.png` | Closed door (top half / bottom half). |
| `door_openTop.png` / `door_openMid.png` | Open doorway (top half / bottom half). |
| `fence.png` | Wooden fence section. |
| `fenceBroken.png` | Broken wooden fence. |
| `ladder_top.png` / `ladder_mid.png` | Ladder (top rung / middle section). |
| `liquidWater.png` / `liquidWaterTop.png` / `liquidWaterTop_mid.png` | Water — deep block / surface edge / surface middle. |
| `liquidLava.png` / `liquidLavaTop.png` / `liquidLavaTop_mid.png` | Lava — deep block / surface edge / surface middle. |
| `lock_blue.png` `lock_green.png` `lock_red.png` `lock_yellow.png` | Coloured padlocks (match the keys). |
| `rockHillLeft.png` / `rockHillRight.png` | Rocky slope pieces. |
| `ropeAttached.png` / `ropeVertical.png` / `ropeHorizontal.png` | Rope — anchor point / vertical / horizontal. |
| `sign.png` | Blank wooden sign. |
| `signLeft.png` / `signRight.png` | Sign pointing left / right. |
| `signExit.png` | "Exit" sign. |
| `torch.png` | Unlit wall torch. |
| `tochLit.png` / `tochLit2.png` | Lit wall torch, frames 1 & 2 (note: Kenney's original misspelling "toch"). |
| `window.png` | A window block. |

---

## items — `assets/items/`
Collectables, props and small objects.

| File | Description |
|------|-------------|
| `coinGold.png` | Gold coin. **(used as the collectable in the game)** |
| `coinSilver.png` | Silver coin. |
| `coinBronze.png` | Bronze coin. |
| `gemBlue.png` `gemGreen.png` `gemRed.png` `gemYellow.png` | Shiny gems in 4 colours. |
| `star.png` | Yellow star (great as a bonus pickup). |
| `keyBlue.png` `keyGreen.png` `keyRed.png` `keyYellow.png` | Coloured keys (open the matching `lock_*` tiles). |
| `flagGreen.png` | Green flag on a pole. **(used as the goal flag)** |
| `flagGreen2.png` | Green flag, second wave frame (for animation). |
| `flagGreenHanging.png` | Green flag hanging down (not raised yet). |
| `flagBlue.png` `flagBlue2.png` `flagBlueHanging.png` | Blue flag set (raised / wave frame / hanging). |
| `flagRed.png` `flagRed2.png` `flagRedHanging.png` | Red flag set. |
| `flagYellow.png` `flagYellow2.png` `flagYellowHanging.png` | Yellow flag set. |
| `springboardUp.png` / `springboardDown.png` | Bouncy springboard — relaxed / pressed down. |
| `switchLeft.png` `switchMid.png` `switchRight.png` | A lever switch in 3 positions. |
| `buttonRed.png` / `buttonRed_pressed.png` | Red button — up / pressed. |
| `buttonGreen.png` / `buttonGreen_pressed.png` | Green button — up / pressed. |
| `buttonBlue.png` / `buttonBlue_pressed.png` | Blue button — up / pressed. |
| `buttonYellow.png` / `buttonYellow_pressed.png` | Yellow button — up / pressed. |
| `bomb.png` / `bombFlash.png` | Bomb — normal / flashing (about to explode). |
| `fireball.png` | Orange fireball (hazard or projectile). |
| `spikes.png` | Row of metal spikes (a hazard). |
| `weight.png` / `weightChained.png` | Heavy weight — loose / hanging on a chain. |
| `chain.png` | A single chain link section. |
| `cloud1.png` `cloud2.png` `cloud3.png` | Fluffy white clouds (3 shapes). **(`cloud1` used as sky decoration)** |
| `bush.png` | Small green bush. |
| `cactus.png` | Desert cactus. |
| `plant.png` / `plantPurple.png` | Potted/leafy plant — green / purple. |
| `mushroomBrown.png` / `mushroomRed.png` | Mushroom — brown / red. |
| `rock.png` | Small grey rock/boulder. |
| `snowhill.png` | Small mound of snow. |
| `particleBrick1a.png` `particleBrick1b.png` `particleBrick2a.png` `particleBrick2b.png` | Little brick chunks — for "smash" particle effects. |

---

## enemies — `assets/enemies/`
Bad guys, most with a 2-frame walk/swim cycle plus a "dead" frame.

| File | Description |
|------|-------------|
| `slimeWalk1.png` / `slimeWalk2.png` | Purple slime — walk frames 1 & 2. |
| `slimeDead.png` | Purple slime, squashed. |
| `snailWalk1.png` / `snailWalk2.png` | Snail — walk frames 1 & 2. |
| `snailShell.png` / `snailShell_upsidedown.png` | Snail shell — normal / flipped over. |
| `flyFly1.png` / `flyFly2.png` | Flying bug — wing frames 1 & 2. |
| `flyDead.png` | Flying bug, defeated. |
| `fishSwim1.png` / `fishSwim2.png` | Fish — swim frames 1 & 2. |
| `fishDead.png` | Fish, belly-up. |
| `blockerBody.png` | A blocky "spike-block" enemy body. |
| `blockerMad.png` / `blockerSad.png` | Face for the blocker — angry / sad. |
| `pokerMad.png` / `pokerSad.png` | Spiky "poker" enemy face — angry / sad. |

---

## ui — `assets/ui/`  (HUD = the score/health bits on screen)

| File | Description |
|------|-------------|
| `hud_0.png` … `hud_9.png` | Pixel digits 0–9 for drawing scores/timers. |
| `hud_x.png` | A small "×" (as in "×3 lives"). |
| `hud_coins.png` | Coin icon for the score bar. |
| `hud_heartFull.png` / `hud_heartHalf.png` / `hud_heartEmpty.png` | Health hearts — full / half / empty. |
| `hud_gem_blue.png` `hud_gem_green.png` `hud_gem_red.png` `hud_gem_yellow.png` | Small gem icons for the HUD. |
| `hud_keyBlue.png` `hud_keyGreen.png` `hud_keyRed.png` `hud_keyYellow.png` | Key icons (collected). |
| `hud_keyBlue_disabled.png` `hud_keyGreem_disabled.png` `hud_keyRed_disabled.png` `hud_keyYellow_disabled.png` | Key icons, greyed out (not collected). *(note: green one is spelled `keyGreem` in Kenney's files.)* |
| `hud_p1.png` / `hud_p1Alt.png` | Player-1 face icon — normal / alt. |
| `hud_p2.png` / `hud_p2Alt.png` | Player-2 face icon. |
| `hud_p3.png` / `hud_p3Alt.png` | Player-3 face icon. |

---

## backgrounds — `assets/backgrounds/`
Large 256×256 tileable background images.

| File | Description |
|------|-------------|
| `bg.png` | Plain light-blue sky background (tiles seamlessly). |
| `bg_castle.png` | Dark castle-interior background (tiles seamlessly). |
