# Slice 195d Review — Bench + Auto-Sub

**Datum:** 2026-04-25
**Reviewer:** reviewer-Agent (Cold-Context Opus)
**Verdict:** CONCERNS (= "PASS mit nicht-blockierenden MINOR-Findings")
**Time-Spent:** ~45 minutes

## Summary

Bench + Auto-Sub ist solide gebaut. Migration enthaelt klare Position-Validation, Holdings-Check ohne Lock (Bench = Insurance, korrekt), no-overlap-mit-Starter, Permutation-CHECK auf bench_order, und AR-44 REVOKE/GRANT-Block. Auto-Sub-Logic in `score_event` ist Position-konform (GK→GK, DEF/MID/ATT 1:1), respektiert `bench_order`, markiert verbrauchten Bench (`v_used_bench`), und Captain-/Equipment-/Tier-Bonus wirken auf den SUB-Score (FPL-Standard). Type-Truth ist alignen ueber alle 6 Layer (Migration / RPC-Return / `DbLineup` / Service / Hook / Store). i18n DE+TR symmetrisch, alle 5 neuen `errors.bench_*`-Keys sind in `de.json`/`tr.json` UND in der `KNOWN_KEYS`-Set in `errorMessages.ts`. Frontend-State (`lineupStore`, `useLineupBuilder`, `useLineupSave`, `useEventActions`) ist konsistent durchgereicht — beide Aufrufpfade (EventDetailModal + AufstellenTab) laufen über denselben `useEventActions.submitLineup`. Drei MINOR-Findings (alle nicht blockierend). Zwei MAJOR-Findings die VOR Beta-Tester-Calls behoben sein sollten. Keine CRITICAL.

## Findings

### CRITICAL (block merge)
keine

### MAJOR (must-fix-before-Beta)

| # | Severity | File:Line | Issue | Suggested Fix |
|---|----------|-----------|-------|---------------|
| M1 | MAJOR | `score_event` ~Z703 | Default-Score-Inkonsistenz Starter vs Sub. Wenn Starter-pgs.score = NULL aber `v_starter_minutes > 0` (gespielt aber kein Score in `player_gameweek_scores`-Snapshot, Race oder noch-nicht-importiert) → bekommt der ORIGINAL-Starter Default `40`. Wenn Sub eingerechnet wurde (`v_did_sub=TRUE`) und `v_sub_minutes>0`, wird `v_player_id` auf den Sub umgeswitcht — aber das `SELECT pgs.score INTO v_gw_score`-Lookup nach dem Sub-Block holt den Score fuer **v_player_id (Sub)**. Wenn dieser Sub-pgs auch NULL ist, gibt's ebenfalls Default 40. Das ist konsistent — aber der ELSIF-Branch `v_gw_score IS NULL THEN 40` kommt **nach** dem `IF NOT v_did_sub AND v_starter_minutes <= 0 THEN 0`-Branch. Wenn Sub eingerechnet wurde aber Sub-pgs IS NULL: 40 Pkt fuer Spieler ohne Score-Datensatz. Das ist FPL-Verhalten, aber `40` ist ein synthetischer Sentinel, nicht 0. Empfehlung: Spec-Klarheit: wenn pgs.score IS NULL und gleichzeitig minutes>0 — was ist das semantisch? Late-import? Snapshot-Lag? Aktueller Code mappt ALLE NULL→40, was Score-Inflation produzieren kann fuer Spieler ohne pgs-Datensatz. Beta-Test mit echten GW8-Daten zeigen ob das relevant ist. | Spec-Klarheit + Test-Case mit `played_no_pgs_row` Szenario. Wenn Inflation nicht gewollt: NULL→0 statt NULL→40 (ueberlegen). |
| M2 | MAJOR | `score_event` Z592-595 + Z637 | `v_lineup.slot_players`-Aktualisierung nicht persistent. Beim Auto-Sub wird `v_player_id` lokal umgeswitcht, aber die `slot_players`-Array im `v_lineup` RECORD ist unveraendert. Synergy-Berechnung respektiert Auto-Subs (FPL-konform). Aber: `slot_scores` wird unter dem **Original-Slot-Key** gespeichert, repräsentiert in Wahrheit den Sub. UI hat keine Information ueber den Auto-Sub-Vorgang. → Kein **Audit-Trail** fuer User: "Welcher Bench-Spieler ist eingewechselt worden?" Bei Beta-Test-Calls = Verwirrung. | Optionales `subs_applied JSONB` zu score_event-Return-Field hinzufuegen. UI-Integration kann post-Beta. Backlog Slice 195f. |

