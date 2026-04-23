# Slice 156 — Event+Lineup Ferrari-Refactor (Phase 3 Welle 1)

**Typ:** L-Slice (Migration + Service + Hook + Tests, Cross-Domain).
**Money-Path:** Ja (Wallet-Touch in lock/unlock). CEO-Approval erforderlich.
**Vorgaenger:** 151a (Primitive), 153a (trading.ts Blueprint), 153b (usePlayerTrading Money-Path).
**Carry-Over:** P2.3 aus 153 Scope-Out.

---

## Ziel (1 Satz)

`useEventActions.joinEvent/leaveEvent/submitLineup` nutzen `useSafeMutation` mit Ferrari-Pattern (Snapshot/Optimistic/Rollback/errorTag), und die zugrunde liegenden RPCs `rpc_lock_event_entry`/`rpc_unlock_event_entry` returnen `balance_after=NULL` (statt `=0`) bei Free-Events, damit Consumer echte "Balance unveraendert"-Semantik unterscheiden koennen von "Balance auf 0 gesetzt".

---

## Problem-Beschreibung

### A) Race-Surface (Ferrari-Need)

`useEventActions.ts` ist stateful `useState+useCallback`-Pattern (Slice 150 Audit Kategorie) — nicht race-safe. Drei Handler:

1. **`joinEvent`** — Money-Path: `lockEventEntry` RPC deducted Tickets/SCOUT + setzt Wallet-Balance. Rapid-Click kann 2× deducten (Symptom bekannt aus Slice 151c.2 subscribe-RPC).
2. **`leaveEvent`** — Money-Path: `unlockEventEntry` RPC refundet. Gleiche Race-Surface.
3. **`submitLineup`** — Data-Write (kein Geld). Rapid-Click kann 2× Lineup-Overwrite triggern.

Consumer-UX (heute): `joiningEventId`/`leavingEventId` als local-state-guard. Synchroner `isPending` via MutationObserver (`useSafeMutation.safeTrigger`) ist stabiler.

### B) Return-Shape Anomalie (P2.3)

RPC-Body `rpc_lock_event_entry` setzt bei **Free-Events** (`ticket_cost = 0`):

```sql
-- Ticket path (line 193):
ELSE v_balance_after := 0;

-- Scout path (line 247):
ELSE v_balance_after := 0;
```

Dasselbe Signal `balance_after=0` wird bei Paid-Event-Deduction-auf-Null ebenfalls moeglich. Consumer heute workarounded mit Heuristik:

```ts
// useEventActions.ts:88
if (user && result.balanceAfter != null && result.balanceAfter > 0) {
  setWalletBalance(queryClient, user.id, result.balanceAfter);
}
```

Das `> 0`-Filter **verliert** den legitim-edge-case wenn Balance wirklich auf 0 deducted wurde. Nach Migration: `balance_after=null` bei Free-Event → Consumer-Check wird `!= null` (keine Magic-Zero-Heuristik).

Symptom: minoritaer. Aber Ferrari-Semantik erfordert `null` = "nicht beruehrt", `0` = "auf null deducted". Selbe Saeure auch in `unlock`: `COALESCE(v_balance_after, 0)` entfernen.

---

## Betroffene Files (geschaetzt)

| # | File | Aenderung |
|---|------|-----------|
| 1 | `supabase/migrations/<new>_event_entry_balance_after_null.sql` | NEU: `CREATE OR REPLACE` beider RPCs mit `balance_after := NULL` statt `:= 0` bei Free-Events; `COALESCE(v_balance_after, 0)` in unlock-Return entfernen |
| 2 | `src/features/fantasy/services/events.mutations.ts` | `LockEventEntryResult.balanceAfter`/`UnlockEventEntryResult.balanceAfter` auf `number \| null \| undefined`. Cast `result.balance_after as number \| null \| undefined`. |
| 3 | `src/features/fantasy/hooks/useEventActions.ts` | Ferrari-Refactor: 3 Handler auf `useSafeMutation`. `joiningEventId`/`leavingEventId` via `mut.variables?.eventId` + `mut.isPending`. Consumer-Callback-API erhalten (`joinEvent(event)` etc.). Heuristik `> 0` → `!= null`. |
| 4 | `src/features/fantasy/hooks/__tests__/useEventActions.test.ts` | NEU: Tests analog trading.ts 153a (happy + insufficient_balance + event_full + already_entered + locks_at guard). |
| 5 | `src/features/fantasy/services/__tests__/events.mutations.test.ts` | Evtl. Erweiterung — `balance_after=null` Cast-Check. |

Keine Aenderung noetig (verifiziert per grep):
- `src/app/(app)/fantasy/FantasyContent.tsx` (Consumer via useEventActions)
- `src/features/manager/components/aufstellen/AufstellenTab.tsx` (Consumer via useEventActions)
- `src/features/fantasy/hooks/useLineupSave.ts` (Consumer via onJoin/onSubmitLineup-Callbacks — Callback-Signatur bleibt)
- `src/features/fantasy/store/fantasyStore.ts` (UI-state only, no mutations)
- `src/features/fantasy/store/lineupStore.ts` (builder-state only, no mutations)

