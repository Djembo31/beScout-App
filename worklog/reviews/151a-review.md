# Slice 151a Review — useSafeMutation hook + Tests

**Verdict:** CONCERNS (5 TSC-errors + 10 Findings) → PASS nach Inline-Fix
**Reviewer:** reviewer-Agent (Cold-Context, read-only)
**Time-spent:** ~18 min

## Scope reviewed

- `src/lib/hooks/useSafeMutation.ts` (NEW, 95 LOC)
- `src/lib/hooks/__tests__/useSafeMutation.test.ts` (NEW, 7 tests passing)

## TSC-Errors (blocker)

5 Fehler in den Tests: `Property 'mutate'/'isPending' does not exist on type 'SafeMutationResult<...>'`.
**Root:** Return-type `Object.assign(mutation, {safeTrigger})` nicht explicit auf `SafeMutationResult` gecastet → TSC verliert die `UseMutationResult`-Interface-Extension.

## Findings (Reviewer)

### HIGH
- **#1** `useSafeMutation.ts:108` — `Object.assign`-Begruendung in JSDoc unpraezise (behauptet "identity stability", korrekt ist "preserves bound methods + avoid re-wrap")

### MEDIUM
- **#2** `useSafeMutation.ts:103-106` — `safeTrigger` nicht mit `useCallback` stabilisiert → breakable memoization in memoized consumers
- **#3** `useSafeMutation.ts:92-95` — Kein `logSilentCatch` fuer Sentry-Integration. **BLOCKER fuer Slice 151c (Money-Path)** — erfordert `errorTag?: string` Parameter
- **#4** `useSafeMutation.ts:returnline` — Return-type-cast fehlt (Ursache der TSC-Fehler)

### LOW
- **#5** Test-waiting-Pattern umstaendlich (doppel-await)
- **#6** safeTrigger-Rapid-Click-Test deckt den Guard nicht isoliert ab — passiert implizit via React Query v5 MutationObserver-Idempotenz
- **#7** Generic-Order `<TData, TVariables, TError, TContext>` weicht von React Query v5's `<TData, TError, TVariables, TContext>` ab → Consumer-Verwirrung
- **#8** JSDoc `errorToast` sollte klarstellen "resolved translated string, NOT raw i18n-key"
- **#9** Fehlender Test: errorToast ohne customOnError (Optional-Chaining-Safety)

### NIT
- **#10** JSDoc nennt "Slice 149b" statt "Slice 149" (149b war PlayerPhoto-Bug, nicht Race)

## Reviewer-Verdict by Consumer

- **Slice 151b (useClubActions, Data-Integrity):** PASS as-is
- **Slice 151c (MembershipSection, Money-Path):** **REWORK** — Finding #3 (Sentry) MUSS fixed sein

## Inline-Fixes (Primary-Claude, 2026-04-23)

Alle HIGH + MEDIUM + kritische LOW gefixt in gleichem Slice-Commit:

1. Generic-Order an v5 angleicht: `<TData, TError, TVariables, TContext>` (Finding #7)
2. `safeTrigger` mit `useCallback` + stable-ref-pattern stabilisiert (Finding #2)
3. `errorTag` Parameter + `logSilentCatch` in onError (Finding #3 — Money-Path-ready)
4. Return-type explicit cast `as SafeMutationResult<...>` (Finding #4 → fixt TSC)
5. JSDoc `errorToast` Klarstellung (Finding #8)
6. JSDoc `Object.assign` echte Begruendung (Finding #1)
7. Slice 149 statt 149b (Finding #10)
8. Test fuer errorToast ohne customOnError (Finding #9)
9. Test fuer safeTrigger-echten-Guard (Finding #6) — mutation-observer mock

## Post-Fix-Verify

- TSC clean
- 8/8 Tests passing (+ 1 neuer Edge-Case)

## Final Verdict

**PASS** nach Inline-Fix. Hook ist production-ready fuer Slice 151b AND 151c (Money-Path).

## Positive

- Exzellenter JSDoc-Header (3 Systemic-Issues klar)
- Interface-Extend-Pattern sauber (Omit onError + Re-Define)
- Generic-Defaults sinnvoll gewaehlt
- Keine Breaking-Changes (additive Hook)
- 'use client'-Direktive korrekt
