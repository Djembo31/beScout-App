# Slice 038 — credit_tickets reference_id UUID-Bug (Achievement-Tickets)

**Groesse:** S · **CEO-Scope:** ja (Money-Path: Tickets-Gutschrift) · **Typ:** P1 Bug-Fix

## Ziel

Achievement-Tickets werden seit unbekannt nicht gutgeschrieben. Achievement-Hook in
`src/lib/services/social.ts:522` ruft `creditTickets(userId, amount, 'achievement', key)`
mit `key` = Achievement-Key (z.B. `'first_trade'`, `'event_winner'`). Der RPC-Param
`p_reference_id` ist UUID-Spalte → PostgreSQL `22P02 invalid input syntax for type uuid: "first_trade"`.

Discovered: Slice 034 Live-Buy auf bescout.net (post-Buy 7 credit_tickets-Calls
crashten silent — 14 console-errors, 0 Tickets gutgeschrieben).

## Root Cause

`src/lib/services/tickets.ts:52-65`:
```ts
export async function creditTickets(
  userId: string, amount: number, source: TicketSource,
  referenceId?: string,    // ← typed as string, but RPC expects UUID
  description?: string,
) {
  await supabase.rpc('credit_tickets', {
    p_reference_id: referenceId ?? null,  // ← non-UUID strings reach here
    ...
  });
}
```

`src/lib/services/social.ts:522`:
```ts
creditTickets(userId, ticketAmount, 'achievement', key).catch(console.error);
//                                                  ^^^ achievement-Key, nicht UUID
```

RPC-Signatur: `credit_tickets(p_user_id uuid, p_amount bigint, p_source text, p_reference_id uuid DEFAULT NULL, p_description text DEFAULT NULL)`.

## Audit-Scope

- Alle 6 `creditTickets()`-Aufrufer pruefen:
  - social.ts:522 — `key` (achievement-Key) ❌ FIX HERE
  - research.ts:225 — `data.id` (post UUID) ✓
  - research.ts:366 — `researchId` (UUID) ✓
  - posts.ts:158 — `data.id` (post UUID) ✓
  - missions.ts:153 — `missionId` (UUID) ✓
  - streaks.ts:22 — kein referenceId ✓

- TEXT-als-UUID Pattern auch in anderen RPCs?
  - Grep alle `.rpc(...)` calls mit string-literal als reference_id-Param
  - Pruefe nicht-Achievement Hooks (mission_complete, post_create, research_publish)

## Aenderungen

1. **Fix:** `src/lib/services/social.ts:522` — Achievement-Key in `description` statt
   `reference_id`:
   ```ts
   creditTickets(userId, ticketAmount, 'achievement', undefined, `Achievement: ${key}`)
   ```

2. **JSDoc-Hardening:** `src/lib/services/tickets.ts:52` — `referenceId?: string` mit
   JSDoc dass es ein UUID sein MUSS, sonst RPC crasht. Pattern: log+null statt crash
   bei non-UUID? Alternativ: client-side UUID-Regex check, throw fruehzeitig.

3. **Test:** `src/lib/services/__tests__/social.test.ts` — neuer Test der den Achievement-
   Hook stubbt + verifiziert dass `creditTickets` ohne `referenceId` aufgerufen wird
   (oder mit valider UUID).

## Acceptance Criteria

1. Live-Buy auf bescout.net triggert KEIN credit_tickets 400 mehr
2. Achievement-Tickets werden in `user_tickets.balance` reflected
3. tsc clean + Tests gruen
4. Audit-Log: keine weiteren TEXT-als-UUID Drifts

## Proof-Plan

- `worklog/proofs/038-audit.txt` — alle 6 caller-Sites + Drift-Status
- `worklog/proofs/038-tsc-vitest.txt` — Test-Output
- `worklog/proofs/038-live-buy.txt` — pre/post user_tickets.balance + console-error count

## Scope-Out

- credit_tickets RPC-Signatur Aendern (uuid → text) — invasiver, betraegt 5 weitere Caller
- Alle anderen TEXT-als-UUID Drifts (falls Audit findet) — separate Slices pro RPC
- Achievement-Reference-Linking (z.B. tabelle achievement_unlocks mit UUID) — out-of-scope
