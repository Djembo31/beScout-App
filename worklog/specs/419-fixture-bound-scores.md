# Slice 419 — player_gameweek_scores fixture-gebunden (Sorare-Pro) + score_event liga-bewusst

**Slice-Type:** Migration (+ Service + RPC-Money)
**Größe:** L (Schema-Migration mit UNIQUE-Flip + Writer-RPC + Money-Reader `score_event` + 3 Reader-Services + Cron-Guard)
**Domäne:** Welle 2 Spieltag/Scoring [Money/CEO, Datenmodell] (Mock→Pro)
**CEO-Scope:** JA — Datenmodell-Gabelung. Anil-Entscheid 2026-06-27: **Option A Fixture-bound (Sorare-Pro)**.

---

## 1. Problem-Statement (Evidence)

Ein Spieler-Score hängt strukturell nur an einer **GW-Nummer**, nicht am konkreten Spiel.

**Live-Evidenz (D87, 2026-06-27):**
- `player_gameweek_scores`: `UNIQUE (player_id, gameweek)`, **kein `fixture_id`**. 61.462 Zeilen, 3.982 Spieler, GW 1-37, 0 Dup.
- GW-Nummern sind über **alle 7 Ligen geteilt** (Süper Lig/TFF1/La Liga = 1..34; BL/2.BL/PL/Serie A = 1..38). „GW12" ist ligaübergreifend mehrdeutig.
- Writer `sync_fixture_scores` (live): liest aus `fixture_player_stats` (fixture-gebunden via `fps.fixture_id`), kollabiert aber per `ON CONFLICT (player_id, gameweek) DO UPDATE` → Spiel-Info geht verloren, Last-Write-Wins.
- Kollision real, nicht theoretisch: **40** (player,gw)-Paare mit 2+ Fixtures (`status IN simulated/finished`), davon **31 cross-league**. (1 Ausreißer 61 Fixtures/GW → Mock-Müll, im Slice mit-untersuchen.)
- Money-Reader `score_event` (live): (a) Minuten-Join `WHERE f.gameweek = v_event.gameweek` **ohne Liga-Filter** → Cross-Liga-Minuten-Summe. (b) Score-Lookup `WHERE player_id=X AND gameweek=Y SELECT INTO` — nach UNIQUE-Flip mehrdeutig → nicht-deterministisch am Geld-Pfad.

Mandat Anil (Mock→Pro): Datenmodell-Integrität, Sorare-Niveau. Plan-Item `mock2pro-plan.md` **2.1 + 2.2**.

## 2. Lösungs-Design

1. **Schema:** `player_gameweek_scores` + `fixture_id uuid REFERENCES fixtures(id)` + `league_id uuid REFERENCES leagues(id)` (denormalisiert, für liga-gefilterte Reads ohne Join). Backfill beide aus `fixture_player_stats JOIN fixtures`. UNIQUE `(player_id, gameweek)` DROP → `(player_id, fixture_id)`. `gameweek` + `league_id` bleiben für schnelle Reader-Filter.
2. **Writer `sync_fixture_scores`:** Insert pro (player, fixture): zusätzliche Spalten füllen, `ON CONFLICT (player_id, fixture_id) DO UPDATE`. Kein Kollaps mehr.
3. **Money-Reader `score_event`:** Event-Liga **einmal** auflösen `v_event_league := COALESCE(v_event.league_id, (SELECT league_id FROM clubs WHERE id=v_event.club_id))`. (a) Minuten-Join + (b) Score-Lookup um `AND (v_event_league IS NULL OR pgs.league_id = v_event_league)` erweitern; Score-Lookup wird `SUM(score)` (Mehrfachspiel innerhalb Liga deterministisch addieren; 99,9% = 1 Zeile = unverändert). Auto-Sub-/Captain-/Equipment-/Synergy-/Reward-Logik **byte-identisch** (PATCH-AUDIT).
4. **Reader-Services:** auf mögliche Mehrzeilen/(player,gw) robust (aggregieren statt 1-Zeile-Annahme).
5. **Cron-Guard:** Coverage-COUNT zählt jetzt Zeilen ≠ Spieler — auf DISTINCT player_id umstellen falls Schwelle spieler-gemeint.

