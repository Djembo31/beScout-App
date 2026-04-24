# Active Slice

```
status: in-progress
slice: 181f+h
stage: PROVE
spec: worklog/specs/181e-trading-modal-migration.md
impact: skipped (mechanical + Zero-Consumer Re-Audit for Cleanup)
proof: worklog/proofs/181f-h-tsc-vitest-bundle.txt
review: worklog/reviews/181f+h-review.md
```

## Ziel

181f: EventDetailModal (Modal+ConfirmDialog → Dialog+AlertDialog) + 2 Manager-Rest-Consumer aus Re-Audit (PlayerDetailModal, EventSelector).
181h: Cleanup Modal + ConfirmDialog aus `@/components/ui/`.

## Files

- src/components/fantasy/EventDetailModal.tsx (+ Test-Mock)
- src/features/manager/components/kader/PlayerDetailModal.tsx
- src/features/manager/components/aufstellen/EventSelector.tsx
- src/components/ui/index.tsx (Modal removed)
- src/components/ui/ConfirmDialog.tsx (DELETED)

## Zuletzt

- **Slice 181e2** (2026-04-24) — Modal→Dialog Player-Detail Trading (4 Files, PASS, live, smoke PASS).
- **Slice 181e1** (2026-04-24) — Modal→Dialog Marktplatz/Orderbook (4 Files, PASS, live, smoke PASS).
- **Slice 181d** (2026-04-24) — Modal→Dialog Fantasy/Gamification (12 Files, PASS).
