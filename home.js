// ============================================================================
//  HOME PAGE  —  show every saved level as a clickable card, in two sections
// ============================================================================
//  This is the front door to the game. It reads the list of levels from the
//  shared "save box" (levels.js) and sorts them into two sections:
//    • ⭐ Main Levels      — the owner's official levels
//    • 🌍 Community Levels — levels anyone has published
//
//  Each card has a little screenshot (drawn onto a <canvas> from the saved
//  tiles), the level's name, a coloured DIFFICULTY badge, and — when you're
//  allowed to manage it — Settings / Edit / Delete buttons.
//
//  The "🔒 Owner" button unlocks OWNER MODE (see just below).
// ============================================================================


// ----------------------------------------------------------------------------
//  OWNER MODE  —  a simple "pretend lock"
// ----------------------------------------------------------------------------
//  Type the owner word to unlock the owner-only buttons (make Main levels, and
//  Edit/Delete/Settings on Main levels). It's saved in this browser only.
//
//  ⚠️ IMPORTANT: this is NOT real security. The word is right here in the code,
//  so anyone curious could find it. It just keeps players from *accidentally*
//  changing the official levels. To change it, edit OWNER_WORD below.
const OWNER_WORD = "coinquest";
const OWNER_KEY  = "coinquest-owner";
function isOwner()      { return localStorage.getItem(OWNER_KEY) === "yes"; }
function setOwner(on)   { localStorage.setItem(OWNER_KEY, on ? "yes" : "no"); }

const ownerBtn = document.getElementById("ownerBtn");

// Update the owner button's look + show/hide the owner-only buttons.
function refreshOwnerUI() {
  const owner = isOwner();
  ownerBtn.textContent = owner ? "🔓 Owner (log out)" : "🔒 Owner";
  ownerBtn.classList.toggle("on", owner);
  // Show owner-only bits (the "New main level" button, the modal's Section pick).
  document.querySelectorAll(".owner-only").forEach((el) => el.classList.toggle("hide", !owner));
}

ownerBtn.addEventListener("click", () => {
  if (isOwner()) {
    setOwner(false);                      // log out
  } else {
    const word = prompt("Enter the owner word to unlock owner mode:");
    if (word === null) return;            // they pressed Cancel
    if (word !== OWNER_WORD) { alert("That's not the owner word. Try again!"); return; }
    setOwner(true);
  }
  refreshOwnerUI();
  render();
});

// "Can I change this level's name/difficulty/order, edit it, or delete it?"
//  • Community levels: yes, anyone can (they live on this computer).
//  • Main levels: only the owner can.
function canManage(level) { return level.section !== "main" || isOwner(); }


// ----------------------------------------------------------------------------
//  THE "NEW LEVEL" BUTTONS
// ----------------------------------------------------------------------------
//  We make the level HERE (so we can stamp its section) and then open the editor
//  on it by id. We link with "editor?level=…" (no ".html"): our local server
//  drops the "?…" off a ".html" link, but keeps it on the clean "editor?…" form.
document.getElementById("newBtn").addEventListener("click", () => {
  const lvl = window.Levels.create(window.Levels.suggestName(), 0, { section: "community" });
  window.location.href = "editor?level=" + lvl.id;
});
document.getElementById("newMainBtn").addEventListener("click", () => {
  const lvl = window.Levels.create(window.Levels.suggestName(), 0, { section: "main" });
  window.location.href = "editor?level=" + lvl.id;
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
  // unless it's still empty, in which case it opens the editor to build it.
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
    tag.textContent = "Empty — click to build";
    thumb.appendChild(tag);
  }

  // The strip under the picture: name, difficulty badge, then (maybe) buttons.
  const info = document.createElement("div");
  info.className = "info";

  const name = document.createElement("p");
  name.className = "name";
  name.textContent = level.name;
  info.appendChild(name);

  // The coloured difficulty badge (Easy / Medium / Hard / Unrated).
  const badge = document.createElement("span");
  badge.className = "badge" + (level.difficulty ? " " + level.difficulty : "");
  badge.textContent = level.difficulty ? capitalize(level.difficulty) : "Unrated";
  info.appendChild(badge);

  // The manage buttons — only if you're allowed to manage this level.
  if (canManage(level)) {
    const setBtn = document.createElement("button");
    setBtn.className = "btn small grey";
    setBtn.style.width = "100%";
    setBtn.style.marginTop = "10px";
    setBtn.textContent = "⚙️ Settings";
    setBtn.addEventListener("click", () => openSettings(level));
    info.appendChild(setBtn);

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
  }

  card.appendChild(thumb);
  card.appendChild(info);

  // Draw the screenshot now (pictures are already loaded by render()).
  drawThumb(canvas, level);
  return card;
}

