// ============================================================================
//  HOME PAGE  —  show every saved level as a clickable card
// ============================================================================
//  This is the front door to the game. It reads the list of levels from the
//  shared "save box" (levels.js) and, for each one, makes a CARD with:
//    • a little screenshot of the start of the level (drawn onto a <canvas>),
//    • a ▶ play button over the picture (click it to play),
//    • the level's name, and Edit + Delete buttons.
//
//  The pictures are drawn here, on the fly, straight from each level's saved
//  tiles — so they're always up to date and take up no extra storage.
// ============================================================================


// Where the cards go, and the "you have no levels" note.
const grid     = document.getElementById("grid");
const emptyMsg = document.getElementById("empty");

// "New blank level" opens the editor on a fresh, empty level.
// NOTE: we link to "editor?new=1" (no ".html"). Our local server (serve) sends
// "editor.html?…" through a redirect that DROPS the "?…" part, but the clean
// "editor?…" form keeps it — so the editor actually sees "new=1".
document.getElementById("newBtn").addEventListener("click", () => {
  window.location.href = "editor?new=1";
});

// Pictures we've loaded, kept so we don't fetch the same sprite twice.
const imgCache = {};


// ----------------------------------------------------------------------------
//  LOAD THE SPRITE PICTURES a level needs (so we can draw its screenshot)
// ----------------------------------------------------------------------------
// Reset zones are invisible (no picture), so we never try to load those.
function isResetId(id) { return window.RESET_IDS && window.RESET_IDS.has(id); }

// Load one sprite picture, remembering it in imgCache. Always resolves (even on
// a missing file) so one bad sprite can't stop the whole page.
function loadImage(id) {
  return new Promise((resolve) => {
    if (imgCache[id] || isResetId(id)) return resolve();
    const a = window.ASSET_INFO[id];
    if (!a) return resolve();
    const img = new Image();
    img.onload  = () => { imgCache[id] = img; resolve(); };
    img.onerror = () => resolve();
    img.src = window.spritePath(id);
  });
}

// Load every picture used by every level, all at once.
function loadAllImages(levels) {
  const ids = new Set();
  for (const lvl of levels) for (const t of (lvl.tiles || [])) ids.add(t.id);
  return Promise.all([...ids].map(loadImage));
}


// ----------------------------------------------------------------------------
//  DRAW ONE LEVEL'S SCREENSHOT onto a canvas (focused on the START)
// ----------------------------------------------------------------------------
function drawThumb(canvas, level) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;

  // Always start with a sky-blue background (same as the game's sky).
  ctx.fillStyle = "#87ceeb";
  ctx.fillRect(0, 0, W, H);

  const tiles = level.tiles || [];
  if (tiles.length === 0) return;            // nothing to draw (an empty level)

  // Find the edges of everything, the player's start, and draw tiles in the
  // right order (back to front) so the picture matches the game.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let startX = null;
  for (const t of tiles) {
    const a = window.ASSET_INFO[t.id];
    if (!a) continue;
    minX = Math.min(minX, t.x);
    minY = Math.min(minY, t.y);
    maxX = Math.max(maxX, t.x + a.w);
    maxY = Math.max(maxY, t.y + a.h);
    if (startX === null && window.ROLES.player.has(t.id)) startX = t.x;
  }
  if (!isFinite(minX)) return;               // no drawable tiles
  if (startX === null) startX = minX;         // no player placed — start at the left

  // The "camera" for the screenshot. We show a window about 9 tiles tall, lined
  // up with the start of the level, and centred vertically on the level.
  const baseTile = 64;                        // the Standard pack's tile size
  const worldViewH = 9 * baseTile;            // how much world fits top-to-bottom
  const scale = H / worldViewH;
  const worldViewW = W / scale;

  const viewX = startX - baseTile;            // a little gap before the start
  const viewY = ((minY + maxY) / 2) - worldViewH / 2;   // centre on the level

  // Draw furthest-back tiles first. We sort a copy by each tile's draw order (z),
  // falling back to its layer's normal z when it wasn't nudged.
  const ordered = [...tiles].sort((p, q) => zOf(p) - zOf(q));

  for (const t of ordered) {
    const a = window.ASSET_INFO[t.id];
    if (!a) continue;
    const w = a.w * scale, h = a.h * scale;
    // Where the tile's CENTRE lands on the canvas.
    const cx = (t.x + a.w / 2 - viewX) * scale;
    const cy = (t.y + a.h / 2 - viewY) * scale;
    // Skip tiles that are completely off this little screenshot.
    if (cx + w < 0 || cx - w > W || cy + h < 0 || cy - h > H) continue;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((t.angle || 0) * Math.PI / 180);
    ctx.scale(t.flipX ? -1 : 1, t.flipY ? -1 : 1);
    if (isResetId(t.id)) {
      // Reset zones are invisible in the game; show them as a red outline here too.
      ctx.strokeStyle = "rgba(255,60,60,0.9)";
      ctx.lineWidth = 2;
      ctx.strokeRect(-w / 2, -h / 2, w, h);
    } else if (imgCache[t.id]) {
      ctx.drawImage(imgCache[t.id], -w / 2, -h / 2, w, h);
    }
    ctx.restore();
  }
}

