// ============================================================================
//  LEVELS  —  the shared "save box" that remembers ALL your levels
// ============================================================================
//  This used to keep every level in YOUR browser only (localStorage). Now it
//  talks to our little server (server.js) so levels are shared with everyone and
//  people can sign in. See DEPLOY_DESIGN.md for the whole picture.
//
//  HOW THE FRONT END USES IT (the important part):
//    1. Each page calls  `await window.Levels.load()`  ONCE when it starts.
//       That fetches every level you're allowed to see (plus who you are) into
//       memory.
//    2. After that, the old helpers — all(), get(), create(), put() … — work
//       exactly like before and are still synchronous (they read the in-memory
//       copy). Saving quietly sends the change to the server in the background.
//
//  A level object still looks the same as it always has:
//      { id, name, pack, tiles:[…], created, updated,
//        owner,                     // which user made it (server fills this in)
//        status:  "in-dev"|"published",   // private workshop vs shared space
//        section: "community"|"main",     // "main" = official (admin only)
//        difficulty: null|"easy"|"medium"|"hard",
//        order: <number> }
//
//  OFFLINE FALLBACK: if the server can't be reached (e.g. you opened the old
//  static server), we quietly fall back to the OLD localStorage behaviour so the
//  game still works — just on this computer only, with no accounts.
// ============================================================================


// ---- our in-memory copies, filled in by load() -----------------------------
let _levels = {};        // id -> level   (everything we're allowed to see)
let _user   = null;      // { id, username, isAdmin } or null when logged out
let _offline = false;    // true once we've decided the server isn't there
let _pending = Promise.resolve();   // the "write queue" tail (see _queue below)

// The three difficulty words we allow (anything else becomes "unrated"/null).
const DIFFICULTIES = ["easy", "medium", "hard"];

// Make a fresh, unique id for a new level, e.g. "lvl-1718900000000-417".
function newLevelId() {
  return "lvl-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
}

// Fill in any missing fields so older/odd levels "just work".
function normalize(level) {
  if (!level) return level;
  if (level.section !== "main" && level.section !== "community") level.section = "community";
  if (level.status !== "published" && level.status !== "in-dev") level.status = "in-dev";
  if (!DIFFICULTIES.includes(level.difficulty)) level.difficulty = null;
  if (typeof level.order !== "number") level.order = level.created || 0;
  return level;
}

// Run server writes ONE AT A TIME, in order, so quick edits can't race each
// other. flush() lets a page wait for them all to finish (handy before we send
// the browser to another page — so the last save definitely lands first).
function _queue(fn) {
  _pending = _pending.then(fn).catch((e) => console.warn("Save failed:", e));
  return _pending;
}

// A small wrapper around fetch for our JSON API. `keepalive` lets a save finish
// even if the page is navigating away a split-second later.
async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    keepalive: method !== "GET",
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* some replies have no body */ }
  if (!res.ok) throw new Error((data && data.error) || ("Request failed: " + res.status));
  return data;
}


// ============================================================================
//  OFFLINE FALLBACK  —  the OLD localStorage save box, kept for when there's no
//  server. Single-user, this-computer-only. Accounts simply don't apply here.
// ============================================================================
const LEVELS_KEY = "coinquest-levels";
const LEGACY_KEY = "coinquest-level";

function localReadStore() {
  try {
    const obj = JSON.parse(localStorage.getItem(LEVELS_KEY) || "{}");
    return (obj && typeof obj === "object") ? obj : {};
  } catch (e) { return {}; }
}
function localWriteStore(store) {
  localStorage.setItem(LEVELS_KEY, JSON.stringify(store));
}
// Rescue a level made with the very first (single-level) editor, just once.
function localMigrateLegacy(store) {
  if (Object.keys(store).length > 0) return;
  try {
    const tiles = JSON.parse(localStorage.getItem(LEGACY_KEY) || "[]");
    if (!Array.isArray(tiles) || tiles.length === 0) return;
    const id = newLevelId(), t = Date.now();
    store[id] = { id, name: "My First Level", pack: 0, tiles, created: t, updated: t };
    localWriteStore(store);
  } catch (e) { /* ignore a broken old save */ }
}


