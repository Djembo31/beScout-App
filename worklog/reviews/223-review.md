# Slice 223 Self-Review (D35 — XS scripts-only Pattern-Wiederholung)

**Reviewer:** Self (Primary-CTO) per D35
**Datum:** 2026-04-27
**Slice:** 223 — `scripts/audit-stale-check.ts` D48-Catcher automatisiert

## Verdict: PASS

D35-Self-Review-Begründung: XS-Slice, scripts-only (`scripts/audit-stale-check.ts` neu, keine src/-Änderungen, kein UI, kein Money-Path, kein i18n, kein RPC, kein Schema). Pattern-Wiederholung von Slice 209 (manueller D48-Audit-Stale-Check) auf Tool-Variante. Reviewer-Agent-Overhead > Catch-Probability für diese Slice-Klasse. Punch-List-Edits (F-07/F-11 Status-Updates) sind Daten-Edits ohne Code-Risiko.

## Acceptance-Audit (6/6 grün)

| AC | Status | Evidence |
|----|--------|----------|
| AC-1 HAPPY: Skript läuft erfolgreich | ✅ | `npx tsx scripts/audit-stale-check.ts` exit 0 nach Punch-List-Cleanup, Markdown-Report + stdout-Summary generiert |
| AC-2 REGRESSION: 0 stale-candidates | ✅ | Initial 2 stale (F-07, F-11) — beide echte D48-Drifts. Inline-Fix → Run 5 zeigt 0 candidates exit 0 |
| AC-3 DOMAIN-COVERAGE: 4 Domains | ✅ | stdout: "Domains processed: Fantasy-Scoring, UX-States, FM-Mechanics, Brand-Coherence" |
| AC-4 ID-VARIANTS: case/hyphen-Insensitivity | ✅ | `buildIdRegex` generiert für UX `4` Variants `UX 4`, `UX-4`, `ux 4`, `ux-4`, `UX 4`. Gefangen z.B. log.md L1431 "F-07" + "fm 2.1" mixed-case. |
| AC-5 MARKDOWN-REPORT: Detail je Stale | ✅ | `worklog/audits/audit-stale-2026-04-27.md` enthält pro Candidate Section mit ID + Domain + Punch-Line + log.md Match-Lines + Snippets |
| AC-6 NPM-SCRIPT: pnpm run audit:stale | ✅ | package.json Eintrag funktioniert, gleicher Output wie direkter Aufruf |

## Findings

**Keine.** Folgende Edge-Cases wurden iterativ gehealt während BUILD:

1. ✅ Conservative-Match Initial-Run (26 candidates) — alle ID-Mentions als stale gemeldet
2. ✅ Same-Line CLOSE_SIGNAL Filter (14 candidates) — multi-ID-Zeilen leakten close-signal cross-clause
3. ✅ Clause-aware split per `[.;—–]` (3 candidates) — UX 20 Aggregat-Line `done / 7 open` als false-positive
4. ✅ Tightened CLOSE_SIGNAL `**Closed**`/`Slice N ✓`/`→ done`/`✓`/`LIVE` (2 candidates) — beide echte D48-Drifts

## Bonus-Discovery

Tool fand 2 echte D48-Drifts die Slice 209 manueller Cleanup verpasst hatte:
- F-07 Differentials-% — Slice 195e closed (log.md L1431) aber Punch-List `in-progress`
- F-11 Captain-Pick-Rate — Slice 195e closed (gleiche Zeile) aber Punch-List `in-progress`

Inline-Fix mit Status-Update auf `done` + Slice 195e ✓ Markierung. Punch-List jetzt 100% sync.

## Risiken (im Spec dokumentiert)

| # | Risk | Mitigation |
|---|------|------------|
| 1 | Future Punch-List-Format-Drift bricht Parser | Tolerant-Parser try/skip pro Row; Test-Run nach jedem Punch-List-Edit |
| 2 | False-positive-Flood durch Conservative-Match | Conservative-then-tightened Iteration im Proof dokumentiert; Mensch entscheidet via Snippet-Context |
| 3 | False-negative durch zu strikten CLOSE_SIGNAL | Aktuell `**Closed**`/`Slice N ✓`/`→ done`/`✓`/`LIVE` — deckt alle log.md Patterns ab. Bei neuen Close-Patterns: Erweitern. |

## Pattern-Compliance

- ✅ `decisions.md` D48 — Audit-Stale-Catcher operationalisiert (6. Iteration)
- ✅ `decisions.md` D35 — Self-Review für Trivial-Pattern-Wiederholung gerechtfertigt
- ✅ `errors-infra.md` Bundle-Budget-Gate — Exit-Code-Pattern für CI-Gate-Ready
- ✅ `_TEMPLATE.md` XS-Mindest-Pflicht 6 Sektionen — Spec hat 13 Sektionen + Compliance-Check + Open-Risiko (über-erfüllt)
- ✅ Workflow.md SPEC-Stage Code-Reading-Liste ≥ 3 Items für XS — 4 Items (Punch-List + log.md + check-bundle-size.ts + i18n-coverage.js)

## Knowledge-Flywheel

D48 Pattern wurde in 5 manuellen Slices empirisch validiert (200a/200b/203/206/209). Slice 223 ist 6. Iteration als Tool-Variante — automatisierte Detection statt 30-min-Manual-Audit pro Sweep. Future-Slices: `pnpm run audit:stale` als 30-Sec-Check vor Polish-Sweep-Wave-Planning.

## Zusammenfassung

PASS ohne REWORK-Bedarf. Tool funktioniert wie spezifiziert, fand sogar 2 echte Drifts die manueller Cleanup übersehen hatte (Bonus-Discovery validiert ROI). Iteration-History ist im Proof-File transparent dokumentiert. Negative-Test mutate-then-revert verifiziert Exit-Code-Switch. Knowledge-Flywheel D48 → 6. empirische Iteration.

**Next-Action:** Commit + active.md → idle. Future Wave-3-Backlog: `scripts/type-truth-audit.ts` (D43/D49 gleicher Stil), Stop-Hook Phase-Tracker-Auto-Update.
