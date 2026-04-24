-- =============================================================================
-- Slice 178e-d — liquidate_player Idempotency-Integration (Tier A1, Money, Admin)
--
-- Baseline: live pg_get_functiondef.
-- IRREVERSIBEL. Retry wuerde 2× Wallet-Payouts erzeugen bevor is_liquidated-guard
-- greift → payout-double.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.liquidate_player(
  p_admin_id uuid,
  p_player_id uuid,
  p_transfer_value_eur integer DEFAULT 0,
  p_idempotency_key text DEFAULT NULL
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $function$
DECLARE
  v_player RECORD;
  v_pbt_balance BIGINT;
  v_total_dpcs BIGINT;
  v_holder RECORD;
  v_holder_count INT := 0;
  v_liquidation_id UUID;
  v_player_name TEXT;
  v_pbt_payout BIGINT;
  v_actual_pbt_distributed BIGINT := 0;
  v_transfer_value INTEGER;
  v_fee_per_dpc BIGINT;
  v_sf_payout BIGINT;
  v_actual_sf_distributed BIGINT := 0;
  v_total_sf_pool BIGINT;
  v_mastery_level INT;
  v_mastery_bonus NUMERIC(4,2);
  v_csf_mult NUMERIC(3,2);
  v_effective_qty NUMERIC;
  v_total_effective_qty NUMERIC := 0;
  v_total_payout BIGINT;
  v_new_wallet_balance BIGINT;
  v_raw_multiplier NUMERIC;
  v_result JSONB;
  v_dedup_new BOOLEAN;
  v_dedup_cached JSONB;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_admin_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT is_new, existing_response INTO v_dedup_new, v_dedup_cached
    FROM public.check_or_reserve_dedup_key(p_admin_id, p_idempotency_key, 300);

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

  SELECT p.id, p.club_id, p.is_liquidated, p.success_fee_cap_cents,
         p.market_value_eur,
         COALESCE(NULLIF(TRIM(p.first_name), '') || ' ', '') || p.last_name AS computed_name
  INTO v_player
  FROM players p
  WHERE p.id = p_player_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Player not found'; END IF;
  IF v_player.is_liquidated THEN RAISE EXCEPTION 'Player is already liquidated'; END IF;

  v_player_name := v_player.computed_name;

  IF NOT EXISTS (
    SELECT 1 FROM club_admins ca
    WHERE ca.club_id = v_player.club_id AND ca.user_id = p_admin_id
  ) THEN
    RAISE EXCEPTION 'Not authorized: not a club admin';
  END IF;

  UPDATE orders SET status = 'cancelled'
  WHERE player_id = p_player_id AND status IN ('open', 'partial');

  PERFORM 1 FROM holdings WHERE player_id = p_player_id FOR UPDATE;

  SELECT COALESCE(balance, 0) INTO v_pbt_balance
  FROM pbt_treasury WHERE player_id = p_player_id FOR UPDATE;
  IF v_pbt_balance IS NULL THEN v_pbt_balance := 0; END IF;

  v_transfer_value := COALESCE(NULLIF(p_transfer_value_eur, 0), v_player.market_value_eur);

  v_fee_per_dpc := GREATEST((v_transfer_value::BIGINT / 10), 0);

  IF v_player.success_fee_cap_cents IS NOT NULL AND v_player.success_fee_cap_cents > 0 THEN
    v_fee_per_dpc := LEAST(v_fee_per_dpc, v_player.success_fee_cap_cents);
  END IF;

  SELECT COALESCE(SUM(quantity), 0) INTO v_total_dpcs
  FROM holdings WHERE player_id = p_player_id;

  SELECT COUNT(*) INTO v_holder_count
  FROM holdings WHERE player_id = p_player_id AND quantity > 0;

  v_total_sf_pool := v_fee_per_dpc * v_total_dpcs;

  FOR v_holder IN
    SELECT h.user_id, h.quantity
    FROM holdings h
    WHERE h.player_id = p_player_id AND h.quantity > 0
  LOOP
    SELECT COALESCE(dm.level, 1) INTO v_mastery_level
    FROM dpc_mastery dm
    WHERE dm.user_id = v_holder.user_id AND dm.player_id = p_player_id;
    IF NOT FOUND THEN v_mastery_level := 1; END IF;

    v_mastery_bonus := CASE v_mastery_level
      WHEN 1 THEN 0.00 WHEN 2 THEN 0.05 WHEN 3 THEN 0.15
      WHEN 4 THEN 0.25 WHEN 5 THEN 0.35 ELSE 0.00
    END;

    SELECT COALESCE(fr.csf_multiplier, 1.00) INTO v_csf_mult
    FROM fan_rankings fr
    WHERE fr.user_id = v_holder.user_id AND fr.club_id = v_player.club_id;
    IF NOT FOUND THEN v_csf_mult := 1.00; END IF;

    v_raw_multiplier := (1 + v_mastery_bonus) * v_csf_mult;
    v_effective_qty := v_holder.quantity::NUMERIC * LEAST(1.15, v_raw_multiplier);
    v_total_effective_qty := v_total_effective_qty + v_effective_qty;
  END LOOP;

  IF v_total_effective_qty = 0 THEN v_total_effective_qty := v_total_dpcs; END IF;

  v_liquidation_id := gen_random_uuid();

  INSERT INTO liquidation_events (
    id, player_id, club_id, triggered_by,
    pbt_balance_cents, success_fee_cents, distributed_cents,
    holder_count, transfer_value_eur, fee_per_dpc_cents
  ) VALUES (
    v_liquidation_id, p_player_id, v_player.club_id, p_admin_id,
    v_pbt_balance, 0, 0, v_holder_count, v_transfer_value, v_fee_per_dpc
  );

  FOR v_holder IN
    SELECT h.user_id, h.quantity
    FROM holdings h
    WHERE h.player_id = p_player_id AND h.quantity > 0
  LOOP
    SELECT COALESCE(dm.level, 1) INTO v_mastery_level
    FROM dpc_mastery dm
    WHERE dm.user_id = v_holder.user_id AND dm.player_id = p_player_id;
    IF NOT FOUND THEN v_mastery_level := 1; END IF;

    v_mastery_bonus := CASE v_mastery_level
      WHEN 1 THEN 0.00 WHEN 2 THEN 0.05 WHEN 3 THEN 0.15
      WHEN 4 THEN 0.25 WHEN 5 THEN 0.35 ELSE 0.00
    END;

    SELECT COALESCE(fr.csf_multiplier, 1.00) INTO v_csf_mult
    FROM fan_rankings fr
    WHERE fr.user_id = v_holder.user_id AND fr.club_id = v_player.club_id;
    IF NOT FOUND THEN v_csf_mult := 1.00; END IF;

    v_raw_multiplier := (1 + v_mastery_bonus) * v_csf_mult;
    v_effective_qty := v_holder.quantity::NUMERIC * LEAST(1.15, v_raw_multiplier);

    v_pbt_payout := 0;
    IF v_total_effective_qty > 0 AND v_pbt_balance > 0 THEN
      v_pbt_payout := FLOOR(v_pbt_balance::NUMERIC * v_effective_qty / v_total_effective_qty);
    END IF;

    v_sf_payout := 0;
    IF v_total_effective_qty > 0 AND v_total_sf_pool > 0 THEN
      v_sf_payout := FLOOR(v_total_sf_pool::NUMERIC * v_effective_qty / v_total_effective_qty);
    END IF;

    v_total_payout := v_pbt_payout + v_sf_payout;

    IF v_total_payout > 0 THEN
      UPDATE wallets SET balance = balance + v_total_payout, updated_at = now()
      WHERE user_id = v_holder.user_id
      RETURNING balance INTO v_new_wallet_balance;

      IF v_pbt_payout > 0 THEN
        INSERT INTO transactions (user_id, amount, type, description, reference_id, balance_after)
        VALUES (v_holder.user_id, v_pbt_payout, 'pbt_liquidation',
                'PBT-Ausschuettung: ' || v_player_name, p_player_id,
                v_new_wallet_balance - v_sf_payout);
      END IF;

      IF v_sf_payout > 0 THEN
        INSERT INTO transactions (user_id, amount, type, description, reference_id, balance_after)
        VALUES (v_holder.user_id, v_sf_payout, 'success_fee',
                'Community Bonus: ' || v_player_name, p_player_id, v_new_wallet_balance);
      END IF;
    END IF;

    INSERT INTO liquidation_payouts (
      liquidation_id, user_id, dpc_quantity, payout_cents,
      pbt_payout_cents, success_fee_payout_cents
    ) VALUES (
      v_liquidation_id, v_holder.user_id, v_holder.quantity, v_total_payout,
      v_pbt_payout, v_sf_payout
    );

    v_actual_pbt_distributed := v_actual_pbt_distributed + v_pbt_payout;
    v_actual_sf_distributed := v_actual_sf_distributed + v_sf_payout;
  END LOOP;

  UPDATE liquidation_events
  SET distributed_cents = v_actual_pbt_distributed + v_actual_sf_distributed,
      success_fee_cents = v_actual_sf_distributed
  WHERE id = v_liquidation_id;

  IF v_pbt_balance > 0 THEN
    UPDATE pbt_treasury SET balance = balance - v_actual_pbt_distributed, updated_at = now()
    WHERE player_id = p_player_id;
    IF v_actual_pbt_distributed > 0 THEN
      INSERT INTO pbt_transactions (player_id, source, amount, balance_after)
      VALUES (p_player_id, 'liquidation', -v_actual_pbt_distributed,
              v_pbt_balance - v_actual_pbt_distributed);
    END IF;
  END IF;

  DELETE FROM holdings WHERE player_id = p_player_id;

  UPDATE players SET is_liquidated = TRUE WHERE id = p_player_id;

  v_result := jsonb_build_object(
    'success', true, 'holder_count', v_holder_count,
    'distributed_cents', v_actual_pbt_distributed + v_actual_sf_distributed,
    'pbt_distributed_cents', v_actual_pbt_distributed,
    'success_fee_cents', v_actual_sf_distributed,
    'fee_per_dpc_cents', v_fee_per_dpc,
    'transfer_value_eur', v_transfer_value,
    'liquidation_id', v_liquidation_id, 'weighted', true,
    'multiplier_cap', 1.15,
    'formula_version', 'linear_v2_2026_04_20'
  );

  IF p_idempotency_key IS NOT NULL THEN
    UPDATE public.request_dedup_keys
    SET response = v_result, status = 'completed'
    WHERE user_id = p_admin_id AND dedup_key = p_idempotency_key;
  END IF;

  RETURN v_result;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.liquidate_player(uuid, uuid, integer, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.liquidate_player(uuid, uuid, integer, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.liquidate_player(uuid, uuid, integer, text) TO authenticated;

DROP FUNCTION IF EXISTS public.liquidate_player(uuid, uuid, integer);

COMMENT ON FUNCTION public.liquidate_player(uuid, uuid, integer, text) IS
  'Slice 178e-d (2026-04-24): Club-admin liquidation RPC with optional idempotency_key. Prevents double-payout-distribution on retry (irreversible action).';
