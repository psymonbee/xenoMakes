// ============================================================================
//  LEVEL DESIGNER  —  a drag-and-drop builder for Coin Quest
// ============================================================================
//  What this is:
//    A little tool (separate from the game) where you DRAG sprites out of a
//    drawer on the left and DROP them onto the world to build a level.
//
//  The three things that make it feel nice:
//    1. A pop-out DRAWER on the left, with the sprites sorted into categories.
//    2. DRAG-AND-DROP: grab a thumbnail, a faded "ghost" follows your mouse,
//       let go to place it.
//    3. SMART SNAPPING: blocks click together edge-to-edge, and when you stack
//       one on top of another it snaps to the LEFT, RIGHT, or MIDDLE of the
//       block below. If nothing is nearby, it lines up to a tidy 70px grid.
//
//  Everything you build is saved in the browser automatically, so it's still
//  there after you refresh the page.
// ============================================================================


// ----------------------------------------------------------------------------
//  SETTINGS  —  the knobs you might want to turn
// ----------------------------------------------------------------------------
// (The grid step is no longer a fixed number — it follows the selected pack's
//  tile size via gridStep(), so 70px Classic and 64px New tiles each line up.)
const DRAWER_W  = 250;   // how wide the left drawer is, in pixels
const SNAP_DIST = 30;    // how close (px) a snap point must be to "grab" you
const PAN_SPEED = 18;    // how fast the arrow keys scroll the world


// ----------------------------------------------------------------------------
//  THE PALETTE  —  which sprites show up in the drawer, by pack & category
// ----------------------------------------------------------------------------
//  The actual lists live in palette.js (shared with the game) so the two can
//  never disagree. There can be several art PACKS (Classic, New Platformer, …);
//  a row of buttons at the top of the drawer picks which one you're building
//  with. To add/remove sprites or packs, edit palette.js (and the pack files).
const PACKS = window.PACKS;
let activePack = 0;     // which art pack is selected

// The categories shown for the current pack. If the pack has a "favourites"
// shortlist, we slip a "★ Faves" tab in front so the best bits are one click
// away instead of buried in a 300-sprite list.
function cats() {
  const p = PACKS[activePack];
  const base = p.categories;
  if (p.favourites && p.favourites.length) {
    return [{ name: "★ Faves", folder: "", items: p.favourites }, ...base];
  }
  return base;
}

// The grid step (and snap fallback) follows the current pack's tile size, so
// 64px New-Platformer tiles line up on a 64px grid and 70px Classic tiles on 70.
function gridStep() {
  return PACKS[activePack].sizes.tileW;
}

// RESET zones are INVISIBLE in the game (they just send the player back to the
// start when touched). Because you can't see them while playing, here in the
// editor we draw them as a RED OUTLINE with a see-through middle, so you always
// know where you placed them. The list itself lives in palette.js so the editor
// and game can never disagree.
// (RESET_COLOR is set up just after kaplay() starts, because rgb() only exists
// once the engine is running.)
const RESET_IDS = window.RESET_IDS;


// ----------------------------------------------------------------------------
//  START KAPLAY  —  make the editor window
// ----------------------------------------------------------------------------
kaplay({
  width: 1280,
  height: 720,
  letterbox: true,
  background: [120, 170, 210],  // a calm blue "drawing board"
});

// We are NOT a platformer here, so we don't want gravity pulling tiles down.
setGravity(0);

// The red we use to outline invisible reset zones (see RESET_IDS above).
// Defined here, after kaplay() has started, so the rgb() helper exists.
const RESET_COLOR = rgb(255, 60, 60);

// Stop the browser's right-click menu popping up (we use right-click to delete).
document.addEventListener("contextmenu", (e) => e.preventDefault());


// ----------------------------------------------------------------------------
//  LOAD THE SPRITES + REMEMBER THEIR SIZES
// ----------------------------------------------------------------------------
//  ASSET[name] = { w, h, folder }  — comes from the shared palette.js.
const ASSET = window.ASSET_INFO;
for (const pack of PACKS) {
  for (const cat of pack.categories) {
    for (const id of cat.items) {
      if (RESET_IDS.has(id)) continue;   // reset zones have no picture to load
      loadSprite(id, window.spritePath(id));
    }
  }
}


// ----------------------------------------------------------------------------
//  STATE  —  the few variables that describe "what's going on right now"
// ----------------------------------------------------------------------------
let activeCat = 0;                 // which category tab is open
let scrollY   = 0;                 // how far the drawer list is scrolled
let placed    = [];                // every sprite the user has dropped
let drag      = null;              // current drag, or null. See startDrag().
let cam       = vec2(0, 0);        // where the world camera is looking

