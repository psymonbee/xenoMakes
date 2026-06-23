---
name: addpacks
description: Import a new art pack (e.g. from kenney.nl) into the game so its sprites show up in the level editor and game. Use whenever someone says "add a pack", "add art", "import a Kenney pack", "new sprite pack", "install this art", drops a pack into the incoming-packs/ folder, pastes a path to a downloaded pack, or runs /addpacks. Takes an optional path to the pack (/addpacks ~/Downloads/kenney_thing); with no path it looks in the incoming-packs/ folder.
---

# /addpacks — turn a downloaded art pack into a real in-game pack

This takes a freshly **downloaded art pack** (almost always from
[kenney.nl](https://kenney.nl), which is free / CC0) and wires it into the game
so every sprite shows up as a choice in the **level editor** and works in the
**game**. You do the fiddly bits — sorting the pictures, building the manifest,
plugging it in — and then **tidy up so there's never a duplicate copy lying
around.**

## The two ways someone gives you a pack
1. **The drop folder** (default): they unzipped a Kenney download into
   **`incoming-packs/`** (a gitignored work area). With no path given, look there.
2. **A pasted path**: `/addpacks ~/Downloads/kenney_pixel-platformer` — they point
   you straight at the unzipped folder (or a `.zip`).

## How packs already work (read this once so you copy the pattern)
- Every extra pack lives in **`assets/packs/<id>/`** with these subfolders:
  `tiles/  characters/  enemies/  backgrounds/  sounds/`, plus a **`pack.js`**
  manifest that registers itself into `window.EXTRA_PACKS`.
- `palette.js` merges all packs into the shared registry the game + editor read.
  Sprite names are namespaced by the pack's `prefix` (`pix:coin_gold`) so two
  packs can't clash.
- The existing **`assets/packs/new-platformer/`** pack is your worked example —
  open its `pack.js` if you're unsure what the manifest should look like.
- There is a generic generator, **`scripts/gen-pack.mjs`**, that writes a pack's
  `pack.js` for you once the art is sorted into those subfolders.

---

## The golden rule: **NO duplicate folders left behind**
The art gets **copied** into `assets/packs/<id>/`. After that succeeds, the raw
download must **not** also be sitting in the repo. So at the end you **empty
`incoming-packs/`** (and never copy a raw download to the repo root). If the
source was a pasted path *outside* the repo, leave the user's own file alone —
just make sure no second copy ended up inside the project.

---

## The runbook (follow in order; read each step's output before the next)

### Step 0 — Find what we're importing
- **Path given** → use it. If it's a `.zip`, unzip it into `incoming-packs/`
  first (`unzip -q <file> -d incoming-packs/`).
- **No path** → look in `incoming-packs/`:
  ```bash
  ls -la incoming-packs/
  ```
  If it's empty (just the README), stop and say kindly: *"Drop the unzipped
  Kenney pack into the `incoming-packs/` folder first, then run `/addpacks`
  again — or paste me the path with `/addpacks <path>`."*

### Step 1 — Look inside and find the individual PNGs
Kenney downloads are NOT laid out like our packs. They usually have folders like
`PNG/`, `Spritesheets/`, `Sounds/`, `Vector/`, `Tilemap/`. We want the
**individual PNG sprites** (often under `PNG/Default/` or similar) — **not** the
packed spritesheets and **not** the vector files.
```bash
find "<source>" -type d | head -40        # see the shape
find "<source>" -name "*.png" | head -40  # find the loose sprites
```
Decide which PNG folder holds the one-file-per-sprite art. If the only art is a
packed spritesheet (no individual PNGs), stop and explain — this pipeline needs
individual PNGs (that's the project's golden rule for art; see CLAUDE.md).

### Step 2 — Pick the pack's id, label and prefix (and don't duplicate)
- **id** = short kebab folder name, e.g. `pixel-platformer`. This becomes
  `assets/packs/<id>/`.
- **label** = friendly button name shown in the editor, e.g. `"Pixel"`.
- **prefix** = short, no spaces, e.g. `pix`. Sprite ids become `pix:coin`.

Check it isn't already installed (avoid a second copy of the same pack):
```bash
ls assets/packs/
```
If a folder with that id already exists, **ask** before overwriting — don't make
`pixel-platformer-2`.

### Step 3 — Create the pack folder and sort the art in
This is the judgement step — Kenney often dumps everything into one `PNG/`
folder, so **you** decide what's a tile vs a character vs a foe vs a backdrop.
```bash
mkdir -p "assets/packs/<id>"/{tiles,characters,enemies,backgrounds,sounds}
```
Then **copy** (don't move from a pasted external path) the PNGs into the right
subfolder:
- **characters/** — the playable hero sprites (walk/jump/idle poses, named like
  `character_*`, `player_*`, or a `Players/` subfolder).
- **enemies/** — foes (slimes, flies, snails, fish, saws… often a `Enemies/`
  subfolder).
- **backgrounds/** — big tileable backdrops (`background_*`, usually 256px+).
- **tiles/** — *everything else*: ground, blocks, items (coins/gems/keys/flags),
  hazards (spikes/saw/lava), props (doors/ladders/signs/springs), HUD digits.
- **sounds/** — any `.ogg`/`.wav` sound effects from the pack's `Sounds/` folder.

When in doubt, glance at **ASSETS.md** for how this project names + describes
each kind of sprite. Keep Kenney's original filenames (lowercase, with
underscores) — the generator and roles rely on them.

### Step 4 — Generate the manifest
```bash
node scripts/gen-pack.mjs --id <id> --label "<Label>" --prefix <prefix>
```
It reads the sorted folders, auto-detects the tile + character pixel sizes from
the PNGs, sorts tiles into categories (Ground/Blocks/Items/Hazards/Props/HUD),
tags roles (coin/hazard/solid/player/flag), picks a Favourites shortlist, and
writes `assets/packs/<id>/pack.js`. Read its summary printout.

### Step 5 — Review + tune the manifest (the part only you can judge)
Open the new `pack.js` and sanity-check against the actual art:
- **Roles** — are the right things marked `coin` / `hazard` / `flag`? Is anything
  solid-looking missing from `solidPrefixes`/`solid`? Did a decoration get
  miscategorised as a hazard, or vice-versa?
- **Favourites** — are the ~15 starter tiles ones a kid would actually reach for
  first? Swap in better picks if not.
- **Sizes** — do `tileW/tileH/charW/charH` match the real art?

**Optional — make tiles interactive.** Springs auto-work if a sprite is named
`spring`. But `?`-blocks, levers, buttons and doors only animate if the pack has
an entry in the `INTERACTIONS` map near the top of **`palette.js`** (keyed by
pack id, listing `[resting, after]` picture-name pairs). Add one there if the
pack has those tiles and you want them to react. (See the `newplat:` entry as the
template.)

### Step 6 — Plug it into the three pages
Each page loads every pack's `pack.js` **before** `palette.js`. Add the same line
to all **three** (it's easy to miss one):
- `index.html` (the game)
- `editor.html` (the level designer)
- `home.html` (the gallery)

The line, matching the existing one:
```html
<script src="assets/packs/<id>/pack.js"></script>
```
Put it right next to the existing `assets/packs/new-platformer/pack.js` line in
each file.

### Step 7 — TIDY UP (the golden rule)
- If the source came from **`incoming-packs/`**, delete it now that the art is
  safely copied into `assets/packs/<id>/`:
  ```bash
  rm -rf incoming-packs/*/ incoming-packs/*.zip   # keep README.md
  ```
- If it came from a **pasted external path**, leave that original alone, but
  double-check no stray copy got left in the repo (no new folder at the repo
  root, `incoming-packs/` empty apart from its README).
- Update **ASSETS.md** with a short note that this pack now exists, so the asset
  map stays the source of truth (the project asks for this whenever assets
  change).

### Step 8 — Show it worked
Verify the editor actually offers the new pack. The friendly way is `/preview`
(it starts the local server) — then the pack's name appears as a button in the
editor's drawer, and its sprites are placeable. If you can't preview, at least
confirm the `<script>` lines are in all three pages and `pack.js` parses
(`node -e "global.window={};require('./assets/packs/<id>/pack.js')"` should run
without error).

---

## Friendly tone
Talk to Zac like a friendly 12-year-old. Lead with the win:

> "Done! 🎨 Your new **Pixel** pack is in. Open the editor and you'll see a
> **Pixel** button at the top of the block drawer — click it to build with the
> new art. I tidied the download away so there's no clutter."

Mention they can run **`/gitsort`** to save the new pack to GitHub, or **`/ship`**
when they want it to be the real game.

## Don't
- **Don't leave two copies of the art.** Empty `incoming-packs/` at the end.
- **Don't overwrite an existing pack** without asking (no `pixel-2` clones).
- **Don't add packed spritesheets or vector files** — individual PNGs only.
- **Don't forget a page** — the `<script>` line goes in all three HTML files.
- **Don't `git push`/`merge`/`delete branches`** — that's `/gitsort` and `/ship`.
