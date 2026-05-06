# Slice 277 — Cold-Context-Review

**Reviewer:** reviewer-agent (Cold-Context, Read-Only)
**Datum:** 2026-05-06
**Verdict:** PASS
**Time-Spent:** 18 min

---

## Summary

Slice 277 fixt einen recurrent GW-Drift-Bug in `gameweek-sync/route.ts`. 2 Skip-Branches (`already_complete` + `no_past_fixtures`) returnten früh ohne `advance_gameweek` aufzurufen → `clubs.active_gameweek` und `leagues.active_gameweek` blieben auf der gerade fertigen GW kleben.

**Implementation:**
- `advance-helpers.ts` (NEU) — pure decision helper `shouldAdvanceAfterSkip()`
- `__tests__/advance-helpers.test.ts` (NEU) — 13 Tests in 6 Edge-Case-Kategorien (über-erfüllt AC5: 6 erforderlich)
- `route.ts` — 2 Skip-Branches modifiziert + neuer `maybeAdvanceAfterSkip` orchestration helper

**Verdict: PASS** ohne blocking findings.

---

## Findings

### Low

**L-01: allLeagueClubIds.length===0 implicit silent skip (route.ts:382)**

Pre-Check `if (nextGw <= maxGameweeks && allLeagueClubIds.length > 0)` macht Saisonende-Skip + missing-clubs-Skip beide implizit. Bei `allLeagueClubIds.length === 0` wird `hasFixturesAtNextGw=false` und Helper returnt `no_next_fixtures` — Datenfehler (Liga ohne Clubs) wird als „leere GW" maskiert.

Praktisch unmöglich weil clubsToProcess.length>=1 hart vorher erzwungen wird. Optional: explicit `missing_league_clubs` log-step zwischen Z.380-383.

**Fix:** Nicht-blocking, kann Backlog werden.

**L-02: runStep returnt {result, error}, throw nicht propagiert (route.ts:407)**

`runStep('advance_after_skip')` catched alle errors und returnt `{result: null, error: 'msg'}`. Bei `clubs.update` success + `leagues.update` fail bleibt Zwischenstand inkonsistent (clubs schon advanced, leagues noch alt). Identisch zu Phase B Z.1721-1738 — gleiches Risiko, gleiches Pattern.

clubs.active_gameweek = SSOT für Per-Liga (Slice 251 Wave 1), leagues.active_gameweek driftet bis nächster Cron-Lauf morgen.

**Fix:** Spec Sektion 13 Worst-Case B behandelt das — Mitigation „existing pattern". Akzeptabel.

### Nits

**N-01: Test über-erfüllt AC5** (advance-helpers.test.ts) — 13 Tests statt 6 erforderlichen. Inkl. Robustness (invalid input) + Boundary (letzter regulärer GW). Wertvoll als Vertragsdokumentation.

**N-02: DB-Log-Asymmetrie zur Phase-B-Behandlung** (route.ts:407-423) — Phase B logt advance_gameweek nur in steps[]-Array, Slice 277 logt zusätzlich in cron_sync_log. Bewusste design-decision für Drift-Detection-Auditierbarkeit (Spec Sektion 8 Smoke-Query).

**N-03: PostgREST-Limit-Pattern leicht abweichend von errors-infra.md** — Code nutzt `.select('id').limit(1)` statt empfohlenes `.select('id', {count: 'exact', head: true})`. Beide cap-safe und semantisch korrekt. Kein Drift.

---

## Self-Assessment-Gap (was Primary-Claude potentiell nicht sah)

1. **Pure Helper Architektur ist ein win.** Die Trennung in `advance-helpers.ts` (pure, side-effect-frei, voll getestet) vs. `route.ts maybeAdvanceAfterSkip` (orchestration) ist eine nicht-triviale Verbesserung gegenüber Phase B (Z.1598-1616), wo Decision + Side-Effects monolithisch in 22 Zeilen gebündelt sind. **Pattern-Promotion-Kandidat:** „Pure decision helper + thin orchestration" für Cron-Branch-Logik.

2. **Idempotency bei Re-Run** ist subtle korrekt aber nicht dokumentiert: Wenn Cron 06:00 advance auf 33 macht, Cron 06:05 erneut läuft → `clubs.active_gameweek = 33` → `get_active_gw` liefert activeGw=33, nicht 32 → bereits-advancede Pfad wird nicht erneut betreten. **Implizit idempotent durch State-Maschine.** Slice 277 sollte das als Inline-Comment dokumentieren.

3. **errors-infra.md Pattern-Match 1:1** erwartet `.select('id', {count: 'exact', head: true})`, Code nutzt `.select('id').limit(1)`. Equivalent korrekt, kein Drift-Risk. Optional Pattern-Doc-Update.

4. **Spec IMPACT-Skip-Begründung erwähnt nightly-audit nicht** — workflow `nightly-audit.yml` ist sekundärer Konsument der drift-detection. Slice 277 reduziert advance_after_skip-drift-Counter — erwünschtes Outcome.

5. **Atomic-Write Race-Window** ~50ms zwischen clubs-update und leagues-update. Akzeptabel weil clubs.active_gameweek = SSOT für Per-Liga-Detection.

---

## Conclusion

Implementation ist sehr sauber, übersteigt Spec-Anforderungen (13 Tests statt 6), und wendet etablierte BeScout-Pattern (runStep + dual-write + pure-decision-helper) konsequent an.

**PASS ohne Findings die vor Commit gefixt werden müssen.**

Empfehlung: Inline-Comment für Idempotency-Garantie hinzufügen (Self-Assessment #2) — optional, nicht-blocking.
