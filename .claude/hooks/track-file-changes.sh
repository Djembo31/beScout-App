#!/bin/bash
# track-file-changes.sh — Tracks changed files for session metrics
# PostToolUse hook (Edit|Write). Gets tool input as first argument.

TRACKER="C:/bescout-app/.claude/session-files.txt"

# Parse file_path from hook input (JSON string as $1)
INPUT="${1:-}"
if [ -n "$INPUT" ]; then
  FILE_PATH=$(echo "$INPUT" | grep -oP '"file_path"\s*:\s*"\K[^"]+' 2>/dev/null || true)
  if [ -n "$FILE_PATH" ]; then
    echo "$FILE_PATH" >> "$TRACKER"
  fi
fi

exit 0
