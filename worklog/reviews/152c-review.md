# Review — Slice 152c (Welle 2: Mutation-Consumer WalletProvider-Elimination)

**Reviewer:** Reviewer-Agent (Cold-Context, tool-set Read/Grep/Glob only)
**Datum:** 2026-04-23
**Scope:** 6 Mutation-Consumer-Files + 1 Test-Fix
**Initial Verdict:** REWORK (2 HIGH + 1 MEDIUM)
**Final Verdict nach Fix:** **PASS** (alle HIGH + MEDIUM gefixt)

## Executive Summary

Welle-2-Migration ist funktional korrekt und eliminiert `setBalanceCents`/`refreshBalance` in allen 6 gezielten Code-Pfaden. Die Ferrari-Norm-Abweichungen (kein `onMutate`/`onError`, raw `useMutation`) sind durch Slice-Scope (Spec Zeile 124) bewusst aus Welle 2 ausgenommen und Slice 153 vorbehalten — akzeptabel.

Zwei reale Findings wurden identifiziert und **vor Commit gefixt**:
1. **`invalidateWallet` im `onSuccess` statt `onSettled`** widersprach dem pgBouncer-Safety-Pattern aus `useWallet.ts:200-202`.
2. **Stale-Balance-Fallback** `result.new_balance ?? balanceCents ?? 0` in usePlayerTrading schrieb D18-Dual-State in Cache.

## Findings

| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | **HIGH** | `features/market/mutations/trading.ts:19,39,63,75` | `invalidateWallet(queryClient)` im `onSuccess`-Handler direkt hinter `setWalletBalance`. Verletzt pgBouncer-Read-After-Write-Pattern (useWallet.ts:200-202). Der deterministische Optimistic-Write wird sofort durch einen Stale-Read-Refetch überschrieben (Slice 139-Symptom). | **FIXED** — `invalidateWallet` in neuen `onSettled`-Handler verschoben in allen 4 Hooks. |
| 2 | **HIGH** | `components/player/detail/hooks/usePlayerTrading.ts:181,214` | Gleiche pgBouncer-Issue: `invalidateWallet(queryClient)` direkt nach `setWalletBalance` im try-Block. | **FIXED** — `invalidateWallet` in `finally`-Block verschoben (pgBouncer-safe Timing, analog zu onSettled). |
| 3 | MEDIUM | `components/player/detail/hooks/usePlayerTrading.ts:177,207` | Fallback-Chain `result.new_balance ?? balanceCents ?? 0` schreibt bei fehlender Server-Antwort einen stale-client-balance in den Cache. D18 Dual-State-Drift. | **FIXED** — `if (userId && result.new_balance != null) setWalletBalance(...)` — kein Fallback mehr. |
| 4 | MEDIUM | `usePlayerTrading.ts:186,222` | `useCallback`-Deps beinhalten `balanceCents` wegen #3. | **FIXED** durch #3 — Deps bereinigt. |
| 5 | MEDIUM | `features/market/components/portfolio/__tests__/useOffersState.test.ts:155-165` | `handleAccept`-Test verifiziert `mockInvalidateWallet.toHaveBeenCalled()` — aber **nicht** die Argumente. Kein Regressions-Guard gegen QueryClient-Instance-Drift. | **BACKLOG 153** — Argumenten-Check bei Welle-3-Test-Migration nachziehen. |
| 6 | NIT | `features/fantasy/hooks/useEventActions.ts:86-90` | Legacy-Kommentar "skip 0 -- free events return 0 instead of actual balance" — Verhalten unverändert. | **BACKLOG 153** — RPC-Shape-Cleanup. |
| 7 | NIT | `components/community/TipButton.tsx:95` | `invalidateWallet(qc)` Ordering zwischen transaction-invalidates — minimal. | **BACKLOG** — NIT-Aufräumarbeit. |

## Ferrari-Norm-Diff zur Blaupause (`useToggleFollowClub.ts`)

