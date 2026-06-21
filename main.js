// ============================================================================
//  COIN QUEST  —  a tiny side-scrolling platformer made with Kaplay
// ============================================================================
//  How it works in 3 sentences:
//    1. We load some pictures (sprites) from the ./assets folder.
//    2. We draw a level out of letters (see LEVEL_MAP below) — each letter
//       becomes a tile or a coin or the player.
//    3. Then we add the rules: move, jump, fall, collect coins, win.
//
//  Want to change how the game feels? Almost everything you'd want to tweak
//  is in the SETTINGS block right below. Have fun!
// ============================================================================


// ----------------------------------------------------------------------------
//  SETTINGS  —  the fun knobs to turn  (try changing these numbers!)
// ----------------------------------------------------------------------------
const PLAYER_SPEED = 240;   // how fast the player runs (bigger = faster)
const JUMP_FORCE   = 1000;   // how hard the player jumps (bigger = higher)
const GRAVITY      = 1700;  // how strongly things fall (bigger = heavier)
const TILE_SIZE    = 70;    // size of one tile in pixels (the art is 70x70)


// ----------------------------------------------------------------------------
//  START KAPLAY  —  this makes the game window and the canvas
// ----------------------------------------------------------------------------
kaplay({
  // No fixed width/height (and no letterbox) means Kaplay fills the whole
  // browser window and follows it when you resize — so the game is as big as
  // your screen instead of a small boxed-in window.
  background: [135, 206, 235], // sky blue  (Red, Green, Blue from 0-255)
});

// Make everything fall downward.
setGravity(GRAVITY);


// ----------------------------------------------------------------------------
//  SOUND  —  load the pack's sound effects and a tiny helper to play them
// ----------------------------------------------------------------------------
//  The "New Platformer" pack comes with sound effects (jump, coin, hurt…). We
//  load them under short role names so the game can just say playSfx("jump").
//  If a sound is missing we simply stay quiet — never crash over a sound.
const SFX = window.packSounds("newplat");          // { jump: "…/sfx_jump.ogg", … }
for (const [role, path] of Object.entries(SFX)) {
  loadSound("sfx-" + role, path);
}
function playSfx(role, opts) {
  if (SFX[role]) play("sfx-" + role, opts);
}


// ----------------------------------------------------------------------------
//  LOAD THE PICTURES  —  give each Kenney sprite a short nickname
//  (See ASSETS.md for the full list of art you can use.)
// ----------------------------------------------------------------------------
loadSprite("player",      "assets/characters/p1_front.png"); // standing/running
loadSprite("player-jump", "assets/characters/p1_jump.png");  // mid-air pose
loadSprite("grass",       "assets/tiles/grassMid.png");      // grassy ground top
loadSprite("dirt",        "assets/tiles/grassCenter.png");   // dirt under grass
loadSprite("box",         "assets/tiles/box.png");           // a crate
loadSprite("coin",        "assets/items/coinGold.png");      // shiny gold coin
loadSprite("flag",        "assets/items/flagGreen.png");     // goal flag
loadSprite("cloud",       "assets/items/cloud1.png");        // fluffy cloud


// ----------------------------------------------------------------------------
//  LEVEL DESIGNER HOOK-UP  —  can we play a level the editor made?
// ----------------------------------------------------------------------------
//  The level designer (editor.html) saves your creation in the browser. If you
//  press its "Play" button, it opens this page with "?play=1" in the address,
//  which tells us to build YOUR level instead of the built-in one below.
const PLAY_DESIGN = new URLSearchParams(location.search).get("play") === "1";

let DESIGN = null;  // your saved level (a list of {id, x, y}), or null
if (PLAY_DESIGN) {
  try {
    const saved = JSON.parse(localStorage.getItem("coinquest-level") || "[]");
    if (saved.length > 0) DESIGN = saved;
  } catch (e) {
    console.warn("Could not read the designed level:", e);
  }
}

