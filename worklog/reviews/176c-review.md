# CTO Review: Slice 176c — PII-Redact Postgres Detail-Field

**Verdict:** PASS
**time-spent:** 22 min
**reviewer:** cold-context reviewer-agent (2026-04-23)
**note:** Finding #1 (`referral_code` fehlt) wurde IN 176c-Scope geschlossen (Set um 4 Secret-Felder erweitert, 2 neue Tests).

---

## Spec-Coverage

- [x] **A1** — sensitive col (email) → `[REDACTED]` (Test Z.149-159)
- [x] **A2** — non-sensitive col (slug) → kept (Test Z.161-171)
- [x] **A3** — Whitelist 13 Spalten: email, phone, phone_number, handle, username, first_name, last_name, full_name, password + referral_code, api_key, session_token, device_token
- [x] **A4** — Nur `Key (col)=(val)`-Pattern matched — free-text unchanged (Test Z.197-206)
- [x] **A5** — Case-insensitive via `col.trim().toLowerCase()` (Test Z.173-182)
- [x] **A6** — tsc clean + 32/32 Tests grün

Alle 6 AC erfüllt. Finding #1 intra-slice resolved.

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | ✅ RESOLVED | `captureError.ts:168-173` | `referral_code` + `api_key` + `session_token` + `device_token` nicht in Whitelist. | Intra-slice: 4 Einträge hinzugefügt + 1 Test `'Key (referral_code)=...'` + 1 Mixed-Test. |
| 2 | LOW | `captureError.ts:179-190` (Regex) | Composite-uniques `Key (email, club_id)=(a@b, uuid)` werden als ganzer `col`-String geprüft → whole-match kept statt redacted. BeScout-Schema aktuell keine PII-composite-uniques bekannt. | Optional Regex-Erweiterung: split col auf `,\s*`, wenn irgendein Teil im Set → redact. Follow-up-Slice nur wenn composite-PII-unique eingeführt wird. |
| 3 | LOW | `captureError.ts:138-145` (object-path) | Finding #3 aus 176b noch offen: object-literal-cause (z.B. `throw new ConflictError('x', 'y', { email: 'a@b.com' })`) umgeht redact-Kette via JSON.stringify. Keine aktuelle Callsite. | Bleibt in 176b-Follow-up-Liste. |
| 4 | NIT | Test-File | Fabrizierte 23514-Shape wurde auf realistisches 23505 korrigiert. | ✅ resolved |

## Pattern-Konformität

- ✅ **Closer-to-source redact** — serializeCause statt Sentry beforeSend. Testbar, auch für Pino-Logs nutzbar.
- ✅ **Whitelist > Blacklist** — fail-safe, explicit opt-in neue Spalten
- ✅ **Set-Lookup O(1)** — kein Regex-per-Loop overhead
- ✅ **Non-backtracking Regex** `[^)]+` — ReDoS-safe
- ✅ **Case-insensitive + trim** — defense-in-depth
- ✅ **Multi-match via `/g`** — 2+ PII-cols in einem detail korrekt
- ✅ **Zero-Breaking-Change** — bestehende serializeCause-Shape intakt
- ✅ **Cross-Ref Slice-Tag** konsistent mit 176/176b

## Fokus-Antworten

**Regex robust gegen verschachtelte Klammern?** `[^)]+` matched bis first `)`. UUID/Email/Phone enthalten keine `)`. Postgres 23505/23503 emittiert keine escapte Parens im Payload — low-risk.

**PII-Liste vollständig für BeScout?** Nach Erweiterung in 176c (Finding #1 resolved): 13 Spalten. Deckt alle BeScout-UNIQUE-Spalten mit PII/Secret-Character ab. Fehlend wären nur noch `ip`-Felder — aktuell keine Tabelle mit IP-UNIQUE.

**Regex false-positives in freetext?** `redactPgDetail` wird NUR auf `detail`-Feld angewendet, nicht `message`. Scope A4 erfüllt.

**Andere Felder redact-nötig?** Nein. `message` = Postgres-driver-Text ohne User-Wert typisch. `constraint` = Constraint-Name, safe.

## Positive

- Closer-to-source Redact
- Whitelist-approach fail-safe
- O(1) Lookup, non-backtracking Regex
- Multi-match + case-insens + Mixed-test
- Zero-Breaking-Change
- Finding #1 (referral_code + secret-tokens) in-slice geschlossen
- Doc-Kommentar erklärt Motivation für Secrets-Separation (Z.169-170)

## Learnings für Knowledge-Capture

1. **Pattern:** "Postgres `detail`-PII-redact: Whitelist-Set + non-backtracking Regex + case-insens `toLowerCase().trim()`. `redactPgDetail` als Helper in `serializeCause`."
2. **Anti-Pattern:** "Sentry `beforeSend`-Hook für PII-redact ist zu spät — closer-to-source (serializeCause) ist besser testbar + wirkt auch für Pino-Logs."
3. **BeScout-Schema-Reference:** "PII-tragende UNIQUE-Spalten: handle, email, phone, first_name, last_name, referral_code. Secret-Tokens (api_key, session_token, device_token) präventiv whitelistet."
4. **Edge-Case-Future:** "Composite-Uniques `Key (col1, col2)=...` sind regex-kompatibel aber whole-col-check-blind — erst redact-Erweiterung wenn BeScout composite-PII-unique einführt."

## Summary

XS-Slice erfüllt 176b-Finding #2 sauber. Implementation minimal, testbar, additive. Durch in-slice-Resolution von Finding #1 jetzt 13-Spalten-Whitelist (statt 9), zwei zusätzliche Tests. 32/32 grün, tsc clean. Ein LOW-Finding offen (composite-key) als dokumentierter Follow-up nur wenn Schema-Erweiterung das triggert.

**Empfohlener nächster Slice:** 176d (batch-migrate 15 `error.tsx`-Boundaries auf `captureError` — aktuell `console.error` ohne Sentry). Danach 177 (Zod + Pilot-Schemas Tier B1).
