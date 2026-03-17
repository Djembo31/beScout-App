# Feature: Dead Code Cleanup

## Status: DONE
## Typ: Hygiene / Refactoring

---

## Aufgabe

24 tote Files loeschen (0 Imports, verifiziert), Barrel-Exports bereinigen, Build verifizieren.

## Files zum Loeschen

### Player Detail (5 Files, 46 KB)
- `src/components/player/detail/MarktTab.tsx` (19.7 KB)
- `src/components/player/detail/ProfilTab.tsx` (15.1 KB)
- `src/components/player/detail/StatistikTab.tsx` (5.4 KB)
- `src/components/player/detail/ScoreMasteryStrip.tsx` (3.9 KB)
- `src/components/player/detail/TradeHistoryChips.tsx` (2.3 KB)

### Community (4 Files, 38 KB)
- `src/components/community/CommunityLeaderboardTab.tsx` (16.0 KB)
- `src/components/community/CommunityResearchTab.tsx` (7.9 KB)
- `src/components/community/CommunityVotesTab.tsx` (7.0 KB)
- `src/components/community/CreateCommunityPollModal.tsx` (7.6 KB)

### Gamification (3 Files, 17 KB)
- `src/components/gamification/CosmeticInventory.tsx` (7.6 KB)
- `src/components/gamification/RankUpModal.tsx` (7.3 KB)
- `src/components/gamification/LineupSizeIndicator.tsx` (1.8 KB)

### Market (2 Files, 59 KB)
- `src/components/market/KaufenDiscovery.tsx` (54.7 KB)
- `src/components/market/PlayerIPORow.tsx` (3.9 KB)

### Other UI (5 Files, 12 KB)
- `src/components/manager/ComparePlayerCard.tsx` (2.5 KB)
- `src/components/help/TermTooltip.tsx` (3.7 KB)
- `src/components/ui/FoundingScoutBadge.tsx` (845 B)
- `src/components/ui/ScoutBadge.tsx` (882 B)
- `src/components/missions/ScoutMissionCard.tsx` (4.9 KB)

### Services (5 Files, 15 KB)
- `src/lib/services/academy.ts` (4.9 KB)
- `src/lib/services/clubExternalIds.ts` (2.5 KB)
- `src/lib/services/founderClubs.ts` (2.7 KB)
- `src/lib/services/playerExternalIds.ts` (3.4 KB)
- `src/lib/services/streaks.ts` (957 B)

## NICHT loeschen
- RadarChart — aktiv genutzt (ScoutCard, TradingCardFrame, Compare)
- pushSubscription.ts — indirekte Referenzen
- impressions.ts, leagues.ts — Borderline

## Nach dem Loeschen
1. Barrel-Exports bereinigen (index.ts Files pruefen)
2. `npx tsc --noEmit` → Type Check
3. `npx next build` → Build Check

## Risiken
- Niedrig — alle Files haben 0 Imports
- Barrel-Exports koennen re-exports enthalten die bereinigt werden muessen

## Progress (Implementer)
- [x] Player Detail Files loeschen (5 files)
- [x] Community Files loeschen (4 files)
- [x] Gamification Files loeschen (3 files)
- [x] Market Files loeschen (2 files)
- [x] Other UI Files loeschen (5 files)
- [x] Services loeschen (4 of 5 — streaks.ts KEPT, see note below)
- [x] Barrel-Exports bereinigen (none needed — no barrel index files existed)
- [x] tsc --noEmit: PASS (zero errors)
- [ ] next build: SKIP (env vars missing in worktree, expected)

## Note: streaks.ts NOT deleted
`src/lib/services/streaks.ts` has an active dynamic import in `src/app/(app)/page.tsx` line 184:
```
import('@/lib/services/streaks').then(({ recordLoginStreak }) => { ... })
```
This file is NOT dead code. Total deleted: 23 files (not 24).