// PAINT MODE: after you drop a tile, that spot becomes the "start" of a fill.
// Move the mouse to preview a rectangle of faded tiles; left-click fills them
// all in, right-click cancels. null when we're not painting. See the bottom.
let paint     = null;              // { id, w, h, ax, ay, ghosts:[], lastX, lastY }

// ROTATION + FLIP: how the NEXT tile (and whatever you're holding/painting) is
// turned and mirrored. Q / E turn it; X mirrors left-right; Y mirrors up-down.
let brushAngle = 0;
let brushFlipX = false;
let brushFlipY = false;

// When a tile is turned 90° or 270°, its width and height swap (a tall tile lies
// down). This returns the [width, height] a tile actually takes up at an angle,
// so snapping and painting still line things up. (At 0°/180° nothing changes.)
function effSize(w, h, angle) {
  return (angle % 180 === 0) ? [w, h] : [h, w];
}

// Start the view so world (0,0) sits just to the RIGHT of the drawer, and a
// little down from the top — a comfy place to start building.
cam.x = width() / 2 - DRAWER_W - 40;
cam.y = height() / 2 - 80;

// Panning the world by dragging empty space:
let panning = false;
let panStartMouse = vec2(0, 0);
let panStartCam   = vec2(0, 0);

const SAVE_KEY = "coinquest-level";   // where we save in the browser


// ----------------------------------------------------------------------------
//  SAVE & LOAD  —  keep the level in the browser so it survives a refresh
// ----------------------------------------------------------------------------
function saveLevel() {
  // We only need each sprite's name, where it is, how far it's turned, and any flip.
  const data = placed.map((o) => ({
    id: o.spriteId, x: o.pos.x, y: o.pos.y,
    angle: o.spriteAngle || 0, flipX: o.flipX || false, flipY: o.flipY || false,
  }));
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

function loadLevel() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return;                       // nothing saved yet
  try {
    for (const t of JSON.parse(raw)) {
      if (!ASSET[t.id]) continue;         // skip sprites we no longer know
      placed.push(makeTile(t.id, t.x, t.y, t.angle || 0, t.flipX || false, t.flipY || false));
    }
  } catch (e) {
    // If the saved data is broken somehow, just start fresh instead of crashing.
    console.warn("Could not load saved level:", e);
  }
}

// Make one placed sprite in the world. Its position is its TOP-LEFT corner
// (anchor "topleft"), which keeps the snapping maths simple. We DRAW the tile
// ourselves (drawSprite) so we can spin it around its centre by o.spriteAngle
// without moving its top-left corner — the snapping and the picture stay in sync.
//
//   o.spriteId   = which sprite this is (for saving + drawing)
//   o.spriteAngle= how far it's turned (0/90/180/270)
//   o.flipX/o.flipY = mirrored left-right / up-down?
//   o.width/o.height = its size in pixels (used by snapping + picking)
//   o.drawOpacity= how solid it looks (1 normal, lower while it's a "ghost")
function makeTile(id, x, y, angle = 0, flipX = false, flipY = false) {
  const a = ASSET[id];
  const o = add([pos(x, y), anchor("topleft"), z(10)]);
  o.spriteId = id;
  o.spriteAngle = angle;
  o.flipX = flipX;
  o.flipY = flipY;
  o.width = a.w;
  o.height = a.h;
  o.drawOpacity = 1;

  o.onDraw(() => {
    // Drawn relative to the tile's top-left, so its CENTRE is at (w/2, h/2).
    const c = vec2(o.width / 2, o.height / 2);
    if (RESET_IDS.has(o.spriteId)) {
      // RESET zones are invisible in the game; here we show them as a red box
      // with a see-through middle so you can see where you placed them.
      drawRect({
        pos: c, anchor: "center", angle: o.spriteAngle,
        width: o.width, height: o.height, fill: false,
        outline: { width: 3, color: RESET_COLOR }, opacity: o.drawOpacity,
      });
    } else {
      drawSprite({
        sprite: o.spriteId, pos: c, anchor: "center", angle: o.spriteAngle,
        flipX: o.flipX, flipY: o.flipY, opacity: o.drawOpacity,
      });
    }
  });

  return o;
}


