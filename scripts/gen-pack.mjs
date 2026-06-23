// ============================================================================
//  GENERATOR  —  builds a pack's pack.js manifest from its PNG files (ANY pack)
// ============================================================================
//  This is the GENERIC version of gen-pack-new-platformer.mjs. Point it at a
//  pack folder that already has its art sorted into these subfolders:
//
//      assets/packs/<id>/
//        tiles/         ← ground, blocks, items, hazards, props, HUD (all tiles)
//        characters/    ← player sprites
//        enemies/       ← foes
//        backgrounds/   ← big tileable backdrops (optional)
//        sounds/        ← .ogg / .wav sound effects (optional)
//
//  …and it writes assets/packs/<id>/pack.js — the manifest the game + editor
//  both read. It figures out, just from the file NAMES + image sizes:
//    • which CATEGORY each tile belongs in (Ground / Blocks / Items / …),
//    • the tile + character pixel sizes (read straight from the PNG headers),
//    • which sprites behave like a coin / hazard / solid / player (ROLES),
//    • a short "Favourites" shortlist, and any sound effects.
//
//  It's a FIRST DRAFT meant to be hand-tuned afterwards (the /addpacks skill
//  does that). Re-running it OVERWRITES pack.js, so do tuning in a copy or
//  re-apply it after a regen.
//
//  Usage:
//     node scripts/gen-pack.mjs --id pixel --label "Pixel Platformer"
//     node scripts/gen-pack.mjs --id pixel --label "Pixel" --prefix pix
//
//  Flags:
//     --id      (required) the pack's short id + folder name under assets/packs/
//     --label   (required) the friendly name shown on the editor's pack button
//     --prefix  (optional) id prefix for sprite names; defaults to --id
//     --dir     (optional) the pack folder; defaults to assets/packs/<id>
// ============================================================================
import { readdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// --- Tiny flag parser (no dependencies) -------------------------------------
function flag(name, fallback = undefined) {
  const i = process.argv.indexOf("--" + name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const ID = flag("id");
const LABEL = flag("label");
const PREFIX = flag("prefix", ID);
if (!ID || !LABEL) {
  console.error('Need --id and --label, e.g.  node scripts/gen-pack.mjs --id pixel --label "Pixel Platformer"');
  process.exit(1);
}
const PACK_DIR = flag("dir", join(ROOT, "assets/packs", ID));
if (!existsSync(PACK_DIR)) {
  console.error("No such pack folder: " + PACK_DIR);
  process.exit(1);
}

// --- List the .png names (no extension) in a subfolder, or [] if it's missing.
const names = (folder) => {
  const dir = join(PACK_DIR, folder);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".png"))
    .map((f) => f.replace(/\.png$/i, ""))
    .sort();
};

const tiles = names("tiles");
const chars = names("characters");
const foes = names("enemies");
const backgrounds = names("backgrounds");

if (!tiles.length && !chars.length && !foes.length) {
  console.error("That folder has no tiles/, characters/ or enemies/ PNGs — nothing to build.");
  process.exit(1);
}

// --- Read a PNG's pixel size straight from its header (no image library). ----
//  A PNG starts with an 8-byte signature, then the IHDR chunk whose width and
//  height are 32-bit big-endian numbers at byte offsets 16 and 20.
function pngSize(folder, name) {
  try {
    const buf = readFileSync(join(PACK_DIR, folder, name + ".png"));
    if (buf.length < 24) return null;
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  } catch {
    return null;
  }
}
// The first sprite in a folder is a fine size sample (Kenney packs are uniform).
const sizeOf = (folder, list, fb) => (list.length && pngSize(folder, list[0])) || fb;
const tileSz = sizeOf("tiles", tiles, { w: 64, h: 64 });
const charSz = sizeOf("characters", chars, { w: 128, h: 128 });

// --- Sort the big "tiles" folder into friendly categories by name pattern. ---
//  Same rules the New Platformer pack uses, so packs feel consistent.
const isHud = (n) => /^hud[_-]/i.test(n);
const isItem = (n) =>
  /^(coin|gem|key|lock|flag)[_-]/i.test(n) || /(^|_)(star|heart)$/i.test(n);
const HAZARD_WORDS = /(spike|saw|lava|bomb|fire|laser|acid|thorn)/i;
const isHazard = (n) => HAZARD_WORDS.test(n);
const isGround = (n) => /^(terrain|ground|grass|dirt|sand|snow|stone|rock|mud|ice)/i.test(n);
const isBlock = (n) => /^(block|brick|bricks|crate|box)[_-]/i.test(n);

const cat = { Ground: [], Blocks: [], Items: [], Hazards: [], Props: [], HUD: [] };
for (const n of tiles) {
  if (isHud(n)) cat.HUD.push(n);
  else if (isHazard(n)) cat.Hazards.push(n);
  else if (isItem(n)) cat.Items.push(n);
  else if (isGround(n)) cat.Ground.push(n);
  else if (isBlock(n)) cat.Blocks.push(n);
  else cat.Props.push(n);
}

// --- Players: prefer one "front" pose per character; fall back to all. -------
const playerFronts = (() => {
  const fronts = chars.filter((n) => /(^|_)front$/i.test(n));
  return fronts.length ? fronts : chars;
})();

// --- Foes: collapse animation frames down to ONE representative per enemy. ---
//  e.g. fly_a/fly_b → fly_a ;  slime_normal_rest/_walk_a/_walk_b → slime_normal_rest.
//  We strip a trailing frame letter/number, then a trailing action word, to get
//  a "stem", group by it, and pick a calm resting frame for each.
const ACTION = /_(walk|move|swim|fly|jump|idle|rest|attack|climb|dig|hit|fall|run|shoot)$/i;
const stemOf = (n) => n.replace(/_([a-d]|\d+)$/i, "").replace(ACTION, "");
const foeReps = (() => {
  const groups = {};
  for (const n of foes) (groups[stemOf(n)] ||= []).push(n);
  const rank = (n) => (/rest|idle/i.test(n) ? 0 : /_a$|_1$/i.test(n) ? 1 : 2);
  return Object.values(groups)
    .map((g) => g.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))[0])
    .sort();
})();

