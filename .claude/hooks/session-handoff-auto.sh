#!/bin/bash
# Stop Hook: Auto-save session state before Claude stops
# Ensures session-handoff.md is never forgotten

cd C:/bescout-app

# Check if there are uncommitted changes
CHANGES=$(git status --porcelain 2>/dev/null | grep -E '^\s*M|^\s*A|^\s*D' | head -20)

if [ -n "$CHANGES" ]; then
  echo "WARNING: Uncommitted changes detected. Session handoff should document these."
  echo "$CHANGES"
fi

exit 0