// ============================================================================
//  THE PUBLIC HELPERS  —  what the home page / editor / game call
// ============================================================================
window.Levels = {
  // ---- start-up ------------------------------------------------------------
  // Call this ONCE, with await, at the top of each page. It loads every level
  // you can see (and who you are) into memory. If the server isn't there, it
  // quietly switches to the offline localStorage box instead.
  async load() {
    try {
      const state = await api("GET", "/api/state");
      _offline = false;
      _user = state.user || null;
      _levels = {};
      for (const lvl of state.levels) _levels[lvl.id] = normalize(lvl);
    } catch (e) {
      // No server — fall back to this-computer-only mode.
      console.warn("No server found — running offline (levels saved on this computer only).");
      _offline = true;
      _user = null;
      const store = localReadStore();
      localMigrateLegacy(store);
      _levels = {};
      for (const lvl of Object.values(localReadStore())) _levels[lvl.id] = normalize(lvl);
    }
    return _user;
  },

  // Are we offline (no server)? The home page uses this to hide the login UI.
  get offline() { return _offline; },

  // Who's logged in? { id, username, isAdmin } or null. Always null offline.
  me() { return _user; },

  // Wait for every in-flight save to finish (call before leaving the page).
  flush() { return _pending; },

  // ---- reading (synchronous, from the in-memory copy) ----------------------
  all() {
    return Object.values(_levels).map(normalize)
      .sort((a, b) => (b.updated || 0) - (a.updated || 0));
  },
  get(id) { return _levels[id] ? normalize(_levels[id]) : null; },

  // ---- writing (updates memory now, saves to the server in the background) --
  // Make and remember a brand-new (empty) level. Returns it straight away so
  // callers can keep working; the save happens behind the scenes.
  create(name, pack = 0, extra = {}) {
    const id = newLevelId(), t = Date.now();
    const level = normalize({
      id, name: name || "My Level", pack, tiles: [],
      created: t, updated: t,
      owner: _user ? _user.id : null,
      status: "in-dev", section: "community",
      ...extra,
    });
    _levels[id] = level;
    this._save(level);
    return level;
  },

  // Save (overwrite) a level. Pass the whole level object.
  put(level) {
    if (!level || !level.id) return;
    level.updated = Date.now();
    if (!level.created) level.created = level.updated;
    _levels[level.id] = normalize(level);
    this._save(level);
  },

  // Change just a level's name.
  rename(id, name) {
    const lvl = _levels[id];
    if (lvl) { lvl.name = name; this.put(lvl); }
  },

  // Throw a level away for good.
  remove(id) {
    delete _levels[id];
    if (_offline) {
      const store = localReadStore(); delete store[id]; localWriteStore(store);
    } else {
      _queue(() => api("DELETE", "/api/levels/" + encodeURIComponent(id)));
    }
  },

  // The actual "send this level somewhere safe" step, used by create/put.
  _save(level) {
    if (_offline) {
      const store = localReadStore(); store[level.id] = level; localWriteStore(store);
    } else {
      _queue(() => api("PUT", "/api/levels/" + encodeURIComponent(level.id), { level }));
    }
  },

  // ---- accounts (no-ops when offline) --------------------------------------
  async signup(username, password, invite, adminSecret) {
    const out = await api("POST", "/api/signup", { username, password, invite, adminSecret });
    _user = out.user; await this.load(); return _user;
  },
  async login(username, password) {
    const out = await api("POST", "/api/login", { username, password });
    _user = out.user; await this.load(); return _user;
  },
  async logout() {
    await api("POST", "/api/logout"); _user = null; await this.load();
  },
  async deleteAccount() {
    await api("DELETE", "/api/account"); _user = null; await this.load();
  },

  // ---- little helpers ------------------------------------------------------
  // A unique-ish default name like "My Level 3".
  suggestName() { return "My Level " + (Object.keys(_levels).length + 1); },

  newLevelId,
  DIFFICULTIES,
};
