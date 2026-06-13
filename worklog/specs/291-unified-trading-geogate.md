# Slice 291 — Unified Trading GeoGate for Player + Manager

Status: DONE
Date: 2026-06-13
Type: Fix / Compliance / TDD
Size: S

---

## Trigger

Slice 288 and 289 found the same P1 class:

- `/market` is wrapped in `GeoGate feature="dpc_trading"`.
- `/player/[id]` and `/manager` exposed trading entrypoints without the same dpc_trading region guard.

Product decision: do not hide content pages. Gate only trading actions.

---

## Goal

Restricted users may still view player/manager/fantasy context, but trading entrypoints must not execute.

Surfaces in scope:
- Player detail hero buy/sell actions.
- Player detail TradingTab buy/offer/accept-bid actions.
- Player detail mobile trading bar buy/sell actions.
- Manager Kader sell/cancel-order actions.

---

## Implementation

- `PlayerContent` imports `useRegionGuard('dpc_trading')` and wraps trading actions with `guard`.
- `TradingTab` receives guarded/omitted trading callbacks.
- `ManagerContent` imports `useRegionGuard('dpc_trading')` and wraps Kader `onSell` and `onCancelOrder` before passing them to `KaderTab`.
- When restricted, original trading functions are not called and the region guard toast path executes.

---

## Acceptance Criteria

- AC1: RED test proves player buy/sell entrypoints call raw modal openers when unrestricted guard is missing.
- AC2: GREEN test proves player buy/sell do not open modals when `dpc_trading` is restricted.
- AC3: RED/GREEN test proves Manager Kader sell/cancel do not call raw trade actions when restricted.
- AC4: Existing PlayerContent + Kader modal suites still pass.
- AC5: tsc and audits pass.
