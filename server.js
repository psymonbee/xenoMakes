// ============================================================================
//  SERVER  —  the little brain that saves levels for EVERYONE (not just you)
// ============================================================================
//  Until now, every level lived in your own browser (localStorage). That meant
//  nobody else could ever see your levels. This file changes that: it's a tiny
//  web server that does two jobs:
//
//    1. Hands out all our normal files (index.html, main.js, the art, …) —
//       exactly like the old "serve" did.
//    2. Answers a few "/api/..." requests so the game can SAVE and LOAD levels
//       (and sign people in) using one shared SQLite database file.
//
//  SQLite is just a single file on disk. One file = one shared library that
//  everyone sees. When we deploy on Coolify we point a "persistent volume" at
//  that file so it survives restarts (see DEPLOY_DESIGN.md).
//
//  Security here is DELIBERATELY simple (it's a kids' game, not a bank). See
//  DEPLOY_DESIGN.md §7 for exactly what is and isn't protected.
// ============================================================================

const express  = require("express");
const Database = require("better-sqlite3");
const bcrypt   = require("bcryptjs");
const crypto   = require("crypto");
const fs       = require("fs");
const path     = require("path");

// ----------------------------------------------------------------------------
//  SETTINGS  —  all read from "environment variables" so secrets are NOT in the
//  code (unlike the old owner word). On Coolify you set these in the dashboard.
// ----------------------------------------------------------------------------
const PORT        = process.env.PORT || 8080;
// Where the database file lives. On Coolify, mount a persistent volume here.
const DATA_DIR    = process.env.DATA_DIR || path.join(__dirname, "data");
const DB_PATH     = path.join(DATA_DIR, "coinquest.sqlite");
// The secret word that, when given at sign-up, makes that account an ADMIN
// (can make ⭐ Main levels). Empty = nobody can become admin (set it on Coolify).
const ADMIN_SECRET = process.env.ADMIN_SECRET || "";
// The invite code people must type to sign up. Empty = anyone can sign up.
// Set this on Coolify to keep sign-ups to "people Zac shares the code with".
const INVITE_CODE  = process.env.INVITE_CODE || "";
// Set COOKIE_SECURE=1 in production (https) so the login cookie is https-only.
const COOKIE_SECURE = process.env.COOKIE_SECURE === "1";

// Make sure the data folder exists before SQLite tries to open a file inside it.
fs.mkdirSync(DATA_DIR, { recursive: true });


// ----------------------------------------------------------------------------
//  THE DATABASE  —  three little tables
// ----------------------------------------------------------------------------
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");        // safer + faster for our little site

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id        TEXT PRIMARY KEY,
    username  TEXT UNIQUE NOT NULL,
    pass_hash TEXT NOT NULL,
    is_admin  INTEGER NOT NULL DEFAULT 0,
    created   INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token   TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created INTEGER NOT NULL
  );

  -- Each level keeps a few columns we want to FILTER by (owner / status /
  -- section / updated), plus the whole level object as JSON in "data". That way
  -- the front end gets back exactly the same shape it has always used.
  CREATE TABLE IF NOT EXISTS levels (
    id      TEXT PRIMARY KEY,
    owner   TEXT,
    status  TEXT NOT NULL DEFAULT 'in-dev',   -- 'in-dev' (private) or 'published'
    section TEXT NOT NULL DEFAULT 'community', -- 'community' or 'main' (admin only)
    updated INTEGER NOT NULL DEFAULT 0,
    data    TEXT NOT NULL                      -- the full level object, as JSON
  );
