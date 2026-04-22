# Slice 144f — Re-Scrape WER-stale Players (XS data-refresh)

**Datum:** 2026-04-22
**Groesse:** XS (Script-Run, kein Code-Change)
**CEO-Scope:** nein — Data-Refresh, keine Money/Trading-Logik beruehrt

## Ziel

Die 9 Werder-Players die in Slice 144e reunited wurden (club_id-Fix) haben noch `mv_source='transfermarkt_stale'` mit 2-4 Jahre alten MV/Contract-Daten. Re-Scrape TM-Profile → frische MV + contract_end → `mv_source='transfermarkt_verified'`.

**Scope-Expansion:** Script hat keinen `--tm-ids` Flag, nur `--league`. Run mit `--league="Bundesliga" --active-only=false` fasst ALLE 67 Bundesliga-stale-Players (incl. die 9 WER + 58 weitere). Positiver Nebeneffekt, kein Extra-Risk.

## Betroffene Files

Keine Code-Changes. Nur DB-Writes:
- `players.market_value_eur` bei MV-Change
- `players.contract_end` bei Contract-Change
- `players.mv_source`: `transfermarkt_stale` → `transfermarkt_verified` (bei Parse-Success)

## Command

```
npx tsx scripts/tm-rescrape-stale.ts --league="Bundesliga" --active-only=false --limit=100 --rate=2500
```

- 67 Players × 2.5s rate ≈ 3 min scraping + DB-Updates
- `--active-only=false` weil die 9 WER-Players matches=0 haben (waeren sonst gefiltert)
- `limit=100` sicherer Overhead (aktuell 67 stale)

## Acceptance Criteria

1. Script exit code 0
2. `verified` stat >= 9 (die 9 WER werden erfasst)
3. Post-Run: `mv_source='transfermarkt_verified'` fuer alle 9 WER-TM-IDs (`620295, 621802, 338668, 334221, 1045986, 289835, 162434, 405385, 263361`)
4. `mv_source='transfermarkt_stale'` Bundesliga-Count geht runter (67 → ~0-10, Parse-Failures bleiben stale)
5. Kein FK/Trigger-Violation, keine DB-Errors

## Proof-Plan

- `worklog/proofs/144f-run.txt` — Script stdout (Stats + per-Player logs)
- `worklog/proofs/144f-verify.txt` — DB Pre/Post Queries (BL-stale count, WER-9 mv_source, Sample MV-Change)

## Scope-Out

- 2. Bundesliga (119 stale), Süper Lig (34), andere Ligen — separate Slices falls gewuenscht
- Falls WER-Players `parseMarketValue` failen: bleiben stale → Manual-CSV-Workflow (Backlog B0)
- `players_unknown` (295) nicht in Scope — 144h

## Risk-Mitigation

- Beta-Freeze → kein Live-Trading → MV-Updates beeinflussen keine pending Orders
- Script hat concurrent-Safety: `fresh.mv_source` re-check vor UPDATE (Slice 082 Phase B Pattern)
- Parse-Failures bleiben stale (self-correcting auf naechsten Run)
