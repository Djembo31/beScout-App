#!/bin/bash
# SessionEnd Hook: Write automatic retrospective
# Non-blocking — just writes a file for next session's injection

cd C:/bescout-app

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RETRO_DIR="memory/sessions"
RETRO_FILE="$RETRO_DIR/retro-$TIMESTAMP.md"

mkdir -p "$RETRO_DIR"

# Get changed files from recent commits (last 2 hours)
RECENT_CHANGES=$(git log --since="2 hours ago" --name-only --pretty=format:"" 2>/dev/null | sort -u | head -30)
RECENT_COMMITS=$(git log --since="2 hours ago" --oneline 2>/dev/null | head -10)
UNCOMMITTED=$(git status --porcelain 2>/dev/null | head -10)

{
  echo "# Retro $TIMESTAMP"
  echo ""
  echo "## Commits"
  if [ -n "$RECENT_COMMITS" ]; then
    echo "$RECENT_COMMITS"
  else
    echo "Keine Commits in dieser Session"
  fi
  echo ""
  echo "## Changed Files"
  if [ -n "$RECENT_CHANGES" ]; then
    echo "$RECENT_CHANGES"
  else
    echo "Keine Aenderungen"
  fi
  echo ""
  if [ -n "$UNCOMMITTED" ]; then
    echo "## Uncommitted"
    echo "$UNCOMMITTED"
    echo ""
  fi
  echo "## What Could Improve"
  echo "- [filled by next session's quality review]"
} > "$RETRO_FILE"

# Keep only last 5 retros
ls -t "$RETRO_DIR"/retro-*.md 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null

exit 0
