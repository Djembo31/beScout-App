# Slice 037 — 8 transactions.type Drifts Cleanup (INV-30 Allowlist Empty)

**Groesse:** M · **CEO-Scope:** ja (Money-RPCs + CHECK-Constraint) · **Typ:** P2 Cleanup

## Ziel

Slice 034 fixte `buy_player_sc` + INV-30 Test mit Allowlist von 9 known-bad RPC/type
Pairs. Diese Slice geht durch alle 9 systematisch:
- 2× RPC-Rename (CHECK hat den richtigen Wert — RPC schreibt drift)
- 6× CHECK-Constraint erweitern (RPC-types sind fachlich korrekt — CHECK fehlt)
- 1× Duplicate (event_entry_unlock in 2 RPCs)

Nach diesem Slice: INV-30 Allowlist leer, alle types valid, kein silent crash.

## Drift-Liste

### A. Rename in RPC (CHECK ist source-of-truth)

| RPC | Wrong | Correct | Action |
|-----|-------|---------|--------|
| cast_community_poll_vote | `'poll_earning'` | `'poll_earn'` | Rename |
| unlock_research | `'research_earning'` | `'research_earn'` | Rename |

### B. Add to CHECK (RPC-types sind fachlich richtig)

| Type | Used in | Activity | Direction |
|------|---------|----------|-----------|
| `vote_fee` | cast_vote | Club-Vote-Cost | -amount |
| `ad_revenue_payout` | calculate_ad_revenue_share | Werbeanteil-Auszahlung | +amount |
| `creator_fund_payout` | calculate_creator_fund_payout | Creator-Fund-Auszahlung | +amount |
| `event_entry_unlock` | rpc_cancel_event_entries + rpc_unlock_event_entry | Event-Entry Refund | +amount |
| `scout_subscription` | subscribe_to_scout (subscriber) | Scout-Vertrag Kosten | -amount |
| `scout_subscription_earning` | subscribe_to_scout (scout) | Scout-Vertrag Einnahme | +amount |

### Files-Liste (estimate 8-10)

1. `supabase/migrations/20260417190000_transactions_type_drift_cleanup.sql` (NEW)
   - 2 RPC-Renames (CREATE OR REPLACE FUNCTION mit korrigierten types)
   - 1 ALTER TABLE transactions DROP CONSTRAINT + ADD CONSTRAINT mit erweiterten 6 types
2. `src/lib/transactionTypes.ts` — `ALL_CREDIT_TX_TYPES` um die 6 neuen ergaenzen
3. `src/lib/activityHelpers.ts` — icon/color/i18n-key fuer 6 neue types
4. `messages/de.json` + `messages/tr.json` — Labels fuer 6 neue types
5. `src/lib/__tests__/db-invariants.test.ts` — INV-30 Allowlist auf leer setzen

## Acceptance Criteria

1. CHECK constraint enthaelt alle 6 neuen + behaelt alle alten types
2. Live-DB-Test der RPCs funktioniert ohne 22P02
3. INV-22 (TS ⊇ DB) gruen
4. INV-30 (RPC ⊆ CHECK) gruen MIT LEERER Allowlist
5. activityHelpers mappt alle 6 neuen types (kein raw-string in UI)
6. Migration apply success, kein Live-Drift

## Proof-Plan

- `worklog/proofs/037-pre-state.txt` — Allowlist before, drift list
- `worklog/proofs/037-migration-result.txt` — apply success + verify types
- `worklog/proofs/037-tsc-vitest.txt` — 28+ db-invariants gruen incl. INV-22 + INV-30 ohne Allowlist
- `worklog/proofs/037-i18n-diff.txt` — DE+TR Labels fuer 6 neue types

## Scope-Out

- Live-Test der einzelnen RPCs (cast_vote, calculate_*) auf bescout.net — out of scope (zu viele Test-Pfade)
- Andere transaction.type-bezogene UX-Bugs (Slice 042 PUNKTE-Display)
