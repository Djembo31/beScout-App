#!/bin/bash

# PreToolUse Hook: Block destructive Bash commands
# Exit 2 = block, Exit 0 = allow

INPUT=$(cat)

# Extract command without jq (Windows-compatible)
COMMAND=$(echo "$INPUT" | grep -oP '"command"\s*:\s*"\K[^"]+')

# Skip if no command
if [ -z "$COMMAND" ]; then
    exit 0
fi

# Block destructive patterns
if echo "$COMMAND" | grep -qiE "rm -rf[[:space:]]*/|rm -rf[[:space:]]*~|rm -rf[[:space:]]*\."; then
    echo "BLOCKED: Destructive rm -rf detected" >&2
    exit 2
fi

if echo "$COMMAND" | grep -qiE "DROP[[:space:]]+(TABLE|DATABASE|SCHEMA)|TRUNCATE"; then
    echo "BLOCKED: Destructive SQL detected" >&2
    exit 2
fi

if echo "$COMMAND" | grep -qiE "git push (--force|-f )|git reset --hard|git clean -fd|git checkout -- \."; then
    echo "BLOCKED: Destructive git command detected" >&2
    exit 2
fi

exit 0
