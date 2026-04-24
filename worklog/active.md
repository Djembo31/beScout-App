# Active Slice

```
status: in_progress
slice: 178a
stage: LOG
spec: worklog/specs/178a-buy_player_sc_idempotency.md
impact: skipped (single-RPC integration, same contract via DEFAULT-NULL parameter)
proof: worklog/proofs/178a-replay.txt
review: worklog/reviews/178a-review.md
```

## Tier-Plan Fortschritt (Slices 174-185, Stand 2026-04-24)

**Komplett abgearbeitet: 15 Slices**

| Slice | Scope | Tier | Status |
|-------|-------|------|--------|
| 174 | Error-Classes Foundation | A3 | ✅ |
| 175 | Pino Structured-Logging | D1 | ✅ |
| 175b | withLogger Batch 15 Routes | D1 | ✅ |
| 175c | apiLogger.test.ts | D1 | ✅ |
| 176 | Sentry captureError Wrapper | D2 | ✅ |
| 176b | captureError Follow-ups | D2 | ✅ |
| 176c | PII-Redact Postgres Detail | D2 | ✅ |
| 176d | Error-Boundaries 22 Files | D2 | ✅ |
| 177 | Zod + Pilot-Schemas | B1 | ✅ |
| 177b | withLogger Admin-Routes | B1 | ✅ |
| 178 | Idempotency Foundation | A1 | ✅ |
| **178a** | **buy_player_sc Idempotency-Integration** | **A1** | ✅ |
| 179 | Transactions Append-Only | A2 | ✅ |
| 180 | Service-Shape Pilot (INV-25) | B2 | ✅ |
| 185 | commitlint + lint-staged | D5 | ✅ |

## Offene Follow-ups (post-178a)

| Prio | Scope | Quelle |
|------|-------|--------|
| MED | 178b: Cleanup-Cron fuer expired dedup-keys | 178 |
| MED | 178c: `subscribe_to_club` inline → generic migration | 178 |
| MED | 178d: Client-side idempotency-key in useSafeMutation | 178 |
| MED | 178e: Weitere Money-RPCs (buy_from_order, place_sell_order, liquidate_player, openMysteryBox) via Pattern-Wiederholung | 178a |
| MED | 180b: Service-Shape — votes/adminDeletePost/adminTogglePin | 180 |
| MED | 181 Radix UI-Primitives | C1 — Design-Deliberation noetig |
| MED | 182 React Hook Form + Zod-integration | C2 — Form-Pattern-Scope |
| MED | 183 Design Tokens (CSS vars) | C3 — Token-Inventory noetig |
| MED | 184 Motion Design | C4 — Animation-Guidelines noetig |
| LOW | 185b Bundle-Budget (size-limit) | 185 — Baseline-Messung noetig |
| LOW | common-errors.md Pattern "Error-Boundary 2-Scopes" | 176d |
| LOW | pattern_observability_stack.md Addendum | 176d |
| LOW | serializeCause object-path Doku-Kommentar | 176b |
| LOW | Composite-unique Regex-Edge | 176c |
| LOW | trigger-cron params null-safe + prettier format | 175b |
