# Active Slice

```
status: in_progress
slice: 178d
stage: LOG
spec: worklog/specs/178d-safe-idempotent-mutation.md
impact: skipped (client-primitive, no domain impact)
proof: worklog/proofs/178d-safe-idempotent.txt
review: self-review
```

## Priority-1-Marathon 2026-04-24 — KOMPLETT

| Slice | Scope | Status |
|-------|-------|--------|
| 178b | dedup-keys Cleanup-Cron | ✅ |
| 178c | subscribe_to_club Idempotency | ✅ |
| 178e-a | buy_from_order Idempotency | ✅ |
| 178e-b | place_sell_order Idempotency | ✅ |
| 178e-c | place_buy_order Idempotency | ✅ |
| 178e-d | liquidate_player Idempotency | ✅ |
| 178e-e | open_mystery_box_v2 Idempotency | ✅ |
| 178d | useSafeIdempotentMutation + Auto-Key | ✅ |

**7 Money-RPCs integriert** (incl. 178a aus voriger Marathon-Phase: buy_player_sc). **8 Slices live** in dieser Session.

## Open Follow-ups (post-Marathon)

| Prio | Scope |
|------|-------|
| MED | Migration Call-Sites auf useSafeIdempotentMutation (pro Feature 1 XS-Slice): Trading, Subscribe, MysteryBox, Liquidate |
| MED | Radix UI-Primitives (181) — Design-Deliberation |
| MED | React Hook Form + Zod (182) |
| LOW | 185b Bundle-Budget — next build Baseline |
| LOW | common-errors.md "Money-RPC Idempotency Blueprint" Pattern-Addendum |
