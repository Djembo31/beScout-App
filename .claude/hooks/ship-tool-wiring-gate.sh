#!/usr/bin/env bash
# SHIP-Loop Slice 234 (D54): Block `git commit` with feat(/fix(/refactor( when
# `audit:wiring:check` reports real-drift orphans.
#
# Rationale: D53 codified "Build-without-Wire ist verboten". This hook enforces
# it architecturally — Tools/Hooks/Scripts must be wired (CI/Cron/Hook) BEFORE
# commit. KNOWN_ORPHANS allowlist in scripts/wiring-check.ts handles intentional
# manual-only tools.
#
# Trigger: PreToolUse Bash (commands starting with `git commit`).
# Wirkung: BLOCK exit 2 wenn audit:wiring:check exit ≠ 0.
#
# Skip:
#   - emergency-Slice
#   - amend-commits
#   - merge-commits
#   - non-feat/fix/refactor messages
#   - active.md idle
#
# Pattern: ship-cto-review-gate.sh (gleiche Detection-Logic).

set -u

JSON_INPUT="$(cat)"
COMMAND="$(echo "$JSON_INPUT" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)"[[:space:]]*}.*/\1/p' | head -1)"
if [ -z "$COMMAND" ]; then
    COMMAND="$(echo "$JSON_INPUT" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
fi

[ -z "$COMMAND" ] && exit 0

# Only act on `git commit` (token-anchor)
case "$COMMAND" in
    "git commit"|"git commit "*) ;;
    *) exit 0 ;;
esac

# Skip merge commits
case "$COMMAND" in
    "git merge"|"git merge "*) exit 0 ;;
esac

# Skip --amend (strip quoted strings first to prevent false-exempt)
UNQUOTED_CMD="$(echo "$COMMAND" | sed 's/"[^"]*"//g' | sed "s/'[^']*'//g")"
case "$UNQUOTED_CMD" in
    *"--amend"*) exit 0 ;;
esac

# Detect message prefix (analog ship-cto-review-gate)
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

# Emergency-Slice: WARN aber nicht BLOCK
case "$SLICE" in
    emergency-*)
        echo "SHIP-WIRING-GATE: Emergency-Slice — Commit erlaubt. Wiring nachtraeglich!" >&2
        exit 0 ;;
esac

# Idle: skip (kein Slice → kein Wiring-Anspruch)
case "$SLICE" in
    ""|"—"|"-") exit 0 ;;
esac

# Run audit:wiring:check
cd "$REPO_ROOT" || exit 0

# Check if pnpm is available; if not, skip silent (CI-only check)
if ! command -v pnpm >/dev/null 2>&1; then
    exit 0
fi

WIRING_OUTPUT="$(pnpm run audit:wiring:check 2>&1)"
WIRING_EXIT=$?

if [ $WIRING_EXIT -ne 0 ]; then
    # Extract real-drift orphans count from output
    DRIFT_LINE="$(echo "$WIRING_OUTPUT" | grep -oE "Real drift:[[:space:]]+[0-9]+" | head -1)"
    ORPHAN_LIST="$(echo "$WIRING_OUTPUT" | grep -E "^  • \[" | head -10)"

    cat >&2 <<EOF
SHIP-WIRING-GATE: Commit blockiert (Slice 234 D54 Build-without-Wire).
  Commit-Msg-Prefix: $MSG_PREFIX
  Active Slice:      $SLICE
  $DRIFT_LINE

  Drift-Orphans gefunden:
$ORPHAN_LIST

  D54 — neue Tools/Hooks/Scripts MUESSEN verkabelt sein BEVOR commit.

  Heal-Optionen:
  1. WIRE: Tool in passenden Trigger eintragen
       - Hook   → .claude/settings.json (entsprechendes Event)
       - Script → package.json npm-script + GHA/Cron/Hook-Aufruf
       - npm    → .github/workflows/*.yml step
  2. ARCHIVE: Tool ist obsolet → mv to .claude/hooks/archived/ oder löschen
  3. ALLOWLIST: Tool ist intentional manuell → KNOWN_ORPHANS-Entry in
                scripts/wiring-check.ts mit Begründung
  4. EMERGENCY-Bypass: nur bei Notfall-Slice ('emergency-<timestamp>')

  Detail-Report: worklog/audits/wiring-$(date +%Y-%m-%d).md
  Re-Run:        pnpm run audit:wiring

  Hook-Quelle: .claude/hooks/ship-tool-wiring-gate.sh
EOF
    exit 2
fi

exit 0
