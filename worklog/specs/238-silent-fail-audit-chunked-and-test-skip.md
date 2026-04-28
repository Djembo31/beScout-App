# Slice 238 — silent-fail-audit Chunked-Detection + Test-File-Skip

**Status:** SPEC · **Größe:** XS · **Slice-Type:** Tool · **Scope:** CTO · **Datum:** 2026-04-28

> Triage echter Drift im silent-fail-audit-Baseline (93 HIGH / 103 MEDIUM): +1 HIGH `wallet.ts:241` ist FALSE-POSITIVE (Code IST chunked, Audit-Heuristik findet for-loop-CHUNK 8 Zeilen oben nicht); +2 MEDIUM `__tests__/club-most-owned-batch.test.ts:64,286` sind Test-File-Mocks (kein Production-Risk, Pattern 4 hat keinen Test-Skip wie Pattern 1). Slice 238 ist **D52 Refinement #2** (analog Slice 237 + 229) — Audit-Heuristik tightenen ohne echte Findings zu verlieren.

---

## 1. Problem Statement

`pnpm run audit:silent-fail` zeigt 93 HIGH / 103 MEDIUM (Baseline post-Slice-237). Drift-Diff `worklog/audits/silent-fail-2026-04-26.md` ↔ `silent-fail-2026-04-27.md`:

- **+1 HIGH** in-without-chunking: `src/lib/services/wallet.ts:241` (eingeführt durch Slice 201a Commit `ccdf48d5` 2026-04-26 03:33). **FALSE POSITIVE**: Code ist KORREKT chunked:
  ```ts
  const CHUNK = 100;                                  // Line 233
  for (let i = 0; i < tradeIds.length; i += CHUNK) {  // Line 236
    const slice = tradeIds.slice(i, i + CHUNK);       // Line 237
    const { data, error } = await supabase
      .from('trades')
      .select('...')
      .in('id', slice);                                // Line 241 ← flagged
  ```
  Audit-Script-Context-Window ist `idx-2..idx+3` = Lines 239-244. CHUNK-Statement ist Line 233 → außerhalb Window → false-positive.

- **+2 MEDIUM** error-check-without-throw-or-return:
  - `src/lib/services/__tests__/club-most-owned-batch.test.ts:64` (Slice 207 batch-RPC Test)
  - `src/lib/services/__tests__/club-most-owned-batch.test.ts:286`

  **FALSE POSITIVE**: Test-File-Mock-Pattern (gleiche Klasse wie existing baseline `club-most-owned.test.ts:63,198`, `events-difficulty.test.ts:193`). Pattern 4 (`error-check-without-throw-or-return`) hat keinen `.test.ts`/`.spec.ts`-Skip wie Pattern 1 (`in-without-chunking`).

**Wer ist betroffen:** Audit-Tool-Vertrauen + Baseline-Inflation. Jeder neue chunked-Service oder Test-File inflated Baseline → CI-Gate-Noise → echte Drifts gehen unter.

