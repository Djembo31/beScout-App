# Slice 167 — Knowledge-Capture aus Slice 166 Learnings

**Size:** XS · **Stage:** SPEC · **Started:** 2026-04-23
**Type:** Docs (codifiziert 2 Learnings aus Slice 166)

## Ziel

2 wiederkehrende Patterns aus Slice 166 codifizieren:
1. **patterns.md #28:** Modal-gescopte Mutations brauchen `preventClose={mut.isPending}` — war Blueprint-Gap in Slice 159 (ReportModal + FanWishModal).
2. **common-errors.md §8:** "Grep-Audit-Scope-Gap" — Top-Level-Grep verpasst embedded Sub-Component-Modals. 46% Reviewer-ROI in Slice 166.

## Betroffene Files

1. **`memory/patterns.md`** #28 Konventionen-Abschnitt erweitern:
   - Neue Konvention: "Modal-gescopte Mutation → preventClose pflicht"
   - Anti-Pattern-Beispiel: ReportModal/FanWishModal Slice 159 (hatten `mut.isPending` aber ohne preventClose)
2. **`.claude/rules/common-errors.md`** §8 Cross-Cutting neuer Entry:
   - "Grep-Audit-Scope-Gap bei Sub-Component-Scan"
   - Symptom: Top-Level-Grep findet nur direkt-Top-Level-Usages
   - Fix-Pattern: Cross-Ref mit Sub-Component-Scan
   - Audit-Command

## Acceptance Criteria

1. `memory/patterns.md` #28 hat neue Konvention "Modal-gescopte Mutation preventClose pflicht".
2. `.claude/rules/common-errors.md` §8 hat neuen Entry "Grep-Audit-Scope-Gap" mit Symptom + Fix-Pattern + Audit-Command.
3. `tsc --noEmit` clean (Safety-Check für docs-only).

## Proof-Plan

- `git diff --stat` Summary
- Grep-Visual: `grep -A5 "Modal-gescopte Mutation" memory/patterns.md` zeigt neuen Abschnitt
- Grep-Visual: `grep -A8 "Grep-Audit-Scope-Gap" .claude/rules/common-errors.md` zeigt neuen Entry

## Scope-Out

- Option B (RPC-Shape-Konsistenz-Regel in database.md aus Slice 165) — separater Slice 167b wenn gewünscht.
- Mini-Cleanup Singleton→Hook (Option D) — separater Slice.
