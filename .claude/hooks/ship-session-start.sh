#!/usr/bin/env bash
# SHIP-Loop: Lean 30-second session briefing.
# Replaces morning-briefing marathon. Output: 5-7 lines max.

cd "$(dirname "$0")/../.." || exit 0

REPO_ROOT="$(pwd)"
ACTIVE="$REPO_ROOT/worklog/active.md"

echo "═══ SHIP Briefing ═══"
echo ""

# Git state
BRANCH="$(git branch --show-current 2>/dev/null || echo unknown)"
UNCOMMITTED="$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
echo "Branch: $BRANCH   Uncommitted: $UNCOMMITTED Files"

# Active slice
if [ -f "$ACTIVE" ]; then
    STATUS="$(sed -n 's/^status:\s*\(.*\)$/\1/p' "$ACTIVE" | head -1)"
    SLICE="$(sed -n 's/^slice:\s*\(.*\)$/\1/p' "$ACTIVE" | head -1)"
    STAGE="$(sed -n 's/^stage:\s*\(.*\)$/\1/p' "$ACTIVE" | head -1)"
    echo "Active: $STATUS — $SLICE — $STAGE"
else
    echo "Active: (no worklog/active.md)"
fi

# Last log entry
LOG="$REPO_ROOT/worklog/log.md"
if [ -f "$LOG" ]; then
    LAST="$(grep -m1 '^## ' "$LOG" 2>/dev/null || echo '(leer)')"
    echo "Last Slice: $LAST"
fi

# tsc cache hint
TSC_CACHE="$REPO_ROOT/.tsc-last.txt"
if [ -f "$TSC_CACHE" ]; then
    TSC_STATUS="$(cat "$TSC_CACHE" 2>/dev/null | head -1)"
    echo "tsc: $TSC_STATUS"
fi

# Open worktrees (warn if any)
WORKTREES="$(git worktree list 2>/dev/null | wc -l | tr -d ' ')"
if [ "$WORKTREES" -gt 1 ]; then
    echo "!! Open worktrees: $WORKTREES (merge before new work)"
fi

echo ""
echo "Next: /ship status (details) oder /ship new \"Task\" (neuer Slice)"
echo "══════════════════════"

exit 0
