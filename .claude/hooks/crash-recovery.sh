#!/bin/bash
# StopFailure Hook: Save work when Claude Code crashes (taskkill, API error, etc.)
# Writes recovery state to memory/session-handoff.md so next session can resume

cd C:/bescout-app || exit 0

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
HANDOFF="memory/session-handoff.md"
BACKUP_DIR=".claude/backups"

mkdir -p memory "$BACKUP_DIR"

# 1. Save current diff as backup
CHANGES=$(git status --porcelain 2>/dev/null | head -5)
if [ -n "$CHANGES" ]; then
  git diff HEAD > "$BACKUP_DIR/crash-$TIMESTAMP.diff" 2>/dev/null
  git diff --cached >> "$BACKUP_DIR/crash-$TIMESTAMP.diff" 2>/dev/null
fi

# 2. Write crash report to a DEDICATED, bounded file (NOT appended to handoff).
#    Old behaviour appended raw (markerless) to session-handoff.md -> unbounded growth
#    (the accretion bug, fixed in slice 431). One file per crash, lives in BACKUP_DIR
#    (gitignored). A short pointer is emitted to Claude's context + the next
#    SessionStart briefing surfaces git status anyway.
CRASH_FILE="$BACKUP_DIR/crash-$TIMESTAMP.md"
{
  echo "# ⚠ CRASH RECOVERY ($TIMESTAMP)"
  echo "Session crashed. State at crash time:"
  echo ""

  if [ -n "$CHANGES" ]; then
    echo "## Uncommitted Changes (full diff: $BACKUP_DIR/crash-$TIMESTAMP.diff)"
    echo '```'
    git status --porcelain 2>/dev/null | head -20
    echo '```'
    echo ""
  fi

  # Worktrees with work
  WT_COUNT=0
  while IFS= read -r WT_LINE; do
    WT_PATH=$(echo "$WT_LINE" | awk '{print $1}')
    [ "$WT_PATH" = "C:/bescout-app" ] && continue
    WT_DIFF=$(cd "$WT_PATH" && git diff --stat HEAD 2>/dev/null | tail -1)
    if [ -n "$WT_DIFF" ]; then
      WT_COUNT=$((WT_COUNT + 1))
      WT_NAME=$(basename "$WT_PATH")
      echo "- Worktree **${WT_NAME}**: ${WT_DIFF}"
    fi
  done < <(git worktree list 2>/dev/null)

  if [ "$WT_COUNT" -gt 0 ]; then
    echo ""
    echo "→ $WT_COUNT worktrees had pending work at crash time"
  fi

  echo ""
  echo "## Recovery: \`git apply $BACKUP_DIR/crash-$TIMESTAMP.diff\`"
} > "$CRASH_FILE"

echo "CRASH RECOVERY: State saved to $CRASH_FILE + backup diff in $BACKUP_DIR/ (next session: read it, then 'git apply' if needed)"

exit 0
