# Review — Slice 345 (FRE-2: Follow zählt als Einstiegssignal, +5)

**Reviewer:** Cold-Context reviewer-Agent · **Datum:** 2026-06-18 · Money-nah.

## Verdict: PASS

Keine blockierenden Findings. 2 Nitpicks, beide bewusst + dokumentiert.

## Findings

| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | NITPICK | Migration §1 | `calculate_fan_rank` ohne `SET search_path` (Baseline hatte auch keinen). Bewusst byte-identisch zur Live-Baseline gehalten (PATCH-AUDIT-Prinzip: nichts Unrelated ändern). | akzeptiert |
| 2 | NITPICK | Money-Tally | +5 kann an Tier-Grenze Poll-Stimmgewicht heben. In Spec §2/Edge#3 + Migration-Kommentar als gewollt + monoton dokumentiert; Abo-Floor (D92) bleibt. | akzeptiert |

## One-Line
Ja — ein Senior merged diese Money-nahe Migration so: Baseline vollständig erhalten, nur additiver +5-Block, AR-44-Grants korrekt, Trigger best-effort + recursion-frei, Abo-Floor unberührt, Live-Smoke grün.

## Belege
- **PATCH-AUDIT:** Baseline-Body vollständig erhalten (Event/SC/Abo/Community/Streak/ELO/Tier/UPSERT alle da), NUR 6.6-Block additiv. Return-Shape unverändert (5 Top-Level-Keys).
- **AR-44:** REVOKE PUBLIC+anon / GRANT authenticated vorhanden. Trigger-Funktion = AR-44-Ausnahme (kein REVOKE nötig). Live-Verify: anon=false, auth=true.
- **D92/Money:** cast_community_poll_vote unberührt (GREATEST/Abo-Floor intakt, live verifiziert). +5 wirkt nur auf fanrank-Seite, monoton — keine Regression bezahlter Perks.
- **Trigger:** best-effort (EXCEPTION WHEN OTHERS → NULL) → (Un)Follow nie blockiert. AFTER + RETURN NULL korrekt. DELETE nutzt OLD. Recursion-frei (calculate_fan_rank schreibt nur fan_rankings, nie club_followers).
- **Smoke:** before 42.68 → follow 47.68 (Trigger + RPC) → unfollow 42.68; delta 5.00; unfollow_back true. 0 Persistenz (RAISE-Rollback).

## Knowledge-Capture (bei LOG in errors-db.md aufnehmen)
**`calculate_fan_rank`-Body lebt NUR live.** Die Migrationsdatei `20260330_streak_benefits_rpcs.sql` ist stale (inline `CASE >= 14 THEN 10.0` statt `fn_get_streak_elo_boost`, „DPC SCORE" statt „SC SCORE"). → Bei künftigem Replace IMMER `pg_get_functiondef` als Baseline (D87), NIE die 20260330-Datei. Slice 345 hat das korrekt gemacht.

## Healing
NIT#1 + NIT#2 non-blocking, beide dokumentiert. Kein Rework.
