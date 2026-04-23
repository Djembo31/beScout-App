# CTO Review: Slice 176 — Sentry captureError Wrapper (Tier D2)

**Verdict:** PASS
**time-spent:** 22 min
**reviewer:** cold-context reviewer-agent (2026-04-23)

---

## Spec-Coverage

- [x] **A1** — `captureError(err)` extrahiert `tags.code = err.code` bei `isDomainError` (captureError.ts:48,50)
- [x] **A2** — Context-tags gemerged mit code-tag (tested)
- [x] **A3** — Unknown-err via `toDomainError` normalisiert (captureError.ts:47)
- [x] **A4** — `captureMessage(msg, level, ctx?)` für Breadcrumb-Events (captureError.ts:71-88)
- [x] **A5** — `silentRejects.ts` + `apiLogger.ts` delegieren (silentRejects.ts:26,55; apiLogger.ts:95)
- [x] **A6** — tsc clean + 22/22 tests grün

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | LOW | `captureError.ts:94-110` (`extractDomainContext`) | `DomainError.cause` wird **nicht** in Sentry `extra` gestellt. Bei `ConflictError(msg, entity, pgErr)` geht der Original-Postgres-Error-Code (23505, etc.) + message verloren — Sentry sieht nur den wrapped-message. | Erweitern um `if (rec.cause !== undefined) out.cause = serializeCause(rec.cause)` mit flacher Shape `{ name, message, code, status }`. Follow-Slice. |
| 2 | LOW | `memory/pattern_observability_stack.md:65` (Doc-Drift) | Tag-Shape-Contract-Change: vor 176 war `tags: { silentReject: 'true', label: 'x' }`, jetzt `tags: { feature: 'silentReject', code: 'unexpected' }` + `extra: { label }`. Pattern-Doc Z.65 ist stale. **Kein Alert betroffen** (die 3 aktiven Beta-Sentry-Alerts sind nicht tag-basiert). | Doc-Update in pattern_observability_stack.md Z.65 — Tag-Shape-Tabelle aktualisieren. |

## Pattern-Konformität

- ✅ **Observability-Stack #pattern_observability_stack:** 3-Tier-Hierarchie bleibt, innere Mechanik konsolidiert in D2-Wrapper
- ✅ **Slice 174 `toDomainError` Contract:** pure function, kein Zirkular-Import, kein Throw-Risk
- ✅ **PII-Policy:** userId bleibt UUID-only (captureError.ts:59), keine PII in tags/extra
- ✅ **Silent-Fail-Audit:** Delegation ist reines Refactor, keine neuen unchecked-catch-Pfade

## Fokus-Antworten

**Shape-Migration korrekt?** Ja technisch. `label` → `extra` (suchbar, nicht filterbar). `feature` wird stabiler Cohort-Tag. Die 3 dokumentierten Sentry-Alert-Rules sind nicht impacted (nicht tag-basiert).

**Fehlende Tag-Keys?** Keine blocker. `environment` redundant (Sentry-config), `domain_error_class` redundant mit `code`, `is_domain_error` unterscheidbar via `code: unexpected`.

**`extractDomainContext` vollständig?** Alle subclass-public-Felder (field/entity/id/retryAfterMs/requiredCents/availableCents/deltaCents) ✅. **Ausnahme:** `DomainError.cause` (Finding #1).

**Direkte Sentry.captureException-Callsites?** Eine relevante: `src/app/global-error.tsx:14` — Top-Level Error-Boundary. Follow-Slice-Kandidat (HIGH-Impact, 1-Line-Change). Andere Sentry-Calls (AuthProvider setUser/addBreadcrumb) sind scope-outside (Session-Operations, keine Error-Capture).

**Race/Circular:** ✅ Kein Risiko.

**Test-Coverage:** 8 Cases gut gedeckt. Nicht getestet (nice-to-have, nicht verdict-relevant):
- `captureError(null)` / `captureError(undefined)`
- Merge-Precedence: ctx.extra vs extractDomainContext (DomainError.field überschreibt ctx.extra.field via Spread-Order)
- captureMessage mit ctx.extra

## Follow-up-Slice-Candidates

| # | Priorität | Scope | Aufwand |
|---|-----------|-------|---------|
| 1 | HIGH | `global-error.tsx:14` migrieren auf `captureError(error, { feature: 'global-error-boundary' })` | 1-Line |
| 2 | MEDIUM | `extractDomainContext` um `cause` erweitern (Postgres-Error-Code-Preservation) | 10 Lines |
| 3 | LOW | `memory/pattern_observability_stack.md:65` Doc-Update | Doc |
| 4 | MEDIUM | 15 `error.tsx`-Route-Boundaries auf `captureError` — aktuell `console.error` ohne Sentry | Multi-File |
| 5 | OUT-OF-SCOPE | Service-Layer `{success, error}` auf typed throws (Slice B2 aus 174-Review) | Separat geplant |

## Positive

- **Clean Delegation-Architektur** — Tag-Logic zentral, testbar, mockbar
- **Error-Normalization-Kette konsistent** — alle Paths durch `toDomainError`
- **TypeScript-Strict** — `ErrorCode` Union, `SeverityLevel` import, `Record<string,string>` tags
- **Test-Mocks sauber** — `vi.clearAllMocks()` beforeEach, keine Mock-Leaks
- **apiLogger Tag-Wahl elegant** — `requestId` als Tag (filterbar) statt extra
- **silentRejects.test.ts konsistent gepflegt** — Shape-Änderung dokumentiert mit Kommentar

## Summary

Foundation-Slice solid. Alle 6 AC erfüllt, 22/22 Tests grün, tsc clean. Zwei LOW-Findings sind Follow-Slice-Material, keine Commit-Blocker.

**Empfohlener nächster Slice:** 176b oder 177 — `global-error.tsx`-Migration + pattern_observability_stack.md Doc-Update (beides 1 Commit).
