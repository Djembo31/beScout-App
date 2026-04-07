---
title: Equipment System
type: research
created: 2026-04-07
updated: 2026-04-07
tags: [equipment, mystery-box, scoring-boost, lineup, core-feature]
sources: [Codebase, Session 2026-04-06]
---

# Equipment System

Spieler-Ausruestungen die als Scoring-Multiplikator in Fantasy-Lineups wirken. Einmalig verwendbar.

## 5 Typen

| Typ | Position | Effekt |
|-----|----------|--------|
| Feuerschuss | ATT | Scoring-Boost |
| Bananen Flanke | MID | Scoring-Boost |
| Eiserne Mauer | DEF | Scoring-Boost |
| Katzenauge | GK | Scoring-Boost |
| Kapitaen | ALL | Scoring-Boost (jede Position) |

## 4 Raenge

| Rang | Multiplikator |
|------|--------------|
| R1 | x1.05 |
| R2 | x1.10 |
| R3 | x1.15 |
| R4 | x1.25 |

## Flow

1. Equipment erhalten via **Mystery Box** (Level 2+)
2. Im Lineup Builder: Spieler antippen → EquipmentPicker (Bottom Sheet)
3. Position-Matching: Feuerschuss nur ATT, Kapitaen ueberall
4. Scoring: Multiplikator nach Captain-Bonus im score_event RPC
5. Nach Event: Equipment **consumed** (einmalig)

## DB

- `equipment_definitions` — Typen
- `equipment_ranks` — Raenge mit Multiplikatoren
- `user_equipment` — Besitz + consumed_at
- `lineups.equipment_map` — JSONB: welches Equipment auf welchem Slot

## Siehe auch
- [[fantasy-tournaments]] — Equipment-Multiplikator im Scoring
- [[scout-cards]] — Equipment wird an SC-Lineup-Slots angelegt
