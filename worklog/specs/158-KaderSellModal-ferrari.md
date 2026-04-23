# Slice 158 — KaderSellModal Ferrari-Refactor (Phase 3 Welle 3)

**Typ:** S-Slice (1 Component + 1 neuer Test, keine DB-Change).
**Money-Path:** Ja (sell listet Card zu Market, cancel unlockt Order-Escrow).
**Impact:** Skipped (UI-Wrapper, callbacks unveraendert — 2 Parents KaderTab + BestandView).

---

## Ziel

`KaderSellModal.tsx` `handleSubmit`/`handleCancel` nutzen `useSafeMutation` mit synchronem `isPending`-Guard + `errorTag` (Sentry-Observability) + defensive `invalidateWallet` im onSettled. Callback-API (`onSell`, `onCancelOrder`) unveraendert. `selling`/`cancellingId` derived aus mutation-state.

---

## Problem

`KaderSellModal.tsx:42-71` hat 2 async Handler mit Anti-Pattern B (kein Guard, Slice 150 Tier-1):

```ts
const handleSubmit = async (qty, priceCents) => {
  // NO GUARD — rapid click → multiple onSell-Calls
  setSelling(true);
  setError(null);
  setSuccess(null);
  const result = await onSell(item.player.id, qty, priceCents);
  if (result.success) { ... } else { setError(...); }
  setSelling(false);
};
```

`handleCancel` ist besser (setzt cancellingId=orderId, aber kein `if (cancellingId === orderId) return`-Guard).

Money-Path: `onSell` → `place_sell_order` RPC → new Order-Row + floor_price-recalc. Rapid-click = 2× Listing. Per order.ts hat Rate-Limit (10/hour) — aber UI-drift + User-Verwirrung bleibt.

---

## Betroffene Files

| # | File | Aenderung |
|---|------|-----------|
| 1 | `src/features/manager/components/kader/KaderSellModal.tsx` | Refactor: 2x `useSafeMutation`. `selling`/`cancellingId`/`error`/`success` state derived/Zustand. `useQueryClient()` + `invalidateWallet(qc)` onSettled. `errorTag`: `market.kaderSell` + `market.kaderCancelOrder`. |
| 2 | `src/features/manager/components/kader/__tests__/KaderSellModal.test.tsx` | NEU: 6-8 Tests — callbacks called, isPending states, errorTag-routing, onSettled-invalidateWallet, pre-check validation. |

**Nicht geändert:**
- `src/features/manager/components/kader/KaderTab.tsx` (Consumer, callback-signature unchanged)
- `src/features/market/components/portfolio/BestandView.tsx` (zweiter Consumer, callback-signature unchanged)
- `src/components/trading/SellModalCore.tsx` (Core-Props unchanged)

---

## Acceptance Criteria

1. **A1** — `sellMut: useSafeMutation` mit `errorTag: 'market.kaderSell'`.
2. **A2** — `cancelMut: useSafeMutation` mit `errorTag: 'market.kaderCancelOrder'`.
3. **A3** — `onSettled: invalidateWallet(qc)` bei beiden Mutations.
4. **A4** — Consumer-API byte-identisch: `{ item, open, onClose, onSell, onCancelOrder }` — KaderTab + BestandView kompilieren unveraendert.
5. **A5** — `selling` = `sellMut.isPending`.
6. **A6** — `cancellingId` = `cancelMut.isPending ? cancelMut.variables?.orderId ?? null : null`.
7. **A7** — `error`/`success`-state wird bei jedem Mutation-Start gecleart (analog existing).
8. **A8** — Rapid-Click Guard: `handleSubmit`-wrapper kehrt früh zurück wenn `sellMut.isPending`. Analog `handleCancel`.
9. **A9** — Tests gruen + tsc clean.

---

## Edge Cases

1. **Rapid-Click Submit:** Second call short-circuitet via `sellMut.isPending` — nur 1 RPC.
2. **Rapid-Click Cancel auf verschiedene Listings:** `cancellingId` unterscheidet. Guard nur aktiv auf gleichen orderId? Bewusst Ja — Parent rendert `disabled={cancellingId === listing.id}` pro Row, user kann nicht einen anderen während Cancel 1 klicken.
3. **Service returnt `{success: false}`:** mutationFn throwt → onError → setError(err.message).
4. **Service throws (network):** mutationFn laesst throw durch → onError → setError(err.message).
5. **Modal-Close waehrend selling:** `preventClose={selling}` bleibt aktiv via SellModalCore.
6. **Auto-dismiss success toast (setTimeout):** bleibt als UX-Behavior, aber ist lokal im onSuccess.

---

## Proof-Plan

| Artefakt | Beweist |
|----------|---------|
| `worklog/proofs/158-vitest.txt` | Neue Tests + Regression + tsc |

---

## Scope-Out

- `SellModalCore.tsx` — bleibt unveraendert (Shared-Core fuer Player-Detail + Kader).
- `src/components/player/detail/SellModal.tsx` — Player-Detail-Wrapper, separater Slice falls Ferrari noetig (ist via `usePlayerTrading` 153b bereits teilweise gedeckt).
- Parent-Komponenten (KaderTab + BestandView) — Callback-Owner, Scope-Out.

---

## Time-Estimate

- Spec: done
- Refactor: 30 min
- Tests: 30 min
- Review: 10 min
- Proof + Log + Commit: 10 min

Total: ~1.5h.
