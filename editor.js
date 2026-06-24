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
const DRAWER_W  = 250;   // a rough drawer width, used only to frame the camera at
                         //  startup. The REAL, live drawer width comes from
                         //  drawerW() (the HTML drawer can be wider on a tablet).
const SNAP_DIST = 30;    // how close (px) a snap point must be to "grab" you
const PAN_SPEED = 18;    // how fast the arrow keys scroll the world
const DRAG_Z    = 660;   // a tile being dragged/painted floats above the artwork
                         //  (above gameplay's zMax 650, below the path overlay 700)


// ----------------------------------------------------------------------------
//  THE PALETTE  —  which sprites show up in the drawer, by pack & category
// ----------------------------------------------------------------------------
//  The actual lists live in palette.js (shared with the game) so the two can
//  never disagree. There can be several art PACKS (Classic, New Platformer, …);
//  a row of buttons at the top of the drawer picks which one you're building
//  with. To add/remove sprites or packs, edit palette.js (and the pack files).
// ALL_PACKS = every pack (we still LOAD all their sprites, so an old level that
// used Classic tiles keeps showing up). PACKS = only the packs we OFFER in the
// drawer's pack-picker — "hidden" packs (like Classic) are left out on purpose.
const EDITOR_ALL_PACKS = window.PACKS;
const PACKS = window.PACKS.filter((p) => !p.hidden);
let activePack = 0;     // which art pack is selected (index into PACKS)

