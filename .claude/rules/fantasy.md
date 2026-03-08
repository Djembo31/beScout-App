---
paths:
  - "src/components/fantasy/**"
  - "src/app/**/fantasy/**"
  - "src/lib/services/events*"
  - "src/lib/services/lineups*"
  - "src/lib/services/scoring*"
  - "src/lib/services/predictions*"
---

## Events
- `entry_fee`, `prize_pool`, `max_entries`, `event_tier` (arena/club/user)
- `current_entries` ist Teilnehmer-Count (NICHT `participant_count`)
- Events klonen bei neuem GW (`cron_process_gameweek`)
- Fantasy Events sind GLOBAL — kein Club noetig (ADR-017)
- Nach Status-Aenderung: ALLE Events refetchen (nie einzeln im State updaten)

## Lineups
- 6er (1+2+2+1) oder 11er (1+4+3+3) Format
- Slot Mapping: slots 0-5 → `slot_gk, slot_def1, slot_def2, slot_mid1, slot_mid2, slot_att`
- Deadline: **per-fixture Locking** (`fixture.starts_at`), NICHT GW-level
- DPC Lock: `getPlayerEventUsage()` returns player → event usage map
- `effectiveHoldings` in EventDetailModal: unlocks players from current event being edited
- `captain_slot`: 'gk'/'def1' etc. (KEIN 'slot_' Prefix)

## Scoring
- `score_event` v4: GW Events → `player_gameweek_scores`, Non-GW → `_temp_event_scores`
- `sync_fixture_scores`: API-Football `fantasy_points` (0-15) → Scores (40-150)
- Normierung: GW-Scores 40-150 → `perf_l5` = AVG(letzte 5) / 1.5 (Skala 0-100)
- Score-Farben: >=100 Gold, 70-99 Weiss, <70 Rot
- `perf_l5`/`perf_l15`: `ORDER BY gameweek DESC` (NICHT `created_at DESC`)
- Prize-Splitting: DENSE_RANK + Position-Counting (ADR-013)
- Kein einzelnes Event-Scoring in Modals — nur ueber Admin SpieltagTab (ADR-012)

## Formation Builder (Best XI/VI)
- IMMER alle Spieler des GW fetchen (limit 300), nicht nur Top 20 (GKs haben niedrige Ratings)
- Positions-Slots zuerst: 1 GK + 4 DEF + 3 MID + 3 ATT, dann Restplaetze aus besten Uebrigen
- `getFormationRows()` gruppiert nach Position, reversed fuer Pitch (ATT oben, GK unten)
- Starter/Bench: Top 11 nach `minutes_played`, Formation aus DEF/MID/ATT Counts

## Predictions
- `PredictionType`: 'match' | 'player'
- `PredictionStatus`: 'pending' | 'correct' | 'wrong' | 'void'
- `MatchCondition`: 'match_result' | 'total_goals' | 'both_score'
- `PlayerCondition`: 'player_goals' | 'player_assists' | 'player_card' | 'clean_sheet' | 'player_minutes'
- Scoring: Correct = `+10 × (confidence/100) × difficulty`, Wrong = `-6 × (confidence/100) × difficulty`
- Difficulty: 0.5/1.0/1.5 (auto-calculated aus avg IPO price per club)
- Confidence-Farben: >=86 gold, >=66 green-500, sonst amber-400
- Privacy: Pending predictions nur fuer eigenen User sichtbar (RLS)
- `activeGameweek` Fallback: `?? 1` ist gefaehrlich fuer User ohne Club
- Query Hooks: `usePredictions(userId, gw)`, `usePredictionCount(userId, gw)`

## Spieltag-Lifecycle (atomar, Admin-Tab)
```
close → simulate → score → clone → advance
```
- `simulateGameweekFlow()` verarbeitet ALLE Events eines GW zusammen
- Kein einzelnes Event scoren (ADR-012)

## Cross-Domain (bei Bedarf nachladen)
- **Gamification:** Manager Points nach Scoring (Percentile → Elo), Achievements (event_winner, podium_3x) → `gamification.md`
- **Trading:** DPC Holdings fuer Lineup-Builder, Floor Price fuer Spieler-Anzeige → `trading.md`
- **Profile:** Leaderboard, Scout Scores in Ergebnis-Ansicht → `profile.md`
- **Club-Admin:** Event-Erstellung, Spieltag-Management, Jurisdiction → `club-admin.md`

## API-Football Integration
- TFF 1. Lig, League ID 203
- `time.elapsed` fuer Substitutions (NICHT `time.minute`!)
- `player`=OUT, `assist`=IN bei Substitutions
- `grid_position` kann kaputt sein: fehlende GK-Row, Duplikate, >11 Starters
- API-Football hat KEINE Market Values → nur Transfermarkt
