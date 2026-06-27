# Active Slice

```
status: idle
slice: 420
title: Welle 2.3 — Heim/Auswärts + FDR über Club-UUID statt Short-String/Majority-Vote — DONE
size: M (1 Service-Fix + NextFixtureInfo-Typ + 2 Producer + FDR-Helper + 4 Consumer + 1 Test)
stage: LOG (DONE)
spec: worklog/specs/420-club-uuid-fixtures.md
impact: in Spec (Consumer-Karte grep-verifiziert: 4 FDR-Consumer via NextFixtureInfo, 1 Timeline-Consumer)
proof: worklog/proofs/420-club-uuid-fixtures.txt
review: worklog/reviews/420-review.md
proof-summary: SQL-Probe 8 Flips + tsc 0 + full vitest 3301 grün; Reviewer PASS (F1 geheilt, F2 out-of-scope)
```

## Kontext (Faktenbasis, gemessen 2026-06-27)
- `fixture_player_stats.club_id`: **0/67.737 NULL** → per-Fixture-UUID 100% sicher.
- `players.club_id`: 84/4.556 (1,8%) NULL → FDR-clubId-Filter trifft 98,2%.
- **117 Spieler** mit Multi-Club-Stat-Rows → Majority-Vote real falsch für deren Minderheits-Fixtures.
- **6 Short-Kollisionen**, davon **BAY = Leverkusen↔Bayern SAME-LEAGUE** (Bundesliga) → FDR mischt heute beide L5.

## Vorige Slice (419 — DONE, Referenz)
CEO Option A (Fixture-bound). Migration live (`419`+`419b`). Knowledge: errors-db S419 + fantasy.md.

## Ergebnis
CEO Option A (Fixture-bound). Migration live (`419` + `419b`), `main` push pending.
- Schema: pgs `UNIQUE(player_id,fixture_id)` + `league_id`/`gameweek` denorm + 2 FKs. 1401 Orphans (GW32-35, herkunftslos) gelöscht → 60.061 Zeilen, 100% fixture-gebunden.
- Writer `sync_fixture_scores`: per-Fixture (`ON CONFLICT (player_id,fixture_id)`).
- Money-Reader `score_event`: Event-Liga `COALESCE(events.league_id, clubs.league_id)`, Minuten+Score liga-gefiltert, SUM. PATCH-AUDIT byte-treu (3 Treasury-Calls intakt), ACL kein-anon erhalten.
- TS-Reader: getPlayerGameweekScores (SUM/gw), getPlayerMatchTimeline (Score pro fixture_id = GW-Map-Bug-Fix), getProgressiveScores (SUM/player). Cron-Guard DISTINCT-player.
- 419b: Reviewer-HIGH-Fund `rpc_get_recent_player_scores` (Form-Bars) — Row-Fanout nach UNIQUE-Flip → Skalar-Subquery-SUM liga-gefiltert (Fanout-Proof old=1→new=0).
- Knowledge: errors-db **S419** + fantasy.md (Scoring fixture-bound) + docs/knowledge/domain/fantasy.md.

## Offen (Folge-Slices, dokumentiert)
- **2.3** Heim/Auswärts + FDR über Club-UUID statt Short-String (`getPlayerMatchTimeline`/`FDRBadge`/`ClubFixturesStrip`).
- **2.4** Per-Liga-GW-Max-Routing, toten `GameweekSelector` löschen, GW-Score-Map Dedup-Log.
- Ranking-Konsolidierung scout_scores↔user_stats (Welle 2 Carry-over).
- **LOW (Review #2):** getProgressiveScores-Vorschau ohne Liga-Filter (Vorschau-vs-Final-Drift, nicht bindend) — boundLeagueId durchreichen.
- **INFO (Review #3):** AR-29 `no_player_game_stats`-Guard fehlt seit Slice 396 (kein 419-Regress) — separat verifizieren ob bewusst.

Nächstes: Welle 2.3/2.4 ODER Welle 3 (Events/Aufstellung).