// Load every sprite the design uses (the palette.js table knows their paths).
if (DESIGN) {
  const ids = new Set(DESIGN.map((t) => t.id));
  for (const id of ids) {
    if (window.RESET_IDS.has(id)) continue;        // reset zones have no picture
    if (window.ASSET_INFO[id]) loadSprite(id, window.spritePath(id));
  }
  // Also load the matching "jump" pose for any player character that's used.
  // A player's front-pose id ends in "_front" (e.g. "p1_front" or
  // "newplat:character_beige_front"); its jump pose swaps that for "_jump" and
  // lives right next to it on disk, so we build the path from the same folder.
  for (const id of ids) {
    if (!window.ROLES.player.has(id)) continue;
    const a = window.ASSET_INFO[id];
    const jumpName = a.name.replace("_front", "_jump");
    loadSprite(id.replace("_front", "_jump"), `${a.root}/${a.folder}/${jumpName}.png`);
  }
}


// ----------------------------------------------------------------------------
//  WHAT EACH DESIGNED SPRITE DOES  —  turn a sprite name into game behaviour
// ----------------------------------------------------------------------------
//  When we build a designed level, each sprite needs to know how to behave:
//  is it solid ground? a coin to collect? a dangerous hazard? the player?
//
//  These "who does what" lists now live in palette.js (window.ROLES), built from
//  every pack's manifest. That means ANY pack's sprites — classic or new —
//  behave correctly here, and we never have to keep two lists in sync.
const COIN_IDS   = window.ROLES.coin;
const HAZARD_IDS = window.ROLES.hazard;
const PLAYER_IDS = window.ROLES.player;
const FLAG_IDS   = window.ROLES.flag;
// RESET zones: INVISIBLE blocks that send the player back to the start when
// touched. In the GAME you can't see them at all; in the level designer they
// show as a red outline so you know where you put them.
const RESET_IDS  = window.RESET_IDS;

// Solid = you can stand on it. palette.js knows each pack's ground families.
const isSolidId = window.isSolidId;


// ----------------------------------------------------------------------------
//  SLOPE HITBOXES  —  give ramps/hills a TRIANGLE shape instead of a big square
// ----------------------------------------------------------------------------
//  A slope sprite is drawn as a diagonal, but a normal area() hitbox is always a
//  full rectangle — so the player bumps into an invisible "cube" instead of
//  walking up the slope. To fix that we hand the slope a custom hitbox SHAPE: a
//  triangle (or wedge) that hugs the solid part of the picture.
//
//  The points below are measured in TOP-LEFT coordinates: (0,0) is the top-left
//  of the tile and (w,h) is the bottom-right. They trace the SOLID part of each
//  slope, read straight from the Kenney art.
//
//  We return the raw points (a list of [x, y] corners) so the caller can both
//  build the hitbox AND rotate it with the tile. Returns null for everything
//  that isn't a slope (so normal blocks keep their simple rectangle hitbox).
function slopePoints(id) {
  const a = window.ASSET_INFO[id];
  if (!a) return null;
  const w = a.w, h = a.h;          // this tile's width & height in pixels
  const n = a.name;                // the bare sprite name, e.g. "grassHillRight"

  // --- "New Platformer" pack ramps (these all go DOWN to the right) ---
  // short_b: a full 45° slope filling one tile (solid = lower-left triangle).
  if (n.endsWith("_ramp_short_b")) return [[0, 0], [0, h], [w, h]];
  // long ramps are a gentler slope split across two tiles:
  //   long_a = the upper half (a wedge), long_b = the lower half (a triangle).
  if (n.endsWith("_ramp_long_a"))  return [[0, 0], [0, h], [w, h], [w, h / 2]];
  if (n.endsWith("_ramp_long_b"))  return [[0, h / 2], [0, h], [w, h]];
  // (short_a and long_c are plain solid blocks — no special shape needed.)

  // --- Classic Kenney hill pieces ---
  // The "2" pieces are full solid blocks, so leave them as rectangles.
  if (/Hill(Left|Right)2$/.test(n)) return null;
  // "...HillRight" goes DOWN to the right (solid = lower-left triangle).
  if (/HillRight$/.test(n)) return [[0, 0], [0, h], [w, h]];
  // "...HillLeft" goes UP to the right (solid = lower-right triangle).
  if (/HillLeft$/.test(n))  return [[0, h], [w, 0], [w, h]];

  return null;   // not a slope — caller will use the normal square hitbox
}

