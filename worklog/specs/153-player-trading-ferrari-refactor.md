# Slice 153 — `usePlayerTrading` + `trading.ts` Ferrari-Refactor

**Stage:** SPEC
**Status:** active
**Owner:** Claude (CTO-Scope, Money-Path-Reviewer-Pflicht)
**Size:** L (Sub-Slice-Gating: 153a M + 153b L)
**Datum:** 2026-04-23

---

## Ziel (1 Satz user-sichtbares Verhalten)

Money-Path-Mutations (Market-Buy, IPO-Buy, Place/Cancel-Buy-Order, sowie die 7 Handler in `usePlayerTrading`) erfuellen den Ferrari-Blueprint: `useSafeMutation` + `onMutate`/`onError`-Rollback + `errorToast`/`errorTag`. Fuer User bedeutet das: zuverlaessige Optimistic-Updates mit sauberem Rollback bei Fehlern, einheitliche i18n-Error-Toasts, und Sentry-Breadcrumbs fuer jede Money-Mutation.

---

## Slice-Struktur (D22 Sub-Slice-Gating)

**Welle 153a** — `features/market/mutations/trading.ts`
- 4 Mutation-Hooks (raw `useMutation` → `useSafeMutation`)
- Scope: klein (~4 Files), klares Refactor-Template
- Blocker fuer 153b: Ja (Blueprint-Bestaetigung vor dem grossen Hook)

**Welle 153b** — `components/player/detail/hooks/usePlayerTrading.ts`
- 7 Handler (executeBuy, handleIpoBuy, handleSell, handleCancelOrder, handleCreateOffer, handleAcceptBid, handleShareTrade)
- Scope: gross (~8-10 Files inkl. Consumer-Adjustments)
- Nach 153a-PASS

**Gate-Order:** 153a SPEC-IMPACT-BUILD-REVIEW-PROVE-LOG → 153b SPEC-IMPACT-BUILD-REVIEW-PROVE-LOG.

---

## Betroffene Files

### Welle 153a (M-Slice, ~4 Files)

| File | Aenderung |
|------|-----------|
| `src/features/market/mutations/trading.ts` | 4 Hooks auf `useSafeMutation` + `onMutate`/`onError`/Rollback + `errorTag` + Singleton → `useQueryClient()` (P2.2-Konvention) |
| `src/features/market/mutations/__tests__/trading.test.ts` | Expand: Rapid-Click-Guard, Rollback-Test, errorToast-Test (Existierende Tests bleiben) |
| `src/features/market/hooks/useTradeActions.ts` | Falls `trading.ts`-API-Shape sich aendert — grep-check, mutmasslich nur Re-Exports |
| Direct Consumer via grep | Identifizieren + signaturkonform halten (Ziel: kein Consumer-Change) |

### Welle 153b (L-Slice, ~8-10 Files)

| File | Aenderung |
|------|-----------|
| `src/components/player/detail/hooks/usePlayerTrading.ts` | Zerlegen in 6-7 useSafeMutation-Instanzen; useRef-Mutexe + setBuying/etc raus |
| `src/components/player/detail/hooks/__tests__/usePlayerTrading.test.ts` | Neu/Expand fuer Rollback + isPending + errorToast |
| Consumer in `src/components/player/detail/` | BuyModal, SellModal, Trading/Bids-Panels — API-Kompatibilitaet pruefen (Ziel: keine API-Change) |
| `src/features/market/mutations/trading.ts` | ggf. Re-Use der 153a-Hooks in usePlayerTrading (DRY) |

---

## Acceptance Criteria

### Welle 153a

1. Alle 4 Hooks in `trading.ts` nutzen `useSafeMutation` (nicht raw `useMutation`).
2. Alle 4 Hooks rufen `useQueryClient()` (P2.2-Konvention — kein Singleton-Import `@/lib/queryClient`).
3. Alle 4 Hooks haben `errorTag: 'market.buy'` / `'market.ipoBuy'` / `'market.placeBuyOrder'` / `'market.cancelBuyOrder'` gesetzt.
4. `onMutate` + Rollback fuer Market-Buy/IPO-Buy auf `qk.holdings.byUser` + Wallet-Cache (Buy-Side deterministisch).
5. `onSettled` + `invalidateWallet(qc)` pgBouncer-safe Pattern bleibt (bereits in 152c korrekt).
6. `errorToast` RESOLVED i18n-String aus `useTranslations('errors')` statt rohem Key.
7. tsc clean + vitest grün (≥ bisher 44 Test-Files).
8. Reviewer-Verdict: PASS.

