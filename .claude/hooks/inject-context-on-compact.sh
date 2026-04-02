#!/bin/bash
# inject-context-on-compact.sh — Compaction Shield for Jarvis Cortex
# Writes working memory before compaction + outputs critical context
# PreCompact hook — saves "Zettel auf dem Nachttisch"

cd "C:/bescout-app" || exit 0

WORKING_MEM="memory/working-memory.md"
SESSION_FILES=".claude/session-files.txt"
NOW=$(date +"%Y-%m-%d %H:%M")

# Write working memory file (Blackboard snapshot)
{
  echo "# Working Memory (pre-compaction $NOW)"
  echo ""

  # Sprint status
  echo "## Sprint"
  if [ -f "memory/semantisch/sprint/current.md" ]; then
    head -20 "memory/semantisch/sprint/current.md"
  fi
  echo ""

  # Session handoff
  echo "## Handoff"
  if [ -f "memory/session-handoff.md" ]; then
    cat "memory/session-handoff.md"
  fi
  echo ""

  # Files changed this session
  echo "## Files Changed This Session"
  if [ -f "$SESSION_FILES" ]; then
    sort -u "$SESSION_FILES"
  else
    echo "- Keine tracked"
  fi
  echo ""

  # Git state
  echo "## Git State"
  git status --porcelain 2>/dev/null | head -15
  echo ""
  echo "Last 3 commits:"
  git log --oneline -3 2>/dev/null

} > "$WORKING_MEM"

# Output to stdout for Claude's context window
echo "=== COMPACTION SHIELD ==="
echo ""
echo "## Sprint"
if [ -f "memory/semantisch/sprint/current.md" ]; then
  head -15 "memory/semantisch/sprint/current.md"
fi
echo ""
echo "## Session Handoff"
if [ -f "memory/session-handoff.md" ]; then
  cat "memory/session-handoff.md"
fi
echo ""
echo "## Files Changed"
if [ -f "$SESSION_FILES" ]; then
  sort -u "$SESSION_FILES"
fi
echo ""
echo "## Cortex Routing: memory/cortex-index.md"
echo "=== END COMPACTION SHIELD ==="
