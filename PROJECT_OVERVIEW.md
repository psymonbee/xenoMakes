# 🗺️ Project Overview — Coin Quest

A bird's-eye summary of what this project is, how the pieces fit together, and
where to look when you want to change something. For step-by-step "how to run"
and tweak ideas, see **`README.md`**. For notes aimed at AI assistants and the
golden rules, see **`CLAUDE.md`**.

---

## 🎯 What it is

**Coin Quest** is a tiny side-scrolling platformer plus a **drag-and-drop level
designer**. You run around, collect all the coins (or reach the flag), and win.
Then you can **build your own levels** in the editor and play them.

It's a deliberately **small, no-build-step** project so it's easy to learn from:

- **Game library:** [Kaplay](https://kaplay.com) `3001.0.19`, loaded from a CDN.
- **Art:** free [Kenney](https://kenney.nl) sprites (CC0 / public domain).
- **No npm install for the game, no bundler, no compile step.** The only
  dependency (`serve`) is just a tiny local web server so the browser will load
  the PNG files. Everything runs **free and offline after the first load**.

---

## 🧩 The three "pages" (and how they connect)

The project is really **three little web pages** that share a few helper files.

```
   home.html ──► editor.html ──► index.html
   (gallery)     (build it)      (play it)
        └──────────────┴───────── all share ──────────────┘
                  palette.js  +  levels.js
```

| Page | Loads | What it does |
|------|-------|--------------|
| **`home.html`** + `home.js` | palette.js, levels.js | **Home page.** A gallery of saved levels. Each card draws a tiny screenshot of the level's start on a `<canvas>`, with play / edit / delete + "New blank level". |
| **`editor.html`** + `editor.js` | Kaplay, palette.js, levels.js | **Level designer.** Drag-and-drop builder with a left drawer, snapping, fill-paint, foe paths, and a "Play my level" button. Edits one level chosen by `?level=<id>` (`?new=1` starts fresh). |
| **`index.html`** + `main.js` | Kaplay, palette.js, levels.js | **The game.** All gameplay lives here. `?play=<id>` builds a saved level; the legacy `?play=1` plays the old single level; with no query it plays the built-in `LEVEL_MAP`. |

### The two shared "source of truth" files

- **`palette.js`** — the shared **sprite registry**. The one place the editor and
  the game agree on which sprites exist, where they live on disk, how big they
  are, and what they *do* (coin? hazard? solid ground? player?). It also defines
  the **pack** system (see below) and exposes helpers like `window.ROLES`,
  `window.ASSET_INFO`, `window.spritePath()`, and `window.RESET_IDS`.
- **`levels.js`** — the shared **save box** (`window.Levels`). Every named level
  lives in the browser's `localStorage` under one key (`coinquest-levels`).
  Loaded by all three pages so they store/read levels the same way. Provides
  `all()`, `get()`, `create()`, `put()`, `rename()`, `remove()`, `suggestName()`.

---

## 🔄 The typical flow

1. Open **`home.html`** → see your levels → click **New blank level** or **Edit**.
2. That opens **`editor.html?level=<id>`** (or `?new=1`) → build/edit → it
   **auto-saves** to `localStorage` via `levels.js`.
3. Click **Play my level** → opens **`index.html?play=<id>`** → `main.js` reads
   the saved tiles, loads only the sprites that level uses, and runs it.
4. While playing: **E** = edit this level, **H** = home, **R** = restart.

---

## 🎨 The art / "packs" system

Art is organised into **packs** (one set of sprites), each described by a small
manifest. This lets new Kenney packs be mixed in without touching game code.

- The **Classic** pack is written inline in `palette.js` (`BASE_PACK`). It's
  marked `hidden:true` so its art still loads (old levels keep working) but it's
  no longer offered in the editor's pack picker.
- Every other pack lives in its own folder under `assets/packs/<pack>/` with a
  `pack.js` manifest, loaded in `index.html` **and** `editor.html` before
  `palette.js`. The current build pack is the **"New Platformer"** pack.
- **Naming rule that prevents clashes:** the Classic pack keeps plain names
  (`grassMid`); every other pack prefixes its id (`newplat:coin_gold`).

**The golden rule for art:** don't guess filenames. Open **`ASSETS.md`** (the
asset map) to find the right sprite, and update it if you add/remove art.

```
assets/
  characters/  tiles/  items/  enemies/  ui/  backgrounds/   ← Classic pack art
  packs/<pack>/                                              ← extra packs + pack.js
```

---

## 🛠️ Where to change things

| I want to… | Look in… |
|------------|----------|
| Change speed / jump / gravity / tile size | `main.js` — the `SETTINGS` block at the very top |
| Edit the built-in level | `main.js` — the `LEVEL_MAP` (a grid of letters) |
| Add/remove which sprites appear in the drawer + game | `palette.js` (look names up in `ASSETS.md`) |
| Add a whole new art pack | drop art under `assets/packs/<pack>/`, add `pack.js`, load it in both HTML files (see README) |
| Change how levels are saved/loaded | `levels.js` |
| Change the home-page gallery | `home.js` |
| Change the editor (snapping, drawer, foe paths) | `editor.js` |

---

## 📁 Full file map

```
home.html / home.js     ← home page: gallery of saved levels
index.html / main.js    ← the game (gameplay + tweakable SETTINGS)
editor.html / editor.js ← the drag-and-drop level designer
palette.js              ← shared sprite registry (sizes, paths, roles, packs)
levels.js               ← shared save box (window.Levels, localStorage)
assets/                 ← Classic Kenney sprites, in folders
assets/packs/           ← extra art packs, each with its own pack.js manifest
scripts/                ← build helpers (e.g. the pack-manifest generator)
setup.mjs               ← friendly first-time setup helper (npm run setup)
ASSETS.md               ← the asset map: every sprite and what it is
README.md               ← how to run, controls, kid-friendly tweak ideas
CLAUDE.md               ← project guide / rules for AI assistants and humans
GITSORT-LOG.md          ← log of GitHub sync runs (the /gitsort helper)
package.json            ← npm scripts: "setup" and "start" (serve on :8080)
Update game (Mac/Windows) ← one-click scripts to pull the latest code
```

---

## ▶️ Run it in one line

```bash
npm run setup   # first time only — checks Node and installs `serve`
npm start       # then open http://localhost:8080
```

Opening the files directly with `file://` does **not** work — browsers block
loading the PNG assets that way, so always use the local server.
