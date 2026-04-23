# Slice 164 — Konvention-Codification (patterns.md #28 + testing.md)

**Size:** XS · **Stage:** SPEC · **Started:** 2026-04-23
**Type:** Docs (codifiziert wiederkehrende Learnings aus Slices 159-163)

## Ziel

Patterns und Test-Konventionen aus 5 Ferrari-Slices (159, 161, 162, 163) formalisieren, bevor sich weitere Drifts akkumulieren. Heute entstehen NITs in jedem Slice für dieselben Themen — jetzt einmal codifizieren.

## Wiederkehrende Findings (aus Session 2026-04-23)

| Finding | Aufgetreten in | Slice-Review-Ref |
|---------|----------------|------------------|
| Singleton `queryClient` vs `useQueryClient()` Hook | 161 NIT #5, 162 NIT #5, 163 positiv (Hook gewählt) | konvention-Drift über 3 Slices |
| Test-Mock-Expansion für useSafeMutation (lucide-react + ToastProvider) | 159, 161, 162, 163 | 4× in Folge erforderlich |
| `act() + waitFor()` Pattern statt `await handleX(...)` | 162 Test-Migration (7 Tests umgebaut) | 162 Lernfall |
| Multi-Mutations = distinct Instanzen im selben Component | 163 (`createPredictionMut` + `playersForFixtureMut`) | 163 Learning |
| Forward-Ref `handleClose` im onSuccess Closure-Safe | 163 INFO #5 | 163 Stabilitäts-Frage beantwortet |

## Betroffene Files

1. **`memory/patterns.md`** Pattern #28 erweitern:
   - `useQueryClient()` vs Singleton — explizite Regel + Begründung
   - Multi-Mutations im Component — distinct Instanzen, scope-distinct errorTag
   - Forward-Ref `handleClose`/`reset` im onSuccess — Closure-Safe-Pattern
   - Blueprint-Referenzen ergänzen um 160, 161, 162, 163
2. **`.claude/rules/testing.md`** neuer Abschnitt "useSafeMutation Test-Patterns":
   - Test-Mock-Expansion Template (lucide-react + ToastProvider stubs)
   - `act() + waitFor()` Pattern für Mutation-Tests
   - queryClient mock expansion für Optimistic-Mutations

## Scope-Out

- Mini-Cleanup 161+162 (Singleton → useQueryClient) — separater Slice 164b wenn gewünscht. Jetzt nur Docs.
- patterns.md Pattern #29+ neue Kategorien — nur #28 erweitern.

## Acceptance Criteria

1. `memory/patterns.md` #28 hat neuen Abschnitt "Konventionen" mit 4 expliziten Regeln.
2. `memory/patterns.md` #28 "Blueprint-Referenzen" erweitert um 160 (Community-Vote-Fix), 161 (Leagues+Missions), 162 (Vote-Handler D18), 163 (CreatePredictionModal).
3. `.claude/rules/testing.md` hat neuen Abschnitt "useSafeMutation Test-Patterns" mit 3 Template-Blöcken:
   - Mock-Expansion (copy-paste-bereit)
   - act + waitFor Pattern
   - queryClient mock für Optimistic
4. `tsc --noEmit` clean (keine Code-Änderung, nur Docs — aber Safety-Check).

## Proof-Plan

- `git diff --stat` Summary
- Visual-Check: `grep -A10 "### 28. Ferrari-Blueprint"` patterns.md zeigt neue Konventionen-Sektion
- Visual-Check: `grep -A15 "useSafeMutation Test-Patterns"` testing.md zeigt neuen Abschnitt