// Turn TOP-LEFT slope points into a Polygon measured from the tile's CENTRE,
// mirrored if the tile is flipped. Designed tiles are anchored at their centre
// (so they can spin in place), and a custom area() shape must be given in that
// same centre-based space. Rotation is applied automatically by the rotate()
// component, so here we only flip (mirror) the points and shift them to centre.
//   flipX mirrors left↔right; flipY mirrors top↔bottom — exactly matching what
//   the flipped PICTURE does, so the hitbox always lines up with the art.
function centeredSlopePoly(points, w, h, flipX, flipY) {
  return new Polygon(points.map(([x, y]) => {
    const fx = flipX ? w - x : x;
    const fy = flipY ? h - y : y;
    return vec2(fx - w / 2, fy - h / 2);
  }));
}


// ----------------------------------------------------------------------------
//  PLAYER HITBOX  —  match the body, not the big see-through picture
// ----------------------------------------------------------------------------
//  The "New Platformer" characters are drawn small inside a big 128x128 picture,
//  with lots of see-through space around them. A normal area() hitbox would cover
//  that WHOLE picture, so the player floats above the ground and bumps into
//  slopes with its empty corners. We measured where the body actually is in the
//  art and give the player a hitbox that hugs it instead.
//
//  Returns the area() component to use for a player sprite.
function playerArea(id) {
  const a = window.ASSET_INFO[id];
  // New pack characters: the real body sits at x 25..103, y 31..128 (measured
  // from the PNG). Tiles are anchored at their CENTRE, so we measure the body
  // box from the centre too: a 128px tile's centre is (64,64), so the body's
  // top-left of (25,31) becomes (25-64, 31-64) = (-39,-33). Size 78 wide, 97 tall.
  if (a && a.pack === "newplat") {
    return area({ shape: new Rect(vec2(-39, -33), 78, 97) });
  }
  // Classic characters fill their whole picture, so the normal hitbox is right.
  return area();
}

// Add ONE designed sprite to the world with the right behaviour for what it is.
//
//  Every designed tile is anchored at its CENTRE and given a rotate(angle)
//  component. Anchoring at the centre means a tile spins in place (instead of
//  swinging off its corner), and Kaplay rotates the hitbox along with the
//  picture — so rotated slopes and blocks collide correctly. The editor saves a
//  tile's TOP-LEFT corner, so we add half its size to get the centre.
function addDesignTile(id, x, y, angle = 0, flipX = false, flipY = false) {
  const a = window.ASSET_INFO[id] || { w: TILE_SIZE, h: TILE_SIZE };
  const w = a.w, h = a.h;
  const cx = x + w / 2, cy = y + h / 2;          // top-left -> centre
  const common = [pos(cx, cy), anchor("center"), rotate(angle)];
  const pic = sprite(id, { flipX, flipY });      // the picture, mirrored if asked

  if (PLAYER_IDS.has(id)) {
    // The player gets a hitbox that hugs its body (see playerArea) instead of the
    // default full-picture square, so it doesn't float or snag on slopes.
    const o = add([pic, ...common, playerArea(id), body(), "player"]);
    o.baseName = id;                       // the standing picture
    o.jumpName = id.replace("_front", "_jump"); // the mid-air picture
    return o;
  }
  if (COIN_IDS.has(id))   return add([pic, ...common, area(), "coin"]);   // collect these
  if (FLAG_IDS.has(id))   return add([pic, ...common, area(), "flag"]);   // the goal
  // An invisible reset zone. It has no picture, so instead of a sprite we use a
  // see-through rect (opacity 0) for its size. The area() hitbox and "hazard"
  // tag still work, so touching it sends you back to the start.
  if (RESET_IDS.has(id)) {
    return add([rect(w, h), ...common, area(), opacity(0), "hazard"]);
  }
  if (HAZARD_IDS.has(id)) return add([pic, ...common, area(), "hazard"]); // touching = respawn
  if (isSolidId(id)) {
    // Stand on it. If it's a slope, give it a triangle hitbox that matches the
    // art — mirrored to match a flipped picture; otherwise a normal square
    // hitbox (area()) is exactly right.
    const pts = slopePoints(id);
    const hitbox = pts ? area({ shape: centeredSlopePoly(pts, w, h, flipX, flipY) }) : area();
    return add([pic, ...common, hitbox, body({ isStatic: true }), "solid"]);
  }

  // Anything else (bushes, signs, clouds…) is just decoration behind the action.
  return add([pic, ...common, z(-1)]);
}

