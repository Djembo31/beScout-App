# CTO Review: Slice 153a — trading.ts Ferrari-Refactor

```
verdict: PASS
time-spent: 18
```

## Spec-Coverage

- [x] 4 Hooks migriert auf `useSafeMutation` (useBuyFromMarket, useBuyFromIpo, usePlaceBuyOrder, useCancelBuyOrder)
- [x] `useQueryClient()` statt Singleton (P2.2-Konvention)
- [x] `onMutate` Snapshot + Optimistic wo deterministisch
- [x] `onError` Rollback aus Snapshot
- [x] `onSuccess` Server-Truth + Invalidates
- [x] `onSettled` pgBouncer-safe `invalidateWallet`
- [x] `errorTag` je Hook (market.buy / market.ipoBuy / market.placeBuyOrder / market.cancelBuyOrder)
- [x] 20 Tests (7 Market + 5 IPO + 5 PlaceOrder + 3 CancelOrder)
- [x] API-Rueckwaertskompatibel — 3 Consumer (useTradeActions, BuyOrderModal, BuyOrdersSection) unveraendert
- [x] Ferrari-Blueprint (useToggleFollowClub) Struktur befolgt

## Findings

| # | Severity | File:Line | Issue | Suggested Fix | Status |
|---|----------|-----------|-------|---------------|--------|
| 1 | NIT | trading.ts:74 | Optimistic add `(old ?? 0) + quantity`: wenn kein Holding-Row existierte und `onError` triggert, `prevHoldingQty=undefined` → Rollback-Branch skippt, optimistic-Wert bleibt im Cache bis naechstes invalidate. | In onError zusaetzlich bei `ctx?.prevHoldingQty === undefined`: `qc.removeQueries({ queryKey })` — loescht phantom-Optimistic. | **FIXED inline** in beiden Buy-Hooks + 2 neue Tests |
| 2 | NIT | trading.ts:91 | `refetchQueries({ type: 'all' })` forced refetch auch inactive queries. Bei Whales minimal teurer als `type: 'active'`. Inline-Kommentar erklaert Intention (N-1 bei /manager?tab=kader). | Keine Aktion — Doku im Code ausreichend. | ACCEPTED |
| 3 | NIT | trading.test.ts:298 | `usePlaceBuyOrder` „no optimistic" Test wartet nur 10ms — theoretisch race-y bei langsamen CI. | `await waitFor(() => expect(result.current.isPending).toBe(true))`. Nicht blocking. | BACKLOG |
| 4 | NIT | trading.ts:211 | `invalidateTradeQueries('', userId)` — leerer playerId-String als Signal-Wert. Brittle. | Zweite Signatur `invalidateTradeQueries.forUser(userId)` oder nullable playerId. | BACKLOG (153b/159) |

**Keine CRITICAL/HIGH/MEDIUM Findings.**

## Prueffokus (Spec-gefordert)

### pgBouncer-Timing onSettled/invalidateWallet ✅
- `onSettled` laeuft nach Commit-Window → `invalidateWallet(qc)` refetcht aus Wallet-Query-Key (useWallet.ts:200-202 pgBouncer-safe). Kein direkter `.select()` post-RPC im Client-Pfad. Konsistent mit Slice 152c HIGH-1 Pattern.
- **onSuccess vs onSettled Reihenfolge:** setWalletBalance (optimistic server-truth) → onSettled invalidateWallet. React Query garantiert onSuccess-before-onSettled → zuerst manual Balance-Write, dann Refetch-Flag. Kein Race.

### Optimistic-Rollback-Korrektheit ✅
- `useBuyFromMarket`: nur `['holdings', 'qty', uid, pid]` touched, Rollback aus `prevHoldingQty` Snapshot.
- `useBuyFromIpo`: zwei Keys touched (`holdings.qty` + `ipos.purchases`), beide unabhaengig rollbacked.
- `cancelQueries` vor `setQueryData` → keine Race mit in-flight-Observer-Refetch.
- Snapshot IM onMutate (nicht close-over), via `getQueryData`.

### errorTag-Observability ✅
- Alle 4 Hooks haben distinct `errorTag`. Sentry-Breadcrumb laeuft via `logSilentCatch` (useSafeMutation.ts:125).
- Test verifiziert alle 4 Tags.

### API-Kompatibilitaet der 3 Consumer ✅
- `useTradeActions.ts:30-34` — destructured `mutate, isPending, isSuccess, isError, error, variables, reset` — alle weiterhin am SafeMutationResult-Interface.
- `BuyOrderModal.tsx:37` — `{ mutate: doPlace, isPending }` + per-call `{onSuccess, onError}` funktioniert (React Query v5 merged beide).
- `BuyOrdersSection.tsx:33` — kompatibel.
- Barrel re-export `src/lib/mutations/trading.ts` unveraendert → import-Pfad bricht nicht.

## Positive

- **File-Header Dokumentations-gold:** 29 Zeilen JSDoc erklaeren Ausgangslage, Blueprint, Design-Entscheidungen (errorToast + Optimistic-Scope) mit Begruendung.
- **Inline-Kommentare** bei jedem Lifecycle-Hook: „Slice 152c HIGH-1", „N-1 bei /manager?tab=kader", „pgBouncer Read-After-Write" — Why-Context direkt im Code.
- **Typsicherheit:** Generic-Typing `<Awaited<ReturnType<typeof buyFromMarket>>, Error, Vars, BuyContext>` vollstaendig — kein `any`, keine Casts.
- **gcTime:60_000 Test-Helper-Kommentar** erklaert subtle-Bug (optimistic-updates zombie-GC'ed wenn kein Observer).
- **safeTrigger-Test:** waitFor isPending-Flipping vor zweitem trigger — korrekte Timing-Handhabung.
- **Ferrari-Blueprint-Konformitaet:** Jeder Aspekt 1:1 zu useToggleFollowClub.ts.

## Learnings fuer Knowledge Capture (Backlog)

- **memory/patterns.md Kandidat:** Optimistic-Scope-Entscheidungstree (wann deterministic-field optimistic'n vs. wann nicht).
- **common-errors.md Kandidat:** Rollback-Gap bei `prev === undefined` → Fix-Pattern `removeQueries`.
- **Test-Pattern-Kandidat:** `gcTime: 60_000` statt default im Test-QueryClient-Helper.

## Summary

Mustergueltiger Ferrari-Refactor. 20 Tests decken alle Lifecycle-Pfade ab. Ferrari-Blueprint (useToggleFollowClub) 1:1 befolgt, pgBouncer-Timing korrekt, Optimistic-Scope bewusst und begruendet eng. Nur 4 Nitpicks — Finding #1 inline gefixt (Phantom-Optimistic-Rollback bei undefined-snapshot). 3 Consumer bleiben API-kompatibel. **PASS — go ahead zu Slice 153b (usePlayerTrading.ts).**
