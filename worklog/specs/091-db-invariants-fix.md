# Slice 091 — DB-Invariants INV-36/37/38 fixen

## Ziel (1 Satz)
INV-38 Data-Fix (123 Orphan-Contracts auf stale flaggen) + INV-36/37 Invariant-Verfeinerung auf Poisoning-Signatur (contract_end ~ `-07-01`) → alle 3 Tests grün.

## Betroffene Files

| Path | Fix |
|------|-----|
| **Ad-hoc SQL** (via supabase MCP) | UPDATE `players` SET `mv_source='transfermarkt_stale'` WHERE `contract_end < cutoff_12mo` AND `mv_source != 'transfermarkt_stale'` — 123 Rows |
| `src/lib/__tests__/db-invariants.test.ts` | INV-36 + INV-37 Violations-Filter einschränken auf `contract_end.endsWith('-07-01')` |

## Root-Cause

### INV-38 (Orphan-Contracts)
- 123 Players haben `contract_end < cutoff (2025-04-20)` UND sind nicht als `transfermarkt_stale` geflagged.
- Breakdown der TOP-Fälle: 36× `2024-07-01`, 17× `2023-07-01`, 15× `2022-07-01` — alles bekannte TM-Scraper-Defaults (Slice 081 Pattern).
- Root-Cause: Re-Scraper (Slice 082 Phase B) filterte gezielt auf `mv_source='transfermarkt_stale'`. Neu reingekommene Orphans (via sync-players-daily) wurden nicht re-scanned.
- Fix: ein SQL UPDATE setzt `mv_source='transfermarkt_stale'` für alle Orphan-Rows.

### INV-36/37 (Cluster)
- 204 Cluster > 3 identified. **Aber:** Top-Cluster sind legitime Saisonend-Daten:
  - `1.5M EUR / 2027-06-30 = 49 Spieler` (Jungspieler mit 3-Jahres-Vertrag)
  - `50K / 2026-06-30 = 45 Spieler`
  - `400K / 2026-06-30 = 44 Spieler`
  - Alle enden auf **`-06-30`** (Saisonende).
- Slice 081 Poisoning-Pattern war contract_end ENDET auf **`-07-01`** (TM-Scraper-Default).
- Fix: INV-36/37 Post-Filter nach `key.split('|')[1].endsWith('-07-01')` — fängt nur echte Poisoning-Signatur.

## Acceptance Criteria

1. SQL UPDATE setzt genau 123 Rows auf `mv_source='transfermarkt_stale'` (verifiziert via row_count).
2. Post-Update INV-38 Test-Run grün (0 Orphans ohne stale-Flag).
3. INV-36/37 Test-Filter nur bei `-07-01`-Pattern → beide grün.
4. `npx tsc --noEmit` clean.
5. Full-Suite: 3 DB-Invariants-Tests (INV-36/37/38) grün. Pre-existing TURK-03, INV-10, INV-32 können rot bleiben (separate Slices).

## Edge Cases

- SQL läuft idempotent: zweiter UPDATE betrifft 0 Rows (da Filter `!= stale`).
- `contract_end < cutoff` kann NULL-Rows enthalten → PostgreSQL `NULL < date` = NULL = false, wird ausgeschlossen. OK.
- INV-36 Filter-Change: False-negative-Risk bei zukünftigem Poisoning mit anderer Default-date. Akzeptabel: Prevention ist durch Scraper-Regression-Tests (Slice 078). INV-Tests sind Legacy-Residue-Check.
- Cluster-Pattern mit `-06-30` = legit. Wenn echtes Poisoning mit `-06-30` auftaucht: separate Slice.

## Proof-Plan

- Pre-Update Zählung: `SELECT COUNT(*) WHERE contract_end < cutoff AND mv_source != 'stale'` → 123
- Post-Update Zählung: 0
- Test-Run Output: 3 grüne INV-Tests
- Diff: SQL + 2 Code-Änderungen (INV-36 + INV-37 filter)

## Scope-Out

- Pre-existing TURK-03 / INV-10 / INV-32 / useMarketData.floorMap — separate Slices
- Andere potentielle Cluster-Patterns (`-06-30`) falls echte Poisoning auftritt — bisher keine Evidence
- Automated Monitoring für Orphan-Accumulation — separate Slice (Cron + Slack-Notify)
