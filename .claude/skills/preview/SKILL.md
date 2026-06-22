---
name: preview
description: Pull the latest of a branch and open the game/editor in the browser to test it — the "show me my work" button. Use on the Mac (a real local computer) whenever someone says "preview", "let me see it", "run it", "test the changes", "open the editor", "play my game locally", or runs /preview. Optionally takes a branch name (/preview some-branch) to switch to that branch first; with no name it previews the branch you're already on.
---

# /preview — see and test the game right now

This is the **"show me my work" button**. It grabs the latest code for a branch
from GitHub and starts the little local web server so you can open the game (or the
level editor) in your browser and play with it.

> **Where this runs:** on a **real computer** (Simon's/Zac's Mac), not a cloud
> session. A cloud container can't open a browser window for you — so previewing is
> always a "sit at the Mac" thing. That's normal.

## The one idea (so the branches stop being confusing)

**GitHub is the only real copy of the game.** This computer just keeps a *working
copy* it pulls down. So `preview` is simply: *"go to GitHub, grab the freshest
version of this branch, and run it here."* Nothing to juggle.

## What `/preview` does

1. Works out **which branch** to show:
   - If a branch name was given (e.g. `/preview claude/click-place-paint-editor-yfaddd`),
     that's the target.
   - If no name was given, it previews **the branch you're already on**.
2. Pulls the latest of that branch from GitHub.
3. Starts the local server and hands you the link.

---

## The runbook (follow in order)

Run these with the Bash tool. Read each step's output before the next.

### Step 0 — Make sure we're somewhere sane
```bash
git rev-parse --is-inside-work-tree   # must be true
git remote get-url origin             # the GitHub link must exist
git branch --show-current             # remember what branch we're on
```
If this isn't a git repo or there's no `origin`, stop and tell them to get Simon —
don't try to fix it.

### Step 1 — Figure out the target branch
- **A branch name was passed in** → that's the target.
- **No name** → the target is the current branch from Step 0. Skip the switch in
  Step 2 (we're already here) and go to Step 3.

### Step 2 — Switch to the target branch (only if it's different)
First check there's no unsaved work that a switch would clobber:
```bash
git status --porcelain
```
- **If that prints files** (unsaved work): **STOP. Do not switch.** Tell them in
  plain words: *"You've got changes that aren't saved yet — let's run `/gitsort`
  first so nothing gets lost, then I'll preview."* Do not use `git stash`,
  `checkout --force`, or `reset`. End here.
- **If it's clean**, switch and grab the latest:
```bash
git fetch origin
git switch <target-branch>
git pull --ff-only origin <target-branch>
```

### Step 3 — (Same-branch case) just grab the latest
If we didn't switch (we were already on the target):
```bash
git fetch origin
git pull --ff-only origin <current-branch>
```
- If the pull says it **can't fast-forward** (you and GitHub both moved): don't
  force anything. Tell them: *"You and GitHub have both changed things — run
  `/gitsort` to sort that out safely. I'll preview what's on this computer for now."*
  Then carry on to Step 4 with whatever's local — previewing is always safe.

### Step 4 — Start the server and hand over the link
```bash
npm start
```
Run it in the **background** (it's a server — it keeps running until stopped).
`npm start` serves the folder on **port 8080**. Then tell them the links:

- 🎮 **Play the game:** http://localhost:8080
- 🏠 **Home / level gallery:** http://localhost:8080/home.html
- 🛠️ **Level editor:** http://localhost:8080/editor.html
  - Fresh blank level: http://localhost:8080/editor.html?new=1

> If `npm start` complains that port **8080** is already busy, the server is almost
> certainly **already running** from before — just give them the links above; no
> need to start a second one.

Tell them they can **refresh the browser tab** to see new edits after a save, and
stop the server with **Ctrl + C** in the terminal when they're done.

---

## Friendly tone
Talk to Zac like a friendly 12-year-old. Short sentences. The link is the prize —
lead with it. Example wrap-up:

> "Here you go! 🎮 Open **http://localhost:8080/editor.html?new=1** to try the new
> click-to-place blocks. Change something, save, and just refresh the tab to see it.
> Press Ctrl + C in the terminal when you're finished."

## Don't
- Don't `git stash`, `git checkout --force`, `git reset --hard`, or `git clean` —
  if there's unsaved work, hand off to `/gitsort` instead.
- Don't try to preview in a cloud session — say it's a "sit at the Mac" thing.
- Don't merge or delete anything — that's `/ship`'s job.