// Build a whole designed level and report how big it ended up (for the camera).
function buildDesignLevel(design) {
  // Find the edges of everything so we can shift it to a tidy top-left start.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const t of design) {
    const info = window.ASSET_INFO[t.id] || { w: TILE_SIZE, h: TILE_SIZE };
    minX = Math.min(minX, t.x);
    minY = Math.min(minY, t.y);
    maxX = Math.max(maxX, t.x + info.w);
    maxY = Math.max(maxY, t.y + info.h);
  }

  // Shift everything so the level starts near (0,0), with a one-tile margin.
  const offX = minX - TILE_SIZE;
  const offY = minY - TILE_SIZE;
  for (const t of design) {
    // t.angle is how far the editor rotated this tile; t.flipX/t.flipY mirror it.
    // (All default to 0/false for older saves that never turned or flipped tiles.)
    if (window.ASSET_INFO[t.id]) {
      addDesignTile(t.id, t.x - offX, t.y - offY, t.angle || 0, t.flipX || false, t.flipY || false);
    }
  }

  return { width: (maxX - offX) + TILE_SIZE, height: (maxY - offY) + TILE_SIZE };
}


// ----------------------------------------------------------------------------
//  THE GAME  —  everything below lives in a "scene" called "game".
//  Putting it in a scene means pressing R can restart it cleanly (see bottom).
// ----------------------------------------------------------------------------
scene("game", () => {


// ----------------------------------------------------------------------------
//  THE LEVEL  —  drawn as a picture made of letters
// ----------------------------------------------------------------------------
//  Each character below is one tile (70x70). The KEY just under the map says
//  what each letter means. Reading top-to-bottom is high-up to low-down.
//
//    space = empty sky        @ = where the player starts
//    o     = a coin to grab   = = grassy ground / platform
//    #     = dirt (under the ground, just for looks)
//    b     = a box you can stand on
//    F     = the goal flag (just decoration — you win by getting all coins)
//
//  Notice the GAPS in the bottom row: those are pits. Fall in and you respawn!
const LEVEL_MAP = [
  "                                        ",
  "                                        ",
  "                                        ",
  "              o o o                     ",
  "             =======                    ",
  "       o o                          o   ",
  "      =====            o o o       ===  ",
  "                      =======           ",
  "                                    b    ",
  "  @       o o o                    === F ",
  "====   ========     ====    ===   ====== ",
  "####   ########     ####    ###   ###### ",
];

// How big is the whole level, in pixels? (the camera uses this). We fill these
// in below — they're different for the built-in map vs. a designed level.
let LEVEL_WIDTH, LEVEL_HEIGHT;

if (DESIGN) {
  // ---- Build the level YOU made in the level designer ----
  const size = buildDesignLevel(DESIGN);
  LEVEL_WIDTH = size.width;
  LEVEL_HEIGHT = size.height;
} else {
  // ---- Build the built-in level from the letter-map above ----
  addLevel(LEVEL_MAP, {
    tileWidth: TILE_SIZE,
    tileHeight: TILE_SIZE,

    // For each letter, list the "components" (building blocks) that tile gets.
    tiles: {
      // The player. body() makes gravity affect it. The "player" tag lets us
      // find it again later and detect when it touches coins.
      "@": () => [
        sprite("player"),
        area(),                 // give it a hitbox so it can collide
        body(),                 // make it fall and be able to jump
        anchor("bot"),          // measure its position from its feet
        "player",
      ],

      // Solid ground / floating platforms. isStatic = never moves or falls.
      "=": () => [ sprite("grass"), area(), body({ isStatic: true }), "solid" ],

      // Dirt — also solid, just for a nice "underground" look.
      "#": () => [ sprite("dirt"), area(), body({ isStatic: true }), "solid" ],

      // A crate you can climb on top of.
      "b": () => [ sprite("box"), area(), body({ isStatic: true }), "solid" ],

      // A coin. No body() = it doesn't block you, you pass through and grab it.
      "o": () => [ sprite("coin"), area(), "coin" ],

      // The goal flag — just for show. The real goal is "collect every coin".
      "F": () => [ sprite("flag"), area(), "flag" ],
    },
  });

  LEVEL_WIDTH  = LEVEL_MAP[0].length * TILE_SIZE;
  LEVEL_HEIGHT = LEVEL_MAP.length    * TILE_SIZE;

  // A few clouds — pure decoration to make the sky look alive.
  add([ sprite("cloud"), pos(300, 90) ]);
  add([ sprite("cloud"), pos(1100, 60) ]);
  add([ sprite("cloud"), pos(1900, 120) ]);
}


// ----------------------------------------------------------------------------
//  GRAB THE PLAYER  —  so we can control it below
// ----------------------------------------------------------------------------
// recursive:true is important — the built-in level keeps its tiles as children
// of a "level" object, so a plain get() wouldn't find the player inside it.
let player = get("player", { recursive: true })[0];

// If a designed level forgot to place a player, drop a default one in so the
// game still works instead of crashing.
if (!player) {
  player = add([ sprite("player"), pos(TILE_SIZE * 2, 0), area(), body(), anchor("bot"), "player" ]);
}

// Remember which picture to show on the ground vs. in the air.
if (!player.baseName) { player.baseName = "player"; player.jumpName = "player-jump"; }

// Remember where the player started, so we can put them back if they fall.
const START_POS = player.pos.clone();


// ----------------------------------------------------------------------------
//  CONTROLS  —  arrow keys OR WASD to move, Space/Up/W to jump
// ----------------------------------------------------------------------------
// Run left.  (onKeyDown runs every frame the key is held down.)
onKeyDown("left",  () => { player.move(-PLAYER_SPEED, 0); player.flipX = true;  });
onKeyDown("a",     () => { player.move(-PLAYER_SPEED, 0); player.flipX = true;  });
// Run right.
onKeyDown("right", () => { player.move(PLAYER_SPEED, 0);  player.flipX = false; });
onKeyDown("d",     () => { player.move(PLAYER_SPEED, 0);  player.flipX = false; });

// Jump — but only if we're standing on the ground (no double-jumping... yet!).
function tryJump() {
  if (player.isGrounded()) {
    player.jump(JUMP_FORCE);
    playSfx("jump");           // little "boing" when we leave the ground
  }
}
onKeyPress("space", tryJump);  // onKeyPress runs ONCE each time you press.
onKeyPress("up",    tryJump);
onKeyPress("w",     tryJump);


// ----------------------------------------------------------------------------
//  ANIMATION  —  swap to the "jump" picture while in the air
// ----------------------------------------------------------------------------
player.onUpdate(() => {
  if (player.isGrounded()) {
    player.use(sprite(player.baseName));  // feet on the ground -> normal picture
  } else {
    player.use(sprite(player.jumpName));  // in the air -> jumping picture
  }
});


// ----------------------------------------------------------------------------
//  THE SCORE  —  count coins and show them in the top-left corner
// ----------------------------------------------------------------------------
let score = 0;
const totalCoins = get("coin", { recursive: true }).length; // coins at the start

// fixed() pins this text to the screen so it doesn't scroll with the world.
const scoreLabel = add([
  text("Coins: 0 / " + totalCoins, { size: 36 }),
  pos(24, 24),
  fixed(),
  z(100),                 // draw on top of everything
  color(255, 255, 255),
  outline(4, rgb(0, 0, 0)),
]);

// When the player touches a coin: remove the coin and add to the score.
player.onCollide("coin", (coin) => {
  destroy(coin);          // make the coin disappear
  playSfx("coin");        // cheerful "ding!"
  score += 1;
  scoreLabel.text = "Coins: " + score + " / " + totalCoins;

  // Did we get them all? Then you win!
  if (score === totalCoins) {
    showWin();
  }
});

// In a designed level that has NO coins, reaching the flag wins instead.
if (totalCoins === 0) {
  player.onCollide("flag", () => showWin());
}

// Touching a hazard (spikes, lava, an enemy) sends you back to the start.
player.onCollide("hazard", () => {
  playSfx("hurt");        // "ow!" before we get sent back
  player.pos = START_POS.clone();
  player.vel = vec2(0, 0);
});


// ----------------------------------------------------------------------------
//  FALLING OFF  —  if the player drops below the level, send them back
// ----------------------------------------------------------------------------
const FALL_LIMIT = LEVEL_HEIGHT + 200; // a bit below the lowest tile

player.onUpdate(() => {
  if (player.pos.y > FALL_LIMIT) {
    player.pos = START_POS.clone(); // teleport back to the start
    player.vel = vec2(0, 0);        // stop all movement so we don't keep falling
  }
});


// ----------------------------------------------------------------------------
//  THE CAMERA  —  smooth side-scroll (follows the player)
// ----------------------------------------------------------------------------
//  The camera keeps the player in the middle of the screen and scrolls along
//  with them, left/right and up/down. We "clamp" it so it never shows past the
//  edges of the level. If the level is smaller than the screen in a direction,
//  we just centre it so you don't see empty space scrolling in.
player.onUpdate(() => {
  const halfW = width() / 2;
  const halfH = height() / 2;

  const camX = LEVEL_WIDTH  > width()
    ? clamp(player.pos.x, halfW, LEVEL_WIDTH  - halfW)
    : LEVEL_WIDTH  / 2;

  const camY = LEVEL_HEIGHT > height()
    ? clamp(player.pos.y, halfH, LEVEL_HEIGHT - halfH)
    : LEVEL_HEIGHT / 2;

  setCamPos(camX, camY);
});


// ----------------------------------------------------------------------------
//  THE "YOU WIN!" SCREEN
// ----------------------------------------------------------------------------
function showWin() {
  // A dark see-through panel across the whole screen.
  add([
    rect(width(), height()),
    pos(0, 0),
    fixed(),
    z(200),
    color(0, 0, 0),
    opacity(0.55),
  ]);

  // The big happy message.
  add([
    text("YOU WIN!", { size: 90 }),
    pos(width() / 2, height() / 2 - 40),
    anchor("center"),
    fixed(),
    z(201),
    color(255, 235, 90),
    outline(6, rgb(0, 0, 0)),
  ]);

  add([
    text("Press R to play again", { size: 34 }),
    pos(width() / 2, height() / 2 + 60),
    anchor("center"),
    fixed(),
    z(201),
    color(255, 255, 255),
    outline(4, rgb(0, 0, 0)),
  ]);
}

// Press R at any time to restart the whole game from the beginning.
onKeyPress("r", () => {
  go("game");
});

// When playing a designed level, show a hint and let you pop back to the editor.
if (DESIGN) {
  add([
    text("Press E to edit  •  R to restart", { size: 22 }),
    pos(width() - 24, 24),
    anchor("topright"),
    fixed(),
    z(100),
    color(255, 255, 255),
    outline(4, rgb(0, 0, 0)),
  ]);
  onKeyPress("e", () => { window.location.href = "editor.html"; });
}


}); // <-- end of scene("game")

// Actually start the game by jumping into the "game" scene.
go("game");
