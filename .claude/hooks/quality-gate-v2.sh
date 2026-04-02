#!/bin/bash
# quality-gate-v2.sh — Lightweight Stop Hook (Skynet)
# ONLY increments session counter. No tsc (too heavy for hook).

COUNTER_FILE="C:/bescout-app/.claude/session-counter"
COUNT=$(cat "$COUNTER_FILE" 2>/dev/null || echo 0)
echo $((COUNT + 1)) > "$COUNTER_FILE" 2>/dev/null

exit 0
