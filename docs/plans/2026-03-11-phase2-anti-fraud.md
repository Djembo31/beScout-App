# Phase 2: Anti-Fraud Guards Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 3 anti-fraud guards to the trading system: velocity limits, circular trade detection, order cancel cooldown.

**Architecture:** All guards are implemented as DB-level checks inside existing SECURITY DEFINER RPCs. No client-side changes needed — RPCs return error messages that existing error handling already maps to UI.

**Tech Stack:** PostgreSQL RPCs (ALTER existing), Supabase migrations

---

## Context

### Existing Trading RPCs
- `buy_player_dpc(p_user_id, p_player_id, p_quantity)` — Market buy from cheapest order
- `buy_from_order(p_buyer_id, p_order_id, p_quantity)` — Buy from specific order
- `cancel_order(p_user_id, p_order_id)` — Cancel sell order

### Existing Guards (already in place)
- Self-trade prevention (own order blocked)
- Club admin trading restriction
- Player liquidation guard
- Input validation (quantity/price bounds)
- Daily challenge unique constraint (user_id, challenge_id)

### What's Missing
- No velocity limit (can trade same player 1000x/day)
- No circular detection (A sells to B, B sells back to A)
- No cancel cooldown (can place/cancel instantly to manipulate floor price)

---

### Task 1: Trade Velocity Guard

**DB Migration:** Alter `buy_player_dpc` and `buy_from_order` to check recent trade count.

Add this check in BOTH RPCs, after the auth guard and before order matching:

```sql
-- VELOCITY GUARD: Max 20 trades per player per 24h per user
DECLARE
  v_recent_trades INT;
BEGIN
  SELECT COUNT(*) INTO v_recent_trades
  FROM trades
  WHERE (buyer_id = p_user_id OR seller_id = p_user_id)
    AND player_id = [player_id_variable]
    AND executed_at > now() - INTERVAL '24 hours';

  IF v_recent_trades >= 20 THEN
    RETURN json_build_object('success', false, 'error',
      'Tägliches Handelslimit erreicht. Max 20 Trades pro Spieler in 24 Stunden.');
  END IF;
```

**Step 1: Apply migration for `buy_from_order`**

Recreate the entire RPC with the velocity guard added after the auth guard.

**Step 2: Apply migration for `buy_player_dpc`**

Recreate the entire RPC with the velocity guard added after the auth guard.

**Step 3: Add error mapping in client**

In `src/lib/errorMessages.ts`, add mapping for the velocity limit error.

**Step 4: Test via Supabase SQL**

```sql
-- Verify guard works
SELECT buy_from_order('test-user', 'test-order', 1);
-- Should return velocity error after 20 trades
```

**Step 5: Commit**

---

### Task 2: Circular Trade Detection

**DB Migration:** Alter `buy_from_order` to detect A→B→A pattern.

Add this check after the velocity guard, before wallet operations:

```sql
-- CIRCULAR TRADE GUARD: Block if buyer recently sold same player to this seller
DECLARE
  v_circular_count INT;
BEGIN
  SELECT COUNT(*) INTO v_circular_count
  FROM trades
  WHERE seller_id = p_buyer_id           -- Current buyer was seller
    AND buyer_id = v_order.user_id       -- To the current seller
    AND player_id = v_order.player_id    -- Same player
    AND executed_at > now() - INTERVAL '7 days';

  IF v_circular_count > 0 THEN
    RETURN json_build_object('success', false, 'error',
      'Verdächtiges Handelsmuster erkannt. Handel mit demselben Partner für denselben Spieler innerhalb von 7 Tagen nicht erlaubt.');
  END IF;
```

This blocks: A sells Player X to B, then B tries to sell Player X back to A within 7 days.

**Step 1: Apply migration** — Recreate `buy_from_order` with circular guard added.

**Step 2: Add error mapping in client**

**Step 3: Commit**

---

### Task 3: Order Cancel Minimum Hold Time

**DB Migration:** Alter `cancel_order` to enforce 5-minute minimum hold.

```sql
-- CANCEL COOLDOWN: Orders must be live for at least 5 minutes
IF v_order.created_at > now() - INTERVAL '5 minutes' THEN
  RETURN json_build_object('success', false, 'error',
    'Orders können erst nach 5 Minuten storniert werden.');
END IF;
```

This prevents spoofing (placing large orders to move floor price, then immediately canceling).

**Step 1: Get current `cancel_order` RPC**

**Step 2: Apply migration with cooldown guard**

**Step 3: Add error mapping + client-side UX for cooldown**

In `src/lib/services/trading.ts` `cancelOrder()`, add the error mapping. In the UI where cancel button is shown, optionally show remaining cooldown time.

**Step 4: Commit**

---

## Impact Summary

| Guard | Blocks | False Positive Risk |
|-------|--------|-------------------|
| Velocity (20/player/24h) | Volume wash trading | Very low — legitimate users rarely trade same player 20x/day |
| Circular (7-day window) | A→B→A wash trading | Low — legitimate re-trades within 7 days are rare |
| Cancel cooldown (5 min) | Floor price spoofing | Low — legitimate cancels usually not within 5 minutes |
