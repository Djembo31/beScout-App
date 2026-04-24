#!/usr/bin/env bash
# SHIP-Loop: Parallel-Dispatch-Gate.
# PreToolUse on Edit/Write during BUILD stage.
# Warns when Solo-Claude edits >3 cross-domain Files — Parallel-Dispatch opportunity.
# Non-blocking. Session-once via cache flag.

set -u

JSON_INPUT="$(cat)"
FILE_PATH="$(echo "$JSON_INPUT" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"

[ -z "$FILE_PATH" ] && exit 0

REPO_ROOT="$(cd "$(dirname "$0")/../.." 2>/dev/null && pwd)"
ACTIVE="$REPO_ROOT/worklog/active.md"
STATE_DIR="$REPO_ROOT/.claude/state"
WARNED_FLAG="$STATE_DIR/parallel-dispatch-warned.flag"

[ ! -f "$ACTIVE" ] && exit 0

# Only warn during BUILD stage
STAGE="$(sed -n 's/^stage:[[:space:]]*\(.*\)$/\1/p' "$ACTIVE" | head -1 | tr -d '\r')"
[ "$STAGE" != "BUILD" ] && exit 0

# Session-once gate (reset on session-start by morning-briefing OR manual)
if [ -f "$WARNED_FLAG" ]; then
    # Reset if older than 8 hours (new session assumed)
    FLAG_AGE=$(( $(date +%s) - $(stat -c %Y "$WARNED_FLAG" 2>/dev/null || echo 0) ))
    if [ "$FLAG_AGE" -lt 28800 ]; then
        exit 0
    fi
    rm -f "$WARNED_FLAG"
fi

# Count changed files across domains via git diff
CHANGED="$(git -C "$REPO_ROOT" diff --name-only HEAD 2>/dev/null; git -C "$REPO_ROOT" diff --name-only --cached 2>/dev/null)"
# Include the file being edited (might be new)
CHANGED="$CHANGED
$FILE_PATH"

# Normalize + dedupe
CHANGED_UNIQ="$(echo "$CHANGED" | sed 's|^[A-Za-z]:||; s|\\|/|g' | sort -u | grep -v '^$')"
TOTAL="$(echo "$CHANGED_UNIQ" | grep -cv '^$')"
[ "$TOTAL" -lt 3 ] && exit 0

# Check domain presence
HAS_BACKEND=0
HAS_FRONTEND=0
HAS_DB=0

while IFS= read -r f; do
    case "$f" in
        */supabase/migrations/*|*supabase/migrations/*) HAS_DB=1 ;;
        */src/lib/services/*|src/lib/services/*|*/src/lib/queries/*|src/lib/queries/*) HAS_BACKEND=1 ;;
        */src/lib/scrapers/*|src/lib/scrapers/*|*/src/app/api/*|src/app/api/*) HAS_BACKEND=1 ;;
        */src/components/*|src/components/*|*/src/app/\(app\)/*|src/app/*|*/src/features/*|src/features/*) HAS_FRONTEND=1 ;;
        */messages/*|messages/*) HAS_FRONTEND=1 ;;
    esac
done <<EOF
$CHANGED_UNIQ
EOF

# Count domains (db counts as backend)
DOMAINS=$(( (HAS_BACKEND|HAS_DB) + HAS_FRONTEND ))

# Require >= 2 domains (backend+frontend) AND >= 3 files for warn
if [ "$DOMAINS" -lt 2 ]; then
    exit 0
fi

# Warn — output on stdout so Claude sees it
mkdir -p "$STATE_DIR" 2>/dev/null
touch "$WARNED_FLAG"

cat <<EOF
[PARALLEL-DISPATCH-GATE]
  Changed files: $TOTAL (cross-domain: backend=$((HAS_BACKEND|HAS_DB)), frontend=$HAS_FRONTEND)
  Seit Slice 085 (2026-04-21) Standard: 3+ Files cross-domain → Parallel-Dispatch.
  Konkret:
    - backend-Agent (Worktree) fuer supabase/migrations + src/lib/services
    - frontend-Agent (Worktree) fuer src/components + src/app
    - Merge nach Review
  Solo-Claude nur bei <3 Files ODER Money/Trading-Path.
  Siehe /parallel-dispatch Skill fuer Dispatch-Pattern.
  (Dieser Reminder erscheint 1x pro Session.)
EOF

exit 0
