# Slice 247 — PredictionsTab.test.tsx Mock-Repair (Test-Recovery)

**Größe:** XS
**Slice-Type:** Doc/Test (test-mock only)
**Datum:** 2026-04-28
**Bezug:** CI test-Job rot seit ≥20 Pushes. 1 file failed (15/16 tests fail).

## 1.1 Problem-Statement

`src/components/fantasy/__tests__/PredictionsTab.test.tsx` mockt `@/lib/queries/predictions` mit 3 hooks (usePredictions, usePredictionCount, usePredictionStats). Aber `PredictionsTab.tsx` importiert auch `useTopPredictorsLeaderboard` aus dem gleichen Module → vitest wirft:

```
Error: [vitest] No "useTopPredictorsLeaderboard" export is defined on the "@/lib/queries/predictions" mock. Did you forget to return it from "vi.mock"?
```

15/16 Tests sind crashend mit React-mountIndeterminateComponent (TopPredictorsSection rendert auf jedem Test via `<TopPredictorsSection />` in PredictionsTab → Mock fehlt → throw).

**Evidenz:**
- `grep useTopPredictorsLeaderboard src/components/fantasy/PredictionsTab.tsx` → Zeile 12 import + Zeile 165 Aufruf
- `grep useTopPredictorsLeaderboard src/components/fantasy/__tests__/PredictionsTab.test.tsx` → 0 hits

## 1.2 Lösungs-Design

**1 Zeile in vi.mock-Block ergänzen:**
```ts
useTopPredictorsLeaderboard: (...args: unknown[]) => ({ data: [], isLoading: false }),
```

Returns minimal-Mock (leeres Array + nicht loading) — TopPredictorsSection rendert empty-state ohne Test-Aussagekraft. Reicht für die 15 isolation-Tests die nicht den TopPredictors-Section testen sollen.

## 1.3 Betroffene Files

- `src/components/fantasy/__tests__/PredictionsTab.test.tsx` — vi.mock-Block ergänzen

## 1.4 Code-Reading-Liste (VOR Implementation)

| File | Zweck | Frage |
|------|-------|-------|
| `src/components/fantasy/__tests__/PredictionsTab.test.tsx` | Test-File | Wie ist vi.mock-Block aufgebaut? |
| `src/components/fantasy/PredictionsTab.tsx` | SUT | Welche Funktion-Signatur erwartet `useTopPredictorsLeaderboard`? |
| `src/lib/queries/predictions.ts` | Source-of-Truth | Return-Shape von `useTopPredictorsLeaderboard`? |

## 1.5 Pattern-References

- **Slice 218** — Test-Mock-Repair ClubContent.test.tsx (3 Mocks ergänzt). Identische Bug-Klasse.
- **Slice 196 Track B** — useSafeMutation Test-Patterns (testing.md §5).

## 1.6 Acceptance Criteria

```
AC-01: PredictionsTab.test.tsx vi.mock('@/lib/queries/predictions') enthält useTopPredictorsLeaderboard.
AC-02: pnpm exec vitest run src/components/fantasy/__tests__/PredictionsTab.test.tsx → exit 0.
AC-03: 16/16 Tests pass (war 1/16 pass + 15 fail).
AC-04: CI test-Job nach Push grün.
```

## 1.7 Edge Cases

| Case | Verhalten |
|------|-----------|
| `useTopPredictorsLeaderboard` Signatur ändert sich später | Mock bleibt minimal — zukünftige Änderung-Slice muss Mock adjusten |
| Andere Tests in /fantasy laufen weiter | unbetroffen, nur PredictionsTab.test.tsx editiert |
| Type-Check ändert sich durch Type-Assertion | Mock nutzt `unknown[]` unverändert, kein Type-Drift |

## 1.8 Self-Verification Commands

```bash
# Pre-Edit Reproduktion:
pnpm exec vitest run src/components/fantasy/__tests__/PredictionsTab.test.tsx --no-coverage 2>&1 | tail -3
# erwartet: 15 failed | 1 passed

# Post-Edit Verify:
pnpm exec vitest run src/components/fantasy/__tests__/PredictionsTab.test.tsx --no-coverage 2>&1 | tail -3
# erwartet: 16 passed
```

## 1.9 Open-Questions / Autonom-Zone

**Pflicht-Klärung:** keine — XS Test-Mock-Repair, Pattern Slice 218.

**Autonom-Zone (CTO):**
- Mock-Return-Shape: `{ data: [], isLoading: false }` (gewählt — minimaler stub, echter Test-Coverage von TopPredictorsSection nicht in dieser Test-Datei).

## 1.10 Proof-Plan

- `worklog/proofs/247-test-recovery.txt` — Pre/Post Vitest-Output

## 1.11 Scope-Out

- **TopPredictorsSection eigene Test-Datei** → Backlog (würde echtes Coverage adden)
- **Andere Test-Mock-Drift in CI** → reaktiv falls auftaucht
- **Branch-Protection enforce_admins=true** → Slice 244 Phase 2

## 1.12 Stage-Chain (geplant)

SPEC → IMPACT (skipped: test-only) → BUILD → REVIEW (self-review D35) → PROVE → LOG

## 1.13 Pre-Mortem (XS optional)

- **Risiko:** Mock-Return-Shape passt nicht zum TS-Type-Contract. Mitigation: Tests laufen mit `as` casts in mocks — oder echter type-safety nicht needed in test-isolation.
- **Risiko:** Test-File wird durch Mock-Add komplexer. Mitigation: 1 Zeile, Pattern Slice 218 etabliert.
