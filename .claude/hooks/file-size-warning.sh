#!/bin/bash

# PostToolUse Hook: Warn when files grow beyond 500 lines
# Catches bloat early. Components should stay focused and splittable.

INPUT=$(cat)

FILE_PATH=$(echo "$INPUT" | sed -n 's/.*"file_path"\s*:\s*"\([^"]*\)".*/\1/p')

if [ -z "$FILE_PATH" ]; then
    exit 0
fi

# Only check TS/TSX source files
if [[ ! "$FILE_PATH" =~ \.(ts|tsx)$ ]]; then
    exit 0
fi

# Skip generated/config files
if [[ "$FILE_PATH" =~ node_modules|\.next|types/index\.ts|messages/ ]]; then
    exit 0
fi

# Count lines
LINES=$(wc -l < "$FILE_PATH" 2>/dev/null)

if [ -z "$LINES" ]; then
    exit 0
fi

if [ "$LINES" -gt 500 ]; then
    echo "FILE SIZE WARNING: $FILE_PATH has $LINES lines (>500)."
    echo "Consider splitting into smaller, focused modules."
fi

exit 0
