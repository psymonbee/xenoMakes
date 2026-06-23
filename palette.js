// ============================================================================
//  PALETTE  —  the shared sprite REGISTRY the editor AND the game both use
// ============================================================================
//  Both editor.js and main.js load this file. Keeping the list in one place
//  means the level designer and the game can never disagree about which sprites
//  exist, where they live on disk, how big they are, or how they behave.
//
//  ----------------------------------------------------------------------------
//  PACKS  —  the big idea that lets us add lots of art packs over time
//  ----------------------------------------------------------------------------
//  A "pack" is one set of art (e.g. Kenney's classic platformer pack, or the
//  newer one). Each pack is described by a little MANIFEST: its folder, the size
//  of its tiles, the sprites it has (grouped into categories), and what those
//  sprites DO (coin? hazard? solid ground? the player?).
//
//  • The CLASSIC pack is written inline just below (BASE_PACK).
//  • Every OTHER pack lives in its own file, e.g.
//      assets/packs/new-platformer/pack.js
//    which pushes itself onto window.EXTRA_PACKS. Those files must be loaded
//    BEFORE this one (see index.html / editor.html).
//
//  To add a brand-new pack later: drop its folder in, add a pack.js manifest,
//  load it in the two HTML files. No game or editor code needs to change.
//
//  ----------------------------------------------------------------------------
//  IDs  —  how a sprite is named everywhere (saves, editor, game)
//  ----------------------------------------------------------------------------
//  The classic pack keeps PLAIN names ("grassMid", "coinGold") so old saved
//  levels keep working. Every other pack PREFIXES its names with its id and a
//  colon ("newplat:coin_gold"). That prefix is what stops two different packs
//  from clashing when they both have a sprite called, say, "block_blue".
// ============================================================================


// ----------------------------------------------------------------------------
//  THE CLASSIC PACK  —  the original Kenney art (lives flat under assets/…)
// ----------------------------------------------------------------------------
//  prefix:"" means its sprites keep their plain names with no "id:" in front.
const BASE_PACK = {
  id: "base",
  label: "Classic",
  // hidden:false means this pack IS offered in the editor's pack-picker, so you
  // can build with the Classic art as well as the Standard pack. (Set this back
  // to true to hide it again — its sprites still load either way, so old levels
  // that used classic tiles keep rendering regardless.)
  hidden: false,
  prefix: "",                              // no prefix → plain names like "grassMid"
  root: "assets",                          // files live at assets/<folder>/<name>.png
  sizes: { tileW: 70, tileH: 70, charW: 66, charH: 92 },

  // Each category becomes a tab in the editor's drawer.
  categories: [
    {
      name: "Tiles", folder: "tiles",
      items: [
        "grassMid", "grassLeft", "grassRight", "grassCenter",
        "dirtMid", "dirtCenter",
        "sandMid", "sandCenter",
        "snowMid", "snowCenter",
        "stoneMid", "stoneCenter",
        "castleMid", "castleCenter",
        "box", "boxCoin", "boxItem", "brickWall", "bridge",
        "ladder_mid", "door_closedTop", "door_closedMid", "fence", "sign",
        "liquidWater", "liquidWaterTop_mid", "liquidLava",
        "resetZone",   // INVISIBLE reset zone — has no picture (see roles.reset)
      ],
    },
    {
      name: "Items", folder: "items",
      items: [
        "coinGold", "coinSilver", "coinBronze",
        "gemBlue", "gemGreen", "gemRed", "gemYellow", "star",
        "keyBlue", "keyGreen", "keyRed", "keyYellow",
        "flagGreen", "springboardUp",
        "bush", "cactus", "mushroomRed", "mushroomBrown", "rock", "plant", "cloud1",
      ],
    },
    {
      name: "Foes", folder: "enemies",
      items: ["slimeWalk1", "snailWalk1", "flyFly1", "fishSwim1", "blockerBody"],
    },
    {
      name: "Players", folder: "characters", isChar: true,
      items: ["p1_front", "p2_front", "p3_front"],
    },
  ],

  // A short "best bits" shortlist, shown as a "★ Faves" tab so the Classic pack
  // is laid out just like the Standard pack (faves first, then the categories).
  favourites: [
    "grassMid", "grassLeft", "grassRight", "dirtMid", "stoneMid",
    "box", "boxCoin", "brickWall", "ladder_mid", "door_closedTop",
    "coinGold", "gemBlue", "star", "flagGreen", "springboardUp",
    "bush", "mushroomRed", "sign",
    "slimeWalk1", "p1_front",
  ],

  // What each sprite DOES. (Edge-piece families share a name prefix, so for
  // "solid" we can match by prefix instead of listing every piece.)
  roles: {
    player: ["p1_front", "p2_front", "p3_front"],
    coin: ["coinGold", "coinSilver", "coinBronze", "gemBlue", "gemGreen", "gemRed", "gemYellow", "star"],
    flag: ["flagGreen"],
    hazard: ["spikes", "liquidLava", "liquidLavaTop_mid", "slimeWalk1", "snailWalk1", "flyFly1", "fishSwim1", "blockerBody"],
    reset: ["resetZone"],            // invisible "send player back to start" zones
    solidPrefixes: ["grass", "dirt", "sand", "snow", "stone", "castle"],
    solid: ["box", "boxCoin", "boxItem", "brickWall", "bridge"],
  },

  sounds: {},   // the classic pack ships no sounds (the new pack does)
};


