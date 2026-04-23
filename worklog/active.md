# Active Slice

```
status: idle
slice: —
stage: —
spec: —
impact: —
proof: —
review: —
```

## Tier-Plan Fortschritt (Slices 174-185, Stand 2026-04-24)

**Komplett abgearbeitet: 14 Slices**

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
| **178** | **Idempotency Foundation** | **A1** | ✅ |
| **179** | **Transactions Append-Only** | **A2** | ✅ |
| 180 | Service-Shape Pilot (INV-25) | B2 | ✅ |
| 185 | commitlint + lint-staged | D5 | ✅ |

## Offene Follow-ups (post-Marathon)

| Prio | Scope | Quelle |
|------|-------|--------|
| MED | 178a: Pilot-Integration idempotency in `buy_player_sc` | 178 |
| MED | 178b: Cleanup-Cron fuer expired dedup-keys | 178 |
| MED | 178c: `subscribe_to_club` inline → generic migration | 178 |
| MED | 178d: Client-side idempotency-key in useSafeMutation | 178 |
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

## Session 2026-04-24 Autonomous-Marathon

**CEO-Grant "voller Zugriff" — 14 Slices abgearbeitet.**

**Tier-Completion:**
- **Tier A (Money-Critical):** A1 Idempotency Foundation + A2 Transactions Append-Only — beides DB-live + verified
- **Tier B (Architecture):** B1 Zod + parseBody + withLogger-Admin-Integration — Foundation gelegt; B2 nur Pilot (INV-25 Fix)
- **Tier C (UI):** NICHT BEARBEITET — 181-184 brauchen Design-Deliberation
- **Tier D (Tooling):** D1 Pino + 19 Routes wrapped + direct-Tests; D2 captureError + PII-Redact + 22 Error-Boundaries; D5 commitlint/lint-staged

**Live-DB Changes (Supabase):**
- `request_dedup_keys` Table + `check_or_reserve_dedup_key()` Function (178)
- `transactions_append_only_guard` Trigger + REVOKE (179)

**Next-Session-Kandidaten (Priority):**
1. **178a** Pilot-Integration idempotency in `buy_player_sc` — schliesst Money-Defense-in-Depth-Loop
2. **185b** Bundle-Budget — erfordert `next build` Baseline-Snapshot
3. **181** Radix + **182** RHF — UI-Foundation parallel zu existing-feature-Polish
