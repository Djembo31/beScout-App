#!/usr/bin/env bash
# fix-migration-history.sh
# Run this from the bescout-app directory after Supabase circuit breaker resets
# (wait 30-60 min after the parallel repair attempts before running)
#
# What this does:
# 1. Gets the current list of remaining repair commands from supabase db pull
# 2. Runs them one by one (no parallelism — that caused the circuit breaker issue)
# 3. Verifies the final state

set -e
cd "$(dirname "$0")/.."

echo "=== BeScout Migration History Repair ==="
echo ""
echo "Step 1: Getting remaining repair commands..."
REPAIR_CMDS=$(npx supabase db pull 2>&1 | grep "migration repair" || true)

if [ -z "$REPAIR_CMDS" ]; then
  echo "No repair commands needed — migration history is already in sync!"
  npx supabase migration list
  exit 0
fi

COUNT=$(echo "$REPAIR_CMDS" | wc -l)
echo "Found $COUNT repair commands to run."
echo ""
echo "Step 2: Running repairs sequentially (this may take a few minutes)..."
echo ""

while IFS= read -r cmd; do
  echo "Running: $cmd"
  eval "npx $cmd"
  sleep 1  # Small delay to avoid rate limiting
done <<< "$REPAIR_CMDS"

echo ""
echo "Step 3: Verifying final state..."
npx supabase migration list

echo ""
echo "=== Repair complete! ==="
echo "If migration list shows no divergences, the history is fixed."
echo "You can also run: npx supabase db pull"
echo "to verify and optionally create a new schema baseline."
