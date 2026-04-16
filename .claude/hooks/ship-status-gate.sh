#!/usr/bin/env bash
# SHIP-Loop: When user asks "status/fertig/stand", inject git log + active.md as evidence.
# Non-blocking. Output appended to prompt context via stdout.

set -u

JSON_INPUT="$(cat)"
PROMPT="$(echo "$JSON_INPUT" | sed -n 's/.*"prompt"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"

[ -z "$PROMPT" ] && exit 0

# Lowercase for pattern match
LOW="$(echo "$PROMPT" | tr '[:upper:]' '[:lower:]')"

# Check if prompt asks for status
TRIGGER=0
case "$LOW" in
    *"fertig"*|*"status"*|*"stand"*|*"wo sind wir"*|*"was steht"*|*"was ist offen"*|*"aktuell"*) TRIGGER=1 ;;
esac

[ "$TRIGGER" -eq 0 ] && exit 0

REPO_ROOT="$(cd "$(dirname "$0")/../.." 2>/dev/null && pwd)"

echo "[SHIP-STATUS-INJECTION] Evidenz aus Repo (Hook liefert, nicht Memory):"
echo ""
echo "=== git log --oneline -5 ==="
(cd "$REPO_ROOT" && git log --oneline -5 2>/dev/null || echo "(git log failed)")
echo ""
echo "=== git status --short ==="
(cd "$REPO_ROOT" && git status --short 2>/dev/null | head -15 || echo "(git status failed)")
echo ""
ACTIVE="$REPO_ROOT/worklog/active.md"
if [ -f "$ACTIVE" ]; then
    echo "=== worklog/active.md (Kopf) ==="
    head -15 "$ACTIVE"
    echo ""
fi

LOG="$REPO_ROOT/worklog/log.md"
if [ -f "$LOG" ]; then
    echo "=== worklog/log.md (letzte 3 Eintraege) ==="
    grep -A 5 '^## ' "$LOG" 2>/dev/null | head -30 || echo "(leer)"
fi

echo ""
echo "[Claude: Antworte auf Basis dieser Evidenz, nicht aus Memory. Stale Zahlen sind verboten.]"

exit 0
