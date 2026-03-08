---
paths:
  - "src/lib/gamification*"
  - "src/lib/achievements*"
  - "src/components/**/rang*"
  - "src/components/**/score*"
  - "src/components/**/achievement*"
  - "src/components/**/mission*"
  - "src/components/**/streak*"
  - "src/lib/services/missions*"
  - "src/lib/services/scoutScores*"
---

## 3-Dimensionen Elo System
- Dimensionen: `trader` (sky), `manager` (purple), `analyst` (emerald)
- Start: 500. Scores koennen steigen UND fallen (kein reiner Progress)
- Gesamt-Rang = **Median** der 3 Scores (sortieren, Index 1 nehmen — NICHT Durchschnitt!)

## 12 Raenge
| # | Rang | Score | Sub-Stufen |
|---|------|-------|------------|
| 1-3 | Bronze | 0-999 | I: 0-349, II: 350-699, III: 700-999 |
| 4-6 | Silber | 1000-2199 | I: 1000-1399, II: 1400-1799, III: 1800-2199 |
| 7-9 | Gold | 2200-3999 | I: 2200-2799, II: 2800-3399, III: 3400-3999 |
| 10 | Diamant | 4000-4999 | keine |
| 11 | Mythisch | 5000-6999 | keine |
| 12 | Legendaer | 7000+ | keine (maxScore: null) |

- **I < II < III** (Star-System, ADR-020). Tier-Nummer (1-12) fuer Vergleiche nutzen
- Negative Scores → Bronze I. Legendaer hat kein Limit

## Manager Points (Fantasy)
- Percentile-basiert: Top 1%=+50, 5%=+40, 10%=+30, 25%=+20, 50%=+10, 75%=0, 90%=-10, >90%=-25
- `ABSENT_MANAGER_PENALTY = -15`, `CAPTAINS_CALL_BONUS = 15`

## Score Road (11 Milestones)
- Claim via `claim_score_road(user_id, milestone)` — idempotent
- Rewards: BSD cents → Wallet sofort. Cosmetics: Rahmen, Titel, Avatare
- Progress Bar: `(score - minScore) / (maxScore - minScore + 1) * 100`

## Achievements (33 Total)
- 15 featured (immer sichtbar), 18 hidden (erst bei Unlock)
- Kategorien: trading (sky), manager (purple), scout (emerald)
- `checkAndUnlockAchievements()` — lazy queries, nur wenn noch nicht unlocked
- Achievement-Unlock → Notification + Confetti + localStorage Dedupe

## Missions
- `assign_user_missions(user_id)` — idempotent
- `track_my_mission_progress(mission_key, increment)` — RPC Wrapper mit auth.uid()
- Status: active → completed → claimed / expired
- Circular Dependency: `import('@/lib/services/missions')` dynamisch

## Streaks
- `recordLoginStreak(userId)` — idempotent (already_today: true nach erstem Call)
- Shields verhindern Streak-Verlust bei verpasstem Tag
- Milestones: 3d=5, 7d=15, 14d=50, 30d=150 $SCOUT

## RPCs (REVOKED — nur via DB-Triggers)
- `award_dimension_score`, `award_score_points`, `award_mastery_xp` — REVOKED from PUBLIC
- `refresh_user_stats`, `update_mission_progress` — REVOKED, Wrapper nutzen
- Wrapper: `refresh_my_stats()`, `refresh_my_airdrop_score()`, `track_my_mission_progress()`

## Cross-Domain (bei Bedarf nachladen)
- **Fantasy:** Manager Points nach GW-Scoring (Percentile-basiert) → `fantasy.md`
- **Trading:** Trader Score nach Trade (DB-Trigger trg_fn_trade_refresh) → `trading.md`
- **Community:** Analyst Score nach Post/Research/Bounty (DB-Triggers) → `community.md`
- **Profile:** RangBadge, ScoreRoad, DimensionRangStack Anzeige → `profile.md`

## Haeufige Fehler
- Median vs Average: IMMER sortieren + Index 1, NIE (a+b+c)/3
- `getDimensionColor(dim)` nutzen, nie Farben hardcoden
- Negative Scores abfangen (getRang defaults zu Bronze I)
- Mission Progress: `track_my_mission_progress` nutzen, NICHT `update_mission_progress` (revoked)
- Achievement-Modal: `processedRef` Set + localStorage um Doppel-Anzeige zu verhindern
