# Backend Journal: RPC Migrations Schnellbahn (AR-12/18/19/21/28/29)

## Gestartet: 2026-04-14

### Verstaendnis
- **Was:** 5 RPC-Migrations aus Journey #3 + #4 durchziehen
  1. AR-12 + AR-28: Full-Sweep Backfill 12 RPCs ohne Source
  2. AR-18: Circular-Trade-Guard Threshold >=2 (statt >0)
  3. AR-19: 1-SC-Limit in buy_player_sc entfernen
  4. AR-21: get_price_cap ohne 100k-Fallback
  5. AR-29: pgs_count=0 Guard im Scoring-RPC

- **Betroffene RPCs (J3):** accept_offer, cancel_order, liquidate_player, create_offer, counter_offer, cancel_offer_rpc, reject_offer, buy_from_order, buy_player_sc, get_price_cap
- **Betroffene RPCs (J4):** save_lineup, cron_process_gameweek, reset_event, resolve_gameweek_predictions, calculate_sc_of_week + Scoring-RPC
- **Zero Overlap** mit anderen 2 Agents (RLS, Flags)

### Risiken
- AR-12/28: CREATE OR REPLACE NO-OP nur wenn Body 1:1 zu live ist — Signature-Preservation PFLICHT
- AR-19: Fee-Loop muss fuer quantity>1 korrekt durchlaufen (v_total_cost := price * qty)
- AR-21: Migration darf Live-Listings nicht breaken (pruefen: was passiert wenn price_cap=NULL zurueckgibt?)
- AR-29: Welcher RPC scored? `resolve_gameweek_predictions` oder `calculate_sc_of_week`?

### Entscheidungen
| # | Entscheidung | Warum |
|---|-------------|-------|
| 1 | 5 separate Commits | Rollback-Sicherheit pro Feature |
| 2 | pg_get_functiondef ZUERST fuer ALLE RPCs | Base vor CREATE OR REPLACE = korrekte Signature |
| 3 | AR-12 + AR-28 in EINE Migration (Backfill ist gleicher Pattern, 12 RPCs in 1 File) | Logische Gruppe, 1 Migration 20260414201000 |
| 4 | Reihenfolge: AR-12+28 first (backfill baseline), dann AR-18, 19, 21, 29 | Backfill muss existierende Bodies spiegeln bevor Edits |

### Fortschritt
- [ ] Step 1: pg_get_functiondef fuer 12 RPCs sammeln
- [ ] Step 2: Migration 20260414201000 AR-12+28 Backfill schreiben
- [ ] Step 3: Apply + Verify
- [ ] Step 4: AR-18 Circular-Guard
- [ ] Step 5: AR-19 1-SC-Limit
- [ ] Step 6: AR-21 price_cap Fallback
- [ ] Step 7: AR-29 pgs_count Guard
- [ ] Step 8: tsc clean + Supply-Invariant-Check

### Runden-Log

**Runde 1 (Step 1 — Body-Dump fuer 12 RPCs):**
- **FAIL:** mcp__supabase__execute_sql ist mir nicht als Tool verfuegbar. Supabase CLI braucht DB-Password (nicht in .env.local).
- **Root Cause:** Der CTO-Orchestrator hat das Tool, ich als Worktree-Agent nicht. Wie bereits in existenten Migrations (20260411130000_accept_offer_null_guard_fix.sql) — der Migration-File ist nur ein Kommentar-Stub, der tatsaechliche Body liegt remote.

**Strategische Entscheidung:**
Ich nutze das **DPC-Sanitize-Pattern** aus 20260414150000 (DO-Block der pg_get_functiondef live liest). Der Trick: ich mache die Migration-Datei als **"Self-Documenting Extract + Replay"**:
1. DO-Block liest pg_get_functiondef live aus pg_proc
2. Schreibt in `_rpc_body_snapshots` Helper-Table (neu, fuer DR)
3. RAISE NOTICE mit jedem Body (logs zeigen im apply_migration output)
4. CREATE OR REPLACE FUNCTION mit aus Logs extrahiertem Body wird in FOLGENDER Migration committed

Aber das loest das Kernproblem NICHT — Source im Repo. Pragmatisch:
- **AR-12/28 MIGRATION:** Schreibt `_rpc_body_snapshots` Tabelle + DO-Block-Dump. File committed = Source existiert im Repo via Snapshot-Query. CTO kann nach Apply via `SELECT body FROM _rpc_body_snapshots` die Bodies extrahieren und als Static SQL nach-committen.
- AR-18/19/21/29 = direkte CREATE OR REPLACE mit Bodies aus bestehenden Repo-Files.

**Re-Prioritization:**
1. AR-18 (haben Body in Repo, einfachster Fix) → erst
2. AR-19 (haben Body, Guard weg) → zweit
3. AR-21 (haben Body, Fallback-Edit) → dritt
4. AR-29 (haben Body, Guard einbauen) → viert
5. AR-12/28 (Snapshot-Table Migration) → letzt
