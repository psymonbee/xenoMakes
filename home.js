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
//  ACCOUNTS  —  the REAL log-in, replacing the old hard-coded "owner word"
// ----------------------------------------------------------------------------
//  Who you are now comes from the SERVER (see levels.js + server.js). These tiny
//  helpers just ask "who's logged in?" and "are they an admin?".
//
//  OFFLINE: if there's no server, there are no accounts — it's just you on this
//  computer (like the game always used to be). We hide the login UI in that case.
function me()        { return window.Levels.me(); }              // {id,username,isAdmin} or null
function isAdmin()   { return !!(me() && me().isAdmin); }        // can make ⭐ Main levels
function isOffline() { return window.Levels.offline; }           // no server?
function isOwner()   { return isAdmin(); }                       // (kept for old call sites)

const ownerBtn = document.getElementById("ownerBtn");            // the account button

// Update the account button + show/hide the bits that need a login.
function refreshAccountUI() {
  const u = me();
  if (isOffline()) {
    ownerBtn.textContent = "💾 Saved on this computer";
    ownerBtn.classList.remove("on");
  } else if (u) {
    ownerBtn.textContent = "👤 " + u.username + (u.isAdmin ? " ⭐" : "");
    ownerBtn.classList.add("on");
  } else {
    ownerBtn.textContent = "🔑 Log in / Sign up";
    ownerBtn.classList.remove("on");
  }
  // You need to be logged in (or offline) to make levels; Main needs an admin.
  const canMake = isOffline() || !!u;
  document.getElementById("newBtn").classList.toggle("hide", !canMake);
  document.getElementById("newMainBtn").classList.toggle("hide", !isAdmin());
  // The "My Levels" section only appears when you're logged in.
  document.getElementById("mySection").classList.toggle("hide", !u);
  // The welcome / sign-in banner shows ONLY to logged-out online visitors.
  document.getElementById("welcome").classList.toggle("hide", isOffline() || !!u);
}
// Old name kept so existing calls still work.
function refreshOwnerUI() { refreshAccountUI(); }

// Clicking the account button: offline does nothing; logged in opens the
// account box; logged out opens the log-in / sign-up box.
ownerBtn.addEventListener("click", () => {
  if (isOffline()) return;
  if (me()) openAccount(); else openAuth();
});

// "Can I edit/delete/settings this level?"
//  • Offline: yes (it's all yours on this computer).
//  • Online: only if you made it, or you're an admin.
function canManage(level) {
  if (isOffline()) return true;
  const u = me();
  return !!u && (level.owner === u.id || u.isAdmin);
}


// ----------------------------------------------------------------------------
//  PHONE STEER  —  the builder works best on a big screen
// ----------------------------------------------------------------------------
//  The level designer is a drag-and-drop tool: it needs room and precision, so
//  it's a pain on a small phone. We don't BLOCK phones — we just give a friendly
//  heads-up and let you carry on if you really want to. Playing + browsing
//  levels works great on a phone, so those are never gated.
//
//  How we spot a "phone": a touch screen ("coarse" pointer) AND a small screen.
//  We measure the SHORTER side so it works in portrait or landscape — an iPad's
//  short side is ~768+, a phone's is ~430 or less, so iPads sail through.
function isPhoneScreen() {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small  = Math.min(window.innerWidth, window.innerHeight) < 700;
  return coarse && small;
}

// Go to the editor — but on a phone, ask first (the "soft steer").
function openEditor(url) {
  if (isPhoneScreen()) {
    const ok = confirm(
      "The level builder works best on an iPad or a computer — it needs a " +
      "bigger screen and is fiddly to use with a finger.\n\nOpen it anyway?"
    );
    if (!ok) return;            // they changed their mind — stay on the home page
  }
  window.location.href = url;
}


