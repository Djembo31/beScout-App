#!/bin/bash
# Full Audit Suite — on-demand via `npm run audit`
# Runs compliance + i18n + rpc-security
set -e
cd "$(git rev-parse --show-toplevel)"

echo "🔍 Running full audit suite..."
echo ""

echo "[1/3] Compliance (business.md)..."
bash scripts/audit/compliance.sh
echo ""

echo "[2/3] i18n-Coverage (DE↔TR)..."
node scripts/audit/i18n-coverage.js
echo ""

echo "[3/3] RPC-Security (live-DB)..."
node scripts/audit/rpc-security.js || echo "   (non-blocking — env may be missing)"
echo ""

echo "🏁 Audit suite complete"
