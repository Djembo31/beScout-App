# Slice 175c — apiLogger.test.ts (withLogger Direct Unit-Coverage)

**Typ:** XS-Slice. Money-Path: Nein. Follow-up aus `worklog/reviews/175b-review.md` Finding #3.
**Impact:** skipped (test-only).

---

## Ziel

`src/lib/observability/apiLogger.ts` hat nach 175b indirekte Coverage (via `logger.test.ts` + `captureError.test.ts`). Aber `withLogger` selbst hat keine direkte Tests. Schließe Test-Gap: `apiLogger.test.ts` mit request.start, request.end, error-path, x-request-id, params passthrough.

---

## Betroffene Files (1)

| # | File | Aenderung |
|---|------|-----------|
| 1 | `src/lib/observability/__tests__/apiLogger.test.ts` | NEU — 6-8 Tests fuer withLogger |

---

## Acceptance Criteria

1. **A1** — Test: request.start log ruft `logger.child({requestId,route,method}).info` mit `url`-Feld
2. **A2** — Test: request.end log ruft `log.info` mit `{status, latencyMs}`
3. **A3** — Test: error-path → `captureError(domainErr, {route, requestId})` + re-throw
4. **A4** — Test: response.headers bekommt `x-request-id`
5. **A5** — Test: `x-request-id` aus request-headers wird reused, sonst crypto.randomUUID
6. **A6** — Test: params-passthrough funktioniert fuer dynamic-routes
7. **A7** — tsc clean + alle Tests gruen

---

## Scope-Out

- Integration-Test gegen echte Next.js-Route (zu aufwendig)
- Playwright E2E fuer x-request-id (post-deploy)

---

## Proof

`worklog/proofs/175c-apilogger-tests.txt`

## Time

~15 min.
