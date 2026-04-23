# Session Handoff (2026-04-24 Slice 171 Abschluss)

## Status: SLICE 171 DONE — AUTOPILOT CONTINUING

**Active Slice:** idle (bereit für Slice 172 E — Singleton 170b)
**Working Tree:** clean
**Branch:** main
**Session-Scope-Heute:** 2 Slices (170 + 171) + Autopilot in Richtung 172 → 173 → Notion-Sync

---

## Slice 170-171 Bilanz

| # | Typ | Scope | Commit |
|---|-----|-------|--------|
| 170 | refactor(ux) | Singleton→useQueryClient (3 Files) + M1 deps-Fix | `7d69553a` |
| 171 | docs(codification) | Knowledge-Capture common-errors.md + testing.md | `8992ae0a` |

**Knowledge-Flywheel 170→171:** D25-Pattern bestätigt (Fix-Slice → separates Codification-Slice).

---

## Autopilot-Plan Fortsetzung

### Slice 172 (E) — Singleton 170b, 11 weitere Files (S, ~1.5h)

11 Component-Kandidaten aus Slice 170 Scope-Gap-Check:
- `src/components/club/sections/MembershipSection.tsx` (Slice 151c D18-Pilot)
- `src/features/market/hooks/useWatchlistActions.ts`
- `src/features/market/components/marktplatz/WatchlistView.tsx`
- `src/features/market/components/MarketContent.tsx`
- `src/features/fantasy/hooks/useGameweek.ts`
- `src/app/(app)/club/[slug]/ClubContent.tsx`
- `src/app/(app)/community/page.tsx`
- `src/app/(app)/founding/page.tsx`
- `src/app/(app)/missions/page.tsx`
- `src/app/(app)/page.tsx`
- `src/app/(app)/hooks/useHomeData.ts` (Utility mit Hook-Call? Pruefen)

Audit-Pattern (aus common-errors.md §5 Slice 170 Learning):
1. Imports migrieren
2. `useQueryClient()`-Hook-Call
3. **queryClient in useCallback-deps** (exhaustive-deps-Trap!)
4. Tests bei Bedarf via `vi.hoisted`-Pattern (testing.md §5)

Nach jedem File: tsc + betroffene Tests. Nach ganzem Batch: reviewer-agent.

### Slice 173 (D) — RPC-Shape-Audit (S, ~1h)

Audit aller `json_build_object`-RPCs ohne success-flag (Slice 168 Regel). Consumer-Impact-Analyse pro RPC.

### Notion Kanban Sync

Slice 169 + 170 + 171 in Notion Kanban als "Erledigt" markieren (SessionStart-Hook-Reminder).

### Session-End DISTILL

Wenn neue Decisions aus der Autopilot-Session entstehen → `memory/decisions.md`.

## Key-References

- Slice 170 Review: `worklog/reviews/170-review.md` (Scope-Gap-Check 11 Kandidaten)
- Audit-Template: `.claude/rules/common-errors.md` §5 "Singleton→useQueryClient() Migration"
- Test-Pattern: `.claude/rules/testing.md` §5 "vi.hoisted"

## Pre-existing Findings (Carry-Over)

- 5× `tErrors` missing-dep Warnings in useCommunityActions.ts (Z.222, 262, 281, 297, 313) — pre-existing vor Slice 170, Nit-Fix-Kandidat.
