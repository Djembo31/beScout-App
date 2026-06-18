# Active Slice

```
status: idle
slice: 336
title: ✅ DONE — Polls P3 (Follower-Reichweite + Abo-2×-Gewicht bei Paid-Polls)
stage: LOG complete
spec: worklog/specs/336-polls-p3-social-layer.md
impact: in Spec §3
proof: worklog/proofs/336-proof.md
review: worklog/reviews/336-review.md
```

## Zuletzt
- **Slice 335** (2026-06-18) — Event-Absage geld-sicher. CONCERNS→geheilt, live.
- **Slice 336** (2026-06-18) — Polls P3 (L, Money-near). Reichweite (Follower-Notify poll_new) + Abo-2×-Gewicht (cast_community_poll_vote, Tally-only, Geld unverändert). Fan-Rang deferred (Anil).

## Plan (BUILD)
1. Migration: community_poll_votes +weight · cast_community_poll_vote +weight (Money byte-identisch) · notifications_type_check +'poll_new'.
2. Type NotificationType +'poll_new'.
3. Service createCommunityPoll → Follower-Notify.
4. notifText pollNew de+tr.
5. NotificationDropdown Icon+Color 'poll_new'.
