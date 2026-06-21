// ============================================================================
//  GENERATOR  —  builds assets/packs/new-platformer/pack.js from the PNG files
// ============================================================================
//  Why a generator? The "New Platformer" pack has 300+ tiles. Hand-typing every
//  name into a manifest would be slow and error-prone. Instead this script reads
//  the folders we copied in, sorts each sprite into a sensible CATEGORY by its
//  name, tags ROLES (what behaves like a coin / hazard / solid / player…), and
//  writes a tidy pack.js the game + editor load.
//
//  Re-run it any time you add/remove files in this pack:
//     node scripts/gen-pack-new-platformer.mjs
// ============================================================================
import { readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PACK_DIR = join(ROOT, "assets/packs/new-platformer");

const names = (folder) =>
  readdirSync(join(PACK_DIR, folder))
    .filter((f) => f.endsWith(".png"))
    .map((f) => f.replace(/\.png$/, ""))
    .sort();

const tiles = names("tiles");
const chars = names("characters");
const foes = names("enemies");
const backgrounds = names("backgrounds");

// --- Sort the big "tiles" folder into friendly categories by name pattern. ----
const isHud = (n) => n.startsWith("hud_");
const isItem = (n) =>
  /^(coin_|gem_|key_|lock_|flag_)/.test(n) || n === "star" || n === "heart";
const HAZARD_TILES = new Set([
  "spikes", "block_spikes", "saw", "lava", "lava_top", "lava_top_low",
  "bomb_active", "fireball",
]);
const isGround = (n) => n.startsWith("terrain_");
const isBlock = (n) =>
  (n.startsWith("block_") && n !== "block_spikes") ||
  n.startsWith("brick_") || n.startsWith("bricks_");

const cat = { Ground: [], Blocks: [], Items: [], Hazards: [], Props: [], HUD: [] };
for (const n of tiles) {
  if (isHud(n)) cat.HUD.push(n);
  else if (HAZARD_TILES.has(n)) cat.Hazards.push(n);
  else if (isItem(n)) cat.Items.push(n);
  else if (isGround(n)) cat.Ground.push(n);
  else if (isBlock(n)) cat.Blocks.push(n);
  else cat.Props.push(n);
}

// --- Players: show one "front" pose per colour in the drawer (the game loads ---
//     the matching _jump pose itself). All other poses still live on disk.
const playerFronts = chars.filter((n) => n.endsWith("_front"));

// --- Foes: one representative still-frame per enemy so the drawer isn't a wall --
//     of animation frames. The extra frames are on disk for animating later.
const FOE_PICK = [
  "slime_normal_rest", "slime_fire_rest", "slime_spike_rest", "slime_block_rest",
  "snail_walk_a", "fly_a", "bee_a", "ladybug_walk_a", "mouse_walk_a",
  "frog_idle", "worm_normal_move_a", "worm_ring_move_a",
  "fish_blue_swim_a", "fish_purple_rest", "fish_yellow_swim_a",
  "barnacle_attack_rest", "saw_a",
];
const foeItems = FOE_PICK.filter((n) => foes.includes(n));

// --- Roles: what each sprite DOES when placed in a level. -------------------
const COLOURS = ["beige", "green", "pink", "purple", "yellow"];
const roles = {
  player: COLOURS.map((c) => `character_${c}_front`).filter((n) => chars.includes(n)),
  coin: [
    "coin_gold", "coin_silver", "coin_bronze",
    "gem_blue", "gem_green", "gem_red", "gem_yellow", "star",
  ].filter((n) => tiles.includes(n)),
  flag: ["flag_green_a", "flag_blue_a", "flag_red_a", "flag_yellow_a"].filter((n) => tiles.includes(n)),
  // Hazards = the deadly tiles above, PLUS every enemy we expose in the drawer.
  hazard: [...cat.Hazards, ...foeItems],
  reset: [],
  // Solid = you can stand on it. Whole families share a name prefix, so we match
  // by prefix instead of listing hundreds of edge pieces one by one.
  solidPrefixes: ["terrain_", "block_", "brick_", "bricks_"],
  solid: ["bridge", "bridge_logs"].filter((n) => tiles.includes(n)),
};

// --- A short "Favourites" shortlist shown first so Zac isn't hunting. --------
const FAVOURITES = [
  "terrain_grass_block_top", "terrain_grass_block_center",
  "terrain_grass_block_top_left", "terrain_grass_block_top_right",
  "terrain_dirt_block_center", "terrain_stone_block_top",
  "block_blue", "block_coin", "brick_brown",
  "coin_gold", "gem_blue", "star", "flag_green_a",
  "spikes", "saw", "spring",
  "character_beige_front", "slime_normal_rest",
  "door_closed", "ladder_middle", "sign", "bush", "mushroom_red",
].filter((n) => tiles.includes(n) || chars.includes(n) || foes.includes(n));

// --- The 10 sound effects (paths are relative to the pack root). ------------
const sounds = {
  jump: "sounds/sfx_jump.ogg",
  jumpHigh: "sounds/sfx_jump-high.ogg",
  coin: "sounds/sfx_coin.ogg",
  gem: "sounds/sfx_gem.ogg",
  hurt: "sounds/sfx_hurt.ogg",
  bump: "sounds/sfx_bump.ogg",
  disappear: "sounds/sfx_disappear.ogg",
  magic: "sounds/sfx_magic.ogg",
  select: "sounds/sfx_select.ogg",
  throw: "sounds/sfx_throw.ogg",
};

// --- Assemble the manifest in the SAME shape palette.js expects. ------------
const manifest = {
  id: "newplat",
  label: "New Platformer",
  prefix: "newplat",                       // ids become "newplat:<name>"
  root: "assets/packs/new-platformer",
  sizes: { tileW: 64, tileH: 64, charW: 128, charH: 128 },
  categories: [
    { name: "Ground", folder: "tiles", items: cat.Ground },
    { name: "Blocks", folder: "tiles", items: cat.Blocks },
    { name: "Items", folder: "tiles", items: cat.Items },
    { name: "Hazards", folder: "tiles", items: cat.Hazards },
    { name: "Props", folder: "tiles", items: cat.Props },
    { name: "HUD", folder: "tiles", items: cat.HUD },
    { name: "Players", folder: "characters", isChar: true, items: playerFronts },
    { name: "Foes", folder: "enemies", items: foeItems },
    { name: "Backgrounds", folder: "backgrounds", isBg: true, items: backgrounds },
  ],
  favourites: FAVOURITES,
  roles,
  sounds,
};

// Pretty-print so a human can still read/tweak the result by hand.
const out =
  "// ============================================================================\n" +
  "//  PACK MANIFEST  —  \"New Platformer\" (Kenney, CC0)  —  AUTO-GENERATED\n" +
  "// ============================================================================\n" +
  "//  Generated by scripts/gen-pack-new-platformer.mjs from the PNG files in this\n" +
  "//  folder. You CAN hand-edit it, but re-running the generator will overwrite it.\n" +
  "//  It registers itself into window.EXTRA_PACKS; palette.js turns that into the\n" +
  "//  shared sprite registry the game and editor both use.\n" +
  "// ============================================================================\n" +
  "(window.EXTRA_PACKS = window.EXTRA_PACKS || []).push(\n" +
  JSON.stringify(manifest, null, 2) +
  "\n);\n";

writeFileSync(join(PACK_DIR, "pack.js"), out);

const total = Object.values(cat).reduce((s, a) => s + a.length, 0) +
  playerFronts.length + foeItems.length + backgrounds.length;
console.log("Wrote pack.js");
for (const c of manifest.categories) console.log(`  ${c.name.padEnd(12)} ${c.items.length}`);
console.log(`  favourites   ${FAVOURITES.length}`);
console.log(`  (drawer shows ${total} sprites; ${tiles.length} tiles + more on disk)`);
