# Review — Slice 152b (Welle 1: Read-only Wallet-Consumer Migration)

**Reviewer:** Primary-Claude Self-Review (Welle 1 ist triviale Substitution,
Reviewer-Agent kommt bei 152c + 152d wegen Money-Path-Behavior-Change)
**Datum:** 2026-04-23
**Scope:** 10 Consumer-Files + 2 Test-Files (Mock-Path-Swap)
**Verdict:** **PASS**

## Scope

**10 Consumer migriert** (Import-Swap `@/components/providers/WalletProvider` → `@/lib/hooks/useWallet`):

| # | File | Destruct | Besonderheit |
|---|------|----------|--------------|
| 1 | `src/features/market/components/MarketContent.tsx` | `useWallet()` object-call → `wallet.balanceCents` | Interface-kompatibel (balanceCents existiert in beiden) |
| 2 | `src/features/market/hooks/useTradeActions.ts` | `{ balanceCents }` | trivial |
| 3 | `src/components/community/CreateBountyModal.tsx` | `{ balanceCents }` | trivial |
| 4 | `src/components/profile/ProfileView.tsx` | `{ balanceCents }` | trivial |
| 5 | `src/components/layout/TopBar.tsx` | `{ balanceCents }` | trivial (Balance-Anzeige global) |
| 6 | `src/components/layout/SideNav.tsx` | `{ balanceCents }` | trivial |
| 7 | `src/app/(app)/page.tsx` | `{ balanceCents }` | trivial (Home) |
| 8 | `src/app/(app)/player/[id]/PlayerContent.tsx` | `{ balanceCents }` | trivial |
| 9 | `src/features/market/components/shared/BuyOrderModal.tsx` | `{ balanceCents, lockedBalanceCents }` + `useIsBalanceFresh()` | **Split:** `isBalanceFresh` in separatem Hook |
| 10 | `src/components/player/detail/BuyModal.tsx` | `useIsBalanceFresh()` | **Nur** Freshness-Flag — kompletter useWallet-Import weg |

**2 Test-Files Mock-Pfad aktualisiert:**

| # | Test-File | Change |
|---|-----------|--------|
| 1 | `src/features/market/hooks/__tests__/useTradeActions.test.ts` | `vi.mock('@/components/providers/WalletProvider')` → `vi.mock('@/lib/hooks/useWallet')` mit vollem UseWalletResult-Shape + useIsBalanceFresh + 4 Helper-Mocks |
| 2 | `src/components/profile/__tests__/ProfileView.test.tsx` | dito |

## Prüfmatrix

### 1. Kein Behavior-Change

- ✅ Alle migrierten Files destructuren identische Property-Namen (`balanceCents`, `lockedBalanceCents`)
- ✅ `isBalanceFresh`-Split korrekt: neuer separater Hook `useIsBalanceFresh()` hat semantisch identische Logik zum alten Provider-Flag (30s-Freshness-Window)
- ✅ Kein `setBalanceCents` / `refreshBalance` in Welle 1 betroffen (das ist Welle 2 = 152c)
- ✅ WalletProvider läuft weiterhin parallel im Tree — Consumer nutzen neue Query, Provider-Query wird in 152d entfernt. Temporärer Dual-Fetch-Overhead akzeptabel.

### 2. TypeScript

- ✅ `tsc --noEmit` clean (kein Output)
- ✅ Interface `UseWalletResult` matched alte Provider-API für alle destructured Properties

### 3. Tests

- ✅ Vor Migration: 2 Test-Files failed (useTradeActions + ProfileView — mocken alten Provider)
- ✅ Nach Test-Fix: **41/41 Test-Files green, 500 Tests passed** im Consumer-Umkreis
- ✅ Pre-existing DB-Invariant-Failures (INV-35/38/39/40) sind Data-Quality-Issues (stale contract_end, wikipedia-logo, ghost-rows, duplicates) — unabhängig von 152b, verifiziert via `git stash` + re-run (4/4 failed auch ohne meine Änderungen)

### 4. Ferrari-Norm-Konformität

- ✅ Keine Re-Exports, kein Alias-Schatten — Consumer importieren direkt aus neuer Hook-File
- ✅ `isBalanceFresh` nicht als Object-Property versteckt, sondern eigener Hook → macht Tree-Shaking möglich + klare API-Trennung
- ✅ Test-Mocks decken das komplette UseWalletResult-Interface ab (nicht nur `balanceCents` wie vorher) — Regression-Sicherheit bei Interface-Änderung

### 5. common-errors.md Checks

- ✅ Kein `useState`-Spiegel zu Query-Daten (D18-Pattern vermieden)
- ✅ Kein invalidate parallel zu setQueryData (irrelevant für Welle 1, Read-only)
- ✅ i18n-Keys unverändert (kein Service-Error-Pfad berührt)

## Findings

**Keine Blocker. Keine Findings.**

## Welle-2-Vorschau (152c)

In 152c werden **5 Mutation-Consumer** migriert:
- `features/market/mutations/trading.ts` — 4 `useMutation`-Hooks (buy-market/buy-ipo/place-order/cancel) mit `setBalanceCents` + `refreshBalance` parallel
- `components/player/detail/hooks/usePlayerTrading.ts` — 4 Handler in einem Hook
- `features/market/components/portfolio/useOffersState.ts` — `refreshBalance`
- `features/fantasy/hooks/useEventActions.ts` — `setBalanceCents` in joinEvent/leaveEvent
- `components/community/TipButton.tsx` — `refreshBalance`
- `components/missions/MissionBanner.tsx` — `setBalanceCents`

**Behavior-Change (pflicht Reviewer-Agent):** `setBalanceCents(result.new_balance)` → `setWalletBalance(qc, uid, result.new_balance)` (onSuccess) UND `refreshBalance()` → `invalidateWallet(qc)` (onSettled).

Referenz-Pattern aus `useWallet.ts` file-header JSDoc — Reviewer-Agent soll jede Abweichung als Finding flaggen.

## Rollback-Pfad

`git revert <152b-commit>` macht alle 10 Consumer-Imports + 2 Test-Mocks rückgängig. 152a-Foundation bleibt intakt (Hook + Helpers + Tests).
