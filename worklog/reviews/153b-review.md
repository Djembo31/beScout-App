# CTO Review: Slice 153b — `usePlayerTrading` Ferrari-Refactor

```
verdict: REWORK → PASS (nach inline-Fixes)
time-spent: 42
```

## Spec-Coverage

- [x] 6 interne `useSafeMutation`-Instanzen (buyMut, ipoBuyMut, sellMut, cancelMut, createOfferMut, acceptBidMut)
- [x] `useRef`-Mutexes (`buyingRef`, `ipoBuyingRef`, `sellingRef`) entfernt — `safeTrigger` ersetzt
- [x] Manuelle `setBuying`/`setIpoBuying`/`setSelling` entfernt — isPending abgeleitet
- [x] Manuelle `setBuyError`/`setSellError` entfernt — derived via `resolveErrorMessage`
- [x] Optimistic in `onMutate`, Rollback in `onError` (Buy + IPO-Buy, inkl. Phantom-Rollback)
- [x] Public-API 1:1 kompatibel (30+ Properties)
- [x] `errorTag` je Money-Mutation
- [x] `onSettled` pgBouncer-safe `invalidateWallet` in Buy/IPO/Sell/Cancel
- [x] 33 Tests grün
- [x] `resolveErrorMessage` Helper

## Findings

| # | Severity | File:Line | Issue | Status |
|---|----------|-----------|-------|--------|
| 1 | **HIGH** | usePlayerTrading.ts handleShareTrade | `catch {}` ohne `logSilentCatch` — verstößt gegen trading.md + common-errors.md §5. | **FIXED inline** — `logSilentCatch('player.shareTrade', err)` + `addToast('shareFailed', 'error')` |
| 2 | **MEDIUM** | usePlayerTrading.ts buyError-derivation | `cancelMut.error` fälschlich in `buyError` gemergt — Cancel-Error erschiene in BuyModal. | **FIXED** — `cancelMut.error` aus `buyError` raus + `addToast(resolveErrorMessage, 'error')` in cancelMut onError |
| 3 | MEDIUM | usePlayerTrading.ts Buy onMutate | `setShared(false)` gehört nicht in `onMutate`, sondern zu `openBuyModal`-Reset. | **FIXED** — nach openBuyModal verschoben |
| 4 | MEDIUM | usePlayerTrading.ts handleAcceptBid | Guard `if (acceptingBidId)` race-y — sollte `acceptBidMut.isPending` sein. | **FIXED** |
| 5 | MEDIUM | usePlayerTrading.ts handleCancelOrder | Gleiche Klasse — `if (cancelMut.isPending) return;` vor setCancellingId. | **FIXED** + neuer Test |
| 6 | LOW | usePlayerTrading.ts setTimeout(5000) ohne Cleanup | Dev-Warning bei unmount vor Timeout. | BACKLOG (non-blocking) |
| 7 | LOW | usePlayerTrading.ts openSellModal | `sellMut.reset()` fehlt, Konsistenz zu openBuyModal. | **FIXED** |
| 8 | LOW | usePlayerTrading.ts buySuccess | Naming misleading (eigentlich `lastActionSuccess`). | BACKLOG (API-Break) |
| 9 | LOW | usePlayerTrading.ts `buying` | Deckt buyFromMarket + buyFromOrder gemeinsam ab — Doku. | BACKLOG |
| 10 | NIT | 6× eslint-disable-next-line | Blueprint-Konvention, Inline-Kommentar-Refresh optional. | BACKLOG |
| 11 | NIT | isIPO double-null-check | Cleanup `activeIpo != null` reicht. | **FIXED** (cosmetic) |
| 12 | NIT | resolveErrorMessage silent-catch | `te()` kann throw bei missing-key — `logSilentCatch` ergänzen. | **FIXED** |
| 13 | NIT | Test-File Race-Kommentar | Offenbart #4/#5 — bereits gefixt + neuer Test. | **ADDRESSED** |

## Prüffokus (Spec-gefordert)

### pgBouncer-Timing ✅
- `invalidateWallet(qc)` in onSettled von buyMut, ipoBuyMut, sellMut, cancelMut. Nicht in createOfferMut/acceptBidMut (kein Wallet-Touch). Korrekt.

### Optimistic-Correctness ✅
- Buy + IPO-Buy Rollback inkl. Phantom-Rollback (removeQueries bei undefined-snapshot) in beiden.
- Tests verifizieren beide Keys (qty + ipos.purchases) separat.

### Race-Conditions (ursprünglich REWORK) → FIXED
- handleAcceptBid + handleCancelOrder nutzen jetzt `mut.isPending`-Guard (authoritative) statt local-state-id.
- Neuer Test `handleCancelOrder does not re-trigger while pending` (2. Call blockt).

### Ferrari-Blueprint-Konformität ✅
- Jede Money-Mutation hat onMutate (wo Optimistic), onError (Rollback oder errorToast), onSuccess (Server-Truth), onSettled (pgBouncer-Invalidate bei Wallet-Touch), errorTag.

### Against common-errors.md
- §1 Silent-Catch: handleShareTrade FIXED, resolveErrorMessage FIXED.
- §2 pgBouncer: OK.
- §5 i18n-Key-Leak: OK (resolveErrorMessage zentral).
- D18 Dual-State: OK (Single-Source Query-Cache via mutation.isPending/error).
- React-setState-Race: Findings #4/#5 geschlossen.

## Positive

- **Ferrari-Blueprint 1:1 befolgt** (onMutate/onError/onSuccess/onSettled/errorTag-Pattern).
- **Phantom-Rollback** korrekt aus 153a propagiert in beiden Buy-Varianten.
- **useQueryClient() + P2.2-Konvention** konsistent.
- **Typsicherheit:** `Awaited<ReturnType<typeof ...>>` + generic Context. Kein `any`.
- **File-Header 60 Zeilen** erklärt jede Design-Entscheidung.
- **Inline-Why-Kommentare** bei kritischen Stellen („152c HIGH-1", „two-phase flow", „phantom-rollback 153a").
- **i18n-Key-Leak-Defense** über resolveErrorMessage zentral.
- **33 Tests** decken alle Lifecycle-Pfade + Race-Guards + Phantom-Rollback.
- **API-Kompatibilität** verifiziert: 30+ Properties unverändert, PlayerContent.tsx kein Touch.

## Learnings für Knowledge Capture

- **common-errors.md §5 Erweiterung:** Silent-catch in fire-and-forget-Patterns (außerhalb useSafeMutation) MUSS `logSilentCatch` ziehen. Pattern: `} catch (err) { logSilentCatch('ns.action', err); userFeedback(); }`.
- **memory/patterns.md Kandidat:** „Cancel-with-id Dual-Guard" — bei per-row-Cancelling-UI immer `mut.isPending`-short-circuit zusätzlich zu local-state-id. Template dokumentieren.
- **common-errors.md §6 Erweiterung:** `te(key)` kann throw → always wrap mit `logSilentCatch('i18n.resolve', err, { key })`.
- **Ferrari-Blueprint Erweiterung:** `resetOnModalOpen`-Konvention — jede Mutation mit error-State braucht `mut.reset()` in `openXModal` sonst stale-error bei Re-Open.

## Summary

**Initial REWORK** wegen 1 HIGH + 4 MEDIUM. Nach inline-Fixes (6 Punkte adressiert, 2 NITs mitgefixt) → **PASS**. Die 5 LOW/NIT sind Polish-Backlog (nicht blocking). 34 Tests grün nach Fixes (1 neuer für handleCancelOrder-Race-Guard). Money-Path-Refactor produktionsreif.
