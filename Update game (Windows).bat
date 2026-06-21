@echo off
REM ===========================================================================
REM  Update Coin Quest  (Windows)  —  just DOUBLE-CLICK this file.
REM ===========================================================================
REM  It downloads the latest version of the game from GitHub onto this PC.
REM  (It runs "git pull" for you, so you don't have to use the black terminal.)
REM ===========================================================================

REM Move into the folder this file lives in, whatever its name is.
cd /d "%~dp0"

echo.
echo  Updating Coin Quest from GitHub...
echo  ---------------------------------------------------------------
git pull
echo  ---------------------------------------------------------------
echo.

if %errorlevel%==0 (
  echo  All done! Refresh the game/editor in your browser to see changes.
) else (
  echo  Hmm, that didn't finish cleanly. If it says you have your own
  echo  changes, save them first ^(commit or stash^), then run this again.
  echo  If you're stuck, show this window to a grown-up / to Claude.
)

echo.
echo  Press any key to close this window.
pause >nul
