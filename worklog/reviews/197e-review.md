# Slice 197e Self-Review (frontend-Agent, Worktree)

**Verdict:** PASS
**Time spent:** 35 min
**Reviewer-Mode:** self-review (Pattern-Wiederholung — neue Section-Component analog SquadPreviewSection)

## Scope verifiziert
- 1 NEW component: `ClubFixturesStrip.tsx`
- 1 NEW service-fn: `getNextFixturesForClub` (additive, kein Replace)
- 1 NEW query-hook: `useClubNextFixtures`
- 1 NEW qk-entry: `qk.fixtures.nextForClub`
- 1 Integration in `ClubContent.tsx` (delay=125)
- 6 i18n keys (DE+TR symmetrisch)
- 1 Test-Mock-Update

## Findings (severity • location • issue • fix)

### M-1 — i18n in aria-label
- **Severity:** Medium (war: hardcoded German)
- **Location:** ClubFixturesStrip.tsx aria-label
- **Issue:** Initial draft hatte `aria-label={`Spieltag ${fix.gameweek}, ${fix.isHome ? 'Heim' : 'Auswärts'} ...`}` — unverstandlich für TR-User.
- **Fix (applied):** `t('fixtureGameweek', { gw })` + `t('home')` / `t('away')` (existing keys).
- **Status:** RESOLVED in same session.

### Pre-existing baseline-failures (not caused by this slice)
- `src/app/(app)/fantasy/__tests__/FantasyContent.test.tsx` — fails on git-stash baseline too.
- `src/app/(app)/player/[id]/__tests__/PlayerContent.test.tsx` — fails on git-stash baseline too.
- Out-of-scope für 197e — gehört in separates Hygiene-Slice.

## Common-Errors-Cross-Check
- [x] **Hooks vor early returns** — useTranslations + useClubNextFixtures + usePlayers VOR fixturesLoading-guard. ✅
- [x] **Dynamic Tailwind verboten** — colorClass-Map mit STATIC strings, kein `bg-${var}/15`. ✅
- [x] **Loading Guard VOR Empty Guard** — `if (loading) return Skeleton; if (fixtures.length === 0) return null;` ✅
- [x] **Multi-League Props-Propagation** — Component empfängt nur `clubId`, holt eigene Daten. Keine Type-Drift möglich. ✅
- [x] **Component-Prop Silent-Fallback** — clubId required (kein optional), Caller erzwingt Existenz. ✅
- [x] **Data-Format Drift** — `opponent_short` fallback auf '?' kein Pilot-Default ('TR'-Trap aus Slice 102 vermieden). ✅
- [x] **i18n-Key-Leak** — keine raw service-error Pfade in dieser Component (read-only). ✅

## Compliance-Cross-Check (business.md)
- Wording neutral ("Nächste 5 Spiele" / "Sonraki 5 Maç" / "Leicht/Mittel/Schwer")
- Keine Securities-Begriffe (kein "Investment", "Profit", "ROI")
- Keine Glücksspiel-Vokabel (kein "win/prize/gewinn")
- ✅ Compliance OK

## Performance-Cross-Check (performance.md)
- `staleTime: FIVE_MIN` (5 Min) — angemessen für Fixtures (statisch zwischen Sync-Cycles)
- `enabled: !!clubId` — kein wasted query bei undefined clubId
- `usePlayers()` ist bereits prefetched durch andere Components (Cache-hit normal)
- `.limit(count * 2)` als safety margin gegen stale-skip-Lücken
- ✅ Performance OK

## Test-Coverage
- Service: 29/29 grün (existing getNextFixturesByClub)
- Component: ClubFixturesStrip.tsx hat keine eigenen Tests — Pattern wie andere `sections/*` (z.B. SquadPreviewSection auch ohne Tests). Würde Slice expanden ohne extra Wert (FDR-Heuristik bereits via FDRBadge-Module getestet).
- ClubContent integration: 12/12 grün

## Verdict
**PASS** — Implementation matches Spec, common-errors checked, compliance clean, no regressions.

## Knowledge Flywheel — Was war neu?
1. Existing `getNextFixturesByClub()` returnt `Map<clubId, NextFixtureInfo>` für ALLE clubs (1 fixture each). Für Club-Detail-Page brauchte es additive Function `getNextFixturesForClub(clubId, count)` — Backward-compat by addition (nicht extension).
2. `getClubAvgL5()` Helper aus `FDRBadge.tsx` ist wiederverwendbar für clubShort-basierte Lookup — gut in der Component-Library getrennt.
3. next-intl unterstützt nested objects (`fdr.easy`) via Punkt-Notation in `t()` Aufrufen — kein Decomposition nötig.
