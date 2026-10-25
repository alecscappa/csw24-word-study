#!/bin/bash
# Double-click to run the game reviewer in a Terminal window (close the window to stop it)
cd "$(dirname "$0")" && exec node reviewer.mjs
