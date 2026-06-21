---
name: gitsort
description: Safely sync this game project with GitHub for Zac (a 12-year-old). Saves his work, pulls Simon's changes, and pushes — taking the SAFE path on merge conflicts (it stops, preserves everyone's work, explains in plain words, and logs the details to GITSORT-LOG.md). Use whenever someone says "sync", "save my game to GitHub", "update from GitHub", "push my changes", "pull", or runs /gitsort.
---

# /gitsort — the safe git helper for Zac

This codebase is shared by exactly **two people**: Zac (12, learning JS) and Simon
(his dad). They both work on `main`. This skill is Zac's "one button" for git so he
never has to remember the commands — and, more importantly, so **his work can never
be lost**, even when he and Simon edited the same file.

## The golden rules (never break these)

1. **Never lose anyone's work.** Zac's stuff gets committed to history *before*
   anything else happens, so it's always recoverable.
2. **Never use a destructive command.** No `git reset --hard`, no `push --force`,
   no `git checkout --theirs/--ours`, no `git clean`, no deleting commits.
3. **When in doubt, STOP — don't merge.** A clean auto-merge is fine. A real
   *conflict* (both people changed the same lines) is **not** something to guess at.
   Roll back to safety, explain it, log it, and tell Zac to get Simon.
4. **Always leave a backup rope** before any merge, so even a "successful" auto-merge
   that secretly breaks the game can be rolled back.
5. **Always write to `GITSORT-LOG.md`** so Simon can see what happened later.
6. **Talk to Zac like a friendly 12-year-old.** Short sentences, no jargon dump.
   Save the technical details for the log file.

---

## The runbook (follow in order)

Run these with the Bash tool. Read the output of each step before doing the next —
the right path depends on what git says.

### Step 0 — Make sure we're somewhere sane
```bash
git rev-parse --is-inside-work-tree   # must be true
git remote get-url origin             # must exist (it's the GitHub link)
git branch --show-current             # should say: main
```
- If this isn't a git repo or there's no `origin`, stop and tell Zac to get Simon — don't try to fix it.
- If the branch isn't `main`, finish Step 1 (save work) first, then `git switch main`.

### Step 1 — Save Zac's work FIRST (this is the safety net)
```bash
git status --porcelain
```
- **If that prints nothing**, there's nothing to save — skip to Step 2.
- **If it prints files**, commit them. Ask Zac for a short "what did you change?"
  line, but if he doesn't give one, use a sensible default:
```bash
git add -A
git commit -m "Zac's changes — $(date '+%Y-%m-%d %H:%M')"
```
Committing (not stashing) is deliberate: committed work shows up in history and is
the easiest thing to rescue.

### Step 2 — Get the latest from GitHub (look, don't merge yet)
```bash
git fetch origin
git rev-list --left-right --count main...origin/main
```
That last command prints two numbers: **`<ahead>` `<behind>`**
- `ahead`  = commits Zac has that GitHub doesn't (his new work)
- `behind` = commits GitHub has that Zac doesn't (Simon's new work)

Pick the matching case below.

### Step 3 — Do the right thing for the situation

**Case A — `0  0` → already in sync.**
Nothing to do. Tell Zac everything's up to date. Log it (short). Done.

**Case B — `0  N` (behind only) → just catch up. Always safe.**
```bash
git merge --ff-only origin/main
```
This can never conflict (Zac has no new commits). Tell Zac he got the latest. Done.

**Case C — `N  0` (ahead only) → just send his work up.**
```bash
git push origin main
```
Tell Zac his work is now on GitHub. Done.

**Case D — `N  M` (BOTH have new work) → diverged. This needs care.**
First lay down the backup rope, THEN try to merge:
```bash
STAMP=$(date '+%Y-%m-%d-%H%M')
git branch "backup/before-sync-$STAMP"   # rollback rope — keep it
git merge origin/main
```
Look at the exit code / output:

- **Merge succeeded (no conflicts):** git combined the changes automatically. Push it:
  ```bash
  git push origin main
  ```
  Tell Zac it worked. ⚠️ **Keep the backup branch** and note it in the log —
  an automatic merge can be textually clean but still break the game, and the
  backup lets Simon roll back if so.

