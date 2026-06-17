# Backend Journal: Backfill Historical Scoring (Multi-League Phase 1 Task 13)

## Gestartet: 2026-04-15

### Verstaendnis
- **Was:** Script `scripts/backfill-scoring-historical.mjs` fuer 6 Major Leagues (BL1, BL2, LL, PL, SA, SL).
- **Warum:** Cron `/api/cron/gameweek-sync` skippt historische GWs ("No fixtures past kickoff"), daher 0 `fixture_player_stats` + 0 `player_gameweek_scores` + perf_l5=50.0 fuer alle Major-League-Spieler.
- **Betroffene Tabellen:** `fixtures` (UPDATE), `fixture_player_stats` (INSERT), `player_gameweek_scores` (UPSERT), `players` (UPDATE via RPC).
- **Betroffene Services:** KEINE — ist ein One-Shot-Script.
- **Risiken:**
  - API-Football Rate-Limit 7.500/Tag → mein Budget ~3.464 Calls (46%).
  - Name-Match schlaegt fehl → unmatched Spieler. Mitigiert durch Bridge-Strategien (api_football_id + shirt-number + name).
  - RPC Schema-Drift: `player_gameweek_scores` hat KEIN `fixture_id` (nur `player_id + gameweek`). → Unique-Key ist `(player_id, gameweek)`.
  - perf_l5-Skala 0-100 (direkt via `ROUND(rating*10)`), NICHT `/1.5` wie im Briefing.

### Pre-Flight-Findings (VERIFIED 2026-04-15)
- **player_gameweek_scores** Schema: `(id, player_id, score, created_at, gameweek)` — UNIQUE auf `(player_id, gameweek)`.
- **fixture_player_stats** Schema: 20 Spalten inkl. `rating` (NUMERIC), `fantasy_points` (0-100 INT), `match_position`, `is_starter`, `grid_position`, `api_football_player_id`.
- **RPC `cron_process_gameweek(p_gameweek, p_fixture_results, p_player_stats)`** — idempotent, updates fixtures + inserts fps + upserts pgw. Live-Body bestaetigt in `_rpc_body_snapshots`.
  - Formel: `score = CASE WHEN rating IS NOT NULL THEN ROUND(rating*10) ELSE ROUND(fantasy_points*5) END` clamped 0-100.
- **RPC `cron_recalc_perf()`** — berechnet perf_l5/perf_l15/perf_season + Aggregat-Stats (goals, assists, minutes etc.) aus pgw_scores + fps. Skala 0-100 (KEIN `/1.5`).
- **Finished Fixtures:** BL1=261, BL2=261, LL=310, PL=319, SA=320, SL=261 → **1732 total**.
- **GW-Struktur:** Fast alle GWs allFin (ausser PL GW31=partial). Saison 2025.

### Strategie
1. Pro Liga → GW-Gruppierung (allFin-GWs) → pro GW:
   - Load DB Fixtures (finished, gameweek=N, league=X) + club/player mappings
   - Parallel API-Calls pro Fixture: `/fixtures/lineups`, `/fixtures/players`, `/fixtures/events`
   - Build `fixtureResults[]` + `playerStats[]` (gleiche Struktur wie Cron)
   - RPC `cron_process_gameweek(gw, fixtureResults, playerStats)`
2. Nach ALLEN Ligen: RPC `cron_recalc_perf()` einmal
3. Rollback-File pre-written mit Snapshot

### Entscheidungen
| # | Entscheidung | Warum |
|---|---|---|
| 1 | RPC nutzen statt direktes INSERT | Live-RPC ist bereits paranoid + idempotent. Geht mit Cron-Logik einheitlich. |
| 2 | `cron_recalc_perf` am Ende aufrufen (NICHT pro Liga) | Perf-Calculation ist global; 1 Call updates alle Players. |
| 3 | Name-Match-Logic aus Cron-Route duplizieren (normalize + shirt-bridge) | Produktion-proven. Reduziert unmatched-Rate. |
| 4 | 150ms Sleep + Exp-Backoff auf 429 | Pro-Plan 10 req/sec, safe margin. |
| 5 | Rollback = pre-migration snapshot pro pgw_scores-betroffenem Player | Geht nur via bestaetigte IDs. Beim ersten Run leer → minimaler File. |
| 6 | Skip Task13-pgw_scores-Delete (RPC macht es selbst fuer fixture_player_stats) | Idempotent — re-run ueberschreibt pgw_scores via ON CONFLICT UPDATE. |

### Fortschritt
- [x] Pre-Flight Schema + Counts + GW-Distribution
- [x] RPC-Body verified (cron_process_gameweek + cron_recalc_perf)
- [ ] Script implementieren
- [ ] Dry-Run verifizieren
- [ ] Live-Run pro Liga
- [ ] Post-Verify (pgw_scores + perf_l5 per league)
- [ ] Commit

### Runden-Log
- R1: Pre-Flight done, Schema+RPCs identifiziert, keine Schema-Aenderung noetig.
