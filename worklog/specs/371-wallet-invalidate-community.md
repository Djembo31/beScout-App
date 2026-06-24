# Slice 371 — Wallet-Invalidate nach Poll-Vote/Research-Unlock (U-1 Fix)

**Slice-Type:** UI (Bug-Fix, money-nah)
**Größe:** XS
**Datum:** 2026-06-24

## 1. Problem-Statement
Slice-370-UI-Walk (Playwright) fand U-1: Nach Poll-Vote ODER Research-Unlock aus dem Community-Feed aktualisiert sich die Header-Credit-Anzeige (`TopBar` → `useWallet`) nicht sofort — sie blieb auf dem alten Wert (DB korrekt belastet, korrigiert erst bei Reload/Navigation). Evidence: `worklog/proofs/370-ui-fees-rein.txt` (jarvis 11.728,27 blieb stehen trotz −10/−10 CR).

## 2. Root-Cause
`useCommunityActions.handleCastPollVote` invalidierte nur `qk.polls.all`, `handleUnlockResearch` nur `invalidateResearchQueries(userId)` — **kein** Invalidate des Wallet-Keys `['wallet']` (`useWallet` cached `['wallet', userId]`, staleTime 0). Der Trading-Pfad macht es korrekt (`invalidateWallet`/`setWalletBalance`). performance.md: „invalidateQueries nach Writes".

## 3. Fix (surgical, 1 File)
`src/components/community/hooks/useCommunityActions.ts`: nach Erfolg in beiden Handlern `queryClient.invalidateQueries({ queryKey: qk.wallet.all })`. `qk.wallet.all=['wallet']` prefix-matcht den user-scoped Key. handleUnlockResearch-deps um `queryClient` (+tErrors) ergänzt (S170 exhaustive-deps).

## 4. Acceptance Criteria
- **AC1:** Nach Poll-Vote im Feed zeigt der Header sofort −10 CR (ohne Reload). VERIFY: Playwright post-Deploy.
- **AC2:** Nach Research-Unlock im Feed zeigt der Header sofort −10 CR. VERIFY: Playwright post-Deploy.
- **AC3:** tsc clean + useCommunityActions-Tests grün. VERIFY: `npx tsc --noEmit` + vitest. ✅
- **AC4:** Money-Logik unverändert (nur Cache-Invalidation, kein RPC/Service-Edit). VERIFY: diff. ✅

## 5. Scope-Out
- Bounty-Create-Escrow (locked_balance) — Header zeigt `balance`, nicht locked → nicht betroffen.
- Legacy `castVote` (DbClubVote) — gratis, keine Balance-Änderung.

## 6. Proof-Plan
tsc clean + 72 vitest grün + diff (jetzt). **Live-Playwright AC1/AC2 = erster Schritt nächste Session** (Vercel baut von main nach Push).

## 7. Stage-Chain
SPEC ✅ → IMPACT skipped (1 File, Cache-only) → BUILD ✅ → REVIEW self-review (XS, money-Logik unberührt, performance.md-Pattern) → PROVE (tsc+vitest jetzt, Playwright next session) → LOG.