// ----------------------------------------------------------------------------
//  THE WORLD GRID  —  faint lines so you can see where things will snap
// ----------------------------------------------------------------------------
//  This object has NO fixed(), so it lives in the world and scrolls with the
//  camera. We only draw the lines that are currently on screen (fast!).
add([z(-100)]).onDraw(() => {
  const topLeft     = toWorld(vec2(0, 0));
  const bottomRight = toWorld(vec2(width(), height()));

  const step = gridStep();   // grid spacing for the current pack (70 or 64…)
  const startX = Math.floor(topLeft.x / step) * step;
  const startY = Math.floor(topLeft.y / step) * step;

  for (let x = startX; x < bottomRight.x; x += step) {
    drawLine({
      p1: vec2(x, topLeft.y), p2: vec2(x, bottomRight.y),
      width: 1, color: rgb(255, 255, 255), opacity: 0.10,
    });
  }
  for (let y = startY; y < bottomRight.y; y += step) {
    drawLine({
      p1: vec2(topLeft.x, y), p2: vec2(bottomRight.x, y),
      width: 1, color: rgb(255, 255, 255), opacity: 0.10,
    });
  }

  // A brighter cross marks world origin (0,0) so you never get lost.
  drawLine({ p1: vec2(-12, 0), p2: vec2(12, 0), width: 2, color: rgb(255, 240, 120), opacity: 0.6 });
  drawLine({ p1: vec2(0, -12), p2: vec2(0, 12), width: 2, color: rgb(255, 240, 120), opacity: 0.6 });
});


// ----------------------------------------------------------------------------
//  SNAPPING  —  the clever bit
// ----------------------------------------------------------------------------
//  Given where the mouse WANTS to drop a tile (its top-left), find the nicest
//  nearby spot. We look at every already-placed tile and offer snap points:
//    • beside it    (left / right edge touching, tops or bottoms lined up)
//    • on top of it (lined up to its LEFT, RIGHT, or MIDDLE)
//    • below it     (same three line-ups)
//  We pick the closest snap point within SNAP_DIST. If none is close enough,
//  we fall back to the tidy 70px grid.
function snapPosition(targetX, targetY, w, h, exclude) {
  let best = null;
  let bestDist = SNAP_DIST;

  for (const p of placed) {
    if (p === exclude) continue;          // don't snap a tile to itself
    const px = p.pos.x, py = p.pos.y;
    const [pw, ph] = effSize(p.width, p.height, p.spriteAngle); // turned tiles swap w/h

    const candidates = [
      // To the right of p (edges touching): tops aligned, then bottoms aligned.
      [px + pw, py],
      [px + pw, py + ph - h],
      // To the left of p.
      [px - w, py],
      [px - w, py + ph - h],
      // On TOP of p: align left, align right, align middle.
      [px, py - h],
      [px + pw - w, py - h],
      [px + pw / 2 - w / 2, py - h],
      // BELOW p: align left, align right, align middle.
      [px, py + ph],
      [px + pw - w, py + ph],
      [px + pw / 2 - w / 2, py + ph],
    ];

    for (const c of candidates) {
      const dist = Math.hypot(c[0] - targetX, c[1] - targetY);
      if (dist < bestDist) {
        bestDist = dist;
        best = c;
      }
    }
  }

  if (best) return vec2(best[0], best[1]);

  // Nothing nearby — snap to the plain grid instead (sized to the current pack).
  const step = gridStep();
  return vec2(
    Math.round(targetX / step) * step,
    Math.round(targetY / step) * step,
  );
}


// ----------------------------------------------------------------------------
//  DRAWER LAYOUT HELPERS  —  one source of truth for WHERE things are drawn,
//  reused for both drawing AND clicking (so they can never disagree).
// ----------------------------------------------------------------------------
const TITLE_H   = 44;   // height of the title bar at the very top
const PACK_H    = 28;   // height of the pack-picker row (just under the title)
const TAB_H     = 30;   // height of a category tab
const CLEAR_H   = 40;   // height of the "Clear all" button at the bottom
const COLS      = 3;    // thumbnails per row
const PAD        = 8;   // gap between things

// The pack-picker buttons (one per art pack), in a row under the title.
function packRects() {
  const out = [];
  const bw = (DRAWER_W - PAD * (PACKS.length + 1)) / PACKS.length;
  let x = PAD;
  const y = TITLE_H + PAD;
  for (let i = 0; i < PACKS.length; i++) {
    out.push({ i, x, y, w: bw, h: PACK_H, label: PACKS[i].label });
    x += bw + PAD;
  }
  return out;
}

// The category tabs for the CURRENT pack (returns a screen-space rect for each).
function tabRects() {
  const out = [];
  const list = cats();
  let x = PAD, y = TITLE_H + PAD + PACK_H + PAD;   // below the pack-picker row
  const tw = (DRAWER_W - PAD * (COLS + 1)) / COLS; // same width as 3 columns
  for (let i = 0; i < list.length; i++) {
    if (x + tw > DRAWER_W) { x = PAD; y += TAB_H + PAD; } // wrap to next row
    out.push({ i, x, y, w: tw, h: TAB_H, label: list[i].name });
    x += tw + PAD;
  }
  return out;
}

