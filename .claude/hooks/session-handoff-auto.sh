#!/bin/bash
# Stop Hook: Write useful session state for next session recovery
# Output: memory/session-handoff.md (read by morning-briefing)
# Also outputs warnings to Claude's context on stop

cd C:/bescout-app || exit 0

HANDOFF="memory/session-handoff.md"
NOW=$(date +"%Y-%m-%d %H:%M")

mkdir -p memory

{
  echo "# Session Handoff ($NOW)"
  echo ""

  # 1. Uncommitted changes (most critical for recovery)
  UNCOMMITTED=$(git status --porcelain 2>/dev/null | head -20)
  if [ -n "$UNCOMMITTED" ]; then
    UNCOMMITTED_COUNT=$(echo "$UNCOMMITTED" | grep -c "." 2>/dev/null || echo 0)
    echo "## Uncommitted Changes: $UNCOMMITTED_COUNT Files"
    echo '```'
    echo "$UNCOMMITTED"
    echo '```'
    echo ""
  else
    echo "## Working Tree: Clean"
    echo ""
  fi

  # 2. Recent commits this session (last 4 hours)
  RECENT=$(git log --since="4 hours ago" --oneline 2>/dev/null | head -10)
  RECENT_COUNT=$(echo "$RECENT" | grep -c "." 2>/dev/null || echo 0)
  if [ -n "$RECENT" ] && [ "$RECENT_COUNT" -gt 0 ]; then
    echo "## Session Commits: $RECENT_COUNT"
    echo "$RECENT" | sed 's/^/- /'
    echo ""
  fi

  # 3. Worktrees with pending agent work
  WT_WITH_CHANGES=0
  WT_CLEAN=0
  WT_DETAILS=""
  while IFS= read -r WT_LINE; do
    WT_PATH=$(echo "$WT_LINE" | awk '{print $1}')
    WT_BRANCH=$(echo "$WT_LINE" | sed -n 's/.*\[\(.*\)\].*/\1/p')
    [ "$WT_PATH" = "C:/bescout-app" ] && continue
    WT_DIFF=$(cd "$WT_PATH" && git diff --stat HEAD 2>/dev/null | tail -1)
    WT_NAME=$(basename "$WT_PATH")
    if [ -n "$WT_DIFF" ]; then
      WT_WITH_CHANGES=$((WT_WITH_CHANGES + 1))
      WT_DETAILS="${WT_DETAILS}- **${WT_NAME}** (${WT_BRANCH}): ${WT_DIFF}\n"
    else
      WT_CLEAN=$((WT_CLEAN + 1))
    fi
  done < <(git worktree list 2>/dev/null)

  if [ "$WT_WITH_CHANGES" -gt 0 ]; then
    echo "## Pending Agent Work: $WT_WITH_CHANGES Worktrees"
    echo -e "$WT_DETAILS"
  fi
  if [ "$WT_CLEAN" -gt 0 ]; then
    echo "## Stale Worktrees: $WT_CLEAN (cleanup candidates)"
    echo ""
  fi

  # 4. Stash
  STASH=$(git stash list 2>/dev/null | head -5)
  if [ -n "$STASH" ]; then
    echo "## Stashed Changes"
    echo "$STASH" | sed 's/^/- /'
    echo ""
  fi

  # 5. tsc status
  TSC_ERRORS=$(npx tsc --noEmit 2>&1 | grep -c "error TS" 2>/dev/null || true)
  TSC_ERRORS=${TSC_ERRORS:-0}
  if [ "$TSC_ERRORS" -gt 0 ] 2>/dev/null; then
    echo "## ⚠ tsc: $TSC_ERRORS ERRORS (nicht clean!)"
    echo ""
  fi

} > "$HANDOFF"

# Output critical warnings to Claude's stop context
if [ -n "$UNCOMMITTED" ]; then
  echo "HANDOFF: $UNCOMMITTED_COUNT uncommitted files. State saved to memory/session-handoff.md"
fi
if [ "$WT_WITH_CHANGES" -gt 0 ] 2>/dev/null; then
  echo "HANDOFF: $WT_WITH_CHANGES worktrees with pending agent work — next session must merge first"
fi

exit 0
