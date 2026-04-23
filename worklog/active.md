# Active Slice

```
status: in_progress
slice: 177b
stage: LOG
spec: worklog/specs/177b-withlogger-admin-routes.md
impact: skipped (route-wrapper migration)
proof: worklog/proofs/177b-withlogger.txt
review: worklog/reviews/177b-review.md (PASS, Self-Review XS-Pattern-Repetition)
```

## Offene Follow-up-Kandidaten

Stand 2026-04-24 — Follow-ups aus 176/176b/176c/176d Reviews die noch offen sind:

| Prio | Scope | Quelle |
|------|-------|--------|
| LOW | `.claude/rules/common-errors.md` Pattern-Addendum "Error-Boundary-Migration: 2 Scopes" | 176d Finding #2 |
| LOW | `memory/pattern_observability_stack.md` ggf. Addendum "Next.js Boundary-Instrumentation" | 176d Knowledge-Capture |
| LOW | Composite-unique Regex-Edge `Key (col1, col2)=(...)` wenn BeScout composite-PII-unique einfuehrt | 176c Finding #2 |
| LOW | serializeCause object-path: Doku-Kommentar fuer non-Error object-cause | 176b Finding #1 |

Alle LOW + non-blocking. Koennen als Sammel-Doc-Commit oder pre-Beta-Micro-Slice abgearbeitet werden.

## Tier-Plan Fortschritt (Slices 174-185)

| Slice | Scope | Tier | Status |
|-------|-------|------|--------|
| 174 | Error-Classes Foundation | A3 | ✅ DONE |
| 175 | Pino Structured-Logging | D1 | ✅ DONE |
| 176 | Sentry-Wrapper + captureError | D2 | ✅ DONE |
| 176b | captureError Follow-ups | D2 | ✅ DONE |
| 176c | PII-Redact Postgres Detail | D2 | ✅ DONE |
| 176d | Error-Boundaries Migration | D2 | ✅ DONE |
| **177** | **Zod + Pilot-Schemas** | **B1** | **NEXT** |
| 178 | Idempotency Infrastructure | A1 | PLANNED |
| 179 | Transactions Append-Only | A2 | PLANNED |
| 180 | Service-Shape Consolidation (15 Files) | B2 | PLANNED |
| 181-184 | Radix + RHF + Tokens + Animations | C1-C4 | PLANNED |
| 185 | Bundle-Budget + lint-staged + commitlint | D5+D6 | PLANNED |

## Fokus

Slice 174 — Error-Classes Foundation (Tier A3 aus Sorare/Socios-Audit).

**Scope:** 2 neue Files. Pure TS. Keine Consumer-Aenderung.

## Tier-Plan (Slices 174-185)

| Slice | Scope | Tier |
|-------|-------|------|
| **174** | **Error-Classes Foundation** | A3 |
| 175 | Pino Structured-Logging | D1 |
| 176 | Sentry-Wrapper + captureError | D2 |
| 177 | Zod + Pilot-Schemas | B1 |
| 178 | Idempotency Infrastructure | A1 |
| 179 | Transactions Append-Only | A2 |
| 180 | Service-Shape Consolidation (15 Files) | B2 |
| 181-184 | Radix + RHF + Tokens + Animations | C1-C4 |
| 185 | Bundle-Budget + lint-staged + commitlint | D5+D6 |

## Session-Ziel

Tier A-D aus Sorare/Socios-Audit systematisch abarbeiten.
