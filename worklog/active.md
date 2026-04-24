# Active Slice

```
status: in-progress
slice: 187b
stage: PROVE
spec: inline (187 Follow-Up — expire-orders cron gap)
impact: skipped (neue route.ts + vercel.json entry, keine existing code touched)
proof: worklog/proofs/187b-expire-orders-cron.txt
review: self-review (template-copy aus close-expired-bounties, tsc clean)
```

## Ziel

Cron-Gap-Fix: `expire-orders` route + vercel.json entry (Regression-Prevention für SM-ORD-04).

## Files

- `src/app/api/cron/expire-orders/route.ts` (NEU, Template aus close-expired-bounties)
- `vercel.json` (+1 cron entry, daily 05:30 UTC)

## Zuletzt

- **Slice 187** (2026-04-24) — DB-Invariant-Cleanup (5 failures → 0) (S, PASS).
- **Slice 181f+h** (2026-04-24) — EventDetailModal + Modal/ConfirmDialog Cleanup (L, PASS).
- **Slice 181e2** (2026-04-24) — Modal→Dialog Player-Detail Trading (4 Files, smoke PASS).
