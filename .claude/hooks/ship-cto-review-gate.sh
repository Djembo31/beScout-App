#!/usr/bin/env bash
# SHIP-Loop: Block `git commit` with feat(/fix(/refactor( message when the
# active slice has no reviewer artifact at worklog/reviews/<slice>-review.md.
#
# Rationale: "Reviewer-Agent as default after BUILD" — prevents commits that
# skipped the cold-context review step (Session 2026-04-22 self-assessment gap #1).
#
# Exempt:
#   - emergency slices (slice: emergency-<timestamp>)
#   - amend + merge commits
#   - non-feat/fix/refactor messages (docs/chore/style/test/session)
#   - slices where active.md is idle (no code-change context)
#
# IMPORTANT: Unlike ship-proof-gate, this hook does NOT exempt heredoc commits —
# heredoc was a documented backdoor that let reviewer-less commits through.

set -u

# EFFORT GATE: skip on medium/low effort sessions (silent)
source "$(dirname "$0")/lib/effort-guard.sh"

JSON_INPUT="$(cat)"
COMMAND="$(echo "$JSON_INPUT" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)"[[:space:]]*}.*/\1/p' | head -1)"
if [ -z "$COMMAND" ]; then
    COMMAND="$(echo "$JSON_INPUT" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
fi

[ -z "$COMMAND" ] && exit 0

# Only act on commands that START with `git commit` (command-token-anchor,
# not substring). Prevents bash test-scripts with fixture strings like
# `git commit -m \"fix(x): y\"` from false-triggering the hook.
case "$COMMAND" in
    "git commit"|"git commit "*) ;;
    *) exit 0 ;;
esac

# Skip real merge commands + amend commits.
# Use command-token anchoring instead of raw substring match — commit messages
# containing "git merge" or "--amend" as text would false-exempt otherwise.
case "$COMMAND" in
    "git merge"|"git merge "*) exit 0 ;;
esac

# Strip quoted string content before checking for --amend flag — prevents
# false-exempt on `git commit -m "docs: add --amend help"`.
UNQUOTED_CMD="$(echo "$COMMAND" | sed 's/"[^"]*"//g' | sed "s/'[^']*'//g")"
case "$UNQUOTED_CMD" in
    *"--amend"*) exit 0 ;;
esac

# Detect message prefix — handles both inline `-m "feat(..."` and heredoc
# `-m "$(cat <<EOF ... feat(...: ... EOF )"` patterns.
# Strategy: grep the whole COMMAND string for the first feat|fix|refactor token
# followed by a `(` (scope) or `:` (no scope).
# No `\b` anchor: JSON-escaped heredoc bodies look like `\\nfeat(...` where the
# char before `feat` is the word-char `n` (from `\n` escape), which blocks `\b`.
# The `[(:]` suffix still prevents false positives on `feature` / `fixation`.
MSG_PREFIX="$(echo "$COMMAND" | grep -oE "(feat|fix|refactor)[(:][^[:space:]]*" | head -1)"

# Also try inline `-m "..."` extraction for safety
if [ -z "$MSG_PREFIX" ]; then
    MSG_PREFIX="$(echo "$COMMAND" | sed -n 's/.*-m[[:space:]]*[\"'\'']\([^\"'\'']*\).*/\1/p' | head -1 | grep -oE "^(feat|fix|refactor)[^[:space:]]*")"
fi

case "$MSG_PREFIX" in
    feat*|fix*|refactor*) ;;
    *) exit 0 ;;
esac

REPO_ROOT="$(cd "$(dirname "$0")/../.." 2>/dev/null && pwd)"
ACTIVE="$REPO_ROOT/worklog/active.md"

# No active.md → allow (legacy repo state)
[ ! -f "$ACTIVE" ] && exit 0

SLICE="$(sed -n 's/^slice:[[:space:]]*\(.*\)$/\1/p' "$ACTIVE" | head -1 | tr -d ' ')"

# Emergency slice → allow with warn (symmetric to proof-gate)
case "$SLICE" in
    emergency-*)
        echo "SHIP-REVIEW-GATE: Emergency-Slice — Commit erlaubt. Review nachtraeglich!" >&2
        exit 0 ;;
esac

# No slice set (idle state) → allow — this catches tooling/docs commits
case "$SLICE" in
    ""|"—"|"-") exit 0 ;;
esac

REVIEW_FILE="$REPO_ROOT/worklog/reviews/${SLICE}-review.md"

if [ ! -f "$REVIEW_FILE" ]; then
    cat >&2 <<EOF
SHIP-REVIEW-GATE: Commit blockiert.
  Commit-Msg-Prefix: $MSG_PREFIX
  Active Slice:      $SLICE
  Erwartete Datei:   worklog/reviews/${SLICE}-review.md (fehlt)

  Reviewer ist Pflicht nach BUILD bei feat/fix/refactor. Cold-Context
  pruefung fängt Blindspots die ich (Primary-Claude) nicht sehe.

  Optionen:
  1. Reviewer-Agent dispatchen (empfohlen):
       Agent({
         subagent_type: "reviewer",
         description: "Review Slice ${SLICE}",
         prompt: "Lies worklog/specs/${SLICE}-*.md und den git diff fuer
                  Slice ${SLICE}. Pruefe gegen .claude/rules/common-errors.md,
                  memory/patterns.md, business.md.

                  Schreibe nach worklog/reviews/${SLICE}-review.md:
                  - verdict: PASS | REWORK | FAIL | CONCERNS
                  - findings: [{severity, location, issue, fix}]

                  Keine Code-Aenderungen, read-only."
       })

  2. /cto-review Skill (wenn viel Context gebraucht)

  3. Notfall-Bypass (XS/trivial oder emergency):
       touch worklog/reviews/${SLICE}-review.md

  Hook-Quelle: .claude/hooks/ship-cto-review-gate.sh
EOF
    exit 2
fi

# Slice 211 D50: Verdict-Schema-Enforcement (WARN, nicht BLOCK).
# Reviewer-File existiert — pruefe ob ein Verdict-String drin steht.
# Tolerant gegen Bold-Markdown-Variation: `**Verdict:**`, `Verdict:`, `## Verdict`.
if ! grep -qiE "(\*\*)?[Vv]erdict(\*\*)?[[:space:]]*:[[:space:]]*(\*\*)?(PASS|REWORK|FAIL|CONCERNS)" "$REVIEW_FILE"; then
    cat >&2 <<EOF
SHIP-REVIEW-GATE: Verdict-Schema-WARNING (Commit erlaubt).
  Active Slice:      $SLICE
  Datei:             worklog/reviews/${SLICE}-review.md
  Problem:           Kein Verdict-String erkannt (PASS|REWORK|FAIL|CONCERNS).

  Sollte enthalten (Bold optional):
    **Verdict:** PASS | REWORK | FAIL | CONCERNS

  Slice 211 D50 — kein Block, nur Hinweis. Reviewer-Output ohne klares
  Verdict ist nutzlos fuer Audit-Trail. Bei naechstem Reviewer-Dispatch
  bitte Format einhalten.

  Hook-Quelle: .claude/hooks/ship-cto-review-gate.sh
EOF
    # WARN, kein exit 2 — wir wollen nicht legitime Commits blockieren
    # weil der Reviewer-Output minimal abweicht.
fi

exit 0