// ----------------------------------------------------------------------------
//  BUILD THE REGISTRY  —  turn every pack manifest into fast lookup tables
// ----------------------------------------------------------------------------
//  After this runs we have, for the WHOLE game:
//    window.ASSET_INFO[id]  = { pack, name, folder, w, h, root }
//    window.spritePath(id)  = "assets/.../name.png"
//    window.ROLES           = { player, coin, flag, hazard, reset, solid } sets
//    window.RESET_IDS       = the reset set (kept under its old name)
//    window.isSolidId(id)   = can you stand on it?
//    window.PACKS           = the manifests (the editor's pack picker reads this)
//    window.PALETTE         = { categories } for the FIRST pack (back-compat)
const ALL_PACKS = [BASE_PACK, ...(window.EXTRA_PACKS || [])];

window.ASSET_INFO = {};
window.ROLES = { player: new Set(), coin: new Set(), flag: new Set(), hazard: new Set(), reset: new Set(), solid: new Set(), spring: new Set(), coinblock: new Set(), lever: new Set(), button: new Set(), door: new Set() };

// Per-pack list of "this name-prefix means solid ground" rules, keyed by pack id.
const SOLID_PREFIXES = {};   // { packId: ["grass","dirt",…] }
const NAME_TO_ID = {};       // packId -> { bareName -> full id }, for building roles

// fullId("base","grassMid") -> "grassMid"   ;  fullId("newplat","coin") -> "newplat:coin"
function fullId(pack, name) {
  return pack.prefix ? pack.prefix + ":" + name : name;
}

for (const pack of ALL_PACKS) {
  SOLID_PREFIXES[pack.id] = pack.roles.solidPrefixes || [];
  NAME_TO_ID[pack.id] = {};

  for (const cat of pack.categories) {
    // Pick the right size for this category: characters, backgrounds, or tiles.
    const w = cat.isChar ? pack.sizes.charW : (cat.isBg ? 256 : pack.sizes.tileW);
    const h = cat.isChar ? pack.sizes.charH : (cat.isBg ? 256 : pack.sizes.tileH);

    for (const name of cat.items) {
      const id = fullId(pack, name);
      NAME_TO_ID[pack.id][name] = id;
      window.ASSET_INFO[id] = { pack: pack.id, name, folder: cat.folder, w, h, root: pack.root, bg: !!cat.isBg, char: !!cat.isChar };
    }
  }

  // Translate this pack's role lists (bare names) into full ids and collect them.
  const R = pack.roles;
  const collect = (bareList, set) => {
    for (const bare of bareList || []) {
      const id = NAME_TO_ID[pack.id][bare] || fullId(pack, bare);
      set.add(id);
    }
  };
  collect(R.player, window.ROLES.player);
  collect(R.coin, window.ROLES.coin);
  collect(R.flag, window.ROLES.flag);
  collect(R.hazard, window.ROLES.hazard);
  collect(R.reset, window.ROLES.reset);
  collect(R.solid, window.ROLES.solid);
  collect(R.spring, window.ROLES.spring);   // a pack MAY list its springs by name…
}

// …but we also spot springs by their picture name, so every pack works with no
// extra wiring: the Classic pack's "springboardUp" and the Standard pack's
// "spring" both become bouncy without anyone editing a manifest.
for (const id of Object.keys(window.ASSET_INFO)) {
  const n = window.ASSET_INFO[id].name;
  if (n === "spring" || n === "springboardUp") window.ROLES.spring.add(id);
}


