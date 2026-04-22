# Slice 152 — WalletProvider → useWallet Query (Phase 2 Money Start)

**Datum:** 2026-04-23
**Size:** L (20+ Consumer, Money-Path, Cross-Domain)
**CEO-Scope:** Money-Path (Wallet-Balance), folgt Option Z (State-Sync-Audit 2026-04-23).
**Trigger:** State-Sync-Audit Klasse C (Zwei-Provider), letzter übrig. 151b-RESET hat ClubProvider-Variante erledigt; WalletProvider ist der zweite Brocken.
**Blaupause:** `src/lib/hooks/useToggleFollowClub.ts` (Slice 151b-RESET) — Ferrari-Norm für Mutations. Query-Only-State-Pattern analog.

## Ziel

Nach diesem Slice ist die Wallet-Balance ein normaler React-Query-Entry. `WalletProvider` wird von 207 LOC auf ~30-40 LOC reduziert (oder ganz entfernt, abhängig von `isBalanceFresh`-Design). `setBalanceCents` / `refreshBalance` werden durch `setQueryData` / `invalidateQueries` ersetzt. Alle 20+ Consumer lesen aus dem Query-Cache. Kein parallel-state mehr.

## Kontext — warum WalletProvider weg muss

Der Provider dupliziert Server-Daten als State (Audit Klasse C). Plus:
- **3 Retry-Strategien** + Visibility-Refetch + SessionStorage-Backup — 207 LOC für 1 Zahl. React Query macht das in 10.
- **`setBalanceCents` + `refreshBalance` nebeneinander** in 5 Trading-Handlern (usePlayerTrading, features/market/mutations/trading.ts, MissionBanner, useEventActions, TipButton) → beide triggern parallel, zweiter Fetch überschreibt Optimistic (Audit Klasse A+B).
- **`qk.wallet.all` existiert schon** — 7 Stellen invalidieren bereits. Das Framework ist da, der Provider hängt nur daneben wie ein Legacy-Schatten.

## Strategy — Zielbild

**Neue Hook-Familie** (`src/lib/hooks/`):
- **`useWallet()`** — Query-Hook auf `getWallet(userId)` mit `staleTime: 30s`, auto-refetch on visibility-change. Return: `{ balanceCents, lockedBalanceCents, isLoading, isFetching, dataUpdatedAt }`.
- **`useIsBalanceFresh()`** — kleine abgeleitete Hook: `!isFetching && Date.now() - dataUpdatedAt < 30_000`. BuyModal-Guard behält Semantik.

**Neue Mutation-Helper** (in `src/lib/hooks/useWallet.ts` mitexportiert):
- **`setWalletBalance(queryClient, userId, newBalanceCents)`** — ersetzt `setBalanceCents`. Nutzung in Trading-onSuccess-Handlern: `setWalletBalance(qc, uid, result.new_balance)`.
- **`invalidateWallet(queryClient)`** — ersetzt `refreshBalance()`. Wird in onSettled gerufen.

**`WalletProvider.tsx` → eliminieren komplett** (nicht schrumpfen). Gründe:
- Kein legitimer UI-State übrig (`activeClub` hatte ClubProvider; Wallet hat nichts analoges).
- SessionStorage-Cache für Balance ist brüchig (stale-user-id-Bug-Risiko) — React Query macht's besser über `persist`-Plugin wenn überhaupt.
- Consumer importieren direkt `useWallet` aus `@/lib/hooks/useWallet`.

**Alle 20+ Consumer migrieren:**
- Read-only: `const { balanceCents } = useWallet()` — API identisch, nur Import-Path ändert sich.
- Optimistic-write (Trading): `setBalanceCents(result.new_balance)` → `setWalletBalance(qc, uid, result.new_balance)` in mutation-onSuccess.
- Refresh-trigger: `refreshBalance()` → `invalidateWallet(qc)` in mutation-onSettled.

## Betroffene Files (22 non-test, 5 test)

### NEU
| # | File | Change |
|---|------|--------|
| 1 | `src/lib/hooks/useWallet.ts` | **NEU** — Query-Hook + Helpers (`useWallet`, `useIsBalanceFresh`, `setWalletBalance`, `invalidateWallet`) |
| 2 | `src/lib/hooks/__tests__/useWallet.test.ts` | **NEU** — Query-Lifecycle, setWalletBalance deterministic, freshness-flag |

