#!/usr/bin/env bash
# SHIP-Loop: Block `git commit` with feat(/fix(/refactor( message if active slice has no proof.
#
# Exempt:
#   - emergency slices (slice: emergency-<timestamp>)
#   - amend + real merge commits (git merge <ref>, --merge flag)
#   - non-feat/fix/refactor messages (docs/chore/style/test/session)
#
# IMPORTANT: Heredoc commits (`-m "$(cat <<EOF ... EOF)"`) are NOT exempt anymore.
# Prior heredoc-exempt was a documented backdoor (Slice 146, symmetric to 145).

set -u

JSON_INPUT="$(cat)"
COMMAND="$(echo "$JSON_INPUT" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)"[[:space:]]*}.*/\1/p' | head -1)"

# Fallback simpler extract
if [ -z "$COMMAND" ]; then
    COMMAND="$(echo "$JSON_INPUT" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
fi

[ -z "$COMMAND" ] && exit 0

# Only act on commands that START with `git commit` (command-token-anchor,
# not substring) — otherwise bash test-scripts containing fixture strings like
# `git commit -m \"fix(x): y\"` would false-trigger the hook.
case "$COMMAND" in
    "git commit"|"git commit "*) ;;
    *) exit 0 ;;
esac

# Skip real merge commands + amend commits.
# Use command-token anchoring (start of command for `git merge`, unquoted
# substring for `--amend`) instead of raw substring match — otherwise commit
# messages containing "git merge" or "--amend" as text would false-exempt.
case "$COMMAND" in
    "git merge"|"git merge "*) exit 0 ;;
esac

# Strip all quoted string content before checking for --amend flag.
# This prevents false-exempt on `git commit -m "docs: add --amend help"`.
UNQUOTED_CMD="$(echo "$COMMAND" | sed 's/"[^"]*"//g' | sed "s/'[^']*'//g")"
case "$UNQUOTED_CMD" in
    *"--amend"*) exit 0 ;;
esac

# Detect commit message prefix — handles both inline `-m "feat(..."` and
# heredoc `-m "$(cat <<EOF ... feat(...: ... EOF )"` patterns.
# Strategy: grep the whole COMMAND string for the first feat|fix|refactor token
# followed by `(` (scope) or `:` (no scope).
# No `\b` anchor: JSON-escaped heredoc bodies look like `\\nfeat(...` where the
# char before `feat` is the word-char `n`, which blocks `\b`. The `[(:]` suffix
# still prevents false positives on words like `feature` or `fixation`.
MSG="$(echo "$COMMAND" | grep -oE "(feat|fix|refactor)[(:][^[:space:]]*" | head -1)"

# Fallback: inline -m "..." extraction (for cases without matching prefix-anchor)
if [ -z "$MSG" ]; then
    MSG="$(echo "$COMMAND" | sed -n 's/.*-m[[:space:]]*[\"'\'']\([^\"'\'']*\).*/\1/p' | head -1)"
fi

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
