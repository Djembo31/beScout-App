# Active Slice

```
status: idle
slice: 340
title: ✅ DONE — create_user_bounty Reward-Guard an CHECK angleichen (Money-RPC)
stage: LOG complete
spec: worklog/specs/340-bounty-reward-guard-alignment.md
impact: skipped (1 RPC, kein neuer Consumer, Return-Shape unverändert)
proof: worklog/proofs/340-rpc.txt
review: worklog/reviews/340-review.md
```

## Zuletzt
- **Slice 339** (2026-06-18) — PostgREST-1000-Cap-Härtung (S). Reviewer PASS, 9/9 + 62/62.
- **polls.md §2-§9 Refresh** (2026-06-18) — Current-State-Drift geheilt (333-339 als gebaut markiert).
- **Slice 340** (2026-06-18) — Bounty-Reward-Guard an CHECK angeglichen (S, Money). Reviewer PASS, Boundary-Smoke grün.

## Danach (offene Fixes-Cluster, Anil 2026-06-18)
- **auto_close_expired_bounties** als getrackte Migration (AR-43) — live functiondef → Migration-File ziehen.
- **Notify-Fan-out-Batching** (339-Review-NIT#1): `Promise.all` über alle Follower → Mega-Club-Concurrency-Storm. Chunks/Fan-out-RPC.
- Dann: Polls P3c Fan-Rang / E0-W4 (Historie).
