# Slice 454 — D-17: Ranking-SSOT (user_stats-Scores = kept-fresh Projektion von scout_scores)

**Slice-Type:** Migration · **Größe:** M · **Scope:** Money-nah/§3 (scout_scores feeds Monats-Liga+Airdrop — bleibt UNANGETASTET; nur user_stats-Projektion) — selbst, Reviewer-Pflicht, CEO-Apply.

## 1. Problem (Evidence: Live-DB skzjfhvgccaeplydsunz, D87)
Disease-Register **D-17**: `scout_scores` (trader/manager/analyst, kanonisch — Leaderboard+Airdrop+Monats-Liga-Geld) und `user_stats` (trading/manager/scout) berechnen **dieselben Dimensionen mit verschiedenen Formeln**.
- **Live verifiziert:** scout_scores=128 Rows, user_stats=70, Overlap=70 → **70/70 divergent in ALLEN 3 Dimensionen** (manager+trader+analyst je 70/70).
- `scout_scores` (via `award_dimension_score`): inkrementell, `v_new=GREATEST(0,current+delta)`, Peaks/Rang/Gold-Boost, score_history. **Geld-gekoppelt** (close_monthly_liga, _refresh_airdrop_score lesen es).
- `user_stats` (via `refresh_user_stats`): eigene gedeckelte Formel `trading=trades*5+vol/100k+div*10` etc. (cap 1000). Liest niemand für Geld.
- Bridge `trg_fn_event_scored_manager` schreibt beim Event-Scoring BEIDE (award_dimension_score + refresh_user_stats) → Divergenz strukturell erzeugt.
- **Sichtbar auf:** Community (`social.ts`), Club-Dashboard (`get_club_top_scouts`/`get_club_dashboard_stats_v2`), `request_mentor`. `/rankings` (`scoutScores.ts`) liest schon scout_scores (kanonisch, korrekt).

## 2. Lösung (CEO Anil: „A — scout_scores = eine Quelle"; CTO-WIE: kept-fresh Projektion)
`scout_scores` UNANGETASTET (Money-Anker). `user_stats`-Scores werden reine Projektion:
- **refresh_user_stats:** die 3 Score-Vars NICHT mehr eigene Formel, sondern aus `scout_scores` lesen: trading_score←trader_score, manager_score←manager_score, scout_score←analyst_score, total_score←Σ. Rest (Stats/tier/rank) bleibt, tier/rank rechnen aus dem neuen (kanonischen) total.
- **Neuer Trigger** `trg_scout_scores_project_user_stats` AFTER INSERT OR UPDATE OF (trader_score,manager_score,analyst_score) ON scout_scores → leichte `UPDATE user_stats SET die-3-scores+total+tier WHERE user_id=NEW.user_id` (keine Rekursion: schreibt user_stats, nicht scout_scores; ruft NICHT das schwere refresh). → Drift unmöglich.
- **tier-Helper** `fn_compute_user_tier(total int)` extrahiert die tier-CASE (vermeidet Formel-Dup zwischen refresh_user_stats + neuem Trigger).
- **Backfill:** alle 70 user_stats-Rows einmal projizieren.

## 3. Betroffene Files
- Migration `<ts>_slice_454_ranking_ssot.sql` (refresh_user_stats REPLACE + tier-Helper + Trigger + Backfill).
- KEIN Service/FE-Change (Surfaces lesen user_stats, das jetzt = scout_scores; Return-Shapes identisch).

## 4. Code-Reading (D87 erledigt)
1. ✅ Live-Defs `award_dimension_score` + `refresh_user_stats` + `trg_fn_event_scored_manager` gezogen.
2. ✅ Divergenz 70/70 live verifiziert.
3. ✅ Surface-Map: wer liest user_stats-scores (Community/Club/mentor) vs scout_scores (/rankings).
4. ✅ Money-Reader von scout_scores (close_monthly_liga/airdrop) = NICHT angefasst.

