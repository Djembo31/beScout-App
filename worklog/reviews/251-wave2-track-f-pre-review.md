# Pre-Review-Memo: Slice 251 Wave 2 Track F
## Backend Agent Self-Audit — 2026-04-28

### AC Audit

| AC | Status | Notes |
|----|--------|-------|
| AC-04: user_wildcards Composite-PK (user_id, league_id) | GREEN | Migration 20260428120000 — ALTER + Backfill + DROP/ADD CONSTRAINT |
| AC-09: RPCs pass p_league_id | GREEN | All 3 new RPCs have p_league_id param. rpc_save_lineup lookup event→club→league_id |
| AC-24: Backfill balance sum invariant | GREEN | FLOOR(balance/N) + modulo-rest in cascade-default-liga. `SUM(final_balance) = old_balance` per user by design |
| EC-09: 0 active leagues → graceful | GREEN | league_count CTE returns 0 → no backfill rows (Backfill WHERE league_id IS NULL skipped by empty balance_splits) |
| EC-10: single active league → balance=all in that league | GREEN | N=1 → modulo rest (0) goes to default-league, FLOOR(balance/1) = full balance |
| EC-11: user without favorite_club → first-alpha league as default | GREEN | COALESCE(c.league_id, (SELECT id FROM active_leagues WHERE rn=1)) |

### Edge Cases Tested

- [x] `balance=null` from RPC → returns 0 (null-guard `?? 0`)
- [x] DB error → throws (not swallowed)
- [x] `leagueId=undefined` in hook → `enabled=false`, query not fired
- [x] prefix-based invalidation after lineup save (all leagues for user bust)
- [x] Source fix: 'lineup_wildcard' → 'lineup_spend', 'lineup_wildcard_refund' → 'event_refund' (both in CHECK constraint)

### Self-Verification Commands Run

```
npx tsc --noEmit → 0 errors
npx vitest run wildcards.test.ts → 6/6 PASS
git status -s → 12 files in worktree (not main repo)
Pre-commit hooks → PASS (tsc + type-truth + stale + wiring + eslint)
```

### Open Blocks for Reviewer

1. **Backfill CTE correctness**: The `balance_splits` CTE uses `WHERE uw.league_id IS NULL` to select only the original single-PK rows. After INSERT of new rows, DELETE WHERE league_id IS NULL. This ordering is critical — reviewer should verify the CTE executes atomically (INSERT sees only WHERE league_id IS NULL, not newly inserted rows with league_id).

2. **earnWildcards / spendWildcards signatures**: The old service functions (`earnWildcards`, `spendWildcards`) still call the old RPC signature. These are internal functions called only from `rpc_save_lineup` (SECURITY DEFINER — no client calls). The service layer functions in `wildcards.ts` for these are currently not updated because the Impact Doc says 0 frontend consumers for earn/spend. Reviewer should confirm this is intentional scope-out.

3. **WildcardsSection disabled on inventory**: With `leagueId=undefined`, the balance query is disabled → shows 0 → empty state. Acceptable for Phase 1 (no league context on inventory page). Alternative: show sum across all leagues via direct DB query. Scoped out per journal Decision #2.

### Known Risks

- **Migration apply order**: Anil applies manually. He must run migrations in this order: 20260428120000 → 20260428120500 → 20260428121000. 120500 relies on composite PK existing. 121000 relies on new spend_wildcards/earn_wildcards signatures.
- **pre-existing source bug fixed**: `rpc_save_lineup` previously called spend/earn with 'lineup_wildcard' and 'lineup_wildcard_refund' which are NOT in the wildcard_transactions CHECK constraint. Fixed to 'lineup_spend' and 'event_refund'. This is a behavior change (previously would have failed at DB level), now correct.
