# Slice 292 — Page Contract Audit: /fantasy + /clubs + /club/[slug]

Status: DONE
Date: 2026-06-13
Type: Docs / Audit / S3 Stabilization
Size: M

---

## Trigger

Per `memory/current-product-truth.md` §8 and `worklog/active.md`, the next stabilization step after Slice 291 is S3 Page Contract Audit:

- `/fantasy`
- `/clubs`
- `/club/[slug]`

No runtime changes in this slice.

---

## Goal

Produce Page Contracts for the Fantasy and Club segment of the demo path, focusing on whether users can understand:

- Fantasy lifecycle: Spieltag -> Events -> Mitmachen/Lineup -> Ergebnisse.
- Club discovery: find/follow/activate clubs.
- Club detail: club identity, squad, fixtures, fandom, membership and club-specific BeScout value.

Each page gets GREEN/YELLOW/RED demo status and concrete follow-up candidates.

---

## Scope

Allowed:
- read source/tests/e2e/docs;
- write `worklog/specs`, `worklog/audits`, `worklog/reviews`, `worklog/proofs`, `worklog/notes`;
- update `worklog/active.md` and prepend `worklog/log.md`.

Forbidden:
- no `src/**` runtime edits;
- no test/source fixes;
- no migrations/API changes;
- no touching `memory/session-handoff.md`.

---

## Inspected areas

Fantasy:
- `src/app/(app)/fantasy/page.tsx`
- `src/app/(app)/fantasy/FantasyContent.tsx`
- `src/features/fantasy/hooks/*`
- `src/features/fantasy/services/*`
- `src/components/fantasy/*`
- `src/app/(app)/fantasy/__tests__/FantasyContent.test.tsx`

Clubs discovery:
- `src/app/(app)/clubs/page.tsx`
- `src/lib/services/club.ts`
- `src/lib/services/fixtures.ts`
- `src/lib/hooks/useFollowedClubs.ts`
- `src/lib/hooks/useToggleFollowClub.ts`
- `src/lib/queries/trades.ts`

Club detail:
- `src/app/(app)/club/[slug]/page.tsx`
- `src/app/(app)/club/[slug]/ClubContent.tsx`
- `src/components/club/hooks/useClubData.ts`
- `src/components/club/hooks/useClubActions.ts`
- `src/components/club/sections/*`
- `src/app/(app)/club/[slug]/__tests__/ClubContent.test.tsx`

---

## Acceptance Criteria

- AC1: `/fantasy` Page Contract completed.
- AC2: `/clubs` Page Contract completed.
- AC3: `/club/[slug]` Page Contract completed.
- AC4: Each page gets a `demo-green` / `demo-yellow` / `demo-red` status using `current-product-truth.md` vocabulary.
- AC5: Gates, data sources, mutations, query/cache ownership, components, loading/empty/error/mobile, tests/e2e and debt documented.
- AC6: Findings are follow-up slices only, not implemented fixes.
- AC7: Proof includes focused verification output and confirms no `src/**` runtime changes.

---

## Result summary

Detailed audit:
- `worklog/audits/2026-06-13/page-contract-fantasy-club.md`

Status summary:

| Page | Status | Headline |
|---|---|---|
| `/fantasy` | demo-yellow, near-green | Strong SSOT hooks, GeoGate `free_fantasy`, disclaimer and meaningful tests; caveat: no explicit unauth fallback inside content and lifecycle complexity needs data-confidence beyond render tests. |
| `/clubs` | demo-yellow | Useful discovery page and real follow/activate mutations; caveat: page-local service orchestration, no dedicated Page test, no page-level compliance/disclaimer. |
| `/club/[slug]` | demo-yellow | Real server metadata + public/auth views + broad tests; caveat: very broad container, public metadata says “Trading”, and many club sections compete for demo narrative authority. |

Top follow-up candidates:

- F-1 P1: Replace public Club metadata “Trading” copy with compliance-safe “Scout Cards / Fantasy / Fan-Wissen” language.
- F-2 P1: Add `/clubs` Page Contract test covering loading/error/empty/follow/activate basics.
- F-3 P2: Add Fantasy unauth/blocked-state assertion so Free Fantasy gate + app auth behavior is explicit.
- F-4 P2: Club detail narrative simplification pass: pick one loud “why this club matters now” story above the fold; demote secondary modules.
