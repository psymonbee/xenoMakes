// ============================================================================
//  LEVELS  —  the shared "save box" that remembers ALL your levels
// ============================================================================
//  Before this file there was only ONE saved level. Now you can keep as many as
//  you like — each with its own NAME — and pick one to play or edit from the
//  home page (home.html).
//
//  Everything is stored in the browser's localStorage under ONE key. We keep a
//  little object that maps each level's id to the level itself:
//
//      {
//        "lvl-abc123": {
//          id:   "lvl-abc123",
//          name: "My First Level",
//          pack: 0,                  // which drawer pack the editor was on
//          tiles: [ {id,x,y,angle,flipX,flipY,z?,path?}, … ],
//          created: 1718900000000,   // when it was first made (ms)
//          updated: 1718900500000,   // when it was last saved (ms)
//        },
//        …
//      }
//
//  This file is loaded by the editor, the game, AND the home page, so all three
//  agree on how levels are stored — the same idea as palette.js for sprites.
// ============================================================================


// The ONE localStorage key that holds every level.
const LEVELS_KEY = "coinquest-levels";

// The OLD key from back when there was only a single level. We still read it
// once (to rescue an old creation) but we never throw it away.
const LEGACY_KEY = "coinquest-level";


// Read the whole "save box" as a plain object (id -> level). Always returns an
// object, even if nothing is saved yet or the data is somehow broken.
function readStore() {
  try {
    const raw = localStorage.getItem(LEVELS_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return (obj && typeof obj === "object") ? obj : {};
  } catch (e) {
    console.warn("Could not read saved levels:", e);
    return {};
  }
}

// Write the whole "save box" back to the browser.
function writeStore(store) {
  localStorage.setItem(LEVELS_KEY, JSON.stringify(store));
}

// Make a fresh, unique id for a new level, e.g. "lvl-1718900000000-417".
function newLevelId() {
  return "lvl-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
}


// ----------------------------------------------------------------------------
//  RESCUE the old single level (runs once)
// ----------------------------------------------------------------------------
//  If someone built a level with the OLD editor (before names existed), it's
//  sitting under LEGACY_KEY. The first time we run with an empty save box, turn
//  that old creation into a proper named level so it isn't lost.
function migrateLegacy() {
  const store = readStore();
  if (Object.keys(store).length > 0) return;     // already have named levels
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return;
    const tiles = JSON.parse(raw);
    if (!Array.isArray(tiles) || tiles.length === 0) return;
    const id = newLevelId();
    const now = Date.now();
    store[id] = { id, name: "My First Level", pack: 0, tiles, created: now, updated: now };
    writeStore(store);
  } catch (e) {
    console.warn("Could not rescue the old level:", e);
  }
}


// ----------------------------------------------------------------------------
//  THE PUBLIC HELPERS  —  what the editor / game / home page actually call
// ----------------------------------------------------------------------------
window.Levels = {
  // Every level as a LIST, newest-saved first (handy for the home page).
  all() {
    migrateLegacy();
    return Object.values(readStore()).sort((a, b) => (b.updated || 0) - (a.updated || 0));
  },

  // One level by id, or null if it's not there.
  get(id) {
    return readStore()[id] || null;
  },

  // Make and save a brand-new (empty) level. Returns the new level object.
  create(name, pack = 0) {
    const store = readStore();
    const id = newLevelId();
    const now = Date.now();
    const level = { id, name: name || "My Level", pack, tiles: [], created: now, updated: now };
    store[id] = level;
    writeStore(store);
    return level;
  },

  // Save (overwrite) a level. Pass the whole level object. Stamps "updated".
  put(level) {
    if (!level || !level.id) return;
    const store = readStore();
    level.updated = Date.now();
    if (!level.created) level.created = level.updated;
    store[level.id] = level;
    writeStore(store);
  },

  // Change just a level's name (used by the home page's rename button).
  rename(id, name) {
    const store = readStore();
    if (store[id]) { store[id].name = name; store[id].updated = Date.now(); writeStore(store); }
  },

  // Throw a level away for good.
  remove(id) {
    const store = readStore();
    delete store[id];
    writeStore(store);
  },

  // A unique-ish default name like "My Level 3" so new levels don't all clash.
  suggestName() {
    const n = Object.keys(readStore()).length + 1;
    return "My Level " + n;
  },

  newLevelId,
};