// Where the scrolling thumbnail list begins (just under the tabs).
function listTop() {
  const tabs = tabRects();
  const last = tabs[tabs.length - 1];
  return last.y + last.h + PAD;
}

// One screen-space rectangle per thumbnail in the active category.
// (These already include the scroll offset, so some may be above/below view.)
function cellRects() {
  const out = [];
  const items = cats()[activeCat].items;
  const cw = (DRAWER_W - PAD * (COLS + 1)) / COLS;
  const ch = cw + 14;                 // square thumb + a little label space
  const top = listTop();
  for (let k = 0; k < items.length; k++) {
    const col = k % COLS;
    const row = Math.floor(k / COLS);
    const x = PAD + col * (cw + PAD);
    const y = top + row * (ch + PAD) - scrollY;
    out.push({ id: items[k], x, y, w: cw, h: ch });
  }
  return out;
}

// The "Clear all" button rectangle (pinned to the very bottom of the drawer).
function clearRect() {
  return { x: PAD, y: height() - CLEAR_H - PAD, w: DRAWER_W - PAD * 2, h: CLEAR_H };
}

// The "Play" button, sitting just above "Clear all".
function playRect() {
  return { x: PAD, y: clearRect().y - CLEAR_H - PAD, w: DRAWER_W - PAD * 2, h: CLEAR_H };
}

// Where the scrolling list ends (just above the two buttons).
function listBottom() {
  return playRect().y - PAD;
}

// How tall the full list is, used to limit scrolling.
function listContentHeight() {
  const n = cats()[activeCat].items.length;
  const cw = (DRAWER_W - PAD * (COLS + 1)) / COLS;
  const ch = cw + 14;
  const rows = Math.ceil(n / COLS);
  return rows * (ch + PAD);
}

// Simple "is the point inside this rectangle?" check.
function inRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}


// ----------------------------------------------------------------------------
//  DRAW THE DRAWER  —  this object HAS fixed(), so it's drawn in screen space
//  (it stays put while the world scrolls behind it).
// ----------------------------------------------------------------------------
const ui = add([fixed(), z(1000)]);

// Draw the row of pack-picker buttons (the selected pack is highlighted).
function paintPackRow(mx, my) {
  for (const p of packRects()) {
    const active = p.i === activePack;
    const hot = inRect(mx, my, p);
    drawRect({
      pos: vec2(p.x, p.y), width: p.w, height: p.h, radius: 5,
      color: active ? rgb(240, 170, 70) : (hot ? rgb(70, 84, 110) : rgb(54, 66, 90)),
    });
    drawText({
      text: p.label, pos: vec2(p.x + p.w / 2, p.y + p.h / 2), size: 12,
      anchor: "center", color: rgb(255, 255, 255), width: p.w - 6,
    });
  }
}

