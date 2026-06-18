# Active Slice

```
status: idle
slice: 335
title: ✅ DONE — Event-Absage geld-sicher (cancel_event RPC + CHECK + Prize-Refund-Zweig)
stage: LOG complete
spec: worklog/specs/335-event-cancel-money-safe.md
impact: in Spec §3 (events-Consumer + 331-Trigger)
proof: worklog/proofs/335-proof.md
review: worklog/reviews/335-review.md
```

## Zuletzt

- **Slice 334** (2026-06-18) — Polls P2 (player_id + Discovery). PASS, live.
- **Slice 335** (2026-06-18) — Event-Absage geld-sicher (L, Money/CEO „voll geld-sicher"). cancel_event-RPC (Club-Admin-auth, atomar: entries-refund + prize-Kaution zurück + status='cancelled') + CHECK +'cancelled' + 331-Settle-Trigger cancelled-Zweig + ConfirmDialog.

## Plan (BUILD)
1. Migration: events_status_check +'cancelled' · trg_events_prize_settle +cancelled-Zweig · cancel_event-RPC (AR-44).
2. Type DbEvent.status +'cancelled'.
3. Service cancelEvent.
4. Hook handleCancelEvent + Confirm-State.
5. AdminEventsTab Knopf → Confirm.
6. i18n de+tr.

## Danach (Anil-Reihenfolge): Polls P3 (soziale Schicht).
