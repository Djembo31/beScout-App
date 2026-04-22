# Slice 144h — Batch-Rescrape 6 remaining leagues (XS data-refresh)

**Datum:** 2026-04-22
**Groesse:** XS (Script-Batch-Run, kein Code-Change, nutzt 144g-null-Policy)
**CEO-Scope:** nein — Data-Refresh

## Ziel

Mit neuer 144g-null-Policy (contract_end schreibt null wenn TM kein "Vertrag bis") die 252 stale Players in BL2/SL/LL/PL/SA/TFF1 refreshen. 144f hat nur BL1 gemacht.

## Betroffene Files

Keine Code-Changes. Nur DB-Writes (market_value_eur, contract_end, mv_source).

## Command (Batch)

```bash
for league in "2. Bundesliga" "Süper Lig" "La Liga" "Premier League" "Serie A" "TFF 1. Lig"; do
  echo "=== $league ===";
  npx tsx scripts/tm-rescrape-stale.ts --league="$league" --active-only=false --limit=200 --rate=2500;
done
```

## Acceptance Criteria

1. 6/6 Script-Runs exit 0
2. stale_total sinkt von 277 → ~50-70 (nur Players ohne TM-mapping bleiben)
3. verified_total steigt um Delta entsprechend
4. Kein FK/Trigger-Violation, keine DB-Errors

## Proof-Plan

- `worklog/proofs/144h-batch-run.txt` — Combined stdout aller 6 Ligen
- `worklog/proofs/144h-verify.txt` — DB Pre/Post per league

## Scope-Out

- 544 unknown mv_source — braucht CSV-Workflow (Backlog B0)
- 107 Orphans — braucht 144h getrennten Slice (Name-Collision!) — als `144i-orphan-cleanup` renamed falls nötig
- Parse-Fails bleiben stale, self-healing auf naechsten Run
