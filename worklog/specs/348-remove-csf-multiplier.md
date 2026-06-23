# Slice 348 — `csf_multiplier` raus aus Fan-Rank

**Slice-Type:** Migration
**Größe:** M
**S-Slice:** false (Money-adjacent Schema-Change → CEO-Scope-nah, voller Loop)

---

## 1. Problem-Statement (mit Evidence)

`csf_multiplier` ist eine tote Mock-/Hybrid-Mechanik, die das Money-Modell verwässert. Belege:

- **Live `liquidate_player` (D87 `pg_get_functiondef`, 2026-06-23):** `formula_version = 'proportional_v3_2026_06_17'`. CSF-Auszahlung ist **rein proportional**: `v_sf_payout := FLOOR(v_total_sf_pool::NUMERIC * v_holder.quantity / v_total_dpcs)`. **Kein** Join auf `fan_rankings`, **kein** `csf_multiplier`, **kein** `LEAST(1.15,...)`-Deckel. → Die Spalte beeinflusst **kein** Geld.
- **Live DB-Scan:** Nur `calculate_fan_rank` referenziert `csf_multiplier` (pg_proc.prosrc). Keine View, kein Index, keine Constraint, kein Trigger, keine RLS-Policy auf `fan_rankings.csf_multiplier`.
- **Doku-Drift:** `docs/knowledge/domain/reward-ranking.md` W2-A behauptet noch „greift nur bei liquidate_player, gedeckelt 1,15×" — stale seit Slice 330.
- **Decisions:** D83/D93 — CSF rein proportional, Treue läuft über die Fan-Reward-Engine (Perks/Gating), nicht über einen CSF-Booster.

→ Ziel: `csf_multiplier` vollständig entfernen (Spalte + RPC-Variable + RPC-Return-Feld + alle TS-Reader + FAN_RANK_TIERS-Feld + Tests + Doku). „Entfernen", nicht „neutralisieren" (Anil-Wahl Track B).

## 2. Lösungs-Design

Zwei Wellen wegen Deploy-Ordering (D82 — `getFanRanking` ist gemountet, selektiert die Spalte live):

- **Wave 1 — TS/Frontend (deploy zuerst):** Alle `csf_multiplier`/`csfMultiplier`-Referenzen aus dem TS-Layer entfernen. Danach selektiert/liest kein Client-Code die Spalte oder das RPC-Return-Feld mehr. Push → Vercel-Deploy.
- **Wave 2 — DB-Migration (nach bestätigtem Deploy):** Eine Migration: (a) `CREATE OR REPLACE calculate_fan_rank` gegen **Live-Baseline** ohne `csf_multiplier` (Variable, CASE-Zuweisungen, INSERT-Spalte, ON-CONFLICT-Update, jsonb-Return-Feld raus — **alle anderen Patches 1:1 erhalten**: Event/DPC/Abo/Community/Streak-Gewichte, ELO-Boost, Follow +5, club-konfigurierbare Schwellen, Tier-CASE behält `rank_tier`); dann (b) `ALTER TABLE fan_rankings DROP COLUMN csf_multiplier`. Reihenfolge im File: REPLACE-Funktion zuerst (referenziert die Spalte dann nicht mehr), dann DROP COLUMN — eine Transaktion, sicher.

**Wichtig:** `rank_tier` bleibt unverändert — nur der Multiplier-Wert entfällt. Die 6 Tiers + Schwellen-Logik bleiben.

## 3. Betroffene Files

**Wave 1 (TS):**
- `src/lib/services/fanRanking.ts` — 2× `.select(...)` (Z21, Z37), Map Z50, `recalculateFanRank` Return-Type Z67 + Cast Z81 + Map Z94.
- `src/types/index.ts` — `DbFanRanking.csf_multiplier: number` (Z2075).
- `src/lib/fanRanking.ts` — `FanRankTierDef.csfMultiplier` (Z17) + 6× Tier-Objekte (Z25-30) + Header-Kommentar Z5.
- `src/lib/services/__tests__/fanRanking-v2.test.ts` — Mock Z86 + Expectation Z91.
- `src/lib/__tests__/db-invariants.test.ts` — Return-Shape-Map Z1024.

**Wave 2 (DB):**
- `supabase/migrations/<ts>_slice_348_remove_csf_multiplier.sql` (neu).

