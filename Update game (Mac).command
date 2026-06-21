#!/bin/bash
# ============================================================================
#  Update Coin Quest  (Mac)  —  just DOUBLE-CLICK this file.
# ============================================================================
#  It downloads the latest version of the game from GitHub onto this Mac.
#  (It runs "git pull" for you, so you don't have to open Terminal yourself.)
#
#  Note: the FIRST time, macOS may ask "are you sure you want to open it?" —
#  click Open. If double-click does nothing, right-click it → Open.
# ============================================================================

# Move into the folder this file lives in, whatever it's called.
cd "$(dirname "$0")" || exit 1

echo ""
echo "  Updating Coin Quest from GitHub..."
echo "  ---------------------------------------------------------------"
git pull
status=$?
echo "  ---------------------------------------------------------------"
echo ""

if [ $status -eq 0 ]; then
  echo "  All done! Refresh the game/editor in your browser to see changes."
else
  echo "  Hmm, that didn't finish cleanly. If it says you have your own"
  echo "  changes, save them first (commit or stash), then run this again."
fi

echo ""
echo "  You can close this window now."
