# Backend Journal: Slice 195d Bench + Auto-Sub

## Gestartet: 2026-04-25

### Verstaendnis
- Was: lineups bekommt 4 Bench-Slots + bench_order. rpc_save_lineup validiert Bench. score_event macht Position-konformen Auto-Sub bei No-Show.
- Betroffene Tabellen: `lineups` (5 neue Columns), `events` (read), `players` (read), `holdings` (read), `fixture_player_stats` (read), `player_gameweek_scores` (read), `chip_usages` (read), `equipment_ranks`/`user_equipment` (read), `wallets` (write), `transactions` (write).
- Betroffene RPCs: `save_lineup` (DROP + CREATE neu, Wrapper), `rpc_save_lineup` (CREATE OR REPLACE, Source = 195c-Body + Bench-Branch), `score_event` (CREATE OR REPLACE, Source = 195b-Body + Auto-Sub-Block).
- Risiken:
  - Polymorphie-Ambiguitaet save_lineup wenn alte Signatur bestehen bleibt → DROP explicit
  - REVOKE/GRANT renew nach CREATE OR REPLACE (AR-44)
  - PL/pgSQL NULL-Scalar-Subquery in IF (Skill HIGH-Bug)
  - rpc_save_lineup INSERT/UPDATE muss neue bench_*-Spalten schreiben sonst NULL-overwrite
  - Captain-Bonus muss auf SUB-Score wirken bei Auto-Sub (FPL-Standard)
  - bench_order Permutation [1,2,3] CHECK constraint
  - Holdings-Check fuer Bench (kein lock — Bench ist Insurance, kein SC-Cost laut Briefing)
  - score_event use von ANY(slot_players || ARRAY[bench_gk, bench_o1..o3]) — funktioniert nur wenn Array-Konkatenation richtig (UUID[] || UUID[] OK, einzelne UUIDs muessen via ARRAY[...] gewrappt werden)

### Entscheidungen
| # | Entscheidung | Warum |
|---|--------------|-------|
| 1 | Bench-Schema: explizit `bench_gk`, `bench_o1..o3`, `bench_order INT[]` | Briefing A; GK-Position-Match hart enforced; klarere Validation |
| 2 | bench_order DEFAULT `ARRAY[1,2,3]` NOT NULL | Permutation, kein NULL noetig |
| 3 | CHECK: array_length=3 + 1=ANY + 2=ANY + 3=ANY | Permutation enforced |
| 4 | Bench muss in Holdings sein, KEIN holding_lock | Briefing B — Bench ist Insurance |
| 5 | Bench-UUIDs unique untereinander UND nicht in Starter-11 | Logik-Constraint |
| 6 | DROP alte save_lineup Signatur explicit | Polymorphie-Ambiguitaet vermeiden (Skill Money-RPC-Idempotency-Blueprint Hinweis) |
| 7 | Wrapper save_lineup neue Signatur 21 args | Briefing C |
| 8 | Auto-Sub-Source-of-Truth: SUM(minutes_played) per player_id | Briefing — pgs.score=0 bei minutes_played=0 NICHT als played zaehlen |
| 9 | Auto-Sub: pre-loop v_played JSONB built via single query, JOIN fixtures | O(1) Lookup im Slot-Loop, vermeidet N+1 |
| 10 | Captain-Bonus auf SUB-Score | FPL-Standard, Briefing E |
| 11 | v_used_bench UUID[] tracking | verhindert Doppel-Sub |
| 12 | NICE-TO-HAVE auto_subs JSONB skipped | Sub-Info ist in slot_scores rekonstruierbar; weniger Risk |
| 13 | Position-Match strict (DEF→DEF, MID→MID, ATT→ATT) | Briefing E + AC 5 |

### Fortschritt
- [x] Skill + LEARNINGS gelesen
- [x] errors-db.md + database.md gelesen
- [x] 195b/195c Source-of-truth gelesen
- [x] Live DB State verifiziert (lineups schema, save_lineup wrapper, score_event body)
- [x] Migration File schreiben
- [x] Apply via mcp__supabase__apply_migration
- [x] Verify pg_get_functiondef
- [x] DbLineup Type erweitern
- [x] tsc clean
- [x] vitest auf db-invariants.test.ts

