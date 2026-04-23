# Slice 163 Review

**Verdict:** PASS (kleinere Pre-existing-Nits, alle Backlog)
**Reviewer:** reviewer-agent (cold-context, via Agent-tool dispatch)
**Date:** 2026-04-23
**Scope:** 4 Files (CreatePredictionModal + predictions.ts Query-Hook + index.ts Re-Export + Test-Migration). Schliesst Tier-2 Data-Integrity Non-Admin-Block (8/8) — nur noch 10× Admin-Space offen.

## Spec-Coverage

- [x] `handleSubmit` via `createPredictionMut.safeTrigger`, keine `mutateAsync`, kein try/catch im Handler
- [x] `handlePlayerTypeSelect` via `playersForFixtureMut.safeTrigger`, kein lokales `loadingPlayers`-useState
- [x] `loadingPlayers` derived via `playersForFixtureMut.isPending`
- [x] Error-Handling via onError → `setError(tErrors(mapErrorToKey(normalizeError(err))))`
- [x] `useCreatePrediction`-Hook aus `lib/queries/predictions.ts` entfernt + aus `lib/queries/index.ts` deexportiert
- [x] `tsc --noEmit` clean + vitest 494/494
- [x] Regression-Audit `grep -rnE "setLoadingPlayers|mutateAsync\(|useCreatePrediction"` → 0 Code-Hits
- [x] errorTag `predictions.create` + `predictions.playersForFixture`

## Findings

| # | Severity | Status | File:Line | Issue | Resolution |
|---|----------|--------|-----------|-------|------------|
| 1 | LOW | Backlog | CreatePredictionModal.tsx Modal | Kein `preventClose={createPredictionMut.isPending}` — ESC/Backdrop-Click während RPC möglich. Spec Edge-Case #5. | Konsistent mit Slice 161 Finding #2 (LeaguesSection), common-errors.md §5 J2+J3. Tier-2 Follow-up. |
| 2 | LOW | Backlog | CreatePredictionModal.tsx onError | Kein `errorToast` — User sieht Error nur via inline `<p>{error}</p>` in Step-3. Aber handleSubmit ist erst in Step-3 triggerable → praktisch kein Blindspot. | Konsistent mit 161 MissionBanner. Nicht blockierend. |
| 3 | LOW | Backlog | CreatePredictionModal.tsx playersForFixtureMut onError | `setPlayers([])` silent-clear ohne User-Feedback. User sieht leere Liste → denkt "keine Spieler". errorTag geht zu Sentry, UI sagt nichts. | Backlog: `errorToast` oder dedicated i18n-Key `predictions.playersLoadError`. |
| 4 | INFO | Pre-existing | CreatePredictionModal.tsx:25,46 | `currentCount` Prop deklariert aber nicht verwendet. Pre-existing, nicht durch Slice 163 eingeführt. tsc `noUnusedParameters` nicht aktiv. | Out-of-Scope. Backlog: Entfernen oder als Counter anzeigen. |
| 5 | INFO | — | CreatePredictionModal.tsx onSuccess | **Forward-Ref `handleClose`**: Mutation Line ~105 referenziert `handleClose` Line ~127. JS-Closure-Scoping resolvt at-call-time (async). Stable. | Kein Bug. Alternative: Reset/Close-Helpers vor Mutations definieren (Lesbarkeit) — nicht zwingend. |
| 6 | INFO | — | predictions.mutations.ts | `createPrediction` returnt `{ok, error?}` nicht `{success, error?}`. mutationFn-wrap `if (!result.ok) throw new Error(result.error ?? 'generic_error')` korrekt adaptiert. | Blueprint #28 ist beispielhaft `{success}`, nicht vorschreibend. OK. |
| 7 | INFO | — | CreatePredictionModal.tsx:96 | `throw new Error('generic_error')` — nicht in KNOWN_KEYS → regex-fallback → `'generic'` → tErrors('generic'). UI zeigt "Fehler"/"Hata". | Fallback-Kette funktioniert. Konsistent zu MissionBanner-Pattern. |
| 8 | INFO | — | predictions.ts:15 | Doku-Kommentar `// Slice 163: useCreatePrediction-Hook entfernt` bleibt als History. | Gutes Dokumentations-Pattern (analog 161+162). |
| 9 | INFO | — | CreatePredictionModal.test.tsx | Test-Mock-Expansion konsistent zu Slice 161 MissionBanner + 162 EventCommunityTab. Pattern etabliert. | Positiv. |
| 10 | INFO | — | Bundle-Impact dynamic→static | `PredictionsTab` eager-importiert CreatePredictionModal. Pre-163 war dynamic purely runtime-deferred, nicht code-split. Post-163 static-import = identischer Bundle, cleaner Code. | Slice 121 Pattern richtig angewandt. Kein Bundle-Blowup. |

