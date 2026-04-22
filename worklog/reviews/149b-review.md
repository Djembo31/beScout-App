# Slice 149b Review — PlayerPhoto imageUrl prop

**Verdict:** PASS (XS trivial follow-up, self-review by Primary-Claude)
**Reviewer:** Primary-Claude (self-review, cold-context-agent skipped — 3-line prop-pass fix)
**Time-spent:** 5 min

## Scope

Trivial fix: 3 call-sites ergänzen fehlende `imageUrl` prop auf `<PlayerPhoto>`.

## Pattern-Check (common-errors.md §5)

- **Optional-Prop Silent-Fallback:** Component-Props die optional sind ohne Type-Error aber mit schlechter UX (Initialen statt Photo) sind silent-fail-Pattern. 3x identisches Pattern in Codebase — dieser Slice fixt alle bekannten Call-Sites.
- **PostgREST SELECT:** PlayerRankings-Query erweitert um `image_url` column — within `.select()` Whitelist, keine Performance-Degradation.
- **Type-Alignment:** PlayerRankEntry erweitert um `image_url: string | null` matched players-Tabelle-Column.

## Findings

Keine.

## Positive

- Root Cause klar: 3 Call-Sites identifiziert via `grep '<PlayerPhoto'`.
- Konsistenter Fix-Pattern: alle 3 Stellen erhalten `imageUrl={...}` prop auf gleiche Weise.
- Type-Safe: Scoped Query-Type erweitert, kein `as any`.
- Minimal-invasiv: keine Refactorings, kein Scope-Creep.

## Post-Mortem (Lesson für common-errors.md)

**Neuer Pattern:** "Component-Prop Silent-Fallback-Audit"
- Components mit `prop?: T` + fallback-branch mit schlechter UX → Caller-Sites nicht TSC-gesichert.
- Audit-Pattern: Grep alle `<ComponentName` Calls → verify prop-coverage per Component's Branch-Logic.
- Beispiel: `PlayerPhoto(imageUrl?)` hatte 7 korrekte Calls + 3 fehlende → 30% Silent-Fail.

## Final Verdict

**PASS.** Commit-ready.
