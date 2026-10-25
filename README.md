# CSW24 Word Study

A local study site for Collins Scrabble Words 2024.

## Setup

The word data is not in this repo. Build it from your Zyzzyva lexicon:

    python3 build.py            # reads ~/Zyzzyva/lexicons/CSW24.db
    python3 build.py path/to/CSW24.db

Then open `index.html` in a browser.

## Board

The Board tab opens on **Games** (below). Along the top are the tools: **Analyse** (set up any position and rack,
see every play ranked, and look ahead at the replies) and **Free board** (place tiles, see the score). **Play** is
against the computer at four strengths, or two people on one screen. The computer is our own engine in `js/engine.js`:
it finds every play from a tree of the words, values the kept tiles, and runs in a worker.

## Game review

**Board → Games** keeps your games: played in the app, typed in from a real board, loaded from a `.gcg` file, or a
Woogles link. Each turn gets a quick check from our engine straight away. A **full review** comes from
[Macondo](https://github.com/domino14/macondo), run on the Mac: it looks ahead on every turn, solves the endgame
exactly, and grades each move (best, small, medium or large mistake) with the chance of winning it cost.

Setting up the Mac (once):

1. Macondo and its CSW24 files live in `tools/macondo/` (kept out of git). Download the Mac build from Macondo's
   releases into that folder, put `CSW24.kwg` from Woogles' `liwords-ui/public/wasm/2024/` in `data/lexica/gaddag/`.
2. Run `reviewer/install.sh`. It starts the reviewer (`reviewer/reviewer.mjs`, a small server only this Mac can reach,
   on port 8190) now and at every login. `reviewer/uninstall.sh` removes it; `reviewer/Start reviewer.command` runs
   it by hand instead.

Reviews are saved with the games in the browser. **Save games to a file** / **Load games file** moves them to a phone.

There's also a hidden **Lab** at `#lab`: Top play and Bingo hunt puzzles, the computer playing itself, and a tile tracker.

## Tests

    node tests/logic.js      # ~3,300 checks: every search, group, hook and quiz rule vs brute force and the Zyzzyva DB
    node tests/browser.mjs   # ~650 checks in headless Chrome: every page, theme, phone width and quiz flow (QUICK=1 is a 2-minute version)
    node tests/board.mjs     # ~110 checks: Free board, Scoring, Analyse, Play (v computer and friends) and the Lab

See [PUBLISHING.md](PUBLISHING.md) for notes on copyright, privacy and getting the site on a phone.
