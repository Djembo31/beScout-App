# Slice 157 — useOffersState Ferrari-Refactor (Phase 3 Welle 2)

**Typ:** M-Slice (Hook-Layer + Tests, keine DB-Change).
**Money-Path:** Ja (acceptOffer/counterOffer touch wallet + card-transfer). Blueprint 153a/b/156.
**Impact:** Skipped (Hook-Layer, 1 Consumer: `OffersTab.tsx`, API 1:1 kompatibel).

---

## Ziel (1 Satz)

`useOffersState.ts` Mutation-Handler (handleAccept/handleReject/handleCounter/handleCancel) nutzen `useSafeMutation` mit Ferrari-Pattern (snapshot optional, error-path + pgBouncer-safe invalidateWallet + errorTag) — race-safe gegen Rapid-Click auf P2P-Offer-Actions.

---

## Problem

`useOffersState.ts:52-131` hat 4 async Handler mit klassischem Anti-Pattern A (Slice 150 Audit Tier-1):

```ts
const handleAccept = useCallback(async (offerId) => {
  if (!uid || actionId) return;   // ← stale closure race
  setActionId(offerId);             // async state-update
  try {
    const result = await acceptOffer(uid, offerId);
    if (result.success) { ... }
    else { showError(result.error ?? 'generic'); }
  } catch (e) { showError(e); }
  finally { setActionId(null); }
}, [uid, actionId, ...]);
```

Race-Surface:
- `actionId`-state shared zwischen accept/reject/cancel (3 Handler blocken gegenseitig, aber synchroner state-update ist async → 2 Clicks innerhalb 16ms beide durchlaufen Guard).
- `counterOffer` hat eigenes `countering`-flag, analoge Race.
- Money-Path: `acceptOffer` triggert atomic trade (Wallet-Deduct + Card-Transfer + Fee-Split) → Rapid-Click = 2× Transfer wäre katastrophal (P2P-Escrow-RPC hat zwar FOR UPDATE lock, aber Client-Race verursacht UI-State-Drift).

---

## Betroffene Files

| # | File | Aenderung |
|---|------|-----------|
| 1 | `src/features/market/components/portfolio/useOffersState.ts` | Refactor: 4x `useSafeMutation` intern, Wrapper-Methoden erhalten async+void-return API. `useQueryClient()` statt Singleton (P2.2). |
| 2 | `src/features/market/components/portfolio/__tests__/useOffersState.test.ts` | Migration: `QueryClientProvider`-wrapper + Ferrari-Assertions (errorTag, onSettled, isPending-guard). Existing 12 Tests erhalten. |

**Nicht geändert:**
- `src/features/market/components/portfolio/OffersTab.tsx` (Consumer-API unveraendert)
- `src/lib/services/offers.ts` (Service-Layer, `{success, error}`-Shape)

---

## Acceptance Criteria

1. **A1** — 4x `useSafeMutation` mit `errorTag` gesetzt: `market.offerAccept`, `market.offerReject`, `market.offerCounter`, `market.offerCancel`.
2. **A2** — `onSettled: invalidateWallet(qc)` bei allen 4 Mutations (pgBouncer-safe, Slice 152c).
3. **A3** — Consumer-API unveraendert: `{ uid, subTab, setSubTab, offers, loading, showCreate, setShowCreate, counterModal, counterPrice, setCounterPrice, actionId, countering, handleAccept, handleReject, handleCounter, handleCancel, openCounterModal, closeCounterModal }`. `OffersTab.tsx` kompiliert unveraendert.
4. **A4** — `actionId` derived aus `acceptMut.isPending|rejectMut.isPending|cancelMut.isPending`: gibt die variable (offerId) der gerade pendenden Mutation zurueck; null wenn keine.
5. **A5** — `countering` derived aus `counterMut.isPending`.
6. **A6** — Rapid-Click Guard: zweiter Click waehrend in-flight ist no-op (keine doppelte RPC-Call).
7. **A7** — `useQueryClient()` statt Singleton-`queryClient`-Import (P2.2-Konvention).
8. **A8** — Alle Tests gruen + tsc clean.

---

## Edge Cases

1. **Rapid-Click Accept+Reject auf demselben Offer:** Handler-Guards via eigene mutation.isPending blocken nicht gegenseitig (2 separate useSafeMutation). **Bewusst:** User-Intent "accept doch nicht sondern reject" soll moeglich sein. Client-Race-Protection ist pro Handler, nicht pro Offer. Server-side ist der Offer nach accept nicht mehr `pending` → reject wuerde einfach `already_processed` returnen.
2. **Service returnt `{success: false, error: 'insufficient_funds'}`:** `mutationFn` throws `new Error('insufficient_funds')`, `onError` routed via `showError(err.message)` analog existing.
3. **Service throws (network):** `mutationFn` laesst throw durch, `onError` routed via `showError(e)`.
4. **CounterPrice edge: `priceCents <= 0`:** Client-pre-check vor `mutateAsync` (existing pattern). Toast `invalidPrice`, kein RPC-Call.
5. **Non-money Handler (reject/cancel):** Kein Wallet-Touch direkt, aber `invalidateWallet` onSettled aus Safety (cancel unlockt escrow → wallet-available-delta).
6. **pgBouncer Read-After-Write:** Nach `acceptOffer` erwartet der User im Wallet-Cache die neue Balance. `invalidateWallet` in `onSettled` triggert refetch im commit-window.
7. **Cross-Mutation shared `offers`-state:** Nach jeder Mutation: `loadOffers()` (existing Pattern) refetcht die Liste. Behalten.

---

## Proof-Plan

| Artefakt | Beweist |
|----------|---------|
| `worklog/proofs/157-vitest.txt` | Hook-Tests gruen (bestehend + neu), tsc clean |

Kein DB-Proof, kein Playwright (UI unchanged, nur refactor).

---

## Scope-Out

- `createOffer` (Buy-Offer placement in `CreateOfferModal.tsx`) — separater Hook, nicht Teil von useOffersState.
- `OffersTab.tsx` Render-Komponente — API-compatible, bleibt unberuehrt.
- Offer-Service-Layer (`src/lib/services/offers.ts`) — bleibt bei `{success, error}`-Shape.

---

## Time-Estimate

- Spec: done
- Build Hook-Refactor: 45 min
- Test-Migration + Ferrari-Tests: 45 min
- Reviewer: 10 min
- Proof + Log + Commit: 15 min

Total: ~2h.