// The categories shown for the current pack. We ALWAYS slip a "★ Faves" tab in
// front: it's your own, cross-pack palette of starred sprites (see window.Faves
// in palette.js), so your most-used blocks are one tap away no matter which pack
// they came from. You fill it by tapping the ☆ star on any thumbnail.
function cats() {
  const p = PACKS[activePack];
  return [{ name: "★ Faves", folder: "", items: window.Faves.list(), isFaves: true }, ...p.categories];
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
  // No fixed width/height (and no letterbox): the editor fills the whole browser
  // window, so 1 screen pixel == 1 canvas pixel. That's what lets the HTML drawer
  // (real buttons floating on top) line up exactly with the world behind it.
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
const _loaded = new Set();               // remember what we've loaded (no doubles)
for (const pack of EDITOR_ALL_PACKS) {   // load EVERY pack's art, even hidden ones
  for (const cat of pack.categories) {
    for (const id of cat.items) {
      if (RESET_IDS.has(id)) continue;   // reset zones have no picture to load
      loadSprite(id, window.spritePath(id));
      _loaded.add(id);
    }
  }
}
// Also load every ANIMATION frame (a slime's waddle, a flag's wave, a coin's
// spin…) so the editor can show placed tiles ALIVE — and you can SEE the effect
// of switching an animation off. window.ANIM lists them (set up in palette.js).
for (const placedId of Object.keys(window.ANIM)) {
  for (const f of window.ANIM[placedId].frames) {
    if (_loaded.has(f) || !ASSET[f]) continue;
    loadSprite(f, window.spritePath(f));
    _loaded.add(f);
  }
}


// ----------------------------------------------------------------------------
//  STATE  —  the few variables that describe "what's going on right now"
// ----------------------------------------------------------------------------
let activeCat = 0;                 // which category tab is open
let placed    = [];                // every sprite the user has dropped
let drag      = null;              // current drag, or null. See startDrag().
let cam       = vec2(0, 0);        // where the world camera is looking

// PAINT MODE: after you drop a tile, that spot becomes the "start" of a fill.
// Move the mouse to preview a rectangle of faded tiles; left-click fills them
// all in, right-click cancels. null when we're not painting. See the bottom.
let paint     = null;              // { id, w, h, ax, ay, ghosts:[], lastX, lastY }

// FOE PATHS: a separate "mode" for drawing where a foe walks. When pathMode is
// on, clicking a foe SELECTS it (pathFoe), and clicking empty cells lays down its
// route. The options panel on the right edits the selected foe's loop style, speed
// and "wake up" distance. See the "FOE PATHS" section near the bottom of the file.
let pathMode = false;     // are we in path-drawing mode? (toggled by a drawer button)
let pathFoe  = null;      // the placed foe we're currently giving a path to, or null

// The three speeds the Speed button cycles through (pixels per second).
const PATH_SPEEDS = [45, 95, 170];
// The "wake up when the player is this many cells away" choices (0 = always move).
const PATH_RANGES = [0, 3, 5, 8];

// ROTATION + FLIP: how the NEXT tile (and whatever you're holding/painting) is
// turned and mirrored. Q / E turn it; X mirrors left-right; Y mirrors up-down.
let brushAngle = 0;
let brushFlipX = false;
let brushFlipY = false;

// CLICK-TO-PLACE: tap a block in the drawer to "arm" it (it lights up), then tap
// squares in the world to drop it. `armed` is the sprite id you've picked, or
// null. `armedGhost` is a faded preview tile that follows the cursor so you can
// see where it'll land. (Dragging a thumbnail straight out of the HTML drawer
// onto the canvas is a LATER stage; for now it's tap-to-arm, tap-to-place.)
let armed      = null;   // full sprite id currently armed from the drawer, or null
let armedGhost = null;   // faded preview of the armed block under the cursor

// RIGHT-CLICK MENU: a little HTML pop-up (see editor.html) that opens on a tile
// which can ANIMATE, so you can switch its wiggle off/on (or delete it). ctxTarget
// is the placed tile the menu is acting on, or null when the menu is closed.
let ctxTarget = null;

// WHAT DOES CLICKING DO FOR EACH KIND OF BLOCK? (keyed by the block's layer,
// which palette.js already works out for every sprite). This is the one place
// to tweak it; new block types fall back to "place" automatically.
//   "paint" = click a cell, then build a rectangle just like dropping does.
//   "place" = drop a single block (no rectangle), and stay armed for the next.
//   "both"  = single-place by default; hold SHIFT to paint a rectangle instead.
const PLACEMENT_MODES = {
  terrain:    "paint",   // ground, platforms, blocks, spikes/lava
  background: "paint",   // sky / backdrops
  items:      "both",    // coins, flags, gems
  decoration: "place",   // signs, bushes, clouds, props
  foes:       "place",   // enemies
  player:     "place",   // the hero spawn
};
function placementModeFor(id) {
  return PLACEMENT_MODES[(ASSET[id] && ASSET[id].layer)] || "place";
}

// Throw away the armed preview tile (e.g. when we disarm or start dragging).
function clearArmedGhost() {
  if (armedGhost) { destroy(armedGhost); armedGhost = null; }
}

// When a tile is turned 90° or 270°, its width and height swap (a tall tile lies
// down). This returns the [width, height] a tile actually takes up at an angle,
// so snapping and painting still line things up. (At 0°/180° nothing changes.)
function effSize(w, h, angle) {
  return (angle % 180 === 0) ? [w, h] : [h, w];
}

// Start the view centred on the SCREEN BOX (window.FRAME, the 1280x720 area the
// player will actually see). Building inside this box means what you make is what
// they get — and the bottom edge of the box is the bottom of the screen.
cam.x = window.FRAME.w / 2;
cam.y = window.FRAME.h / 2;

// Panning the world by dragging empty space:
let panning = false;
let panStartMouse = vec2(0, 0);
let panStartCam   = vec2(0, 0);

// WHICH level are we editing? The home page opens us with "?level=<id>" (edit an
// existing one) or "?new=1" (start a fresh one). currentLevel is that level
// object from the shared store (levels.js). See resolveCurrentLevel() at the
// bottom of the file, which fills this in before we load anything.
const params = new URLSearchParams(location.search);
let currentLevel = null;


// ----------------------------------------------------------------------------
//  SAVE & LOAD  —  keep the level in the browser so it survives a refresh
// ----------------------------------------------------------------------------
// Turn the placed sprites into the small list of facts we save (and the game reads).
function levelTiles() {
  // We only need each sprite's name, where it is, how far it's turned, and any flip.
  return placed.map((o) => {
    const t = {
      id: o.spriteId, x: o.pos.x, y: o.pos.y,
      angle: o.spriteAngle || 0, flipX: o.flipX || false, flipY: o.flipY || false,
    };
    // Only save the draw order if it's been nudged off this layer's normal value.
    if (o.baseZ !== window.LAYERS.z[o.layer]) t.z = o.baseZ;
    // Only save the animation flag when it's been switched OFF (on is the default,
    // so most tiles save nothing extra and old levels keep animating for free).
    if (o.animOff) t.anim = false;
    // If this is a foe with a walking route, save the route too (waypoints,
    // loop style, speed, and how close the player must be to wake it up).
    if (o.path && o.path.points.length) {
      t.path = {
        points: o.path.points.map((p) => ({ x: p.x, y: p.y })),
        mode: o.path.mode, speed: o.path.speed, range: o.path.range,
      };
    }
    return t;
  });
}

function saveLevel() {
  if (!currentLevel) return;
  currentLevel.tiles = levelTiles();
  currentLevel.pack = activePack;          // remember which pack we were building with
  window.Levels.put(currentLevel);         // save it into the shared "save box"
  // Mirror to the OLD single-level key too, so any old "?play=1" link still works.
  localStorage.setItem("coinquest-level", JSON.stringify(currentLevel.tiles));
}

function loadLevel() {
  if (!currentLevel || !Array.isArray(currentLevel.tiles)) return;
  try {
    for (const t of currentLevel.tiles) {
      if (!ASSET[t.id]) continue;         // skip sprites we no longer know
      const o = makeTile(t.id, t.x, t.y, t.angle || 0, t.flipX || false, t.flipY || false);
      // Bring back a nudged draw order, if this sprite had one.
      if (typeof t.z === "number") { o.baseZ = t.z; o.z = t.z; }
      // Bring back a "switched off" animation, if this tile had one.
      o.animOff = (t.anim === false);
      // Bring back a saved walking route, if this foe had one.
      if (t.path && t.path.points && t.path.points.length) {
        o.path = {
          points: t.path.points.map((p) => ({ x: p.x, y: p.y })),
          mode: t.path.mode || "pingpong",
          speed: t.path.speed || 95,
          range: t.path.range || 0,
        };
      }
      placed.push(o);
    }
  } catch (e) {
    // If the saved data is broken somehow, just start fresh instead of crashing.
    console.warn("Could not load saved level:", e);
  }
}

// Figure out which level we're editing, creating one if needed. Called once at
// the very bottom, just before loadLevel().
function resolveCurrentLevel() {
  const id = params.get("level");
  if (params.get("new") === "1") {
    // The home page's "New blank level" button sends us here.
    currentLevel = window.Levels.create(window.Levels.suggestName(), 0);
    history.replaceState(null, "", "?level=" + currentLevel.id);   // refresh-safe URL
  } else if (id && window.Levels.get(id)) {
    currentLevel = window.Levels.get(id);
  } else {
    // Opened with no level chosen: carry on with the most recent one, or make a
    // first level if there are none yet.
    const all = window.Levels.all();
    currentLevel = all[0] || window.Levels.create(window.Levels.suggestName(), 0);
    history.replaceState(null, "", "?level=" + currentLevel.id);
  }
  // Reopen the drawer on whichever pack this level was last built with.
  if (typeof currentLevel.pack === "number" && currentLevel.pack >= 0 && currentLevel.pack < PACKS.length) {
    activePack = currentLevel.pack;
  }
}

// Pop up a box to rename the level we're editing.
function renameCurrent() {
  const name = prompt("Name this level:", currentLevel ? currentLevel.name : "My Level");
  if (name && name.trim()) { currentLevel.name = name.trim(); saveLevel(); }
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
  o.path = null;   // a foe's walking route (or null). See "FOE PATHS" near the bottom.
  o.animOff = false;  // is this tile's ambient animation switched OFF? (right-click menu)

  // LAYER: which "deck" this sprite draws on (background…player). It's chosen
  // automatically from what the sprite is, so levels look tidy with no fiddling.
  // baseZ is its normal draw order; [ and ] nudge it within the gameplay range.
  o.layer = a.layer || "decoration";
  o.baseZ = window.LAYERS.z[o.layer];
  o.z = o.baseZ;

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
        sprite: tileFrame(o), pos: c, anchor: "center", angle: o.spriteAngle,
        flipX: o.flipX, flipY: o.flipY, opacity: o.drawOpacity,
      });
    }
    // A green outline around the tile the right-click menu is currently acting on.
    if (o === ctxTarget) {
      drawRect({
        pos: c, anchor: "center", angle: o.spriteAngle,
        width: o.width + 6, height: o.height + 6, fill: false,
        outline: { width: 3, color: rgb(90, 220, 120) },
      });
    }
  });

  return o;
}

