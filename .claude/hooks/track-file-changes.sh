#!/bin/bash
# track-file-changes.sh — Tracks changed files for session metrics
# PostToolUse hook (matcher: Edit|Write). Appends file path to session tracker.

TRACKER="C:/bescout-app/.claude/session-files.txt"

# Get file path from tool input (environment variable set by Claude Code)
FILE_PATH="${CLAUDE_FILE_PATH:-}"

if [ -n "$FILE_PATH" ]; then
  echo "$FILE_PATH" >> "$TRACKER"
fi

exit 0
