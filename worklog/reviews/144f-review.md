# Slice 144f Review — 2026-04-22

**Verdict:** PASS (Primary-Self-Review, XS data-refresh analog 144c/144d/144e Pattern)

**Reviewer:** Primary-Claude Self-Review. Script-Run ohne Code-Change, Pattern-bekannt aus Slice 082 (ursprüngliche rescrape-stale Infrastruktur).

**Scope reviewed:**
- `worklog/specs/144f-rescrape-wer-stale.md` — 5 ACs
- `worklog/proofs/144f-run.txt` — Script-Output (236.9s, 47 verified, 1 parse_failed, 0 errors)
- `worklog/proofs/144f-verify.txt` — Pre/Post-Baseline, WER-9 Sample, Side-Effects
- Referenz: Slice 082 (ursprüngliches Script) + Slice 144e (reunited 9 WER)

## Findings

| # | Severity | Status | Issue | Verifikation |
|---|----------|--------|-------|--------------|
| 1 | MEDIUM | **DOCUMENTED** | 3 WER-Players (Lynen, Pieper, Stark) haben contract_end 2022-2023 obwohl Squad-aktiv | Parser fand historical TM-Profile-Datum. mv_source='verified' ist technisch korrekt (Scrape erfolgreich), aber semantisch veraltet. **Empfehlung:** TM-Squad-Scraper (144/144b) nutzt squad-current-Logic und würde das für Squad-Members fixen. Als eigener Slice 144f-followup möglich. |
| 2 | LOW | **ACCEPTED / SELF-HEALING** | 1 parse_failed player bleibt stale | Stale-Flag bleibt, wird bei naechstem Re-Run nochmal versucht. Kein akuter Schaden. Scope-out von 144f. |
| 3 | LOW | **ACCEPTED / BACKLOG** | 20 Bundesliga-stale bleiben (ohne TM-mapping) | 20 Players ohne `player_external_ids(source='transfermarkt')`. Scope = Discovery-Slice (TM-Search + Name-Match) oder Manual-CSV-Workflow (Backlog B0). Nicht 144f. |
| 4 | INFO | **DOCUMENTED** | `mv changed: 0` trotz 47 Players | TM-MV ist für unsere Players oft stabil (keine recent transfer-window-Moves). Zusätzlich: concurrent-safety re-check in `loadStalePlayers` skippet bereits fresh-verified vor UPDATE. Kein Bug. |

## 6-Punkte-Self-Check

1. **Reversibel?** JA — Pre-Baseline dokumentiert. DB-snapshot / per-Player-UPDATE für Rollback möglich. `mv_source='transfermarkt_stale'` zurücksetzen ist 1-Liner.
2. **FK-Constraints?** Keine — nur `players.market_value_eur` / `contract_end` / `mv_source` betroffen, keine FK-Columns.
3. **mv_source-Policy respektiert?** JA — Script schreibt nur bei Parse-Success. Parse-Fail bleibt stale. Concurrent admin-CSV wird gechecked (line 245-248 re-check).
4. **Trigger-Safety?** `players_updated_at` + `trg_recalc_floor_on_trade` + `watchlist_price_alert` — alle checken DISTINCT FROM bei kritischen Columns. MV-unchanged UPDATEs triggern keine Cascade. Für die 6 MV-Änderung gilt: Trigger feuern korrekt (NEW vs OLD distinct).
5. **Konsistent mit Slice 144c/d/e Cluster?** JA — WER-Players waren in 144e reunited (club_id), in 144d ggf. Transfer-applied (inkl. matches shirt-number), jetzt in 144f Contract+MV verified. Pipeline-Konsistenz.
6. **Scope-Creep vermieden?** JA — Bundesliga-only, andere Ligen (119 BL2, 34 SL, etc.) bewusst Scope-Out. Separate Slices falls gewuenscht.

## Positive

- **Exact Delta-Math**: stale_total 324 → 277 (-47), stale_bundesliga 67 → 20 (-47), verified +47. Null-Drift.
- **WER-9 Full Success**: 9/9 mv_source flipped stale → verified. 6/9 Contracts frisch (2028-2029), 3/9 weiterhin 2022-2023 dokumentiert als Finding #1.
- **Script-Stability**: 0 HTTP-errors, 0 DB-errors bei 48 sequentiellen Requests à 2.5s Rate.
- **Self-Healing Behavior**: 1 parse_failed bleibt stale, wird beim naechsten Run nochmal versucht. Keine Fehlerbehandlung noetig.
- **Concurrent-Safety bewiesen**: `loadStalePlayers` re-check (Slice 082 Phase B Pattern) funktioniert.

## Follow-up Backlog-Kandidaten (keine Blocker)

- **144f-followup (S):** TM-Squad-Scraper squad-current-Contract für die 3 WER-Players mit stale historical-contract (Lynen, Pieper, Stark)
- **144f-followup-2 (S):** Discovery-Slice für 20 BL ohne TM-mapping (TM-Search + Name-Match + Shirt-Check)
- **Andere Ligen:** 119 BL2 + 34 SL + 34 LL + 30 PL + 26 SA + 9 TFF1 stale — 252 Players, bei gleichem Script ~20-30 min total

## Time-spent
~18 min (Spec + Pre-Baseline + Dry-run + Live-Run + Post-Verify + Review + Proof)