**Migrations-Sicherheit:** Additiv-zuerst innerhalb EINER Transaktion: ADD COLUMNS (nullable) → Backfill → NOT-NULL/UNIQUE-Flip → Writer+Reader gleichzeitig deployen. UNIQUE-Flip und Reader-Umstellung MÜSSEN zusammen, sonst brechen Reader.

## 3. Betroffene Files

| File | Änderung |
|------|----------|
| Migration `supabase/migrations/2026XXXX_419_fixture_bound_scores.sql` | ADD COLUMNS + Backfill + UNIQUE-Flip + Writer + score_event CREATE OR REPLACE |
| (live RPC) `sync_fixture_scores` | rewrite per-fixture |
| (live RPC) `score_event` | Liga-Auflösung + 2 liga-gefilterte Reads, Rest byte-identisch |
| `src/features/fantasy/services/scoring.queries.ts` | getPlayerGameweekScores (38), getPlayerMatchTimeline (159-169 GW-Map-Bug), getProgressiveScores (233) — Mehrzeilen-robust |
| `src/app/api/cron/gameweek-sync/route.ts` | Coverage-Guard (1489-1500) DISTINCT-player |
| `src/types/*` | falls Row-Type pgs erweitert (fixture_id/league_id) |

## 4. Code-Reading-Liste (Pflicht VOR Implementation) — ≥10

1. **`pg_get_functiondef('sync_fixture_scores')`** — ✅ live gezogen (D87). Insert-Pattern + ON CONFLICT bekannt.
2. **`pg_get_functiondef('score_event')`** — ✅ live gezogen (D87). Minuten-Join (v_played), Score-Lookup, Auto-Sub, perf_l5/l15-Recompute, User-Event-Settlement, Reward-Loop, book_platform_treasury identifiziert.
3. **pgs Schema + Constraints + Indexe** — ✅ live (UNIQUE player,gameweek; idx_pgs_gameweek; idx_pgs_player_gameweek).
4. **`fixtures` Schema** — ✅ live (hat league_id nullable, gameweek, home/away_club_id, status).
5. **`fixture_player_stats`** — Backfill-Quelle: Spalten player_id/fixture_id/minutes_played/rating/fantasy_points prüfen (fixture_id nie NULL ✅).
6. **`scoring.queries.ts:103-203` getPlayerMatchTimeline** — der GW-Map-Bug (Score per gameweek statt fixture gemappt). Jetzt fixture-exakt mappbar.
7. **`scoring.queries.ts:226-243` getProgressiveScores** — `.eq('gameweek')` → liefert nach Flip mehrere Zeilen/Spieler; muss aggregieren (welche Semantik: Liga-Kontext? Lineup-Builder ist event-/liga-gebunden).
8. **`scoring.queries.ts:30-45` getPlayerGameweekScores** — Player-Detail-Historie; `.order('gameweek')` → Mehrzeilen pro GW möglich, aggregieren oder pro-Fixture zeigen (CEO-UX, Scope-Out-Kandidat).
9. **`route.ts:1489-1500` Coverage-Guard** — COUNT(pgs WHERE gameweek=activeGw) < 50 blockt; nach Flip Zeilen>Spieler → DISTINCT player_id.
10. **`clubs` league_id** — Event-Liga-Auflösung; Abdeckung club_id 208/210, league_id 1/210 → COALESCE.
11. **`leagues` Tabelle** — FK-Ziel für pgs.league_id; existiert (max_gameweeks pro Liga).
12. **`useLineupBuilder.ts:451` getProgressiveScores(event.gameweek!)** — Aufrufer; braucht der Builder Liga-Kontext? (event.boundLeagueId / club.league_id).

## 5. Pattern-References

