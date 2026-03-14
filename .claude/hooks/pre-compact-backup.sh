#!/bin/bash
# PreCompact Hook: Save git diff before context compaction
# Protects against context loss in long sessions

BACKUP_DIR="C:/bescout-app/.claude/backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DIFF_FILE="$BACKUP_DIR/pre-compact-$TIMESTAMP.diff"

# Save current diff (staged + unstaged)
cd C:/bescout-app
git diff HEAD > "$DIFF_FILE" 2>/dev/null

# Only keep if non-empty
if [ ! -s "$DIFF_FILE" ]; then
  rm -f "$DIFF_FILE"
fi

# Cleanup: keep only last 10 backups
ls -t "$BACKUP_DIR"/pre-compact-*.diff 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null

exit 0
