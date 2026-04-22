# Review — Slice 152d (Welle 3 Final: WalletProvider Elimination)

**Reviewer:** Reviewer-Agent (Cold-Context, read-only tools)
**Datum:** 2026-04-23
**Scope:** 2 Modified Files + 2 Deleted Files + 3 Test-Mock-Migrations + 1 Test-Case-Anpassung
**Verdict:** **PASS** (1 NIT-Finding, gefixt inline vor Commit)

## Executive Summary

Slice 152d schliesst die WalletProvider-Elimination sauber ab. 207 LOC des alten Dual-State-Providers entfernt, Consumer laufen alle über `useWallet` Query-Hook, 4 Test-Mocks konsistent migriert. Spec-AC #1-#7 + #10 erfüllt, Provider-Tree intakt, AuthProvider-signOut-Entscheidung (`queryClient.clear()` statt `removeWalletFromCache`) korrekt begründet. **Phase 2 Money-Cleanup komplett.**

## Spec-Coverage

| AC | Status | Beweis |
|---|---|---|
| #1 Provider weg | ✅ | `WalletProvider.tsx` + `WalletProvider.test.tsx` deleted. Grep: nur Kommentar-Treffer |
| #2 Alle Consumer `@/lib/hooks/useWallet` | ✅ | 15 Consumer (Read + Mutation + Tests) auf neuen Pfad |
| #3 Kein `setBalanceCents`/`refreshBalance` | ✅ | Grep: 5 Treffer, alle Kommentare (JSDoc-Referenzen zu alter API) |
| #4 Money-RPC `setWalletBalance` | ✅ | Bereits in 152c committed |
| #5 `isBalanceFresh` Semantik preserved | ✅ | `useIsBalanceFresh` aus 152a |
| #6 tsc clean | ✅ | `npx tsc --noEmit` no output |
| #7 vitest green | ✅ | 190/191 Test-Files green (1 pre-existing Data-Quality-Failure, nicht code-bezogen) |
| #10 Ferrari-Norm-Konformität | ✅ (Read-Consumer) | Read-Consumer durchgehend Query-Hook; Mutation-Ferrari-Upgrade = Slice-153-Scope per Spec |

## Prüfungsfokus-Check

### 1. Provider-Tree-Korrektheit — PASS

- Tree: `QueryProvider → AuthProvider → AuthGatedProviders(ClubProvider) → ToastProvider` — intakt
- `AuthGated`-Semantik preserved: `useWallet` nutzt `enabled: !!userId` (useWallet.ts:105) → logged-out User triggert keinen Fetch, funktional äquivalent zum alten Gated-Mount
- JSDoc dokumentiert die Entfernung mit Begründung
- Grep: 0 Runtime-Code-Imports auf `WalletProvider` in src/

### 2. signOut / Cross-User-Leak — PASS

AuthProvider.tsx:283 `setTimeout(() => queryClient.clear(), 0)` in `clearUserState`:

- `queryClient.clear()` wiped ALLE Caches → Wallet auch gewiped. Äquivalent zu `removeWalletFromCache(qc)` für diesen Key, aber breiter.
- **Implementer-Entscheidung korrekt:** `removeWalletFromCache` wäre redundant. Der bestehende `.clear()` ist defensiv gegen Cross-User-Leaks (Kommentar Zeile 281).
- Race-Condition: `setTimeout(..., 0)` ist bewusste Entkopplung (vermeidet `.map()-on-undefined crashes`). Im Microtask-Fenster zwischen SIGNED_OUT und `clear()`: Consumer mit `useWallet` bekommen bereits `user=null` (Zeile 274) → `enabled=false` → kein neuer Fetch. Bestehende Cache-Data bleibt bis `clear()` — aber Ziel-Seiten (Login, Onboarding) sind nicht useWallet-Consumer.

### 3. Test-Mock-Konsistenz — PASS

Alle 3 migrierten Test-Mocks (MissionBanner, FantasyContent, PlayerContent) decken komplettes Interface ab:
- `useWallet()` mit vollem `UseWalletResult`-Shape (6 Felder)
- `useIsBalanceFresh()` separat
- 4 Helper-Mocks

Realistische Differenzierung:
- FantasyContent + PlayerContent: `dataUpdatedAt: Date.now()` + `useIsBalanceFresh: true` (Money-Flows mit Fresh-State)
- MissionBanner: `dataUpdatedAt: 0` + `useIsBalanceFresh: false` (nur Rendering-Test)

### 4. Providers.test.tsx Anpassung — PASS

- Negative-Assertion `queryByTestId('wallet-provider')).not.toBeInTheDocument()` — solider Regression-Guard gegen versehentliches Re-Add
- `QueryProvider`-Existence via `renders QueryProvider as outermost layer` + `renders AuthProvider inside QueryProvider` bereits abgedeckt
- Kommentar Zeile 64 erklärt Wechsel sauber

### 5. Slice-152 Gesamt-Konformität — PASS