### Runden-Log

**Runde 1 (2026-04-25):**
- Source-of-truth aller 3 RPCs gelesen (195c rpc_save_lineup, 195b score_event, live save_lineup wrapper).
- Live-DB-Schema verifiziert (28 Cols, kein bench_*).
- Live-RPC-Bodies verifiziert (rpc_save_lineup hat max_per_club, score_event hat captain_boost).
- Migration `20260425170000_slice_195d_bench_autosub.sql` (969 Zeilen) geschrieben:
  - ALTER TABLE lineups ADD bench_gk + bench_o1/o2/o3 + bench_order INT[] DEFAULT [1,2,3]
  - CHECK constraint lineups_bench_order_perm_chk (Permutation [1,2,3])
  - 5 COMMENT ON COLUMN
  - DROP alte save_lineup(uuid,text,text,text[],...16 args)
  - CREATE OR REPLACE save_lineup mit 21 args (Wrapper + auth.uid())
  - CREATE OR REPLACE rpc_save_lineup mit 22 args (incl bench_*) — Body = 195c + Bench-Validation:
    - bench_order Permutation re-check (defensive)
    - bench_gk Position='GK' guard
    - bench_o1/2/3 Position IN ('DEF','MID','ATT') guard
    - Uniqueness untereinander + nicht in Starter-11
    - Holdings >=1 (KEIN holding_lock — Bench ist Insurance)
    - INSERT/UPDATE schreiben bench_* Spalten
  - CREATE OR REPLACE score_event — Body = 195b + Auto-Sub-Block:
    - Pre-loop v_played JSONB Map (single query, JOIN fixtures)
    - Slot-Loop: wenn v_starter_minutes <= 0, try Auto-Sub
      - GK-Slot: bench_gk wenn played
      - Outfield: bench_o[bench_order[i]] mit Position-Match (DEF/MID/ATT)
      - v_used_bench tracking gegen Doppel-Sub
    - Captain-Bonus wirkt auf SUB-Score (FPL-Standard)
    - No-Show ohne Sub: 0 Pkt (NICHT 40 Default)
  - AR-44 REVOKE/GRANT-Block fuer alle 3 RPCs

**Self-Correction 1:** Inner FOR-Loop ueberschreibt outer `v_i` — Fix: separate Variable `v_bench_loop`.

**Self-Correction 2:** v_starter_minutes / v_starter_pos / v_sub_* werden zwischen Slot-Iterationen nicht resettet — Fix: explicit reset am Loop-Top.

**Verify:**
- `npx tsc --noEmit` → EXIT=0
- `npx vitest run src/lib/__tests__/db-invariants.test.ts` → 37/39 passed. 2 Fails (INV-16, INV-33) sind PRE-existing wallet-drift bugs, nicht durch Slice 195d (verifiziert via git stash).
- `pg_get_functiondef` Verification: APPLY-PENDING (CTO muss via mcp__supabase__apply_migration ausfuehren — Worktree-Agent hat keinen MCP-Zugriff).

### Status: APPLY-PENDING

Migration-File ready. Bench-Validation + Auto-Sub vollstaendig. Tests laufen post-Apply (Test-Writer hat lineup-auto-sub.test.ts + lineup-bench-validation.test.ts geschrieben — laufen gegen DB).

CTO muss:
1. `mcp__supabase__apply_migration` mit Inhalt von `supabase/migrations/20260425170000_slice_195d_bench_autosub.sql` (project_id: skzjfhvgccaeplydsunz, name: `slice_195d_bench_autosub`).
2. Verify: `SELECT bench_gk, bench_o1, bench_o2, bench_o3, bench_order FROM lineups LIMIT 1` → no error.
3. Verify: `\df save_lineup` → genau 1 Signatur (21 args).
4. Verify: `pg_get_functiondef('public.rpc_save_lineup'::regproc)::text ILIKE '%Slice 195d%'`.
5. Verify: `pg_get_functiondef('public.score_event'::regproc)::text ILIKE '%Slice 195d%'`.
6. Run vitest auf Test-Writer-Files: `lineup-auto-sub.test.ts` + `lineup-bench-validation.test.ts`.
