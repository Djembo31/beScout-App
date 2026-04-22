# Slice 144c — last_squad_check vor cross-club-skip ziehen (XS)

**Datum:** 2026-04-22
**Groesse:** XS (1 File, Logic-Reorder)
**CEO-Scope:** nein (interner Scraper-Script, keine Money-/Trading-Pfade)

## Ziel

Transfer-detected players sollen ihre `last_squad_check` Zeitstempel auch ohne `--allow-transfers` bekommen — aktuell greift early-`continue` Z.211 VOR dem `updates.last_squad_check = now` Z.220, was dazu fuehrt dass transfer-pending-Spieler fuer spaetere Retired-Detection als "nie gescraped" erscheinen.

## Betroffene Files

- `scripts/tm-squad-scrape-local.ts` Z.194-258 (processClub inner loop)

## Acceptance Criteria

1. Transfer-detected Player OHNE `--allow-transfers`: `last_squad_check` wird ge-UPDATEt (single-field).
2. Transfer-detected Player OHNE `--allow-transfers`: `shirt_number`, `market_value_eur`, `club_id` werden NICHT ueberschrieben.
3. Transfer-applied Player (`--allow-transfers`): Verhalten unveraendert, alle Fields inkl. `club_id` werden gesetzt.
4. Non-transfer Player (club_id match): Verhalten unveraendert, alle relevanten Fields werden gesetzt.
5. Dry-run ohne `--allow-transfers`: Transfer-detected Player zeigt Log-Line "would set last_squad_check only (transfer-pending)", keine UPDATE-Call.
6. Dry-run mit `--allow-transfers`: Verhalten unveraendert.
7. Stats-Counter `players_transfer_detected` / `players_transfer_applied` unveraendert.

## Edge Cases

- `existing.club_id === null` mit TM-club-match: aktuell matcht Z.205 `null !== club.clubId` → transfer-detected. Nach Fix: last_squad_check gesetzt, club_id NICHT ueberschrieben ohne `--allow-transfers`. Konsistent — 144e Audit laeuft separat.
- DB-Error beim Transfer-Skip-UPDATE: log-error wie existing, keine Throw (konsistent mit Z.255-256).
- Players die in allen Clubs matchen (normal-case): fall-through zur vollen Update-Logik, gleiche SQL wie vorher.

## Proof-Plan

`worklog/proofs/144c-dry-run.log`: Dry-Run gegen 1 Club (z.B. Werder, WER-Cluster) mit expliziten Transfer-Faellen. Soll die neue Log-Line "would set last_squad_check only (transfer-pending)" zeigen und Stats-Zeile.

## Scope-Out

- WER-Cluster null-club-id Audit (Backlog 144e)
- `cron_sync_log.gameweek=0` Sentinel (Backlog, nicht 144c-Bezug)
- Idempotenz-Re-Test auf gesamtem Kader (wird in 144b-Full-Run abgedeckt)