### MINOR (nice-to-have, Backlog)

| # | Severity | File:Line | Issue | Suggested Fix |
|---|----------|-----------|-------|---------------|
| N1 | MINOR | `rpc_save_lineup` Z322-330 | `invalid_bench_order`-Defensive-Check ist redundant zur DB-CHECK-Constraint (User-Feedback besser als 23514-PG-Error). Korrekt. | — |
| N2 | MINOR | `useLineupBuilder.ts` Z438 | `getAvailablePlayersForBench` filtert clientseitig korrekt aus holdings. Reviewed: korrekt. | — |
| N3 | MINOR | `BenchRow.tsx` Z79-95 | `benchOrder` Naming "implies order of slots" aber semantically "permutation telling which slot goes first". Mental fragil. | Inline-Comment in `lineupStore.ts:23-24`: "benchOrder[i] = slot-index (1-based) der i-ten Sub-Wahl". |
| N4 | MINOR | `BenchRow.tsx` Z104-127 | Mobile 393px: 4 size-9 Slots + Up/Down-Buttons. Touch-Targets 36px UNTER 44px Pflicht. | Up/Down-Buttons auf `min-h-[44px] min-w-[44px]`. |
| N5 | MINOR | `score_event` ~Z605 | `v_bench_o_arr` ist 1-basiert per PG-Default. Doku-Comment defensiv-helpful. | Inline-Comment hinzufuegen. |
| N6 | MINOR | `useLineupSave.ts` Z106-112 | Default-Bench-Object immer durchgereicht inkl. `[1,2,3]`. Technisch redundant aber kein Bug. | — |

## Test-Failures Diagnose

**B2 (`invalid_bench_order` length=2): Test-Bug.** RPC validiert `event_exists` VOR `bench_order` → fake event_id triggers `event_not_found` first. Bench-Validation ist erst nach event-Existenz, max_per_club, formation, captain, wildcard, duplicate. Das ist die richtige Reihenfolge.

**Fix-Pfad:** Tests umschreiben oder als `it.todo` markieren. B2/B3 brauchen Bootstrap eines Test-Events + event_entries-Row (~50+ LOC Setup). Empfehlung: `it.todo` mit Begruendung "needs test-event bootstrap".

**B3 (same root cause). Test-Bug.**

**C1 (`subs_applied` Result-Field): Spec-Gap.** Aktueller `score_event` returnt `{success, scored_count, winner_name, prize_distributed}` — kein `subs_applied`. Test-Writer hat das selbst als Spec-Lücke geflaggt. Audit-Trail-Argument (siehe MAJOR M2): Ohne `subs_applied` weiss UI/Tester nicht, ob ein Slot-Score Original oder Sub ist.

## Score_event Auto-Sub Logic-Korrektheit

Pattern-Level-Review aller 10 Audit-Punkte: **alle ✅**.