ui.onDraw(() => {
  const mx = mousePos().x, my = mousePos().y;
  const listEnd = listBottom();

  // The drawer panel background.
  drawRect({ pos: vec2(0, 0), width: DRAWER_W, height: height(), color: rgb(28, 36, 52), opacity: 0.96 });

  // Title bar.
  drawRect({ pos: vec2(0, 0), width: DRAWER_W, height: TITLE_H, color: rgb(44, 56, 78) });
  drawText({ text: "🧱 Level Designer", pos: vec2(PAD, 13), size: 18, color: rgb(255, 255, 255) });

  // Pack-picker row (Classic / New Platformer / …).
  paintPackRow(mx, my);

  // Category tabs.
  for (const t of tabRects()) {
    const active = t.i === activeCat;
    const hot = inRect(mx, my, t);
    drawRect({
      pos: vec2(t.x, t.y), width: t.w, height: t.h, radius: 5,
      color: active ? rgb(90, 160, 240) : (hot ? rgb(70, 84, 110) : rgb(54, 66, 90)),
    });
    drawText({
      text: t.label, pos: vec2(t.x + t.w / 2, t.y + t.h / 2), size: 13,
      anchor: "center", color: rgb(255, 255, 255),
    });
  }

  // The scrolling thumbnail grid. We only draw cells that are inside the
  // list area; anything scrolled out of view is skipped.
  for (const c of cellRects()) {
    if (c.y + c.h < listTop() || c.y > listEnd) continue; // off-screen, skip

    const hot = inRect(mx, my, c) && my > listTop() && my < listEnd;
    // Light thumbnail cells so the dark OUTLINES of blocks (stone, castle, etc.)
    // stand out instead of blending into the dark drawer. Hovering brightens it.
    drawRect({
      pos: vec2(c.x, c.y), width: c.w, height: c.h, radius: 5,
      color: hot ? rgb(255, 255, 255) : rgb(214, 221, 232),
    });

    // Fit the sprite inside the cell, keeping its shape (no squishing).
    const a = ASSET[c.id];
    const box = c.w - 12;
    const s = Math.min(box / a.w, box / a.h);
    const dw = a.w * s, dh = a.h * s;
    const dpos = vec2(c.x + c.w / 2 - dw / 2, c.y + 4 + (box - dh) / 2);

    if (RESET_IDS.has(c.id)) {
      // Reset zones are invisible in the game, so show them in the drawer as a
      // red outlined box (matching how they look once placed in the world).
      drawRect({
        pos: dpos, width: dw, height: dh,
        fill: false, outline: { width: 3, color: RESET_COLOR },
      });
    } else {
      drawSprite({ sprite: c.id, pos: dpos, width: dw, height: dh });
    }
  }

  // Cover the strip just under the tabs so scrolled thumbnails don't peek out.
  drawRect({ pos: vec2(0, TITLE_H), width: DRAWER_W, height: listTop() - TITLE_H, color: rgb(28, 36, 52) });
  // Redraw the pack row + tabs on top of that cover.
  paintPackRow(mx, my);
  for (const t of tabRects()) {
    const active = t.i === activeCat;
    const hot = inRect(mx, my, t);
    drawRect({
      pos: vec2(t.x, t.y), width: t.w, height: t.h, radius: 5,
      color: active ? rgb(90, 160, 240) : (hot ? rgb(70, 84, 110) : rgb(54, 66, 90)),
    });
    drawText({
      text: t.label, pos: vec2(t.x + t.w / 2, t.y + t.h / 2), size: 13,
      anchor: "center", color: rgb(255, 255, 255),
    });
  }

  // The "Play" button (opens the game on whatever you've built).
  const pr = playRect();
  const playHot = inRect(mx, my, pr);
  drawRect({ pos: vec2(pr.x, pr.y), width: pr.w, height: pr.h, radius: 6, color: playHot ? rgb(70, 185, 95) : rgb(55, 150, 80) });
  drawText({ text: "▶  Play my level", pos: vec2(pr.x + pr.w / 2, pr.y + pr.h / 2), size: 15, anchor: "center", color: rgb(255, 255, 255) });

  // The "Clear all" button.
  const cr = clearRect();
  const clearHot = inRect(mx, my, cr);
  drawRect({ pos: vec2(cr.x, cr.y), width: cr.w, height: cr.h, radius: 6, color: clearHot ? rgb(200, 70, 70) : rgb(150, 55, 55) });
  drawText({ text: "🗑  Clear all", pos: vec2(cr.x + cr.w / 2, cr.y + cr.h / 2), size: 15, anchor: "center", color: rgb(255, 255, 255) });

  // A little help line along the bottom of the screen (right of the drawer).
  const help = paint
    ? "PAINTING: move the mouse to size the rectangle  •  Q / E rotate  •  X / Y flip  •  left-click to fill it  •  right-click to cancel"
    : "Drag a sprite out to paint  •  Q / E rotate  •  X / Y flip (held tile, or the one under the mouse)  •  drag placed tiles to move  •  right-click to delete  •  arrows scroll";
  drawText({ text: help, pos: vec2(DRAWER_W + 14, height() - 22), size: 13, color: rgb(255, 255, 255), opacity: 0.75 });

  // A little badge (top-right) showing the current rotation + flip, so you always
  // know how the next tile will be placed.
  const flips = (brushFlipX ? " ⇆" : "") + (brushFlipY ? " ⇅" : "");
  drawText({
    text: "Rotation: " + brushAngle + "°" + (flips ? "   Flip:" + flips : ""),
    pos: vec2(width() - 14, 14), size: 16, anchor: "topright",
    color: rgb(255, 255, 255), outline: { width: 3, color: rgb(0, 0, 0) },
  });
});


// ----------------------------------------------------------------------------
//  PICKING  —  find the top-most placed tile under a world point
// ----------------------------------------------------------------------------
function pickPlaced(worldPt) {
  // Search newest-first so the tile drawn on top is the one you grab.
  for (let i = placed.length - 1; i >= 0; i--) {
    const o = placed[i];
    if (
      worldPt.x >= o.pos.x && worldPt.x <= o.pos.x + o.width &&
      worldPt.y >= o.pos.y && worldPt.y <= o.pos.y + o.height
    ) return o;
  }
  return null;
}


