# Slice 419 Review — Reviewer-Agent (Cold-Context, Money)

**Verdict: CONCERNS → PASS** (Finding #1 geheilt in 419b: `rpc_get_recent_player_scores` Skalar-Subquery-SUM liga-gefiltert, Fanout-Proof old_dup=1→new=0, ACL erhalten, live verifiziert. Finding #2 LOW = akzeptierter Trade-off, #3 INFO = kein 419-Regress.)
**time-spent: 26 min**

Money-Pfad (`score_event`) sauber + force-rollback-bewiesen (Zero-Sum, Reward-Invarianz, PATCH-AUDIT byte-treu gegen echte Live-Baseline Slice 396). Ein übersehener aktiver SQL-Reader vor Merge zu adressieren.

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | HIGH | `rpc_get_recent_player_scores` (live, Slice 274; KaderTab/Markt Form-Bars) | `LEFT JOIN player_gameweek_scores pgs ON pgs.player_id=pw.player_id AND pgs.gameweek=pw.gameweek` — kein `league_id`-Filter. Nach UNIQUE-Flip → Row-Fanout bei 40 Kollisions-Spielern (31 cross-league) → Duplikat-/Fremd-Liga-Slots im `jsonb_agg`. Kein Money, aber Daten-Korrektheit. Nicht in Code-Reading-Liste. | JOIN um `AND pgs.league_id = <window league>` ergänzen. → GEHEILT in 419. |
| 2 | LOW | `getProgressiveScores` + `useLineupBuilder.ts:451` | Live-Vorschau SUMt ohne Liga-Filter, finaler `score_event` liga-gefiltert → Vorschau-vs-Final-Drift bei cross-league Kollisions-Spielern. Kein Geld-Bug (Vorschau nicht bindend). | Akzeptierter Trade-off (Spec Edge #9). Optional: boundLeagueId durchreichen. |
| 3 | INFO | `score_event` vs AR-29 (`20260414205000`) | AR-29 `no_player_game_stats`-Guard fehlt — war aber schon in der 396-Baseline weg, **kein 419-Regress**. | Separat verifizieren ob 396 ihn bewusst fallen ließ. Nicht 419-Scope. |

## Spec-Coverage
AC1✓ AC2✓ AC3✓ AC4✓ AC5✓ AC6✓ AC7✓ AC8~(Finding#1) AC9✓ AC10✓ AC11✓

## Positive
- PATCH-AUDIT gegen echte Live-Baseline (396), nicht stale AR-29-File (D87/S156 korrekt angewandt).
- Force-rollback Zero-Sum + Reward-Invarianz (1721==1721) VOR Live-Apply.
- Liga-Filter `(v_event_league IS NULL OR ...)` fail-open nur für die 2 bekannten league-losen Events.

## Learning (→ Knowledge Capture)
Bei UNIQUE/Kardinalität-Flip einer Tabelle ALLE SQL-Reader via `grep -rl "<table>" supabase/migrations/` auditieren — `LEFT JOIN <table> ON <alte_unique_cols>` ohne neue Diskriminator-Spalte = stiller Row-Fanout. DB-Schwester von errors-frontend S414/415/416 („von-allem-N"-Surfaces).
