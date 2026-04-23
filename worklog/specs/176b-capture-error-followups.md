# Slice 176b — captureError Follow-ups (Tier D2 Finish)

**Typ:** XS-Slice. Money-Path: Nein. Follow-up aus `worklog/reviews/176-review.md`.
**Impact:** skipped (Internal-Module + 1 Client-Boundary + Doc).

---

## Ziel

Drei Follow-up-Items aus dem 176-Review schliessen:
1. `global-error.tsx` migriert auf `captureError` — Top-Level-Boundary bekommt konsistente Tag-Shape.
2. `extractDomainContext` erweitert um `cause`-Field — Postgres-Error-Code-Preservation bei `ConflictError(msg, entity, pgErr)`.
3. `memory/pattern_observability_stack.md` Z.65 Tag-Shape-Doc aktualisiert.

---

## Betroffene Files

| # | File | Aenderung |
|---|------|-----------|
| 1 | `src/app/global-error.tsx` | `Sentry.captureException(error)` → `captureError(error, { feature: 'global-error-boundary' })` |
| 2 | `src/lib/observability/captureError.ts` | `extractDomainContext`: neue `serializeCause(err)` Helper + `if (rec.cause !== undefined) out.cause = serializeCause(rec.cause)` |
| 3 | `src/lib/observability/__tests__/captureError.test.ts` | Test fuer cause-Extract bei wrapped Postgres-error |
| 4 | `memory/pattern_observability_stack.md` | Tag-Shape-Doc Z.65 — neue Shape `{ feature, code }` + label-in-extra |

---

## Acceptance Criteria

1. **A1** — `global-error.tsx` nutzt `captureError`, `tags.feature = 'global-error-boundary'` gesetzt
2. **A2** — `extractDomainContext` gibt `extra.cause = { name, message, code?, status? }` zurueck bei DomainError mit cause
3. **A3** — Postgres-cause-Fall getestet: `new ConflictError('dup', 'user', pgErr)` → `extra.cause.code = '23505'`
4. **A4** — Non-DomainError bleibt ohne cause-Key (keine Noise)
5. **A5** — `pattern_observability_stack.md` Z.65 zeigt aktuelle Shape
6. **A6** — tsc clean + Tests gruen

---

## Proof-Plan

`worklog/proofs/176b-followups.txt` — vitest (captureError.test + silentRejects.test) + tsc + `git diff --stat` Preview.

---

## Time-Estimate

~15 min.
