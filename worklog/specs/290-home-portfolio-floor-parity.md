# Slice 290 — Home Portfolio Floor Parity

Status: DONE
Date: 2026-06-13
Type: Fix / TDD / Demo-Coherence
Size: S

---

## Trigger

Slice 289 S2 Page Contract Audit found F-1 P1: Home and Manager/Market can show different portfolio values.

- Home used scalar `h.player.floor_price` from `get_home_dashboard_v1`.
- Manager/Market use canonical `computePlayerFloor(player)` from byIds/enriched Player shape: live listings min -> `prices.floor` -> 0.

This breaks demo coherence: Home portfolio value can disagree with Manager squad value for the same holdings.

---

## Goal

Make Home portfolio value use the same canonical floor chain as Manager/Market when a byIds Player is available, while preserving the old scalar `floor_price` as fallback.

---

## Scope

Changed:
- `src/app/(app)/hooks/useHomeData.ts`
- `src/app/(app)/hooks/__tests__/useHomeData.test.ts`
- worklog docs/proof/review/log/active

Not changed:
- no DB/RPC migration
- no Manager/Market runtime changes
- no UI redesign
- no `memory/session-handoff.md`

---

## Design

1. Move `useHomeDashboard(uid)` before the Home mini-player fetch so Home can derive held player IDs.
2. Add held player IDs to `miniFetchIds` alongside trending + active IPO player IDs.
3. Use the byIds Player map for each holding floor:
   - if canonical player exists: `computePlayerFloor(canonicalPlayer)`
   - else fallback: `centsToBsd(h.player.floor_price)`
4. Keep avg buy/cost from the original holdings payload.

This keeps the existing cold-start mini-fetch architecture and does not reintroduce `usePlayers()` / 4.2MB full-list fetch.

---

## Acceptance Criteria

- AC1: RED test proves Home previously did not request held player IDs via byIds and used scalar floor.
- AC2: GREEN test proves held player IDs are requested and live-listing floor is used for `holdings[].floor`, `portfolioValue`, `pnl`, `pnlPct`.
- AC3: Full `useHomeData` test file passes.
- AC4: `tsc --noEmit`, type-truth, stale, wiring checks pass.
- AC5: Commit excludes pre-existing `memory/session-handoff.md` and generated audit timestamp noise.