- **D87** Live-`pg_get_functiondef` VOR Spec (Money-RPC) — erfüllt.
- **§3** Money/Trading/Security = selbst, nicht delegieren. Build = selbst.
- **PATCH-AUDIT (S156)** — score_event ist groß; nur Liga-Filter-Zeilen + Score-SUM ändern, alle Guards/Reward/Treasury/Auto-Sub byte-identisch; md5-Vergleich der unveränderten Blöcke.
- **errors-db S383/S406** — `book_platform_treasury` hat keinen Negativ-Guard; hier nicht berührt (kein neuer Geld-Pfad), aber Reward-Loop unverändert lassen.
- **reference_migration_workflow** — NIE `supabase db push`, nur `mcp__supabase__apply_migration`.
- **Slice 382** — events.league_id existiert (boundLeagueId), aber praktisch ungesetzt → club-Fallback.
- **Zero-Sum-Pflicht** Money-Wellen: score_event verteilt Rewards; Beweis dass Reward-Summe/Treasury-Buchung UNVERÄNDERT zur Baseline für nicht-kollidierende Daten.

## 6. Acceptance Criteria (executable)

1. **AC1 Schema:** `\d player_gameweek_scores` zeigt fixture_id (FK fixtures), league_id (FK leagues), UNIQUE(player_id, fixture_id); alte UNIQUE(player_id,gameweek) weg. VERIFY: information_schema-Query.
2. **AC2 Backfill vollständig:** 0 Zeilen mit fixture_id IS NULL ODER league_id IS NULL nach Migration. VERIFY: `SELECT COUNT(*) FROM pgs WHERE fixture_id IS NULL OR league_id IS NULL` = 0.
3. **AC3 Score-Invarianz (nicht-kollidierende Spieler):** Für jeden Spieler ohne GW-Kollision ist `SUM(score) per (player, gameweek, league)` identisch zur Baseline (vor Migration gespeicherter Snapshot). VERIFY: Snapshot-Diff = 0 Zeilen Abweichung außer den 40 Kollisions-Spielern.
4. **AC4 Writer per-fixture:** `sync_fixture_scores(gw)` für eine GW mit Kollision schreibt N Zeilen (eine pro fixture), kein „cannot affect row a second time"-Error mehr. VERIFY: force-rollback Smoke auf Kollisions-GW.
5. **AC5 score_event liga-gefiltert:** Minuten-Join + Score-Lookup nutzen v_event_league; ein Test-Lineup mit Kollisions-Spieler bekommt nur den Liga-Score, nicht die Cross-Liga-Summe. VERIFY: force-rollback Smoke, Vergleich score vs erwarteter Liga-Score.
6. **AC6 score_event Reward-Invarianz (Zero-Sum):** Für ein reales, nicht-kollidierendes Event ist total_score, slot_scores, reward_amount, Treasury-Buchung **identisch** zur Baseline (CREATE-OR-REPLACE darf Nicht-Kollisions-Verhalten nicht ändern). VERIFY: force-rollback gegen ein geseedetes Event, Diff = 0.
7. **AC7 PATCH-AUDIT:** Alle score_event-Blöcke außer Liga-Auflösung + 2 Reads byte-/logik-identisch (Auto-Sub, Captain 1.1/1.25, Equipment, Synergy, Streak, Reward-FLOOR, User-Event-Settlement, perf_l5/l15). VERIFY: Diff der Funktions-Bodies zeigt nur erwartete Zeilen.
8. **AC8 Reader-Services:** getProgressiveScores/getPlayerGameweekScores/getPlayerMatchTimeline liefern bei Mehrzeilen/(player,gw) deterministisch (aggregiert/liga-kontext), kein doppelter Score in UI. VERIFY: vitest + ggf. Live-Walk.
9. **AC9 Cron-Guard:** Coverage-Schwelle zählt DISTINCT player_id. VERIFY: Code-Read + Logik.
10. **AC10 tsc + vitest grün** (Voraussetzung). VERIFY: `pnpm exec tsc --noEmit` + `CI=true pnpm exec vitest run`.
11. **AC11 ACL/RLS unverändert:** sync_fixture_scores + score_event Grants identisch (authenticated/service_role, kein anon). VERIFY: pg_proc acl Diff.

## 7. Edge Cases — ≥10

