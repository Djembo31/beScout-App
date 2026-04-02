#!/bin/bash
# SessionEnd Hook: Write automatic retrospective
# Non-blocking — just writes a file for next session's injection

cd C:/bescout-app

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RETRO_DIR="memory/episodisch/sessions"
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

# === Session Metrics (Skynet) ===
METRICS_FILE="C:/bescout-app/memory/episodisch/metriken/sessions.jsonl"
SESSION_FILES="C:/bescout-app/.claude/session-files.txt"
COUNTER_FILE="C:/bescout-app/.claude/session-counter"
QUEUE_FILE="C:/bescout-app/.claude/learnings-queue.jsonl"

FILES_CHANGED=0
if [ -f "$SESSION_FILES" ]; then
  FILES_CHANGED=$(sort -u "$SESSION_FILES" | wc -l)
  rm -f "$SESSION_FILES"
fi

CORRECTIONS=0
if [ -f "$QUEUE_FILE" ]; then
  CORRECTIONS=$(wc -l < "$QUEUE_FILE" 2>/dev/null || echo 0)
fi

COUNT=0
if [ -f "$COUNTER_FILE" ]; then
  COUNT=$(cat "$COUNTER_FILE")
fi

COMMIT_COUNT=$(echo "$RECENT_COMMITS" | grep -c "." 2>/dev/null || echo 0)

mkdir -p "$(dirname "$METRICS_FILE")"
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "{\"ts\":\"$NOW\",\"session\":$COUNT,\"files_changed\":$FILES_CHANGED,\"commits\":$COMMIT_COUNT,\"corrections\":$CORRECTIONS}" >> "$METRICS_FILE"

exit 0
