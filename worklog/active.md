# Active Slice

```
status: idle
slice: 426
title: Orphan-Cleanup — alte Lineup-Builder-UI löschen (6 Komponenten + Barrel, S280) — DONE
size: S
stage: LOG (DONE)
spec: worklog/specs/426-orphan-lineup-builder-cleanup.md
impact: skipped (Dead-Code-Removal, 0 Live-Consumer)
proof: worklog/proofs/426-orphan-cleanup.txt
review: worklog/reviews/426-review.md (self-review Ops-Lane, PASS)
proof-summary: 7 Files / 1541 Zeilen gelöscht, 0 Live-Edit. tsc 0 + audit:orphan Real-drift-0 + vitest 317/317. BenchRow bleibt.
```

## Zuletzt

- **Slice 425** (2026-06-27) — Welle-2 Display-Truth A/B/C auf Live-Surface LineupPanel (M, PASS).
- **Slice 424** (2026-06-27) — Synergie-Vorschau == Server (M, PASS).
- **Slice 423** (2026-06-27) — Picker-Club-Identität auf UUID (S, PASS).

## Plan (426) — Dead-Code-Removal

Löschen: `LineupBuilder` · `ScoreBreakdown` · `SynergyPreview` · `PitchView` · `PlayerPicker` · `FormationSelector` (6 Komponenten, 0 Live-Consumer) + Barrel `lineup/index.ts` (0 Importer). `BenchRow.tsx` BLEIBT (Live via Subpath in LineupPanel). Closure verifiziert: alle externen Imports der 6 haben Live-Consumer → keine transitive Kaskade; kein Test referenziert die 6. Proof = tsc 0 + audit:orphan + volle vitest + git diff (nur Deletions).

## 🚩 Offen (nach 426)
- **CEO-Forks (NICHT autonom):** Admin-Gameweek-Engine („GW-Lifecycle per-Liga?") · Ranking-Konsolidierung scout_scores↔user_stats · Welle 3.
- **Player-Domain `getClub(player.club)`** (PlayerHero/PlayerRow/TradingCardFrame) = Card-Identitäts-Smell-Cluster.
- **NIT:** Kader `clubFilter`-State-Reset bei Country/League-Switch (pre-existing).