// "easy" -> "Easy"
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// Open the game on a level. "./?play=…" points at the game (index) and, because
// "/" is the server's canonical address, the "?play=…" part survives the trip.
function play(id) { window.location.href = "./?play=" + id; }


// ----------------------------------------------------------------------------
//  THE SETTINGS DIALOG  —  set name / difficulty / order (owner: + section)
// ----------------------------------------------------------------------------
let editingId = null;     // which level the open dialog is editing

const backdrop = document.getElementById("settingsBackdrop");
const fName    = document.getElementById("setName");
const fDiff    = document.getElementById("setDifficulty");
const fOrder   = document.getElementById("setOrder");
const fSection = document.getElementById("setSection");

function openSettings(level) {
  editingId = level.id;
  fName.value    = level.name || "";
  fDiff.value    = level.difficulty || "";          // "" = Unrated
  fOrder.value   = level.order;
  fSection.value = level.section === "main" ? "main" : "community";
  // Only the owner gets to choose the section.
  document.getElementById("sectionField").classList.toggle("hide", !isOwner());
  backdrop.classList.remove("hide");
  fName.focus();
}

function closeSettings() {
  editingId = null;
  backdrop.classList.add("hide");
}

document.getElementById("setCancel").addEventListener("click", closeSettings);

// Click the dark area outside the dialog to cancel.
backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeSettings(); });

document.getElementById("setSave").addEventListener("click", () => {
  const lvl = window.Levels.get(editingId);
  if (!lvl) { closeSettings(); return; }

  const newName = fName.value.trim();
  if (newName) lvl.name = newName;

  const diff = fDiff.value;
  lvl.difficulty = window.Levels.DIFFICULTIES.includes(diff) ? diff : null;

  const ord = parseInt(fOrder.value, 10);
  if (!isNaN(ord)) lvl.order = ord;

  // Only the owner may move a level between sections.
  if (isOwner()) lvl.section = (fSection.value === "main") ? "main" : "community";

  window.Levels.put(lvl);
  closeSettings();
  render();
});


// ----------------------------------------------------------------------------
//  RENDER  —  (re)build both sections from the saved levels
// ----------------------------------------------------------------------------
// Sort by "order" (smaller = first), then by when it was made as a tie-breaker.
function byOrder(a, b) { return (a.order || 0) - (b.order || 0) || (a.created || 0) - (b.created || 0); }

// Fill one section's grid, or show a friendly placeholder if it's empty.
function fillGrid(grid, list, emptyText) {
  grid.innerHTML = "";
  if (list.length === 0) {
    const ph = document.createElement("div");
    ph.className = "placeholder";
    ph.textContent = emptyText;
    grid.appendChild(ph);
    return;
  }
  for (const lvl of list) grid.appendChild(makeCard(lvl));
}

function render() {
  refreshOwnerUI();                       // keep the header buttons in sync

  const levels = window.Levels.all();
  const empty = document.getElementById("empty");
  empty.classList.toggle("hide", levels.length !== 0);

  // Make sure all the sprite pictures are loaded, THEN draw the cards.
  loadAllImages(levels).then(() => {
    const mains     = levels.filter((l) => l.section === "main").sort(byOrder);
    const community = levels.filter((l) => l.section !== "main").sort(byOrder);

    fillGrid(document.getElementById("mainGrid"), mains,
      isOwner() ? "No main levels yet. Click ⭐ New main level to add one."
                : "No main levels yet.");
    fillGrid(document.getElementById("communityGrid"), community,
      "No community levels yet. Click ➕ New level to add one.");
  });
}

refreshOwnerUI();
render();
