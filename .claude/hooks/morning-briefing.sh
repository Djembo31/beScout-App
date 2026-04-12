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

  # Worktrees with pending work
  WORKTREE_COUNT=0
  WORKTREE_DETAILS=""
  while IFS= read -r WT_LINE; do
    WT_PATH=$(echo "$WT_LINE" | awk '{print $1}')
    WT_BRANCH=$(echo "$WT_LINE" | sed -n 's/.*\[\(.*\)\].*/\1/p')
    # Skip main worktree
    [ "$WT_PATH" = "C:/bescout-app" ] && continue
    # Check for uncommitted changes in this worktree
    WT_DIFF=$(cd "$WT_PATH" && git diff --stat HEAD 2>/dev/null | tail -1)
    if [ -n "$WT_DIFF" ]; then
      WORKTREE_COUNT=$((WORKTREE_COUNT + 1))
      WT_NAME=$(basename "$WT_PATH")
      WORKTREE_DETAILS="${WORKTREE_DETAILS}  ${WT_NAME} (${WT_BRANCH}): ${WT_DIFF}\n"
    fi
  done < <(git worktree list 2>/dev/null)

  if [ "$WORKTREE_COUNT" -gt 0 ]; then
    echo "## ⚠ PENDING AGENT WORK: $WORKTREE_COUNT Worktrees mit Aenderungen"
    echo "→ ZUERST pruefen und mergen, BEVOR neue Arbeit beginnt!"
    echo '```'
    echo -e "$WORKTREE_DETAILS"
    echo '```'
    echo ""
  fi

  # Count total worktrees (for cleanup hint)
  TOTAL_WT=$(git worktree list 2>/dev/null | grep -cv "^C:/bescout-app " || true)
  if [ "$TOTAL_WT" -gt 5 ] 2>/dev/null; then
    echo "## Worktree Cleanup: $TOTAL_WT Worktrees vorhanden (>5 = Cleanup empfohlen)"
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
  DRAFT_COUNT=$(ls memory/learnings/drafts/*.md 2>/dev/null | grep -cv "PROMOTED" 2>/dev/null || true)
  DRAFT_COUNT=${DRAFT_COUNT:-0}
  if [ "$DRAFT_COUNT" -gt 0 ] 2>/dev/null; then
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

  # Wiki status
  echo "## Wiki"
  if [ -f "memory/wiki-index.md" ]; then
    WIKI_FILES=$(grep -c "^|" memory/wiki-index.md 2>/dev/null || echo 0)
    WIKI_DATE=$(head -1 memory/wiki-index.md 2>/dev/null | sed -n 's/.*generated \(.*\))/\1/p')
    echo "- Index: $WIKI_FILES Eintraege (Stand: ${WIKI_DATE:-unbekannt})"
  else
    echo "- Index: nicht vorhanden"
  fi
  if [ -f "memory/wiki-log.md" ]; then
    LAST_LOG=$(grep "^## \[" memory/wiki-log.md 2>/dev/null | tail -1)
    echo "- Letzter Log: ${LAST_LOG:-kein Eintrag}"
  fi
  echo ""

  # Session Digest from last session (learnings + warnings for this session)
  if [ -f "memory/session-digest.md" ]; then
    echo "## Letzte Session Digest"
    sed -n '/^## Letzte Session/,$ p' "memory/session-digest.md" | head -30
    echo ""
  fi

  # AutoDream check
  COUNTER=$(cat .claude/session-counter 2>/dev/null || echo 0)
  if [ "$COUNTER" -ge 20 ] 2>/dev/null; then
    echo "## AutoDream: Memory Consolidation faellig ($COUNTER Sessions)"
    echo "→ Starte AutoDream Subagent um Memory zu konsolidieren"
    echo ""
  fi

} > "$BRIEFING"

# Output to context (replaces inject-learnings.sh)
cat "$BRIEFING"

exit 0
