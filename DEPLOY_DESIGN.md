# Going online — storage, accounts & privacy — a design doc

*Status: ✅ BUILT (with the recommended choices). This doc is the design; the code
now matches it — see `server.js`, `levels.js`, `home.js`, `Dockerfile`,
`privacy.html`. The decisions made: in-dev = truly private, admin = a special
account (created with `ADMIN_SECRET`), invite-code signup (`INVITE_CODE`).*

This is about taking the game from "lives only in your own browser" to "lives on a
little server everyone shares" — so levels are saved for real, people can sign up,
and there's a shared space plus your own private workshop. It also covers the
grown-up bits: a real (not pretend) owner lock, and being responsible about
putting a **kids'** game online.

---

## 1. Why bother? (the itch)

Right now **everything is saved in your own browser** (`localStorage`, via
[levels.js](levels.js)). That means:

- Zac's levels live only on Zac's computer. Nobody else ever sees them.
- The "owner word" (`OWNER_WORD = "coinquest"` in [home.js](home.js)) is written
  right there in the shipped code, so it's not really a secret — the code even
  says so itself.

We want: levels saved **on a server**, a **shared space** anyone can browse, a
**private workshop** for your own in-progress levels, and a **real owner lock**.

---

## 2. The one big realisation

Three things we want — moving the owner password to an env var, adding accounts,
and a filter that hides other people's unfinished levels — **all need the same one
thing: a server.** This is not a coincidence:

- **Env vars live on a server.** With only static files, there's nowhere for a
  secret to live — so you literally can't hide the password without one.
- **A login the browser can't fake** has to be checked somewhere the browser
  can't see — the server.
- **A filter that truly hides other people's in-dev levels** has to happen
  *before the data reaches the browser* — in the server's database query.

So this isn't three projects. It's **one small server**, and then all three fall
out of it for free. The **front end barely changes** — it stays plain scripts,
no build step (per [CLAUDE.md](CLAUDE.md)).

---

## 3. The shape of it

```
Browser (home / editor / game)
   │   fetch()   ↕   /api/...   (cookie says who you are)
   ▼
Tiny Node server  ──►  SQLite file  ──►  Coolify persistent volume
(also serves the static files we already have)
```

- **SQLite** = one file on disk. No separate database to run. Perfect for this.
- **One shared file** = everyone sees the same shared space. That's the goal, not
  a thing to engineer.
- The Node server does just two jobs: **serve our existing files**, and **answer
  a few `/api/...` calls**.

---

## 4. The data model (two little tables)

**`users`**

| column        | what it is                                  |
|---------------|---------------------------------------------|
| id            | a unique id                                 |
| username      | their chosen **nickname** (not a real name) |
| password_hash | the password, **hashed** (never plain text) |
| is_admin      | true for Zac/Simon, false for everyone else |
| created       | when they signed up                         |

**`levels`** — our existing level fields, plus:

| new column | what it is                                                    |
|------------|---------------------------------------------------------------|
| owner      | which user made it                                            |
| status     | `in-dev` (private workshop) or `published` (in shared space)  |

The existing `section: "main"` stays, but becomes **admin-only** (official
levels). `difficulty` and `order` carry on as they are.

---

## 5. The screens (mostly what we already have)

1. **My Levels** *(logged in)* — *your* levels, both in-dev and published. Your
   private workshop. This is the only place your in-dev levels appear.
2. **Shared space** — everyone's `published` levels. This is what a logged-out
   visitor sees.
3. **Main levels** — the official ones; only an admin can mark a level as Main.

"**Publish**" is just a button that flips a level's `status` from `in-dev` to
`published`. "**Unpublish**" flips it back.

---

## 6. How logging in works (kept deliberately simple)

- **Sign up** → pick a nickname + password (+ an **invite code**, see §9) → the
  server hashes the password, saves the user, and sets a **session cookie**.
- **Log in** → same check → session cookie.
- That cookie rides along on every `/api/...` call, so the server knows who "me"
  is and can filter levels accordingly.

**The owner lock, done properly.** `OWNER_WORD` goes away. Instead there's an
**admin account** (a user with `is_admin = true`). The first admin is created
using a secret read from a **Coolify env var** — so the secret never ships inside
the JavaScript the way `"coinquest"` does today. Logging in as admin is what
unlocks the Main-level powers.

---

## 7. The honest security model

What's actually protected, and what isn't — so we go in clear-eyed.

**Genuinely solid (because the server enforces it):**

- *Owner powers.* The check moves to the server; the secret lives in an env var.
  A real upgrade over today's in-the-code word.
- *In-dev privacy.* The server runs `WHERE status = 'published' OR owner = me`, so
  other people's in-dev levels are **never sent to your browser**. You can't
  "force" your way to data you were never handed. Better than a browser-side
  filter, for free.

**Deliberately lightweight (and that's the right call for a kids' game):**