// --- Roles: what each sprite DOES when placed in a level. --------------------
const has = (n) => tiles.includes(n) || chars.includes(n) || foes.includes(n);
const SOLID_PREFIXES = [
  ...new Set(
    ["terrain_", "ground_", "grass", "dirt", "sand", "snow", "stone", "rock", "block_", "brick_", "bricks_", "crate", "box"]
      .filter((p) => tiles.some((n) => n.toLowerCase().startsWith(p)))
  ),
];
const roles = {
  player: playerFronts,
  // Treat every Items-category coin/gem/star as a pickup.
  coin: cat.Items.filter((n) => /^(coin|gem)[_-]/i.test(n) || /(^|_)star$/i.test(n)),
  // First flag colour we can find (prefer a green "_a"/raised flag).
  flag: (() => {
    const flags = cat.Items.filter((n) => /^flag[_-]/i.test(n));
    const greens = flags.filter((n) => /green/i.test(n));
    const raised = flags.filter((n) => /_a$/i.test(n));
    return (greens.length ? greens : raised.length ? raised : flags).slice(0, 4);
  })(),
  // Hazards = the deadly tiles PLUS every foe we expose in the drawer.
  hazard: [...cat.Hazards, ...foeReps],
  reset: [],
  solidPrefixes: SOLID_PREFIXES,
  solid: ["bridge", "bridge_logs", "bridge_a", "plank", "planks"].filter(has),
};

// --- A short "Favourites" shortlist shown first so building is quick. --------
//  Auto-pick a handful of obviously-useful tiles, plus a player + a foe.
const pick = (list, re, n) => list.filter((x) => re.test(x)).slice(0, n);
const FAVOURITES = [
  ...pick(cat.Ground, /grass.*(block_top|top|center|block$)/i, 4),
  ...pick(cat.Ground, /dirt.*center|stone.*top/i, 2),
  ...pick(cat.Blocks, /^(block|brick)/i, 2),
  ...pick(cat.Items, /^coin/i, 1),
  ...pick(cat.Items, /^gem/i, 1),
  ...pick(cat.Items, /star/i, 1),
  ...roles.flag.slice(0, 1),
  ...pick(cat.Hazards, /spike|saw/i, 2),
  ...pick(cat.Props, /spring|door|ladder|sign|bush|mushroom/i, 4),
  ...playerFronts.slice(0, 1),
  ...foeReps.slice(0, 1),
].filter((x, i, a) => x && a.indexOf(x) === i);