### MODIFIZIERT
| # | File | Change | Konflikt-Risiko |
|---|------|--------|-----------------|
| 3 | `src/components/providers/WalletProvider.tsx` | **DELETE** (oder Minimal-Stub nur für Legacy-Compat, je nach Entscheidung) | keins |
| 4 | `src/components/providers/Providers.tsx` | `<WalletProvider>` entfernen aus Tree | keins |
| 5 | `src/components/providers/__tests__/WalletProvider.test.tsx` | **DELETE** (durch useWallet.test.ts ersetzt) | keins |
| 6 | `src/features/market/mutations/trading.ts` | `setBalanceCents`/`refreshBalance` → `setWalletBalance`/`invalidateWallet` in 4 Mutation-Handlern | keins |
| 7 | `src/features/market/hooks/useTradeActions.ts` | nur `balanceCents` read — Import-Path swap | keins |
| 8 | `src/features/market/components/MarketContent.tsx` | `useWallet` objekt-destructure unchanged, Import-Path swap | keins |
| 9 | `src/features/market/components/shared/BuyOrderModal.tsx` | `useWallet` → Import-Swap + `isBalanceFresh` via `useIsBalanceFresh` | keins |
| 10 | `src/features/market/components/portfolio/useOffersState.ts` | `refreshBalance` → `invalidateWallet` | keins |
| 11 | `src/features/fantasy/hooks/useEventActions.ts` | `setBalanceCents` → `setWalletBalance` in joinEvent + leaveEvent | keins |
| 12 | `src/components/player/detail/hooks/usePlayerTrading.ts` | `setBalanceCents`/`refreshBalance` in 4 Handlern | keins |
| 13 | `src/components/player/detail/BuyModal.tsx` | `isBalanceFresh` → `useIsBalanceFresh()` | keins |
| 14 | `src/components/community/TipButton.tsx` | `refreshBalance` → `invalidateWallet` | keins |
| 15 | `src/components/community/CreateBountyModal.tsx` | `balanceCents` read — Import-Swap | keins |
| 16 | `src/components/missions/MissionBanner.tsx` | `setBalanceCents` → `setWalletBalance` | **⚠ IN 151b-RESET M — WARTEN auf Commit** |
| 17 | `src/components/profile/ProfileView.tsx` | `balanceCents` read | keins |
| 18 | `src/components/layout/TopBar.tsx` | `balanceCents` read | keins |
| 19 | `src/components/layout/SideNav.tsx` | `balanceCents` read | keins |
| 20 | `src/app/(app)/page.tsx` | `balanceCents` read | keins |
| 21 | `src/app/(app)/player/[id]/PlayerContent.tsx` | `balanceCents` read | keins |
| 22 | `src/components/club/sections/MembershipSection.tsx` | Kein useWallet-Call, aber nutzt schon `qk.wallet.all` invalidate — bleibt unverändert | keins |

### MITBETROFFENE TESTS
| # | Test-File | Change |
|---|-----------|--------|
| T1 | `src/app/(app)/fantasy/__tests__/FantasyContent.test.tsx` | Mock-Setup: `useWallet` Query statt Provider |
| T2 | `src/features/market/hooks/__tests__/useTradeActions.test.ts` | dito |
| T3 | `src/app/(app)/player/[id]/__tests__/PlayerContent.test.tsx` | dito |
| T4 | `src/components/player/detail/trading/__tests__/BuyConfirmation.test.tsx` | dito |
| T5 | `src/features/market/components/portfolio/__tests__/useOffersState.test.ts` | dito |
| T6 | `src/components/profile/__tests__/ProfileView.test.tsx` | dito |
| T7 | `src/components/missions/__tests__/MissionBanner.test.tsx` | dito |

## Acceptance Criteria

