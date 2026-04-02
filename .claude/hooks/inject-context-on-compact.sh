#!/bin/bash
# inject-context-on-compact.sh — Re-inject critical context after compaction
# Runs on PreCompact alongside pre-compact-backup.sh

cd "C:/bescout-app" || exit 0

echo "=== CONTEXT RE-INJECTION (post-compaction) ==="

# 1. Current sprint status
if [ -f "memory/current-sprint.md" ]; then
  echo ""
  echo "## Current Sprint"
  head -30 "memory/current-sprint.md"
fi

# 2. Session handoff
if [ -f "memory/session-handoff.md" ]; then
  echo ""
  echo "## Session Handoff"
  cat "memory/session-handoff.md"
fi

# 3. Active session files (what was changed)
if [ -f ".claude/session-files.txt" ]; then
  echo ""
  echo "## Files Changed This Session"
  sort -u ".claude/session-files.txt"
fi

echo ""
echo "=== END CONTEXT RE-INJECTION ==="
