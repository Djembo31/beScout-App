# Pre-Launch Checklist (Pilot Start)

**Status:** ✅ Alle Items mit Live-DB verifiziert 2026-04-14. Aktiv in Operation Beta Ready Phase 1.

**SSOT:** `memory/operation-beta-ready.md` (Phase 1 Section)

Items die erst beim Pilot-Start abgearbeitet werden, nicht vorher.

## Data Cleanup

- [x] **Seed-Casual-Accounts gelöscht** (casual01 – casual10) — **✅ DONE 2026-04-14**: 10 profiles + 10 auth.users + 3 holdings + 3 trades + 1 ipo_purchase + 6 offers + 2 orders + 2 pbt_transactions + 20 transactions + 10 wallets + 10 user_tickets + 4 dpc_mastery + 28 score_history + 10 scout_scores gelöscht. Supply-Invariant gruen (0 Player mit held != purchased).
  - Handles sind `casual01-10` (NICHT `fan01-10` wie ursprünglich dokumentiert)
  - Grund: Sie halten **exakt 11 "phantom" Scout Cards** die nicht durch IPO-Käufe gedeckt sind
  - Live Beweis (2026-04-14): `Mendy Mamadou: held=24, purchased=15 → +9 phantom (casual06 hält 9)` + `Doğukan Tuzcu: held=4, purchased=2 → +2 phantom (casual01)`
  - Trade-Aktivität: casual01 hat 2 Trades, casual06 hat 1 Trade — **Cascade-CARE**: UPDATE seller_id=NULL vor DELETE
  - Created batch: 2026-02-15 20:37:40 UTC
  - UUIDs:
    - Fan 01 `671269ed-199a-5e73-9959-e30e54f05f03`
    - Fan 02 `91b6bc18-c20d-599f-9424-50944d4be6d6`
    - Fan 03 `8eeb6119-c0bd-5358-b7bb-fdb0fe73489c`
    - Fan 04 `a85617b2-1681-5040-a346-b4085c32e175`
    - Fan 05 `bad3f94b-ec26-56ac-a976-f92d0481b78e`
    - Fan 06 `92f2893b-c57b-5f59-92d9-4ce482c2e5bb`
    - Fan 07 `da13204e-b332-57c7-9384-8c27fa739ccf`
    - Fan 08 `b989efa4-e604-58eb-afa3-bd8e3bcd00ca`
    - Fan 09 `589fb318-40ef-5455-a2bc-790afcf8e3b9`
    - Fan 10 `3f3b6221-089c-57c3-b9a8-5308c455778f`
  - Cascade: `holdings`, `wallets`, `user_stats`, `profiles`, `offers` (sender/receiver), `trades` (buyer/seller — careful: zero-sum may break supply invariants, consider UPDATE seller_id=NULL or reassign before delete), `activity_log`, `ipo_purchases`, `user_tickets`, `user_equipment`, `user_cosmetics`, `notifications`, `watchlist`, `post_votes`, `post_comments`.
  - Pre-delete audit: re-run `sum(holdings) vs sum(ipo_purchases)` per player to confirm the only unbacked SCs are held by these 10 accounts.

## Supply Invariant CI Test

- [x] **Automatic check in CI** — `supply-invariant.test.ts` (Commit dc9bfed, 2026-04-13)
  - Per player: assert `sum(holdings.quantity) = sum(ipo_purchases.quantity)`
  - Per (user, player): time-ordered replay of trades never goes negative
  - Run in `test-live-db.yml` (or a nightly cron). Red = supply leak = halt deploy.

## Other Pre-Launch Items

- [ ] **Test-Account SC-Inflation Cleanup** — 🔴 LIVE BESTAETIGT 2026-04-14: **90 SCs total** in 6 QA-Accounts. WAITING CEO DECISION welche Accounts behalten:
  - test12 (UUID 46535ade-4db2-4866-8dfa-b8a8bcdbd933): 30 SCs in 16 Players
  - jarvisqa (UUID 535bbcaf-f33c-4c66-8861-b15cbff2e136): 18 SCs in 9 Players
  - test1 (UUID ca37ebe6-2ce7-4d1e-b296-ec9f291c4ae7): 17 SCs in 14 Players
  - test2 (UUID 01c36853-ad96-453a-bab7-3cec3c6832be): 11 SCs in 11 Players
  - test (UUID cc8e9304-91ae-4a14-bc2c-0751aff9a7fa): 10 SCs in 9 Players
  - test444 (UUID 782777a7-9e4a-4e5f-9681-0db78db66648): 4 SCs in 3 Players
  - Empfehlung: test444 + jarvisqa BEHALTEN (für ongoing QA, SCs nullen + neu seeden), Rest komplett DELETE
- [x] **Clean "DPC"/"Cents" from transaction descriptions** — Migration `cleanup_dpc_transaction_descriptions` + `fix_broken_transaction_descriptions` (2026-04-13). Frontend display-time sanitization in `cleanDescription()` als Fallback.
- [x] **RPC functions DPC-Sanitize + Function-Renames** — **✅ DONE 2026-04-14** (Migrations 20260414150000 + 20260414151000):
  - **Kategorie A (10 RPCs Body-Sanitize):** accept_offer, buy_from_ipo, buy_from_market, buy_from_order, calculate_fan_rank, create_ipo, create_offer, liquidate_player, place_buy_order, place_sell_order — DPC/DPCs → SC/SCs in user-facing strings. Die 4 mastery-RPCs (award_mastery_xp, fn_mastery_on_trade, increment_mastery_hold_days, refresh_airdrop_score) hatten nur lowercase `dpc_mastery` Table-Refs → unchanged.
  - **Kategorie B (2 Function-Renames mit Alias-Pattern):** `buy_player_dpc` → `buy_player_sc`, `calculate_dpc_of_week` → `calculate_sc_of_week`. Alte Namen bleiben als thin-alias retained (sichere Migration-Uebergangsphase).
  - **Code-Updates:** src/lib/services/trading.ts, src/app/api/cron/gameweek-sync/route.ts, 4 Test-Files + 1 Mock-Docstring.
- [x] **Migration registry drift** — 🟡 LIVE BESTAETIGT 2026-04-14: Local 61 vs Remote 44 (Drift permanent). Documented as "permanent ignore" pattern. NIE `supabase db push`, IMMER `mcp__supabase__apply_migration` (siehe `reference_migration_workflow.md` + CLAUDE.md)
- [x] **Live-DB Integration Tests** — ✅ LIVE BESTAETIGT 2026-04-14: vitest.config.ts excludet 11 globs wenn `process.env.CI=true` (intentional design). Lokal laufen lassen vor Pilot-Start.
- [ ] Re-run full `vitest` suite locally after final seed-cleanup, fix any DB-state-dependent test failures

## Why this list exists

2026-04-11 13:40 — During the accept_offer NULL-guard fix session we discovered that:
- The seed script has been populating holdings directly (bypassing trades/ipo_purchases) since 2026-02-15.
- The supply invariant `sum(holdings) = sum(ipo_purchases)` was off by 11 SCs across 2 players, 100% attributable to seed data.
- No actual fraud trades had ever reached production (the only exploit was reproduced and rolled back in the same session).

Deleting the seed accounts at pilot start gives us a clean supply ledger from day one, so any future invariant violation is unambiguous.
