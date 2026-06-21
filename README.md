# 🪙 Coin Quest

A little side-scrolling platformer made with [Kaplay](https://kaplay.com) and
free [Kenney](https://kenney.nl) artwork. Run around, grab all the coins, win!

![Made with Kaplay + Kenney CC0 art](https://img.shields.io/badge/Kaplay-3001.0.19-blue) ![Art: Kenney CC0](https://img.shields.io/badge/art-Kenney%20CC0-green)

---

## ▶️ How to run it

### First time on a new computer

**1. Get the code** (in a terminal, in the folder where you keep your projects):

```bash
git clone https://github.com/psymonbee/xenoMakes.git
cd xenoMakes
```

> `git clone` copies the whole project from GitHub onto this computer.

**2. Check + install what it needs** — type this one command:

```bash
npm run setup
```

This runs a friendly helper (`setup.mjs`) that:
- checks that **Node.js** is installed (the program that runs the local server),
- explains that the game library **Kaplay** comes from the internet (nothing to
  install for that),
- runs **`npm install`** to download **`serve`** — a tiny local web server —
  into a `node_modules` folder. Watch the packages download!

> Why a server at all? Browsers refuse to load the picture files from a plain
> `file://` path, so we need a little server to hand them over. That's all it does.

**3. Play!**

```bash
npm start
```

Then open **http://localhost:8080** in your browser. 🎉

> Stop the server any time with **Ctrl + C** in the terminal.

**You only do steps 1–2 once.** After that, just `npm start` whenever you want
to play.

> Don't have Node.js yet? Install it first from **https://nodejs.org** (pick the
> "LTS" version), then come back to step 2.

---

## 🎮 Controls

| Action | Keys |
|--------|------|
| Move left  | **←** or **A** |
| Move right | **→** or **D** |
| Jump       | **Space**, **↑**, or **W** |
| Restart    | **R** |

**Goal:** collect all the gold coins. Grab them all and you see **YOU WIN!**
Fall down a pit and you respawn back at the start.

---

## 🛠️ Try changing this! (3 easy tweaks)

All of these are in **`main.js`**. Change a number, save the file, and refresh
the browser tab to see what happens.

1. **Jump higher (or lower)** — `main.js`, **line 19**
   ```js
   const JUMP_FORCE = 780;   // try 1100 for a big floaty jump, or 500 for tiny hops
   ```

2. **Run faster (or slower)** — `main.js`, **line 18**
   ```js
   const PLAYER_SPEED = 240; // try 400 to zoom, or 120 to creep
   ```

3. **Add or remove coins** — `main.js`, the `LEVEL_MAP` starting at **line 72**
   Each `o` in the map is one coin. Add more `o`s in the sky (over a `=` platform
   so you can reach them), or delete some. The score counter and the "you win"
   total update automatically to match how many `o`s you put in.

   ```
   "              o o o                     ",   ← these are coins!
   "             =======                    ",   ← this is the platform under them
   ```

### Bonus ideas once you're comfortable
- Change the player to the pink character: swap `p1_front.png` → `p2_front.png`
  (and `p1_jump.png` → `p2_jump.png`) in the `loadSprite` lines.
- Make gravity lighter or heavier: `GRAVITY` near the top of `main.js`.
- Build a bigger level by adding more rows/letters to `LEVEL_MAP`.
- See **`ASSETS.md`** for every sprite you can use (knights, slimes, gems, flags…).

---

## 🏠 My Levels (the home page)

You can keep **lots** of levels now, each with its own name. With the local
server running, open **http://localhost:8080/home.html** to see them all.

- Every level shows as a **card** with a little **picture of its start**, a
  **▶ play button**, and **Edit** / **Delete** buttons. Click the picture to
  **play**, or **Edit** to open it in the designer.
- The big green **➕ New blank level** button starts a fresh, empty level.
- The pictures are drawn live from each level — so they're always up to date.

While you're **playing** a level you can press **E** to edit *that* level, **H**
to come back to this home page, or **R** to restart.

---

## 🧱 Level Designer (drag-and-drop builder)

The **drag-and-drop level designer** is where you build a level. Open it from the
home page's **Edit** or **➕ New blank level** buttons (or go straight to
**http://localhost:8080/editor.html**).

- The **name** of the level you're editing shows at the **top-left** of the
  drawer — **click it to rename** the level. The **🏠 Home** button (top-right)
  saves and goes back to your levels.
- A **drawer on the left** holds the sprites, sorted into tabs. Use the mouse
  wheel to scroll it. The tabs start on a **★ Faves** tab of handy favourites so
  you're not scrolling past hundreds of tiles to find the good ones.
- **Paint blocks in:** drag a sprite out of the drawer and let go — that spot is
  the **start** of a fill. Now move the mouse and a faded preview fills the cells
  in between. **Left-click** drops them all in; **right-click** cancels. (To
  place just one, drop it and click without moving.)
- Blocks **snap together**: edge-to-edge side by side, and when you stack one
  on top of another it snaps to the **left, right, or middle** of the block
  below. If nothing is nearby, it lines up to a tidy grid. *Snapping only grabs
  onto **ground / platforms / blocks*** — backgrounds, props and foes are
  ignored, so the cursor stops jumping around when the screen gets busy.
- **Drag a placed tile** to move it. **Right-click** it (or drag it back into
  the drawer) to delete it. The **Clear all** button empties the world.
- **Layers (what's in front of what):** every sprite is automatically sorted so
  it sits on the right "deck" — **backgrounds** go behind everything, then
  decoration, ground, items, foes, and the **player** in front. To fix the odd
  exception, hover a sprite and tap **`[`** to send it back or **`]`** to bring
  it forward.
- Use the **arrow keys** (or drag empty space) to scroll around a big level.
- Your design **saves automatically** in the browser (under its name), so it's
  still there when you come back — and it shows up on the **home page**.

### 🚶 Make a foe move (give it a path)
Enemies normally sit still. To make one **patrol**, click the purple
**🚶 Foe Paths** button (just above *Play my level*) to turn path mode **ON**:

1. **Click a foe** to pick it — it gets a yellow outline and a little options
   panel pops up on the right.
2. **Click empty cells** to drop waypoints. Straight yellow lines join them up,
   numbered in the order the foe will walk. **Right-click** takes back the last
   point.
3. In the panel choose how it moves:
   - **Return ⇄** — walks to the end and back, forever. **Loop ⟳** — walks to the
     end, then straight back to the start, and round again.
   - **Speed** — Slow / Med / Fast.
   - **Wake up** — *Off* means it always moves; *3 / 5 / 8 cells* means it only
     starts moving once the **player gets that close** (a sneaky ambush!).
4. Press **✓ Done** (or turn Foe Paths **OFF**) to go back to normal building.

Touching a moving foe still sends you back to the start, just like a still one.
Drag a foe in normal mode and its whole path moves with it.

### ▶ Play your level
Press the green **Play my level** button in the editor and the game opens on
**your** creation instead of the built-in one. While playing, press **E** to
hop back to the editor, **H** to go to the home page, or **R** to restart.

The game knows what each sprite does:
- **ground tiles, boxes, bricks, bridges** → solid things you stand on,
- **coins, gems, the star** → collect them all to win,
- **a flag** → the goal (if your level has no coins, reach the flag to win),
- **lava, enemies** → touch one and you respawn at the start,
- **the reset block** → an invisible **reset zone**: you can't see it while
  playing, but touching one sends you back to the start. In the editor it shows
  as a **red outline** so you can see exactly where you put it.
- **the player sprite** (p1/p2/p3) → where you begin (and which character),
- everything else (bushes, signs, clouds…) → decoration in the background.

Want more sprites in the drawer? For the **Classic** pack, open **`palette.js`**
and add their names to the right category (look the names up in **`ASSETS.md`**).
Both the editor and the game read that one shared list.

### ➕ Adding a whole new art pack
Kenney has **lots** of platformer packs, and they're built to be mixed. Adding one
is the same three steps every time — no game or editor code changes:

1. **Drop the art in** under `assets/packs/<your-pack>/` (folders like
   `tiles/`, `characters/`, `enemies/`, `backgrounds/`, `sounds/`).
2. **Add a `pack.js` manifest** in that folder that describes the pack — its
   tile size, the sprites (grouped into categories), what they *do* (coin,
   hazard, solid, player…), a favourites shortlist, and any sounds. See
   `assets/packs/new-platformer/pack.js` for a worked example. (That one was
   built automatically by `scripts/gen-pack-new-platformer.mjs`, which reads the
   PNG files and sorts them for you — handy when a pack has hundreds of tiles.)
3. **Load it** by adding one `<script src="assets/packs/<your-pack>/pack.js">`
   line to **`index.html`** *and* **`editor.html`**, just above `palette.js`.

That's it — the new pack shows up in the editor's pack picker, and any level you
build with it plays in the game.

> **Why packs don't clash:** the Classic pack keeps plain sprite names
> (`grassMid`); every other pack puts its id in front (`newplat:coin_gold`).
> That little prefix is what lets two packs both have, say, a `block_blue`
> without confusing each other.

---

## 📁 What's in here
- `home.html` / `home.js` — the **home page**: a gallery of your saved levels.
- `index.html` — loads the game.
- `main.js` — **all the game code** (this is the fun file).
- `editor.html` / `editor.js` — the **drag-and-drop level designer**.
- `palette.js` — the shared sprite **registry** (sizes, paths, roles, packs).
- `levels.js` — the shared **save box** that remembers all your named levels.
- `assets/` — the Classic Kenney sprites, in folders.
- `assets/packs/` — extra art **packs**, each with its own `pack.js` manifest.
- `scripts/` — little build helpers (e.g. the pack-manifest generator).
- `ASSETS.md` — a list of every sprite and what it is.
- `CLAUDE.md` — notes about how the project is set up.

## 🎨 Credits
Artwork: **Kenney** platformer packs — [kenney.nl](https://kenney.nl) — released
under **CC0** (public domain, free for any use): the original *Platformer Pack*
and the *New Platformer Pack* (sprites **and** sound effects). Game library:
**[Kaplay](https://kaplay.com)** (MIT). Everything here is free and runs locally.