## 5. Pattern-References
- §0 SSOT (eine Quelle) · Denorm-mit-Trigger = legitim (Register §4: „krank ist nur trigger-lose Drift") · D87 · PATCH-AUDIT byte-treu (refresh_user_stats Rest) · S195d (Loop/Var-Reset falls Trigger loopt — hier nein).

## 6. Acceptance Criteria
- AC1: nach Backfill **0/70 Divergenz** (user_stats.trading=scout.trader, manager=manager, scout=analyst für alle Overlap-User).
- AC2: Trigger-Test: UPDATE scout_scores.manager_score(+10) → user_stats.manager_score sofort +10 (gleiche Tx).
- AC3: refresh_user_stats Rest byte-treu (Stats-Berechnung/rank-ROW_NUMBER/tier-Schwellen/notifications unverändert; nur 3 Score-Vars-Quelle + tier-Helper).
- AC4: scout_scores PATCH-AUDIT = UNVERÄNDERT (kein Edit an award_dimension_score/scout_scores).
- AC5: Geld-Pfad unberührt (close_monthly_liga/airdrop lesen scout_scores wie vorher).
- AC6: total_score = trader+manager+analyst (nicht mehr die gedeckelten user_stats-Formeln).
- AC7: Return-Shape refresh_user_stats (RETURNS user_stats) unverändert → Caller stabil.

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| User in scout_scores aber nicht user_stats (128 vs 70) | Trigger-UPDATE trifft 0 Rows (kein user_stats) → ok; refresh erstellt Row später |
| scout_scores-Row fehlt bei refresh | LEFT-Read → COALESCE 0 (kein NULL in NOT-NULL smallint) |
| total > smallint-Range (user_stats.*_score = smallint, max 32767) | scout_scores uncapped → **Overflow-Risiko!** → prüfen: smallint-Cap, ggf. LEAST(32767,...) ODER Spalten-Typ |
| Negativer scout (manager kann via Penalty <0? nein: GREATEST(0,...)) | scores ≥0 garantiert |
| Trigger-Rekursion | schreibt user_stats, Trigger ist auf scout_scores → keine Loop |

## 8. Self-Verification
Force-rollback: refresh_user_stats REPLACE + Trigger + Backfill in Tx → AC1 (0 divergenz) + AC2 (trigger propagiert) → RAISE rollback. Post-Apply: Divergenz-Query = 0.

## 9. Open-Questions
- **smallint-Overflow (Edge oben):** `user_stats.*_score` sind `smallint` (max 32767), scout_scores `integer` uncapped. Heute scout-scores klein (Mock), aber langfristig Overflow. → in dieser Slice: `LEAST(32767, ...)`-Guard ODER Spalten auf integer migrieren. **Entscheide beim BUILD** (Daten-Check: aktueller max scout-score).
- CEO-Apply (Money-nah SECDEF refresh_user_stats).

## 10. Proof-Plan
`454-ranking-ssot.txt`: force-rollback (0 divergenz + trigger-propagation) + post-apply Divergenz-Query=0 + pg_get_functiondef scout_scores unverändert.

## 11. Scope-Out (Residual → getrackt)
- **Path 2 Säuberung:** Surfaces (social/club/mentor) direkt auf scout_scores + user_stats-Score-Spalten droppen (echte physische SSOT statt Projektion).
- **D-11:** totes `bescout_scores` + `award_score_points` + `score_events` löschen.
- tier-Schwellen-Tuning (5000/3000… auf scout_scores-Skala) = Reward-Frage (D109-Klasse).

## 12. Stage-Chain
SPEC → IMPACT (skipped: kein Service/FE; Surfaces lesen user_stats stabil) → BUILD → PROVE (force-rollback) → REVIEW → CEO-Apply → LOG.

## 13. Pre-Mortem
- „smallint-Overflow stille Truncation" → Edge#3 + Open-Q, Daten-Check beim BUILD.
- „Trigger macht refresh langsam" → Trigger ist leichtes 1-Row-UPDATE, nicht das schwere refresh.
- „refresh_user_stats PATCH-AUDIT-Drift" → live functiondef Baseline, nur 3 Var-Quellen + tier-Helper-Extraktion, Rest byte-diff-geprüft.
- „Projektion driftet" → Trigger auf scout_scores deckt ALLE Schreibpfade ab (award_dimension_score/reset/create).
- „Geld-Pfad berührt" → scout_scores 0 Edits, AC4/AC5 asserten.
