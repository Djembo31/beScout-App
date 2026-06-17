#!/bin/bash
# inject-context-on-compact.sh — Compaction Shield
# PreCompact hook — injects critical context (active slice + handoff + knowledge routing)
# into the post-compaction window so the SHIP-Loop survives a compaction.
# (E0-W3b: Jarvis working-memory.md snapshot-write entfernt — nichts las den Dump;
#  Quelle der Wahrheit ist active.md + session-handoff.md + docs/knowledge/INDEX.md.)

cd "C:/bescout-app" || exit 0

SESSION_FILES=".claude/session-files.txt"

# Output to stdout for Claude's context window
echo "=== COMPACTION SHIELD ==="
echo ""
echo "## Aktueller Slice"
if [ -f "worklog/active.md" ]; then
  head -15 "worklog/active.md"
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
echo "## Wissens-Routing: docs/knowledge/INDEX.md (consult_when — Routing-SSOT)"
echo "=== END COMPACTION SHIELD ==="
