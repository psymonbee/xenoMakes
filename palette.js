// ============================================================================
//  PALETTE  —  the shared list of sprites the editor AND the game both use
// ============================================================================
//  Both editor.js and main.js load this file FIRST. Keeping the list in one
//  place means the level designer and the game can never disagree about which
//  sprites exist or where they live on disk.
//
//  Want a new sprite available to drag in the editor (and playable in the
//  game)? Add its name to the right category below. Look names up in ASSETS.md.
// ============================================================================

window.PALETTE = {
  // Each category is one tab in the editor's drawer.
  categories: [
    {
      name: "Tiles",
      folder: "tiles",
      items: [
        "grassMid", "grassLeft", "grassRight", "grassCenter",
        "dirtMid", "dirtCenter",
        "sandMid", "sandCenter",
        "snowMid", "snowCenter",
        "stoneMid", "stoneCenter",
        "castleMid", "castleCenter",
        "box", "boxCoin", "boxItem", "brickWall", "bridge",
        "ladder_mid", "door_closedTop", "door_closedMid", "fence", "sign",
        "liquidWater", "liquidWaterTop_mid", "liquidLava", "spikes",
      ],
    },
    {
      name: "Items",
      folder: "items",
      items: [
        "coinGold", "coinSilver", "coinBronze",
        "gemBlue", "gemGreen", "gemRed", "gemYellow", "star",
        "keyBlue", "keyGreen", "keyRed", "keyYellow",
        "flagGreen", "springboardUp",
        "bush", "cactus", "mushroomRed", "mushroomBrown", "rock", "plant", "cloud1",
      ],
    },
    {
      name: "Foes",
      folder: "enemies",
      items: ["slimeWalk1", "snailWalk1", "flyFly1", "fishSwim1", "blockerBody"],
    },
    {
      name: "Players",
      folder: "characters",
      isChar: true,   // characters are 66x92, not 70x70 like everything else
      items: ["p1_front", "p2_front", "p3_front"],
    },
  ],
};

// Build a quick lookup table:  ASSET_INFO[name] = { folder, w, h }
window.ASSET_INFO = {};
for (const cat of window.PALETTE.categories) {
  for (const name of cat.items) {
    window.ASSET_INFO[name] = {
      folder: cat.folder,
      w: cat.isChar ? 66 : 70,
      h: cat.isChar ? 92 : 70,
    };
  }
}

// Turn a sprite name into its file path, e.g. "grassMid" -> "assets/tiles/grassMid.png"
window.spritePath = (name) => `assets/${window.ASSET_INFO[name].folder}/${name}.png`;
