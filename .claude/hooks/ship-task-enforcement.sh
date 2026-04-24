#!/usr/bin/env bash
# SHIP-Loop: TaskCreate-Enforcement Reminder.
# PreToolUse on Edit/Write to src/** during BUILD stage.
# Reminds once per slice when >= 3 files already changed.
# Non-blocking. Relies on Claude's discipline to run TaskCreate.

set -u

JSON_INPUT="$(cat)"
FILE_PATH="$(echo "$JSON_INPUT" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"

[ -z "$FILE_PATH" ] && exit 0

# Only trigger on src/** edits
NORM_PATH="$(echo "$FILE_PATH" | sed 's|^[A-Za-z]:||; s|\\|/|g')"
case "$NORM_PATH" in
    */src/*|*/supabase/*) ;;
    *) exit 0 ;;
esac

REPO_ROOT="$(cd "$(dirname "$0")/../.." 2>/dev/null && pwd)"
ACTIVE="$REPO_ROOT/worklog/active.md"
STATE_DIR="$REPO_ROOT/.claude/state"

[ ! -f "$ACTIVE" ] && exit 0

STAGE="$(sed -n 's/^stage:[[:space:]]*\(.*\)$/\1/p' "$ACTIVE" | head -1 | tr -d '\r')"
SLICE="$(sed -n 's/^slice:[[:space:]]*\(.*\)$/\1/p' "$ACTIVE" | head -1 | tr -d '\r')"

# Only during BUILD
[ "$STAGE" != "BUILD" ] && exit 0
[ -z "$SLICE" ] || [ "$SLICE" = "—" ] && exit 0

mkdir -p "$STATE_DIR" 2>/dev/null

# Sanitize slice-id for filename
SLICE_SAFE="$(echo "$SLICE" | tr -c '[:alnum:]' '_')"
WARNED_FLAG="$STATE_DIR/task-reminder-${SLICE_SAFE}.flag"

# Already warned for this slice → skip
[ -f "$WARNED_FLAG" ] && exit 0

# Count files changed in worktree + staged
CHANGED_COUNT="$(git -C "$REPO_ROOT" diff --name-only HEAD 2>/dev/null | wc -l | tr -d ' ')"
STAGED_COUNT="$(git -C "$REPO_ROOT" diff --name-only --cached 2>/dev/null | wc -l | tr -d ' ')"
TOTAL=$(( CHANGED_COUNT + STAGED_COUNT ))

[ "$TOTAL" -lt 3 ] && exit 0

touch "$WARNED_FLAG"

cat <<EOF
[TASK-ENFORCEMENT-GATE]
  Slice $SLICE: bereits $TOTAL Files geändert in BUILD-Stage.
  Reminder: Multi-Step-Arbeit ohne TaskList = Vergessen-Risk.
  → Nutze TaskCreate fuer verbleibende Sub-Steps (wenn noch >2 Schritte offen)
  → TaskList.md S-04 Failure-Mode: siehe memory/failures.md
  (Dieser Reminder erscheint 1x pro Slice.)
EOF

exit 0
