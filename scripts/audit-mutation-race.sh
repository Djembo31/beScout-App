#!/bin/bash
#
# Slice 151d — Mutation Race Audit Script
#
# Findet React-Components mit dem Anti-Pattern aus D18 (common-errors.md):
# `async handleX() { setLoading(true); ... }` ohne `useSafeMutation`-Wrapper.
#
# Output:
#   total_race_prone: Files die den Anti-Pattern enthalten
#   safe_mutations:   Files die useMutation/useSafeMutation nutzen
#   suspicious:       Files die Loading-State UND async-onClick haben
#
# Exit Codes:
#   0: Audit erfolgreich (nur Summary, kein Fail)
#   1: Suspicious-Count gestiegen gegen Baseline (CI-Gate kandidat)
#
# Usage:
#   npm run audit:mutation-race
#   bash scripts/audit-mutation-race.sh
#   bash scripts/audit-mutation-race.sh --strict   # exit 1 on any new suspicious

set -e

BASELINE_FILE=".audit-mutation-race-baseline"
STRICT_MODE=false

for arg in "$@"; do
  case $arg in
    --strict) STRICT_MODE=true ;;
  esac
done

echo "Slice 151d — Mutation Race Audit"
echo "================================="
echo ""

# Pattern 1: setLoading/setSubmitting/setIsPending outside useSafeMutation
TOTAL_STATE=$(grep -rn 'setLoading\|setSubmitting\|setIsPending\|setBusy\|setSubscribing\|setFollowLoading\|setSelling\|setBuying\|setProcessing\|setSaving\|setDeleting\|setToggling' src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "__tests__" | grep -v "\.test\." | wc -l)

# Pattern 2: useSafeMutation/useMutation (race-safe)
SAFE_MUTATIONS=$(grep -rn 'useSafeMutation\|useMutation(' src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "__tests__" | grep -v "\.test\." | wc -l)

# Pattern 3: Suspicious — async onClick inline
SUSPICIOUS=$(grep -rn 'onClick=\{async\s' src/ --include="*.tsx" 2>/dev/null | grep -v "__tests__" | grep -v "\.test\." | wc -l)

# Pattern 4: Pre-Guard `if (loading) return` — partial safe pattern (but not race-safe)
PRE_GUARDED=$(grep -rn 'if\s*([^)]*loading[^)]*)\s*return\|if\s*([^)]*submitting[^)]*)\s*return\|if\s*([^)]*pending[^)]*)\s*return\|if\s*([^)]*busy[^)]*)\s*return' src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "__tests__" | grep -v "\.test\." | wc -l)

echo "Pattern counts (src/ only, excludes __tests__):"
echo "  setLoading/setPending state declarations: $TOTAL_STATE"
echo "  Race-safe (useSafeMutation/useMutation):  $SAFE_MUTATIONS"
echo "  Suspicious (inline async onClick):        $SUSPICIOUS"
echo "  Pre-guarded (if-loading-return):          $PRE_GUARDED"
echo ""

# Baseline comparison
if [ -f "$BASELINE_FILE" ]; then
  BASELINE_SUSPICIOUS=$(grep -E "^SUSPICIOUS=" "$BASELINE_FILE" | cut -d= -f2)
  BASELINE_STATE=$(grep -E "^TOTAL_STATE=" "$BASELINE_FILE" | cut -d= -f2)

  echo "Baseline comparison:"
  echo "  Suspicious delta:   $((SUSPICIOUS - BASELINE_SUSPICIOUS)) (baseline: $BASELINE_SUSPICIOUS)"
  echo "  setLoading delta:   $((TOTAL_STATE - BASELINE_STATE)) (baseline: $BASELINE_STATE)"
  echo ""

  if [ "$STRICT_MODE" = true ] && [ "$SUSPICIOUS" -gt "$BASELINE_SUSPICIOUS" ]; then
    echo "FAIL (strict): New suspicious pattern introduced. Use useSafeMutation."
    exit 1
  fi
else
  echo "No baseline found. Writing current state as baseline."
  cat > "$BASELINE_FILE" <<EOF
# Slice 151d Audit-Baseline — written $(date -I)
TOTAL_STATE=$TOTAL_STATE
SAFE_MUTATIONS=$SAFE_MUTATIONS
SUSPICIOUS=$SUSPICIOUS
PRE_GUARDED=$PRE_GUARDED
EOF
fi

echo ""
echo "Next migration candidates (Tier-1 Money, CEO-Scope):"
grep -rln 'setLoading\|setSubmitting' src/ --include="*.ts" --include="*.tsx" 2>/dev/null | \
  grep -v "__tests__" | grep -v "\.test\." | \
  grep -iE 'trading|offer|sell|buy|subscribe|withdrawal|founding|mystery|wallet' | \
  head -10 | sed 's/^/  - /'

echo ""
echo "Migration progress:"
echo "  Phase 1 (Slice 151): 2 / 2 pilots (useClubActions, MembershipSection) — COMPLETE"
echo "  Phase 2 (Slice 152+): Money-Tier migrations — SCHEDULED"
echo "  Phase 3 (Slice 156+): Data-Integrity migrations — SCHEDULED"
echo ""

exit 0
