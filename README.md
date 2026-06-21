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

## 🧱 Level Designer (drag-and-drop builder)

There's a separate **drag-and-drop level designer**. With the local server
running, open **http://localhost:8080/editor.html**.

- A **drawer on the left** holds the sprites, sorted into tabs:
  **Tiles, Items, Foes, Players**. Use the mouse wheel to scroll it.
- **Paint blocks in:** drag a sprite out of the drawer and let go — that spot is
  the **start** of a fill. Now move the mouse and a faded preview fills the cells
  in between. **Left-click** drops them all in; **right-click** cancels. (To
  place just one, drop it and click without moving.)
- Blocks **snap together**: edge-to-edge side by side, and when you stack one
  on top of another it snaps to the **left, right, or middle** of the block
  below. If nothing is nearby, it lines up to a tidy grid.
- **Drag a placed tile** to move it. **Right-click** it (or drag it back into
  the drawer) to delete it. The **Clear all** button empties the world.
- Use the **arrow keys** (or drag empty space) to scroll around a big level.
- Your design **saves automatically** in the browser, so it's still there when
  you come back.

### ▶ Play your level
Press the green **Play my level** button in the editor and the game opens on
**your** creation instead of the built-in one. While playing, press **E** to
hop back to the editor, or **R** to restart.

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

Want more sprites in the drawer? Open **`palette.js`** and add their names to the
right category (look the names up in **`ASSETS.md`**). Both the editor and the
game read that one shared list.

---

## 📁 What's in here
- `index.html` — loads the game.
- `main.js` — **all the game code** (this is the fun file).
- `editor.html` / `editor.js` — the **drag-and-drop level designer**.
- `palette.js` — the shared list of which sprites the editor and game use.
- `assets/` — the Kenney sprites, sorted into folders.
- `ASSETS.md` — a list of every sprite and what it is.
- `CLAUDE.md` — notes about how the project is set up.

## 🎨 Credits
Artwork: **Kenney "Platformer Pack"** — [kenney.nl](https://kenney.nl) — released
under **CC0** (public domain, free for any use). Game library:
**[Kaplay](https://kaplay.com)** (MIT). Everything here is free and runs locally.