`);


// ----------------------------------------------------------------------------
//  SMALL HELPERS
// ----------------------------------------------------------------------------
const now = () => Date.now();
const newId = (prefix) => prefix + "-" + crypto.randomBytes(9).toString("hex");

// Read the cookies on a request into a plain { name: value } object.
function readCookies(req) {
  const out = {};
  const raw = req.headers.cookie || "";
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

// Start a login session: remember a random token and send it back as a cookie.
function startSession(res, userId) {
  const token = newId("ses");
  db.prepare("INSERT INTO sessions (token, user_id, created) VALUES (?, ?, ?)")
    .run(token, userId, now());
  res.cookie("cq_session", token, {
    httpOnly: true,                       // JavaScript on the page can't read it
    sameSite: "lax",
    secure: COOKIE_SECURE,
    maxAge: 1000 * 60 * 60 * 24 * 365,    // a year
  });
}

// Who is making this request? Returns the user row, or null if logged out.
function currentUser(req) {
  const token = readCookies(req).cq_session;
  if (!token) return null;
  const ses = db.prepare("SELECT * FROM sessions WHERE token = ?").get(token);
  if (!ses) return null;
  return db.prepare("SELECT * FROM users WHERE id = ?").get(ses.user_id) || null;
}

// The safe, public view of a user (NEVER includes the password hash).
function publicUser(u) {
  return u ? { id: u.id, username: u.username, isAdmin: !!u.is_admin } : null;
}

// Turn a database row back into the level object the front end expects.
function rowToLevel(row) {
  const lvl = JSON.parse(row.data);
  // Trust the columns for the fields we manage server-side.
  lvl.id = row.id;
  lvl.owner = row.owner;
  lvl.status = row.status;
  lvl.section = row.section;
  lvl.updated = row.updated;
  return lvl;
}


// ----------------------------------------------------------------------------
//  THE APP
// ----------------------------------------------------------------------------
const app = express();
app.set("trust proxy", 1);               // we sit behind Coolify's proxy
app.use(express.json({ limit: "4mb" })); // levels can be biggish; allow room

// Tiny cookie setter (so we don't need an extra package). Mirrors res.cookie.
app.use((req, res, next) => {
  res.cookie = (name, value, opts = {}) => {
    let c = `${name}=${encodeURIComponent(value)}; Path=/`;
    if (opts.httpOnly) c += "; HttpOnly";
    if (opts.sameSite) c += `; SameSite=${opts.sameSite}`;
    if (opts.secure)   c += "; Secure";
    if (opts.maxAge)   c += `; Max-Age=${Math.floor(opts.maxAge / 1000)}`;
    res.append("Set-Cookie", c);
  };
  // Ask search engines NOT to list this kids' site (see DEPLOY_DESIGN.md §9).
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  next();
});


// ----------------------------------------------------------------------------
//  ACCOUNTS  —  sign up, log in, log out, delete
// ----------------------------------------------------------------------------

// Sign up. Needs the invite code (if one is set) and a free nickname.
app.post("/api/signup", (req, res) => {
  const { username, password, invite, adminSecret } = req.body || {};

  if (INVITE_CODE && invite !== INVITE_CODE) {
    return res.status(403).json({ error: "That invite code isn't right." });
  }
  const name = String(username || "").trim();
  if (name.length < 2 || name.length > 20) {
    return res.status(400).json({ error: "Pick a nickname 2–20 letters long." });
  }
  if (String(password || "").length < 4) {
    return res.status(400).json({ error: "Pick a password at least 4 letters long." });
  }
  const taken = db.prepare("SELECT 1 FROM users WHERE username = ?").get(name);
  if (taken) return res.status(409).json({ error: "That nickname is taken — try another." });

  // You only become an admin if you typed the matching ADMIN_SECRET.
  const isAdmin = ADMIN_SECRET && adminSecret === ADMIN_SECRET ? 1 : 0;
  const id = newId("usr");
  db.prepare("INSERT INTO users (id, username, pass_hash, is_admin, created) VALUES (?, ?, ?, ?, ?)")
    .run(id, name, bcrypt.hashSync(String(password), 10), isAdmin, now());

  startSession(res, id);
  res.json({ user: publicUser(db.prepare("SELECT * FROM users WHERE id = ?").get(id)) });
});

// Log in to an existing account.
app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  const u = db.prepare("SELECT * FROM users WHERE username = ?").get(String(username || "").trim());
  if (!u || !bcrypt.compareSync(String(password || ""), u.pass_hash)) {
    return res.status(401).json({ error: "Wrong nickname or password." });
  }
  startSession(res, u.id);
  res.json({ user: publicUser(u) });
});

// Log out (forget this session).
app.post("/api/logout", (req, res) => {
  const token = readCookies(req).cq_session;
  if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
  res.cookie("cq_session", "", { maxAge: 0 });
  res.json({ ok: true });
});

// Delete your account AND every level you made (the GDPR "right to be forgotten").
app.delete("/api/account", (req, res) => {
  const u = currentUser(req);
  if (!u) return res.status(401).json({ error: "You're not logged in." });
  db.prepare("DELETE FROM levels   WHERE owner   = ?").run(u.id);
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(u.id);
  db.prepare("DELETE FROM users    WHERE id      = ?").run(u.id);
  res.cookie("cq_session", "", { maxAge: 0 });
  res.json({ ok: true });
});


// ----------------------------------------------------------------------------
//  LEVELS  —  list, save, delete
// ----------------------------------------------------------------------------

// The whole "what should this person see?" question, answered in ONE place:
//   • everyone sees PUBLISHED levels and ⭐ MAIN levels
//   • you also see your OWN in-dev (private, work-in-progress) levels
//   • an admin sees everything (so they can tidy up)
// Because the SERVER does this filter, other people's in-dev levels are never
// even sent to your browser — you can't peek at unfinished work.
app.get("/api/state", (req, res) => {
  const u = currentUser(req);
  let rows;
  if (u && u.is_admin) {
    rows = db.prepare("SELECT * FROM levels").all();
  } else if (u) {
    rows = db.prepare(
      "SELECT * FROM levels WHERE status = 'published' OR section = 'main' OR owner = ?"
    ).all(u.id);
  } else {
    rows = db.prepare(
      "SELECT * FROM levels WHERE status = 'published' OR section = 'main'"
    ).all();
  }
  res.json({ user: publicUser(u), levels: rows.map(rowToLevel) });
});

// Save (create or overwrite) a level. You must be logged in, and you can only
// overwrite your OWN levels (unless you're an admin).
app.put("/api/levels/:id", (req, res) => {
  const u = currentUser(req);
  if (!u) return res.status(401).json({ error: "Log in to save levels." });

  const id = req.params.id;
  const incoming = (req.body && req.body.level) || {};
  const existing = db.prepare("SELECT * FROM levels WHERE id = ?").get(id);

  if (existing && existing.owner !== u.id && !u.is_admin) {
    return res.status(403).json({ error: "That's someone else's level." });
  }

  // The owner is set ONCE (when the level is first made) and never changes.
  const owner = existing ? existing.owner : u.id;

  // Status: 'published' or 'in-dev' (anything else becomes 'in-dev').
  let status = incoming.status === "published" ? "published" : "in-dev";

  // Section: only an admin may put a level in the ⭐ Main section.
  let section = incoming.section === "main" ? "main" : "community";
  if (section === "main" && !u.is_admin) section = existing ? existing.section : "community";

  const level = { ...incoming, id, owner, status, section, updated: now() };
  db.prepare(`
    INSERT INTO levels (id, owner, status, section, updated, data)
    VALUES (@id, @owner, @status, @section, @updated, @data)
    ON CONFLICT(id) DO UPDATE SET
      owner=@owner, status=@status, section=@section, updated=@updated, data=@data
  `).run({ id, owner, status, section, updated: level.updated, data: JSON.stringify(level) });

  res.json({ level });
});

// Delete a level (only your own, unless you're an admin).
app.delete("/api/levels/:id", (req, res) => {
  const u = currentUser(req);
  if (!u) return res.status(401).json({ error: "Log in to delete levels." });
  const existing = db.prepare("SELECT * FROM levels WHERE id = ?").get(req.params.id);
  if (!existing) return res.json({ ok: true });
  if (existing.owner !== u.id && !u.is_admin) {
    return res.status(403).json({ error: "That's someone else's level." });
  }
  db.prepare("DELETE FROM levels WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});


// ----------------------------------------------------------------------------
//  THE STATIC FILES  —  hand out our normal pages, art, scripts, …
// ----------------------------------------------------------------------------
//  We also support "clean" links like "/home" and "/editor" (no ".html"),
//  because the rest of the site links to pages that way.
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

app.use((req, res, next) => {
  // Only handle plain GETs that don't already point at a real file.
  if (req.method !== "GET" || req.path.includes(".")) return next();
  const htmlPath = path.join(__dirname, req.path + ".html");
  if (fs.existsSync(htmlPath)) return res.sendFile(htmlPath);
  next();
});

// Everything else (real files: .js, .png, .html, robots.txt, …).
app.use(express.static(__dirname, { index: false }));


// ----------------------------------------------------------------------------
//  GO!
// ----------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`🪙  Coin Quest is running at http://localhost:${PORT}`);
  console.log(`    database: ${DB_PATH}`);
  if (!INVITE_CODE)  console.log("    ⚠️  No INVITE_CODE set — anyone can sign up.");
  if (!ADMIN_SECRET) console.log("    ⚠️  No ADMIN_SECRET set — nobody can become an admin.");
});
