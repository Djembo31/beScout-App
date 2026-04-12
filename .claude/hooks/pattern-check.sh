#!/bin/bash
# pattern-check.sh — Stop hook
# Warns if fix() commits exist but common-errors.md wasn't updated.
# Also checks if session-digest.md is stale.

cd C:/bescout-app || exit 0

# Count fix commits in last 4 hours
FIX_COMMITS=$(git log --since="4 hours ago" --oneline 2>/dev/null | grep -c "fix(" || true)

if [ "$FIX_COMMITS" -gt 0 ] 2>/dev/null; then
  ERRORS_CHANGED=$(git diff --name-only HEAD~"$FIX_COMMITS" HEAD 2>/dev/null | grep -c "common-errors.md" || true)

  if [ "$ERRORS_CHANGED" -eq 0 ] 2>/dev/null; then
    echo ""
    echo "PATTERN-CHECK: $FIX_COMMITS fix() Commits aber common-errors.md NICHT aktualisiert."
    echo "→ Neue Error-Patterns eintragen? (Ferrari: Same-Session Extraction)"
    echo ""
  fi
fi

# Check if session-digest is stale (older than 4 hours)
if [ -f "memory/session-digest.md" ]; then
  DIGEST_MOD=$(stat -c %Y "memory/session-digest.md" 2>/dev/null || stat -f %m "memory/session-digest.md" 2>/dev/null || echo 0)
  NOW=$(date +%s)
  AGE=$(( (NOW - DIGEST_MOD) / 3600 ))
  if [ "$AGE" -gt 4 ] 2>/dev/null; then
    echo "SESSION-DIGEST: memory/session-digest.md ist ${AGE}h alt. Bitte aktualisieren."
  fi
fi

exit 0