// ----------------------------------------------------------------------------
//  THE INTERACTION SET  —  the growing library of "tiles that DO something"
// ----------------------------------------------------------------------------
//  Some tiles aren't just scenery — they REACT. A spring squishes and flings
//  you up; a "?" block gives a coin and goes empty; a lever flips over; a button
//  presses down; a door swings open. Each of these has TWO pictures: its resting
//  look and its "after" look.
//
//  This is the ONE place that knows, per art pack, which tiles are interactive
//  and what their two pictures are called. We list them as [resting, after]
//  pairs of bare picture names. From this we:
//    • add each resting tile to the right window.ROLES.<kind> set, and
//    • record window.COMPANION[restingId] = the "after" picture's id.
//  The game code (main.js) only ever reads those two things — it never needs to
//  know any pack's filenames. So teaching a NEW pack these tricks, or inventing
//  a brand-new interactive tile, is just adding a line here. The library grows
//  without touching the game.
const INTERACTIONS = {
  // Classic Kenney "Base" pack (hidden now, but old levels may still use it).
  base: {
    spring:    [["springboardUp", "springboardDown"]],
    coinblock: [["boxCoin", "boxCoin_disabled"]],
    lever:     [["switchLeft", "switchRight"]],
    button:    [["buttonRed", "buttonRed_pressed"]],
    door:      [["door_closedTop", "door_openTop"], ["door_closedMid", "door_openMid"]],
  },
  // "New Platformer" / Standard pack — the one we build with now.
  newplat: {
    spring:    [["spring", "spring_out"]],
    coinblock: [["block_coin", "block_empty"], ["block_exclamation", "block_empty"]],
    lever:     [["lever_left", "lever_right"]],
    button:    [["switch_red", "switch_red_pressed"], ["switch_blue", "switch_blue_pressed"],
                ["switch_green", "switch_green_pressed"], ["switch_yellow", "switch_yellow_pressed"]],
    door:      [["door_closed", "door_open"], ["door_closed_top", "door_open_top"]],
  },
};

// window.COMPANION[restingId] = the id of its "after" picture (squished spring,
// spent "?" block, flipped lever, pressed button, open door).
window.COMPANION = {};
for (const pack of ALL_PACKS) {
  const defs = INTERACTIONS[pack.id];
  if (!defs) continue;
  for (const kind of ["spring", "coinblock", "lever", "button", "door"]) {
    for (const [rest, after] of (defs[kind] || [])) {
      const restId = NAME_TO_ID[pack.id][rest];
      if (!restId) continue;                 // this pack doesn't have that tile — skip
      const afterId = fullId(pack, after);
      // The "after" picture might not be a placeable tile listed in the pack's
      // categories (it's just an alternate look). If so, register it now using
      // the resting tile's folder/size, so spritePath() + the loader can find it.
      if (!window.ASSET_INFO[afterId]) {
        const ra = window.ASSET_INFO[restId];
        window.ASSET_INFO[afterId] = { pack: pack.id, name: after, folder: ra.folder, w: ra.w, h: ra.h, root: ra.root, bg: false, char: false };
      }
      window.ROLES[kind].add(restId);
      window.COMPANION[restId] = afterId;
    }
  }
}

// A coin picture to "pop" out of a "?" block, matched to the block's own pack so
// it looks right (a Standard coin for a Standard block, etc.). Returns a coin id
// or null if the pack has no coin art.
window.coinFor = (packId) => {
  for (const id of window.ROLES.coin) if (window.ASSET_INFO[id] && window.ASSET_INFO[id].pack === packId) return id;
  for (const id of window.ROLES.coin) return id;   // fall back to any coin at all
  return null;
};

// Keep the old name some code still uses.
window.RESET_IDS = window.ROLES.reset;

// Expose the manifests (with full-id versions of items/favourites) for the editor.
window.PACKS = ALL_PACKS.map((pack) => ({
  id: pack.id,
  label: pack.label,
  hidden: !!pack.hidden,                    // editor skips hidden packs in its picker
  sizes: pack.sizes,
  categories: pack.categories.map((cat) => ({
    name: cat.name,
    folder: cat.folder,
    isChar: !!cat.isChar,
    isBg: !!cat.isBg,
    items: cat.items.map((name) => fullId(pack, name)),
  })),
  favourites: (pack.favourites || []).map((name) => fullId(pack, name)),
}));

// Back-compat: some older code reads window.PALETTE.categories (the classic pack).
window.PALETTE = { categories: window.PACKS[0].categories };


