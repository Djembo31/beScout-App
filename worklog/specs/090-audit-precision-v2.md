# Slice 090 — silent-fail-audit Precision v2

## Ziel (1 Satz)
False-Positives eliminieren + neuen Pattern (`Promise.allSettled` ohne `logSilentRejects`) ergänzen — Audit wird trustable genug um als Quality-Gate zu dienen.

## Betroffene Files

| Path | Fix |
|------|-----|
| `scripts/silent-fail-audit.ts` | Pattern 1 `hasChunk`-Regex um `\.range\(` erweitern + Pattern 7 NEU: `Promise.allSettled` ohne `logSilentRejects` |
| `worklog/optimize/silent-fail-precision.md` | Baseline v2 Messung append |
| `.claude/rules/common-errors.md` | Section 1 Audit-Doc aktualisieren (Pattern-Count 6→7) |

## Root-Cause / Warum jetzt

### Fix 1: Multi-line `.range()`-awareness für Pattern 1
Aktuell: `hasChunk = /CHUNK|chunk|batch/i.test(ctx)`. Context umfasst idx-2 bis idx+3.
- Slice 087 Fix hat `.in('club_id',...).range(offset, offset+PAGE-1)` in `.range()`-while-loop — korrekt, aber `.range` ist auf nächster Zeile.
- Script flaggt Line 1254 (gameweek-sync) als HIGH obwohl chunk-pattern da ist (via `.range`).
- Fix: `hasChunk = /CHUNK|chunk|batch|\.range\(|\.limit\(/i.test(ctx)` — `.limit(` auch, weil identisches paging-Signal.

### Fix 2: Promise.allSettled Pattern (NEU)
Aktuell: Pattern unbekannt. 20 allSettled-Stellen nie erkannt — weder als silent-fail noch als resolved.
- Nach Slice 089 sind 16 Stellen mit `logSilentRejects` instrumentiert, 4 mit `Promise.all` ersetzt (Slice 087).
- Neuer Pattern 7: `Promise.allSettled` ohne `logSilentRejects` im nächsten 10-Zeilen-Block = HIGH.
- Skip: `*.test.ts`, `*.spec.ts`, `silentRejects.ts` (Util-doc mentions the pattern literally).

### Messung / Erfolgskriterium
Vor-Baseline (Audit 2026-04-20 nach Slice 089):
- Total: 211
- HIGH: 111
- MEDIUM: 100

Erwartung nach v2:
- Multi-line `.range()` eliminiert ca. 2-4 false-positive HIGH (mindestens gameweek-sync:1254 + footballData:357-361)
- Promise.allSettled Pattern findet 0 HIGH (alle 16 Stellen haben logSilentRejects nach 089)
- Total: -2 bis -4
- HIGH: 107-109 (von 111)
- Precision: +2-3 Prozentpunkte (von 53% → ~55%)

## Acceptance Criteria

1. `scripts/silent-fail-audit.ts`:
   - Pattern 1 `hasChunk` beinhaltet `\.range\(|\.limit\(` — Slice 087 Fix-Stellen verschwinden aus Liste
   - Pattern 7 NEU: `Promise.allSettled` ohne `logSilentRejects` in `lines.slice(idx, idx+10).join(' ')` → HIGH (src/app/api/ src/lib/) oder MEDIUM (andere). Skip für Test/Spec/Utility-Files.
   - Docstring-header aktualisiert: "Patterns scanned: 1..7"
2. Audit re-run nach v2 → HIGH-count sinkt um mind. 2.
3. Promise.allSettled-Pattern in Report zeigt 0 findings (alle instrumented).
4. `worklog/optimize/silent-fail-precision.md` append mit Baseline-Comparison.
5. common-errors.md §1 sprachlich adjustiert ("7 Patterns" statt "6 Patterns").
6. `npx tsx scripts/silent-fail-audit.ts` läuft ohne TS-Errors.

## Edge Cases

- `Promise.allSettled` in JSDoc-Comment (wie `silentRejects.ts`) → skip via `includes('silentRejects')` file-check.
- Nested `.range()` in zurueckliegender Line (nicht kontext) → bereits abgedeckt durch 2-Line-Backward-Context.
- Files die `Promise.allSettled` UND `logSilentRejects` in separaten Funktionen haben (theoretisch) → beide in 10-Line-Block gefangen. OK.
- Edge: `Promise.allSettled` als String-Literal ("Promise.allSettled" in Doc/Log) in anderem File → unlikely, aber trivial-false-positive gering.

## Proof-Plan

- vor-Baseline: aktueller Report `worklog/audits/silent-fail-2026-04-20.md` (HIGH=111)
- nach-Baseline: Re-Run erzeugt frischen Report (HIGH sinkt auf <=109)
- diff zwischen beiden in `worklog/optimize/silent-fail-precision.md` append: Precision v2 Section
- `grep-vergleich`: `gameweek-sync:1254` NICHT mehr in Report
- `Promise.allSettled`-Pattern Report-Section zeigt 0 findings

## Scope-Out

- Scripts-Ignore-Liste (MEDIUM in scripts/ filtern) — wäre Precision v3
- `.catch(() => null)` Pattern erkennen — eigener Slice
- `isMoneyPath`-Threshold / weighting verfeinern — eigener /optimize-Iteration
- Audit-Baseline-CI-Gate (fail PR bei HIGH-Increase) — eigener Slice (DevOps)
