# Slice 176 — Sentry captureError Wrapper (Tier D2)

**Typ:** XS-Slice (1 neuer Helper + 2 Callers upgrade). Money-Path: Nein.
**Impact:** skipped (internal observability-module).

---

## Ziel

Unified `captureError(err, ctx?)` Wrapper der automatisch DomainError-Codes aus Slice 174 in Sentry-Tags umsetzt. `error.tsx` + neue Call-Sites bekommen 1-Liner statt manuelle Sentry-Tag-Konstruktion.

---

## Betroffene Files

| # | File | Aenderung |
|---|------|-----------|
| 1 | `src/lib/observability/captureError.ts` | NEU — `captureError(err, ctx?)` + `captureMessage(msg, level, ctx?)` |
| 2 | `src/lib/observability/silentRejects.ts` | UPGRADE — `logSilentRejects`/`logSilentCatch` delegieren an `captureError` fuer Tag-Konsistenz |
| 3 | `src/lib/observability/__tests__/captureError.test.ts` | NEU — Tests: domain-error-tag-extract, unknown-error-normalize, extra-context-merge |
| 4 | `src/lib/observability/apiLogger.ts` | UPGRADE — nutzt `captureError` statt direkt `Sentry.captureException` |

---

## Acceptance Criteria

1. **A1** — `captureError(err)` extrahiert bei `isDomainError(err)` automatisch `tags.code = err.code`
2. **A2** — `captureError(err, { feature: 'trade', userId })` merged user-tags mit code-tag
3. **A3** — Unknown-err wird via `toDomainError` normalisiert vor dem Capture (konsistente Shape)
4. **A4** — `captureMessage(msg, level, ctx?)` fuer Breadcrumb-Style-Events (nicht-Errors)
5. **A5** — `silentRejects.ts` + `apiLogger.ts` delegieren
6. **A6** — tsc clean + Tests gruen

---

## Proof-Plan

`worklog/proofs/176-capture.txt` — vitest + ts-check.

---

## Time-Estimate

~20 min.
