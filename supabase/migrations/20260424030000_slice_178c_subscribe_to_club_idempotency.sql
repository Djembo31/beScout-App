-- =============================================================================
-- Slice 178c — subscribe_to_club Idempotency-Integration (Tier A1)
--
-- Baseline source-of-truth: 20260423190000_slice_151c2_subscribe_idempotency.sql
-- Keine Patches zwischen 151c.2 und 178c.
--
-- Context:
--   151c.2 etablierte inline-60s-idempotency-window auf Basis von
--   `started_at`-Timestamp. Slice 178 lieferte generische Infrastructure
--   (`request_dedup_keys` + `check_or_reserve_dedup_key`). 178c konsolidiert:
--   neuer `p_idempotency_key` Parameter, Client-driven key ueberschreibt
--   inline-60s-Safety-Net. Backward-compat: Clients ohne Key behalten
--   inline-60s-Schutz.
--
-- Signatur-Erweiterung:
--   Alter: subscribe_to_club(p_user_id UUID, p_club_id UUID, p_tier TEXT)
--   Neu:   subscribe_to_club(p_user_id UUID, p_club_id UUID, p_tier TEXT,
--                            p_idempotency_key TEXT DEFAULT NULL)
--
-- Idempotency-Flow:
--   1. Mit Key: check_or_reserve_dedup_key VOR jedem DB-write (generic 300s).
--   2. Ohne Key: bestehender inline-60s-started_at-check bleibt aktiv.
--   3. Neue INSERT completion-UPDATE auf request_dedup_keys wenn Key gesetzt.
--
-- Preserved Guards:
--   - auth.uid() mismatch → RAISE
--   - Tier validation (bronze/silber/gold, else error-return)
--   - Wallet-locked FOR UPDATE + available-balance check
--   - ON CONFLICT tier-upgrade/downgrade Flow (cancel old + INSERT new)
--   - transactions.type='subscription' append
-- =============================================================================

CREATE OR REPLACE FUNCTION public.subscribe_to_club(
  p_user_id uuid,
  p_club_id uuid,
  p_tier text,
  p_idempotency_key text DEFAULT NULL
)
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
  v_result JSONB;
  v_dedup_new BOOLEAN;
  v_dedup_cached JSONB;
BEGIN
  -- AUTH GUARD
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  -- Tier validation (cheap, pre-dedup)
  CASE p_tier
    WHEN 'bronze' THEN v_price := 50000;
    WHEN 'silber' THEN v_price := 150000;
    WHEN 'gold'   THEN v_price := 300000;
    ELSE RETURN jsonb_build_object('success', false, 'error', 'Ungültiger Tier: ' || p_tier);
  END CASE;

  -- Slice 178c: Generic idempotency-check when key supplied.
  -- Replaces the inline-60s-check for key-bearing calls.
  IF p_idempotency_key IS NOT NULL THEN
    SELECT is_new, existing_response INTO v_dedup_new, v_dedup_cached
    FROM public.check_or_reserve_dedup_key(p_user_id, p_idempotency_key, 300);

    IF NOT v_dedup_new THEN
      IF v_dedup_cached IS NULL THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'idempotency_pending',
          'idempotent_replay', true
        );
      END IF;
      RETURN v_dedup_cached;
    END IF;
  END IF;

  -- Existing active subscription check WITH LOCK
  SELECT * INTO v_existing FROM club_subscriptions
  WHERE user_id = p_user_id AND club_id = p_club_id AND status = 'active'
  FOR UPDATE;

  IF FOUND THEN
    -- Slice 151c.2 IDEMPOTENCY FALLBACK (inline-60s) — only for calls WITHOUT
    -- generic idempotency-key. Calls with key have already been deduped above.
    IF p_idempotency_key IS NULL
       AND v_existing.tier = p_tier
       AND v_existing.started_at > NOW() - INTERVAL '60 seconds'
    THEN
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

    -- Tier-change (upgrade/downgrade) OR older than 60s without key: cancel old, proceed to new
    UPDATE club_subscriptions SET status = 'cancelled', updated_at = now()
    WHERE id = v_existing.id;
  END IF;

  -- Wallet WITH LOCK
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND OR (v_wallet.balance - COALESCE(v_wallet.locked_balance, 0)) < v_price THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nicht genug BSD. Benötigt: ' || (v_price / 100)::TEXT || ' BSD');
  END IF;

  -- Deduct balance (after all idempotency checks passed)
  v_new_balance := v_wallet.balance - v_price;
  UPDATE wallets SET balance = v_new_balance, updated_at = now() WHERE user_id = p_user_id;

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

  INSERT INTO transactions (user_id, amount, type, description, reference_id, balance_after)
  VALUES (p_user_id, -v_price, 'subscription',
    format('Club-Abo (%s) für 30 Tage', p_tier), v_sub_id, v_new_balance);

  v_result := jsonb_build_object(
    'success', true,
    'subscription_id', v_sub_id,
    'tier', p_tier,
    'price_cents', v_price,
    'expires_at', (now() + INTERVAL '30 days')::TEXT,
    'new_balance', v_new_balance
  );

  -- Slice 178c: Persist response for idempotent replay (when key supplied)
  IF p_idempotency_key IS NOT NULL THEN
    UPDATE public.request_dedup_keys
    SET response = v_result, status = 'completed'
    WHERE user_id = p_user_id AND dedup_key = p_idempotency_key;
  END IF;

  RETURN v_result;
END;
$function$;

-- AR-44: REVOKE/GRANT renew
REVOKE EXECUTE ON FUNCTION public.subscribe_to_club(uuid, uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.subscribe_to_club(uuid, uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.subscribe_to_club(uuid, uuid, text, text) TO authenticated;

-- Drop alte 3-arg Signatur zur Vermeidung von pg_proc-Ambiguity.
DROP FUNCTION IF EXISTS public.subscribe_to_club(uuid, uuid, text);

COMMENT ON FUNCTION public.subscribe_to_club(uuid, uuid, text, text) IS
  'Slice 178c (2026-04-24): Club-Subscription RPC mit optionaler generic Idempotency via Slice-178-Infrastructure. '
  'Key=NULL: inline-60s-Fallback (Slice 151c.2 backward-compat). '
  'Key gesetzt: check_or_reserve_dedup_key 300s-Window.';
