# GITSORT log

This file is written by the **`/gitsort`** helper (see `.claude/skills/gitsort/`).
Every time Zac syncs the game with GitHub, a short note lands here so **Simon** can
see what happened — especially when a merge conflict was found and *not* merged.

- ✅ entries = synced fine.
- ⚠️ entries = something stopped safely and may need Simon. Zac's work is always
  saved first, so nothing is ever lost — these just mean "two people changed the
  same lines, please untangle".

Newest entries are at the top.

---

## 2026-06-22 20:01 — ✅ Big integration synced to main
- Untangled the two diverged `main`s safely (no guessing, nothing lost):
  - Backed up the old local `main` to branch `backup/local-main-pre-sync-2026-06-22-1947`
    (pushed to GitHub) — it holds Simon's never-pushed `f15788c` "interactive springs,
    ? coin blocks, levers, buttons, doors" exactly as it was.
  - Built a fresh integration on top of GitHub's `main` (Zac's `d25dc12`: lower jump,
    owner login, Main/Community sections, difficulty badges), then:
    • folded in the editor branch (click-to-place + the foe-path-selection fix),
    • re-targeted the interaction set to the Standard (new) pack as a growing library
      (palette.js INTERACTIONS table + window.COMPANION; richer engine in main.js),
    • dropped Zac's simpler spring in favour of the shared one (his other work kept).
  - Fast-forwarded `main` on GitHub to the result (a1b74d3 → 217336e). Verified in a
    local browser: every interactive tile builds with correct art/coin; no JS errors.
    (Live bounce/door feel still wants a real play-test.)
- Tidied LOCAL branches (merged editor + temp integration branch deleted). The REMOTE
  feature branch `claude/click-place-paint-editor-yfaddd` was left in place pending an OK.
- Ropes kept: `backup/local-main-pre-sync-2026-06-22-1947`, `backup/before-sync-2026-06-22-1021`.

## 2026-06-22 — ✅ Synced fine (sent Zac's work up)
- Saved Zac's work: 5 files committed (d25dc12) — bouncy springs, lower jump (1000→750),
  owner login, Main/Community home-page sections + difficulty badges
- main was 1 ahead / 0 behind (Simon had nothing new on `main`)
- Pushed straight to GitHub — no merge needed, so no conflict risk
- Note: Simon has a separate WIP branch on GitHub (`claude/click-place-paint-editor-yfaddd`),
  not merged into main yet — left untouched

## 2026-06-22 19:32 — ✅ Synced fine (feature branch)
- Working on branch `claude/click-place-paint-editor-yfaddd` (NOT main) on purpose —
  this is the editor click-to-place/foe-path branch, headed to main later via `/ship`.
- Saved Zac's work first: committed a foe-path fix (88848f5) — path mode was
  selecting the sky/background as a "foe" because picking ignored layers; now it
  only selects foes.
- Branch was 1 ahead / 0 behind its remote, so just pushed (777fe1c → 88848f5).
- No merge needed, no conflicts. `main` itself was left untouched.

---

## 2026-06-22 — ✅ Synced fine (caught up)
- Zac had nothing new to save (working tree clean)
- GitHub was 2 commits ahead; fast-forwarded `main` (9f5c0ac → 252b94f)
- Pulled in Simon's new `PROJECT_OVERVIEW.md` (no conflicts possible — Zac had no new commits)
- Pushed the log entry back up

## 2026-06-22 01:05 — ✅ Synced fine
- Saved Zac's work: 1 file committed (b3c9af4) — pinned the in-app preview to
  port 8080 (`.claude/launch.json`) so it shares one localStorage box with
  `npm start` (saved levels show up no matter which server is running)
- GitHub had nothing new (1 ahead, 0 behind), so no merge was needed
- Pushed everything to GitHub
- Note for Simon: run only ONE server on 8080 at a time. If the preview says
  "Port 8080 is in use", just stop the other server first.

## 2026-06-22 00:42 — ✅ Synced fine
- Saved Zac's work: 12 files committed (a9d3275) — new home page (home.html/
  home.js), multi-level saving (levels.js), editor + game updates, and the
  Classic→hidden / "Standard" rename
- GitHub had nothing new (1 ahead, 0 behind), so no merge was needed
- Pushed everything to GitHub

## 2026-06-21 23:13 — ✅ Already in sync
- Nothing to save (working tree was clean)
- Compared with GitHub: `0 0` — local `main` and `origin/main` already match
- Nothing to pull, nothing to push

<!-- gitsort adds new entries directly below this line -->

## 2026-06-21 23:04 — ✅ Synced fine
- Saved Zac's work: 6 files committed (b67727b)
- GitHub had no new changes (Zac was 1 ahead, 0 behind) — no merge needed
- Pushed everything to GitHub (f8dc090..b67727b)
- No backup rope needed (no merge happened)
