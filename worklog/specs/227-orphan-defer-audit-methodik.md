# Slice 227 — CommunityValuation @experimental + Audit-Methodik-Lehre (ORPHAN-NEU-1)

**Status:** SPEC · **Größe:** XS · **Scope:** CTO · **Datum:** 2026-04-27

---

## 1. Problem Statement

Visual-Check 2026-04-27 (`worklog/proofs/visual-check-2026-04-27.md`) deckte **ORPHAN-NEU-1 (P2)** auf:

`src/components/player/detail/CommunityValuation.tsx` ist exportiert in `src/components/player/detail/index.ts:19` aber **nirgends importiert** (`grep -rn "CommunityValuation" src/` zeigt nur Definition + Barrel-Export, kein JSX-Aufruf).

**Konsequenzen:**
- **Slice 216 K-RR-1** (`title={t('floorPriceTooltip')}`) wurde auf totes Component appliziert — User hat das Tooltip nie gesehen.
- **Slice 225 InfoTooltip-Migration** auf CommunityValuation = collateral, gleiche Wirkungslosigkeit.
- **Audit-Methodik-Bug:** Phase-A-Re-Audit hat Slice 216 K-RR-1 als "echte P1-Fix" gelistet ohne import-trace zu prüfen.

**Anil-Direktive:** Option C — Defer mit `@experimental` + Backlog. Component bleibt im Repo aber als "to-be-wired" markiert.

## 2. Lösungs-Design

3 Edits, alle docs/comments-only:

1. **`CommunityValuation.tsx`** — Top-of-File JSDoc-Block mit `@experimental` markiert + Backlog-Hinweis
2. **`decisions.md` D46** — erweitert um "Orphan-Production-Component-Detection" (neue Achse)
3. **`worklog/punch-list-2026-04-25.md` K-RR-1** — Status reklassifiziert von "Slice 216 ✓" auf "fake-fix-orphan, Slice 227 reklassifiziert"
4. **`worklog/beta-phase.md`** — ORPHAN-NEU-1 als deferred dokumentiert
5. **Optional Audit-Methodik-Note:** Future Audit-Agents sollen import-trace machen vor P1-Klassifikation

Kein Code-Render-Path-Change, keine i18n, keine Component-Wires.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `src/components/player/detail/CommunityValuation.tsx` | EDIT | JSDoc `@experimental` + Backlog-Comment am File-Top |
| `memory/decisions.md` | EDIT | D46-Erweiterung |
| `worklog/punch-list-2026-04-25.md` | EDIT | K-RR-1 Status korrigiert |
| `worklog/beta-phase.md` | EDIT | ORPHAN-NEU-1 als deferred |

## 4. Code-Reading-Liste

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `worklog/proofs/visual-check-2026-04-27.md` | Audit-Source | Detail-Befunde + Decision-Path |
| `memory/decisions.md` D46 | Existing-Pattern | Wie war D46 formuliert? Wie erweitern ohne zu duplizieren? |
| `src/components/player/detail/CommunityValuation.tsx` | Edit-Target | Aktueller File-Header, JSDoc-Stil-Konvention |
| `worklog/punch-list-2026-04-25.md` (Z153 K-RR-1) | Status-Update-Target | Genaue Zeile für Reklassifizierung |

## 5. Pattern-References

- `decisions.md` D46 — Service-Duplicate-Pattern (Erweiterung auf Component-Achse)
- `decisions.md` D35 — Self-Review für docs-only Slice
- `decisions.md` D48 — Audit-Stale-Catcher (Slice 227 ist verwandt: orphan ist eine andere audit-quality-Lehre)
- `errors-frontend.md` "Service-Duplicate bei parallelem BE+FE-Dispatch (Slice 199, D46)" — gleiches Pattern, andere Achse

## 6. Acceptance Criteria

