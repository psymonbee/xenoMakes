# Tools as a workbench — a design doc

*Status: a PLAN, not built yet. Read it, poke holes in it, then decide.*

This is about a tidy-up idea for the **level editor**: making things like
**Rotate** and **Flip** into proper little "tools" that each live in their own
folder, instead of being hard-wired into `editor.js`. Think of it like a
workbench — the canvas is your bench, and the tools hang on the wall in neat
labelled spots. Grab one, use it, hang it back up.

---

## 1. Why bother? (the itch)

Right now, in `editor.js`, **Rotate**, **Flip**, and the **layer nudge** (`[`
and `]`) are three separate chunks of code. But look closely and they all start
with the *exact same* lines — figuring out *"what is the user pointing at right
now?"*:

```js
// This SAME block is copy-pasted into rotateBrush(), flipBrush(), AND nudgeZ():
if (!drag && !paint && mousePos().x >= DRAWER_W) {
  const hit = pickPlaced(toWorld(mousePos()));
  if (hit) { /* ...do the thing to that one tile... */ saveLevel(); return; }
}
// otherwise do the thing to the "brush" / the held tile / the paint fill
```

Three copies of the same idea. That tells us something is missing.

Two problems fall out of this:

1. **Every tool only knows about tiles.** If we ever add other things you can
   select — foe-path dots, text labels, decorations — we'd have to go and edit
   Rotate *and* Flip *and* the layer tool *and* anything new, one by one. Yuck.

2. **Adding a new tool means digging inside `editor.js`.** A 1,378-line file.
   New tools should be droppable, not surgery.

The dream: **a tool says what it DOES to a thing. It does NOT have to know how to
FIND the thing, or what TYPE the thing is.** One place answers "what's
selected?", and every tool just asks it.

> Rotate and Flip are really *one idea* — "transform what I'm pointing at" — that
> happens to apply to lots of kinds of objects. The code should say that out loud.

---

## 2. The big constraint: no build step

This project has **no npm build, no bundler** (on purpose — see `CLAUDE.md`).
Every `.js` file is a plain script loaded by a `<script>` tag, and files talk to
each other through `window.*` globals.

**Good news: we already do exactly the "drop a folder in" trick — for art.**
Each art pack lives in its own folder with a `pack.js` that *registers itself*:

```js
// assets/packs/new-platformer/pack.js
window.EXTRA_PACKS = window.EXTRA_PACKS || [];
window.EXTRA_PACKS.push({ /* ...this pack's sprites... */ });
```

`palette.js` then gathers everyone up. **No file had to be edited to add the
pack** — it announced itself. That is the exact pattern we'll copy for tools.

---

## 3. The three pieces

### Piece A — `Selection` (the missing idea)

One small shared file, `selection.js`, that answers a single question:
**"what is the user acting on right now, and what kind of thing is it?"**

It pulls together the copy-pasted "what am I pointing at?" logic into one home.

```js
// window.Selection — the one place that knows "what's selected right now".
window.Selection = {
  // Returns a little description of the current target, or null for nothing.
  // { kind: "tile" | "brush" | "waypoint" | ..., target: <the object> }
  current() {
    if (drag)  return { kind: "tile",  target: drag.obj };   // a held tile
    if (paint) return { kind: "brush", target: paint };       // the fill brush
    if (mousePos().x >= DRAWER_W) {                           // hovering the world
      const hit = pickPlaced(toWorld(mousePos()));
      if (hit) return { kind: "tile", target: hit };
    }
    return { kind: "brush", target: brushDefaults };          // sets the NEXT tile
  }
};
```

When we add waypoints later, **only this file changes** — it learns to also
return `{ kind: "waypoint", ... }`. Every tool then works on waypoints for free.

### Piece B — `Tools` (the workbench / pegboard)

A tiny registry. Tools hang themselves here. A command (like "rotate") gets
handed to whichever tool owns it.

