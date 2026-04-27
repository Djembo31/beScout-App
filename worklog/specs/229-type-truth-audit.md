# Slice 229 — `scripts/type-truth-audit.ts` (D43/D49 Pattern-Detection)

**Status:** SPEC · **Größe:** XS · **Scope:** CTO · **Datum:** 2026-04-27

---

## 1. Problem Statement

D43 (Type-Truth-Audit-Pflicht) und D49 (SELECT-COLS Sync mit DbType) beschreiben Bug-Klassen aus Slice 165 (Silent-Cast nach RPC), Slice 192/193 (PostgREST nested-select Auth-Race), Slice 200 (PLAYER_SELECT_COLS-Sync-Drift). Beide haben TODO-Tools im Backlog (`scripts/audit-rpc-type-truth.ts` in D43, sync-detector implicit in D49).

Pragmatische Detection ohne `pg_get_functiondef`-Live-DB-Lookup: **statisches Pattern-Matching** auf bekannte Bug-Klassen.

**Wer betroffen:** Service-Layer-Code in `src/lib/services/`. Future-Slices die RPCs konsumieren.

## 2. Lösungs-Design

`scripts/type-truth-audit.ts` — Static-Analysis-Skript, scant `src/lib/services/` und `src/features/**/services/` nach 3 Bug-Patterns:

1. **PATTERN-A (Silent-Cast-After-RPC):**
   `await supabase.rpc(...)` gefolgt von `as XYZ` Cast ohne discriminator-Check (`if (!data.success || ...)`).
   Source: Slice 165 — Vote-Toggle-Bug.

2. **PATTERN-B (Missing Error-Destructure):**
   `const { data } = await supabase.from(...)` ohne `error` co-destructured.
   Source: errors-db.md "Service Error-Swallowing" (117 Fixes Hardening 2026-04-13).

3. **PATTERN-C (PostgREST Nested-Select with Implicit-Cast):**
   `.select('parent.field, child:other_table(...)')` gefolgt von `as Type[]` ohne null-handling für nested rows.
   Source: Slice 192 — Manager-Aufstellen Auth-Race.

Markdown-Report nach `worklog/audits/type-truth-YYYY-MM-DD.md`. Exit 0 bei 0 Hits, 1 sonst.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `scripts/type-truth-audit.ts` | NEU | Hauptscript |
| `package.json` | EDIT | npm-Script `audit:type-truth` |

## 4. Code-Reading-Liste

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `scripts/audit-stale-check.ts` | Code-Stil-Vorbild | Walk-Pattern, Markdown-Report-Format |
| `scripts/orphan-component-detector.ts` | Letzte Wave-3-Vorbild (Slice 228) | Stat-Aggregation + Skip-Patterns |
| `.claude/rules/errors-db.md` "Silent-Cast" Sektion | Pattern-Source | Genaue Bug-Patterns die wir detecten wollen |
| `src/lib/services/research.ts` | Bekannter Test-Case Slice 165 | Vote-Toggle silent-cast — Tool muss das erkennen wenn nicht gefixed |

## 5. Pattern-References

- `decisions.md` D43 — Pattern-Source
- `decisions.md` D49 — verwandt (SELECT-COLS-Sync)
- `errors-db.md` "Silent-Cast ohne Discriminator-Check (Slice 165)"
- `errors-db.md` "Service Error-Swallowing"
- `errors-db.md` "PostgREST nested-select Auth-Race (Slice 192/193)"

## 6. Acceptance Criteria

```
AC-1: [HAPPY] Skript läuft erfolgreich
  VERIFY: npx tsx scripts/type-truth-audit.ts
  EXPECTED: Output-Summary "Scanned N services, found M risk-patterns" + Markdown-Report
  FAIL IF: Crash, parser-Error

AC-2: [PATTERN-A] Silent-Cast-After-RPC erkannt (mind. wenn pattern echt vorkommt)
  VERIFY: grep results vergleichen mit Tool-Output
  EXPECTED: Tool flag-t alle Files mit `await supabase.rpc(...)` + `as ` ohne discriminator
  FAIL IF: false-negative bei bekannten Pattern-Cases

AC-3: [SKIP-NOISE] False-positive-Rate niedrig
  VERIFY: Manual-Sample 5 Hits → wenigstens 4 sind echte Risk-Patterns
  EXPECTED: ≥80% Precision
  FAIL IF: <50% Precision (zu noisy)

AC-4: [REPORT] Markdown-Report mit File:Line + Pattern-Type + Heal-Hint
  VERIFY: cat worklog/audits/type-truth-<date>.md
  EXPECTED: pro Hit: file:line + pattern-name + Snippet + Heal-Hint
  FAIL IF: Nur Count-Summary

AC-5: [TSC] tsc clean
  VERIFY: npx tsc --noEmit
  EXPECTED: exit 0

AC-6: [NPM-SCRIPT]
  VERIFY: pnpm run audit:type-truth
  EXPECTED: gleiche Output wie direkt
```

## 7. Edge Cases

| # | Case | Expected | Mitigation |
|---|------|----------|------------|
| 1 | RPC-Call mit Try/Catch außenrum | Kein false-positive (catch ist guard) | Pattern matcht spezifisch `as ` ohne `if (!data.success`-Check |
| 2 | RPC-Call mit Type-Guard via `function isXyz(data)` | Kein false-positive | Pattern A erlaubt Type-Guard-Functions |
| 3 | `const { data, error } = await supabase.from()` | Pattern B kein false-positive | Pattern B trifft NUR fehlende `error` |
| 4 | Multi-line cast (`as {<br/>...<br/>}`) | Match auf erste Zeile reicht | Regex multiline |
| 5 | Test-Files | Skip — Tests dürfen lax sein | Filter `*.test.tsx?` raus |

## 8. Self-Verification Commands

```bash
npx tsc --noEmit
npx tsx scripts/type-truth-audit.ts
echo $?
cat worklog/audits/type-truth-$(date +%Y-%m-%d).md
pnpm run audit:type-truth
```

## 9. Open-Questions

**Pflicht-Klärung:** keine.

**Autonom-Zone:** Pattern-Regex-Detail, Snippet-Length, Heal-Hint-Wording.

## 10. Proof-Plan

`worklog/proofs/229-type-truth-output.txt` — AC-Output + Sample-Hits-Validation.

## 11. Scope-Out

- **Live-DB-`pg_get_functiondef`-Lookup:** Zu komplex für XS-Slice. Future-M-Slice wenn Pattern-Detection-Tool stabilisiert.
- **D49 PLAYER_SELECT_COLS-Sync-Audit:** Andere Achse, eigener Pattern. Defer Slice 232+.
- **Auto-Fix:** Detection-Only.

## 12. Stage-Chain

```
SPEC → IMPACT (skipped) → BUILD → REVIEW (self-review D35) → PROVE → LOG
```
