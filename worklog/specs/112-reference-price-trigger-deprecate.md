# Slice 112 — reference_price Trigger Semantik klären + deprecaten

## Ziel (1 Satz)
`reference_price = MV × 10` Auto-Trigger klären (Zweck? Consumer?) und entweder formel-korrekt machen oder deprecaten, weil Audit Slice 108 zeigte dass das Feld nicht mit CEO-Modell konsistent ist und fast keine User-facing Consumer hat.

## Root-Cause (Audit Slice 108)

- `supabase/migrations/20260319_pricing_architecture.sql:42` — Trigger `trg_update_reference_price` setzt `NEW.reference_price := NEW.market_value_eur * 10` bei jedem MV-Update.
- Für Bekir (MV 1M€) → `reference_price = 10.000.000 cents = 100.000 $SCOUT = 1.000 €`. Das sind **0,1% des MV**, nicht 10% wie CEO-Modell vorsieht.
- **3 Consumer im Code** (alle non-user-facing):
  - `src/lib/services/players.ts:22,175` — als Type-Field im Mapping
  - `src/lib/services/__tests__/players.test.ts` — Test
  - `src/types/index.ts` — Type-Def
- **Live-Consumer im DB**: `get_price_cap()` RPC nutzt `v_ref_price * 3` als Price-Cap — aber AR-21 hatte das bereits durch `v_ipo_price * 3` ersetzt bei null-ref.

## 3 Optionen (CEO-Entscheidung)

### Option A: Feld + Trigger komplett deprecaten
- `ALTER TABLE players DROP COLUMN reference_price` + `DROP TRIGGER trg_player_reference_price`
- `get_price_cap()` RPC nur noch `v_ipo_price * 3`
- Services-Mapping entfernen
- Migration-Rollback: simple ALTER TABLE ADD COLUMN
- **Risiko**: falls Scripts/Reports auf Feld zugreifen → unbekannter Blast-Radius

### Option B: Formel korrigieren
- Trigger: `NEW.reference_price := NEW.market_value_eur / 10` (= MV in cents via Anils Konvention = $SCOUT × 0,01)
- Backfill alle bestehenden Rows
- Semantik: "aktueller Card-Preis-Referenz in cents"
- Für 1M€ MV: reference_price = 100.000 cents = 1.000 $SCOUT = matcht ipo_price

### Option C: Beibehalten als Legacy
- Nichts ändern, nur in `trading.md` als "Legacy-Field, ignorieren" dokumentieren
- Price-Cap bleibt auf `v_ipo_price * 3` (sauber)
- Risiko: Future-Dev findet das Feld und denkt es sei autoritativ

## Recommended: Option A

Weil:
- Kein user-facing Consumer (audit confirmed)
- AR-21 hat den einzigen Live-Consumer (`get_price_cap`) bereits auf `ipo_price` umgestellt
- Kleinere Surface = weniger Drift-Risiko
- Data-Migration trivial (column drop)

## Betroffene Files

- **Migration**: `DROP COLUMN reference_price CASCADE` + `DROP FUNCTION trg_update_reference_price`
- **Migration**: `get_price_cap` RPC-Update (falls nötig, nur `v_ipo_price` branch)
- `src/types/index.ts` — `DbPlayer.reference_price` entfernen
- `src/lib/services/players.ts:22,175` — Select-Columns und Mapper
- `src/lib/services/__tests__/players.test.ts` — Test-Fixture update
- `.claude/rules/database.md` — Column-Liste updaten

## Acceptance Criteria

1. `ALTER TABLE players DROP COLUMN reference_price` erfolgreich, keine FK-Broken.
2. `DROP FUNCTION trg_update_reference_price` erfolgreich.
3. `get_price_cap(<player_id>)` returnt `v_ipo_price * 3` (AR-21 Fallback).
4. `tsc --noEmit` clean nach Type-Entfernung.
5. `npx vitest run` grün.
6. Smoke-Test: Player-SELECT liefert kein `reference_price` mehr.

## Edge Cases

1. **Migration-Rollback** — CREATE COLUMN + Trigger + Backfill
2. **Scripts ausserhalb src/** (scripts/*.mjs) greifen evtl. auf reference_price — vor Drop greppen
3. **Frontend-Cache** (React Query) — staleTime auf players hoch genug? Forced refetch bei user-next-load OK

## Proof-Plan

- `worklog/proofs/112-before-consumers.txt` — `grep -rn reference_price`
- `worklog/proofs/112-migration-run.txt` — Migration-Output
- `worklog/proofs/112-after-cols.txt` — `\d players` output
- `worklog/proofs/112-tsc-clean.txt` — tsc + vitest output

## Scope-Out

- Option B (Formel korrigieren) — nur wenn CEO explizit will
- Historische Reports/Dashboards die reference_price nutzen — audit vor Drop
