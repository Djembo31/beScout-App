# Slice 237 — silent-fail-audit Comment-Skip-Heuristik

**Status:** SPEC · **Größe:** XS · **Slice-Type:** Tool · **Scope:** CTO · **Datum:** 2026-04-27

> 3 False-Positive HIGH-Findings in `scripts/type-truth-audit.ts` (JSDoc-Comments + // Comments) flaggen sich selbst. Slice 237 erweitert silent-fail-audit-Heuristik um Comment-Skip (analog Slice 229 D52 Pattern: lieber locker starten + tightenen).

---

## 1. Problem Statement

Slice 234 nightly-audit Run #25018867677 zeigt audit:silent-fail HIGH ↑3 (von 92 auf 96). Slice 234-Triage findet: **alle 3 NEU HIGH-Findings sind False-Positives** in `scripts/type-truth-audit.ts:12, 132, 140` — JSDoc-Comments + 1 inline-Comment die das Pattern textuell beschreiben:

```ts
 * Pattern B: `const { data } = await supabase.(from|rpc)` ohne `error`
```

Pattern 5 in `silent-fail-audit.ts:106` matched `const { data } = await supabase` ohne Comment-Context-Check → false-positive.

**Wer ist betroffen:** Issue-Pipeline + Baseline-Drift. Jedes Mal wenn Slice ein Audit-Tool baut das Pattern in JSDoc beschreibt → silent-fail-baseline wird inflated → CI-Gate `audit:silent-fail:check` failed false-positive.

**Wie oft:** Jedes neue Audit-Tool (Slice 229 type-truth-audit, Slice 234 wiring-check.ts würde gleiches Risk haben). Wachstums-Pattern.

## 2. Lösungs-Design

Globaler Comment-Skip am Loop-Top in `scanFile()`. Skipt Lines die offensichtlich Comments sind:
- `^\s*//` (single-line comment)
- `^\s*\*\s` (JSDoc body line)
- `^\s*\*$` (JSDoc empty body)
- `^\s*\/\*` (block comment open)

**Warum global statt per-Pattern:** alle 8 Patterns könnten False-Positives haben wenn der Code in Comments steht. Globaler Skip ist KISS + future-proof.

**Trade-off:** wir verlieren Detection in Multi-Line-Block-Comments wo eine Line in der Mitte echten Code haben könnte. Aber: Pattern in Comments sind per-Definition keine echten Code-Bugs. Acceptable.

**Wiring:** `scripts/silent-fail-audit.ts` ist bereits in `ci.yml` (audit:silent-fail:check) + `nightly-audit.yml` (Step 1) verkabelt. Slice 237 ist reine Tool-Heuristik-Refinement, kein Wiring-Change.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `scripts/silent-fail-audit.ts` | EDIT | Comment-Skip-Heuristik in `scanFile()` |
| `.audit-baseline.json` | EDIT | Baseline-Update nach Heal: 92→89 HIGH (3 false-positives entfernt) |
| `worklog/specs/237-silent-fail-audit-comment-skip.md` | NEU |
| `worklog/active.md` + `worklog/log.md` | EDIT | Stage-Updates + Slice-Eintrag |
| `worklog/proofs/237-silent-fail-smoke.txt` | NEU | Pre/Post-Vergleich |

**Vor diesem Slice greppen:**
```bash
pnpm run audit:silent-fail | head -10  # Pre-State: 96 HIGH
grep "destructure-data-without-error" scripts/silent-fail-audit.ts  # Pattern 5 Stelle
```

## 4. Code-Reading-Liste

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `scripts/silent-fail-audit.ts` | Bestehende Heuristik | Wo ist der Pattern-Loop, wie ist `lines.forEach` strukturiert? |
| `scripts/type-truth-audit.ts:12,132,140` | False-Positive-Source | Welche Comment-Patterns triggern? `// ...` + `*  ...` |
| `.audit-baseline.json` | CI-Gate Baseline | Wo Update nach Heal? |
| `scripts/audit-stale-check.ts` (Slice 229) | Pattern-Vorbild für Heuristik-Refinement | Wie iterativ-tightenen ohne echte Findings zu verlieren? |

## 5. Pattern-References

- `decisions.md` D52 — Wave-3-Tooling Heuristik-Refinement-Lehre: "lieber locker starten, dann tightenen"
- `decisions.md` D54 — Slice-Type=Tool DoD: "in pnpm-Script + Trigger + Failure-Handling" — alles erfüllt, nur Heuristik-Refinement
- `errors-infra.md` "Shell case-statement wildcard promiskuoes" — Detection-Patterns sauber

## 6. Acceptance Criteria

```
AC-01: [HEURISTIK] Comment-Skip aktiv im Loop
  VERIFY: grep -E "isCommentLine|comment.*skip|^\s*\\*|^\s*//" scripts/silent-fail-audit.ts | head -3
  EXPECTED: ≥ 1 match für Comment-Detection

AC-02: [REGRESSION] HIGH-Count auf 89 (3 False-Positives weg)
  VERIFY: pnpm run audit:silent-fail 2>&1 | grep "HIGH"
  EXPECTED: 89 HIGH (war 92 baseline + 3 false-positives = 96 pre-Slice-237)
  FAIL IF: noch immer 92+ HIGH

AC-03: [BASELINE] .audit-baseline.json updated
  VERIFY: cat .audit-baseline.json
  EXPECTED: high: 89 (war 92)

AC-04: [CI-GATE] audit:silent-fail:check exit 0
  VERIFY: pnpm run audit:silent-fail:check
  EXPECTED: exit 0 (HIGH = baseline 89 = baseline 89 → no increase)

AC-05: [NO-LOSS] keine echten HIGH-Bugs verloren
  VERIFY: diff worklog/audits/silent-fail-2026-04-27.md worklog/audits/silent-fail-<post-slice-237>.md
  EXPECTED: 3 false-positives weg (type-truth-audit.ts:12,132,140), keine echten Code-Files verloren
  FAIL IF: HIGH-Lines in src/ oder echte scripts verschwinden
```

## 7. Edge Cases

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | JSDoc-Block | `* Pattern: ... const { data }` | Line ist `^\s*\*` | SKIP | `\*\s` regex-match |
| 2 | Inline-Comment-then-Code | `if (foo) /* TODO */ const { data }` | Code + Comment in 1 Line | Detect (Code dominant) | Skip nur wenn Line **start** Comment |
| 3 | Block-Comment-mit-Code-darin | `/* ... const { data } ... */` | echter Block-Comment-Block | SKIP wenn `/* ... */` umschliesst | KISS: skip auch bei `/*` start, accept Block-Comments per-Default |
| 4 | TSDoc `@example` mit Code | `* @example const { data }` | JSDoc mit echtem Code | SKIP | per-Definition keine echten Bugs |

## 8. Self-Verification Commands

```bash
# Pre-Slice-237:
pnpm run audit:silent-fail | grep -E "HIGH|MEDIUM"  # 96 HIGH 104 MED

# Post-Edit:
pnpm run audit:silent-fail | grep -E "HIGH|MEDIUM"  # erwartet 89 HIGH (3 false-positives weg)
diff worklog/audits/silent-fail-2026-04-27.md <(npx tsx scripts/silent-fail-audit.ts && cat worklog/audits/silent-fail-2026-04-27.md)

# Baseline-Update:
cat .audit-baseline.json  # high: 89

# CI-Gate-Test:
pnpm run audit:silent-fail:check  # exit 0
echo "EXIT=$?"
```

## 9. Open-Questions

**Pflicht-Klärung:** Keine — Comment-Detection ist deterministisch.

**Autonom-Zone:** Comment-Regex-Granularität, Baseline-Update-Strategie.

**Nicht-Autonom:** Keine Money-Path. Tool-Refinement.

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| Tool / Script | Pre/Post HIGH-Count + Diff der 3 false-positives + Baseline-Update + CI-Gate exit 0 → `worklog/proofs/237-silent-fail-smoke.txt` |

## 11. Scope-Out

- **Globale Heuristik-Refinement** für andere Patterns (1-4, 6-8) → nur wenn Future-False-Positives entstehen
- **Type-truth-audit.ts JSDoc rewriten** statt Heuristik-Fix → verworfen, Heuristik-Fix ist robuster + skaliert
- **wiring-check.ts auch JSDoc-Skip** → nicht nötig, weil wiring-check basenames matched, nicht Code-Patterns

## 12. Stage-Chain

```
SPEC → IMPACT (skipped: Tool-only, kein Service/RPC)
     → BUILD (silent-fail-audit.ts edit + .audit-baseline.json update)
     → REVIEW (self-review D35 — XS-Pattern-Wiederholung Slice 229 Heuristik-Refinement)
     → PROVE (Pre/Post-Diff + CI-Gate)
     → LOG
```

## Wiring (Slice-Type=Tool DoD-Pflicht)

`scripts/silent-fail-audit.ts` Wiring (pre-Slice-237 + unverändert):
- `package.json` npm-Script: `audit:silent-fail` + `audit:silent-fail:check` ✓
- `.github/workflows/ci.yml`: `pnpm run audit:silent-fail:check` (Push-Trigger) ✓
- `.github/workflows/nightly-audit.yml`: `pnpm run audit:silent-fail:check` (Daily 03:00 UTC) ✓
- Failure-Handling: exit 1 bei HIGH-Increase + Auto-Issue via nightly-audit ✓

Slice 237 ändert NUR Heuristik, kein Wiring-Change.

## Open Risiko

**Risk:** Comment-Skip ist zu permissiv und maskiert echten Code in Multi-Line-Block-Comments. **Probability:** LOW — Block-Comments mit echtem Code (auskommentiert) sind dead-code, kein Production-Bug. **Mitigation:** Slice 229 D52-Pattern: bei Future-False-Negative tightenen.
