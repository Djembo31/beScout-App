# Frontend Journal: Slice 199 — 4 UI-Consumers

## Gestartet: 2026-04-25

### Verstaendnis
- Was: 4 UI-Consumers fuer Slice 199 — Top-Predictor-Leaderboard (C-05),
  Most-Owned-Players-per-Club (K-02), Event-Difficulty-Indikator (fm 2.4),
  In-Lineup-Filter Kader-Toolbar (fm 1.3 frontend-only)
- Betroffene Files:
  - src/features/fantasy/services/predictions.queries.ts (add getTopPredictorsLeaderboard)
  - src/lib/queries/predictions.ts (add useTopPredictorsLeaderboard)
  - src/lib/services/club.ts (add getMostOwnedPlayersPerClub)
  - src/lib/queries/clubs.ts (add useMostOwnedPlayersPerClub) — or use existing pattern
  - src/features/fantasy/services/events.queries.ts (add getEventDifficultyScore)
  - src/features/fantasy/queries/events.ts (add useEventDifficultyScore)
  - src/lib/queries/keys.ts (add new qk.* keys)
  - src/components/fantasy/PredictionsTab.tsx (Top-Predictor-Section)
  - src/app/(app)/club/[slug]/ClubContent.tsx OR new component (Most-Owned-Card)
  - src/features/manager/components/aufstellen/EventSelector.tsx (Difficulty pill)
  - src/features/manager/components/kader/KaderToolbar.tsx (In-Lineup filter)
  - src/features/manager/components/kader/KaderTab.tsx (apply filter)
  - messages/de.json + tr.json (new keys)
- Risiken:
  - eventUsageMap is async — disable filter when null
  - Backend may not yet have RPCs deployed → service throws → must handle in hooks
  - Kader-files Forbidden in 198, jetzt erlaubt — careful Diff

### Entscheidungen
| # | Entscheidung | Warum |
|---|--------------|-------|
| 1 | Inline-Type-Definitions in Services | Backend-Types not yet harmonized, will merge later |
| 2 | Filter-Pill Group fuer fm 1.3 | Konsistent mit existing FormL5/MvTrend pills |
| 3 | Difficulty als Star-Pill (1-3) | Visuell schnell erfassbar, 3 Tiers (easy/medium/hard) |
| 4 | Most-Owned-Card auf Übersicht-Tab + Spieler-Tab | Sichtbar an gehäuftem Spot, nicht gehäuft beide |
| 5 | Top-Predictor-List Max 10, kompakt | analog `gamification.leaderboardByDim` |

### Fortschritt
- [x] Read SPEC + relevant files
- [ ] Add qk-keys
- [ ] Service: getTopPredictorsLeaderboard
- [ ] Service: getMostOwnedPlayersPerClub
- [ ] Service: getEventDifficultyScore
- [ ] Hook: useTopPredictorsLeaderboard
- [ ] Hook: useMostOwnedPlayersPerClub
- [ ] Hook: useEventDifficultyScore
- [ ] PredictionsTab Top-Predictor-Section
- [ ] ClubContent or sub-section Most-Owned-Card
- [ ] EventSelector Difficulty-Pill
- [ ] KaderToolbar+KaderTab In-Lineup-Filter
- [ ] i18n DE+TR
- [ ] tsc clean
- [ ] commit