// ----------------------------------------------------------------------------
//  HELPERS  —  the handful of functions the editor and game call
// ----------------------------------------------------------------------------
// Turn an id into its picture path, e.g. "grassMid" -> "assets/tiles/grassMid.png"
// or "newplat:coin_gold" -> "assets/packs/new-platformer/tiles/coin_gold.png".
window.spritePath = (id) => {
  const a = window.ASSET_INFO[id];
  return `${a.root}/${a.folder}/${a.name}.png`;
};

// "Can the player stand on this?"  True for explicit solids and for any sprite
// whose name starts with one of its pack's solid prefixes — UNLESS it's a hazard
// (e.g. block_spikes looks like a block but should hurt you, not hold you up).
window.isSolidId = (id) => {
  if (window.ROLES.hazard.has(id)) return false;
  if (window.ROLES.solid.has(id)) return true;
  const a = window.ASSET_INFO[id];
  if (!a) return false;
  return (SOLID_PREFIXES[a.pack] || []).some((p) => a.name.startsWith(p));
};

// Look up the sound effects for a pack (so the game can play "jump", "coin", …).
// Returns { role: "assets/.../sfx.ogg" } with full paths, or {} if the pack is silent.
window.packSounds = (packId) => {
  const pack = ALL_PACKS.find((p) => p.id === packId);
  if (!pack || !pack.sounds) return {};
  const out = {};
  for (const [role, rel] of Object.entries(pack.sounds)) out[role] = `${pack.root}/${rel}`;
  return out;
};


// ----------------------------------------------------------------------------
//  LAYERS  —  who draws in front of whom (and where future systems live)
// ----------------------------------------------------------------------------
//  Every sprite belongs to a LAYER, and each layer has a "z" number. Higher z
//  draws in FRONT. Sprites are auto-sorted onto the right layer by what they are
//  (a backdrop goes behind everything, the player in front, etc.), so a level
//  looks tidy with no fiddling. In the editor you can still nudge one sprite
//  forward/back with the [ and ] keys — that keeps its z inside the gameplay
//  range (zMin..zMax) so it can never jump above the reserved system bands.
//
//  The HIGH "system" bands (paths / triggers / physics) are reserved for editor
//  overlays and future feature-types (movement paths now; audio triggers and
//  physics zones later). They always draw above the artwork, and the per-sprite
//  nudge can't reach them — so adding those features later won't fight the art.
window.LAYERS = {
  // gameplay layers, back -> front
  order: ["background", "decoration", "terrain", "items", "foes", "player"],
  z: {
    background: 0,
    decoration: 100,
    terrain: 200,
    items: 300,
    foes: 400,
    player: 500,
    // reserved system/overlay bands (kept under the editor's drawer UI at z 1000)
    paths: 700,
    triggers: 750,
    physics: 800,
  },
  zMin: 0,    // a nudged sprite can't go behind this…
  zMax: 650,  // …or in front of this (which keeps it under the system bands)
};

// Work out which layer a sprite belongs to, from what kind of thing it is. We
// already know its role (player/coin/hazard…) and whether it's a background or a
// character, so we can sort it without anyone hand-labelling every sprite.
function computeLayer(id) {
  const a = window.ASSET_INFO[id];
  if (!a) return "decoration";
  if (window.ROLES.player.has(id) || a.char) return "player";
  if (a.bg) return "background";
  if (a.folder === "enemies") return "foes";        // slimes, snails, flies…
  if (window.ROLES.coin.has(id) || window.ROLES.flag.has(id)) return "items";
  if (window.ROLES.spring.has(id)) return "items";  // springs sit up with the items
  if (window.ROLES.lever.has(id) || window.ROLES.button.has(id)) return "items"; // switches in front
  if (window.ROLES.coinblock.has(id)) return "terrain"; // "?" blocks are solid blocks
  if (window.ROLES.door.has(id)) return "terrain";  // doors are walls you pass when open
  if (window.isSolidId(id)) return "terrain";       // ground / platforms / blocks
  if (window.ROLES.hazard.has(id) || window.ROLES.reset.has(id)) return "terrain"; // lava, spikes, reset zones
  return "decoration";                              // bushes, signs, clouds…
}

// Stamp each sprite with its layer once, now that the role tables + isSolidId all
// exist. (This runs at the very end of the file on purpose.)
for (const id of Object.keys(window.ASSET_INFO)) {
  window.ASSET_INFO[id].layer = computeLayer(id);
}

// Quick lookup the editor + game use: "which layer is this sprite on?"
window.layerOf = (id) => (window.ASSET_INFO[id] && window.ASSET_INFO[id].layer) || "decoration";
