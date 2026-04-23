# Session Handoff (2026-04-24 Slice 170 Abschluss)

## Status: SLICE 170 DONE — NAHTLOS-FORTSETZUNG MOEGLICH

**Active Slice:** idle (bereit für Slice 171)
**Working Tree:** clean nach hygiene-commit
**Branch:** main
**Session-Scope-Heute:** 1 Code-Slice (170) + 1 Hygiene-Commit

---

## Slice 170 Bilanz — Singleton → useQueryClient Migration

| # | Typ | Scope | Commit |
|---|-----|-------|--------|
| 170 | refactor(ux) | Konvention-Cleanup 3 Files + Test-Migration + M1 deps-Fix | `7d69553a` |

**Kernergebnis:**
- 3 Ferrari-Erben (useCommunityActions + LeaguesSection + MissionBanner) migriert auf `useQueryClient()` Hook-Variante
- Test-Migration mit `vi.hoisted(mockQc)` + partial `@tanstack/react-query` Mock
- M1-Fix (Reviewer-Finding): 9 useCallbacks haben nun `queryClient` in deps-array
- 76/76 Tests grün, tsc clean, 0 Singleton-Imports in Ziel-Files

**Phase 7 Konvention-Cleanup:** ✅ für die 3 Slice-170-Ferrari-Erben. 11 weitere Component-Kandidaten als Backlog fuer Slice 170b.

---

## Nahtlos-Start-Punkt für Slice 171

### Empfehlung: **B → D**

### Option B: Admin-Tier-1 Kill-Switch — M, ~2h (CEO-Approval)
- `src/components/admin/AdminWithdrawalTab.tsx` (Process club withdrawal — Money)
- `src/components/admin/AdminFoundingPassesTab.tsx` (FP Create/Revoke — Kill-Switch)
- **CEO-Approval pflicht** vor Build (Money + Kill-Switch-Scope).

### Option D: RPC-Shape-Audit — S, ~1h (aus Slice 168 Regel)
- Audit aller bestehenden `json_build_object`-RPCs ohne success-flag.
- Migrationen-Plan pro kritische RPC mit Consumer-Impact-Analyse.
- Separater Ferrari-Slice pro migrierter RPC wenn Consumer anpassen.

### Option E (neu nach Slice 170): Slice 170b Singleton-Audit 11 Files — S, ~1.5h
- `ClubContent.tsx`, `MembershipSection.tsx`, `WatchlistView.tsx`, `MarketContent.tsx`, `useGameweek.ts`, `useWatchlistActions.ts` + 6 page-files migrieren.
- Gleiche Konvention-Cleanup-Methode wie Slice 170.
- Nur Component-Files (Utility/Page-Files mit legitimer Singleton-Nutzung bleiben).

### Option F (Codification aus Slice 170): Knowledge-Capture — XS, ~15min
- common-errors.md §5: neue Sub-Section "Singleton→useQueryClient() Migration — exhaustive-deps-Trap" (aus Slice 170 Review Learning-Kandidat 1)
- testing.md: 5. Pattern "vi.hoisted für shared-mock-reference" (aus Slice 170 Review N3)

## Key References — IMMER ZUERST LESEN bei Slice 171-Start

1. `worklog/active.md` — Slice-171-Kandidaten + Phase-Status + Backlog
2. `worklog/log.md` — Slice 170 ganz oben, Session-Context
3. `memory/decisions.md` D25+D26 — Session-Meta-Learnings aus Session 2026-04-23
4. `memory/patterns.md` #28 — Ferrari-Blueprint + Konventionen (aktuell, inkl. Hook > Singleton)
5. `worklog/reviews/170-review.md` — M1-Finding + Scope-Gap-Check (11 Kandidaten fuer 170b)

## Unfinished Business — NONE

Slice 170 hat:
- Spec-File in `worklog/specs/170-singleton-to-use-queryclient.md`
- Review-File in `worklog/reviews/170-review.md` (PASS mit M1 im Build gefixt)
- 3 Proof-Artefakte in `worklog/proofs/170-*.txt`
- Commit-Hash im log.md
- Clean active.md

## Pre-existing Findings (nicht durch Slice 170 eingefuehrt)

- 5× `tErrors` missing-dep Warnings in useCommunityActions.ts (Z.222, 262, 281, 297, 313) — pre-existing, Runtime-Impact Null, Nit-Fix fuer spaetere Session (kombinierbar mit Knowledge-Capture Option F).
