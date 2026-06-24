# Slice 369 Review — /api/push 500 Fail-Safe + VAPID Secret Heal

**Reviewer:** cold-context reviewer agent · **Date:** 2026-06-24 · **time-spent:** 9 min

## Verdict: PASS

## Findings
| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NITPICK | pushSender.ts:36 | mailto `info@bescout.com` vs branding `bescout.net` — pre-existing, not this slice. Harmless (web-push only needs valid mailto/https subject). | Out of scope; future hygiene pass. |
| 2 | NITPICK | vapidKey.ts | Strips wrapping quotes/whitespace but not an *interior* newline (theoretical only; prod corruption was trailing). Conservative strip is arguably better — lets a truly-bad key fail loudly. | No change. |
| 3 | GAP (non-block) | ensureVapid | AC2 verified by inspection, no mocked-throw unit test. | RESOLVED — added `pushSender-vapid-failsafe.test.ts` (2 cases: no-throw + capture-once). |

## Key confirmations
1. **ensureVapid try/catch correct.** Order: `_vapidInitialized` → `_vapidFailed` → sanitize → empty-guard → try/setVapidDetails. `_vapidInitialized` only on success. `_vapidFailed` resets per cold-start/redeploy → recovery after secret heal works; only suppresses retry within a warm runtime. Acceptable + correct.
2. **No over-strip.** Regex `^['"]+|['"]+$` anchors to start/end, only `'`/`"`. base64url alphabet `[A-Za-z0-9_-]` contains neither → real key never strippable. `-`/`_` body-preservation tested.
3. **captureError correct, no PII.** web-push validation errors are static strings, never echo key bytes. No secret reaches Sentry.
4. **No path still throws 500 onto money path.** All push throw-sites contained (ensureVapid caught; allSettled per-sub; lookup errors → return false). Push is fire-and-forget from client.
5. **Client sanitize safe.** No-op on clean keys; only repairs quote/newline-corrupted build values. Benefit materializes after redeploy (NEXT_PUBLIC build-time inlined).
6. **Root cause proven, not guessed** (live vercel env pull + web-push source line refs + apiLogger throw-only-capture). Gold-standard root-cause discipline.

## Learnings → Knowledge Capture (promoted)
- **errors-infra.md:** (a) Fire-and-forget side-effect on a money/critical path must never let a config-validation throw (`setVapidDetails`, SDK `init()`, key parsing) bubble to its HTTP route → 500. Pattern: try/catch → degrade-to-skip + capture-once flag. (b) Inner route catch that RETURNS an error response (instead of throwing) bypasses `withLogger`/middleware observability → live errors invisible in Sentry (distinct silent-fail class).
- Secret-paste-drift (quote+newline on manual paste) recurs → defensive sanitizer at every secret-env read is the mitigation.
