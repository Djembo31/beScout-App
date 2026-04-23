# Slice 176c — PII-Redact Postgres Detail-Field (Tier D2 PII-Fix)

**Typ:** XS-Slice. Money-Path: Nein. Follow-up aus `worklog/reviews/176b-review.md` Finding #2.
**Impact:** skipped (internal observability-module, no consumer changes).

---

## Ziel

Postgres-23505-errors liefern `detail`-Field im Format `Key (<column>)=(<value>) already exists.`. Bei sensitive columns (email, phone, handle, first_name, last_name) landet User-eingegebener Text in Sentry-extra. Fix: redact im `serializeCause` (closer-to-source als Sentry `beforeSend`, besser testbar, wirkt auch fuer zukuenftige Logs).

Gilt analog fuer 23503 (foreign_key_violation) mit gleichem `Key (col)=(val)` Format.

---

## Betroffene Files

| # | File | Aenderung |
|---|------|-----------|
| 1 | `src/lib/observability/captureError.ts` | `serializeCause`: neue `redactPgDetail(detail)` Helper. Pattern-Match `Key (<col>)=(<value>)` + Redact bei sensitive col-name. |
| 2 | `src/lib/observability/__tests__/captureError.test.ts` | 3-4 neue Tests: sensitive col (email → redacted) + non-sensitive col (slug → kept) + multi-match + no-match-kept. |

---

## Acceptance Criteria

1. **A1** — `Key (email)=(user@x.com) already exists.` → `Key (email)=([REDACTED]) already exists.`
2. **A2** — `Key (slug)=(fc-bayern) already exists.` → unchanged (non-sensitive col-name)
3. **A3** — Sensitive col-list: email, phone, phone_number, handle, username, first_name, last_name, password, full_name (whitelist-Driver approach)
4. **A4** — Regex matched NUR im Postgres `detail`-Format — freies Text-Format bleibt unberuehrt
5. **A5** — Redact ist case-insensitive fuer col-name (`EMAIL` genauso wie `email`)
6. **A6** — tsc clean + Tests gruen

---

## Scope-Out

- Sentry `beforeSend`-Hook Defense-in-Depth — scope-creep (serializeCause ist closer-to-source, reicht)
- 23503 (foreign-key-violation) detail mit UUID-Werten — UUIDs sind keine PII per se, not-in-scope
- `message`-Feld redact — Postgres-driver-messages koennen in seltenen Faellen auch Werte enthalten, not-in-scope (low-risk)

---

## Proof-Plan

`worklog/proofs/176c-pii-redact.txt` — vitest + tsc + Beispiel-Input/Output.

---

## Time-Estimate

~10 min.