| # | Edge | Verhalten |
|---|------|-----------|
| 1 | Spieler 2 Fixtures, **gleiche Liga**, gleiche GW (Doppelspiel/Mock-Müll) | Writer: 2 Zeilen. score_event: SUM beider. Dokumentiert. |
| 2 | Spieler 2 Fixtures **cross-league**, gleiche GW (31 Fälle) | 2 Zeilen mit unterschiedl. league_id. score_event filtert auf Event-Liga → nur die passende. |
| 3 | Event ohne club_id UND ohne league_id (2 Events) | v_event_league = NULL → Score-Lookup liga-offen (gameweek-only, alte Semantik) — kein Bruch. |
| 4 | Score-Zeile existiert, Spieler aber 0 Minuten (Auto-Sub-Pfad) | unverändert: starter_minutes<=0 → v_gw_score=0 vor Liga-Read. Liga-Filter ändert nichts. |
| 5 | Backfill: pgs-Zeile ohne passendes fixture_player_stats (orphan score) | fixture_id bliebe NULL → Migration MUSS fail-closed: orphan-Zeilen vor UNIQUE-Flip behandeln (löschen ODER abbrechen + Bericht). Pre-Migration-Count Pflicht. |
| 6 | Mehrere fps-Zeilen pro (player, fixture) | Backfill braucht DISTINCT/Aggregat auf fixture-Ebene (= wie Writer rating aggregiert). |
| 7 | 61-Fixtures-Ausreißer-Spieler | Mock-Müll: nach Flip 61 Zeilen — prüfen ob es ein echter player_id oder Platzhalter ist; ggf. S7-Daten-Punkt, kein Blocker. |
| 8 | score_event SELECT INTO → SUM: alle Zeilen NULL? | SUM(NULL)=NULL → bestehender `v_gw_score IS NULL → 40`-Default greift (unverändert). |
| 9 | getProgressiveScores im Lineup-Builder ohne Liga-Kontext | event.gameweek bekannt, Liga via club/boundLeague; falls nicht auflösbar → aggregieren (MAX/SUM) + Note. |
| 10 | Fixture-Status wechselt simulated→finished nach erstem Sync | ON CONFLICT (player,fixture) DO UPDATE → re-sync aktualisiert Score derselben Zeile. |
| 11 | perf_l5/l15 Recompute (score_event Ende) mit Mehrzeilen/GW | ROW_NUMBER PARTITION BY player ORDER BY gameweek DESC zählt jetzt Zeilen; „letzte 5" driftet bei Mehrfachspiel. Prüfen: ggf. DISTINCT gameweek oder akzeptieren (Mock-Rand). |
| 12 | leagues-FK: pgs.league_id auf gelöschte Liga | Ligen sind statisch (7), kein Delete-Pfad → FK safe. |

## 8. Self-Verification Commands

```sql
-- AC1
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
 WHERE conrelid='public.player_gameweek_scores'::regclass;
-- AC2
SELECT COUNT(*) FROM player_gameweek_scores WHERE fixture_id IS NULL OR league_id IS NULL;
-- AC3 Baseline-Snapshot VOR Migration:
CREATE TEMP TABLE pgs_base AS SELECT player_id, gameweek, score FROM player_gameweek_scores;
-- nach Migration Diff gegen SUM per (player,gameweek,league)
-- AC5/AC6 force-rollback score_event Smoke gegen geseedetes Event (BEGIN…ROLLBACK)
-- AC7 PATCH-AUDIT
SELECT md5(pg_get_functiondef('score_event'::regproc));  -- vor/nach blockweise vergleichen
```
```bash
pnpm exec tsc --noEmit
CI=true pnpm exec vitest run src/features/fantasy
```

## 9. Open-Questions

