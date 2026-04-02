#!/bin/bash
# capture-correction.sh — Captures user corrections for later review via /reflect
# UserPromptSubmit hook. Appends to learnings-queue.jsonl.

QUEUE="C:/bescout-app/.claude/learnings-queue.jsonl"

# Read user prompt from environment or stdin
INPUT="${CLAUDE_USER_PROMPT:-}"
if [ -z "$INPUT" ]; then
  exit 0
fi

# Check for correction patterns (German + English)
if echo "$INPUT" | grep -iE "(nein[, ]|nicht so|falsch|stattdessen|eigentlich[, ]|hoer auf|das war|no[, ].*instead|wrong|don.t do|stop doing)" > /dev/null 2>&1; then
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  # Truncate and escape for JSON safety
  ESCAPED=$(echo "$INPUT" | head -c 500 | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g' | tr '\n' ' ')
  echo "{\"ts\":\"$TIMESTAMP\",\"type\":\"correction\",\"text\":\"$ESCAPED\"}" >> "$QUEUE"
fi

exit 0