### Welle 153b

1. 6-7 `useSafeMutation`-Instanzen (je Handler), oder Re-Use der 153a-Hooks wo sinnvoll.
2. `useRef`-Mutexe (`buyingRef`, `ipoBuyingRef`, `sellingRef`) entfernt — `safeTrigger` short-circuitet.
3. `setBuying`, `setIpoBuying`, `setSelling`, `setCancellingId` entfernt — Mutation liefert `isPending`.
4. `setBuyError`, `setSellError` entfernt — Mutation `error` + `errorToast` ersetzt.
5. Optimistic-Updates (Holdings-Splice, Wallet-Balance) in `onMutate`, Rollback in `onError`.
6. Public-API-Shape des Hooks bleibt kompatibel (Consumer unbroken).
7. `resolveErrorMessage`-Helper umbauen oder pro-Mutation `errorToast` setzen.
8. tsc clean + vitest grün.
9. Playwright-Proof: Buy → Balance-Update live → Kader-Tab zeigt Player (Money-Flow-Smoke).
10. Reviewer-Verdict: PASS.

---

## Edge Cases

1. **Rapid-Click Buy (Race):** Zwei `onClick` in <50ms — `safeTrigger` short-circuitet 2. Call. Expected: 1 RPC, 1 Toast.
2. **RPC Error `insufficient_funds`:** Optimistic-Holdings + Optimistic-Wallet roolen zurueck. Cache = pre-mutation-State, Toast mit i18n-Error.
3. **RPC Network-Retry (Mobile-Switch):** Zweite `safeTrigger` blockiert via `isPending`. Server-Idempotency (D18-Pattern aus Slice 151c.2) NICHT Teil dieses Slices — separat auditieren falls nicht vorhanden.
4. **Optimistic ohne Server-Balance:** `result.new_balance == null` → `setWalletBalance` skip (kein Cache-Dirtying). Invalidate via `onSettled` holt Truth.
5. **Component unmount waehrend Pending:** User navigiert weg waehrend Mutation in-flight. React Query v5 safe — `onSettled` schreibt Cache auch off-screen.
6. **IPO-Sold-Out Race:** Zwei User, last-unit. Server gewinnt einer, `onError` rolls back Optimistic fuer den Verlierer.
7. **Cancel-Order parallel zu Buy:** Verschiedene `useSafeMutation`-Instanzen — kein Kreuz-Block.
8. **Offline Sell:** Service throws NetworkError. `errorToast` zeigt `errors.offline`, `error`-Feld populiert.
9. **i18n-Leak:** `errorToast` MUSS RESOLVED String sein (`te('insufficientFunds')`), nicht raw Key `'insufficientFunds'`.
10. **Accept-Bid Money-Path:** Optimistic Holdings-Update wie Market-Buy, plus Incoming-Offer-Removal. Rollback bei Server-Error.
11. **Free-IPO Buy (falls existent):** `ipo_price_cents === 0` → kein Wallet-Mutation-Code-Path ausloesen. (Heute implicit durch `result.new_balance != null`.)
12. **stale-allSellOrders-Props:** `usePlayerTrading` bekommt `allSellOrders` via Props; Buy-Mutation darf nicht auf stale-Prop-Daten rollbacken — `onError` schreibt `prev` ausm Snapshot, nicht aktuelle Props.

---

## Proof-Plan

### Welle 153a

| Artefakt | Format |
|----------|--------|
| `worklog/proofs/153a-trading-vitest.txt` | `npx vitest run src/features/market/mutations` — alle Tests gruen |
| `worklog/proofs/153a-ferrari-diff.txt` | `git diff src/features/market/mutations/trading.ts` — structural-diff zu Blueprint |
| `worklog/proofs/153a-errorTag-audit.txt` | `grep -n "errorTag" src/features/market/mutations/trading.ts` zeigt 4 Tags |

### Welle 153b