1. **Provider weg:** `grep -rn "WalletProvider" src/` → nur `Providers.tsx.bak`-Entfernung und Test-Entfernungs-Dokumentation. Kein Runtime-Code-Treffer.
2. **Alle Consumer auf `@/lib/hooks/useWallet`:** `grep -rn "useWallet" src/` — jeder Treffer importiert aus der neuen Stelle.
3. **Keine `setBalanceCents` / `refreshBalance` mehr:** `grep -rn "setBalanceCents\|refreshBalance" src/` → 0 (außer im neuen Hook als internes Detail).
4. **Money-RPC-Success nutzt `setWalletBalance`:** jeder `result.new_balance` → `setWalletBalance(qc, uid, result.new_balance)` im onSuccess-Handler (nicht `setState`-Spiegel).
5. **`isBalanceFresh` Semantik preserved:** BuyModal disablen-bis-fresh Behavior unverändert. Playwright-Test cold-load → Balance erscheint → BuyModal confirm enabled.
6. **tsc --noEmit clean.**
7. **`npx vitest run` green** — alle 7 betroffenen Test-Files migriert.
8. **`npm run audit:mutation-race:check`** → keine neuen Findings (Baseline stays).
9. **Playwright gegen bescout.net:** Buy-IPO-Flow + Wallet-Balance-Anzeige in TopBar stimmt → Screenshot pre + post trade.
10. **Ferrari-Norm-Konformität:** Jede Trading-Mutation folgt useToggleFollowClub-Struktur (onMutate snapshot × n / onError rollback / onSettled invalidate nur non-deterministic). Reviewer-Agent-AC.

## Edge Cases

1. **Cold-Start:** BuyModal darf nicht clickable sein bevor erster Wallet-Fetch okay ist. `useIsBalanceFresh` muss `false` solange `dataUpdatedAt === 0`.
2. **pgBouncer Read-After-Write:** Nach Trade-RPC liefert onSuccess `result.new_balance`. **Nicht** sofort `invalidateQueries` danach (würde Stale-Read riskieren). Pattern: `setWalletBalance` in onSuccess, `invalidateWallet` erst in onSettled (nach Commit-Fenster).
3. **Visibility-Change Refetch:** React Query default verhält sich bei `refetchOnWindowFocus: true` — bei Tab-Switch wird Balance neu geladen. Gut für Cross-Tab-Sync.
4. **User-Switch (Logout):** `queryClient.removeQueries({ queryKey: qk.wallet.all })` in AuthProvider signOut-Handler. Sonst Leak zwischen Accounts.
5. **SessionStorage-Wartezeit:** Alter Provider las SessionStorage vor Query-Response — spart ~100ms Cold-Flash. Wenn wir das behalten wollen: React-Query `initialData` + `initialDataUpdatedAt` aus SessionStorage. Ohne: minimaler Flash. **Entscheidung: OHNE** — die 100ms sind akzeptabel, SessionStorage-Stale-User-Bug ist raus.
6. **Locked-Balance:** `getWallet` returnt beide (`balance` + `locked_balance`). Ein Query, zwei derived values. Escrow-Flows (Offers, Bounties) funktionieren weiter.
7. **Retry-Logic:** Alter Provider hatte 3 Retries mit exponential backoff. React Query default ist 3 Retries — semantisch identisch, ohne Custom-Code.
8. **Balance-0 nach Final-Attempt:** Alter Provider setzte `balance=0` nach exhausted retries. React Query hält stattdessen `isError: true`. UI-Consumer (TopBar) müssen `balanceCents ?? null` korrekt rendern.
9. **Race mit Membership-Subscribe (151c):** MembershipSection invalidiert schon `qk.wallet.all` nach Subscribe. Pattern bleibt — einfach konsistent.
10. **Logs/Observability:** Alter Provider loggte `console.error` auf final-retry-fail. React Query `onError` auf Query-Level: `logSilentCatch('wallet.fetch', err)`.

## Proof-Plan

1. **Tsc + vitest** → `worklog/proofs/152-tsc-vitest.txt`
2. **`npm run audit:mutation-race:check`** → baseline stabil / no new findings → `worklog/proofs/152-mutation-audit.txt`
3. **Playwright gegen bescout.net:**
   - Vorher: Balance in TopBar sichtbar → Screenshot
   - Buy 1 Card auf `/player/[id]` → wait success → Screenshot (Balance decreased)
   - Navigate nach `/market` → TopBar Balance konsistent (gleiche Zahl)
   - Screenshots `worklog/proofs/152-wallet-before.png`, `-after-buy.png`, `-cross-page.png`
