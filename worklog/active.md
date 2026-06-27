# Active Slice

```
status: idle
slice: 419
title: Welle 2.1+2.2 — player_gameweek_scores fixture-gebunden (Sorare-Pro) + score_event liga-bewusst — DONE
size: L (Schema-Migration + Writer-RPC + Money-Reader score_event + 3 Reader-Services + Cron-Guard + Form-Bar-RPC-Heal)
stage: LOG (DONE)
spec: worklog/specs/419-fixture-bound-scores.md
impact: in Spec (Reader-Karte via Explore) + Reviewer-Catch (rpc_get_recent_player_scores, live-only RPC)
proof: worklog/proofs/419-money-smoke.txt (force-rollback Zero-Sum + Invarianz 1721==1721 + Writer-Smoke + Fanout-Proof + tsc/249 Tests)
review: worklog/reviews/419-review.md (CONCERNS → 1 HIGH gefunden+geheilt in 419b → PASS)
```

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