**Wie oft:** Wachstumspattern. Jeder neue Money-Service mit for-loop-chunked `.in()` (es gibt 6 chunked patterns in src/lib/services/* schon) erzeugt false-positive HIGH. Jeder neue RPC-Test mit Setup-Mock erzeugt false-positive MEDIUM.

## 2. Lösungs-Design

**Fix 1 (Pattern 1 — in-without-chunking — Context-Window-Erweiterung):** Lookback-Window von -2 auf -10 Zeilen erweitern für CHUNK-Detection. Behalte Lookahead bei +3 (kein Anpassungsbedarf — `for`-Loop-Pattern hat CHUNK IMMER vor `.in()`).

**Fix 2 (Pattern 4 — error-check-without-throw-or-return — Test-File-Skip):** Skip `.test.ts`/`.spec.ts`/`/__tests__/`-Files analog Pattern 1. Test-Mocks mit `if (error) return` sind Setup-Pattern, nicht Production-Risk.

**Trade-off Fix 1:** Wider Window könnte echte non-chunked `.in()` masken wenn `CHUNK`-Wort 8 Zeilen oberhalb in einem unrelated Block steht (Comment, anderes for-Loop). Wahrscheinlichkeit: SEHR LOW — wenn CHUNK in -10 Zeilen Window auftaucht, liegt der Code in einem chunked-Kontext mit hoher Wahrscheinlichkeit.

**Trade-off Fix 2:** Test-Files könnten echte silent-fail-Bugs verstecken (z.B. Test-Helper-Code der Production-Code aufruft). Aber: Test-Code ist nicht Production. Slice 088+092 silent-fail-fixes haben Tests nie als Detection-Quelle gehabt.

**Wiring:** `scripts/silent-fail-audit.ts` ist bereits in `ci.yml` + `nightly-audit.yml` verkabelt (Slice 237 Wiring-Sektion). Slice 238 ist reine Heuristik-Refinement.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `scripts/silent-fail-audit.ts` | EDIT | Pattern 1 Context-Window auf -10 + Pattern 4 Test-File-Skip |
| `.audit-baseline.json` | EDIT | Baseline-Update: 93→92 HIGH (-1 wallet.ts), 103→101 MEDIUM (-2 test-file) |
| `worklog/specs/238-silent-fail-audit-chunked-and-test-skip.md` | NEU | Diese Spec |
| `worklog/active.md` + `worklog/log.md` | EDIT | Stage-Updates + Slice-Eintrag |
| `worklog/proofs/238-silent-fail-smoke.txt` | NEU | Pre/Post-Vergleich + Drift-Verify |

**Vor diesem Slice greppen:**
```bash
pnpm run audit:silent-fail | head -8                   # Pre-State: 93 HIGH 103 MEDIUM
grep -n "Pattern 1\|Pattern 4\|CHUNK|chunk|batch" scripts/silent-fail-audit.ts | head -20
grep -B2 -A2 "if (error)" src/lib/services/__tests__/club-most-owned-batch.test.ts | head -20
```

## 4. Code-Reading-Liste

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `scripts/silent-fail-audit.ts:65-115` | Bestehende Pattern-1+4 Logik | Wo ist Context-Window-Definition + wo wird `isMoneyPath` evaluiert? |
| `src/lib/services/wallet.ts:227-266` | False-Positive #1 Source | CHUNK-Pattern verifizieren — for-loop-Logic + Distance zu .in() |
| `src/lib/services/__tests__/club-most-owned-batch.test.ts:60-70,280-290` | False-Positive #2 Source | Mock-Setup-Pattern verifizieren |
| `.audit-baseline.json` | CI-Gate-Source-of-Truth | Aktuelle Counts + Update-Strategie |
| `scripts/silent-fail-audit.ts:78` | Pattern 1 Test-Skip-Vorbild | Wie macht's Pattern 1 schon? `!rel.endsWith('.test.ts')` |

## 5. Pattern-References

- `decisions.md` D52 — Wave-3-Tooling Heuristik-Refinement-Lehre: "lieber locker starten + iterativ tightenen"
- Slice 237 — Erstes Refinement (Comment-Skip global), gleiches Pattern
- Slice 229 — `type-truth-audit.ts` Iteration 17→0 false-positives
- `errors-db.md` PostgREST 1000-row cap — Begründung WARUM chunking pflicht (kontextuelles Verständnis)
- `errors-db.md` Service Error-Swallowing — Begründung WARUM error-check-pattern existiert (kontextuelles Verständnis)

## 6. Acceptance Criteria

```
AC-01: [HEURISTIK-1] Pattern 1 Context-Window auf -10 erweitert
  VERIFY: grep -nE "idx - (10|2)" scripts/silent-fail-audit.ts | head -3
  EXPECTED: ≥ 1 match mit "idx - 10" für Pattern 1 ctx slice

AC-02: [HEURISTIK-2] Pattern 4 Test-File-Skip aktiv
  VERIFY: grep -nE "endsWith\\('\\.test\\.ts'\\)|test\\.ts.*spec\\.ts" scripts/silent-fail-audit.ts | head -5
  EXPECTED: ≥ 2 Stellen (Pattern 1 existing + Pattern 4 NEU) mit test.ts-Skip

AC-03: [REGRESSION-1] wallet.ts:241 nicht mehr geflagged
  VERIFY: pnpm run audit:silent-fail 2>&1 > /dev/null && grep "wallet.ts:241" worklog/audits/silent-fail-$(date -u +%Y-%m-%d).md
  EXPECTED: kein Match (false-positive weg)

AC-04: [REGRESSION-2] Test-Files nicht mehr in error-check-Pattern
  VERIFY: grep "__tests__.*\\[MEDIUM\\] — if (error)" worklog/audits/silent-fail-$(date -u +%Y-%m-%d).md
  EXPECTED: 0 matches (alle test-files weg aus Pattern 4)

AC-05: [BASELINE] .audit-baseline.json updated
  VERIFY: cat .audit-baseline.json
  EXPECTED: high: 92, medium ≤ 99 (war 93/103, -1 HIGH wallet.ts + ≥4 test-files MEDIUM weg: club-most-owned-batch:64,286 + club-most-owned:63,198 + events-difficulty:193 + ggf weitere)

AC-06: [CI-GATE] audit:silent-fail:check exit 0
  VERIFY: pnpm run audit:silent-fail:check; echo "EXIT=$?"
  EXPECTED: EXIT=0 (HIGH ≤ baseline → no increase)

AC-07: [NO-LOSS] echte HIGH-Bugs erhalten
  VERIFY: grep -E "(gameweek-sync|liquidation\\.ts|contentReports|footballData|offers\\.ts|social\\.ts|supabaseMiddleware)" worklog/audits/silent-fail-$(date -u +%Y-%m-%d).md | wc -l
  EXPECTED: ≥ 25 (alle echten HIGHs in money-path-Files erhalten)
```

## 7. Edge Cases

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | for-loop chunked | wallet.ts:241 (CHUNK 8 lines above .in()) | -10 lookback | SKIP (false-pos weg) | Window erweitert |
| 2 | non-chunked .in() with CHUNK in unrelated block | Hypothetisch: `for (chunk of foos) {}; ...; .in('x', otherIds);` | CHUNK in -10 window | SKIP (false-negative) | Acceptable-Risk: Slice 229 Pattern "tightenen iterativ" |
| 3 | test-file mock | club-most-owned-batch.test.ts:64 `if (error) {}` | rel ends `.test.ts` | SKIP | Pattern 4 test-file-skip |
| 4 | __tests__/-Verzeichnis ohne .test-Suffix | `src/__tests__/setup.ts` | rel contains `/__tests__/` | SKIP | Test-Skip-Regex erweitert |
| 5 | echte Production-Code mit `// CHUNK` Comment darüber | Hypothetisch: `// CHUNK = ...` Comment + .in() ohne Loop | Comment in -10 window | SKIP (false-negative) | LOW Probability — Production-Code mit Comment-Lüge ist Code-Smell |
| 6 | Spec-File / Doc-Markdown | Sucht in `.md` Files? | walk skipt `.md` | SKIP via existing IGNORE | walk filtert `.ts|.tsx|.js|.jsx|.mjs` |

## 8. Self-Verification Commands

```bash
# Pre-Slice-238:
pnpm run audit:silent-fail 2>&1 | grep -E "HIGH|MEDIUM|Total"   # 196 / 93 / 103
grep -c "__tests__.*\\[MEDIUM\\]" worklog/audits/silent-fail-2026-04-28.md  # ≥ 5 baseline test-file findings
grep -c "wallet.ts:241" worklog/audits/silent-fail-2026-04-28.md  # 0 (in "+more"-Trunc) — re-run nach edit

# Post-Edit:
pnpm run audit:silent-fail 2>&1 | grep -E "HIGH|MEDIUM|Total"   # erwartet ≤ 92 HIGH / ≤ 99 MEDIUM
diff worklog/audits/silent-fail-2026-04-28.md worklog/audits/silent-fail-$(date -u +%Y-%m-%d).md | grep "^[-+]" | head -20  # Drift sichtbar

# Baseline-Update:
cat .audit-baseline.json   # high: 92, medium: ≤99

# CI-Gate-Test:
pnpm run audit:silent-fail:check; echo "EXIT=$?"   # EXIT=0
```

## 9. Open-Questions

**Pflicht-Klärung:** Keine — Heuristik-Refinement ist deterministisch, gleiche Klasse wie Slice 237.

**Autonom-Zone:** Context-Window-Größe (-10), Test-Skip-Regex (`/(\.test\.ts|\.spec\.ts|\/__tests__\/)/`), Baseline-Strategie.

**Nicht-Autonom:** Keine Money-Path-Logic-Änderung. Tool-Heuristik only.

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| Tool / Script | Pre/Post HIGH+MEDIUM-Counts + grep-Verify dass false-positives weg sind + grep-Verify dass echte HIGHs erhalten + Baseline-Update + CI-Gate exit 0 → `worklog/proofs/238-silent-fail-smoke.txt` |

## 11. Scope-Out

- **Andere Pattern-Heuristik-Refinements** (Pattern 2/3/5/6/7/8) → nur wenn Future-Drifts entstehen
- **Pattern 4 Production-Code-Verschärfung** (z.B. nach `if (error)` MUST-throw-OR-return-checking) → out-of-scope, wäre breaking-change
- **`silent-fail-audit.ts` Refactor in Modul-Struktur** → out-of-scope, KISS
- **Frontend/UI-Verändert** → keine UI-Pages tangiert

## 12. Stage-Chain

```
SPEC → IMPACT (skipped: Tool-only, kein Service/RPC)
     → BUILD (silent-fail-audit.ts edit + .audit-baseline.json update)
     → REVIEW (self-review D35 — XS Pattern-Wiederholung Slice 237)
     → PROVE (Pre/Post-Diff + CI-Gate exit 0)
     → LOG
```

## Wiring (Slice-Type=Tool DoD-Pflicht)

`scripts/silent-fail-audit.ts` Wiring (pre-Slice-238 + unverändert):
- `package.json` npm-Scripts: `audit:silent-fail` + `audit:silent-fail:check` ✓
- `.github/workflows/ci.yml`: `pnpm run audit:silent-fail:check` (Push-Trigger) ✓
- `.github/workflows/nightly-audit.yml`: Step 1, 03:00 UTC ✓
- Failure-Handling: exit 1 bei HIGH-Increase + Auto-Issue ✓

Slice 238 ändert NUR Heuristik, kein Wiring-Change.

## Open Risiko

**Risk:** Context-Window -10 ist zu permissiv → echte non-chunked `.in()` versteckt wenn CHUNK-Wort zufällig in -10 Window steht. **Probability:** SEHR LOW (Production-Code-Patterns haben CHUNK strukturiert oben, nicht als Comment/Variable mit anderem Zweck). **Mitigation:** Slice 229 D52-Pattern: bei Future-False-Negative tightenen (z.B. require `for.*CHUNK` instead of just `CHUNK`).

**Risk:** Test-File-Skip versteckt echte Test-Helper-Bugs die Production-Code aufrufen. **Probability:** LOW (Test-Helper sollte selbst testen, nicht silent-fail-leiden). **Mitigation:** wenn Future-Bug entsteht → granularer Skip (`__tests__/setup.ts` could remain scanned).
