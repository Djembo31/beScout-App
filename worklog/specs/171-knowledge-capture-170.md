# Slice 171 — Knowledge-Capture aus Slice 170 Learnings

## Groesse

**XS** — 2 Markdown-Files (common-errors.md §5 + testing.md "useSafeMutation Test-Patterns").

## Ziel

Codifizieren der 2 Learnings aus Slice 170 Reviewer-Analyse, bevor sie in Chat-History verloren gehen. D25-Flywheel-Pattern (Session 2026-04-23): Fix-Slice produziert Reviewer-Findings → separates XS-Codification-Slice.

## Hintergrund

Slice 170 Reviewer-Agent identifizierte 2 dokumentationswürdige Learnings:
1. **exhaustive-deps-Trap bei useQueryClient-Migration** — Nach Singleton→Hook-Migration wird `queryClient` zur Hook-lokalen Variable und MUSS in useCallback/useMemo/useEffect deps. Pre-Migration war Module-Import-Exempt. Ohne Update: ESLint warn + Konvention-Drift zum Sister-Hook.
2. **vi.hoisted für shared-mock-reference** — Bei useQueryClient-Mock muss die Mock-Instance shared sein zwischen `@/lib/queryClient`-Mock und `@tanstack/react-query`-Mock. Plain `const` scheitert ("Cannot access before initialization"). Fix: `vi.hoisted(() => ({...}))`.

## Betroffene Files

| File | Section | Addition |
|------|---------|----------|
| `.claude/rules/common-errors.md` | §5 (Frontend) | Neue Sub-Section "Singleton→useQueryClient() Migration — exhaustive-deps-Trap" |
| `.claude/rules/testing.md` | "useSafeMutation Test-Patterns" | Neuer 5. Pattern "vi.hoisted fuer shared-mock-reference" |

## Acceptance Criteria

1. common-errors.md hat neuen Entry mit: Symptom + Regel + Audit-Command + Beispiel-Fix (Location-Pattern wie "§5 D18 useSafeMutation").
2. testing.md hat neuen 5. Pattern mit: Kontext + Anti-Pattern (plain const) + Fix-Pattern (vi.hoisted) + Beispiel-Referenz (Slice 170).
3. `npx tsc --noEmit` clean (docs-only safety, sollte keine Änderungen haben).
4. Grep-verify: beide Sections existieren an richtiger Stelle.

## Proof-Plan

- `npx tsc --noEmit` Output → `worklog/proofs/171-tsc.txt`
- Grep-verify der neuen Sections → `worklog/proofs/171-sections.txt`

## Scope-Out

- Keine Code-Änderungen (pure docs).
- Keine RPC/Service/Component-Edits.
- Audit anderer Files ausserhalb der 2 Ziel-Markdown-Files.