// --- Sound effects: detect any in sounds/ and guess a role from the name. ----
const SOUND_KEYS = [
  ["jump-high", "jumpHigh"], ["jump", "jump"], ["coin", "coin"], ["gem", "gem"],
  ["hurt", "hurt"], ["bump", "bump"], ["disappear", "disappear"], ["magic", "magic"],
  ["select", "select"], ["throw", "throw"], ["break", "break"], ["powerup", "powerup"],
];
const sounds = (() => {
  const dir = join(PACK_DIR, "sounds");
  if (!existsSync(dir)) return {};
  const files = readdirSync(dir).filter((f) => /\.(ogg|wav|mp3)$/i.test(f));
  const out = {};
  for (const [needle, role] of SOUND_KEYS) {
    if (out[role]) continue;
    const hit = files.find((f) => f.toLowerCase().includes(needle));
    if (hit) out[role] = "sounds/" + hit;
  }
  return out;
})();

// --- Assemble the manifest in the SAME shape palette.js expects. ------------
const categories = [
  { name: "Ground", folder: "tiles", items: cat.Ground },
  { name: "Blocks", folder: "tiles", items: cat.Blocks },
  { name: "Items", folder: "tiles", items: cat.Items },
  { name: "Hazards", folder: "tiles", items: cat.Hazards },
  { name: "Props", folder: "tiles", items: cat.Props },
  { name: "HUD", folder: "tiles", items: cat.HUD },
  { name: "Players", folder: "characters", isChar: true, items: playerFronts },
  { name: "Foes", folder: "enemies", items: foeReps },
  { name: "Backgrounds", folder: "backgrounds", isBg: true, items: backgrounds },
].filter((c) => c.items.length); // drop empty categories so the drawer stays tidy

const manifest = {
  id: ID,
  label: LABEL,
  prefix: PREFIX,
  root: "assets/packs/" + ID,
  sizes: { tileW: tileSz.w, tileH: tileSz.h, charW: charSz.w, charH: charSz.h },
  categories,
  favourites: FAVOURITES,
  roles,
  sounds,
};

const out =
  "// ============================================================================\n" +
  `//  PACK MANIFEST  —  "${LABEL}" (Kenney, CC0)  —  AUTO-GENERATED\n` +
  "// ============================================================================\n" +
  "//  Generated by scripts/gen-pack.mjs from the PNG files in this folder. You CAN\n" +
  "//  hand-edit it, but re-running the generator will overwrite it. It registers\n" +
  "//  itself into window.EXTRA_PACKS; palette.js turns that into the shared sprite\n" +
  "//  registry the game and editor both use.\n" +
  "// ============================================================================\n" +
  "(window.EXTRA_PACKS = window.EXTRA_PACKS || []).push(\n" +
  JSON.stringify(manifest, null, 2) +
  "\n);\n";

writeFileSync(join(PACK_DIR, "pack.js"), out);

console.log(`Wrote ${join("assets/packs", ID, "pack.js")}  (id="${ID}", prefix="${PREFIX}")`);
console.log(`  tile size ${tileSz.w}x${tileSz.h}, char size ${charSz.w}x${charSz.h}`);
for (const c of categories) console.log(`  ${c.name.padEnd(12)} ${c.items.length}`);
console.log(`  favourites   ${FAVOURITES.length}`);
console.log(`  roles: player=${roles.player.length} coin=${roles.coin.length} flag=${roles.flag.length} hazard=${roles.hazard.length} solid=${roles.solid.length}`);
console.log(`  sounds: ${Object.keys(sounds).length ? Object.keys(sounds).join(", ") : "(none)"}`);
console.log("\nNext: review the roles/favourites, then add the <script> line to the 3 HTML pages.");
