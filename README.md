# CSW24 Word Study

A local study site for Collins Scrabble Words 2024.

## Setup

The word data is not in this repo. Build it from your Zyzzyva lexicon:

    python3 build.py            # reads ~/Zyzzyva/lexicons/CSW24.db
    python3 build.py path/to/CSW24.db

Then open `index.html` in a browser.

## Board

The Board tab has three parts: **Free board** (place tiles, see the score), **Analyse** (set up any position and rack,
see every play ranked, and look ahead at the replies) and **Play** (against the computer at four strengths, or two
people on one screen, with a review after the game). The computer is our own engine in `js/engine.js`:
it finds every play from a tree of the words, values the kept tiles, and runs in a worker.

There's also a hidden **Lab** at `#lab`: Top play and Bingo hunt puzzles, the computer playing itself, and a tile tracker.

## Tests

    node tests/logic.js      # ~3,300 checks: every search, group, hook and quiz rule vs brute force and the Zyzzyva DB
    node tests/browser.mjs   # ~650 checks in headless Chrome: every page, theme, phone width and quiz flow (QUICK=1 is a 2-minute version)
    node tests/board.mjs     # ~110 checks: Free board, Scoring, Analyse, Play (v computer and friends) and the Lab

See [PUBLISHING.md](PUBLISHING.md) for notes on copyright, privacy and getting the site on a phone.
