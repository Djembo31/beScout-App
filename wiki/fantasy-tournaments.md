---
title: Fantasy Tournaments
type: research
created: 2026-04-07
updated: 2026-04-07
tags: [fantasy, lineups, scoring, events, chips, predictions, core-feature]
sources: [fantasy.md, fantasy.md rules, cross-domain-map.md]
---

# Fantasy Tournaments

User stellen Lineups aus echten Spielern zusammen. Punkte basieren auf realer Match-Performance.

## Formate

- **6-Mann:** 1 GK + 2 DEF + 2 MID + 1 ATT
- **11-Mann:** 1 GK + 4 DEF + 3 MID + 3 ATT

## Event Lifecycle

```
upcoming → registering → late-reg → running → scoring → ended
                                      ↓
                                cancelled (Refund)
```

## Entry

- **Free:** Tickets
- **Paid:** Tickets oder Scout Credits (Phase 4, nach MGA)
- Lineup-Slots brauchen SC-Holdings (min_sc_per_slot)
- holding_locks verhindern Verkauf waehrend Event

## Scoring

- Basic Score = SUM(player_gameweek_scores pro Slot)
- Captain: 1.5x Multiplikator
- Equipment: Zusaetzlicher Multiplikator nach Captain (1.05x bis 1.25x)
- Ranking: DENSE_RANK nach total_score DESC
- Rewards: JSONB Array (rank → pct des Prize Pools)

## Chips

| Chip | Effekt | Status |
|------|--------|--------|
| Triple Captain | 3.0x statt 1.5x | Live |
| Synergy Surge | 2x Bonus (max 30%) | Live |
| Second Chance | Bench-Swap | Konzept, nicht gebaut |

## Predictions

Match/Player Conditions. Confidence 50-100, Difficulty 0.5/1.0/1.5. +10 richtig, -6 falsch.

## Wildcards

Bypass SC-Ownership Check fuer Lineup-Slots. Verdient via Missions/Boxes. Balance tracked.

## Cross-Domain

- **→ Trading:** SC-Holdings noetig, holding_locks bei aktiver Teilnahme
- **→ Wallet:** Entry Fee Lock/Unlock
- **→ Gamification:** Manager Elo nach Scoring, Achievements
- **→ Equipment:** Multiplikator nach Captain-Bonus, einmalig consumed

## Siehe auch
- [[scout-cards]] — Holdings als Voraussetzung fuer Lineup-Slots
- [[equipment-system]] — Scoring-Boosts durch Equipment
- [[gamification]] — Manager-Dimension wird durch Fantasy gefuettert
