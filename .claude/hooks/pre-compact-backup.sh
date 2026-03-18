#!/bin/bash
# PreCompact Hook: Auto-commit before context compaction
# Upgraded from diff-only to actual git commit for real recovery

cd C:/bescout-app

CHANGES=$(git status --porcelain 2>/dev/null | head -5)

if [ -z "$CHANGES" ]; then
    exit 0
fi

TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Try auto-commit first
git add -A 2>/dev/null
git commit -m "AUTO: pre-compact checkpoint $TIMESTAMP" 2>/dev/null

if [ $? -ne 0 ]; then
    # Fallback: save as diff if commit fails
    BACKUP_DIR="C:/bescout-app/.claude/backups"
    mkdir -p "$BACKUP_DIR"
    DIFF_FILE="$BACKUP_DIR/pre-compact-$TIMESTAMP.diff"
    git diff HEAD > "$DIFF_FILE" 2>/dev/null
    git reset HEAD 2>/dev/null

    if [ ! -s "$DIFF_FILE" ]; then
        rm -f "$DIFF_FILE"
    fi

    # Cleanup: keep only last 10 backups
    ls -t "$BACKUP_DIR"/pre-compact-*.diff 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null
fi

exit 0