// ----------------------------------------------------------------------------
//  DRAGGING  —  start a drag (either a NEW sprite from the drawer, or MOVE an
//  existing one). The faded ghost is just the same object at low opacity.
// ----------------------------------------------------------------------------
function startNewDrag(id) {
  // A new tile inherits the current rotation + flip, so you can set it once and
  // place many the same way.
  const o = makeTile(id, 0, 0, brushAngle, brushFlipX, brushFlipY);
  o.drawOpacity = 0.6;
  o.z = 500;                          // float above everything while dragging
  drag = { mode: "new", obj: o, w: ASSET[id].w, h: ASSET[id].h };
}

function startMoveDrag(o) {
  o.drawOpacity = 0.6;
  o.z = 500;
  brushAngle = o.spriteAngle;         // so Q/E/X/Y keep adjusting from its current state
  brushFlipX = o.flipX;
  brushFlipY = o.flipY;
  drag = { mode: "move", obj: o, w: ASSET[o.spriteId].w, h: ASSET[o.spriteId].h };
}

function removeFromPlaced(o) {
  placed = placed.filter((x) => x !== o);
}


// ----------------------------------------------------------------------------
//  PAINT MODE  —  fill a rectangle of tiles in one go
// ----------------------------------------------------------------------------
//  After you drop a tile, we remember that spot as the "anchor" and switch to
//  paint mode. As the mouse moves we show faded "ghost" tiles filling the
//  rectangle from the anchor to the cursor. Left-click turns them into real
//  tiles; right-click throws the whole selection away.

// Start painting, anchored at the spot where a tile was just dropped.
function startPaint(id, ax, ay) {
  // nw/nh = the tile's normal size; w/h = the size it takes up at the current
  // angle (swapped when turned 90°/270°) so the fill grid lines up.
  const [w, h] = effSize(ASSET[id].w, ASSET[id].h, brushAngle);
  paint = {
    id, nw: ASSET[id].w, nh: ASSET[id].h, w, h,
    angle: brushAngle, flipX: brushFlipX, flipY: brushFlipY,
    ax, ay, ghosts: [], lastX: NaN, lastY: NaN,
  };
}

// Redraw the faded preview to cover the rectangle from the anchor to (cx, cy).
// cx/cy are top-left corners that sit on the SAME grid as the anchor, so the
// tiles always line up perfectly (even for odd-sized character sprites).
function rebuildPaintGhosts(cx, cy) {
  for (const g of paint.ghosts) destroy(g);
  paint.ghosts = [];

  const x0 = Math.min(paint.ax, cx), x1 = Math.max(paint.ax, cx);
  const y0 = Math.min(paint.ay, cy), y1 = Math.max(paint.ay, cy);

  // Safety cap so a giant drag doesn't try to make thousands of tiles.
  const cols = Math.round((x1 - x0) / paint.w) + 1;
  const rows = Math.round((y1 - y0) / paint.h) + 1;
  if (cols * rows > 400) return;

  const isReset = RESET_IDS.has(paint.id);
  for (let x = x0; x <= x1 + 0.5; x += paint.w) {
    for (let y = y0; y <= y1 + 0.5; y += paint.h) {
      // A faded, correctly-rotated/flipped preview tile (drawOpacity < 1 = "ghost").
      const g = makeTile(paint.id, x, y, paint.angle, paint.flipX, paint.flipY);
      g.drawOpacity = isReset ? 0.6 : 0.45;
      g.z = 400;
      paint.ghosts.push(g);
    }
  }
}

// Turn every ghost into a real, saved tile (skipping spots already filled).
function commitPaint() {
  // If the mouse never moved, at least place the single anchor tile.
  if (paint.ghosts.length === 0) {
    placed.push(makeTile(paint.id, paint.ax, paint.ay, paint.angle, paint.flipX, paint.flipY));
  }
  for (const g of paint.ghosts) {
    const dup = placed.some((o) =>
      o.spriteId === paint.id && Math.abs(o.pos.x - g.pos.x) < 1 && Math.abs(o.pos.y - g.pos.y) < 1);
    if (!dup) placed.push(makeTile(paint.id, g.pos.x, g.pos.y, paint.angle, paint.flipX, paint.flipY));
    destroy(g);
  }
  paint = null;
  saveLevel();
}

// Throw the whole selection away without placing anything.
function cancelPaint() {
  for (const g of paint.ghosts) destroy(g);
  paint = null;
}


