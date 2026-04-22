# Slice 144d — Apply 225 TM-Squad Transfers via `--allow-transfers`

**Datum:** 2026-04-22
**Groesse:** XS (Script-Run, kein Code-Change)
**CEO-Scope:** ja — Anil approved 2026-04-22 (y/n = y)

## Ziel

Die in Slice 144b via Full-Run detektierten Transfer-Moves (225 players mit DB `club_id` ≠ TM-Squad `club_id`) tatsaechlich anwenden. `players.club_id` wird fuer matched players auf TM-Squad-Truth aktualisiert.

## Betroffene Files

Keine Code-Changes. Nur DB-Writes:
- `players.club_id` UPDATEs (geschaetzt ~225, evtl. ±n seit letztem Run)
- `players.last_squad_check` wird gesetzt fuer alle scraped Players (Side-Effect 144c-konform)

## Command

```
npx tsx scripts/tm-squad-scrape-local.ts --allow-transfers --rate=2000
```

- 134 Clubs sequentiell mit 2s-Rate → ~4-5 min Scraping + DB-Updates
- `allowTransfers=true` → Transfer-Moves werden tatsaechlich angewendet (Line 256 script)
- Default `rate=2000` respektiert TM rate-limits

## Acceptance Criteria

1. Script exit code 0
2. `players_transfer_applied` stat > 0 im Script-Output
3. Post-Run: `SELECT COUNT(*) FROM players WHERE club_id IS NULL` unveraendert oder niedriger (kein neuer Orphan-Creation)
4. Random-Sample 3 player_ids aus transfer-list: `club_id` hat gewechselt und matched TM-Truth
5. Keine FK-Violations oder DB-Errors im Script-Log

## Proof-Plan

- `worklog/proofs/144d-run.txt` — Script stdout+stderr (inkl. Stats)
- `worklog/proofs/144d-verify.txt` — DB-Queries (Pre/Post club_id distribution, null-count, Sample-Verify)

## Scope-Out

- Nicht-TM-matched Players bleiben unveraendert (Orphans-Handling = 144h)
- MV/Contract-Refresh ist separat (144f)
- Orderbook-Konsistenz-Check fuer Holdings auf transfered Players → manuell nach Run, nur falls Holdings existieren

## Risk-Mitigation

- Beta-Freeze aktiv → kein Live-Trading → Cross-Club-Order-Risk = 0
- Reversibel via DB-Snapshot (Supabase point-in-time-recovery) falls false-positive Transfer apllied
