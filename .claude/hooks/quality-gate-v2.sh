#!/bin/bash
# quality-gate-v2.sh — Lightweight Stop Hook (Skynet)
# ONLY increments session counter. No tsc (too heavy, causes loop).
# tsc check happens manually via workflow, not on every Stop.

COUNTER_FILE="C:/bescout-app/.claude/session-counter"
if [ -f "$COUNTER_FILE" ]; then
  COUNT=$(cat "$COUNTER_FILE" 2>/dev/null || echo 0)
  echo $((COUNT + 1)) > "$COUNTER_FILE" 2>/dev/null
fi

exit 0
