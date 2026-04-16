#!/usr/bin/env bash
# SHIP-Loop: Block creation of new memory/project_*.md files.
# Enforces: only ONE active meta-plan. Archive old before new.

set -u

JSON_INPUT="$(cat)"
FILE_PATH="$(echo "$JSON_INPUT" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"

[ -z "$FILE_PATH" ] && exit 0

NORM_PATH="$(echo "$FILE_PATH" | sed 's|^[A-Za-z]:||' | sed 's|\\|/|g')"

# Only trigger on new project_*.md files in memory/ (not archive)
case "$NORM_PATH" in
    */memory/project_*.md) ;;
    *) exit 0 ;;
esac

case "$NORM_PATH" in
    */memory/_archive/*) exit 0 ;;
esac

# Check if file already exists (Write on existing is Edit, allowed)
if [ -f "$FILE_PATH" ]; then
    exit 0
fi

REPO_ROOT="$(cd "$(dirname "$0")/../.." 2>/dev/null && pwd)"

# Count existing project_*.md files (not archive)
EXISTING=$(find "$REPO_ROOT/memory" -maxdepth 1 -name 'project_*.md' 2>/dev/null | wc -l | tr -d ' ')

if [ "$EXISTING" -ge "2" ]; then
    echo "SHIP-META-BLOCK: Neue memory/project_*.md blockiert." >&2
    echo "  File: $FILE_PATH" >&2
    echo "  Grund: Bereits $EXISTING aktive Meta-Plaene. Max. 1-2 erlaubt." >&2
    echo "  Fix: Verschiebe abgeschlossene Projekte nach memory/_archive/ bevor neue anlegen." >&2
    exit 2
fi

# Warn even when under limit
echo "SHIP-META-WARN: Neues Meta-Plan-File wird angelegt." >&2
echo "  Regel: Max. 1-2 aktive Meta-Plaene. Archiviere sobald abgeschlossen." >&2
exit 0
