#!/usr/bin/env bash
# capture-correction.sh — Captures user corrections for later review via /reflect.
# UserPromptSubmit hook. Appends to learnings-queue.jsonl.
#
# Slice 234 Heal: Fixed stdin-JSON-Parse (was env-var-based, never fired).
# Pattern from ship-status-gate.sh / ship-phase-gate.sh.

set -u

QUEUE="C:/bescout-app/.claude/learnings-queue.jsonl"

# Read JSON from stdin (Claude Code UserPromptSubmit event-format)
JSON_INPUT="$(cat 2>/dev/null || echo '{}')"

# Extract prompt-text from JSON (tolerant: env-var fallback for manual testing)
PROMPT="$(echo "$JSON_INPUT" | sed -n 's/.*"prompt"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
if [ -z "$PROMPT" ]; then
  PROMPT="${CLAUDE_USER_PROMPT:-}"
fi
[ -z "$PROMPT" ] && exit 0

# Slice 234 Reviewer-F-04 Heal: MSYS Git Bash `tr '[:upper:]' '[:lower:]'` ist
# nicht UTF-8-aware (Großbuchstabe `Ö` bleibt `Ö`, matcht `ö` nicht). Fix:
# (1) LC_ALL für UTF-8-aware tr falls verfügbar, (2) dual-Pattern (lower + upper).
LOW="$(LC_ALL=C.UTF-8 echo "$PROMPT" | LC_ALL=C.UTF-8 tr '[:upper:]' '[:lower:]' 2>/dev/null || echo "$PROMPT" | tr '[:upper:]' '[:lower:]')"
# Match auf BOTH lower-PROMPT AND raw-PROMPT (für Multi-Byte-Capitalisation):
if echo "$LOW" | grep -qE "(nein[, ]|nicht so|falsch|stattdessen|eigentlich[, ]|hoer auf|hör auf|das war|korrektur|no[, ].*instead|wrong|don.t do|stop doing)" \
   || echo "$PROMPT" | grep -qiE "(NEIN|NICHT SO|FALSCH|STATTDESSEN|HÖR AUF|HOER AUF|DAS WAR|KORREKTUR)"; then
  TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  # Truncate to 500 chars + JSON-escape (backslash, quote, tab, newline)
  ESCAPED="$(echo "$PROMPT" | head -c 500 | sed 's/\\/\\\\/g; s/"/\\"/g' | tr '\t' ' ' | tr '\n' ' ')"
  echo "{\"ts\":\"$TIMESTAMP\",\"type\":\"correction\",\"text\":\"$ESCAPED\"}" >> "$QUEUE"
fi

exit 0
