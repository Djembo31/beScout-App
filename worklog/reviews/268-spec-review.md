# Slice 268 Spec-Review (vor BUILD)

**Verdict:** APPROVED-WITH-MINOR (3 MINORs inline einarbeiten, dann BUILD)

**Reviewer:** reviewer-Agent Cold-Context, ~32 min spent.

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | MINOR | Sektion 2 + AC-07 + impliziter Konflikt mit `useWallet.ts:65` (existing `WALLET_STALE_TIME_MS=30_000`) | Spec sagt `staleTime: 0`. Existing useWallet hat 30_000ms. Bewusste Verhaltens-Änderung auf Money-Path-relevanter Hook (BuyModal nutzt useIsBalanceFresh). Spec dokumentiert die Regression nicht (~1-2 zusätzliche RPCs/Mobile-Safari-Session-Switch). | Spec Sektion 2: explizit "staleTime: 0 ist gewollt — placeholderData setzt dataUpdatedAt=0 → useIsBalanceFresh false → BuyModal sicher". Plus AC-09 BuyModal-Freshness-Intact mit Test. |
| 2 | MINOR | Sektion 7 Edge-#3 + Pre-Mortem #1 + AuthProvider.tsx:284-310 SIGNED_OUT-Pfad | clearUserState ruft `lsClear()` Z304 + `setTimeout(queryClient.clear, 0)` Z308. clearCachedAllSlots() MUSS synchron neben lsClear, NICHT im setTimeout — sonst Race wenn User-B sofort einloggt. | Spec Sektion 2 + AC-04 präzisieren: "clearCachedAllSlots synchron neben lsClear in clearUserState — NICHT im setTimeout". Edge-Case #11 ergänzen (SIGNED_OUT→SIGNED_IN same frame). |
| 3 | MINOR | Sektion 7 Vollständigkeits-Lücke | Hook unmount mid-fetch + parallel-mount-write-Race nicht dokumentiert. Acceptable (queryFn fire-and-forget, JSON.stringify atomic) aber undokumentiert. | Edge-Case #12 ergänzen: Hook unmount mid-fetch — queryFn läuft weiter, writeCached schreibt für unmounted Hook, kein Memory-Leak (queryClient hält Ref). |

## Positive (Reviewer-Quote)

1. **Slice-265-Anti-Pattern-Vermeidung explizit verboten** + grep-prüfbar (Sektion 3 + Self-Verification).
2. **UID-Keyed-Storage als Defense-in-Depth** — D43 Pattern korrekt angewandt.
3. **Money-Path-Compliance-Check explizit** mit setWalletBalance-Pattern-Verweis.
4. **Pre-Mortem 8 Szenarien** über M-Slice-Mindest hinaus.
5. **Reviewer-VOR-BUILD architektonischer Schritt** — Process-Innovation aus 2 Reverts gelernt.

## Spec-Quality-Self-Check

8/10 PASS · 2/10 TEILS (AC-Coverage Money-Path + Edge-Case-Vollständigkeit) — beide adressiert in Findings #1 + #3.

## TanStack v5 placeholderData API-Verifikation

**Spec-Aussage korrekt:**
- `initialData`: Wird als data persistiert. dataUpdatedAt = Date.now() oder via initialDataUpdatedAt. **Kann Refetch blockieren bei staleTime > 0.** Slice-265-Bug-Quelle.
- `placeholderData`: NICHT als data persistiert. Im UI gerendert während `status === 'pending'`. `dataUpdatedAt === 0` bis echtes Fetch. **Kein Refetch-Blocker.** Money-Path geschützt via `useIsBalanceFresh`.

**Empfehlung:** Vitest-Test der placeholderData → dataUpdatedAt=0 → useIsBalanceFresh=false während Pending asserted (Money-Path-Garantie-Test).

## clearCachedAllSlots Origin-Scope

bescout.net Single-Domain → niedriges Risk. Falls je Subdomain-App entsteht (admin.bescout.net) → Prefix-Konflikt prüfen. Doku-Hinweis ergänzen.

## Empfehlung

**Vor BUILD:** 3 MINOR-Findings inline in Spec (~15 min):
1. AC-09 + Begründung staleTime:0 Money-Path-Trade-off
2. clearCachedAllSlots-Synchronicity in clearUserState präzisieren
3. Edge-Cases #11 + #12 ergänzen

**Danach:** BUILD freigeben. Anil-Lehre: Slice-260-Block + clearUserState BEIDE als Touch-Punkte einplanen.

**REVIEWER POST-BUILD pflicht** (Slice 211 D50): Component-Isolation grep PASS, AC-03 Live-Verify, AC-09 BuyModal-Test.

**time-spent:** 32 minutes
