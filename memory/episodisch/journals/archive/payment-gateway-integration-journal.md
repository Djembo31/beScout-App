# Implementer Journal: Payment Gateway Integration (Tasks 6+7)
## Gestartet: 2026-03-21
## Spec: Inline briefing (Tasks 6+7 of Unified Payment Gateway)

### Verstaendnis
- Was soll gebaut werden: Replace the old multi-step payment flow (spendTickets + deductEntryFee + submitLineup) with the new atomic lockEventEntry/unlockEventEntry RPC calls. Entry (payment) and lineup submission are DECOUPLED.
- Betroffene Files:
  - `src/app/(app)/fantasy/FantasyContent.tsx` — join/leave handlers
  - `src/components/fantasy/EventDetailModal.tsx` — props + UI buttons
  - `src/lib/services/events.ts` — add lockEventEntry/unlockEventEntry functions
  - `src/lib/queries/keys.ts` — add enteredIds/entry keys
  - `src/components/fantasy/__tests__/EventDetailModal.test.tsx` — add onSubmitLineup to test props
  - `src/app/(app)/fantasy/__tests__/FantasyContent.test.tsx` — update mocks

### Entscheidungen
| # | Entscheidung | Warum | Alternative |
|---|-------------|-------|-------------|
| 1 | Create lockEventEntry/unlockEventEntry in events service | Required by spec — RPC wrappers for atomic entry | Manual multi-step |
| 2 | Add qk.events.enteredIds + qk.events.entry to keys.ts | Proper cache invalidation for new entry state | Raw keys |
| 3 | Decouple onJoin from lineup — onJoin(event) only | Entry is payment-only now, lineup is separate | Keep coupled |
| 4 | Add handleSaveLineup separate from handleJoinEvent | Clean separation of concerns | Mixed handler |
| 5 | Move lineup progress + salary cap to joined footer | Only relevant when user builds lineup (after entry) | Keep in join footer |
| 6 | Currency-aware cost display in confirmation dialog | Support tickets and $SCOUT with proper formatting | Single currency |

### Fortschritt
- [x] Task 1: Add lockEventEntry/unlockEventEntry to events service
- [x] Task 2: Add query keys for enteredIds
- [x] Task 3: Replace join flow in FantasyContent.tsx
- [x] Task 4: Replace leave flow in FantasyContent.tsx
- [x] Task 5: Add separate lineup submit handler in FantasyContent.tsx
- [x] Task 6: Update EventDetailModal props and UI
- [x] Task 7: Remove old imports (spendTickets, creditTickets, deductEntryFee, refundEntryFee)
- [x] Task 8: Type check (tsc) — PASS (only pre-existing test errors)
- [x] Task 9: Build check (next build) — PASS (compiled with warnings, same as main)

### Runden-Log

#### Runde 1 — PASS
- All changes implemented in single pass
- tsc: PASS (no new errors; pre-existing test file issues remain)
- build: PASS (compiled with warnings, identical to main branch)

### Ergebnis: PASS
- tsc: PASS
- build: PASS
- Runden benoetigt: 1

### Learnings
- The DbEvent type does NOT have a `currency` field yet — the cost display logic infers currency from `ticketCost` vs `entry_fee`/`buyIn`
- The Supabase server build error only happens when .env.local is missing in worktree
- The old payment flow was tightly coupled (pay + lineup in one atomic operation with manual rollback) — the new flow is cleaner: atomic RPC for entry, separate call for lineup

### Geaenderte Files
- src/lib/services/events.ts (added lockEventEntry, unlockEventEntry + types)
- src/lib/queries/keys.ts (added enteredIds, entry keys)
- src/app/(app)/fantasy/FantasyContent.tsx (rewrote handleJoinEvent, handleLeaveEvent, added handleSubmitLineup, removed old imports)
- src/components/fantasy/EventDetailModal.tsx (added onSubmitLineup prop, decoupled join from lineup, currency-aware UI)
- src/components/fantasy/__tests__/EventDetailModal.test.tsx (added onSubmitLineup to defaultProps)
- src/app/(app)/fantasy/__tests__/FantasyContent.test.tsx (updated mocks for new service imports)
