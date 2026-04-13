# Pre-Launch Checklist (Pilot Start)

Items die erst beim Pilot-Start abgearbeitet werden, nicht vorher.

## Data Cleanup

- [ ] **Seed-Fan-Accounts löschen** (Fan 01 – Fan 10, UUIDs s.u.)
  - Grund: Sie halten ~11 "phantom" Scout Cards die nicht durch IPO-Käufe gedeckt sind (seed-script hat direkt in holdings inserted statt über `buy_from_ipo`). Post-Launch soll der Invariant `sum(holdings) = sum(ipo_purchases)` pro Spieler HARD gelten, damit der Supply-Invariant-CI-Test greift.
  - Betroffene Spieler: Mendy Mamadou (9 SC bei Fan 06), Doğukan Tuzcu (2 SC bei Fan 01)
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

- [ ] Remove demo `test444`, `jarvis-qa`, and any other QA account SC inflation (they accumulated test state during polish sweep)
- [x] **Clean "DPC"/"Cents" from transaction descriptions** — Migration `cleanup_dpc_transaction_descriptions` + `fix_broken_transaction_descriptions` (2026-04-13). Frontend display-time sanitization in `cleanDescription()` als Fallback.
- [ ] **RPC functions still write "DPC" in descriptions** — 11 RPCs need update (buy_from_ipo, buy_from_market, place_sell_order, etc.). Too risky for bulk replace, needs dedicated review per function.
- [ ] Verify migration registry drift is resolved OR documented as permanent (see `.claude/rules/database.md`)
- [ ] Re-run full `vitest` suite and fix all live-DB integration test failures that the final seed-cleanup doesn't automatically fix

## Why this list exists

2026-04-11 13:40 — During the accept_offer NULL-guard fix session we discovered that:
- The seed script has been populating holdings directly (bypassing trades/ipo_purchases) since 2026-02-15.
- The supply invariant `sum(holdings) = sum(ipo_purchases)` was off by 11 SCs across 2 players, 100% attributable to seed data.
- No actual fraud trades had ever reached production (the only exploit was reproduced and rolled back in the same session).

Deleting the seed accounts at pilot start gives us a clean supply ledger from day one, so any future invariant violation is unambiguous.
