# CTO Review: Slice 176b — captureError Follow-ups (Tier D2 Finish)

**Verdict:** PASS
**time-spent:** 18 min
**reviewer:** cold-context reviewer-agent (2026-04-23)

---

## Spec-Coverage

- [x] **A1** — `global-error.tsx` nutzt `captureError` mit `feature: 'global-error-boundary'` + optionalem `extra.digest`
- [x] **A2** — `extractDomainContext` returniert `extra.cause = { name, message, code?, status?, detail?, constraint? }`
- [x] **A3** — Postgres-cause-Fall getestet (ConflictError wrapping pgErr mit 23505 + detail + constraint)
- [x] **A4** — Non-DomainError bleibt ohne cause-Key (ValidationError ohne cause, getestet)
- [x] **A5** — `pattern_observability_stack.md` Z.63-70 zeigt aktuelle Shape + Change-Notice
- [x] **A6** — tsc clean + 25/25 Tests grün

Alle 6 AC erfüllt. Original Findings #1 + #2 aus 176-Review sind adressiert.

---

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | LOW | `captureError.ts:138-145` (object-path) | `JSON.parse(JSON.stringify(cause))` serialisiert arbitrary Objekt-Felder unverändert. Kein Prod-Risk (alle aktuellen Callsites = Error-instance oder String), aber Future-Regression-Potential wenn jemand non-Error object-cause wirft. | Doc-Kommentar "non-Error object-causes werden opportunistisch serialisiert — eigene Error-artige Objekte sollten von `Error` erben." Follow-up, nicht blocker. |
| 2 | LOW | `captureError.ts:134` (Postgres `detail`) | Postgres 23505-errors liefern `detail` im Format `Key (email)=(user@example.com) already exists.` — user-eingegebene Werte (E-Mails) können in Sentry-extra landen. Aktuell LOW weil `sendDefaultPii: false`. | Option: `beforeSend`-Hook in Sentry-config mit PII-Pattern-Redact, ODER `detail` nur in Dev-Build, ODER Doku in `business.md`. Follow-up-Slice. |
| 3 | NIT | `captureError.test.ts` | Nicht getestet: number-cause, cyclic-object-cause, null-cause explicit. Alle defensive-paths mit trivialer Logik. | Optional 2-3 Zeilen, nice-to-have. |
| 4 | NIT | `captureError.ts:111` | `rec.cause !== undefined && rec.cause !== null` könnte `rec.cause != null` werden. Aktuell explizit = intentional, liest sich klarer. | Kein Fix. |

## Pattern-Konformität

- ✅ **Observability-Stack** — Shape-Contract konsistent mit 176 (feature+code in tags, payload in extra). cause wandert korrekt in `extra`.
- ✅ **DomainError-Contract (Slice 174)** — `cause?: unknown` base-field, `isDomainError`-Guard korrekt genutzt
- ✅ **Silent-Fail-Audit** — reines additive Refactor, serializeCause hat try/catch mit fallback-return (nicht silent)
- ⚠️ **PII-Policy** — Finding #2 (Postgres `detail` grenzwertig, LOW)
- ✅ **Next.js 14 App-Router** — `error: Error & { digest?: string }` matcht offizielle Signatur

## Fokus-Antworten

**serializeCause robust gegen Zyklen?** Ja. Error-path = Property-Lookup auf Whitelist, KEIN Recursion/JSON.stringify → cycle-immune. Object-path fängt TypeError via try/catch → fallback-message.

**Postgres-Felder korrekt?** Ja. `code/status/detail/constraint` aus native PgError extrahiert, getestet. Bemerkung: `hint` nicht extrahiert (spec-out).

**Digest-Handling typisiert?** Ja. Matcht Next.js 14 Konvention. Empty-object-Extras bei fehlendem digest vermieden.

**PII-Leak?** Potenziell bei 23505 `detail` — siehe Finding #2.

**Test-Coverage-Gaps?** cyclic + number + null — alle defensive, via Guards abgedeckt, nicht verdict-relevant.

## Positive

- Clean whitelist-shape für PgError
- Defense-in-depth bei object-path (try/catch)
- Explicit null-check zusätzlich zu undefined
- Tests mit Slice-Tag konsistent gepflegt
- Doc-Update nicht vergessen (pattern_observability_stack.md)
- Scope clean: nur Finding #1 + #2 aus 176-Review adressiert, kein Scope-Creep
- Original Reviewer-Chain geschlossen

## Learnings für Knowledge-Capture (Jarvis-Review)

1. **Pattern:** "Error-cause Sentry-Serialization — whitelist shape (name/message/code/status/detail/constraint), niemals JSON.stringify auf Error-instance (stack-leak + cycle-risk). `cause` in `extra`, nicht `tags`."
2. **Business-Rule:** "Postgres `detail` auf 23505 kann PII enthalten — bei Sentry-capture ggf. redacten."
3. **Anti-Pattern:** "`JSON.parse(JSON.stringify(x))` ist KEIN robuster Serializer für production-error."

## Summary

Follow-up-Slice erfüllt alle 3 Original-Findings. Implementation minimal, testbar, cycle-safe, PII-bewusst. 6/6 AC, tsc clean, 25/25 Tests grün. Keine blocker.

**Empfohlener nächster Slice:** 177 (Zod + Pilot-Schemas, Tier B1) gemäß Tier-Plan. Finding #2 (PII-redaction) kein Blocker, aber könnte als Micro-Slice vor Beta-Live gemacht werden wenn Sentry-`beforeSend`-Hook sowieso gesetzt wird.