```js
// window.Tools — the workbench. Tools register themselves on it.
window.Tools = {
  all: [],
  register(tool) { this.all.push(tool); },

  // Run a command on whatever is selected. e.g. run("rotate", +1)
  run(command, arg) {
    const sel = window.Selection.current();
    for (const tool of this.all) {
      if (tool.commands.includes(command)) {
        tool.apply(command, arg, sel);   // hand it the selection; tool does the work
        return;
      }
    }
  }
};
```

### Piece C — each tool, in its own folder

```
tools/
  rotate/
    rotate.js     ← registers the "rotate" command + Q / E keys
  flip/
    flip.js       ← registers "flipX" / "flipY" + X / Y keys
  layer/
    layer.js      ← registers "forward" / "back" + [ / ] keys
```

A tool file is small and self-contained. Here's Rotate, end to end:

```js
// tools/rotate/rotate.js
window.Tools.register({
  name: "rotate",
  commands: ["rotate"],

  // What rotate DOES to a thing. Notice: it never asks "is this a tile?" by
  // hand — it just turns whatever it's given, based on the selection's kind.
  apply(command, dir, sel) {
    const step = (a) => (a + dir * 90 + 360) % 360;
    if (sel.kind === "tile")  { sel.target.spriteAngle = step(sel.target.spriteAngle); saveLevel(); }
    if (sel.kind === "brush") { sel.target.angle       = step(sel.target.angle); }
    // add more "kind"s here ONLY when rotate needs to behave differently
  }
});

// The keys that drive it live WITH the tool, not buried in editor.js.
onKeyPress("q", () => window.Tools.run("rotate", -1));
onKeyPress("e", () => window.Tools.run("rotate", +1));
```

Then `editor.html` loads them — the only wiring needed (just like `pack.js`):

```html
<script src="selection.js"></script>
<script src="tools.js"></script>
<script src="tools/rotate/rotate.js"></script>
<script src="tools/flip/flip.js"></script>
<script src="tools/layer/layer.js"></script>
<script src="editor.js"></script>
```

---

## 4. What this buys us

- **Add a tool** → drop a folder + one `<script>` line. Never reopen rotate/flip.
- **Add a selectable thing** (waypoints, text, decorations) → teach `Selection`
  once; every tool works on it automatically.
- **Rotate and Flip stop being copies** of the same "find the target" code.
- It matches a pattern the project *already proved works* (`pack.js` art packs).
- It's the same shape as Simon's FrameVue project: canvas + tools in neat folders.

## 5. The honest costs (so we go in clear-eyed)

- **More files and one new idea** (`Selection`). For someone learning JS, having
  "press Q → tile turns" readable in one place has real value. This trades a
  little of that for tidiness that only pays off later.
- **The payoff is mostly future.** Today, all three tools act on tiles only, so
  the duplication is just three copies of one `if`. The big win arrives the day
  we add a *second* kind of selectable object, or a *fourth* tool.
- **Globals everywhere.** Without a build step, `window.Tools` etc. are shared
  globals. That's already the house style here, so it fits — but it's worth
  knowing it's a deliberate trade, not an accident.

## 6. Suggested order (if we say yes)

1. **Warm-up (safe, no new files):** pull the copy-pasted "what am I pointing
   at?" block out of `rotateBrush` / `flipBrush` / `nudgeZ` into one
   `currentTarget()` helper *inside* `editor.js`. Proves the idea, changes
   nothing the player sees. Easy to undo.
2. **The workbench:** add `selection.js` + `tools.js`, then move rotate, flip and
   layer into `tools/` folders, wired through `editor.html`.
3. **Stretch goal:** make foe-path waypoints a selectable `kind`, so Rotate/Flip
   "just work" on them — the real test that the design earns its keep.

---

*Open questions for Zac & Simon:* Do we want this only in the editor, or should
the game (`main.js`) share the same `Tools`/`Selection` idea too? And do we keep
the warm-up (step 1) as the finished state for now, or go all the way to folders?