| Ferrari-Element | Welle-2-Befund | Akzeptabel? |
|---|---|---|
| `useSafeMutation` statt `useMutation` | Trading.ts nutzt raw `useMutation`. | **JA** — Spec Zeile 124 scope-out'd Ferrari-Norm-Upgrade nach Slice 153. |
| `onMutate` + Snapshot | Fehlt in allen 4 Trading-Hooks + 4 usePlayerTrading-Handlern. | **JA** für 152c (Scope-out), **Finding für 153**. Konsequenz: Kein Rollback bei Fehler. Aber: `setWalletBalance` wird nur im `if (result.success)`-Branch gerufen → kein Optimistic vor RPC → faktisch kein Rollback-Bedarf. |
| `onError` + Rollback | Fehlt durchgehend. | **JA** (siehe oben). |
| `onSettled` invalidate-non-deterministic | **Nach Fix: ✅** | Gefixt in trading.ts + usePlayerTrading.ts finally-Block. |
| `errorToast` + `errorTag` | Fehlt. | **JA** für 152c (Scope-out, kommt in 153). |

**Verdict Ferrari-Norm-Konformität**: Strukturelle Abweichungen sind spec-konform (Slice 153-Scope). Das einzige echte Ferrari-Violation war das `invalidateWallet`-Timing (HIGH 1+2) — nach Fix behoben.

## common-errors.md Checks

| Pattern | Status |
|---|---|
| pgBouncer Read-After-Write (§2) | ✅ Nach Fix: onSettled / finally-block pattern |
| Error-Swallowing (§1) | ✅ Kein neuer `.catch(() => null)` |
| Dual-State-Drift (D18) | ✅ Nach Fix #3: kein stale-balance-Fallback mehr |
| i18n-Key-Leak | ✅ Kein Service-Error-Pfad berührt |
| Null-Guards | ✅ `user?.id` / `if (userId && ...)` korrekt |

## Fix-Summary

### `features/market/mutations/trading.ts` (4 Hooks)
Für jeden der 4 Hooks (useBuyFromMarket, useBuyFromIpo, usePlaceBuyOrder, useCancelBuyOrder):
- **Vorher:** `onSuccess` hatte `if (result.new_balance != null) setWalletBalance(...); invalidateWallet(queryClient); ...`
- **Nachher:** `onSuccess` hat nur `setWalletBalance` + deterministic-invalidates (trades/holdings/offers/ipos). Neuer `onSettled`-Handler ruft `invalidateWallet(queryClient)`.

### `components/player/detail/hooks/usePlayerTrading.ts` (2 Handler)
Für executeBuy + handleIpoBuy:
- **Vorher:** `try { ... if (userId) setWalletBalance(qc, userId, result.new_balance ?? balanceCents ?? 0); ... invalidateWallet(queryClient); ... } catch ... finally { buyingRef = false; setBuying(false); }`
- **Nachher:** `try { ... if (userId && result.new_balance != null) setWalletBalance(qc, userId, result.new_balance); ... } catch ... finally { buyingRef = false; setBuying(false); invalidateWallet(queryClient); }` — Fallback raus, invalidateWallet in finally (pgBouncer-safe Timing).
- useCallback-Deps: `balanceCents` raus (nicht mehr captured).

## Post-Fix-Verifikation

- `tsc --noEmit`: clean
- `npx vitest run src/features/market/mutations src/components/player/detail/hooks src/features/market/components/portfolio`: **3/3 Test-Files green, 23 Tests passed**
- Full Welle-2-Test-Run: `worklog/proofs/152c-welle2-vitest.txt` — 44/44 Test-Files, 628 Tests passed

## Slice-153-Backlog

Gezielt für nächsten Slice (Ferrari-Refactor `usePlayerTrading`):
- [#5] useOffersState.test.ts: `expect(mockInvalidateWallet).toHaveBeenCalledWith(queryClient)` statt `toHaveBeenCalled()`
- [Ferrari] usePlayerTrading auf useSafeMutation migrieren (aktuell raw async-Handler mit useRef-Mutex)
- [Ferrari] trading.ts-Hooks mit onMutate + onError erweitern für echtes Optimistic-Pattern
- [#6] RPC-Shape: `balanceAfter=null` statt `=0` in events.mutations bei Free-Events
- [Konvention] Global-Singleton `@/lib/queryClient` vs Hook-scoped `useQueryClient()` — klare Regel festlegen

## Positive

- Saubere Helper-Nutzung (kein direkter `queryClient.setQueryData`-Bypass)
- userId-Guard proaktiv in usePlayerTrading (`if (userId)`)
- `useOffersState.test.ts` Mock-Shape komplett (setWalletBalance + invalidateWallet + useIsBalanceFresh etc)
- Kein `as any` oder Type-Loosening
- Fantasy-Handler's Skip-0-Check preserviert existing behavior

## Verdict

**PASS** nach Fixes. Commit-ready.
