#!/bin/bash
# gemini-sync-reminder.sh — PostToolUse Hook
# After Edit/Write on memory/*.md or rules/*.md, remind to refresh Gemini
# Exit 0 = allow (PostToolUse hooks should always allow)

TOOL_NAME="$1"

# Only check Edit and Write tools
if [ "$TOOL_NAME" != "Edit" ] && [ "$TOOL_NAME" != "Write" ]; then
  exit 0
fi

# Read tool input from stdin
INPUT=$(cat)

# Check if file path contains memory/ or rules/
if echo "$INPUT" | grep -qiE '(memory/|rules/|MEMORY\.md|CLAUDE\.md)'; then
  echo "REMINDER: Knowledge file modified. Run gemini-knowledge refresh_cache() to sync."
fi

exit 0