---

## Acceptance Criteria (messbar)

1. **A1** — `rpc_lock_event_entry` returned `balance_after: null` bei `ticket_cost=0` (beide Currencies). Verifikation: `SELECT jsonb_pretty(public.lock_event_entry('<free-event-uuid>'))` zeigt `"balance_after": null`.
2. **A2** — `rpc_unlock_event_entry` returned `balance_after: null` (nicht `0`) wenn `amount_locked=0`. Verifikation analog.
3. **A3** — `useJoinEvent.safeTrigger(event)` ist race-safe: zweiter Click waehrend in-flight no-op (kein zweites RPC-Call, verifiziert via mock-counter).
4. **A4** — `useJoinEvent` optimistic update: `qk.events.joinedIds(uid)` += eventId sofort nach `onMutate`. `qk.events.all` `current_entries += 1`. Bei `onError`: Rollback aus Snapshot.
5. **A5** — `useLeaveEvent` analog A3+A4 (decrement + filter).
6. **A6** — `useSubmitLineup` race-safe + `errorTag: 'fantasy.submitLineup'`.
7. **A7** — `onSettled` fuer `useJoinEvent`+`useLeaveEvent` ruft `invalidateWallet(qc)` (pgBouncer-safe, Slice 152c HIGH-1-Pattern).
8. **A8** — Consumer-API bleibt: `{ joinEvent, leaveEvent, submitLineup, joiningEventId, leavingEventId }` weiterhin exportiert. `FantasyContent.tsx` + `AufstellenTab.tsx` kompilieren unveraendert.
9. **A9** — `useLineupSave.onJoin(event)` + `onSubmitLineup(event, lineup, formation, captainSlot, wildcardSlots)` Callbacks unveraendert aufrufbar.
10. **A10** — Alle neuen Tests gruen. `npx vitest run src/features/fantasy` komplett gruen (keine Regression in fixtures/lineups/predictions).
11. **A11** — `npx tsc --noEmit` clean.
12. **A12** — `errorTag` gesetzt: `fantasy.joinEvent`, `fantasy.leaveEvent`, `fantasy.submitLineup` — Money-Path-Observability (Slice 151c Standard).

---

## Edge Cases (Pflicht, 10)

1. **Free-Event (ticket_cost=0):** lockEventEntry returnt `balance_after=null`. Consumer: `result.balanceAfter != null` ist false → `setWalletBalance` wird nicht gerufen. Kein Wallet-Cache-Flicker.
2. **Paid-Event deducted-to-0:** Echtes Deduct-auf-Balance-0 (user hatte exakt ticket_cost). `balance_after=0` bleibt. Consumer `!= null` ist true → `setWalletBalance(qc, uid, 0)`. Richtige Semantik.
3. **already_entered (idempotent):** RPC returnt `ok:true, already_entered:true, currency`. Consumer update cache trotzdem (setQueryData joinedIds, events.all). Kein Toast.
4. **Rapid-Click join:** safeTrigger #2 short-circuitet (isPending=true). Nur 1 RPC-Call.
5. **Rapid-Click leave:** Analog 4.
6. **insufficient_balance Rollback:** `onError` laeuft. Snapshot restored: `joinedIds` - eventId, `events.all` current_entries -= 1. Wallet bleibt (kein Deduct passierte server-side).
7. **event_full Rollback:** Analog 6.
8. **event_locked (unlock nach locks_at):** RPC returnt `ok:false, error:'event_locked'`. Optimistic rollback + Toast `t('eventLockedError')`.
9. **Network-Retry (pgBouncer Read-After-Write, Slice 139):** `onSettled` invalidateWallet fuer Cross-Mutation-Kohaerenz. `joinedIds` setQueryData ist deterministic (Slice 143 Pattern), kein Race.
10. **Concurrent joinEvent + subscription_required Error:** subscription-Error-Key propagiert, Toast zeigt uebersetzten String (existiert bereits: `t('subscriptionRequired')`). Rollback laeuft.

---

## Proof-Plan

| Artefakt | Typ | Was beweist es? |
|----------|-----|-----------------|
| `worklog/proofs/156-vitest.txt` | Test-Log | A3-A7, A10, A11 (Rollback, Race-Safe, isPending) |
| `worklog/proofs/156-rpc-shape.txt` | SQL-Query | A1, A2 (`pg_get_functiondef` zeigt `balance_after := NULL`) |
| `worklog/proofs/156-rpc-live.txt` | SQL-Query | `SELECT jsonb_pretty(lock_event_entry(...))` Live-Output auf Free-Event zeigt `"balance_after": null` |
| `worklog/proofs/156-tsc.txt` | tsc-Log | A11 |

