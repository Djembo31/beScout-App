#!/bin/bash
# morning-briefing.sh — Generates system status snapshot for Jarvis Cortex
# Run by SessionStart hook or manually. Output: memory/senses/morning-briefing.md

cd C:/bescout-app || exit 0

BRIEFING="memory/senses/morning-briefing.md"
NOW=$(date +"%Y-%m-%d %H:%M")

mkdir -p memory/senses

{
  echo "# System-Status (auto-generated $NOW)"
  echo ""

  # Git
  echo "## Git (seit letzter Session)"
  COMMITS=$(git log --since="24 hours ago" --oneline 2>/dev/null | head -10)
  COMMIT_COUNT=$(echo "$COMMITS" | grep -c "." 2>/dev/null || echo 0)
  if [ -n "$COMMITS" ] && [ "$COMMIT_COUNT" -gt 0 ]; then
    echo "- $COMMIT_COUNT Commits:"
    echo "$COMMITS" | sed 's/^/  /'
  else
    echo "- Keine neuen Commits (24h)"
  fi
  echo ""

  UNCOMMITTED=$(git status --porcelain 2>/dev/null | head -10)
  UNCOMMITTED_COUNT=$(echo "$UNCOMMITTED" | grep -c "." 2>/dev/null || echo 0)
  if [ -n "$UNCOMMITTED" ] && [ "$UNCOMMITTED_COUNT" -gt 0 ]; then
    echo "## Uncommitted: $UNCOMMITTED_COUNT Files"
    echo '```'
    echo "$UNCOMMITTED"
    echo '```'
    echo ""
  fi

  # Build health (quick — no vitest, too slow for hook)
  echo "## Build"
  TSC_OUTPUT=$(npx tsc --noEmit 2>&1)
  TSC_ERRORS=$(echo "$TSC_OUTPUT" | grep -c "error TS" 2>/dev/null || true)
  TSC_ERRORS=${TSC_ERRORS:-0}
  if [ "$TSC_ERRORS" -eq 0 ] 2>/dev/null; then
    echo "- tsc: CLEAN"
  else
    echo "- tsc: $TSC_ERRORS ERRORS"
    echo "$TSC_OUTPUT" | grep "error TS" | head -5 | sed 's/^/  /'
  fi
  echo ""

  # Supabase
  MIGRATION_COUNT=$(ls supabase/migrations/*.sql 2>/dev/null | wc -l)
  LATEST_MIGRATION=$(ls -t supabase/migrations/*.sql 2>/dev/null | head -1 | xargs basename 2>/dev/null)
  echo "## Supabase"
  echo "- Migrations: $MIGRATION_COUNT, letzte: ${LATEST_MIGRATION:-unbekannt}"
  echo ""

  # Sprint
  echo "## Sprint"
  if [ -f "memory/semantisch/sprint/current.md" ]; then
    grep -A 3 "## Naechste" "memory/semantisch/sprint/current.md" 2>/dev/null | head -5
  else
    echo "- current.md nicht gefunden"
  fi
  echo ""

  # Learnings pending
  DRAFT_COUNT=$(ls memory/learnings/drafts/*.md 2>/dev/null | grep -cv "PROMOTED" 2>/dev/null || echo 0)
  if [ "$DRAFT_COUNT" -gt 0 ]; then
    echo "## Pending Learnings: $DRAFT_COUNT Drafts"
    ls memory/learnings/drafts/*.md 2>/dev/null | xargs -I{} basename {} | sed 's/^/- /'
    echo ""
  fi

  # Recent error patterns from common-errors.md
  if [ -f ".claude/rules/common-errors.md" ]; then
    RECENT_ERRORS=$(git log --since="7 days ago" --all -p -- ".claude/rules/common-errors.md" 2>/dev/null | grep "^+" | grep -v "^+++" | head -10)
    if [ -n "$RECENT_ERRORS" ]; then
      echo "## Recent Error Patterns"
      echo "$RECENT_ERRORS" | sed 's/^+/- /'
      echo ""
    fi
  fi

} > "$BRIEFING"

# Output to context (replaces inject-learnings.sh)
cat "$BRIEFING"

exit 0
