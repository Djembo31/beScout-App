#!/usr/bin/env bash
# SHIP-Loop: Stage-Timer — log stage-transitions to worklog/metrics/stages.jsonl.
# PostToolUse on Edit/Write of worklog/active.md.
# Non-blocking. Data-source for /metrics skill.

set -u

JSON_INPUT="$(cat)"
FILE_PATH="$(echo "$JSON_INPUT" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"

# Only trigger on active.md edits
[ -z "$FILE_PATH" ] && exit 0
case "$FILE_PATH" in
    */worklog/active.md) ;;
    *) exit 0 ;;
esac

REPO_ROOT="$(cd "$(dirname "$0")/../.." 2>/dev/null && pwd)"
ACTIVE="$REPO_ROOT/worklog/active.md"
METRICS_DIR="$REPO_ROOT/worklog/metrics"
STAGES_LOG="$METRICS_DIR/stages.jsonl"
LAST_STATE="$METRICS_DIR/.last-stage.txt"

[ ! -f "$ACTIVE" ] && exit 0

mkdir -p "$METRICS_DIR" 2>/dev/null

# Read current state from active.md
STATUS="$(sed -n 's/^status:[[:space:]]*\(.*\)$/\1/p' "$ACTIVE" | head -1 | tr -d '\r')"
SLICE="$(sed -n 's/^slice:[[:space:]]*\(.*\)$/\1/p' "$ACTIVE" | head -1 | tr -d '\r')"
STAGE="$(sed -n 's/^stage:[[:space:]]*\(.*\)$/\1/p' "$ACTIVE" | head -1 | tr -d '\r')"

# Skip if idle or empty
[ "$STATUS" = "idle" ] && exit 0
[ -z "$SLICE" ] || [ "$SLICE" = "—" ] && exit 0
[ -z "$STAGE" ] || [ "$STAGE" = "—" ] && exit 0

CURRENT_KEY="${SLICE}|${STAGE}"
NOW_TS="$(date +%s)"
NOW_ISO="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# Read previous state
PREV_KEY=""
PREV_TS="$NOW_TS"
if [ -f "$LAST_STATE" ]; then
    PREV_KEY="$(sed -n '1p' "$LAST_STATE" 2>/dev/null | tr -d '\r')"
    PREV_TS="$(sed -n '2p' "$LAST_STATE" 2>/dev/null | tr -d '\r')"
    [ -z "$PREV_TS" ] && PREV_TS="$NOW_TS"
fi

# No change → no log
[ "$CURRENT_KEY" = "$PREV_KEY" ] && exit 0

# Compute duration since previous transition
DURATION=$(( NOW_TS - PREV_TS ))
PREV_SLICE="${PREV_KEY%%|*}"
PREV_STAGE="${PREV_KEY##*|}"

# Write JSONL entry
cat >> "$STAGES_LOG" <<EOF
{"ts":"$NOW_ISO","slice":"$SLICE","stage":"$STAGE","prev_slice":"$PREV_SLICE","prev_stage":"$PREV_STAGE","duration_sec":$DURATION}
EOF

# Update last-state cache
printf '%s\n%s\n' "$CURRENT_KEY" "$NOW_TS" > "$LAST_STATE"

exit 0
