#!/bin/bash
# track-file-changes.sh — Tracks changed files for session metrics
# PostToolUse hook (Edit|Write). Gets tool input as first argument.

TRACKER="C:/bescout-app/.claude/session-files.txt"

# Parse file_path from hook input (JSON on stdin)
INPUT=$(cat)
if [ -n "$INPUT" ]; then
  FILE_PATH=$(echo "$INPUT" | sed -n 's/.*"file_path"\s*:\s*"\([^"]*\)".*/\1/p')
  if [ -n "$FILE_PATH" ]; then
    echo "$FILE_PATH" >> "$TRACKER"
  fi
fi

exit 0
