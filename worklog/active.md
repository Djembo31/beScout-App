# Active Slice

```
status: idle
slice: 425
title: Welle-2 Display-Truth Cleanup (A scored-Synergie==Server · B Club-UUID-Label · C Kader-Filter-clubId) — DONE
size: M
stage: LOG (DONE)
spec: worklog/specs/425-welle2-display-truth-cleanup.md
impact: skipped (display-only, kein Service-Contract/RPC/Schema-Change)
proof: worklog/proofs/425-display-truth.txt
review: worklog/reviews/425-review.md (PASS, 2 NIT pre-existing)
proof-summary: tsc 0 + 323 Tests grün + DB-shape (synergy_details.source=Name, synergy_bonus_pct=NUMERIC-String) + grep-Verify (LineupPanel = einzige live scored-Surface). Reviewer PASS.
```

## Zuletzt

- **Slice 425** (2026-06-27) — Welle-2 Display-Truth A/B/C, Fix auf LIVE-Surface LineupPanel umgelenkt (ScoreBreakdown=tot) (M, PASS).
- **Slice 424** (2026-06-27) — Synergie-Vorschau == Server (M, PASS).
- **Slice 423** (2026-06-27) — Picker-Club-Identität auf UUID (S, PASS).

## Plan (425) — DONE

A scored Synergie-Banner an gesettelte `lineups.synergy_bonus_pct`+`synergy_details` (inkl. Surge ungecappt; Coerce NUMERIC-String "10.00"→10 im Hook) · B scored-Breakdown Club-Name via `getClub(player.clubId)` · C KaderTab/Toolbar Club-Filter String→clubId-Key. Hook `useLineupBuilder` exposed `settledSynergy` (required-Prop durch EventDetailModal+AufstellenTab). **Surface-Korrektur:** ScoreBreakdown.tsx ist toter Code → Live-Surface = LineupPanel.tsx. Money-neutral, kein Migration. tsc 0 + 323 Tests + Reviewer PASS.

## 🚩 Eskalation / gemeldete Smells (offen)
- **ORPHAN-CLUSTER (CTO-autonom, eigener S280-Slice):** `LineupBuilder`/`ScoreBreakdown`/`SynergyPreview`/`PitchView`/`PlayerPicker`/`FormationSelector` = 6 Komponenten in `features/fantasy/components/lineup/` mit **0 Live-Consumer** (nur `BenchRow` live). Komplette alte Builder-UI dupliziert (D111-Wurzel #1). Löschen mit Cascade-Closure + Barrel + EventDetailModal.test-Mocks.
- **CEO-Forks (NICHT autonom):** Admin-Gameweek-Engine („GW-Lifecycle per-Liga?", Money-Path) · Ranking-Konsolidierung scout_scores↔user_stats · Welle 3 (Lineup-Datenmodell-Fork).
- **Player-Domain `getClub(player.club)`** (PlayerHero/PlayerRow/TradingCardFrame/player/index.tsx) = eigener Card-Identitäts-Smell-Cluster.
- **NIT (eigener Slice):** Kader `clubFilter`-State-Reset bei Country/League-Switch (pre-existing).
