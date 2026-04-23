# CTO Review: Slice 175b — withLogger-Batch-Migration aller verbleibenden API-Routes

**Verdict:** PASS
**time-spent:** 22 min
**reviewer:** cold-context reviewer-agent (2026-04-23)

---

## Spec-Coverage

| AC | Status | Evidence |
|----|--------|----------|
| A1 | PASS | 19/19 route.ts Files haben `withLogger` (15 neue + 4 aus 177b). 0 Files mit altem Pattern |
| A2 | PASS | 19 distinct route-strings, namespace-konsistent (`admin.*`, `cron.*`, `public.*`) |
| A3 | PASS | 18 `console.error`-Calls in 11 Files intakt — nichts versehentlich entfernt |
| A4 | PASS | Response-Shape + Status-Codes unveraendert — nur Signatur-Wrap |
| A5 | PASS | tsc clean + 57/57 observability-tests gruen |
| A6 | PASS | Dynamic route `[name]` via generic `withLogger<Promise<{name:string}>>` funktional korrekt |

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | LOW (type-safety) | `trigger-cron/[name]/route.ts:33` | `await (params as Promise<{name:string}>)` castet `\|undefined` weg. Next.js garantiert params bei dynamic routes, kein Runtime-Bug. | Option: apiLogger routeCtx von `?:` zu non-optional machen, ODER `if (!params) return 400; const { name } = await params;` |
| 2 | LOW (cosmetic) | `trigger-cron/[name]/route.ts:35-139` | Mixed indentation — 2 vs 4 spaces nach Wrap | `npx prettier --write` |
| 3 | LOW (test-gap) | `apiLogger.ts/withLogger` | Keine direkte Unit-Coverage (57 Tests decken logger/silentRejects/captureError ab, nicht withLogger selbst) | Follow-Slice: Mini-Test-Datei `apiLogger.test.ts` mit request.start/end/error-path/x-request-id |
| 4 | LOW (prevention) | Process | Proof zeigt nur tsc, kein `next build`. common-errors.md §7 warnt: Route-Type-Mismatches werden nur von next build gefangen, nicht tsc | Pre-commit oder ship-route-build-gate hook: `next build` bei Edit auf `src/app/api/**/route.ts` |

## Fokus-Antworten

**gameweek-sync GET-Boundary:** ✅ Handler sauber Z.116-334 mit `});`. Helper `syncLeague` ab Z.340 unberuehrt. Initial-Misstake-Korrektur sauber.

**trigger-cron multi-line-Wrap:** ✅ Generic `<Promise<{name:string}>>` setzt TParams korrekt. Destructurierung `{ params }` klappt runtime. Next.js 15-ready.

**Mixed indentation:** Rein kosmetisch, ESLint-compatible.

**Runtime-Konfiguration:** ✅ `runtime/dynamic/maxDuration` unveraendert hinter Handler. Konform mit Slice 069.

**Dynamic-Route-Params Typing:** TParams = Promise<> ist Next.js 15 async-params-ready.

**console.error Preserved:** ✅ 18 Calls in 11 Files intakt.

## Pattern-Konformitaet

- ✅ Slice 175 withLogger Blueprint konsistent angewendet
- ✅ Slice 069 "keine named-exports in route.ts" — nur HTTP-Methods + `runtime/dynamic/maxDuration`
- ✅ Slice 177b Route-String-Konvention `namespace.route-name` ausgeweitet auf 15 weitere
- ✅ Module-level Caches (eventsCache, moversCache, playersCache) durch Wrap unbeeinflusst
- ✅ Scope-Disziplin — console.error, log.error-migration, Zod-validation bewusst scope-out

## Positive

- Systematik: 15/15 Blueprint-konform
- Dynamic-route-Sonderfall mit generic typing sauber adressiert (kein `any`)
- Scope-Out diszipliniert — kein Scope-Creep
- Caching preserved (events/players module-level)
- Route-String-Taxonomie ermoeglicht Sentry/Pino Cohort-Alerts

## Learnings fuer Knowledge-Capture

1. **Pattern `memory/patterns.md`:** Next.js Route-Handler Wrapping mit Generic-Params — Pattern-Template fuer static + dynamic routes
2. **Process `.claude/rules/common-errors.md` §7:** "tsc-clean ist KEIN Proof fuer Route-Handler-Type-Safety — `next build` bei Route-Edit zusaetzlich pflicht"
3. **Test-Gap:** apiLogger.ts/withLogger braucht direkte Unit-Coverage (separater Slice 175c)

## Summary

Saubere Batch-Migration. 6/6 AC erfuellt, 19/19 Routes unter withLogger, alle LOW-Findings non-blocker. Nach Merge sind alle API-Routes observabel — Foundation fuer Dashboards/Alerts basierend auf route-tag steht.

**Empfohlene naechste Schritte:** 178 (Idempotency Tier A1, CEO-Scope) ODER 175c (apiLogger.test.ts fuer withLogger-Coverage, Finding #3). Finding #2 (prettier) als Doc-Commit-Kandidat, Finding #1 (null-safe params) als Mini-Slice.
