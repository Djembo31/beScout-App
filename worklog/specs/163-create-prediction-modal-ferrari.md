# Slice 163 — CreatePredictionModal Ferrari + Player-Loader D17-Fix

**Size:** S · **Stage:** SPEC · **Started:** 2026-04-23
**Type:** Refactor (schliesst Tier-2 Non-Admin-Block ab: 7/8 → 8/8)
**Reference:** `memory/patterns.md` #28 · `.claude/rules/common-errors.md` §5 D18

## Ziel

2 Handler in `CreatePredictionModal.tsx` auf Ferrari-Blueprint #28 migrieren. Damit ist Tier-2 Data-Integrity Non-Admin-Block (8/8) komplett — nur noch 10× Admin-Space offen.

## Betroffene Files

1. **`src/components/fantasy/CreatePredictionModal.tsx`** — 2 Handler
2. **`src/lib/queries/predictions.ts`** — `useCreatePrediction` Hook entfernen (nur 1 Consumer, Mutation-Logic zieht in Component)

## Handler-Analyse

### Handler 1: `handleSubmit` (Line 115)
- Nutzt bereits `useCreatePrediction(userId, gameweek)` → React Query `useMutation`.
- Aber: `mutateAsync` hat keinen synchronen Pending-Guard → rapid double-click race möglich.
- Kein errorTag für Sentry/Observability.
- Fix: Inline `useSafeMutation` im Component mit `safeTrigger`. `onSuccess: handleClose`, `onError: setError(tErrors(mapErrorToKey(err.message)))`. errorTag: `predictions.create`.

### Handler 2: `handlePlayerTypeSelect` (Line 92)
- Klassisches D17-Pattern: `if (loadingPlayers) return; setLoadingPlayers(true); try { ... }`.
- Lädt Spieler-Liste via dynamic import (`getPlayersForFixture`).
- Fix: `useSafeMutation` mit `loadingPlayers` derived via `mut.isPending`. `onSuccess: setPlayers(result)`. errorTag: `predictions.playersForFixture`.

## Scope-Impact

- `useCreatePrediction` Hook (`lib/queries/predictions.ts`) hat nur 1 Consumer (dieser Modal). Hook wird entfernt + Re-export aus `lib/queries/index.ts` auch. Mutation zieht in Component als Ferrari.
- Alternative wäre Hook auf useSafeMutation umzubauen mit Options-Callback-API — aber Scope-Creep, da nur 1 Consumer.

## Acceptance Criteria

1. `handleSubmit` nutzt `useSafeMutation` + `safeTrigger`. Kein `mutateAsync`, kein try/catch im Handler.
2. `handlePlayerTypeSelect` nutzt `useSafeMutation` + `safeTrigger`. Kein lokales `loadingPlayers`-useState.
3. `loadingPlayers` derived via `playersForFixtureMut.isPending`.
4. Error-Handling via `onError` → `setError(tErrors(mapErrorToKey(normalizeError(err))))`.
5. `useCreatePrediction` Hook aus `lib/queries/predictions.ts` entfernt + aus `lib/queries/index.ts` deexportiert.
6. Bestehende Tests grün: `CreatePredictionModal.test.tsx`.
7. `tsc --noEmit` clean.

## Edge Cases

1. **Rapid double-submit:** safeTrigger sync-Guard blockt 2. Click.
2. **Service-Error** (RPC reject): mutationFn throws → onError setError.
3. **Service `{ok: false, error: '...'}`**: mutationFn wraps `if (!r.ok) throw new Error(r.error ?? 'generic')`.
4. **Player-Fixture-Switch während loadingPlayers**: vor Slice-Fix: race möglich (2. Click start prevented via flag). Nach Fix: safeTrigger blockt intern.
5. **Modal-Close während Submit**: `preventClose={createMut.isPending}` in scope? Prüfen — Modal-API muss das unterstützen.

## Proof-Plan

- `npx tsc --noEmit` clean
- `npx vitest run src/components/fantasy` grün
- Regression-Audit: `grep -rnE "setLoadingPlayers|mutateAsync\(" src/components/fantasy/CreatePredictionModal.tsx` → 0 hits

## Scope-Out

- Service-Hardening `createPrediction` (`{ok: false}` → `throw`): separater Silent-Fail-Slice.
- `preventClose={mut.isPending}`: Modal-API-Check — wenn unterstützt, in-slice. Sonst Backlog.
- `useCreatePrediction`-Hook-Entfernung vs nur Deprecate-with-passthrough: Aktiv Hook entfernen (1 Consumer, kein Breakage).
