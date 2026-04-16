#!/usr/bin/env bash
# SHIP-Loop: At Stop, detect audit-only slices (no code diff during session).
# Non-blocking. Warns via stderr so next session sees it.

set -u

REPO_ROOT="$(cd "$(dirname "$0")/../.." 2>/dev/null && pwd)"
ACTIVE="$REPO_ROOT/worklog/active.md"

[ ! -f "$ACTIVE" ] && exit 0

STATUS="$(sed -n 's/^status:[[:space:]]*\(.*\)$/\1/p' "$ACTIVE" | head -1)"
STAGE="$(sed -n 's/^stage:[[:space:]]*\(.*\)$/\1/p' "$ACTIVE" | head -1)"
SLICE="$(sed -n 's/^slice:[[:space:]]*\(.*\)$/\1/p' "$ACTIVE" | head -1)"

# Idle → nothing to check
[ "$STATUS" = "idle" ] && exit 0
[ -z "$STATUS" ] && exit 0

# Only check when slice claims to be in BUILD/PROVE/LOG stage
case "$STAGE" in
    BUILD|PROVE|LOG) ;;
    *) exit 0 ;;
esac

# Count code changes (excluding worklog/, memory/, .claude/)
CHANGES=$(cd "$REPO_ROOT" && git diff --name-only HEAD 2>/dev/null \
    | grep -v -E '^(worklog/|memory/|\.claude/|wiki/|README\.md|CLAUDE\.md)' \
    | wc -l | tr -d ' ')

if [ "$CHANGES" = "0" ]; then
    echo "!! SHIP-WARN: Slice '$SLICE' ist in Stage '$STAGE' aber hat 0 Code-Aenderungen." >&2
    echo "!! Audit-only Slices zaehlen nicht als Fortschritt." >&2
    echo "!! Fix: Entweder Code schreiben oder Slice als 'research-only' in log.md markieren." >&2
fi

exit 0
