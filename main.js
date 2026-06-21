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
  // Also load the matching "jump" pose for whichever player character is used.
  for (const p of ["p1", "p2", "p3"]) {
    if (ids.has(p + "_front")) loadSprite(p + "_jump", `assets/characters/${p}_jump.png`);
  }
}


// ----------------------------------------------------------------------------
//  WHAT EACH DESIGNED SPRITE DOES  —  turn a sprite name into game behaviour
// ----------------------------------------------------------------------------
//  When we build a designed level, each sprite needs to know how to behave:
//  is it solid ground? a coin to collect? a dangerous hazard? the player?
const COIN_IDS   = new Set(["coinGold", "coinSilver", "coinBronze", "gemBlue", "gemGreen", "gemRed", "gemYellow", "star"]);
const HAZARD_IDS = new Set(["spikes", "liquidLava", "liquidLavaTop_mid", "slimeWalk1", "snailWalk1", "flyFly1", "fishSwim1", "blockerBody"]);
const PLAYER_IDS = new Set(["p1_front", "p2_front", "p3_front"]);
const FLAG_IDS   = new Set(["flagGreen"]);
// RESET zones: INVISIBLE blocks that send the player back to the start when
// touched. In the GAME you can't see them at all. In the level designer they
// show up as a red outline so you know where you put them. The list lives in
// palette.js (window.RESET_IDS) so the editor and game can never disagree.
const RESET_IDS  = window.RESET_IDS;
const SOLID_IDS  = new Set(["box", "boxCoin", "boxItem", "brickWall", "bridge"]);
const SOLID_FAMILIES = ["grass", "dirt", "sand", "snow", "stone", "castle"]; // ground blocks

// Solid = you can stand on it. True for ground families and a few props.
function isSolidId(id) {
  return SOLID_IDS.has(id) || SOLID_FAMILIES.some((fam) => id.startsWith(fam));
}

// Add ONE designed sprite to the world with the right behaviour for what it is.
function addDesignTile(id, x, y) {
  // The shared bits every designed sprite gets: a picture, a position, and a
  // hitbox so collisions work. anchor("topleft") matches how the editor saved it.
  const base = [sprite(id), pos(x, y), anchor("topleft"), area()];

  if (PLAYER_IDS.has(id)) {
    const o = add([...base, body(), "player"]);
    o.baseName = id;                       // the standing picture
    o.jumpName = id.replace("_front", "_jump"); // the mid-air picture
    return o;
  }
  if (COIN_IDS.has(id))   return add([...base, "coin"]);   // collect these
  if (FLAG_IDS.has(id))   return add([...base, "flag"]);   // the goal
  // An invisible reset zone. It has no picture, so instead of a sprite we use a
  // see-through rect (opacity 0) for its size. The area() hitbox and "hazard"
  // tag still work, so touching it sends you back to the start.
  if (RESET_IDS.has(id)) {
    const a = window.ASSET_INFO[id] || { w: TILE_SIZE, h: TILE_SIZE };
    return add([rect(a.w, a.h), pos(x, y), anchor("topleft"), area(), opacity(0), "hazard"]);
  }
  if (HAZARD_IDS.has(id)) return add([...base, "hazard"]); // touching = respawn
  if (isSolidId(id))      return add([...base, body({ isStatic: true }), "solid"]); // stand on it

  // Anything else (bushes, signs, clouds…) is just decoration behind the action.
  return add([sprite(id), pos(x, y), anchor("topleft"), z(-1)]);
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
    if (window.ASSET_INFO[t.id]) addDesignTile(t.id, t.x - offX, t.y - offY);
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
