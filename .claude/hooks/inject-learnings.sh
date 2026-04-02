#!/bin/bash
# SessionStart Hook: Inject learnings from last session into context
# Output goes directly into Claude's context window

cd C:/bescout-app

# 1. Last retrospective
LATEST_RETRO=$(ls -t memory/episodisch/sessions/retro-*.md 2>/dev/null | head -1)

if [ -f "$LATEST_RETRO" ]; then
  IMPROVE=$(grep -A 20 "^## What Could Improve" "$LATEST_RETRO" 2>/dev/null | head -15)
  if [ -n "$IMPROVE" ] && ! echo "$IMPROVE" | grep -q "filled by next session"; then
    echo "## Learnings from Last Session"
    echo "$IMPROVE"
    echo ""
  fi
fi

# 2. Most recent feedback memories (last 3, only unpromoted)
RECENT_FEEDBACK=$(ls -t memory/feedback_*.md 2>/dev/null | head -3)
if [ -n "$RECENT_FEEDBACK" ]; then
  echo "## Recent Feedback (apply these!)"
  for f in $RECENT_FEEDBACK; do
    NAME=$(grep "^name:" "$f" 2>/dev/null | head -1 | sed 's/name: //')
    DESC=$(grep "^description:" "$f" 2>/dev/null | head -1 | sed 's/description: //')
    if [ -n "$NAME" ]; then
      echo "- **$NAME**: $DESC"
    fi
  done
  echo ""
fi

# 3. Last 3 errors from errors.md
if [ -f "memory/episodisch/fehler/errors.md" ]; then
  RECENT_ERRORS=$(tail -10 memory/episodisch/fehler/errors.md 2>/dev/null)
  if [ -n "$RECENT_ERRORS" ]; then
    echo "## Recent Error Patterns"
    echo "$RECENT_ERRORS"
    echo ""
  fi
fi

# === AutoDream Trigger Check (Counter-only, kein date-Parsing auf Windows) ===
COUNTER_FILE="C:/bescout-app/.claude/session-counter"
COUNT=$(cat "$COUNTER_FILE" 2>/dev/null || echo 0)

if [ "$COUNT" -ge 5 ]; then
  echo ""
  echo "## AutoDream: Memory Consolidation faellig ($COUNT Sessions)"
  echo "→ Starte AutoDream Subagent um Memory zu konsolidieren"
  echo ""
fi

if [ "$COUNT" -gt 0 ] && [ $((COUNT % 10)) -eq 0 ]; then
  echo ""
  echo "## Improvement Review faellig (Session #$COUNT)"
  echo "→ Nutze /improve um letzte 10 Sessions zu analysieren"
  echo ""
fi

exit 0
