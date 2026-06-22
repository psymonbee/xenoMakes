---
name: ship
description: Make the current branch's work the "real game" — merge it into main, push to GitHub, and tidy up the branch everywhere. The "this is good, ship it" button and the cleanup. Use when someone says "ship it", "merge this", "make it the real game", "this is done", "tidy up the branch", "finish this feature", or runs /ship. Takes the SAFE path on conflicts (stops, keeps everyone's work, escalates to Simon).
---

# /ship — make it the real game and tidy up

This is the **"this is good — ship it"** button. When a feature branch is finished
and previewed, `/ship` folds it into `main` (the real game), sends it to GitHub, and
**cleans up the branch so you don't have leftovers to worry about.**

## The one idea (this is what kills the "too many branches" headache)

**GitHub is the only real copy.** A branch lives on GitHub; every computer just has
a *working copy* of it. So there is really only **one** branch to clean up — the one
on **GitHub**. This skill deletes that. The copy in any **cloud** session deletes
*itself* when that session ends (the container is thrown away). The copy on **this**
computer is a tiny pointer we tidy up too. Nothing is left hanging.

## What `/ship` does
1. Saves any unsaved work (safety net — nothing is ever lost).
2. Sends the feature branch up to GitHub.
3. Folds it into `main` and pushes `main`.
4. Deletes the feature branch **on GitHub** and **on this computer**.
5. Leaves you sitting on a clean, up-to-date `main`, ready for the next idea.

> Because the work is safely inside `main` and pushed before any branch is deleted,
> the cleanup can't lose anything.

---

## The runbook (follow in order)

Run with the Bash tool. Read each step's output before the next.

### Step 0 — Sanity + figure out the feature branch
```bash
git rev-parse --is-inside-work-tree   # must be true
git remote get-url origin             # GitHub link must exist
git branch --show-current             # this is the FEATURE branch we're shipping
```
- Not a git repo / no `origin` → stop, tell them to get Simon.
- **If the branch is already `main`** → there's nothing to ship. Tell them kindly:
  *"You're already on `main` — there's no feature branch to ship. If you meant to
  finish some work, switch to its branch first."* End here.
- Remember this branch name as **FEATURE** for the steps below.

### Step 1 — Save any unsaved work first (safety net)
```bash
git status --porcelain
```
- **Prints files?** Commit them so they're safe and travel with the merge:
```bash
git add -A
git commit -m "Finishing touches before shipping — $(date '+%Y-%m-%d %H:%M')"
```
- **Prints nothing?** Already clean — carry on.

### Step 2 — Send the feature branch up to GitHub
```bash
git push origin FEATURE
```
If the push is rejected (GitHub moved on), run `/gitsort` first to sync, then come
back. Don't force-push.

### Step 3 — Get a fresh, clean main
```bash
git fetch origin
git switch main
git pull --ff-only origin main
```

### Step 4 — Fold the feature into main (the careful bit)
Lay down a backup rope first, then merge:
```bash
STAMP=$(date '+%Y-%m-%d-%H%M')
git branch "backup/before-ship-$STAMP"      # rollback rope — keep it
git merge --no-ff FEATURE -m "Merge FEATURE into main"
```
Look at the result:

- **Merge succeeded (no conflicts)** → push the real game:
  ```bash
  git push origin main
  ```
  Keep the backup branch and mention it — an auto-merge can read clean but still
  break the game, and the rope lets Simon roll back.

- **Merge had CONFLICTS** → **STOP, take the safe path:**
  ```bash
  git merge --abort
  ```
  Now nothing is half-done. Tell them in plain words:
  > "Your work is all safe — I didn't lose anything! But this and `main` both
  > changed the same parts, so I didn't want to risk mixing them up wrong. Run
  > `/gitsort`, or ask Simon to help fold them together."
  Do **not** guess, pick a side, or force. Do not delete the branch. End here.

### Step 5 — Tidy up the branch (only after Step 4 pushed cleanly)
The work is now safely in `main` on GitHub, so the feature branch has done its job.
```bash
git push origin --delete FEATURE     # remove it from GitHub (the real cleanup)
git branch -d FEATURE                # remove this computer's copy (safe -d only)
```
- If `git branch -d` refuses ("not fully merged"), **do not** use `-D`. Leave the
  local copy and just say so — it's harmless. The GitHub one is what mattered.

### Step 6 — Confirm you're clean
```bash
git branch --show-current   # should say: main
git status --porcelain      # should be empty
```
Tell them they're back on a clean, up-to-date `main`, the feature is now part of the
real game, and the branch is cleaned up on GitHub and here. Reassure them the
**cloud** copy of the branch needs nothing — it disappears on its own.

---

## Friendly tone
Short, upbeat, plain words. Example wrap-up:

> "Shipped! 🚀 Your click-to-place blocks are now part of the real game on GitHub.
> I tidied up the branch for you, and you're back on `main`, all clean. The cloud
> copy will clear itself — nothing for you to do there."

## Don't
- Never `push --force`, `reset --hard`, `branch -D`, `checkout --theirs/--ours`, or
  `git clean`.
- Never delete a branch *before* its work is merged into `main` and pushed.
- On any conflict or anything you don't understand: **stop, keep everything as-is,
  hand off to `/gitsort` or Simon.** "I didn't touch it" is always a safe answer.

## Note on the Pull Request
If a PR was open for the feature branch, merging into `main` and pushing will make
GitHub mark that PR as **merged** and (since the branch is deleted) closed — no extra
step needed. If you'd rather keep the PR review trail, you can instead merge via the
PR's green button on GitHub and then run only Steps 3 and 5 to refresh and tidy.
