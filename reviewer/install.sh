#!/bin/bash
# Start the game reviewer now and every time you log in. Undo with uninstall.sh
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
NODE="$(command -v node)"
PLIST="$HOME/Library/LaunchAgents/com.csw24.reviewer.plist"
mkdir -p "$HOME/Library/LaunchAgents" "$HERE/../tools"
cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.csw24.reviewer</string>
  <key>ProgramArguments</key><array><string>$NODE</string><string>$HERE/reviewer.mjs</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$HERE/../tools/reviewer.log</string>
  <key>StandardErrorPath</key><string>$HERE/../tools/reviewer.log</string>
</dict></plist>
PL
launchctl bootout "gui/$(id -u)/com.csw24.reviewer" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Game reviewer installed: it runs now and at every login."
