#!/bin/bash

# StopFailure Hook: Auto-save work when API crashes (rate limit, auth error, etc.)
# New in Claude Code 2.1.78. Prevents losing uncommitted work on crashes.

cd C:/bescout-app

# Check for uncommitted changes
CHANGES=$(git status --porcelain 2>/dev/null | head -5)

if [ -z "$CHANGES" ]; then
    exit 0
fi

# Auto-commit with recovery marker
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
git add -A 2>/dev/null
git commit -m "AUTO-RECOVERY: API crash at $TIMESTAMP — uncommitted work saved

This commit was auto-created by the StopFailure hook when Claude Code
crashed due to an API error. Review before continuing work." 2>/dev/null

if [ $? -eq 0 ]; then
    echo "CRASH RECOVERY: Uncommitted changes auto-committed. Check git log."
else
    # Fallback: save as diff
    BACKUP_DIR="C:/bescout-app/.claude/backups"
    mkdir -p "$BACKUP_DIR"
    git diff HEAD > "$BACKUP_DIR/crash-recovery-$TIMESTAMP.diff" 2>/dev/null
    git reset HEAD 2>/dev/null
    echo "CRASH RECOVERY: Changes saved as diff in .claude/backups/"
fi

exit 0
