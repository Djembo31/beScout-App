# Active Slice

```
status: in_progress
slice: 178f
stage: LOG
spec: worklog/specs/178f-call-site-migration.md
impact: skipped (client call-site migration, no domain-impact)
proof: worklog/proofs/178f-call-site-migration.txt
review: self-review (pattern-repetition sweep)
```

## Priority-1-Marathon 2026-04-24 — KOMPLETT + Call-Site-Sweep

| Slice | Scope | Status |
|-------|-------|--------|
| 178b | dedup-keys Cleanup-Cron | ✅ |
| 178c | subscribe_to_club Idempotency (RPC) | ✅ |
| 178e-a..e | 4 Money-RPCs Integration | ✅ |
| 178d | useSafeIdempotentMutation primitive | ✅ |
| **178f** | **6 Call-Sites migriert — Auto-Key live** | **✅** |

**Money-Defense-in-Depth jetzt End-to-End aktiv:**
- DB-layer (179 append-only + 178 foundation)
- Server-RPC (178a/c/e-a..e)
- Client-primitive (178d)
- Call-Sites (178f) — 6 Money-Hooks schicken Auto-Key mit.
