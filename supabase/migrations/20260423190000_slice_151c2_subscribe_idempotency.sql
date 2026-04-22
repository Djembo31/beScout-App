-- Slice 151c.2 — subscribe_to_club RPC Idempotency-Hardening
--
-- Kontext: Slice 151c Pilot-Migration von MembershipSection zu useSafeMutation
-- hat Reviewer-Agent einen Money-Path-BLOCKER identifiziert:
--
--   Der vorherige RPC hatte ON CONFLICT (user_id, club_id) DO UPDATE auf
--   club_subscriptions, aber die Wallet-Deduction passierte UNCONDITIONAL vor
--   dem ON CONFLICT. Szenario:
--
--     Call #1 (T+0):   Balance 1M → -50K → 950K. Subscription INSERT.
--     Call #2 (T+1, network-retry, same payload):
--                      Balance 950K → -50K → 900K. ON CONFLICT DO UPDATE
--                      (gleicher tier, kein effektiver Change). Aber Wallet
--                      bereits 2x deducted → User hat 1 Sub, 2x bezahlt.
--
-- Fix: Idempotency-Window (60s) vor Wallet-Deduction. Wenn existing active
-- subscription mit GLEICHEM tier existiert und <60s alt → treat as retry,
-- return existing success ohne erneute Deduction.
--
-- Upgrade/Downgrade-Flow bleibt unberuehrt: Anderer Tier ODER >60s alt →
-- cancel + new subscription + new deduction.
--
-- Auth-Guard + FOR UPDATE Locks unveraendert.
-- SECURITY DEFINER + REVOKE/GRANT explicit (AR-44 Pattern).

CREATE OR REPLACE FUNCTION public.subscribe_to_club(p_user_id uuid, p_club_id uuid, p_tier text)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_price BIGINT;
  v_wallet RECORD;
  v_existing RECORD;
  v_sub_id UUID;
  v_new_balance BIGINT;
BEGIN
  -- AUTH GUARD
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  -- Validate tier and set price (in cents)
  CASE p_tier
    WHEN 'bronze' THEN v_price := 50000;
    WHEN 'silber' THEN v_price := 150000;
    WHEN 'gold'   THEN v_price := 300000;
    ELSE RETURN jsonb_build_object('success', false, 'error', 'Ungültiger Tier: ' || p_tier);
  END CASE;

  -- Check for existing active subscription (WITH LOCK)
  SELECT * INTO v_existing FROM club_subscriptions
  WHERE user_id = p_user_id AND club_id = p_club_id AND status = 'active'
  FOR UPDATE;

  IF FOUND THEN
    -- Slice 151c.2 IDEMPOTENCY GUARD: Same tier + started <60s ago → treat as network-retry,
    -- return existing success without re-deducting wallet.
    IF v_existing.tier = p_tier AND v_existing.started_at > NOW() - INTERVAL '60 seconds' THEN
      -- Fetch current wallet balance for response consistency
      SELECT balance INTO v_new_balance FROM wallets WHERE user_id = p_user_id;
      RETURN jsonb_build_object(
        'success', true,
        'subscription_id', v_existing.id,
        'tier', v_existing.tier,
        'price_cents', v_existing.price_cents,
        'expires_at', v_existing.expires_at::TEXT,
        'new_balance', COALESCE(v_new_balance, 0),
        'idempotent_retry', true
      );
    END IF;

    -- Different tier OR older than 60s: Upgrade/Downgrade path — cancel old, proceed to new
    UPDATE club_subscriptions SET status = 'cancelled', updated_at = now()
    WHERE id = v_existing.id;
  END IF;

  -- Check wallet (WITH LOCK)
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND OR (v_wallet.balance - COALESCE(v_wallet.locked_balance, 0)) < v_price THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nicht genug BSD. Benötigt: ' || (v_price / 100)::TEXT || ' BSD');
  END IF;

  -- Deduct balance (after idempotency check passed)
  v_new_balance := v_wallet.balance - v_price;
  UPDATE wallets SET balance = v_new_balance, updated_at = now() WHERE user_id = p_user_id;

  -- Create subscription
  INSERT INTO club_subscriptions (user_id, club_id, tier, price_cents, expires_at)
  VALUES (p_user_id, p_club_id, p_tier, v_price, now() + INTERVAL '30 days')
  ON CONFLICT (user_id, club_id) DO UPDATE SET
    tier = p_tier,
    price_cents = v_price,
    status = 'active',
    expires_at = now() + INTERVAL '30 days',
    auto_renew = true,
    started_at = now(),
    updated_at = now()
  RETURNING id INTO v_sub_id;

  -- Transaction log
  INSERT INTO transactions (user_id, amount, type, description, reference_id, balance_after)
  VALUES (p_user_id, -v_price, 'subscription',
    format('Club-Abo (%s) für 30 Tage', p_tier), v_sub_id, v_new_balance);

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_sub_id,
    'tier', p_tier,
    'price_cents', v_price,
    'expires_at', (now() + INTERVAL '30 days')::TEXT,
    'new_balance', v_new_balance
  );
END;
$function$;

-- AR-44 Pattern: Explicit REVOKE + GRANT after CREATE OR REPLACE (resets privileges)
REVOKE EXECUTE ON FUNCTION public.subscribe_to_club(uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.subscribe_to_club(uuid, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.subscribe_to_club(uuid, uuid, text) TO authenticated;

COMMENT ON FUNCTION public.subscribe_to_club(uuid, uuid, text) IS
  'Slice 151c.2 (2026-04-23): Idempotency-Window 60s fuer same-tier retries. Upgrade/Downgrade-Flow unveraendert bei tier-change oder >60s. Verhindert doppelte Wallet-Deduction bei Network-Retry.';
