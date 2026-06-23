// ============================================================================
//  PACK MANIFEST  —  "Candy" (Kenney "Platformer Art: Candy", CC0)
// ============================================================================
//  Started from scripts/gen-pack.mjs, then hand-tuned by /addpacks because the
//  candy filenames (cake, choco, candyBlue, lollipop…) don't match the
//  generator's English category words, so everything landed in "Props". Here
//  the tiles are sorted sensibly and given roles a kid would expect:
//    • cake* + choco* = the GROUND you stand on (solid)
//    • waffle* + cookie* = solid BLOCKS / platforms
//    • candy colours, cherry, heart, lollipops = ITEMS you collect (coins)
//    • canes, cream, cupcake, gummy worms, lollipop stands = decoration PROPS
//  There are NO hazards/enemies/flags/players in this pack — it's a sweet
//  decoration + terrain set. Mix it with another pack for danger.
//
//  It registers itself into window.EXTRA_PACKS; palette.js turns that into the
//  shared sprite registry the game and editor both use.
// ============================================================================
(window.EXTRA_PACKS = window.EXTRA_PACKS || []).push(
{
  "id": "candy",
  "label": "Candy",
  "prefix": "candy",
  "root": "assets/packs/candy",
  "sizes": {
    "tileW": 70,
    "tileH": 70,
    "charW": 70,
    "charH": 70
  },
  "categories": [
    {
      "name": "Ground",
      "folder": "tiles",
      "items": [
        "cake",
        "cakeCenter",
        "cakeCenter_rounded",
        "cakeCliffLeft",
        "cakeCliffLeftAlt",
        "cakeCliffRight",
        "cakeCliffRightAlt",
        "cakeHalf",
        "cakeHalfAlt",
        "cakeHalfAltLeft",
        "cakeHalfAltMid",
        "cakeHalfAltRight",
        "cakeHalfLeft",
        "cakeHalfMid",
        "cakeHalfRight",
        "cakeHillLeft",
        "cakeHillLeft2",
        "cakeHillRight",
        "cakeHillRight2",
        "cakeLedgeLeft",
        "cakeLedgeRight",
        "cakeLeft",
        "cakeMid",
        "cakeRight",
        "choco",
        "chocoCenter",
        "chocoCenter_rounded",
        "chocoCliffLeft",
        "chocoCliffLeftAlt",
        "chocoCliffRight",
        "chocoCliffRightAlt",
        "chocoHalf",
        "chocoHalfAlt",
        "chocoHalfAltLeft",
        "chocoHalfAltMid",
        "chocoHalfAltRight",
        "chocoHalfLeft",
        "chocoHalfMid",
        "chocoHalfRight",
        "chocoHillLeft",
        "chocoHillLeft2",
        "chocoHillRight",
        "chocoHillRight2",
        "chocoLedgeLeft",
        "chocoLedgeRight",
        "chocoLeft",
        "chocoMid",
        "chocoRight"
      ]
    },
    {
      "name": "Blocks",
      "folder": "tiles",
      "items": [
        "waffleChoco",
        "wafflePink",
        "waffleWhite",
        "cookieBrown",
        "cookieChoco",
        "cookiePink"
      ]
    },
    {
      "name": "Items",
      "folder": "tiles",
      "items": [
        "candyBlue",
        "candyGreen",
        "candyRed",
        "candyYellow",
        "cherry",
        "heart",
        "lollipopGreen",
        "lollipopRed",
        "lollipopWhiteGreen",
        "lollipopWhiteRed",
        "lollipopFruitGreen",
        "lollipopFruitRed",
        "lollipopFruitYellow"
      ]
    },
    {
      "name": "Props",
      "folder": "tiles",
      "items": [
        "cupCake",
        "creamChoco",
        "creamMocca",
        "creamPink",
        "creamVanilla",
        "canePink",
        "canePinkSmall",
        "canePinkTop",
        "canePinkTopAlt",
        "hillCaneChoco",
        "hillCaneChocoTop",
        "hillCaneGreen",
        "hillCaneGreenTop",
        "hillCanePink",
        "hillCanePinkTop",
        "hillCaneRed",
        "hillCaneRedTop",
        "lollipopBase",
        "lollipopBaseBeige",
        "lollipopBaseBrown",
        "lollipopBaseCake",
        "lollipopBasePink",
        "gummyWormGreenHead",
        "gummyWormGreenMid",
        "gummyWormGreenEnd",
        "gummyWormRedHead",
        "gummyWormRedMid",
        "gummyWormRedEnd"
      ]
    }
  ],
  "favourites": [
    "cakeMid",
    "cakeLeft",
    "cakeRight",
    "chocoMid",
    "waffleWhite",
    "cookiePink",
    "candyRed",
    "candyBlue",
    "candyYellow",
    "cherry",
    "heart",
    "lollipopRed",
    "canePink",
    "cupCake",
    "gummyWormGreenHead"
  ],
  "roles": {
    "player": [],
    "coin": [
      "candyBlue",
      "candyGreen",
      "candyRed",
      "candyYellow",
      "cherry",
      "heart",
      "lollipopGreen",
      "lollipopRed",
      "lollipopWhiteGreen",
      "lollipopWhiteRed",
      "lollipopFruitGreen",
      "lollipopFruitRed",
      "lollipopFruitYellow"
    ],
    "flag": [],
    "hazard": [],
    "reset": [],
    "solidPrefixes": [
      "cake",
      "choco",
      "waffle",
      "cookie"
    ],
    "solid": []
  },
  "sounds": {}
}
);
