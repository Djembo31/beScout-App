# CTO Review: Slice 175c — apiLogger.test.ts Direct Unit-Coverage

**Verdict:** PASS (Self-Review — XS-Slice, test-only, keine Code-Aenderung)
**time-spent:** 5 min

## Spec-Coverage

- A1 ✅ request.start mit `logger.child({requestId, route, method})` + info-call mit url
- A2 ✅ request.end mit `{status, latencyMs}`
- A3 ✅ error-path → captureError(domainErr, {route, requestId}) + re-throw
- A4 ✅ response.headers setzt x-request-id
- A5 ✅ x-request-id aus request-headers wird reused, sonst crypto.randomUUID
- A6 ✅ params-passthrough via `withLogger<{id: string}>` generic
- A7 ✅ tsc clean + 8/8 neue Tests + 40/40 observability-Tests total

## Implementation-Notes

- `vi.hoisted()` Pattern fuer mock-sharing zwischen `vi.mock`-factory + test-body (gemaess testing.md §5). Plain const wuerde "Cannot access before initialization" werfen.
- Handler-Spy via closure-Variable statt `vi.fn().mock.calls[0][1]` Cast — vermeidet TS-Strictness bei Tuple-Index-Access ohne args.

## Summary

Test-Gap aus 175b-Finding #3 geschlossen. withLogger hat jetzt direkte Unit-Coverage, komplementaer zu indirekter Coverage via logger/silentRejects/captureError-Tests.
