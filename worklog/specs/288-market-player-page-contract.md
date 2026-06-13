# Slice 288 — Page Contract Audit: /market + /player/[id]

Status: DONE
Date: 2026-06-13
Type: Docs / Audit / S1 Stabilization
Size: M

---

## Trigger

Slice 287 Product Truth Freeze completed. Per `memory/current-product-truth.md` and `worklog/audits/2026-06-12/stabilization-master-audit.md`, the next stabilization step is S1: Page Contract Audit for `/market` and `/player/[id]`.

Claude Code was used as an audit worker. It hit `error_max_turns`, but produced usable analysis in stdout. Hermes independently verified the core claims before writing this slice.

---

## Goal

Create the first concrete Page Contracts for the demo-critical Market -> Player Detail path.

No runtime changes. No fixes. First classify the pages, identify Source-of-Truth risks, and propose small follow-up slices.

---

## Scope

Allowed:
- read source/tests/e2e/docs
- write worklog/specs, worklog/audits, worklog/reviews, worklog/proofs
- update worklog/active.md and worklog/log.md

Forbidden:
- no `src/**` edits
- no migrations
- no API/service/runtime changes
- no fixing findings in this slice
- no touching `memory/session-handoff.md`

---

## Inspected areas

Page entries:
- `src/app/(app)/market/page.tsx`
- `src/app/(app)/player/[id]/page.tsx`
- `src/app/(app)/player/[id]/PlayerContent.tsx`

Market:
- `src/features/market/components/MarketContent.tsx`
- `src/features/market/hooks/useMarketData.ts`
- `src/features/market/hooks/useTradeActions.ts`
- `src/features/market/mutations/trading.ts`
- market component tests and e2e specs

Player:
- `src/components/player/detail/hooks/usePlayerDetailData.ts`
- `src/components/player/detail/hooks/usePlayerTrading.ts`
- player detail components/tests and e2e specs

Cross-cutting:
- `src/components/geo/GeoGate.tsx`
- `src/lib/queries/keys.ts`
- trading/player/ipo/offer service layers

---

## Acceptance Criteria

- AC1: `/market` Page Contract completed.
- AC2: `/player/[id]` Page Contract completed.
- AC3: Each page gets GREEN/YELLOW/RED demo status.
- AC4: Source-of-Truth, gates, data sources, mutations, tests and debt documented.
- AC5: Findings become follow-up slice candidates, not implemented fixes.
- AC6: Proof shows no `src/**` runtime changes.

---

## Result summary

- `/market`: GREEN with one YELLOW architecture caveat.
- `/player/[id]`: YELLOW.
- Main P1 finding: `/market` has `GeoGate feature="dpc_trading"`, but `/player/[id]` has no equivalent GeoGate around trading CTAs.

Detailed audit:
- `worklog/audits/2026-06-13/page-contract-market-player.md`

Proof:
- `worklog/proofs/288-market-player-page-contract.md`