// ----------------------------------------------------------------------------
//  MOUSE: PRESS  —  decide what the click means
// ----------------------------------------------------------------------------
onMousePress("left", () => {
  const m = mousePos();

  // --- If we're painting, a click finishes it (or cancels, on the drawer). ---
  if (paint) {
    if (m.x < DRAWER_W) cancelPaint();
    else commitPaint();
    return;
  }

  // --- Did we click inside the drawer? ---
  if (m.x < DRAWER_W) {
    // A pack-picker button? Switch packs and jump back to its first tab.
    for (const p of packRects()) {
      if (inRect(m.x, m.y, p)) { activePack = p.i; activeCat = 0; scrollY = 0; return; }
    }
    // A tab?
    for (const t of tabRects()) {
      if (inRect(m.x, m.y, t)) { activeCat = t.i; scrollY = 0; return; }
    }
    // The play button? Save first, then open the game on this level.
    // "./?play=1" points at the game (index.html) and keeps the "?play=1" part
    // even on servers that hide ".html" in the address bar.
    if (inRect(m.x, m.y, playRect())) {
      saveLevel();
      window.location.href = "./?play=1";
      return;
    }
    // The clear button?
    if (inRect(m.x, m.y, clearRect())) {
      for (const o of placed) destroy(o);
      placed = [];
      saveLevel();
      return;
    }
    // A thumbnail? (only if it's within the visible list area)
    if (m.y > listTop() && m.y < listBottom()) {
      for (const c of cellRects()) {
        if (inRect(m.x, m.y, c)) { startNewDrag(c.id); return; }
      }
    }
    return; // clicked drawer background — do nothing
  }

  // --- We clicked on the world. ---
  const w = toWorld(m);
  const hit = pickPlaced(w);
  if (hit) {
    startMoveDrag(hit);                 // grab a tile to move it
  } else {
    panning = true;                     // empty space — pan the view
    panStartMouse = m.clone();
    panStartCam = cam.clone();
  }
});


// ----------------------------------------------------------------------------
//  MOUSE: RIGHT-CLICK  —  delete the tile under the cursor
// ----------------------------------------------------------------------------
onMousePress("right", () => {
  // While painting, right-click throws the selection away.
  if (paint) { cancelPaint(); return; }

  const m = mousePos();
  if (m.x < DRAWER_W) return;           // ignore right-clicks on the drawer
  const hit = pickPlaced(toWorld(m));
  if (hit) {
    destroy(hit);
    removeFromPlaced(hit);
    saveLevel();
  }
});


// ----------------------------------------------------------------------------
//  MOUSE: RELEASE  —  drop the tile (or delete / cancel)
// ----------------------------------------------------------------------------
onMouseRelease("left", () => {
  panning = false;

  if (!drag) return;
  const overDrawer = mousePos().x < DRAWER_W;

  if (overDrawer) {
    // Dropped back into the drawer = throw it away.
    destroy(drag.obj);
    if (drag.mode === "move") removeFromPlaced(drag.obj);
  } else if (drag.mode === "new") {
    // A fresh sprite from the drawer becomes the START of a paint selection.
    const id = drag.obj.spriteId;
    const ax = drag.obj.pos.x, ay = drag.obj.pos.y;
    destroy(drag.obj);                // the ghost is replaced by paint-mode ghosts
    startPaint(id, ax, ay);
  } else {
    // Finished MOVING an existing tile — drop it where it snapped.
    drag.obj.drawOpacity = 1;
    drag.obj.z = 10;
  }
  saveLevel();
  drag = null;
});


// ----------------------------------------------------------------------------
//  MOUSE WHEEL  —  scroll the drawer list when the mouse is over the drawer
// ----------------------------------------------------------------------------
onScroll((delta) => {
  if (mousePos().x >= DRAWER_W) return;        // only scroll over the drawer
  const viewportH = listBottom() - listTop();
  const maxScroll = Math.max(0, listContentHeight() - viewportH);
  scrollY = clamp(scrollY + delta.y, 0, maxScroll);
});


