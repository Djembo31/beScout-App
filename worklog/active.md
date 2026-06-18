# Active Slice

```
status: idle
slice: 339
title: ✅ DONE — PostgREST-1000-Cap-Härtung (getPlayerNames + Follower-Notify)
stage: LOG complete
spec: worklog/specs/339-postgrest-cap-limit-hardening.md
impact: skipped (kein Contract-Change — Return-Typen identisch, nur mehr Rows; Pattern 1:1 aus club.ts)
proof: worklog/proofs/339-vitest.txt
review: worklog/reviews/339-review.md
```

## Zuletzt
- **Slice 338** (2026-06-18) — Predictions-Removal (L, 5 Achsen + DB-DROP). PASS, applied + live.
- **Slice 339** (2026-06-18) — PostgREST-1000-Cap-Härtung (S). Reviewer PASS, 9/9 + 62/62 Regression.

## Danach (offene Fixes-Cluster, Anil 2026-06-18)
- **Notify-Fan-out-Batching** (339-Review-NIT#1): `Promise.all` über alle Follower → Mega-Club-Concurrency-Storm. Chunks/Fan-out-RPC.
- polls.md §9 Doku-Refresh · bounty reward_cents-Drift (CHECK 100k vs RPC 1M) · auto_close_expired_bounties AR-43-Migration · dann Polls P3c Fan-Rang / E0-W4.