- **Pflicht-Klärung (CEO, erledigt):** Score-Bindung = Option A Fixture-bound ✅.
- **CTO-Autonom (in Spec entschieden):** (a) Mehrfachspiel = **SUM** (deterministisch, 99,9%=1 Zeile). (b) league_id **denormalisiert** auf pgs (Read-Performance, kein Join im Money-Pfad). (c) Migration **additiv-in-Transaktion** mit Backfill-fail-closed. — Falls Anil SUM↔MAX anders will: 1-Zeilen-Change, im Reviewer-Gate ansprechbar.
- **Offen für Build-Entscheid:** orphan-pgs-Zeilen ohne fps-Match (Edge #5) — Pre-Migration-Count entscheidet löschen vs. abbrechen.

## 10. Proof-Plan

1. `worklog/proofs/419-schema.txt` — AC1/AC2 Constraint + NULL-Count.
2. `worklog/proofs/419-score-invariance.txt` — AC3 Baseline-Diff (nur 40 Kollisions-Spieler weichen ab).
3. `worklog/proofs/419-money-smoke.txt` — AC4/AC5/AC6 force-rollback (Writer per-fixture, score_event liga-gefiltert, Reward-Invarianz Zero-Sum).
4. `worklog/proofs/419-patch-audit.txt` — AC7 Block-Diff score_event.
5. `worklog/proofs/419-tests.txt` — AC10 vitest.

## 11. Scope-Out

- 2.3 (Heim/Auswärts + FDR über Club-UUID statt Short-String) — eigener Folge-Slice.
- 2.4 (Per-Liga-GW-Max-Routing, GameweekSelector löschen, GW-Score-Map Dedup-Log) — eigener Folge-Slice.
- Ranking-Konsolidierung scout_scores↔user_stats — eigener Welle-2-Slice.
- getPlayerGameweekScores Player-Detail-UX „pro Spiel zeigen" — optional, falls Aggregat reicht bleibt es Aggregat.
- 61-Fixtures-Mock-Müll-Bereinigung — S7/Launch-Reset-Daten-Punkt.

## 12. Stage-Chain (geplant)

SPEC ✅ → IMPACT (in Spec, Reader-Karte via Explore) → BUILD (selbst, §3) → REVIEW (Reviewer-Agent Pflicht, Money) → PROVE (5 Proofs) → LOG (errors-db + fantasy.md + treasury-Kopplung-Check).

## 13. Pre-Mortem (≥5)

1. **UNIQUE-Flip bricht Live-Reader vor Deploy:** Migration flippt UNIQUE, aber Reader-Service-Deploy hängt nach → Player-Detail zeigt doppelte GW-Scores. **Mitigation:** Migration + Service-Edits + RPC im SELBEN Slice/Commit; nach apply_migration sofort Reader-Verify.
2. **Backfill orphan-Zeilen:** pgs-Zeile ohne fps-Match → fixture_id NULL → UNIQUE-Flip/NOT-NULL schlägt fehl mitten in Transaktion. **Mitigation:** Pre-Count Edge #5; fail-closed mit explizitem Bericht, nicht blind NOT NULL.
3. **score_event Reward-Drift:** CREATE OR REPLACE verändert versehentlich einen Reward-/Treasury-Pfad → Geld-Bug. **Mitigation:** PATCH-AUDIT md5-Block-Diff (AC7) + force-rollback Reward-Invarianz gegen geseedetes Event (AC6).
4. **SUM verdoppelt Score bei Mock-Doppelspiel:** Same-league-Doppel (Edge #1) gibt Spieler doppelten Score → unfairer Reward. **Mitigation:** ist Mock-Müll (real 1 Spiel/GW); dokumentiert, im Live-Walk auf reale Daten geprüft; falls produktiv relevant → CEO-Folgeentscheid MAX statt SUM.
5. **perf_l5/l15 driftet** (Edge #11) durch Mehrzeilen → Spieler-Form falsch. **Mitigation:** prüfen ob DISTINCT gameweek nötig; betrifft nur Kollisions-Spieler (40), Rand-Effekt, ggf. eigener Fix.
6. **Registry-Drift:** sync_fixture_scores/score_event sind live-only — Migration als CREATE OR REPLACE gegen Live-Baseline (D87), nicht gegen veraltete Migrations-Datei.
7. **Cron-Guard false-block:** Coverage zählt Zeilen statt Spieler → Schwelle 50 zu leicht erreicht → Auto-Score läuft zu früh. **Mitigation:** DISTINCT player_id (AC9).