// ----------------------------------------------------------------------------
//  ROTATE  —  press Q (turn left) or E (turn right)
// ----------------------------------------------------------------------------
//  Rotation works on whatever makes sense right now:
//    • holding a tile (dragging)  -> turn the tile you're about to drop
//    • painting a fill            -> turn the whole brush
//    • hovering a placed tile     -> turn just that one tile, in place
//    • over empty space           -> set the angle for the NEXT tile you place
//  dir is +1 for clockwise (E) or -1 for counter-clockwise (Q).
function rotateBrush(dir) {
  // Hovering a placed tile (and not holding/painting one)? Turn just that tile.
  if (!drag && !paint && mousePos().x >= DRAWER_W) {
    const hit = pickPlaced(toWorld(mousePos()));
    if (hit) {
      hit.spriteAngle = (hit.spriteAngle + dir * 90 + 360) % 360;
      brushAngle = hit.spriteAngle;   // remember it for the next tile too
      saveLevel();
      return;
    }
  }

  // Otherwise turn the "brush" (the angle new tiles get).
  brushAngle = (brushAngle + dir * 90 + 360) % 360;

  if (drag) drag.obj.spriteAngle = brushAngle;     // spin the held tile
  if (paint) {                                     // spin the whole fill brush
    paint.angle = brushAngle;
    [paint.w, paint.h] = effSize(paint.nw, paint.nh, paint.angle);
    paint.lastX = NaN; paint.lastY = NaN;          // force the preview to rebuild
  }
}
onKeyPress("q", () => rotateBrush(-1));
onKeyPress("e", () => rotateBrush(1));


// ----------------------------------------------------------------------------
//  FLIP  —  press X (mirror left-right) or Y (mirror up-down)
// ----------------------------------------------------------------------------
//  Flipping MIRRORS a tile instead of turning it — handy for slopes, where a
//  mirror keeps the grass on top but faces the hill the other way. Like rotate,
//  it works on the held tile, the paint brush, the tile under the mouse, or sets
//  the default for the next tile. axis is "x" (left-right) or "y" (up-down).
function flipBrush(axis) {
  const toggle = (o) => { if (axis === "x") o.flipX = !o.flipX; else o.flipY = !o.flipY; };

  // Hovering a placed tile (and not holding/painting one)? Flip just that tile.
  if (!drag && !paint && mousePos().x >= DRAWER_W) {
    const hit = pickPlaced(toWorld(mousePos()));
    if (hit) {
      toggle(hit);
      brushFlipX = hit.flipX; brushFlipY = hit.flipY;  // remember for the next tile
      saveLevel();
      return;
    }
  }

  // Otherwise flip the "brush" (what new tiles get).
  if (axis === "x") brushFlipX = !brushFlipX; else brushFlipY = !brushFlipY;

  if (drag) { drag.obj.flipX = brushFlipX; drag.obj.flipY = brushFlipY; }
  if (paint) {
    paint.flipX = brushFlipX; paint.flipY = brushFlipY;
    paint.lastX = NaN; paint.lastY = NaN;            // force the preview to rebuild
  }
}
onKeyPress("x", () => flipBrush("x"));
onKeyPress("y", () => flipBrush("y"));


// ----------------------------------------------------------------------------
//  EVERY FRAME  —  move the camera, the ghost, and handle panning
// ----------------------------------------------------------------------------
onUpdate(() => {
  // Arrow keys scroll the world around.
  if (isKeyDown("left"))  cam.x -= PAN_SPEED;
  if (isKeyDown("right")) cam.x += PAN_SPEED;
  if (isKeyDown("up"))    cam.y -= PAN_SPEED;
  if (isKeyDown("down"))  cam.y += PAN_SPEED;

  // Dragging empty space pans the view (move mouse right -> world slides right).
  if (panning) {
    const d = mousePos().sub(panStartMouse);
    cam = panStartCam.sub(d);
  }

  setCamPos(cam);

  // If we're dragging a sprite, snap its ghost to the nicest spot under mouse.
  if (drag) {
    const [dw, dh] = effSize(drag.w, drag.h, drag.obj.spriteAngle); // turned tiles swap w/h
    const w = toWorld(mousePos());
    const tx = w.x - dw / 2;             // mouse points at the tile's CENTER
    const ty = w.y - dh / 2;
    drag.obj.pos = snapPosition(tx, ty, dw, dh, drag.obj);
  }

  // If we're painting, preview the rectangle of faded tiles under the mouse.
  if (paint && !drag) {
    const w = toWorld(mousePos());
    const tx = w.x - paint.w / 2;
    const ty = w.y - paint.h / 2;
    // Snap the cursor cell onto the same grid as the anchor (whole steps).
    const cx = paint.ax + Math.round((tx - paint.ax) / paint.w) * paint.w;
    const cy = paint.ay + Math.round((ty - paint.ay) / paint.h) * paint.h;
    if (cx !== paint.lastX || cy !== paint.lastY) {  // only rebuild when it changes
      paint.lastX = cx;
      paint.lastY = cy;
      rebuildPaintGhosts(cx, cy);
    }
  }
});


// ----------------------------------------------------------------------------
//  GO!  —  load any saved level and we're ready to build
// ----------------------------------------------------------------------------
loadLevel();
