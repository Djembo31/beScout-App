#!/bin/bash
# quality-gate-v2.sh — Enhanced Quality Gate (Skynet)
# Runs on Stop event. Exit 2 = block (agent continues), Exit 0 = pass.

# Guard against re-entrant firing (Stop hook loop)
LOCK_FILE="C:/bescout-app/.claude/.quality-gate-running"
if [ -f "$LOCK_FILE" ]; then
  exit 0
fi
touch "$LOCK_FILE"
trap "rm -f '$LOCK_FILE'" EXIT

cd "C:/bescout-app" || exit 0

ERRORS=0

# 1. TypeScript Check (nur wenn tsc verfuegbar)
if command -v npx &> /dev/null; then
  TSC_OUTPUT=$(npx tsc --noEmit 2>&1 || true)
  TSC_ERRORS=$(echo "$TSC_OUTPUT" | grep -c "error TS" || true)
  if [ "$TSC_ERRORS" -gt 0 ]; then
    echo "QUALITY GATE: $TSC_ERRORS TypeScript errors found"
    echo "$TSC_OUTPUT" | grep "error TS" | head -5
    ERRORS=$((ERRORS + TSC_ERRORS))
  fi
fi

# 2. Check for empty catch blocks in changed files
CHANGED=$(git diff --name-only HEAD 2>/dev/null || true)
if [ -n "$CHANGED" ]; then
  EMPTY_CATCH=$(echo "$CHANGED" | xargs grep -l '\.catch(() => {})' 2>/dev/null || true)
  if [ -n "$EMPTY_CATCH" ]; then
    echo "QUALITY GATE: Empty .catch(() => {}) found in:"
    echo "$EMPTY_CATCH"
    ERRORS=$((ERRORS + 1))
  fi
fi

# 3. Increment session counter for AutoDream
COUNTER_FILE="C:/bescout-app/.claude/session-counter"
if [ -f "$COUNTER_FILE" ]; then
  COUNT=$(cat "$COUNTER_FILE")
  echo $((COUNT + 1)) > "$COUNTER_FILE"
else
  echo "1" > "$COUNTER_FILE"
fi

if [ "$ERRORS" -gt 0 ]; then
  echo "QUALITY GATE FAILED: $ERRORS issues found"
  exit 2
fi

echo "QUALITY GATE PASSED"
exit 0
