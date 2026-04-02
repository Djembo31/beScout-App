#!/bin/bash

# PostToolUse Hook: Auto-lint after Edit/Write on TS/TSX files
# Runs ESLint --fix silently. Never blocks (exit 0 always).

INPUT=$(cat)

# Extract file_path without jq (Windows-compatible)
FILE_PATH=$(echo "$INPUT" | sed -n 's/.*"file_path"\s*:\s*"\([^"]*\)".*/\1/p')

# Skip if no file path or not a TS/TSX file
if [ -z "$FILE_PATH" ]; then
    exit 0
fi

if [[ ! "$FILE_PATH" =~ \.(ts|tsx)$ ]]; then
    exit 0
fi

# Skip node_modules, .next, test files
if [[ "$FILE_PATH" =~ node_modules|\.next|\.test\.|\.spec\. ]]; then
    exit 0
fi

# Run ESLint fix silently — never block
cd "C:/bescout-app" 2>/dev/null
npx eslint --fix "$FILE_PATH" --quiet 2>/dev/null || true

exit 0
