#!/usr/bin/env bash
# SHIP-Loop: Block `git commit` with feat(/fix( message if active slice has no proof.
# Exempt: emergency slices, merge commits, non-feat/fix messages.

set -u

JSON_INPUT="$(cat)"
COMMAND="$(echo "$JSON_INPUT" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)"[[:space:]]*}.*/\1/p' | head -1)"

# Fallback simpler extract
if [ -z "$COMMAND" ]; then
    COMMAND="$(echo "$JSON_INPUT" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
fi

[ -z "$COMMAND" ] && exit 0

# Only act on git commit commands
case "$COMMAND" in
    *"git commit"*) ;;
    *) exit 0 ;;
esac

# Skip merge commits / rebase
case "$COMMAND" in
    *"--amend"*) exit 0 ;;
    *"merge"*)   exit 0 ;;
esac

# Extract commit message (look for -m "..." pattern)
MSG="$(echo "$COMMAND" | sed -n 's/.*-m[[:space:]]*[\"'\'']\([^\"'\'']*\).*/\1/p' | head -1)"

# Also check for heredoc pattern
case "$COMMAND" in
    *"<<"*)
        # heredoc — skip, user knows what they do
        exit 0 ;;
esac

[ -z "$MSG" ] && exit 0

# Only act on feat/fix/refactor
case "$MSG" in
    feat*|fix*|refactor*) ;;
    *) exit 0 ;;
esac

REPO_ROOT="$(cd "$(dirname "$0")/../.." 2>/dev/null && pwd)"
ACTIVE="$REPO_ROOT/worklog/active.md"

# No active.md → warn only
if [ ! -f "$ACTIVE" ]; then
    echo "SHIP-PROOF-GATE: Warnung: worklog/active.md fehlt, Commit erlaubt aber Slice-Tracking leidet." >&2
    exit 0
fi

SLICE="$(sed -n 's/^slice:[[:space:]]*\(.*\)$/\1/p' "$ACTIVE" | head -1)"
PROOF="$(sed -n 's/^proof:[[:space:]]*\(.*\)$/\1/p' "$ACTIVE" | head -1)"

# Emergency → warn only
case "$SLICE" in
    emergency-*)
        echo "SHIP-PROOF-GATE: Emergency-Slice — Commit erlaubt. Proof nachtraeglich!" >&2
        exit 0 ;;
esac

# No proof → block
if [ -z "$PROOF" ] || [ "$PROOF" = "—" ] || [ "$PROOF" = "pending" ]; then
    echo "SHIP-PROOF-GATE: Commit blockiert." >&2
    echo "  Commit: $MSG" >&2
    echo "  Grund: Active Slice hat keinen Proof (proof=$PROOF)." >&2
    echo "  Fix: /ship prove (erzeugt Proof-Artefakt) ODER /ship emergency wenn Notfall." >&2
    exit 2
fi

# Verify proof file exists (strip path prefix if relative)
PROOF_PATH="$PROOF"
case "$PROOF_PATH" in
    /*) ;;
    *) PROOF_PATH="$REPO_ROOT/$PROOF_PATH" ;;
esac

if [ ! -f "$PROOF_PATH" ]; then
    echo "SHIP-PROOF-GATE: Commit blockiert." >&2
    echo "  proof: $PROOF" >&2
    echo "  Grund: Proof-Datei existiert nicht am angegebenen Pfad." >&2
    echo "  Fix: Erzeuge Proof oder korrigiere Pfad in worklog/active.md." >&2
    exit 2
fi

exit 0
