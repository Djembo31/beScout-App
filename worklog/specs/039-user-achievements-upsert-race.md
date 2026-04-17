# Slice 039 — user_achievements 409 Race-Condition Fix

**Groesse:** S · **CEO-Scope:** nein (UX/log-cleanup) · **Typ:** P2 Race-Fix

## Ziel

`checkAndUnlockAchievements()` wird von 5 verschiedenen Stellen aufgerufen
(trading.ts:111+231, offers.ts:233, ipo.ts:135, useProfileData.ts:186), oft
fire-and-forget parallel. Bei concurrent calls:
- Beide SELECT user_achievements → identischer Snapshot
- Beide INSERT 'first_trade' → einer succeeded, andere wirft 409 UNIQUE

Slice 038 Live-Verify zeigte 7×409 console-errors nach Buy. Achievement-Unlock-Flow
funktioniert (one Schreiber gewinnt), aber log-spam + UX-Bug.

## Root Cause

`src/lib/services/social.ts:490-494`:
```ts
const { error } = await supabase
  .from('user_achievements')
  .insert({ user_id: userId, achievement_key: key })
  .select()
  .maybeSingle();
if (!error) newUnlocks.push(key);
```

Plain `.insert()` ohne onConflict-handling → 409 bei race.

## Fix

```ts
const { error } = await supabase
  .from('user_achievements')
  .upsert(
    { user_id: userId, achievement_key: key },
    { onConflict: 'user_id,achievement_key', ignoreDuplicates: true }
  )
  .select()
  .maybeSingle();
if (!error) newUnlocks.push(key);
```

`ignoreDuplicates: true` macht Postgres ON CONFLICT DO NOTHING → kein 409, kein Error.

DB-Constraint: `user_achievements_user_id_achievement_key_key` UNIQUE (user_id, achievement_key) — perfect match.

## Acceptance Criteria

1. Nach Slice 039 deploy: re-Buy → 0× 409 user_achievements console-errors
2. Tests: bestehende social.test.ts gruen + neuer Race-Lock-Test
3. tsc clean
4. UX: keine duplicate notifications/tickets fuer same achievement

## Proof-Plan

- `worklog/proofs/039-fix.txt` — code-diff + test-run
- `worklog/proofs/039-live-verify.txt` — Live-Buy auf bescout.net post-deploy + 0× 409

## Scope-Out

- Andere upsert-missing-onConflict Patterns (separater Slice falls gefunden)
- Achievement-Unlock-Logic refactor (out of scope)
- Notification/Ticket dedup (irrelevant — newUnlocks ist nur 1× befuellt pro success)
