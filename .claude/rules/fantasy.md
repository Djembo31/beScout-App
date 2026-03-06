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
- entry_fee, prize_pool, max_entries, event_tier
- Events klonen bei neuem GW (cron_process_gameweek)

## Lineups
- 6er (1+2+2+1) oder 11er (1+4+3+3) Format
- Deadline: per-fixture Locking (fixture.starts_at), nicht GW-level

## Scoring
- rating*10, perf_l5/l15 aus fixture_player_stats

## Predictions
- Individuelle Fixture-Vorhersagen
- activeGameweek Fallback: ?? 1 ist gefaehrlich fuer User ohne Club
