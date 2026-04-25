# Frontend Journal: Slice 197e — ClubFixturesStrip

## Gestartet: 2026-04-25

### Verstaendnis
- Was: 5-GW-Forward-FDR-Strip auf `/club/[slug]` Page. Color-coded (easy/med/hard).
- Betroffene Files:
  - `src/features/fantasy/services/fixtures.ts` (Service erweitern: NEW function `getNextFixturesForClub(clubId, count)`)
  - `src/lib/queries/fixtures.ts` (Hook `useClubNextFixtures`)
  - `src/lib/queries/keys.ts` (qk.fixtures.nextForClub)
  - `src/components/club/sections/ClubFixturesStrip.tsx` (NEU)
  - `src/app/(app)/club/[slug]/ClubContent.tsx` (Integration above Squad)
  - `messages/de.json` + `messages/tr.json` (i18n keys)
- Risiken:
  - Existing `getNextFixturesByClub()` returnt `Map<clubId, NextFixtureInfo>` — andere Konsumenten dürfen nicht brechen
  - `getClubAvgL5` aus FDRBadge bekommt `Pick<Player, 'club'|'perf'>` — `usePlayers()` liefert das
  - Mobile 393px: 5 Pills × ~60px = 300px → passt mit overflow-x-auto

### Entscheidungen
| # | Entscheidung | Warum |
|---|--------------|-------|
| 1 | NEUE function `getNextFixturesForClub(clubId, count)` statt Erweiterung der bestehenden `getNextFixturesByClub()` | Cleaner separation: bestehende Map-für-alle-Clubs Funktion bleibt unverändert, neue Function return Array für 1 Club |
| 2 | FDR-Heuristik: avgL5 < 40 = easy (emerald), 40-55 = med (status-doubtful), >=55 = hard (rose) | Identisch zu existing `getFDR()` in FDRBadge.tsx — single source of truth |
| 3 | Pills: w-14 (56px) für 393px-fit. 5 Pills × 56px + 4 gaps × 6px = 304px | Komfortabel auf 393px, kein horizontaler Overflow |
| 4 | scrollbar-hide + overflow-x-auto als Safety-Net | Falls Liga mehr fixtures hat (Pokal etc.), graceful overflow |

### Fortschritt
- [x] Service: getNextFixturesForClub (src/features/fantasy/services/fixtures.ts)
- [x] Query Key: qk.fixtures.nextForClub
- [x] Hook: useClubNextFixtures (src/lib/queries/fixtures.ts)
- [x] Component: ClubFixturesStrip (src/components/club/sections/ClubFixturesStrip.tsx)
- [x] Integration: ClubContent (delay=125, between ActiveOffers und SquadPreview)
- [x] i18n: DE + TR (next5Fixtures + fdr.easy/med/hard)
- [x] Test-Mock added in ClubContent.test.tsx

### Runden-Log
- Runde 1: Implementation komplett, tsc clean, vitest 12/12 ClubContent tests grün, 29/29 fixtures.test.ts grün
- AFTER-Phase Self-Check:
  - [x] Types propagiert: NextFixtureInfo[] durchgängig genutzt
  - [x] i18n komplett: DE + TR symmetrisch (next5Fixtures + fdr.{easy,med,hard})
  - [x] Service-Layer eingehalten: Component → useClubNextFixtures Hook → Service → Supabase
  - [x] Hooks vor early returns: useTranslations + useClubNextFixtures + usePlayers vor Loading-Guard
  - [x] Loading Guard VOR Empty Guard
  - [x] Mobile 393px: 5 × w-14 (56px) = 280px + 4 × gap-1.5 (24px) + px-1 (8px) = 312px → fit
  - [x] aria-label localized (uses t('fixtureGameweek') + t('home')/t('away'))
  - [x] Static Tailwind classes (kein dynamic JIT)
  - [x] Edge: opponent-short empty → '?' fallback, avgL5=0 hides L5-line
  - [x] No new regressions (FantasyContent + PlayerContent failures pre-existing on baseline)

### Files geändert
- src/features/fantasy/services/fixtures.ts (+56 lines: NEW getNextFixturesForClub)
- src/lib/queries/fixtures.ts (+11 lines: useClubNextFixtures)
- src/lib/queries/keys.ts (+1 line: qk.fixtures.nextForClub)
- src/components/club/sections/ClubFixturesStrip.tsx (NEW, 116 lines)
- src/app/(app)/club/[slug]/ClubContent.tsx (+8 lines: import + integration)
- src/app/(app)/club/[slug]/__tests__/ClubContent.test.tsx (+4 lines: mock stub)
- messages/de.json (+6 keys)
- messages/tr.json (+6 keys)
