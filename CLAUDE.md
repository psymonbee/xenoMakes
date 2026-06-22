# CLAUDE.md — project guide for AI assistants (and humans)

This is a **vibe-coding game project** for a 12-year-old who already scripts in
Lua (Roblox) and is learning JavaScript. Keep things **simple, well-commented,
and beginner-friendly**. Explain *why*, not just *what*.

## The stack (deliberately tiny — no build step)
- **Game library:** [Kaplay](https://kaplay.com) — loaded from a CDN in `index.html`,
  pinned to version **3001.0.19**. There is **no npm install, no bundler, no build step.**
- **All game code** lives in a single file: `main.js` (plain browser JavaScript,
  loaded with a `<script>` tag).
- **Page:** `index.html` loads Kaplay + `palette.js` + `main.js`. There's also a
  **level designer** at `editor.html` (loads Kaplay + `palette.js` + `editor.js`).
- It runs by opening the page in a browser **via a tiny local server** (see README).
  Opening `index.html` directly with `file://` does **not** work, because browsers
  block loading the PNG assets that way (CORS). Always use the local server.

## Where things live
```
home.html       ← loads palette.js + levels.js + home.js (no Kaplay needed)
home.js         ← THE HOME PAGE. A gallery of saved levels: each card draws a
                  little screenshot of the level's START on a <canvas> (straight
                  from its tile data), with play / edit / delete + "New blank
                  level" (-> editor?new=1).
index.html      ← loads Kaplay (CDN), palette.js, levels.js, and main.js
main.js         ← THE GAME. All gameplay + tweakable SETTINGS live here.
                  Can also PLAY a designed level: "?play=<id>" builds that saved
                  level; the old "?play=1" still plays the legacy single level.
editor.html     ← loads Kaplay (CDN), palette.js, levels.js, and editor.js
editor.js       ← THE LEVEL DESIGNER. Drag-and-drop builder with a left drawer,
                  edge/stack snapping, and a paint/fill selection. Edits ONE
                  named level chosen by "?level=<id>" ("?new=1" starts a fresh
                  one); saves via levels.js, plus a "Play my level" button.
palette.js      ← Shared sprite list (categories + sizes + paths). The ONE place
                  both the editor and game agree on which sprites exist. Edit
                  here to add/remove sprites available in the drawer + game. A
                  pack marked "hidden:true" (e.g. Classic) still loads its art
                  but stays OUT of the editor's pack-picker.
levels.js       ← Shared "save box" (window.Levels): all named levels live in
                  localStorage "coinquest-levels". Loaded by home, editor + game.
assets/         ← Kenney sprites (CC0), split into subfolders:
  characters/   ← player sprites (p1/p2/p3)
  tiles/        ← ground, platforms, boxes, props
  items/        ← coins, gems, flags, springs, hazards…
  enemies/      ← slimes, snails, flies, fish…
  ui/           ← HUD digits, hearts, key/coin icons
  backgrounds/  ← large tileable backdrops
ASSETS.md       ← THE ASSET MAP. Every sprite, by type, with a description.
README.md       ← how to run, the controls, kid-friendly tweak ideas.
.claude/launch.json ← config so the in-editor preview can serve the game.
```

## The golden rule for art: **prefer individual Kenney PNGs, describe-then-find**
- We keep the **individual PNG sprites** (not packed spritesheets) so each one can
  be wired up by name, one at a time.
- When a request mentions art ("add a knight", "use a red flag", "make a slime
  enemy"), **don't guess filenames** — open **`ASSETS.md`** and look it up. That
  file is the source of truth and should be **re-read at the start of every build**.
- If you add or remove assets, **update `ASSETS.md`** to match.

## Asset facts worth remembering
- Art pack: **Kenney "Platformer Pack" (Base pack)** — **CC0 / public domain**.
- Tiles and most items are **70×70 px**; characters are **~66×92 px**;
  backgrounds are **256×256 px** and tile seamlessly.

## Style guide for changes
- Favor the smallest, clearest change that works. This is a learning codebase.
- Comment generously and in plain language — assume the reader is 12 and new to JS.
- Keep the obvious tweak-knobs (speed, jump, gravity, coin count) easy to find;
  in `main.js` they're collected in a `SETTINGS` block at the very top.
- No accounts, API keys, paid services, or network calls beyond the Kaplay CDN.
  Everything must keep working **free and offline-after-first-load**.
