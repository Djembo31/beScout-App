# Slice [TBD] — preventClose={loading} missing — User kann während async-Submit ESC drücken → St

**Status:** SPEC · **Größe:** S · **Scope:** CTO · **Datum:** 2026-04-26
**Auto-generated:** Slice 214 findings-to-slices Pipeline aus `worklog/audits/2026-04-26/aggregate.md`.
**Severity:** P1

## 1. Problem Statement

preventClose={loading} missing — User kann während async-Submit ESC drücken → State-Loss

**Source:** ux-coherence · **Date:** 2026-04-26

## 2. Lösungs-Design

(Auto-Stub — manuell ausfüllen vor BUILD-Stage)

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| TBD | TBD | aus Reproducer ableiten |

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| FeedbackModal.tsx Modal-Wrapper | Existing-Stelle des Findings | Wie ist es heute implementiert? |
| `worklog/audits/2026-04-26/aggregate.md` | Source-of-Truth Aggregate | Vollständigkeit prüfen |

## 5. Pattern-References

- `memory/decisions.md` D48 (Audit-Stale-Catcher) — vor Implementation: Pattern bereits gefixt?
- `memory/decisions.md` D50 (Spec-Standard-Pflicht)

## 6. Acceptance Criteria

**AC-01:** [REGRESSION] preventClose={loading} missing — User kann während async-Submit ESC dr...
  - VERIFY: FeedbackModal.tsx Modal-Wrapper
  - EXPECTED: Issue nicht mehr reproduzierbar
  - FAIL IF: Original-Issue UX-NEU-1 kommt zurück

**Plus pflicht zusätzliche ACs:** STRUCTURAL (tsc clean), I18N (wenn user-facing), MOBILE (wenn UI), PENDING (wenn async).

## 7. Edge Cases Table

| # | Flow | Case | Expected | Mitigation |
|---|------|------|----------|------------|
| 1 | TBD | TBD | TBD | TBD |

## 8. Self-Verification Commands

```bash
npx tsc --noEmit
# Plus Slice-spezifische greps
```

## 9. Open-Questions

(Auto-Stub — Pflicht-Klärungen vor Implementation auflisten)

## 10. Proof-Plan

(Auto-Stub — wie wird verifiziert?)

## 11. Scope-Out

- (Auto-Stub)

## 12. Stage-Chain (geplant)

SPEC (manuell ausfüllen) → IMPACT → BUILD → REVIEW → PROVE → LOG.

---

## Findings (raw)

| ID | Page | Severity | Issue | Reproducer | Source |
|----|------|----------|-------|-----------|--------|
| UX-NEU-1 | FeedbackModal | P1 | preventClose={loading} missing — User kann während async-Submit ESC drücken → State-Loss | FeedbackModal.tsx Modal-Wrapper | ux-coherence |

## Hinweis

Dies ist ein **auto-generated Slice-Stub** (Slice 214 Pipeline). Vor BUILD-Stage:
1. Anil reviewt Stub
2. Sektionen 2, 6, 7, 9, 10, 11 manuell ausfüllen (jetzt nur Stub-Text)
3. Slice-Größe verifizieren (Pipeline default-classified)
4. Slice-Nummer korrigieren (Pipeline nutzt 214-derived-*, manuell zu echter ID-Range renamen)
