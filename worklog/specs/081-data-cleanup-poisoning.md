# Slice 081 — Data-Cleanup Phase A.1 (Duplicate Default-Poisoning)

**Status:** SPEC
**CEO-Scope:** JA (Money-Critical — market_value_eur beeinflusst reference_price via Trigger)
**Stage-Chain target:** SPEC → IMPACT (skipped, siehe unten) → BUILD → PROVE → LOG

## Ziel (1 Satz)

268 Spieler deren MV+contract_end-Paar >= 10-fach in der DB dupliziert ist (Parser-Defaults aus TM-Scraper-Fails) werden via neuer `mv_source`-Spalte als `transfermarkt_stale` markiert, ohne die MV selbst zu ueberschreiben — damit spaetere Phase-A.2-ReScraper-Runs sie gezielt neu pullen koennen und UI-Transparenz moeglich wird.

## Kontext

Aus dem Daten-Audit 2026-04-20 stellt sich heraus: 17 Spieler haben identisch MV=500.000 € + contract_end=2025-07-01, 14 Spieler identisch 50.000 € + 2026-06-30, 13 Spieler identisch 8.000.000 € + 2025-07-01 usw. Das sind keine zufaelligen echten Werte sondern Scraper-Fallbacks bei fehlgeschlagenem Parsing. Solange `sync-transfermarkt-batch` mit `missing_only=true` laeuft wird der falsche Wert nie korrigiert. Wir brauchen eine Markierung die (a) echte Daten nicht verlieren laesst, (b) den Re-Scraper triggert, (c) CI-Regression-Guard (INV-30) ermoeglicht.

## Betroffene Files

| File | Aenderung |
|------|----------|
| `supabase/migrations/NNN_add_mv_source_and_poisoning_flag.sql` | NEW — `ADD COLUMN mv_source TEXT DEFAULT 'unknown'` + UPDATE auf 268 Poisoned Rows |
| `src/types/database.types.ts` (auto-gen) | `mv_source` field auf players-Tabelle |
| `src/lib/services/__tests__/db-invariants.test.ts` | NEW Test INV-30: fail wenn >3 Rows identisches (mv,contract_end) haben |
| `worklog/proofs/081-before.txt` | Count poisoned Rows vor Migration |
| `worklog/proofs/081-after.txt` | Count der stale-markierten Rows nach Migration, INV-30 Output |

**Scope-Out (explizit):**
- `sync-transfermarkt-batch` Re-Scraper ist separater Slice (Phase A.2, nach Approval). Dieser Slice schreibt KEINEN echten MV, nur Markierungen.
- Frontend-Badge "Wert wird ueberprueft" separater Slice. Keine UI-Aenderung in 081.
- `getPlayersByClubId` Altbestand-Filter ist Phase A.3.

## IMPACT

**Skipped mit Begruendung:** Kein Service-Layer/RPC touched. Nur neue Spalte + UPDATE auf Data. Trigger-Kaskade bewusst vermieden (MV unveraendert → reference_price Trigger feuert nicht). Holdings-Exposure: 7 Rows (19 Scout Cards), keine Aenderung an quantity/price.

## Acceptance Criteria

1. Spalte `players.mv_source` existiert mit Default `'unknown'`, CHECK constraint auf `('unknown','transfermarkt_verified','transfermarkt_stale','manual_csv','api_football')`.
2. Genau 268 Rows (Duplicate-Cluster >= 10) haben `mv_source='transfermarkt_stale'`.
3. `market_value_eur` ist vor/nach Migration byte-identisch fuer alle 4556 Rows.
4. `reference_price` ist vor/nach Migration byte-identisch fuer alle 4556 Rows (Proof: Aggregat-SUM).
5. INV-30 Test laeuft: Aktuell fail (weil 268 Poisoned existieren) → nach Migration UPDATE auf stale, die Cluster-Detection-Logik zaehlt `mv_source='transfermarkt_stale'` nicht mit → INV-30 gruen.
6. `npx tsc --noEmit` clean, `npx vitest run src/lib/services/__tests__/db-invariants.test.ts` gruen.
7. Holdings-Aggregat (total quantity, total holders) unveraendert.

## Edge Cases

1. **Neue Players waehrend Migration**: Neuer INSERT zwischen Probe-Query und UPDATE. Mitigation: Migration laeuft in Single-Transaction. CHECK constraint wird vorher angelegt.
2. **Ein Spieler in Cluster + aktive Holdings**: 7 Spieler sind in Holdings. mv_source-Flag aendert MV nicht → kein Impact auf Holder-Balance/Avg-Cost.
3. **CHECK constraint verletzt durch Legacy-Rows**: `mv_source='unknown'` als DEFAULT + bei UPDATE spaeter CHECK applied — sollte nicht stolpern.
4. **INV-30 false-positive bei legitimen identischen MVs** (z.B. 5 Jugendspieler eines Clubs mit identisch 50.000 €): Cluster-Schwelle auf 10 gesetzt + mv_source='transfermarkt_stale' wird aus Count exkludiert → kein False-Positive-Risiko.
5. **Rollback**: Falls Probleme, `UPDATE players SET mv_source='unknown' WHERE mv_source='transfermarkt_stale'` + `ALTER TABLE DROP COLUMN` (oder keep fuer Phase A.2).
6. **Trigger trg_player_reference_price ist BEFORE UPDATE FOR EACH ROW ohne WHEN**: Jede UPDATE-Statement feuert den Trigger, auch wenn nur `mv_source` geaendert wird. Trigger-Body muss geprueft werden: setzt er reference_price nur WENN market_value_eur changed? Falls nicht → reference_price = market_value_eur*10 wird re-calculated (zum gleichen Wert, daher byte-identisch — OK).
7. **Migration auf Production**: Nur via `mcp__supabase__apply_migration` (nicht `supabase db push`, Registry-Drift-Regel).
8. **Trading-Block waehrend Migration**: UPDATE-Dauer auf 268 Rows <1s. Kein Lock-Contention erwartet.

## Proof-Plan

1. Before-Query: `SELECT mv_source, COUNT(*) FROM players GROUP BY mv_source` → Erwartung: kein `mv_source` existiert.
2. Migration apply.
3. After-Query: `SELECT mv_source, COUNT(*) FROM players GROUP BY mv_source` → 268 `transfermarkt_stale` + 4288 `unknown`.
4. Reference-price Invariant: `SELECT SUM(reference_price), SUM(market_value_eur) FROM players` vor und nach Migration identisch.
5. Holdings-Invariant: `SELECT SUM(quantity), COUNT(DISTINCT user_id) FROM holdings` vor/nach identisch.
6. INV-30 Test: `npx vitest run -t "INV-30"` gruen.
7. Ein Stichproben-Spieler (Arda Yilmaz GK #60 Galatasaray): Confirme `mv_source='transfermarkt_stale'`, `market_value_eur` noch 26000000, `reference_price` noch 260000000.

## Trigger-Body-Verify (Safety)

Vor Migration: `SELECT pg_get_functiondef('trg_update_reference_price'::regproc);` einsehen. Falls Trigger unbedingt re-calculated ohne `OLD.market_value_eur IS DISTINCT FROM NEW.market_value_eur`-Guard: Migration wird den Trigger fuer 4556 Rows feuern (kein Functional-Change, aber unnoetige Writes). Falls guarded: Nur 0 Rows feuern (mv unveraendert). In beiden Faellen: kein Functional-Risk.