- **Merge had CONFLICTS:** this is the important safe-path case → go to Step 4.

### Step 4 — Conflict = STOP, roll back, explain, log
A conflict means Zac and Simon changed the **same lines** of the same file, and git
can't know which to keep. **Do not guess. Do not pick a side.** Take the safe path:

```bash
git merge --abort        # undo the half-finished merge — back to clean & safe
```
Now Zac's work is exactly as it was (committed, ahead of GitHub), nothing lost,
and the backup branch is still there.

Then:
1. Find out which files clashed — they were listed in the merge output (lines like
   `CONFLICT (content): Merge conflict in main.js`). Note every one.
2. **Tell Zac** in plain words, e.g.:
   > "I saved all your work safely — nothing is lost! 🎮 But you and your dad both
   > changed the same part of **main.js**, so I didn't want to risk mixing them up
   > wrong. Ask Simon to sort this one out — I've written him a note with the details."
3. **Write the details to `GITSORT-LOG.md`** (see format below).
4. **Do not push.** (It would be rejected anyway, and pushing isn't the point.)

---

## Writing to GITSORT-LOG.md

This file lives at the repo root and **is committed to git**, so Simon can read it
from any computer. Create it if it's missing. **Add new entries at the top** (newest
first), right under the title. Keep the title line and intro paragraph intact.

After you write a log entry, commit just the log so it travels:
```bash
git add GITSORT-LOG.md && git commit -m "gitsort: log sync $(date '+%Y-%m-%d %H:%M')"
```
(If you're in the conflict case, this commit just adds to Zac's local pile — that's
fine. If you reached here after a clean sync that already pushed, run a quick
`git push origin main` afterwards so the log goes up too.)

### Entry format — clean/automatic merge
```markdown
## 2026-06-21 14:32 — ✅ Synced fine
- Saved Zac's work: 2 files committed (a1b2c3d)
- Pulled Simon's changes; git merged them automatically (no conflicts)
- Pushed everything to GitHub
- Backup rope: branch `backup/before-sync-2026-06-21-1432`
  (auto-merges can look clean but still break the game — roll back here if needed:
   `git reset --hard backup/before-sync-2026-06-21-1432`, then re-push carefully)
```

### Entry format — conflict, did NOT merge (the safe-path case)
```markdown
## 2026-06-21 14:40 — ⚠️ STOPPED on a conflict (did NOT merge — needs Simon)
- Saved Zac's work first, so nothing is lost: commit a1b2c3d
- Pulled GitHub's latest, but these files were edited by BOTH people on the same
  lines and can't be combined automatically:
    - main.js
    - palette.js
- DECISION: I chose **not** to merge, to avoid silently dropping anyone's work.
  I ran `git merge --abort` to return to a clean, safe state.
- State for Simon to fix:
    - local `main`  = a1b2c3d   (Zac's work)
    - `origin/main` = e4f5g6h   (Simon's work)
    - backup rope   = branch `backup/before-sync-2026-06-21-1440`
- How Simon resolves it:
    1. `git merge origin/main`     (re-creates the conflict on purpose)
    2. open the listed files, fix the `<<<<<<< ======= >>>>>>>` markers, keep the
       right bits of both
    3. `git add <files>` then `git commit`
    4. `git push origin main`
```

---

## Edge cases (take the safe path, log it, don't improvise)

- **Push rejected ("non-fast-forward"):** GitHub moved again while we worked. Just
  start over from Step 2 (fetch + recheck) once. If it still fails, stop and log it.
- **Login/password error on push:** it's a GitHub credentials thing, not Zac's fault.
  Tell him to get Simon; log it.
- **Conflict in a picture/sound file (`.png`, `.mp3`, etc.):** these can't be
  text-merged at all — always abort + escalate + log.
- **Anything you don't understand:** that's exactly when to STOP, keep everything as
  it is, and write what you saw to the log for Simon. "I didn't touch it" is always
  a safe answer.

## Optional shortcuts (if Zac asks for just one half)
- "just save / just push my stuff" → Steps 0,1, then push if ahead (Case C).
- "just get the latest / just pull" → Steps 0,2, then Case B (or Case D if diverged).

But the default for `/gitsort` is the **full safe sync** above.