// Which picture should a placed tile show RIGHT NOW? Usually just its own sprite,
// but an ANIMATED tile (whose animation you haven't switched off) flicks through
// its frames so the editor previews the movement. Heroes are left on their still
// "front" pose — their walk only makes sense once they're moving in the game.
function tileFrame(o) {
  const def = window.ANIM[o.spriteId];
  if (!def || def.player || o.animOff) return o.spriteId;
  const i = Math.floor(time() * def.fps) % def.frames.length;
  return def.frames[i];
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

  // THE SCREEN BOX — a 1280x720 outline showing EXACTLY what the player sees when
  // the level loads. Build inside it. Its BOTTOM edge is the bottom of the screen,
  // so rest your floor along that green line and it'll sit on the ground in-game.
  const FW = window.FRAME.w, FH = window.FRAME.h;
  drawRect({
    pos: vec2(0, 0), width: FW, height: FH,
    fill: false, outline: { width: 3, color: rgb(255, 235, 130) }, opacity: 0.8,
  });
  // A bolder GREEN line on the bottom edge = "the ground line / bottom of screen".
  drawLine({ p1: vec2(0, FH), p2: vec2(FW, FH), width: 6, color: rgb(120, 220, 140), opacity: 0.9 });
  // A little label so it's obvious what the box is.
  drawText({
    text: "screen — what the player sees (floor goes on the green line)",
    pos: vec2(8, 8), size: 20, color: rgb(255, 235, 130), opacity: 0.8,
  });

  // A brighter cross marks world origin (0,0) so you never get lost.
  drawLine({ p1: vec2(-12, 0), p2: vec2(12, 0), width: 2, color: rgb(255, 240, 120), opacity: 0.6 });
  drawLine({ p1: vec2(0, -12), p2: vec2(0, 12), width: 2, color: rgb(255, 240, 120), opacity: 0.6 });
});


// ----------------------------------------------------------------------------
//  FOE PATHS — draw the routes foes will walk (world space, scrolls with camera)
// ----------------------------------------------------------------------------
//  Waypoints are stored as TOP-LEFT positions (just like a tile's pos), so a foe
//  lands exactly on a cell. For DRAWING we want the line to run through tile
//  CENTRES, so we add half the foe's size to each point.

// Snap a world point to a waypoint TOP-LEFT for this foe, lined up to the grid the
// same way placed tiles are (so the route runs neatly cell-to-cell).
function pathSnap(foe, worldPt) {
  const step = gridStep();
  const tx = worldPt.x - foe.width / 2;
  const ty = worldPt.y - foe.height / 2;
  return vec2(Math.round(tx / step) * step, Math.round(ty / step) * step);
}

// The centre of a tile sitting with its top-left at (x, y) for this foe.
function foeCentre(foe, x, y) {
  return vec2(x + foe.width / 2, y + foe.height / 2);
}

// A click on one of the options-panel buttons for the selected foe.
function handlePathButton(key) {
  const p = pathFoe.path;
  if (key === "mode")  p.mode = p.mode === "loop" ? "pingpong" : "loop";
  if (key === "speed") p.speed = PATH_SPEEDS[(Math.max(0, PATH_SPEEDS.indexOf(p.speed)) + 1) % PATH_SPEEDS.length];
  if (key === "range") p.range = PATH_RANGES[(Math.max(0, PATH_RANGES.indexOf(p.range)) + 1) % PATH_RANGES.length];
  if (key === "clear") p.points = [];
  if (key === "done")  pathFoe = null;
  saveLevel();
}

