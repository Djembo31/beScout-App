# Active Slice

```
status: idle
slice: 356
title: ✅ DONE — Exklusive Treue-Umfragen (Fan-Rang-Tor auf Community-Polls) + 80/20-Fee-Heal
stage: LOG complete
size: M
slice-type: Service + Migration + UI (cross-domain, money-nah)
spec: worklog/specs/356-exclusive-loyalty-polls.md
impact: skipped (Consumer in Spec §3/§4 kartiert)
review: worklog/reviews/356-review.md (REWORK→geheilt: Fee 343-Bug 70/30→80/20)
proof: worklog/proofs/356-money-smoke.txt (+ 356-rpc.txt + 356-vitest.txt; UI-Playwright post-Deploy)
next: S7-Aufräumen (scout_scores↔user_stats / Monthly-Liga-Board / Dormant / Bridges; ⛔ players.club=API-Key)
```

## Ergebnis Slice 356

- Schema `community_polls.min_fan_rank_tier` (NULL=offen, CHECK 6-Tier-Mirror).
- `create_community_poll` +Param (nur source='club'), alte Overload gedroppt, AR-44.
- `cast_community_poll_vote` Vote-Guard VOR Wallet (gespeicherter Rang, fail-closed, money-safe).
- Service `getCommunityPolls(clubId, viewerId)` → `viewer_locked` pro Poll (multi-club, Ersteller nie gesperrt).
- Card-Schloss-Teaser + Create-Tier-Selector (nur Club). i18n DE+TR.
- Silent-Fail-Fix: `castCommunityPollVote` wirft jetzt bei !success (vorher false-success-Toast).
- **Money-Heal:** 343-Fee-Regression 70/30 → CEO-approved 80/20 (Anil-approved). Live-verifiziert.

## Zuletzt

- **Slice 355** — Audit-Churn gitignoren (XS).
- **Slice 354** — 349 Live-Verify + FK-Fix + Stale-Tracker-Prävention.
