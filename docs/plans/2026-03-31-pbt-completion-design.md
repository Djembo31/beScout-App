# PBT Completion — Design Doc

**Date:** 2026-03-31
**Tier:** 2 (Targeted, ~60 LOC)
**Status:** ~85-90% already implemented. This closes the remaining gaps.

## Current State (Verified via Live DB)

| Component | Status |
|-----------|--------|
| `pbt_treasury` table (178 rows) | LIVE |
| `pbt_transactions` table (712 rows) | LIVE |
| `fee_config` table (1 global default) | LIVE |
| `credit_pbt()` SQL function | LIVE |
| Trading PBT 1.5% (`buy_player_dpc`, `buy_from_order`) | LIVE |
| IPO PBT 5% (645 transactions) | LIVE |
| P2P Offer PBT 0.5% (`accept_offer`) | LIVE |
| Liquidation PBT distribution (weighted) | LIVE |
| Player Detail PBT Widget (PerformanceTab) | LIVE |
| Admin Fee Editing + Treasury Stats | LIVE |
| `usePbtForPlayer()` query hook | LIVE |
| `invalidatePlayerDetailQueries` includes PBT | LIVE |
| Tests (6 files — fees, liquidation, schema) | LIVE |

## Remaining Gaps

### 1. PBT Transaction History UI
- `getPbtTransactions()` service exists but no UI renders it
- Add query hook `usePbtTransactions` in `queries/misc.ts`
- Add query key `qk.pbt.transactions(pid)` in `keys.ts`
- Add collapsible transaction list inside existing PBT Widget in `PerformanceTab.tsx`
- Show: source badge (Trading/IPO), amount, timestamp
- Max 10 entries, collapsed by default

### 2. RPC Consistency
- `buy_player_dpc` (lines 336-348) inlines PBT credit with INSERT/UPSERT
- `buy_from_order` (line 570) calls `credit_pbt()` function
- `accept_offer` inlines PBT credit (same pattern as buy_player_dpc)
- **Action:** Refactor `buy_player_dpc` to use `PERFORM credit_pbt(...)` like `buy_from_order`
- No behavior change, just deduplication

### 3. Migration Sync
- Tables exist in live DB but CREATE TABLE not in local migrations
- Create `20260331_pbt_tables_sync.sql` documenting existing schema
- Use `CREATE TABLE IF NOT EXISTS` to be idempotent

## NOT in scope
- **Votes/Content PBT** — No money flows exist for votes or research (Phase 3/4)
- **Separate PBT Admin Tab** — Existing Treasury tab suffices
- **PBT Invalidation** — Already handled in `invalidatePlayerDetailQueries`

## Files Changed
1. `src/lib/queries/keys.ts` — Add `pbt.transactions` key
2. `src/lib/queries/misc.ts` — Add `usePbtTransactions` hook
3. `src/components/player/detail/PerformanceTab.tsx` — Transaction history in PBT widget
4. `supabase/migrations/20260331_pbt_rpc_consistency.sql` — Refactor RPCs to use `credit_pbt()`
5. `supabase/migrations/20260331_pbt_tables_sync.sql` — Document existing tables
