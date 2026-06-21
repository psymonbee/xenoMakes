// ============================================================================
//  setup.mjs  —  the friendly "get me ready to play" helper
// ============================================================================
//  Run it by typing:   npm run setup
//
//  It does three things, and tells you WHY for each one:
//    1. Checks that Node.js is installed (the program that runs our little
//       web server).
//    2. Explains where the game library (Kaplay) comes from.
//    3. Installs the one thing we DO need locally: "serve", a tiny web server.
//
//  This file is plain JavaScript that runs in Node (not in the browser), so it
//  can talk to your computer — check versions, run other commands, etc.
// ============================================================================

import { spawnSync } from "node:child_process";

// A couple of tiny helpers so the messages look tidy.
const line = (s = "") => console.log(s);
const rule = () => line("──────────────────────────────────────────────────");

rule();
line("👾  xenoMakes — setup helper");
rule();
line();
line("This game is made on purpose to be TINY:");
line("  • The game code is just plain JavaScript (main.js + editor.js).");
line("  • The game library, Kaplay, is loaded straight from the internet");
line("    (a 'CDN') by index.html — so there's nothing to install for that.");
line("  • The ONLY thing we install on this computer is a tiny web server");
line("    called 'serve', which hands the game files to your browser.");
line("    (Browsers refuse to load the picture files from a plain file path,");
line("     so we need a little server to serve them. That's all it does.)");
line();

// --- Step 1: check Node.js -------------------------------------------------
rule();
line("STEP 1 — Check Node.js");
rule();
// process.version is something like "v22.22.3". Node is already running this
// script, so if you can see this message at all, Node is installed!
const nodeVersion = process.version;
const major = Number(nodeVersion.replace("v", "").split(".")[0]);
line(`Node.js is installed:  ${nodeVersion}`);
if (major < 18) {
  line();
  line("⚠️  That's a bit old. Please update Node.js to version 18 or newer:");
  line("    https://nodejs.org   (download the 'LTS' version)");
  line();
  process.exit(1);
}
line("That's new enough. 👍");
line();

// --- Step 2: install the local web server ----------------------------------
rule();
line("STEP 2 — Install the local web server ('serve')");
rule();
line("Now we run 'npm install'. npm is Node's package manager — it reads");
line("package.json, sees we want 'serve', downloads it into a 'node_modules'");
line("folder, and we never have to think about it again.");
line();
line("Running:  npm install");
line();

// spawnSync runs another command and waits for it to finish. stdio:"inherit"
// means we SEE npm's own output live, so you can watch it download. shell:true
// helps Windows find the npm command.
const result = spawnSync("npm install", { stdio: "inherit", shell: true });

if (result.status !== 0) {
  line();
  line("❌  Hmm, 'npm install' didn't finish cleanly. Scroll up to read why.");
  line("    Often it's just no internet — try again when you're connected.");
  process.exit(1);
}

// --- All done --------------------------------------------------------------
line();
rule();
line("✅  All set! You're ready to go.");
rule();
line();
line("To PLAY the game, type:");
line("    npm start");
line();
line("Then open this address in your web browser:");
line("    http://localhost:8080");
line();
line("To build your own levels, open instead:");
line("    http://localhost:8080/editor.html");
line();
line("Stop the server any time by pressing  Ctrl + C  in this window.");
line();
