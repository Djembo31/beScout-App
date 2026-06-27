# Review — Slice 429 (finalizeGameweek entkoppeln: Score ≠ Advance)

**Reviewer:** Cold-Context reviewer-Agent · **Datum:** 2026-06-28 · **Time-spent:** 9 min · Money-NEUTRAL

## Verdict: PASS

Chirurgische, money-neutrale Entkopplung (ein Advance-Write raus, Money-Path byte-identisch) mit korrekt invertiertem Regression-Test und truthful i18n. Consumer vollständig (2, beide UI), Cron-Advance-Pfad intakt.

## Findings

| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | NIT | scoring.admin.ts:215 | `adminId?`-Param ungenutzt nach Removal (war pre-existing). | belassen (Scope-Out) |
| 2 | NIT | scoring.admin.ts:208-211 | JSDoc-Header sagte noch "advance GW". | **gefixt** → "score + create next GW events, KEIN Advance (429)" |
| 3 | NIT | scoring.admin.ts:294 | Kommentar "Step 2: Finalize (Score + Advance)". | **gefixt** → "Score + Clone — kein Advance" |

Keine CRITICAL/REWORK/CONCERNS. Alle NITs Doc-Drift.

## Prüfpunkte (faktenbasiert bestätigt)

1. **Money-Neutralität:** ✅ nur Advance-Block entfernt; scoreEvent/score_event-RPC/Notifications/event-close/createNextGameweekEvents/Cache-Bust unberührt (grep: setActiveGameweek nur im Kommentar).
2. **nextGameweek-Feld:** ✅ bleibt gw+1; Consumer = AdminGameweeksTab (re-fetch jetzt) + SpieltagTab (nutzt es nicht); kein übersehener.
3. **Decouple fixt Orphan-Bug:** ✅ Cron-Pfad (`src/app/api`) nutzt finalizeGameweek/simulateGameweekFlow NICHT — eigene Advance-Logik (set_active_gameweek direkt). Nur manueller UI-Pfad betroffen.
4. **i18n-Truthfulness:** ✅ finalizeStep3 jetzt wahr; Step1 (score)+Step2 (clone) bleiben wahr; JSON valide (S399); kein Roh-Key-Leak.
5. **AdminGameweeksTab re-fetch:** ✅ getActiveGameweek non-throw (428-Vertrag), im try/catch; DB-Wahrheit (S368b).
6. **SpieltagTab handleFinalize:** ✅ nutzt eventsScored, unberührt; Confirm-Dialog kohärent.
7. **Clone ohne Advance:** ✅ harmlos prepare-ahead.

## AC-Coverage
AC-01 ✅ (Test invertiert) · AC-02 ✅ · AC-03 ✅ (money-neutral) · AC-04 ✅ (re-fetch) · AC-05 ✅ (tsc+119 Tests).

## One-Line
Chirurgische money-neutrale Entkopplung mit scharfem Regression-Guard + truthful i18n — ein Senior merged das.