| Artefakt | Format |
|----------|--------|
| `worklog/proofs/153b-usePlayerTrading-vitest.txt` | `npx vitest run src/components/player/detail/hooks` — alle Tests gruen |
| `worklog/proofs/153b-playwright-buy-flow.png` | MCP-Playwright: Login → /player/[id] → Buy → Balance sichtbar aktualisiert → Kader zeigt Player |
| `worklog/proofs/153b-playwright-rollback.png` | MCP-Playwright: Insufficient-Funds-Scenario → Holdings-Count unveraendert → Error-Toast sichtbar |
| `worklog/proofs/153b-api-compat.txt` | Public-API-Diff: Exportierte Hook-Returns vor/nach Refactor identisch |

---

## Scope-Out (explizit NICHT in Slice 153)

| Aufgabe | Naechster Slice |
|---------|-----------------|
| Events + FantasyStore Ferrari-Refactor | 156 |
| Watchlist Ferrari-Refactor | 157 |
| Community Votes Ferrari-Refactor | 158 |
| P2.3: `balance_after=null` in events.mutations RPC | 156 |
| Profile-Hook-Refactor | 159 |
| `.claude/rules/mutations.md` + ESLint-Rule Codification | 160 |
| Server-side RPC-Idempotency (Buy/Sell/IPO) | Separater Slice wenn Audit zeigt Luecken |
| Consumer-Migration bei API-Breaking-Change | Unerwuenscht — Ziel ist Inner-Refactor |

---

## CEO-Scope Check

- **Scope:** Hook-Layer-Refactor, keine Money-Logik-Aenderung, keine RPC-Signatur-Aenderung.
- **CTO-Scope:** Ja (technische Umsetzung, Pattern-Konsistenz).
- **Money-Path:** Ja — Cold-Context-Reviewer PFLICHT (D13 + `ceo-approval-matrix.md` „Trading-RPCs" triggert Reviewer auch wenn Approval nicht noetig).

---

## Ferrari-Blueprint Referenz

| Aspekt | Datei |
|--------|-------|
| Mutation-Pattern (onMutate/onError/onSettled) | `src/lib/hooks/useToggleFollowClub.ts` |
| Cross-Mutation-Shared-State (pgBouncer-safe) | `src/lib/hooks/useWallet.ts:200-202` |
| Primitive (`useSafeMutation` + `safeTrigger`) | `src/lib/hooks/useSafeMutation.ts` |
| D18 Mutation-Audit Backlog-Status | `worklog/proofs/150-mutation-audit.md` |
| P2.2 queryClient-Konvention | dieser Spec + Slice 160 Codification |

Reviewer-Briefing (fuer beide Wellen): **„Jede Abweichung zu useToggleFollowClub.ts / useWallet.ts ist ein Finding. Money-Path — keine Kompromisse."**

---

## Carry-Over Integration (aus Slice 152c)

- ✅ P2.1: `useOffersState.test.ts` Assertion verschaerft (bereits committed `f215d0c0`).
- 🟡 P2.2: Singleton `@/lib/queryClient` → `useQueryClient()` — wird in 153a umgesetzt (trading.ts). Codification in Slice 160.
- 🔴 P2.3: RPC `balance_after=null` in events.mutations — deferred Slice 156 (Events-Domain).

---

## Risiko-Assessment

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|-----------|
| Consumer-Breakage von `usePlayerTrading` | Mittel | Hoch (7+ Consumer) | Public-API-Diff als AC; Smoke-Test vor Merge |
| Optimistic-Rollback-Race bei parallelen Mutations | Niedrig | Mittel | Snapshot in `onMutate`-Context, nicht Props-basiert (EC-12) |
| `setWalletBalance` doppelt-aufgerufen (onMutate + onSuccess) | Mittel | Niedrig | Klarer Pattern: `onMutate` schreibt optimistisch, `onSuccess` korrigiert mit Server-Truth |
| Reviewer-REWORK bei Ferrari-Abweichung | Hoch | Niedrig | Welle-Split erlaubt 153a als Pilot; Blueprint strikt folgen |

---

**Naechste Stage:** IMPACT (grep Consumer + Seiteneffekte) oder bei klarer Pattern-Wiederholung direkt BUILD 153a.