// A tile's draw order: its saved nudge, or its layer's normal value.
function zOf(t) {
  if (typeof t.z === "number") return t.z;
  const layer = window.layerOf(t.id);
  return (window.LAYERS.z[layer] || 0);
}


// ----------------------------------------------------------------------------
//  BUILD ONE CARD for a level
// ----------------------------------------------------------------------------
function makeCard(level) {
  const card = document.createElement("div");
  card.className = "card";

  const hasTiles = (level.tiles || []).length > 0;

  // The picture area (canvas) + the ▶ play overlay. Clicking it plays the level —
  // unless the level is still empty, in which case it opens the editor to build it.
  const thumb = document.createElement("div");
  thumb.className = "thumb";
  thumb.title = hasTiles ? ("Play " + level.name) : ("Build " + level.name);
  thumb.addEventListener("click", () => {
    if (hasTiles) play(level.id);
    else window.location.href = "editor?level=" + level.id;
  });

  const canvas = document.createElement("canvas");
  canvas.width = 320; canvas.height = 180;     // 16:9, scaled down by CSS
  thumb.appendChild(canvas);

  if (hasTiles) {
    const playBtn = document.createElement("div");
    playBtn.className = "play";
    playBtn.textContent = "▶";
    thumb.appendChild(playBtn);
  } else {
    const tag = document.createElement("div");
    tag.className = "emptytag";
    tag.textContent = "Empty — click Edit to build";
    thumb.appendChild(tag);
  }

  // The strip under the picture: the name + Edit / Delete buttons.
  const info = document.createElement("div");
  info.className = "info";

  const name = document.createElement("p");
  name.className = "name";
  name.textContent = level.name;
  info.appendChild(name);

  const row = document.createElement("div");
  row.className = "row";

  const editBtn = document.createElement("button");
  editBtn.className = "btn small grey";
  editBtn.textContent = "✏️ Edit";
  editBtn.addEventListener("click", () => { window.location.href = "editor?level=" + level.id; });

  const delBtn = document.createElement("button");
  delBtn.className = "btn small danger";
  delBtn.textContent = "🗑 Delete";
  delBtn.addEventListener("click", () => {
    if (confirm('Delete "' + level.name + '"? This cannot be undone.')) {
      window.Levels.remove(level.id);
      render();                                  // rebuild the gallery
    }
  });

  row.appendChild(editBtn);
  row.appendChild(delBtn);
  info.appendChild(row);

  card.appendChild(thumb);
  card.appendChild(info);

  // Draw the screenshot now (pictures are already loaded by render()).
  drawThumb(canvas, level);
  return card;
}

// Open the game on a level. "./?play=…" points at the game (index) and, because
// "/" is the server's canonical address, the "?play=…" part survives the trip.
function play(id) { window.location.href = "./?play=" + id; }


// ----------------------------------------------------------------------------
//  RENDER  —  (re)build the whole gallery from the saved levels
// ----------------------------------------------------------------------------
function render() {
  const levels = window.Levels.all();
  grid.innerHTML = "";

  if (levels.length === 0) {
    emptyMsg.classList.remove("hide");
    return;
  }
  emptyMsg.classList.add("hide");

  // Make sure all the sprite pictures are loaded, THEN draw the cards.
  loadAllImages(levels).then(() => {
    grid.innerHTML = "";
    for (const lvl of levels) grid.appendChild(makeCard(lvl));
  });
}

render();