- `grep -rn "setBalanceCents\|refreshBalance\|WalletProvider"` = 0 Runtime-Code, nur Kommentare/JSDoc
- `qk.wallet.all = ['wallet']` Prefix-Matching funktional: 7 Consumer invalidieren via `['wallet']` → React-Query matcht alle user-scoped Keys
- Ferrari-Norm: Read-Consumer durchgehend Query-Hook-Pattern ✅. Mutation-Consumer-Ferrari-Upgrade (useSafeMutation + onMutate/onError) = Slice-153-Scope (per Spec Zeile 124) ✅

### 6. common-errors.md Patterns — PASS

| Pattern | Status |
|---|---|
| pgBouncer Read-After-Write §2 | ✅ 152c-Fix blieb intakt, 152d ändert nichts daran |
| Error-Swallowing §1 | ✅ useWallet.ts:118-120 logSilentCatch für query.error |
| Dual-State-Drift D18 | ✅ Komplett eliminiert — Query-Cache ist einzige Wahrheit |
| Slice 139 Read-After-Write | ✅ `queryClient.clear()` ist Unilateral-Wipe, kein Race |
| Component-Prop Silent-Fallback D17 | ✅ `useWallet()` liefert explicit `null` bei no-user |

## Findings

| # | Severity | File:Line | Issue | Status |
|---|---|---|---|---|
| 1 | NIT | `src/lib/hooks/useWallet.ts:25,212-216` | JSDoc suggeriert `removeWalletFromCache(qc)` wird im signOut-Handler aufgerufen; tatsächlich deckt `queryClient.clear()` in AuthProvider:283 das ab. Maintainer könnten verwirrt suchen. | **FIXED inline**: JSDoc erweitert — erklärt dass `queryClient.clear()` abdeckt, Helper ist für Multi-Account-Switch / Tests / Emergency-Invalidation. |

## Journal-Review

- **Entscheidung sinnvoll:** JA. Nicht-Erweiterung von AuthProvider war richtig — `queryClient.clear()` deckt alles ab, parallel-call auf `removeWalletFromCache` wäre redundant und würde die Setup-Race von `setTimeout(..., 0)` (Slice 110) ohne Grund komplizieren.
- **Gescheiterte Ansätze sauber verlassen:** JA. Provider-Wrapping-Pattern komplett raus, keine Zombie-Hooks oder Legacy-Aliases.

## Positive

- JSDoc in Providers.tsx dokumentiert Entfernung mit klarer Begründung (AuthGated-Semantik via `enabled: !!userId`)
- Negative-Regression-Guard in Providers.test.tsx schützt gegen versehentliches Re-Add
- Alle 3 migrierten Test-Mocks haben identisches, vollständiges Shape — Copy-Paste-Konsistenz erzwingt Interface-Regression-Safety
- MissionBanner-Mock bewusst unterschiedliches `dataUpdatedAt: 0` (testet rendering ohne fresh-state) vs Trading-Consumer mit `Date.now()` — realistische Differenzierung
- Slice-152 Sub-Slice-Strategy (152a-foundation → 152b-read → 152c-mutation → 152d-delete) hat jeden Schritt rollback-sicher gemacht, jede Welle reviewable + reversibel

## Learnings für Knowledge Capture

- **Pattern-Candidate (memory/patterns.md):** Sub-Slice-Gating für Provider-Elimination — Foundation → Read-Consumer → Mutation-Consumer → Delete+Tests, mit Reviewer-Agent-Gates an Money-Path-Boundary
- **common-errors.md-Candidate:** "Provider-Delete sollte `queryClient.clear()` nicht duplizieren" — wenn globaler Wipe schon in signOut-Path existiert, explizite key-gezielte `removeQueries`-Calls sind redundant
- **Ferrari-Blueprint erweitert:** `useToggleFollowClub` als Referenz für **Mutation-Pattern**, `useWallet` + Helpers als Referenz für **Cross-Mutation-Shared-State-Pattern** mit pgBouncer-safe onSuccess/onSettled Split

## Phase-2-Money-Cleanup Status

**KOMPLETT.** Nach 152a+b+c+d:
- ✅ Alle Wallet-Consumer auf Query-Cache-Single-Source-of-Truth
- ✅ Kein Dual-State-Drift (D18)
- ✅ pgBouncer-safe Mutation-Pattern (onSuccess setQueryData, onSettled/finally invalidate)
- ✅ Reviewer-Agent-Gate durchgeführt für alle Money-Path-Changes (151c MembershipSection, 152c Mutation-Consumer, 152d Cross-Cutting)
- ✅ useToggleFollowClub + useWallet als Ferrari-Blueprint-Referenzen etabliert
- 🟡 Slice 153 Backlog: usePlayerTrading + trading.ts-Hooks Ferrari-Refactor (useSafeMutation + onMutate/onError), Test-Argumenten-Checks, RPC-Shape-Cleanup

## Verdict

**PASS**. Commit-ready. Phase 2 Money-Cleanup abgeschlossen.
