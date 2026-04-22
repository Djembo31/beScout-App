# Slice 144b Review — 2026-04-22

**Verdict:** PASS

**Scope reviewed:**
- `worklog/proofs/144b-full-run.log` (Full-Run-Trace, 134/134 clubs, 768.9s)
- `worklog/proofs/144b-db-verify.txt` (Post-run count-verify)
- `worklog/active.md` (status=review, slice=144b)
- Referenz Slice 144: `src/lib/scrapers/transfermarkt-squad.ts`, `scripts/tm-squad-scrape-local.ts`, Migration `20260422130000_players_last_squad_check`

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NITPICK | 144b-full-run.log Z.75-93 | 19 transfer-detected mit `DB=null`-Spielern (WER-Cluster) → evtl. Cross-Club-Contamination-Rest aus Slice 081d oder neu-Imports ohne club_id. | Backlog 144e: `SELECT club_id, COUNT(*) FROM players WHERE club_id IS NULL GROUP BY club_id` + cross-check gegen TM-Squad-Scan. |
| 2 | NITPICK | scripts/tm-squad-scrape-local.ts Z.328 | `cron_sync_log` insert nutzt `gameweek: 0` als sentinel — semantisch unsauber. | Pattern bereits in anderen cron_sync_log-writers, kein 144b-Blocker. |
| 3 | OBSERVATION | 144b-db-verify.txt | Integrity-Math `2841−225=2616` stimmt exakt → transfer-detected Players bekommen kein last_squad_check (early-continue). Means: sie erscheinen für Retired-Detection als "nie gescraped". | Backlog 144c (XS): `last_squad_check` Update VOR cross-club-skip ziehen (script Z.220 unabhängig vom club-match). |

## Integrity-Checks (alle positiv)

- **Migration live:** `last_squad_check` Column angewandt (Baseline 0 → Post-Run 2616).
- **Cron-Log Schema-Match:** duration=768_900ms passt INT4. JSONB details clean.
- **1000-row-cap Paginierung:** `loadTmMappedPlayers` nutzt `range(offset, offset+999)` Loop (Slice 133-135 pattern).
- **Stale-Guard:** Slice 081 `mv_source=transfermarkt_stale` korrekt respektiert (0 MV-overwrites).
- **Transfer-Skip-Logik:** Cross-club-Detection sauber.
- **Idempotenz:** Zweiter Run ohne `--allow-transfers` = nur Shirt-Drift-Diffs.

## Notes

Follow-up-Backlog-Kandidaten:
- **144c XS:** `last_squad_check`-Update vor cross-club-skip ziehen (transfer-detected Players sollten auch Signal bekommen).
- **144e XS:** Audit 19 null-club-id players im WER-Cluster (evtl. Slice 081d-Rest).

**Time-spent:** ~25 min (Cold-Context-Reviewer-Agent, read-only Dispatch)
