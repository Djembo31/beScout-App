#!/bin/bash
# Slice 245: Reminds about deferred-Items in worklog/beta-phase.md every 7 days
# Trigger: Stop event
#
# Rationale (docs/test.rtf #6): "4 deferred Items in beta-phase.md — keiner re-evaluiert
# sie automatisch. ORPHAN-NEU-1 wurde defer'd 'bei Skala >20 active-scouts' — aber wer
# triggert die Re-Evaluation bei N=21?"
#
# Iteration 1 (Reminder): print deferred-Items wenn 7 Tage seit last-shown ODER
# items-count geändert. Iteration 2 (Auto-Eval gegen DB/PostHog) → post-Beta.
#
# Skip-Conditions:
#   - beta-phase.md fehlt
#   - deferred-Block leer
#   - Cooldown aktiv (last-shown <7 Tage UND items-count unchanged)
#
# Failure-Mode: silent exit 0 bei jeder Crash-Klasse (kein Stop-Hook-Cascading-Break).

set +e

PHASE_TRACKER="worklog/beta-phase.md"
STATE_DIR=".claude/state"
STATE_FILE="$STATE_DIR/deferred-reeval-last-shown"
COOLDOWN_DAYS=7
COOLDOWN_SECS=$((COOLDOWN_DAYS * 86400))

[ ! -f "$PHASE_TRACKER" ] && exit 0

# Extract deferred-Items count + content
# Pattern: deferred:-Block bis nächster YAML-Key (^\w+:) oder end-of-yaml-block (^```)
DEFERRED_BLOCK=$(awk '
  /^  deferred:/ { in_block=1; next }
  in_block && /^  [a-z_]+:/ { in_block=0 }
  in_block && /^```/ { in_block=0 }
  in_block && /^    - / { print }
' "$PHASE_TRACKER" 2>/dev/null)

ITEMS_COUNT=$(echo "$DEFERRED_BLOCK" | grep -c '^    - ' 2>/dev/null || echo 0)
ITEMS_COUNT=${ITEMS_COUNT:-0}

# Skip if no deferred items
[ "$ITEMS_COUNT" -eq 0 ] && exit 0

mkdir -p "$STATE_DIR" 2>/dev/null

NOW=$(date +%s 2>/dev/null)
[ -z "$NOW" ] && exit 0

# Read state
LAST_SHOWN=0
LAST_COUNT=0
if [ -f "$STATE_FILE" ]; then
  LAST_SHOWN=$(sed -n '1p' "$STATE_FILE" 2>/dev/null)
  LAST_COUNT=$(sed -n '2p' "$STATE_FILE" 2>/dev/null)
  # Sanity-Defaults bei korrupten Werten
  case "$LAST_SHOWN" in *[!0-9]*|'') LAST_SHOWN=0 ;; esac
  case "$LAST_COUNT" in *[!0-9]*|'') LAST_COUNT=0 ;; esac
fi

ELAPSED=$((NOW - LAST_SHOWN))

# Skip if cooldown active AND count unchanged
if [ "$ELAPSED" -lt "$COOLDOWN_SECS" ] && [ "$ITEMS_COUNT" -eq "$LAST_COUNT" ]; then
  exit 0
fi

# Print Reminder
cat <<EOF

[deferred-reeval-reminder] $ITEMS_COUNT deferred-Items in worklog/beta-phase.md.
   Bei jedem $COOLDOWN_DAYS-Tage-Intervall ODER count-Change → diese Liste pruefen:

$DEFERRED_BLOCK

   Frage: Trigger-Bedingung erfuellt? (z.B. Skala >20 active-scouts erreicht)
     → JA: deferred-Item nach reopen verschieben (P1/P2/P3) ODER closed
     → NEIN: weiter deferred lassen, Hook reminded in $COOLDOWN_DAYS Tagen wieder
   Hook-Quelle: .claude/hooks/ship-deferred-reeval-reminder.sh

EOF

# Update state
{
  echo "$NOW"
  echo "$ITEMS_COUNT"
} > "$STATE_FILE" 2>/dev/null

exit 0
