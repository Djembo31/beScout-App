# Slice 289 — Page Contract Audit: / (Home) + /manager

Status: DONE
Date: 2026-06-13
Type: Docs / Audit / S2 Stabilization
Size: M

---

## Trigger

Slice 288 (S1: `/market` + `/player/[id]`) completed. Per `memory/current-product-truth.md` §8 and `worklog/audits/2026-06-12/stabilization-master-audit.md` (Slice S2), the next stabilization step is the Page Contract Audit for `/` (Home) and `/manager`, carrying Slice 288 F-3 (Holdings Source-of-Truth split) forward as the key input.

---

## Goal

Produce concrete Page Contracts for the Home and Manager pages on the demo path, focusing on whether Home and Manager agree on portfolio/squad truth (the S2 master-audit concern), and surface gates, data sources, mutations, states, tests and debt.

No runtime changes. No fixes. Classify each page GREEN/YELLOW/RED and propose small follow-up slices.

---

## Scope

Allowed:
- read source/tests/e2e/docs
- write `worklog/specs`, `worklog/audits`, `worklog/reviews`, `worklog/proofs`
- update `worklog/active.md` and prepend `worklog/log.md`

Forbidden:
- no `src/**` edits
- no migrations
- no API/service/runtime changes
- no fixing findings in this slice
- no touching `memory/session-handoff.md`
- no commits

---

## Inspected areas

Home:
- `src/app/(app)/page.tsx`
- `src/app/(app)/hooks/useHomeData.ts`
- `src/components/home/*` (HomeStoryHeader, ActionRequiredStack, ScoutCardStats, HomeSpotlight, MarktPuls, helpers, sidebar cards)
- `src/lib/queries/homeDashboard.ts`

Manager:
- `src/app/(app)/manager/page.tsx`
- `src/features/manager/components/ManagerContent.tsx`
- `src/features/manager/components/PageHeader.tsx`
- `src/features/manager/hooks/useManagerData.ts`
- `src/features/manager/components/kader/KaderSellModal.tsx`
- `src/features/manager/store/managerStore.ts`

Cross-cutting:
- `src/features/market/hooks/useMarketData.ts` (portfolio floor source)
- `src/lib/playerMath.ts` (`computePlayerFloor`, `computeHoldingPnL`)
- `src/lib/queries/marketDashboard.ts`, `src/lib/queries/invalidation.ts`
- e2e: `beta-smoke.spec.ts`, `synthetic-users.spec.ts`, `qa-283-network.ts`, `qa-284c-verify.ts`

---

## Acceptance Criteria

- AC1: `/` (Home) Page Contract completed.
- AC2: `/manager` Page Contract completed.
- AC3: Each page gets a GREEN/YELLOW/RED demo status using the `current-product-truth.md` vocabulary.
- AC4: Source-of-Truth, gates, data sources, mutations, query keys/cache, components, loading/empty/error/mobile, tests/e2e and debt documented per the master-audit contract template.
- AC5: Findings become follow-up slice candidates, not implemented fixes.
- AC6: Proof shows no `src/**` runtime changes (only docs + worklog).

---

## Result summary

- `/` Home: GREEN with one YELLOW caveat.
- `/manager`: YELLOW.
- Headline P1 finding (F-1): portfolio value diverges — Home uses scalar `floor_price` (`get_home_dashboard_v1`); Manager uses `computePlayerFloor` (live-listings min, `get_market_dashboard`/byIds). Same holdings can show different totals across pages. This is the concrete instance of Slice 288 F-3.
- Second P1 finding (F-2): GeoGate asymmetry extends to `/manager` (Kader sell/cancel CTAs, no GeoGate) — same class as Slice 288 F-1.
- F-3 (P2): `/manager` has no page-level `TradingDisclaimer`/`FantasyDisclaimer` (sell-modal disclaimer is modal-level via `SellModalCore`).

Detailed audit:
- `worklog/audits/2026-06-13/page-contract-home-manager.md`

Proof:
- `worklog/proofs/289-home-manager-page-contract.md`
