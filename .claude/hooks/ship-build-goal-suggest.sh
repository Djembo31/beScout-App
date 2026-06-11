#!/usr/bin/env bash
# SHIP-Loop: BUILD-Stage `/goal` Suggester.
# PostToolUse on Edit/Write of worklog/active.md.
# Wenn Stage in BUILD wechselt, emittiert /goal-Vorschlag mit Slice-Acceptance-Criteria.
# Non-blocking. Session-once via cache flag.

set -u

# EFFORT GATE: nur bei high/xhigh — keine Bremse für quick edits
source "$(dirname "$0")/lib/effort-guard.sh"

JSON_INPUT="$(cat)"
FILE_PATH="$(echo "$JSON_INPUT" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"

[ -z "$FILE_PATH" ] && exit 0
case "$FILE_PATH" in
    */worklog/active.md) ;;
    *) exit 0 ;;
esac

REPO_ROOT="$(cd "$(dirname "$0")/../.." 2>/dev/null && pwd)"
ACTIVE="$REPO_ROOT/worklog/active.md"
METRICS_DIR="$REPO_ROOT/worklog/metrics"
LAST_STAGE="$METRICS_DIR/.last-stage.txt"
SUGGEST_CACHE="$METRICS_DIR/.goal-suggested.txt"

[ ! -f "$ACTIVE" ] && exit 0

# Read current state
STAGE="$(sed -n 's/^stage:[[:space:]]*\(.*\)$/\1/p' "$ACTIVE" | head -1 | tr -d '\r' | awk '{print $1}')"
SLICE="$(sed -n 's/^slice:[[:space:]]*\(.*\)$/\1/p' "$ACTIVE" | head -1 | tr -d '\r' | awk '{print $1}')"
SPEC="$(sed -n 's/^spec:[[:space:]]*\(.*\)$/\1/p' "$ACTIVE" | head -1 | tr -d '\r' | awk '{print $1}')"

[ -z "$STAGE" ] && exit 0
[ -z "$SLICE" ] && exit 0

# Trigger nur bei Übergang in BUILD
PREV_STAGE=""
[ -f "$LAST_STAGE" ] && PREV_STAGE="$(awk '{print $2}' "$LAST_STAGE" 2>/dev/null | tail -1)"

# Wenn schon einmal für diesen Slice suggested → still
if [ -f "$SUGGEST_CACHE" ]; then
  SUGGESTED_SLICE="$(cat "$SUGGEST_CACHE" 2>/dev/null)"
  [ "$SUGGESTED_SLICE" = "$SLICE" ] && exit 0
fi

# Nur feuern wenn aktuelle Stage = BUILD UND vorherige war nicht BUILD
case "$STAGE" in
  BUILD|build) ;;
  *) exit 0 ;;
esac

case "$PREV_STAGE" in
  BUILD|build) exit 0 ;;
esac

# Extrahiere ACs aus Spec-File
AC_COUNT=0
if [ -n "$SPEC" ] && [ -f "$REPO_ROOT/$SPEC" ]; then
  AC_COUNT=$(grep -cE '^AC-[0-9]+:' "$REPO_ROOT/$SPEC" 2>/dev/null || echo 0)
fi

# Cache: für diesen Slice nicht mehr suggesten
mkdir -p "$METRICS_DIR" 2>/dev/null
echo "$SLICE" > "$SUGGEST_CACHE"

# Emit suggestion to stderr (non-blocking)
echo "" >&2
echo "─── SHIP /goal Vorschlag (BUILD-Start für Slice $SLICE) ───" >&2
echo "" >&2
if [ "$AC_COUNT" -gt 0 ]; then
  echo "Spec hat $AC_COUNT Acceptance-Criteria. Empfohlener autonomer Run:" >&2
else
  echo "Empfohlener autonomer Run für BUILD-Stage:" >&2
fi
echo "" >&2
echo "/goal slice $SLICE BUILD complete: alle ACs aus $SPEC erfüllt UND pnpm exec tsc --noEmit grün UND CI=true pnpm exec vitest run grün UND worklog/proofs/${SLICE}-*.md existiert UND active.md stage=PROVE" >&2
echo "" >&2
echo "Vorteil: Claude läuft autonom Red→Green→Refactor→Proof bis Acceptance hält." >&2
echo "Hooks (spec-gate, cto-review-gate, proof-gate) verhindern Drift während Run." >&2
echo "Skip: wenn unsicherer Scope ODER große Spec-Änderungen erwartet." >&2
echo "" >&2
echo "──────────────────────────────────────────────────────────────" >&2

exit 0
