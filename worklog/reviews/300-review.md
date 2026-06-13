# CTO Review: Slice 300 — S5 Test-Confidence Audit + Ratchet-Guard

**Reviewer:** reviewer-Agent (cold-context, read-only) · **Datum:** 2026-06-13 · **Time-spent:** ~14 min

## Verdict: PASS

## Spec-Coverage
- [x] AC-1…AC-8 alle verifiziert (report / --check / synthetic-fail / no-baseline / wiring / baseline-truth / 2 fixes / audit-doc).
- [x] Counts unabhängig grep-verifiziert: 5 placeholders (4 bug-regression + 1 useCommunityActions) + 1 skip (ProfileView). Beide Fix-Files enthalten KEIN `expect(true)` mehr (Kommentar-Miscounting-Bug nicht reintroduced).

## Risiko-Validierung (7 Punkte)
1. **NotificationDropdown nicht tautologisch — BESTÄTIGT.** Echtes Component-Verhalten: `open`→mounted-effect→portal-guard→`role="dialog"`; `noNew` an `notifications.length===0`-Branch gebunden (würde bei loading/list-Branch failen); `closed`→null-guard. Nur heavy child + uncalled service gemockt.
2. **Count-Korrektheit — BESTÄTIGT.** 5+1, Kommentare scrubbed.
3. **Ratchet — BESTÄTIGT.** strict `>`, no-baseline→write-initial, fresh `new RegExp` per File (kein lastIndex-Falle, #49).
4. **Klassifikation ehrlich — BESTÄTIGT.** CONDITIONAL fire `expect(true)` nur im empty-dataset-Escape; echte Asserts bei Daten. WEAK läuft Hook real. HONEST-SKIP korrekt markiert. Nichts whitewashed.
4b. **Anti-Pattern #1 — BESTÄTIGT.** Echtes Gate (pre-commit Step 6 exit 1).
5. **Wiring (D54) — BESTÄTIGT.** package.json + pre-commit Step 6 + allowlist ×2.
6. **Regex — AKZEPTABEL.** `.only`/`fit` untracked (0 occurrences, vitest CI-allowOnly fängt) → siehe Finding #1, in-slice geschlossen.
7. **ResearchCard — BESTÄTIGT.** nur no-op gelöscht, callColor/categoryColor grün, tautologisch → S5-F-4.

## Findings
| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NITPICK | test-confidence-check.ts:36 | `.only`/`fit`/`describe.only` (FOCUS — droppt andere Tests silent) untracked, arguably schlimmer als `.skip`. 0 Vorkommen heute, vitest CI-allowOnly mitigiert. | **In-Slice übernommen:** SKIP_RE um `.only`/`fit` erweitert (focus = false-confidence-Achse). |
| 2 | NITPICK | s5-test-confidence.md S5-F-2 | bug-regression CONDITIONAL `test.skip()` mit Reason läse sauberer. | P3-Backlog, korrekte Disposition. |

## Positive
- Kommentare bewusst von Literal-`expect(true)` befreit (Awareness des früheren Miscounting-Bugs).
- 3. saubere Instanz des #49-Ratchet-Templates (konsistent mit 299).
- Ehrliche Taxonomie: WEAK/CONDITIONAL frozen statt fake-migriert, P3-Backlog S5-F-1..4.
- Render-Smoke genuinely behavior-bound, kein Checkbox-Test.

## Post-Review Aktionen (Primary-Claude)
- Finding #1 übernommen: Guard trackt jetzt auch `.only`/`fit`/`xtest` (focus-marker), Baseline re-frozen, --check grün.
- patterns.md #49 Cross-Ref ergänzt (focus-marker = komplementäre Achse zu skip/placeholder).
- Finding #2: P3-Backlog (S5-F-2).

## Summary
Sauberer, gut-gescopter Enforcement-Slice. Alle 8 ACs, Counts unabhängig verifiziert, NotificationDropdown-Test behavior-bound, Klassifikation ehrlich, D54-Wiring vollständig. Ship it.
