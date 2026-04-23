# CTO Review: Slice 158 — KaderSellModal Ferrari-Refactor

**Reviewer:** reviewer-agent (Cold-Context)
**Date:** 2026-04-23
**Duration:** 9 minutes

---

## Verdict: **PASS**

Keine Findings. Refactor ist 1:1 konsistent mit Blueprints 156 + 157. Callback-API byte-identisch an beiden Parents (KaderTab + BestandView verifiziert). errorTags + invalidateWallet korrekt platziert. Ready to commit.

---

## Spec-Coverage (A1-A9)

Alle 9 Acceptance Criteria erfuellt:

- [x] **A1** — `sellMut.errorTag: 'market.kaderSell'`
- [x] **A2** — `cancelMut.errorTag: 'market.kaderCancelOrder'`
- [x] **A3** — `onSettled: invalidateWallet(qc)` bei beiden Mutations
- [x] **A4** — Callback-API byte-identisch (beide Parents verifiziert)
- [x] **A5** — `selling = sellMut.isPending`
- [x] **A6** — `cancellingId = cancelMut.variables?.orderId ?? null` wenn isPending
- [x] **A7** — `error`/`success`-state gecleart vor mutateAsync (wrapper-level)
- [x] **A8** — Rapid-Click Guard via `mut.isPending`
- [x] **A9** — 13 Tests gruen + tsc clean

## Kritische-Fragen-Auflösung

1. **Wrapper-Value:** Client-side defense-in-depth ist value-add. Modal-local Guard verhindert double-listing in derselben Render-Frame (Slice 150 Tier-1 Concern). Konsistent mit 156/157.
2. **setError-null-Placement:** Wrapper-level Clear korrekt, weil `onMutate` nicht gesetzt ist (kein Optimistic). Bei Rollback-Snapshots würde onMutate richtig sein. Current Placement fine.
3. **onSettled cancel invalidateWallet:** Defensive. Cancel touched Wallet nicht direkt, aber locked-balance-Delta möglich wenn RPC nachträglich refactored. Low-cost invalidate = korrektes over-scope.
4. **setTimeout-Leak:** React 18 swallows. Codebase-Precedent (6 Call-Sites). Keine Action noetig.
5. **err.message Safety:** `useTradeActions.ts:116-138` upstream `resolveErrorMessage` i18n-resolved vor Return — kein raw-key-Leak.
6. **Test-Coverage:** Mock-pass-through SellModalCore ist richtige Granularitaet fuer Hook-Integration-Tests. Parent-Integration gedeckt durch existing BestandView/KaderTab Tests.

## Against common-errors.md

- **§1 Silent-Catch:** Wrapper try/catch schluckt nur mutateAsync-Reject, onError+errorTag+logSilentCatch greift ✓
- **§2 pgBouncer:** N/A — keine DB-Reads im Modal ✓
- **§5 i18n-Key-Leak:** Upstream `resolveErrorMessage` schon i18n-resolved ✓
- **D18 React-setState-Race:** 2× useSafeMutation mit synchronem isPending-Guard ersetzt Legacy `setSelling`/`setCancellingId` Anti-Pattern-B ✓

## Against trading.md

- **Escrow/Money:** delegated an Parent callbacks → `place_sell_order`/`cancel_order` RPCs. Kein Client-Side Money-Manipulation ✓
- **BIGINT cents:** priceCents passed through von SellModalCore (already in cents) ✓

## Positive Highlights

1. **Ferrari-Pattern-Konsistenz 1:1 zu 156/157** — gleiche `useSafeMutation<T,E,V>`-Generics, gleiche onMutate/onError/onSuccess/onSettled/errorTag-Ordering, gleiche Wrapper-try/await-mutateAsync/catch-swallow.
2. **JSDoc dokumentiert Refactor-Intent + Blueprint-References** inline.
3. **13 Tests decken:** null-item guard, onSell args, selling-prop, error/success-prop, onCancelOrder args, cancellingId, beide onSettled-Wege (3 Varianten), beide errorTag-Routes, error-clear on new mutation.
4. **preventClose owned by SellModalCore** reagiert auf `busy = selling || cancellingId` — derived-state wirkt durch zu Modal-Body.

## Learnings für Knowledge Capture

- **positive-pattern** (optional BACKLOG): *"parent-callback returning `{success, error}` should i18n-resolve error at parent-level; child-Modal `setError(err.message)` displays safely"* — könnte in `memory/patterns.md` als expliziter Modal-Wrapper-Pattern.

## Summary

Slice 158 ist ein textbook-Ferrari-Refactor. Money-Path-Tier-1 Defense-in-Depth korrekt, Blueprint-Consistency 1:1. Ready zu PROVE + COMMIT.
