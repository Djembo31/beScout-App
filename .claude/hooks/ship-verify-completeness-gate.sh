#!/usr/bin/env bash
# SHIP-Loop Slice 257 (D60): WARN bei State-Switch-Slice-Commit ohne 3-Phasen-Verify.
#
# Trigger: PreToolUse Bash auf `git commit` mit feat(/fix(/refactor( prefix.
# Wirkung: Liest active.md → SLICE → spec-Title → wenn State-Switch-Keyword,
#          pruefe Proof-File auf alle 3 D60-Phasen (fresh / forward / re-switch).
#          WARN-only (analog ship-spec-quality-gate), exit 0.
#
# Zweck (D60): Slice 254 v1 deployte alle Frontend-Heals, Reviewer mergeable,
# vitest gruen — aber Re-Switch-Race blieb bis Live-Verify entdeckt. Ohne diesen
# Hook ist "Re-Switch in Verify nicht getestet" eine Lücke die schlummert.
#
# Skip:
#   - emergency-Slice
#   - active.md idle (kein Slice-Context)
#   - non-feat/fix/refactor Commits
#   - Slice ohne State-Switch-Keyword (kein Detection-Trigger)
#   - amend / merge commits
#
# Detection-Strategy:
#   - State-Switch-Keywords im spec-Title: Liga|Country|Tab|Locale|Theme|Switch|Toggle|Re-Switch
#   - Phase-Keywords im Proof-File: (fresh|forward|re-switch) ODER (Phase 1|Phase 2|Phase 3)
#   - Konservativ: false-negative besser als false-positive bei WARN-only.

set -u

JSON_INPUT="$(cat)"
COMMAND="$(echo "$JSON_INPUT" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)"[[:space:]]*}.*/\1/p' | head -1)"
if [ -z "$COMMAND" ]; then
    COMMAND="$(echo "$JSON_INPUT" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
fi
[ -z "$COMMAND" ] && exit 0

# Trigger nur auf `git commit` (command-token-anchor, no substring)
case "$COMMAND" in
    "git commit"|"git commit "*) ;;
    *) exit 0 ;;
esac

# Skip merge + amend
case "$COMMAND" in
    "git merge"|"git merge "*) exit 0 ;;
esac
UNQUOTED_CMD="$(echo "$COMMAND" | sed 's/"[^"]*"//g' | sed "s/'[^']*'//g")"
case "$UNQUOTED_CMD" in
    *"--amend"*) exit 0 ;;
esac

# Detect commit-msg-prefix — heredoc-resistant via `[(:]` suffix anchor
MSG_PREFIX="$(echo "$COMMAND" | grep -oE "(feat|fix|refactor)[(:][^[:space:]]*" | head -1)"
if [ -z "$MSG_PREFIX" ]; then
    MSG_PREFIX="$(echo "$COMMAND" | sed -n 's/.*-m[[:space:]]*[\"'\'']\([^\"'\'']*\).*/\1/p' | head -1 | grep -oE "^(feat|fix|refactor)[^[:space:]]*")"
fi
case "$MSG_PREFIX" in
    feat*|fix*|refactor*) ;;
    *) exit 0 ;;
esac

REPO_ROOT="$(cd "$(dirname "$0")/../.." 2>/dev/null && pwd)"
ACTIVE="$REPO_ROOT/worklog/active.md"
[ ! -f "$ACTIVE" ] && exit 0

SLICE="$(sed -n 's/^slice:[[:space:]]*\(.*\)$/\1/p' "$ACTIVE" | head -1 | tr -d ' ')"
case "$SLICE" in
    ""|"—"|"-") exit 0 ;;
    emergency-*) exit 0 ;;
esac

# Find spec-File for this slice
SPEC_FILE=""
for f in "$REPO_ROOT"/worklog/specs/${SLICE}-*.md; do
    [ -f "$f" ] && SPEC_FILE="$f" && break
done
[ -z "$SPEC_FILE" ] && exit 0

# State-Switch-Detection: keywords in spec-Title (first 3 lines, case-insensitive)
SPEC_HEAD="$(head -3 "$SPEC_FILE")"
if ! echo "$SPEC_HEAD" | grep -qiE "(Liga|Country|Tab|Locale|Theme|Switch|Toggle|Re-?Switch)"; then
    # Kein State-Switch-Keyword erkannt → Hook nicht relevant
    exit 0
fi

# Slice IST State-Switch — pruefe ob Proof-File 3 Phasen dokumentiert
PROOF_FILES=()
while IFS= read -r p; do
    [ -n "$p" ] && PROOF_FILES+=("$p")
done < <(ls -1 "$REPO_ROOT"/worklog/proofs/${SLICE}-*.md "$REPO_ROOT"/worklog/proofs/${SLICE}-*.txt 2>/dev/null)

if [ ${#PROOF_FILES[@]} -eq 0 ]; then
    cat >&2 <<EOF
SHIP-VERIFY-COMPLETENESS (D60): WARNUNG (Commit erlaubt).
  Slice $SLICE ist State-Switch-Slice (Spec-Title: $(head -1 "$SPEC_FILE"))
  Aber: kein Proof-File worklog/proofs/${SLICE}-*.{md,txt} gefunden.

  D60 verlangt bei State-Switch-Slices Live-Verify mit 3 Phasen:
    1. Fresh-Init (Page-Load mit cleared state)
    2. A→B Switch (Forward)
    3. B→A Re-Switch (kritischste — deckt prevRef-Bugs + Cache-Race)

  Hook-Quelle: .claude/hooks/ship-verify-completeness-gate.sh
EOF
    exit 0
fi

# Suche nach 3-Phasen-Indikatoren ueber alle proof-Files dieses Slices
PHASE_FRESH=0
PHASE_FORWARD=0
PHASE_RESWITCH=0

for pf in "${PROOF_FILES[@]}"; do
    grep -qiE "(fresh|Phase 1|Phase-1|Phase\(1\))" "$pf" && PHASE_FRESH=1
    grep -qiE "(forward|A.{0,3}B|A->B|A → B|Phase 2|Phase-2)" "$pf" && PHASE_FORWARD=1
    grep -qiE "(re-?switch|B.{0,3}A|B->A|B → A|Phase 3|Phase-3)" "$pf" && PHASE_RESWITCH=1
done

MISSING=""
[ "$PHASE_FRESH" -eq 0 ] && MISSING="${MISSING}Phase 1 (Fresh-Init); "
[ "$PHASE_FORWARD" -eq 0 ] && MISSING="${MISSING}Phase 2 (A→B Switch); "
[ "$PHASE_RESWITCH" -eq 0 ] && MISSING="${MISSING}Phase 3 (B→A Re-Switch); "

if [ -n "$MISSING" ]; then
    cat >&2 <<EOF
SHIP-VERIFY-COMPLETENESS (D60): WARNUNG (Commit erlaubt).
  Slice $SLICE State-Switch-Slice (Spec: $(basename "$SPEC_FILE"))
  Proof-Files: ${PROOF_FILES[*]}

  Fehlende D60-Phasen im Proof:
    $MISSING

  Bitte ergaenzen — Phase 3 (Re-Switch) ist kritischster Test.
  Decision-Source: memory/decisions.md D60.
  Hook-Quelle: .claude/hooks/ship-verify-completeness-gate.sh
EOF
fi

exit 0
