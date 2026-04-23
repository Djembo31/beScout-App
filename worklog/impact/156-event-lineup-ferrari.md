# Slice 156 — Impact Analysis

## Trigger

Migration auf 2 SECURITY DEFINER RPCs (`rpc_lock_event_entry`, `rpc_unlock_event_entry`) + Service-Cast + Hook-Refactor. Impact Pflicht (workflow.md Sektion 2).

## Cross-Domain: Ja
- `supabase/migrations/` (Schema/RPC-Body)
- `src/features/fantasy/services/*` (Service-Cast)
- `src/features/fantasy/hooks/*` (Consumer)

## Betroffene Konsumenten (grep-verifiziert)

### Direkte RPC-Callers
- `src/features/fantasy/services/events.mutations.ts:379` — `lockEventEntry` Service-Wrapper
- `src/features/fantasy/services/events.mutations.ts:422` — `unlockEventEntry` Service-Wrapper

### Service-Callers
- `src/features/fantasy/hooks/useEventActions.ts:52` — `lockEventEntry` in `joinEvent`
- `src/features/fantasy/hooks/useEventActions.ts:217` — `unlockEventEntry` in `leaveEvent`

### Hook-Consumers (indirekt)
- `src/app/(app)/fantasy/FantasyContent.tsx` — `useEventActions(clubId)` → destructure `{ joinEvent, leaveEvent, submitLineup, joiningEventId, leavingEventId }`
- `src/features/manager/components/aufstellen/AufstellenTab.tsx` — `useEventActions` → destructure identisch
- `src/features/fantasy/hooks/useLineupSave.ts:27-31` — `onJoin(event)` + `onSubmitLineup(event, lineup, formation, captainSlot, wildcardSlots)` Callback-Parameter

### Tests (existing)
- `src/lib/services/__tests__/event-entries.test.ts` — pruefen ob Mock-Shape geaendert werden muss
- `src/app/(app)/fantasy/__tests__/FantasyContent.test.tsx` — Consumer-Integration

## Side-Effects

### RLS
- Keine RLS-Aenderung. Wrapper `lock_event_entry`/`unlock_event_entry` behalten `GRANT authenticated`. Internal `rpc_*`-RPCs bleiben `REVOKE`.

### Caching / Invalidation
- React Query Keys (unveraendert):
  - `qk.events.joinedIds(uid)` — optimistic set + rollback
  - `qk.events.all` — optimistic increment/decrement
  - `qk.tickets.balance(uid)` — invalidate onSuccess
  - `qk.events.usage(uid)` — invalidate onSuccess
  - `qk.events.holdingLocks(uid)` — invalidate onSuccess
  - `qk.holdings.byUser(uid)` — invalidate onSuccess
  - `qk.wallet.all` / `invalidateWallet(qc)` — onSettled (pgBouncer-safe, Slice 152c)
- Cache-Bust: `fetch('/api/events?bust=1')` bleibt fire-and-forget.

### Realtime
- Keine Realtime-Subscription beruehrt.

## Migration-Plan

1. NEW migration `20260423210000_slice_156_event_entry_balance_after_null.sql`
2. `CREATE OR REPLACE FUNCTION rpc_lock_event_entry` + `rpc_unlock_event_entry` mit Body-Change
3. Apply via `mcp__supabase__apply_migration` (nicht `supabase db push`, siehe `memory/reference_migration_workflow.md`)
4. Smoke: `SELECT pg_get_functiondef('public.rpc_lock_event_entry(uuid,uuid)'::regprocedure)` → verify `balance_after := NULL` Body

## Rueckwaerts-Kompatibilitaet

- RPC-Return-Shape `balance_after: 0 → null` (bei Free-Events + unlock-ohne-amount_locked).
- Consumer-Logic `if (result.balanceAfter != null && result.balanceAfter > 0)` (useEventActions.ts:88) bleibt funktional korrekt — `null` short-circuitet, `> 0` historical filter wird nach Refactor zu `!= null`.
- **Bug-Fix-Aspekt:** Aktueller `COALESCE(v_balance_after, 0)` in unlock setzt Wallet-Cache faelschlich auf 0 bei `amount_locked=0`-Case. Nach Migration: `null` → Consumer skippt setWalletBalance. **Positive Breaking** (Bug-Fix).

## Risk-Audit

| Risk | Mitigation |
|------|-----------|
| pgBouncer Read-After-Write nach RPC | `onSettled` invalidateWallet (Slice 152c Pattern) |
| Race bei Rapid-Click | `useSafeMutation.safeTrigger` (Slice 151a Primitive) |
| Phantom-Rollback wenn Cache leer | `if (ctx?.prev !== undefined)` + `removeQueries` fallback (153a Finding #1 Pattern) |
| i18n-Key-Leak bei Error | `te(mapErrorToKey(normalizeError(err)))` im errorToast (bestehender Pattern in useEventActions) |
| Breaking Consumer-API | Keine — Signatur `{joinEvent, leaveEvent, submitLineup, joiningEventId, leavingEventId}` unveraendert |
