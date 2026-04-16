#!/usr/bin/env bash
# SHIP-Loop: Block Edit/Write on critical paths without active slice.
# Critical paths: supabase/migrations/, src/lib/services/, src/lib/queries/
# Exempt: emergency slices, archive paths, test files.

set -u

JSON_INPUT="$(cat)"
FILE_PATH="$(echo "$JSON_INPUT" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"

# Empty file_path → not Edit/Write → allow
[ -z "$FILE_PATH" ] && exit 0

# Normalize path (strip leading drive letter for matching)
NORM_PATH="$(echo "$FILE_PATH" | sed 's|^[A-Za-z]:||' | sed 's|\\|/|g')"

# Critical path check
IS_CRITICAL=0
case "$NORM_PATH" in
    */supabase/migrations/*) IS_CRITICAL=1 ;;
    */src/lib/services/*)    IS_CRITICAL=1 ;;
    */src/lib/queries/*)     IS_CRITICAL=1 ;;
esac

# Exempt archive paths
case "$NORM_PATH" in
    */memory/_archive/*) IS_CRITICAL=0 ;;
    */node_modules/*)    IS_CRITICAL=0 ;;
esac

# If not critical → allow
[ "$IS_CRITICAL" -eq 0 ] && exit 0

# Find repo root (where worklog/ lives)
REPO_ROOT="$(cd "$(dirname "$0")/../.." 2>/dev/null && pwd)"
ACTIVE="$REPO_ROOT/worklog/active.md"

# No active.md → block
if [ ! -f "$ACTIVE" ]; then
    echo "SHIP-GATE: Edit auf kritischem Pfad blockiert." >&2
    echo "  File: $FILE_PATH" >&2
    echo "  Grund: worklog/active.md existiert nicht." >&2
    echo "  Fix: /ship new \"Task-Titel\" (startet Slice)." >&2
    exit 2
fi

# Check active slice state
STATUS="$(sed -n 's/^status:[[:space:]]*\(.*\)$/\1/p' "$ACTIVE" | head -1)"
STAGE="$(sed -n 's/^stage:[[:space:]]*\(.*\)$/\1/p' "$ACTIVE" | head -1)"
SLICE="$(sed -n 's/^slice:[[:space:]]*\(.*\)$/\1/p' "$ACTIVE" | head -1)"

# Emergency slice → allow (with warning)
case "$SLICE" in
    emergency-*)
        echo "SHIP-GATE: Emergency-Slice aktiv, Edit erlaubt (Spec nachholen!)." >&2
        exit 0
        ;;
esac

# Idle or no stage → block
if [ "$STATUS" = "idle" ] || [ -z "$STATUS" ] || [ "$STAGE" = "—" ] || [ -z "$STAGE" ]; then
    echo "SHIP-GATE: Edit auf kritischem Pfad blockiert." >&2
    echo "  File: $FILE_PATH" >&2
    echo "  Grund: Kein aktiver Slice (status=$STATUS, stage=$STAGE)." >&2
    echo "  Fix: /ship new \"Task-Titel\" ODER /ship emergency \"<Grund>\" fuer Notfall." >&2
    exit 2
fi

# Stage must be BUILD (or later) to allow code edits
case "$STAGE" in
    BUILD|PROVE|LOG) exit 0 ;;
    PICK|SPEC|IMPACT)
        echo "SHIP-GATE: Edit auf kritischem Pfad blockiert." >&2
        echo "  File: $FILE_PATH" >&2
        echo "  Grund: Slice ist in Stage '$STAGE', nicht BUILD." >&2
        echo "  Fix: Spec/Impact abschliessen, dann /ship build starten." >&2
        exit 2
        ;;
    *) exit 0 ;;
esac