Kein Playwright-Screenshot noetig — kein User-sichtbares UI-Change. Alle Aenderungen sind semantisch (cache-state, race-safety, return-shape).

---

## Scope-Out (explizit NICHT in 156)

- `createEvent`, `updateEvent`, `bulkUpdateStatus`, `cancelEventEntries`, `createNextGameweekEvents` — Admin-Path, kein UX-Hotspot, kein Money-Path-Risk. Scope-Hygiene.
- `useLineupBuilder` — builder-state-only, keine Mutations.
- `submitLineup` RPC (`save_lineup`) Return-Shape — kein `balance_after`-Feld, nicht betroffen.
- P2.3 auf weitere RPCs (`buy_player_dpc`, `openMysteryBox`, `liquidate_player`) — separate Slices.
- FantasyStore Refactor — es gibt keine Mutations im Store (nur UI+Builder-state), Handoff-Formulierung war ungenau.
- Visual-UI-Aenderung — Slice ist pure-infrastructure.

---

## Rueckwaerts-Kompatibilitaet

- **RPC-Return-Shape Change:** `balance_after: 0` → `balance_after: null` bei Free-Events.
  - **Breaking fuer Consumer?** Nein. Existing-Consumer checkt `!= null && > 0` (useEventActions.ts:88) → bei `null` skippt er. Altes Verhalten (skip bei 0) deckungsgleich mit neuem (skip bei null).
  - **Breaking fuer leave-Path?** `COALESCE(v_balance_after, 0)` auf `v_balance_after` aendert: bei `amount_locked=0` wird `null` returned statt `0`. Existing-Consumer (useEventActions.ts:229): `if (result.balanceAfter != null) setWalletBalance(...)` — bei `null` skippt. Altes Verhalten (setWalletBalance mit 0): bei `amount_locked=0` wurde Balance auf 0 gesetzt (falsch, user hat seine Balance nicht auf 0!). **Neues Verhalten ist Bug-Fix.**

- **Client-Hook-API:** `useEventActions(clubId): { joinEvent, leaveEvent, submitLineup, joiningEventId, leavingEventId }` bleibt byte-identisch. Internals refactored, Signatur gleich.

---

## Tests (vitest-Plan)

Neue File `src/features/fantasy/hooks/__tests__/useEventActions.test.ts`:

```ts
describe('useJoinEvent', () => {
  it('safeTrigger short-circuits during in-flight');
  it('optimistic: joinedIds += eventId, events.all current_entries += 1');
  it('onError: rolls back joinedIds + current_entries from snapshot');
  it('onSuccess: setWalletBalance called only when balance_after !== null');
  it('onSettled: invalidateWallet called');
  it('already_entered: no toast, cache-update runs');
});

describe('useLeaveEvent', () => {
  it('safeTrigger short-circuits during in-flight');
  it('optimistic: joinedIds filter out, events.all current_entries -= 1');
  it('onError event_locked: rollback + Toast(eventLockedError)');
  it('onSettled: invalidateWallet called');
});

describe('useSubmitLineup', () => {
  it('safeTrigger short-circuits during in-flight');
  it('insufficient_sc propagates error to errorTag: fantasy.submitLineup');
  it('closeEvent called on success');
});
```

Migration-Smoke via manuellem SQL-Call in Proof (nicht Unit-Test — DB-RPC-Body ist DB-State, Unit-Test-Mocking haette null Information).

---

## CEO-Approval-Begruendung

**Warum CEO-Scope?**
1. **Geld-Flow:** `rpc_lock_event_entry` deducted Wallet/Tickets. `rpc_unlock_event_entry` refundet. Jede Aenderung am Body ist CEO-Scope laut Matrix (Sektion 1, "Wallet-Aenderungen").
2. **Breaking Change-Check noetig:** Migration veraendert SECURITY-DEFINER-RPC-Return. Consumer-Kompat muss bestaetigt sein.

**Warum kein Blocker-Risk?**
- Kein Fee-Change, kein neues Grant, kein neuer Auth-Path.
- Return-Shape-Change ist semantisch neutral fuer korrekten Consumer (`!= null`-Check) und **Bug-Fix** fuer edge-case `amount_locked=0` unlock.
- Ferrari-Pattern ist 100% analog 153a/b (beide already approved + merged).

---

## Time-Estimate

- SPEC: 25 min (dieser File)
- IMPACT: 10 min (consumer-grep bereits in Spec integriert)
- BUILD Migration: 15 min
- BUILD Service-Cast: 5 min
- BUILD useEventActions Ferrari: 60 min (3 Hooks, analog 153a Pattern)
- BUILD Tests: 45 min (3 describe-Blocks, analog trading.test.ts)
- REVIEW: 15 min (Agent)
- PROVE: 10 min
- LOG: 5 min

**Total: ~3h focused work.**