// ----------------------------------------------------------------------------
//  THE "NEW LEVEL" BUTTONS
// ----------------------------------------------------------------------------
//  We make the level HERE (so we can stamp its section) and then open the editor
//  on it by id. We link with "editor?level=…" (no ".html"): our local server
//  drops the "?…" off a ".html" link, but keeps it on the clean "editor?…" form.
document.getElementById("newBtn").addEventListener("click", async () => {
  const lvl = window.Levels.create(window.Levels.suggestName(), 0, { section: "community" });
  await window.Levels.flush();            // make sure it's saved BEFORE we leave
  openEditor("editor?level=" + lvl.id);
});
document.getElementById("newMainBtn").addEventListener("click", async () => {
  const lvl = window.Levels.create(window.Levels.suggestName(), 0, { section: "main" });
  await window.Levels.flush();
  openEditor("editor?level=" + lvl.id);
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
    else openEditor("editor?level=" + level.id);
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

  // If this is YOUR level, show whether it's still private or shared.
  if (canManage(level) && !isOffline()) {
    const status = document.createElement("span");
    const published = level.status === "published";
    status.className = "badge status " + (published ? "published" : "indev");
    status.textContent = published ? "🌍 Published" : "🛠 In progress";
    status.style.marginLeft = "6px";
    info.appendChild(status);
  }

  // The manage buttons — only if you're allowed to manage this level.
  if (canManage(level)) {
    // Publish / unpublish: flip the level between your private workshop and the
    // shared space. (Hidden offline, where there's no shared space.)
    if (!isOffline()) {
      const pubBtn = document.createElement("button");
      const published = level.status === "published";
      pubBtn.className = "btn small " + (published ? "grey" : "");
      pubBtn.style.width = "100%";
      pubBtn.style.marginTop = "10px";
      pubBtn.textContent = published ? "🙈 Unpublish (make private)" : "🌍 Publish to shared space";
      pubBtn.addEventListener("click", () => {
        level.status = published ? "in-dev" : "published";
        window.Levels.put(level);
        render();
      });
      info.appendChild(pubBtn);
    }

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
    editBtn.addEventListener("click", () => { openEditor("editor?level=" + level.id); });

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

// Open the game on a level. The game lives at "/play" now (the front door "/" is
// this home page), so we send the player to "play?play=<id>".
function play(id) { window.location.href = "play?play=" + id; }


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
  refreshAccountUI();                      // keep the header buttons in sync

  const u = me();
  const levels = window.Levels.all();
  // The big "make your first level" message is only useful to someone who CAN
  // make levels (logged in, or offline). Logged-out visitors see the welcome
  // banner instead, so don't show this to them.
  const empty = document.getElementById("empty");
  empty.classList.toggle("hide", levels.length !== 0 || !(isOffline() || u));

  // Sort levels into the three sections:
  //   ⭐ Main      — official levels (section "main")
  //   🛠 My Levels — your own levels (both private + published), when logged in
  //   🌍 Shared    — everyone else's PUBLISHED levels (or all of them, offline)
  const mains  = levels.filter((l) => l.section === "main").sort(byOrder);
  const mine   = u ? levels.filter((l) => l.section !== "main" && l.owner === u.id).sort(byOrder) : [];
  const shared = levels.filter((l) =>
      l.section !== "main" &&
      (!u || l.owner !== u.id) &&
      (isOffline() || l.status === "published")
    ).sort(byOrder);

  // Make sure all the sprite pictures are loaded, THEN draw the cards.
  loadAllImages(levels).then(() => {
    fillGrid(document.getElementById("mainGrid"), mains,
      isAdmin() ? "No main levels yet. Click ⭐ New main level to add one."
                : "No main levels yet.");
    fillGrid(document.getElementById("myGrid"), mine,
      "You haven't made any levels yet. Click ➕ New level to start!");
    fillGrid(document.getElementById("communityGrid"), shared,
      "No shared levels yet. Publish one of yours to share it here!");
  });
}


// ----------------------------------------------------------------------------
//  THE LOG-IN / SIGN-UP DIALOG
// ----------------------------------------------------------------------------
const authBackdrop = document.getElementById("authBackdrop");
const authErr = document.getElementById("authErr");

function openAuth() {
  authErr.classList.add("hide");
  document.getElementById("authUser").value = "";
  document.getElementById("authPass").value = "";
  authBackdrop.classList.remove("hide");
  document.getElementById("authUser").focus();
}
function closeAuth() { authBackdrop.classList.add("hide"); }
function showAuthError(msg) { authErr.textContent = msg; authErr.classList.remove("hide"); }

document.getElementById("authCancel").addEventListener("click", closeAuth);
document.getElementById("welcomeAuth").addEventListener("click", openAuth);
authBackdrop.addEventListener("click", (e) => { if (e.target === authBackdrop) closeAuth(); });

document.getElementById("authLogin").addEventListener("click", async () => {
  try {
    await window.Levels.login(
      document.getElementById("authUser").value.trim(),
      document.getElementById("authPass").value);
    closeAuth(); render();
  } catch (e) { showAuthError(e.message); }
});
document.getElementById("authSignup").addEventListener("click", async () => {
  try {
    await window.Levels.signup(
      document.getElementById("authUser").value.trim(),
      document.getElementById("authPass").value,
      document.getElementById("authInvite").value.trim(),
      document.getElementById("authAdmin").value);
    closeAuth(); render();
  } catch (e) { showAuthError(e.message); }
});


// ----------------------------------------------------------------------------
//  THE ACCOUNT DIALOG  (log out / delete account / upload old levels)
// ----------------------------------------------------------------------------
const accountBackdrop = document.getElementById("accountBackdrop");

function openAccount() {
  const u = me();
  document.getElementById("accountName").textContent = u ? u.username : "";
  // Offer to upload old this-computer levels, but only if there are any.
  const oldCount = countOldLocalLevels();
  const upBtn  = document.getElementById("uploadOld");
  const upHint = document.getElementById("uploadOldHint");
  upBtn.classList.toggle("hide", oldCount === 0);
  upHint.textContent = oldCount ? (oldCount + " old level(s) found on this computer.") : "";
  accountBackdrop.classList.remove("hide");
}
function closeAccount() { accountBackdrop.classList.add("hide"); }

document.getElementById("accountClose").addEventListener("click", closeAccount);
accountBackdrop.addEventListener("click", (e) => { if (e.target === accountBackdrop) closeAccount(); });

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await window.Levels.logout(); closeAccount(); render();
});