- Accounts are nickname + hashed password + session cookie. **No** email
  verification, **no** password reset, **no** 2FA, **no** rate limiting (unless we
  add it later). This is *not* bank-grade, and doesn't need to be.

**The line we consciously will NOT cross** (to keep it simple): email flows,
password resets, roles/permissions matrices, audit logs. Skip all of it.

---

## 8. "Anyone could find this and sign up" — is that OK?

Functionally, yes — that's the design. The thing that makes us pause is that the
users are **children**. That's the one real flag, and it points to a handful of
common-sense moves. *(Not legal advice — Simon's UK-based, so the relevant frames
are UK GDPR and the ICO **Children's Code**; COPPA is the US equivalent. None are
scary for a hobby project; they all say the same thing.)*

**The golden rule: collect as little personal data as possible.** Data you never
collect can't leak.

---

## 9. Privacy & safety plan (the de-risking moves, best first)

1. **No real identities.** No email, no real names. The signup box literally says
   *"Pick a nickname — don't use your real name."* This removes most of the risk
   in one move.
2. **Invite-code signup** (code kept in a Coolify env var). Turns "anyone on the
   internet" into "anyone Zac shares the code with." One extra text box; changeable
   anytime. **Strongly recommended** over fully-open.
3. **Don't get indexed.** `robots.txt` + a noindex header so Google doesn't list
   it. With #2, it's effectively a private clubhouse.
4. **A one-page, plain-English privacy notice** — readable *by a kid*: what we
   keep (nickname, password, your levels), why, where it lives (our own server —
   not sold, not shared), no ads, no tracking, how to delete it.
5. **A "delete my account + my levels" button.** Trivial with SQLite; good
   manners and the GDPR right-to-erasure.
6. **Tiny house rules.** "Be kind. Never put your real name, address, or phone
   number in a username or level name."

**Recommendation:** invite-code signup + nicknames-not-names + noindex + a
one-page privacy notice + a delete button. Private-ish, collects almost nothing,
short honest docs. The only version to avoid is **fully-open stranger signups** —
not because it breaks, but because that's the combination that turns a fun project
into a responsibility nobody signed up for.

---

## 10. Deploying on Coolify

- A small **Dockerfile**: a Node base image, copy the files in, `CMD node
  server.js`.
- A **persistent volume** mounted where the `.sqlite` file lives (e.g. `/data`).
  **This is the bit people forget** — without it, every redeploy wipes the
  database. With it, levels and accounts live forever.
- **Env vars** in Coolify: the admin secret (§6), the invite code (§9), and a
  session-cookie secret. None of these ever appear in the shipped code.
- Push to GitHub, point Coolify at the repo, done.

---

## 11. Migrating the levels already in `localStorage`

Existing levels live in browsers today and have no `owner`. Plan:

- New levels are server-side from day one.
- On first run, offer a one-time **"upload my old levels"** button that pushes a
  browser's existing `localStorage` levels to the server under the logged-in user
  (or as ownerless "community/legacy" levels). Nothing is thrown away.
- `levels.js` keeps the same public shape (`Levels.all()`, `.get()`, `.put()`…)
  so the editor/game/home barely change — see §12.

---

## 12. The honest costs

- **A server now exists.** This breaks the "no build step" rule — but only on the
  server side; sharing data *requires* a server, there's no way around it. The
  front end stays plain scripts.
- **Sync → async.** `Levels.all()`/`.get()` are synchronous today; a server is
  asynchronous. The tidy trick: fetch everything **once** when a page loads
  (`await Levels.load()` at the top), keep it in memory, and leave every existing
  call site synchronous. Minimal disruption.
- **A few new files** (`server.js`, `Dockerfile`, privacy page) and a few new
  ideas (accounts, sessions). All in the beginner-friendly, well-commented spirit.

---

## 13. Suggested build order (if we say yes)

1. **The server + shared storage.** Node + SQLite, `/api/levels`, `Levels.load()`.
   Everyone shares one library. *(No accounts yet — proves the plumbing.)*
2. **Accounts + the owner lock.** `users` table, signup/login, session cookie,
   admin account from an env var. `OWNER_WORD` retires.
3. **In-dev / published filter.** `owner` + `status` columns, My Levels vs Shared
   space, the Publish button, server-side filtering.
4. **The responsible-online bits.** Invite code, noindex, privacy page, delete
   button, house rules.
5. **Deploy on Coolify.** Dockerfile, persistent volume, env vars.

---

*Open questions for Zac & Simon:*
- **In-dev = truly private** (only you can see it), or just **visible-but-flagged**
  as WIP? *(Recommend: truly private — barely more work, matches what you want.)*
- **Admin = a special user account**, or a single **env-var password**?
  *(Recommend: special account — admin is just "a user with a flag", no extra
  concept, and Zac logs in like everyone else.)*
- **Invite-code signup**, or fully open? *(Recommend: invite code.)*
