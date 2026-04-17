# Slice 035 — trg trade_refresh auth_uid_mismatch — VERDICT

**Status:** GREEN. Bug bestaetigt, gefixt, live-verifiziert.

## Diagnose

Trigger `trg_trade_refresh` (AFTER INSERT ON trades) ruft im seller-Branch
`refresh_airdrop_score(NEW.seller_id)`. AR-44 hardened guard:
```sql
IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
  RAISE EXCEPTION 'auth_uid_mismatch';
```
In trigger context: `auth.uid() = buyer_id ≠ seller_id` → guard trippt → exception
caught by `WHEN OTHERS` → silent WARNING → seller's airdrop_score nie aktualisiert.

## Beweis

Vor Fix:
- bot-003 (Slice 034 buy seller, 11:37): `airdrop_scores.updated_at = NULL`
- bot-039 (Slice 038 buy seller, 14:13): `airdrop_scores.updated_at = NULL`

Nach Fix (Slice 035 buy bei 14:52):
- bot-037 (seller): `airdrop_updated = 14:52:56` ✓ (matched trade.executed_at)
- bot-037 `airdrop_total = 49` (vorher NULL → jetzt berechnet)

## Fix

Migration `20260417170000_refresh_airdrop_score_trigger_internal.sql`:

1. Extract guard-less internal helper `_refresh_airdrop_score_internal(uuid)`
   - Identical body as old `refresh_airdrop_score`, ohne auth-guard
   - REVOKE PUBLIC, anon, authenticated → GRANT service_role only
   - Trigger (SECURITY DEFINER) laeuft als owner und kann internal aufrufen

2. Public wrapper `refresh_airdrop_score(uuid)` behaelt AR-44 guard
   - Nur thin wrapper: guard + PERFORM internal
   - GRANT authenticated (clients koennen eigene refreshen)

3. Trigger `trg_fn_trade_refresh` nutzt `_refresh_airdrop_score_internal` direkt
   - Sowohl fuer buyer als auch seller
   - Kein guard-conflict mehr

## Pattern (fuer common-errors.md)

**Trigger ruft AR-44-hardened RPC fuer fremden user_id auf**:
- Symptom: Silent WARNING in postgres-logs, side-effect (z.B. score-refresh) fehlt
- Root: AR-44 guard `auth.uid() != p_user_id` trippt im trigger-Kontext (auth.uid() = original-caller, nicht trigger-target-user)
- Fix: Internal-Helper-RPC ohne guard + GRANT service_role only. Public wrapper behaelt guard.
- Prevention: Bei AR-44-Hardening pruefen ob RPC von Triggern aufgerufen wird → Pattern direkt anwenden.

## Pipeline

- 035 ✓ DONE
- 036 sync_event_statuses permission denied (next)
- 037 7 transactions.type Drifts
- 039 user_achievements 409 UNIQUE
- 041 rpc_lock_event_entry Permission-Doku
- 042 Modal PUNKTE-Display
- 043 Compliance-Wording
- 040 ClubProvider flake