**LOG/Doku:**
- `docs/knowledge/domain/reward-ranking.md` — W2-A aktualisieren (Multiplier entfernt, nicht mehr „gedeckelt 1,15×").
- `docs/knowledge/domain/treasury.md` — falls csf_multiplier referenziert (prüfen).
- `worklog/active.md`, `worklog/log.md`, ggf. `memory/decisions.md` (D93-Notiz „erledigt").

## 4. Code-Reading-Liste (VOR Implementation) — erledigt während Investigation

1. **Live `pg_get_functiondef('calculate_fan_rank')`** ✅ (D87) — Baseline für RPC-Rewrite. Enthält: Score-Komponenten, ELO-Boost, Follow +5, club-konfigurierbare Schwellen, Tier-CASE mit `v_csf_multiplier`.
2. **Live `pg_get_functiondef('liquidate_player')`** ✅ — bestätigt: liest `csf_multiplier` NICHT, rein proportional. → Money-Effekt = 0.
3. **DB-Scan Funktionen/Views/Indexe/Constraints/Trigger** ✅ — nur `calculate_fan_rank`, sonst nichts.
4. `src/lib/services/fanRanking.ts` ✅ — alle Reader identifiziert.
5. `src/types/index.ts:2075` ✅ — `DbFanRanking`.
6. `src/lib/fanRanking.ts` ✅ — `FAN_RANK_TIERS` + `FanRankTierDef`; kein UI liest `.csfMultiplier` (grep bestätigt).
7. Consumer-Grep `getFanRanking`/`getClubFanLeaderboard`/`DbFanRanking` ✅ — `FanRankOverview` liest nur score-Felder, nicht csf_multiplier.
8. `docs/knowledge/domain/reward-ranking.md` W2-A ✅ — stale, muss mit.

## 5. Pattern-References

- **D87** Live-functiondef-First bei RPC-Touch (befolgt).
- **errors-db.md „CREATE OR REPLACE FUNCTION — PATCH-AUDIT PFLICHT" (Slice 156/345):** `calculate_fan_rank`-Body lebt NUR live; `20260330_streak_benefits_rpcs.sql` ist stale → NIE als Baseline. Live-Read ist Wahrheit.
- **database.md Migration-Template-Pflicht (AR-44):** CREATE OR REPLACE resettet Privilegien → REVOKE FROM PUBLIC/anon + GRANT TO authenticated am Migration-Ende.
- **D82 DROP-Sequenz:** Reader umstellen → Deploy → DROP. Wave-1-vor-Wave-2 setzt das um.
- **errors-db.md Migration-Workflow:** `mcp__supabase__apply_migration`, NIE `db push`.

## 6. Acceptance Criteria (executable)

- **AC1** Live `pg_get_functiondef('calculate_fan_rank')` enthält **kein** `csf_multiplier` mehr (`ILIKE '%csf_multiplier%'` = false) UND enthält weiterhin: `+ 5` (Follow), `fn_get_streak_elo_boost`, `club_fan_rank_thresholds`, `rank_tier` (alle Patches erhalten). VERIFY: SQL.
- **AC2** `information_schema.columns` hat **keine** Zeile `fan_rankings.csf_multiplier` mehr. VERIFY: SQL.
- **AC3** `calculate_fan_rank` läuft fehlerfrei für einen echten (user,club) und gibt `rank_tier` + `total_score` korrekt zurück (Return-JSONB ohne `csf_multiplier`-Key). VERIFY: `BEGIN; SELECT calculate_fan_rank(...); ROLLBACK;` (Live-Smoke, mutierend → Transaktion).
- **AC4** `liquidate_player` unverändert (Migration fasst es nicht an). VERIFY: `formula_version` bleibt `proportional_v3_2026_06_17`.
- **AC5** `grep -rn "csf_multiplier\|csfMultiplier" src/` = 0 Treffer. VERIFY: grep.
- **AC6** `pnpm exec tsc --noEmit` grün. VERIFY: tsc.
- **AC7** `CI=true pnpm exec vitest run src/lib/services/__tests__/fanRanking-v2.test.ts src/lib/__tests__/db-invariants.test.ts` grün. VERIFY: vitest.
- **AC8** REVOKE/GRANT-Block in Migration vorhanden (AR-44). VERIFY: `has_function_privilege('anon','calculate_fan_rank(uuid,uuid)','EXECUTE')` = false, `authenticated` = true.

## 7. Edge Cases

| # | Fall | Erwartung |
|---|------|-----------|
| 1 | Club ohne Threshold-Config | Default 10/25/40/55/70 weiter aktiv (COALESCE-Pfad unberührt) |
| 2 | RPC-Rewrite verliert versehentlich Follow-+5 | AC1 fängt es (grep `+ 5`) |
| 3 | RPC-Rewrite verliert ELO-Boost | AC1 fängt es (`fn_get_streak_elo_boost`) |
| 4 | DROP COLUMN vor Funktions-Replace im File | Reihenfolge im File: REPLACE zuerst → kein Fehler |
| 5 | Altes Bundle live während DROP | Wave-1-Deploy zuerst verhindert es (D82) |
| 6 | `recalculateFanRank` liest `result.csf_multiplier` nach RPC-Rewrite | Feld bereits aus TS entfernt (Wave 1); altes Bundle ignoriert fehlendes optionales Feld |
| 7 | NOT NULL DEFAULT 1.00 blockiert DROP | DROP COLUMN ignoriert Default/NOT-NULL — kein Problem |
| 8 | `fan_rankings`-Bestandszeilen | DROP entfernt Spalte für alle Zeilen; score/tier bleiben |

## 8. Self-Verification Commands

```bash
# AC5
grep -rn "csf_multiplier\|csfMultiplier" src/
# AC6/AC7
pnpm exec tsc --noEmit
CI=true pnpm exec vitest run src/lib/services/__tests__/fanRanking-v2.test.ts src/lib/__tests__/db-invariants.test.ts
```
```sql
-- AC1
SELECT pg_get_functiondef('public.calculate_fan_rank(uuid,uuid)'::regprocedure) ILIKE '%csf_multiplier%' AS has_csf,
       pg_get_functiondef('public.calculate_fan_rank(uuid,uuid)'::regprocedure) ILIKE '%fn_get_streak_elo_boost%' AS has_elo,
       pg_get_functiondef('public.calculate_fan_rank(uuid,uuid)'::regprocedure) ILIKE '%club_fan_rank_thresholds%' AS has_thresholds;
-- AC2
SELECT COUNT(*) FROM information_schema.columns WHERE table_name='fan_rankings' AND column_name='csf_multiplier';
-- AC8
SELECT has_function_privilege('anon','public.calculate_fan_rank(uuid,uuid)','EXECUTE') AS anon,
       has_function_privilege('authenticated','public.calculate_fan_rank(uuid,uuid)','EXECUTE') AS auth;
```

## 9. Open Questions
- **Pflicht-Klärung:** keine (Money-Effekt = 0 live verifiziert, CTO-Scope für Removal-WIE).
- **Autonom-Zone:** Migration-Timestamp, exakte Doku-Formulierung, Test-Mock-Anpassung.

## 10. Proof-Plan
- `worklog/proofs/348-remove-csf-multiplier.txt`: AC1/AC2/AC4/AC8 SQL-Output + tsc/vitest-Snippet + grep-Leerergebnis (AC5).

## 11. Scope-Out
- `liquidate_player` wird NICHT angefasst (ist bereits proportional).
- `FAN_RANK_TIERS.minScore/maxScore` bleiben (Slice-347-Drift-Thema, separater Slice).
- Keine UI-Änderung (kein Component rendert csfMultiplier).
- Fan-Reward-Engine-Erweiterungen (Polls-Reste etc.) = eigene Slices.

## 12. Stage-Chain (geplant)
SPEC ✅ → IMPACT (inline, oben) → BUILD (Wave 1 TS, dann Wave 2 Migration) → REVIEW (Cold-Context-Reviewer, Pflicht: Money-adjacent) → PROVE (SQL + tsc + vitest) → LOG.

## 13. Pre-Mortem (M optional, hier knapp)
1. **RPC-Rewrite revertet stillschweigend einen Patch** (Slice-156-Klasse) → AC1 grep-Guards für Follow/ELO/Thresholds.
2. **DROP bricht Live** → Wave-1-Deploy-Gate (D82).
3. **Vergessener TS-Reader** → AC5 grep = 0.
4. **Privilegien-Reset durch CREATE OR REPLACE** → AR-44 REVOKE/GRANT + AC8.
5. **Stale Migrations-Datei als Baseline** → D87 Live-Read ist Quelle (bereits geholt).
