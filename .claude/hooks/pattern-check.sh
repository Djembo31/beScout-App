#!/bin/bash
# pattern-check.sh — Stop hook
# Warns if fix() commits exist but common-errors.md wasn't updated (Knowledge-Flywheel).
# (E0-W3b: Jarvis session-digest.md-Stale-Check entfernt — File retired.)

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

exit 0
