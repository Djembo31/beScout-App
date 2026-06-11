#!/usr/bin/env bash
# Stop hook — Nudge bei wachsender learnings-queue.
# Triggert wenn unprocessed-queue >= 5 oder drafts >= 5.
# Closes self-learning loop: reminds to run /reflect or /sign-off.

set -u

QUEUE="C:/bescout-app/.claude/learnings-queue.jsonl"
SHOWN="C:/bescout-app/.claude/learnings-shown.jsonl"
DRAFTS_DIR="C:/bescout-app/memory/learnings/drafts"

QUEUE_COUNT=0
[ -f "$QUEUE" ] && QUEUE_COUNT=$(wc -l < "$QUEUE" 2>/dev/null | tr -d ' ')

SHOWN_COUNT=0
[ -f "$SHOWN" ] && SHOWN_COUNT=$(wc -l < "$SHOWN" 2>/dev/null | tr -d ' ')

# Unprocessed = entries in queue but never shown
UNPROCESSED=$((QUEUE_COUNT - SHOWN_COUNT))
[ "$UNPROCESSED" -lt 0 ] && UNPROCESSED=0

DRAFT_COUNT=0
if [ -d "$DRAFTS_DIR" ]; then
  DRAFT_COUNT=$(find "$DRAFTS_DIR" -maxdepth 1 -name '*.md' -not -name '*PROMOTED*' 2>/dev/null | wc -l | tr -d ' ')
fi

MSG=""
if [ "$UNPROCESSED" -ge 5 ]; then
  MSG="${MSG}📚 Queue-Watch: $UNPROCESSED neue Korrekturen in learnings-queue.jsonl seit letztem /reflect.\n"
fi

if [ "$DRAFT_COUNT" -ge 5 ]; then
  MSG="${MSG}📑 Draft-Watch: $DRAFT_COUNT learnings-drafts warten auf /sign-off → MEMORY.md Promotion.\n"
fi

if [ -n "$MSG" ]; then
  echo ""
  echo "─── Self-Learning-Loop ───"
  echo -e "$MSG"
  echo "Nächste Session: erst /reflect (queue → drafts), dann /sign-off (drafts → MEMORY.md)"
  echo "───────────────────────────"
fi

exit 0