4. **State-Audit-Grep:** `grep -rn "setBalanceCents\|refreshBalance\|WalletProvider" src/` → 0 Treffer → `worklog/proofs/152-state-audit.txt`
5. **Review:** `worklog/reviews/152-review.md` via reviewer-Agent. **Spezielle AC:** "Jede Abweichung zu `useToggleFollowClub`-Pattern ist ein Finding."

## Scope-Out

- **`usePlayerTrading.ts` Refactor** (15 useStates → 3) → Slice 153 (separat, nutzt 152's `useWallet`)
- **`features/market/mutations/trading.ts` vollständige Migration auf Ferrari-Norm (onMutate/onError/onSettled)** → Slice 153 (152 macht nur `setBalanceCents` → `setWalletBalance`-Swap, keine strukturelle Änderung)
- **`useTradeActions.ts` / `TipButton.tsx` Handler-Refactor** → Slice 154
- **ESLint-Rule gegen neue Provider-Neubauten** → Slice 160

## Implementation Order (one file at a time)

**NICHT STARTEN** bevor 151b-RESET committed ist (MissionBanner-Konflikt + allgemeine Provider-Refactoring-Racing).

1. `useWallet.ts` Hook + Helpers schreiben — tsc check
2. `useWallet.test.ts` schreiben (test-writer-Agent, sieht nur Spec) — vitest green
3. `Providers.tsx` — `<WalletProvider>` rausnehmen (noch nicht, erst nach Consumer-Migration!)
4. **Zuerst**: Alle read-only Consumer migrieren (10 Files) — tsc check nach jedem
5. **Dann**: Alle Mutation-Handler-Consumer migrieren (5 Files, `setBalanceCents` → `setWalletBalance`) — tsc check
6. **Dann**: `isBalanceFresh`-Consumer migrieren (2 Files) — tsc check
7. **Dann**: `WalletProvider` aus Tree entfernen, File löschen — tsc check
8. 7 Test-Files migrieren
9. Full `npx vitest run` green
10. `npm run audit:mutation-race:check`
11. Playwright manual
12. Reviewer-Agent

## Risk / Rollback

- Client-only Refactor, keine Migration/RPC-Änderung.
- Rollback via `git revert <commit>` komplett reversibel.
- Deploy-Risk: mittel-hoch — Wallet-Balance-Anzeige ist überall sichtbar. tsc-Check + Playwright-Proof fangen Runtime-Fehler.
- **Biggest Risk:** `isBalanceFresh`-Semantik. Wenn Bug, werden BuyModals dauerhaft disabled. Explizit gegen bescout.net testen.

## Warum erst jetzt und nicht früher

- Phase 1 brauchte Primitive + ESLint-Infrastruktur (151a+d) und zwei Piloten (151b Data-Integrity + 151c Money).
- 151c hat bereits gezeigt dass `qk.wallet.all`-Pattern works (MembershipSection invalidiert es sauber nach Subscribe).
- 151b-RESET etabliert useToggleFollowClub als **Blaupause** — dieser Slice ist die erste Anwendung der Blaupause auf einen Money-Path.

## Referenz-Implementation

Alle Mutation-Handler folgen **exakt** diesem Muster (aus useToggleFollowClub):

```ts
const mut = useSafeMutation<TData, Error, TVars, RollbackContext>({
  mutationFn: async (vars) => { /* RPC-Call */ },
  onMutate: async (vars) => {
    await qc.cancelQueries({ queryKey: qk.wallet.all });
    const prevBalance = qc.getQueryData<WalletData>(qk.wallet.all);
    /* setQueryData optimistic if predictable */
    return { prevBalance };
  },
  onError: (_err, _vars, ctx) => {
    if (ctx?.prevBalance) qc.setQueryData(qk.wallet.all, ctx.prevBalance);
  },
  onSuccess: (result) => {
    setWalletBalance(qc, userId, result.new_balance);  // deterministic from server response
  },
  onSettled: () => {
    invalidateWallet(qc);  // reconcile non-deterministic fields (updated_at etc)
  },
  errorToast: t('tradeError'),
  errorTag: 'trading.buy',
});
```

Keine Ausnahmen. Reviewer flagged jede Abweichung.