add([z(window.LAYERS.z.paths)]).onDraw(() => {
  if (!pathMode) return;   // only show routes while we're in path mode

  for (const o of placed) {
    if (!o.path || !o.path.points.length) continue;
    const selected = o === pathFoe;
    const lineColor = selected ? rgb(255, 230, 90) : rgb(180, 150, 255);
    const op = selected ? 0.95 : 0.5;

    // The full route runs: foe's own spot -> waypoint 1 -> waypoint 2 -> ...
    const pts = [foeCentre(o, o.pos.x, o.pos.y), ...o.path.points.map((p) => foeCentre(o, p.x, p.y))];
    for (let i = 0; i < pts.length - 1; i++) {
      drawLine({ p1: pts[i], p2: pts[i + 1], width: selected ? 4 : 3, color: lineColor, opacity: op });
    }
    // A numbered dot on each waypoint.
    for (let i = 0; i < o.path.points.length; i++) {
      const c = foeCentre(o, o.path.points[i].x, o.path.points[i].y);
      drawCircle({ pos: c, radius: 11, color: lineColor, opacity: op });
      drawText({ text: String(i + 1), pos: c, size: 14, anchor: "center", color: rgb(30, 20, 50) });
    }
  }

  // Outline the selected foe and draw a live "rubber band" to the snapped cell.
  if (pathFoe && pathFoe.path) {
    drawRect({
      pos: vec2(pathFoe.pos.x, pathFoe.pos.y), width: pathFoe.width, height: pathFoe.height,
      fill: false, outline: { width: 3, color: rgb(255, 230, 90) },
    });
    if (mousePos().x >= drawerW()) {
      const last = pathFoe.path.points.length
        ? pathFoe.path.points[pathFoe.path.points.length - 1]
        : { x: pathFoe.pos.x, y: pathFoe.pos.y };
      const snap = pathSnap(pathFoe, toWorld(mousePos()));
      drawLine({
        p1: foeCentre(pathFoe, last.x, last.y),
        p2: foeCentre(pathFoe, snap.x, snap.y),
        width: 3, color: rgb(255, 230, 90), opacity: 0.5,
      });
    }
  }
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
    // Only the stuff you BUILD ON (ground, platforms, blocks) acts as a snap
    // target. Backgrounds, props, items and foes are ignored, so the cursor
    // stops jumping to a far-off backdrop corner when the screen gets busy.
    if (p.layer !== "terrain") continue;
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
//  A FEW SHARED CONSTANTS
// ----------------------------------------------------------------------------
//  The toolbox DRAWER down the left is now real HTML (see editor.html and the
//  "HTML DRAWER" section further down), so we don't work out where to DRAW it
//  here any more. The only chrome still painted on the canvas is the foe-path
//  options panel on the right edge, which uses this one little spacing value.
const PAD = 8;   // gap between things, in pixels

// The FOE-PATH OPTIONS PANEL on the right edge (only shown when a foe is picked).
// Returns the panel box plus one clickable rect per button, so the SAME function
// is used to draw the buttons AND to test clicks (they can never drift apart).
function pathPanelRects() {
  const w = 210;
  const x = width() - w - PAD;
  let y = 80;
  const bh = 40, gap = 8;
  const bx = x + PAD, bw = w - PAD * 2;
  const btn = (key, label) => {
    const r = { key, label, x: bx, y, w: bw, h: bh };
    y += bh + gap;
    return r;
  };
  y += 46;   // leave room at the top for the two title lines
  const buttons = [
    btn("mode",  ""),     // label is filled in at draw time (depends on the foe)
    btn("speed", ""),
    btn("range", ""),
    btn("clear", "🧹 Clear path"),
    btn("done",  "✓ Done"),
  ];
  const panel = { x, y: 80, w, h: (y - 80) + PAD };
  return { panel, buttons };
}

// Simple "is the point inside this rectangle?" check.
function inRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}


// ----------------------------------------------------------------------------
//  ON-CANVAS CHROME  —  the few bits still painted on the canvas (in screen
//  space, so they stay put while the world scrolls behind them).
// ----------------------------------------------------------------------------
//  The toolbox DRAWER is now real HTML (see editor.html + the "HTML DRAWER"
//  section below). The only things we still paint here are the help line along
//  the bottom, the foe-path options panel on the right, and the rotation badge.
const ui = add([fixed(), z(1000)]);

ui.onDraw(() => {
  const mx = mousePos().x, my = mousePos().y;

  // A little help line along the bottom of the screen (just right of the drawer).
  const help = pathMode
    ? (pathFoe
        ? "PATH MODE: click cells to lay this foe's route  •  right-click removes the last point  •  use the panel to set loop/speed/wake-up  •  ✓ Done when finished"
        : "PATH MODE: click a foe to start drawing where it walks  •  turn Foe Paths OFF to build normally again")
    : paint
    ? "PAINTING: move the mouse to size the rectangle  •  Q / E rotate  •  X / Y flip  •  left-click to fill it  •  right-click to cancel"
    : "Tap a block then tap the world to place  •  Q / E rotate  •  X / Y flip  •  [ / ] send back / bring forward  •  drag placed tiles to move  •  right-click to delete (animated tiles open a menu)  •  arrows scroll";
  drawText({ text: help, pos: vec2(drawerW() + 14, height() - 22), size: 13, color: rgb(255, 255, 255), opacity: 0.75 });

  // The FOE-PATH OPTIONS PANEL (right edge) — only when a foe is selected.
  if (pathMode && pathFoe && pathFoe.path) {
    const { panel, buttons } = pathPanelRects();
    const p = pathFoe.path;
    drawRect({ pos: vec2(panel.x, panel.y), width: panel.w, height: panel.h, radius: 8, color: rgb(40, 30, 58), opacity: 0.96 });
    drawText({ text: "Foe path", pos: vec2(panel.x + PAD, panel.y + 10), size: 16, color: rgb(255, 255, 255) });
    drawText({
      text: p.points.length + " waypoint" + (p.points.length === 1 ? "" : "s"),
      pos: vec2(panel.x + PAD, panel.y + 34), size: 12, color: rgb(210, 200, 230),
    });

    // Fill in the labels that depend on the foe's current settings.
    const speedName = ["Slow", "Med", "Fast"][PATH_SPEEDS.indexOf(p.speed)] || "Med";
    const labelFor = {
      mode:  p.mode === "loop" ? "Loop  ⟳" : "Return  ⇄",
      speed: "Speed: " + speedName,
      range: "Wake up: " + (p.range === 0 ? "Off" : p.range + " cells"),
    };
    for (const b of buttons) {
      const hot = inRect(mx, my, b);
      const danger = b.key === "clear";
      drawRect({
        pos: vec2(b.x, b.y), width: b.w, height: b.h, radius: 6,
        color: danger ? (hot ? rgb(200, 70, 70) : rgb(150, 55, 55))
                      : (hot ? rgb(110, 84, 150) : rgb(80, 64, 110)),
      });
      drawText({
        text: labelFor[b.key] || b.label,
        pos: vec2(b.x + b.w / 2, b.y + b.h / 2), size: 15, anchor: "center", color: rgb(255, 255, 255),
      });
    }
  }

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
//  THE HTML DRAWER  —  the toolbox down the left is REAL HTML (buttons + images)
//  floating on top of the canvas (see editor.html). This is much nicer on a
//  tablet than fake buttons painted on the canvas: the buttons are a comfy size
//  to tap, and the thumbnail list scrolls with your finger for free.
// ----------------------------------------------------------------------------
//  The catch: a canvas redraws itself every frame, so the old drawer updated for
//  free. HTML does NOT — so whenever we change something the drawer shows (the
//  level name, the active pack/tab, the armed block, or the Foe-Paths toggle) we
//  must call syncDrawer() by hand to refresh the labels and highlights.

// Grab the bits of the page we set up in editor.html, so we can fill + wire them.
const elDrawer   = document.getElementById("drawer");
const elNameBtn  = document.getElementById("nameBtn");
const elHomeBtn  = document.getElementById("homeBtn");
const elPackRow  = document.getElementById("packRow");
const elTabRow   = document.getElementById("tabRow");
const elThumbs   = document.getElementById("thumbs");
const elPathsBtn = document.getElementById("pathsBtn");
const elPlayBtn  = document.getElementById("playBtn");
const elClearBtn = document.getElementById("clearBtn");

// How wide is the drawer RIGHT NOW, in screen pixels? The world handlers use this
// to ignore clicks that landed on the drawer. We measure the real element each
// time because its width changes with the screen size (see the @media rule in
// editor.html). With the editor filling the window, screen px == canvas px, so
// this number lines up with mousePos().
function drawerW() {
  return elDrawer ? elDrawer.getBoundingClientRect().width : 0;
}

// Build the pack-picker buttons (Classic / New Platformer / …). We only show this
// row when there's more than one pack — with a single pack it'd be one pointless
// button, so we hide it and give that space back to the sprite list.
function buildPackRow() {
  elPackRow.innerHTML = "";
  if (PACKS.length <= 1) { elPackRow.style.display = "none"; return; }
  elPackRow.style.display = "";
  PACKS.forEach((pack, i) => {
    const b = document.createElement("button");
    b.textContent = pack.label;
    b.dataset.pack = i;
    b.addEventListener("click", () => {
      if (paint) cancelPaint();      // tidy up any half-painted rectangle first
      activePack = i;
      activeCat = 0;                 // jump back to the new pack's first tab
      buildTabs();
      buildThumbs();
      syncDrawer();
    });
    elPackRow.appendChild(b);
  });
}

// Build the category tabs for the CURRENT pack (★ Faves, Terrain, Items, …).
function buildTabs() {
  elTabRow.innerHTML = "";
  cats().forEach((cat, i) => {
    const b = document.createElement("button");
    b.textContent = cat.name;
    b.dataset.tab = i;
    b.addEventListener("click", () => {
      if (paint) cancelPaint();
      activeCat = i;
      buildThumbs();
      syncDrawer();
    });
    elTabRow.appendChild(b);
  });
}

// Build the scrolling thumbnail grid for the active category. Each thumbnail is a
// real <img> of the sprite (or, for invisible reset zones, a red outlined box).
function buildThumbs() {
  elThumbs.innerHTML = "";
  elThumbs.scrollTop = 0;            // start a fresh list at the top
  const cat = cats()[activeCat];
  const items = cat.items;

  // Friendly nudge when your Faves palette is still empty, so it's never a
  // blank, confusing screen — it tells you exactly how to fill it.
  if (cat.isFaves && items.length === 0) {
    const hint = document.createElement("div");
    hint.className = "fave-empty";
    hint.textContent = "No faves yet! Tap the ☆ star on any block to add it to your palette.";
    elThumbs.appendChild(hint);
    syncDrawer();
    return;
  }

  for (const id of items) {
    const b = document.createElement("button");
    b.className = "thumb";
    b.dataset.id = id;
    if (RESET_IDS.has(id)) {
      // Reset zones have no picture — show a red outlined box, like in the world.
      const box = document.createElement("div");
      box.className = "thumb-reset";
      b.appendChild(box);
    } else {
      const img = document.createElement("img");
      img.src = window.spritePath(id);
      img.alt = id;
      b.appendChild(img);
    }

    // A little star badge in the top corner of every thumbnail. It's an OUTLINE
    // (☆) until you tap it, then it FILLS (★) to show this block is in your
    // Faves. Tapping the star toggles the fave — and on purpose it does NOT
    // "arm" the block (stopPropagation keeps the tap from reaching the button
    // below), so you can curate your palette without placing anything.
    const star = document.createElement("span");
    star.className = "fave-star";
    const paintStar = (on) => { star.textContent = on ? "★" : "☆"; star.classList.toggle("on", on); };
    paintStar(window.Faves.has(id));
    star.title = "Add to / remove from your Faves";
    star.addEventListener("click", (e) => {
      e.stopPropagation();
      const nowFave = window.Faves.toggle(id);
      paintStar(nowFave);
      // If we're looking at the Faves tab itself, an un-starred block must
      // vanish — rebuilding the list is the simplest, always-correct way.
      if (cats()[activeCat].isFaves) buildThumbs();
    });
    b.appendChild(star);

    b.addEventListener("click", () => {
      if (paint) cancelPaint();
      // Tapping a thumbnail "arms" that block (then tap the world to drop it).
      // Tapping the armed one again puts it down.
      armed = (armed === id) ? null : id;
      clearArmedGhost();
      syncDrawer();
    });
    elThumbs.appendChild(b);
  }
  syncDrawer();                      // make sure the armed highlight lands right
}

// Wire up the buttons that never change (Home, name, Foe Paths, Play, Clear). We
// only need to do this ONCE — they keep the same job for the whole session.
function wireDrawerButtons() {
  elNameBtn.addEventListener("click", () => { renameCurrent(); syncDrawer(); });
  elHomeBtn.addEventListener("click", () => { saveLevel(); window.location.href = "home"; });
  elPathsBtn.addEventListener("click", () => {
    if (paint) cancelPaint();
    pathMode = !pathMode;
    pathFoe = null;
    syncDrawer();
  });
  elPlayBtn.addEventListener("click", () => {
    saveLevel();
    window.location.href = "play?play=" + currentLevel.id;
  });
  elClearBtn.addEventListener("click", () => {
    for (const o of placed) destroy(o);
    placed = [];
    saveLevel();
  });
}

// Refresh the drawer's labels + highlights to match the game state. Call this
// after changing the level name, the active pack/tab, the armed block, or path
// mode — the drawer is HTML, so it won't update itself.
function syncDrawer() {
  elNameBtn.textContent = "🧱 " + (currentLevel ? currentLevel.name : "Level");
  for (const b of elPackRow.children) b.classList.toggle("active", +b.dataset.pack === activePack);
  for (const b of elTabRow.children)  b.classList.toggle("active", +b.dataset.tab === activeCat);
  for (const b of elThumbs.children)  b.classList.toggle("armed", b.dataset.id === armed);
  elPathsBtn.textContent = "🚶 Foe Paths: " + (pathMode ? "ON" : "OFF");
  elPathsBtn.classList.toggle("on", pathMode);
}

// Fill + wire the whole drawer once, after we know which level we're editing.
function buildDrawer() {
  buildPackRow();
  buildTabs();
  buildThumbs();
  wireDrawerButtons();
  syncDrawer();
}


// ----------------------------------------------------------------------------
//  THE RIGHT-CLICK MENU  —  a little HTML pop-up for an animated tile
// ----------------------------------------------------------------------------
//  Right-clicking a tile that can ANIMATE (a slime, flag, coin, torch…) opens
//  this menu so you can switch its wiggle OFF (or back on), or delete it. Plain
//  tiles still delete instantly on right-click — the menu only appears where
//  there's actually a choice to make. It's real HTML (see editor.html), floating
//  on top of the canvas, so it lines up exactly with the cursor.
const elCtxMenu = document.getElementById("ctxMenu");

// Clicks INSIDE the menu must never fall through to the canvas/world behind it
// (so tapping a menu button can't also place or move a tile). We stop the event
// here once; the menu's own buttons still get their click.
for (const ev of ["mousedown", "pointerdown", "click"]) {
  elCtxMenu.addEventListener(ev, (e) => e.stopPropagation());
}

// Can this placed tile animate? Heroes animate from MOVEMENT in the game (not as
// scenery), so they don't get the on/off menu — only ambient animations do.
function isAnimatable(o) {
  const def = window.ANIM[o.spriteId];
  return !!(def && !def.player);
}

// Build + show the menu at (sx, sy) SCREEN pixels, acting on placed tile o.
function openCtxMenu(o, sx, sy) {
  ctxTarget = o;
  elCtxMenu.innerHTML = "";

  // Row 1 — switch this tile's animation off (or back on).
  const animBtn = document.createElement("button");
  animBtn.className = "ctx-item";
  animBtn.textContent = o.animOff ? "▶  Turn animation on" : "⏸  Turn animation off";
  animBtn.addEventListener("click", () => {
    o.animOff = !o.animOff;
    saveLevel();
    closeCtxMenu();
  });
  elCtxMenu.appendChild(animBtn);

  // Row 2 — delete the tile (so right-click can still remove animated ones too).
  const delBtn = document.createElement("button");
  delBtn.className = "ctx-item danger";
  delBtn.textContent = "🗑  Delete";
  delBtn.addEventListener("click", () => {
    destroy(o);
    removeFromPlaced(o);
    saveLevel();
    closeCtxMenu();
  });
  elCtxMenu.appendChild(delBtn);

  // Pop it up at the cursor, then nudge it back on-screen if it would spill off
  // the right/bottom edge.
  elCtxMenu.style.display = "block";
  const mw = elCtxMenu.offsetWidth, mh = elCtxMenu.offsetHeight;
  elCtxMenu.style.left = Math.min(sx, window.innerWidth  - mw - 6) + "px";
  elCtxMenu.style.top  = Math.min(sy, window.innerHeight - mh - 6) + "px";
}

// Hide the menu (and forget which tile it was for, so the green outline clears).
function closeCtxMenu() {
  ctxTarget = null;
  if (elCtxMenu) elCtxMenu.style.display = "none";
}


// ----------------------------------------------------------------------------
//  PHONE STEER  —  the builder is best on a big screen (a gentle, skippable nudge)
// ----------------------------------------------------------------------------
//  Same test the home page uses: a touch screen ("coarse" pointer) AND a small
//  screen (shorter side under 700px). We measure the SHORTER side so it works in
//  portrait or landscape — an iPad's short side is ~768+, a phone's is ~430, so
//  iPads sail through and only phones see the message. It's never a hard block:
//  "Open anyway" hides it and you carry on. (This closes the gap where opening
//  /editor straight on a phone used to land you in the cramped builder.)
function isPhoneScreen() {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small  = Math.min(window.innerWidth, window.innerHeight) < 700;
  return coarse && small;
}
function setupPhoneSteer() {
  const steer = document.getElementById("phoneSteer");
  if (isPhoneScreen()) steer.style.display = "flex";
  document.getElementById("steerOpen").addEventListener("click", () => {
    steer.style.display = "none";
  });
}


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

// Like pickPlaced, but ONLY finds foes. Path mode uses this so a click on the
// sky background (or a coin, or a block) can't get picked as the "foe" — it
// would otherwise hijack the selection, because backgrounds cover huge areas
// and pickPlaced grabs whatever was placed last, not what's actually a foe.
function pickFoe(worldPt) {
  for (let i = placed.length - 1; i >= 0; i--) {
    const o = placed[i];
    if (o.layer !== "foes") continue;
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
  o.z = DRAG_Z;                       // float above the artwork while dragging
  drag = { mode: "new", obj: o, w: ASSET[id].w, h: ASSET[id].h };
}

function startMoveDrag(o) {
  o.drawOpacity = 0.6;
  o.z = DRAG_Z;
  brushAngle = o.spriteAngle;         // so Q/E/X/Y keep adjusting from its current state
  brushFlipX = o.flipX;
  brushFlipY = o.flipY;
  drag = { mode: "move", obj: o, w: ASSET[o.spriteId].w, h: ASSET[o.spriteId].h, startPos: o.pos.clone() };
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
      g.z = DRAG_Z;
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
  // A left-click anywhere on the world first DISMISSES an open right-click menu
  // (clicks that land on the menu's own buttons are handled by the HTML buttons
  // and never reach here). We swallow this click so it doesn't also place/move.
  if (ctxTarget) { closeCtxMenu(); return; }

  const m = mousePos();

  // Clicks that land on the HTML drawer are handled by the drawer's own buttons
  // (see the "HTML DRAWER" section). Here we only care about the WORLD — so if
  // the pointer is over the drawer, there's nothing to do in the world. (This
  // also stops a tile being placed behind the drawer when you tap a button.)
  if (m.x < drawerW()) return;

  // --- PATH MODE: clicks lay out where a foe walks (not normal editing). ---
  if (pathMode) {
    // The options panel buttons (only there when a foe is selected).
    if (pathFoe && pathFoe.path) {
      for (const b of pathPanelRects().buttons) {
        if (inRect(m.x, m.y, b)) { handlePathButton(b.key); return; }
      }
    }
    // Out in the world: click a foe to select it, or click a cell to add a waypoint.
    const wpt = toWorld(m);
    const hit = pickFoe(wpt);          // ONLY foes can be selected here (not sky/blocks)
    if (hit) {
      if (hit !== pathFoe) {
        pathFoe = hit;
        if (!pathFoe.path) pathFoe.path = { points: [], mode: "pingpong", speed: 95, range: 0 };
      }
      return;                          // (clicking the same foe again does nothing)
    }
    if (pathFoe) {
      const snap = pathSnap(pathFoe, wpt);
      pathFoe.path.points.push({ x: snap.x, y: snap.y });
      saveLevel();
    }
    return;
  }

  // --- If we're painting, a click in the world finishes it. ---
  if (paint) { commitPaint(); return; }

  // --- ARMED: a world click drops the armed block where you clicked. ---
  // (This sits BEFORE the move/pan code below, so while a block is armed a
  // click always places it — to move tiles or pan, disarm first with Escape
  // or by tapping the lit-up block in the drawer again.)
  if (armed) {
    let mode = placementModeFor(armed);
    // "both" blocks (like coins) place one at a time; hold Shift to paint a row.
    if (mode === "both") mode = isKeyDown("shift") ? "paint" : "place";

    const [pw, ph] = effSize(ASSET[armed].w, ASSET[armed].h, brushAngle);
    const wpt = toWorld(m);
    const s = snapPosition(wpt.x - pw / 2, wpt.y - ph / 2, pw, ph, null);

    if (mode === "paint") {
      // Same rectangle-paint you get from dropping: move, then click to fill.
      clearArmedGhost();
      startPaint(armed, s.x, s.y);
    } else {
      // A single, discrete drop — stay armed so you can place more.
      placed.push(makeTile(armed, s.x, s.y, brushAngle, brushFlipX, brushFlipY));
      saveLevel();
    }
    return;
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

  // In path mode, right-click takes back the last waypoint (or deselects the foe
  // if there are none left). We DON'T delete tiles here, to avoid accidents.
  if (pathMode) {
    if (pathFoe && pathFoe.path) {
      if (pathFoe.path.points.length) pathFoe.path.points.pop();
      else pathFoe = null;
      saveLevel();
    }
    return;
  }

  const m = mousePos();
  if (m.x < drawerW()) return;          // ignore right-clicks on the drawer
  const hit = pickPlaced(toWorld(m));
  if (!hit) { closeCtxMenu(); return; } // empty space — just shut any open menu

  if (isAnimatable(hit)) {
    // A tile that can wiggle: open its little menu (off/on + delete).
    openCtxMenu(hit, m.x, m.y);
  } else {
    // A plain tile: keep the quick right-click-to-delete behaviour.
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
  const overDrawer = mousePos().x < drawerW();

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
    drag.obj.z = drag.obj.baseZ;       // back to its normal layer order
    // If this foe has a walking route, slide the whole route along with it so the
    // path keeps the same shape relative to the foe.
    if (drag.obj.path && drag.startPos) {
      const dx = drag.obj.pos.x - drag.startPos.x;
      const dy = drag.obj.pos.y - drag.startPos.y;
      for (const pt of drag.obj.path.points) { pt.x += dx; pt.y += dy; }
    }
  }
  saveLevel();
  drag = null;
});


// (The drawer's sprite list now scrolls natively — it's a real scrolling HTML
//  box — so there's no mouse-wheel handler to write here any more.)


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
  if (pathMode) return;   // in path mode, keys don't rotate tiles
  // Hovering a placed tile (and not holding/painting one)? Turn just that tile.
  if (!drag && !paint && mousePos().x >= drawerW()) {
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
  if (pathMode) return;   // in path mode, keys don't flip tiles
  const toggle = (o) => { if (axis === "x") o.flipX = !o.flipX; else o.flipY = !o.flipY; };

  // Hovering a placed tile (and not holding/painting one)? Flip just that tile.
  if (!drag && !paint && mousePos().x >= drawerW()) {
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

// ESCAPE — back out of whatever you're doing: cancel a paint, drop a drag, and
// un-arm the drawer block. A handy "never mind" key.
onKeyPress("escape", () => {
  closeCtxMenu();          // shut the right-click menu if it's open
  if (paint) cancelPaint();
  if (drag) {
    destroy(drag.obj);
    if (drag.mode === "move") removeFromPlaced(drag.obj);
    drag = null;
  }
  armed = null;
  clearArmedGhost();
  syncDrawer();          // un-light the armed thumbnail in the drawer
});


// ----------------------------------------------------------------------------
//  LAYER NUDGE  —  press [ (send back) or ] (bring forward) over a tile
// ----------------------------------------------------------------------------
//  Hover a placed sprite and tap [ or ] to slide it behind or in front of the
//  others. It stays inside the gameplay range (zMin..zMax), so you can never
//  accidentally push it above the reserved system layers (paths, etc.).
function nudgeZ(dir) {
  if (pathMode || drag || paint) return;        // only when plainly hovering
  if (mousePos().x < drawerW()) return;         // ignore the drawer
  const hit = pickPlaced(toWorld(mousePos()));
  if (!hit) return;
  hit.baseZ = clamp(hit.baseZ + dir * 20, window.LAYERS.zMin, window.LAYERS.zMax);
  hit.z = hit.baseZ;
  saveLevel();
}
onKeyPress("]", () => nudgeZ(1));   // bring forward
onKeyPress("[", () => nudgeZ(-1));  // send back


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

  // While a block is armed (and we're not dragging or painting), show a faded
  // preview of it snapped under the cursor, so you can see where it'll drop.
  if (armed && !drag && !paint && mousePos().x >= drawerW()) {
    if (!armedGhost || armedGhost.spriteId !== armed) {
      clearArmedGhost();
      armedGhost = makeTile(armed, 0, 0, brushAngle, brushFlipX, brushFlipY);
      armedGhost.z = DRAG_Z;
    }
    armedGhost.drawOpacity = 0.5;
    armedGhost.spriteAngle = brushAngle;
    armedGhost.flipX = brushFlipX;
    armedGhost.flipY = brushFlipY;
    const [gw, gh] = effSize(ASSET[armed].w, ASSET[armed].h, brushAngle);
    const w = toWorld(mousePos());
    armedGhost.pos = snapPosition(w.x - gw / 2, w.y - gh / 2, gw, gh, null);
  } else if (armedGhost) {
    clearArmedGhost();
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
//  GO!  —  work out which level we're editing, load it, and we're ready to build
// ----------------------------------------------------------------------------
//  When we're connected to the server, you must be logged in to build — saving
//  needs to know who "you" are. If you're not, pop back to the home page to log
//  in. (Offline / no-server mode skips this — it's just you on this computer.)
if (!window.Levels.offline && !window.Levels.me()) {
  alert("Please log in on the home page before building a level.");
  window.location.href = "home";
} else {
  resolveCurrentLevel();
  loadLevel();
  buildDrawer();        // fill + wire the HTML drawer now we know the level
  setupPhoneSteer();    // and show the "best on a big screen" nudge if we're on a phone
}
