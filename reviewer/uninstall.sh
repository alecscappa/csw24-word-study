#!/bin/bash
# Stop the game reviewer and stop it starting at login
launchctl bootout "gui/$(id -u)/com.csw24.reviewer" 2>/dev/null || true
rm -f "$HOME/Library/LaunchAgents/com.csw24.reviewer.plist"
echo "Game reviewer removed."