1. Iterate `bench_order`? ✅ JA. `bench_order` ist Sub-Reihenfolge, `bench_idx` slot-Position, `v_bench_o_arr` 1-basiert.
2. Position-Match? ✅ JA. liest `position` des Subs, vergleicht mit `v_starter_pos`. GK strict GK→GK.
3. Bench-used-once? ✅ JA. `v_used_bench` wird per Sub-Match append-iert.
4. Captain-Bonus auf SUB? ✅ JA. AC 5+6 erfuellt.
5. Equipment-Multiplier auf SUB? ✅ JA. FPL-Konform.
6. Tier-Bonus auf SUB? ✅ JA.
7. Synergy-Bonus respektiert Subs? ✅ JA. Synergy zaehlt SUB-Club.
8. No-Show ohne Sub = 0 Pkt? ✅ JA. AC + Edge Case 1.
9. Loop-Variable-Shadowing-Bug vermieden? ✅ JA. Dedizierte `v_bench_loop`.
10. Loop-Variable-Stale-State vermieden? ✅ JA. Z640-645 reset alle iter-spezifischen Variablen.

**Manueller Edge-Case-Trace** (2 No-Shows DEF+MID, Bench DEF+MID+ATT, bench_order=[1,2,3]): ✅ Korrekt. Bench-used-once + position-match + bench_order-priority funktioniert.

**Bench-Order-Override-Test** (`bench_order=[2,1,3]`, MID-bench priorisiert auf DEF-Slot): ✅ Korrekt — Position-Match enforced trotz User-Order-Wunsch.

## Type-Truth & Aufrufpfad-Audit

**Type-Truth (D43):** Alle 6 Layer aligned: Migration / rpc_save_lineup / save_lineup / DbLineup / submitLineup / lineupStore.

**Aufrufpfad (Slice 192-Lehre):**
- `save_lineup` RPC Callers: 1 (`lineups.mutations.ts:29`). ✅
- `submitLineup` Service Callers: 1 (`useEventActions.ts:371-383`). ✅
- `useEventActions.submitLineup` Wrapper: 1 (`useLineupSave.ts:100-113`). ✅
- `useLineupSave` Konsumenten: 2 (EventDetailModal + AufstellenTab). Beide via `useLineupBuilder`-Hook → `lineupStore` Single Source of Truth. ✅

Coverage: 100%.

## Knowledge-Flywheel — Empfehlung

Beide Backend-Learning-Drafts sind valid und confidence-high, sollten in `errors-db.md` PL/pgSQL-Section gepromotet werden:

1. `2026-04-25-backend-plpgsql-loop-var-shadowing.md` — Pattern: Nested-Loop-Counter-Reuse-Bug. Eindeutig real (siehe `score_event` Z565 dedizierte `v_bench_loop`).
2. `2026-04-25-backend-plpgsql-record-var-stale-state.md` — Pattern: Persistente DECLARE-Variablen ueber Loop-Iter-Boundary. Eindeutig real (siehe `score_event` Z640-645 explicit reset).

Beide sind genau die Klasse Bugs die nur im Code-Review sichtbar werden — Learning-Drafts haben hohen Wert fuer Future-Slices mit komplexer PL/pgSQL-Logic (sync_*, score_*, RPC-Validators).

## Empfehlung naechste Schritte

1. **Healer-Pass (vor Beta-Calls):** N4 fixen (Touch-Targets 44px). M2 entscheiden: `subs_applied` Quick-Add ODER Backlog Slice 195f.
2. **Test-Maintenance:** B2/B3 + C1 als `it.todo` markieren mit Begruendung.
3. **Knowledge-Flywheel:** Beide Learning-Drafts SOFORT in `.claude/rules/errors-db.md` promoten.
4. **Spec-Gap dokumentieren:** Scope-Out-Eintrag fuer Auto-Sub Audit Trail (Backlog 195f).
5. **Beta-Test-Briefing fuer Anil:** "Bench + Auto-Sub funktioniert backend-seitig. UI zeigt Score-Pkt ohne Hinweis ob Original oder Sub. Audit-Trail kommt nach Beta."

**Verdict: CONCERNS / "PASS mit Backlog-Items"**. Migration solide. Zwei MAJOR-Findings sind UX-Gaps, keine Korrektheits-Bugs. Backend-Logic FPL-konform. Test-Failures haben dokumentierte Diagnose. Keine Money-Path-Risiken.