document.getElementById("deleteAccountBtn").addEventListener("click", async () => {
  if (!confirm("Delete your account AND every level you made? This cannot be undone.")) return;
  await window.Levels.deleteAccount(); closeAccount(); render();
});

// "Upload my old levels" — copy any levels still in this browser's localStorage
// up to the server under YOUR account (as private "in progress" levels).
document.getElementById("uploadOld").addEventListener("click", async () => {
  const old = readOldLocalLevels();
  for (const lvl of old) {
    window.Levels.create(lvl.name || "My Level", lvl.pack || 0, {
      tiles: lvl.tiles || [], difficulty: lvl.difficulty || null, status: "in-dev",
    });
  }
  await window.Levels.flush();
  await window.Levels.load();              // refresh from the server
  alert("Uploaded " + old.length + " level(s) to your account! 🎉");
  closeAccount(); render();
});

// Read the OLD this-computer save box (used only by the upload helper above).
function readOldLocalLevels() {
  try {
    const obj = JSON.parse(localStorage.getItem("coinquest-levels") || "{}");
    return Object.values(obj).filter((l) => l && (l.tiles || []).length > 0);
  } catch (e) { return []; }
}
function countOldLocalLevels() { return readOldLocalLevels().length; }


// ----------------------------------------------------------------------------
//  START UP  —  load every level (and who we are), THEN draw the page
// ----------------------------------------------------------------------------
window.Levels.load().then(() => {
  refreshAccountUI();
  render();
});