**Keine HIGH / MEDIUM / REWORK / FAIL-Findings.**

## Prüfungs-Antworten

1. **Blueprint-Konsistenz zu 161+162:** PASS. mutationFn-throw-wrap, errorTag, safeTrigger-API, isPending am Button-disabled. `playersForFixtureMut` matcht Slice 162 Style (kein Optimistic). `createPredictionMut` matcht Slice 161 LeaguesSection (onSuccess invalidate+close).

2. **Forward-Ref `handleClose`:** PASS stabil. Closure-Scoping resolvt at-call-time. `const` im Component-Body ist sichtbar zum Async-Callback-Zeitpunkt. Kein TDZ-Problem. Kein ESLint-Warning (`@typescript-eslint/no-use-before-define` nicht aktiv).

3. **`useCreatePrediction`-Hook-Entfernung:** PASS re-verified. Nur 1 Consumer (jetzt entfernt). Re-Export aus lib/queries/index.ts sauber entfernt. Keine stale Imports.

4. **Scope-Impact:** PASS. tsc clean + vitest 494/494 bestätigen keine Cross-Consumer-Breakage. Keine weiteren Test-Files mocken `useCreatePrediction` (gegrept: 0 extra hits).

5. **Service-Shape `{ok, error?}`:** PASS. Edge: wenn `{ok: true}` aber id/difficulty undefined → onSuccess läuft durch (nur invalidate + close, keine result-Felder gelesen).

6. **`playersForFixtureMut` kein Optimistic:** PASS. Correct-by-design, matches Blueprint-Rule.

7. **`handleSubmit` early-return vor safeTrigger:** PASS. UI-Defense (Button nur in Step-3 sichtbar + disabled). Error-Nicht-Propagation akzeptabel — Prerequisites sind UI-guarded.

8. **Test-Mock-Expansion:** PASS. Pattern etabliert über 6+ Test-Files (159/161/162/163).

9. **`currentCount` unused:** Pre-existing. Nicht Blocker. Backlog.

10. **Dynamic-Import-Removal:** PASS. Net-Bundle-Delta ~0 für fantasy-chunk. Slice 121 Pattern "dynamic() rettet nur wenn KEIN anderer Pfad eager lädt" — hier trifft's eher umgekehrt zu: Wenn enclosing Component eager ist, bringt dynamic-import keinen Bundle-Gewinn.

## Positive

- **Tier-2 Data-Integrity 8/8 komplett** — Non-Admin-Block geschlossen.
- **Multi-Mutations im selben Component:** 2 `useSafeMutation`-Instanzen mit eigenem errorTag/onError/onSuccess — Pattern etabliert ("Scope-distinct Mutations = distinct Mut-Instanzen").
- **Forward-Ref Pattern sauber:** Keine Pflicht zur Reihenfolge-Umstrukturierung.
- **Dynamic-Import Cleanup:** Bundle-Impact analysiert und als net-zero bestätigt.
- **Hook-Entfernung vollständig:** 3-Punkt-Cleanup (predictions.ts + index.ts + Test-Mock).
- **Konvention-Verbesserung:** Neuer Component nutzt `useQueryClient()` Hook (Slice 161+162 NIT-Drift hier nicht fortgesetzt).

## Learnings (für Session-End DISTILL)

1. **Multi-Mutations im Component:** Blueprint #28 implizit — scope-distinct Mutations = distinct Mut-Instanzen, nicht conditional-switch. Könnte patterns.md #28 Explicit-Note ergänzen.

2. **Forward-Ref im onSuccess Closure-Safe:** Bestätigung für zukünftige Ferrari-Refactors in Components mit `handleClose`/`reset`-Helpers. Abgrenzung TDZ: Nur bei `let`/hoisted-functions Risiko, nicht bei `const` im Component-Body.

3. **Dynamic-Import-Inversion:** Wenn enclosing Component eager-importiert, bringt dynamic-import keinen Bundle-Gewinn. Backlog-Idee: common-errors.md §7 erweitern um "dynamic-import vs enclosing-component eager-chain".

## Summary

Mustergültiger Ferrari-Refactor mit 2-Mutations-Pattern im selben Component. 2 Handler auf Blueprint #28, errorTag-Observability durchgehend, Forward-Ref-Closure korrekt, Hook-Entfernung vollständig inkl. Re-Export + Test-Mock. Tier-2 Data-Integrity Non-Admin-Block geschlossen (8/8). 10 Findings, alle LOW/INFO/Backlog: `preventClose` + `errorToast` + `currentCount`-unused-prop Pre-existing-Hygiene-Items. Keine HIGH/MEDIUM/REWORK/FAIL. Commit-freigabe.
