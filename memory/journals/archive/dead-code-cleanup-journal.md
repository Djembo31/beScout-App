# Dead Code Cleanup — Journal

## Datum: 2026-03-17
## Agent: implementer (worktree agent-aa7d8d71)

## Ergebnis
23 von 24 Files geloescht. 1 File (streaks.ts) behalten — hat aktiven Import.

## Verifizierung
- tsc --noEmit: PASS (zero errors)
- next build: SKIP (Supabase env vars fehlen im Worktree, erwartetes Verhalten)
- Barrel-Exports: Keine vorhanden — keine Bereinigung noetig
- Grep nach allen geloeschten Dateinamen in src/: Zero matches (keine broken imports)

## Geloeschte Files (23)
### Player Detail (5, ~46 KB)
- MarktTab.tsx, ProfilTab.tsx, StatistikTab.tsx, ScoreMasteryStrip.tsx, TradeHistoryChips.tsx

### Community (4, ~38 KB)
- CommunityLeaderboardTab.tsx, CommunityResearchTab.tsx, CommunityVotesTab.tsx, CreateCommunityPollModal.tsx

### Gamification (3, ~17 KB)
- CosmeticInventory.tsx, RankUpModal.tsx, LineupSizeIndicator.tsx

### Market (2, ~59 KB)
- KaufenDiscovery.tsx, PlayerIPORow.tsx

### Other UI (5, ~12 KB)
- ComparePlayerCard.tsx, TermTooltip.tsx, FoundingScoutBadge.tsx, ScoutBadge.tsx, ScoutMissionCard.tsx

### Services (4, ~14 KB)
- academy.ts, clubExternalIds.ts, founderClubs.ts, playerExternalIds.ts

## NICHT geloescht
- `streaks.ts` — aktiver dynamischer Import in `src/app/(app)/page.tsx:184`
  ```
  import('@/lib/services/streaks').then(({ recordLoginStreak }) => { ... })
  ```

## Beobachtungen
- Keine Barrel-Export index.ts/index.tsx Dateien in den betroffenen Directories
- `src/components/ui/index.tsx` re-exportiert weder FoundingScoutBadge noch ScoutBadge
- Einzige Referenz auf geloeschte Files war ein Kommentar in PlayerDetailSkeleton.tsx ("matches ProfilTab layout") — harmlos
- Einzige Referenz auf streaks war ein Kommentar in streakBenefits.ts plus der aktive Import in page.tsx

## Geschaetzte Einsparung
~186 KB Source Code entfernt
