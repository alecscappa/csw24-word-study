# CSW24 Word Study

A local study site for Collins Scrabble Words 2024.

## Setup

The word data is not in this repo. Build it from your Zyzzyva lexicon:

    python3 build.py            # reads ~/Zyzzyva/lexicons/CSW24.db
    python3 build.py path/to/CSW24.db

Then open `index.html` in a browser.

## Tests

    node tests/logic.js      # ~3,300 checks: every search, group, hook and quiz rule vs brute force and the Zyzzyva DB
    node tests/browser.mjs   # ~325 checks in headless Chrome: every page, theme, phone width and quiz flow

See [PUBLISHING.md](PUBLISHING.md) for notes on copyright, privacy and getting the site on a phone.