```
AC-1: [HAPPY] CommunityValuation.tsx hat JSDoc @experimental + Backlog-Hinweis
  VERIFY: head -20 src/components/player/detail/CommunityValuation.tsx | grep -E "@experimental|orphan|Slice 227"
  EXPECTED: ≥2 hits
  FAIL IF: 0 hits

AC-2: [PATTERN] decisions.md D46 erweitert um Orphan-Component-Detection
  VERIFY: grep -A20 "^## D46" memory/decisions.md | grep -E "Orphan-Production-Component|orphan.*component|import-trace"
  EXPECTED: ≥1 hit
  FAIL IF: 0 hits

AC-3: [REGRESSION] Punch-List K-RR-1 Status korrigiert
  VERIFY: grep -nE "K-RR-1.*orphan|K-RR-1.*fake-fix" worklog/punch-list-2026-04-25.md
  EXPECTED: ≥1 hit
  FAIL IF: 0 hits

AC-4: [TRACKER] beta-phase.md hat ORPHAN-NEU-1 deferred
  VERIFY: grep -E "ORPHAN-NEU-1" worklog/beta-phase.md
  EXPECTED: ≥1 hit (in deferred-block)
  FAIL IF: 0 hits

AC-5: [TSC] tsc clean
  VERIFY: npx tsc --noEmit
  EXPECTED: exit 0
  FAIL IF: type errors

AC-6: [REGRESSION-NO-CODE-CHANGE] CommunityValuation Component-Body unverändert
  VERIFY: git diff src/components/player/detail/CommunityValuation.tsx -- only top-of-file JSDoc additions
  EXPECTED: nur Comment-Insertion, keine Body-Änderung
  FAIL IF: Logic-Drift
```

## 7. Edge Cases Table

| # | Flow | Case | Expected | Mitigation |
|---|------|------|----------|------------|
| 1 | Future-Wire | Component wird später importiert | `@experimental` JSDoc bleibt — Wire-Slice kann es entfernen | Doc-only, kein Tech-Debt |
| 2 | Future-Audit | audit-stale-check.ts wird erweitert um orphan-detection | D46-Pattern-Doku existiert als Reference | decisions.md hat den Pattern-Anker |
| 3 | Punch-List-Re-Read | Future-User liest K-RR-1 als "done" weil Slice 216 ✓ | Reklassifizierung mit Slice-227-Annotation hilft | "fake-fix-orphan" Marker explicit |

## 8. Self-Verification Commands

```bash
# AC-1
head -20 src/components/player/detail/CommunityValuation.tsx | grep -E "@experimental|orphan|Slice 227"

# AC-2
grep -A20 "^## D46" memory/decisions.md | grep -E "Orphan-Production|orphan.*component"

# AC-3
grep -nE "K-RR-1.*orphan|K-RR-1.*fake-fix|fake-fix-orphan" worklog/punch-list-2026-04-25.md

# AC-4
grep -E "ORPHAN-NEU-1" worklog/beta-phase.md

# AC-5
npx tsc --noEmit
```

## 9. Open-Questions

**Pflicht-Klärung:** keine — Anil hat Option C explizit gewählt.

**Autonom-Zone:**
- Genaue JSDoc-Formulierung für `@experimental`
- D46-Sektion-Position (in-place erweitern vs neue Sub-Section)
- Punch-List-Status-Wording (`fake-fix-orphan` vs `audit-methodik-bug-Slice-227`)

**Nicht-Autonom-Zone:** keine — Money-Path nicht betroffen, kein i18n-Wording, kein RLS.

## 10. Proof-Plan

`worklog/proofs/227-orphan-defer-output.txt` — AC-Output + git diff der 4 Files.

## 11. Scope-Out

- **Component löschen:** Anil-Decision war C (defer), nicht A (delete). Loving-Future-Slice falls Wire-Plan ausbleibt für 4+ Wochen.
- **Audit-Agents-Code-Update:** Future-Wave-3-Tooling-Slice (`scripts/orphan-component-detector.ts` analog `audit-stale-check.ts`).
- **Slice 216 + 225 revert:** unnötig — Code ist harmlos, kein Tech-Debt. Wire-Slice macht ihn dann live.

## 12. Stage-Chain (geplant)

```
SPEC → IMPACT (skipped — docs/comment-only) → BUILD → REVIEW (self-review D35: pure-docs Pattern Slice 209-Wiederholung) → PROVE → LOG
```

**Self-Review-Begründung:** docs-only Slice analog Slice 209 (D48 audit-stale-cleanup). Kein Render-Path-Change, kein TS-Type-Change, kein Logic-Risk. Reviewer-Agent würde gleiche knowledge-flywheel-Audit wiederholen die ich beim Visual-Check schon gemacht habe.

---

## Compliance-Check

Nicht relevant — keine i18n, kein Money-Path, keine User-Strings.

## Open Risiko

**Risiko:** D46-Erweiterung wird als "noise" empfunden (D46 ist schon konkret für Service-Duplicate). Mitigation: neue Sub-Section mit klarer Cross-Reference statt Inline-Erweiterung der Service-Sektion.
