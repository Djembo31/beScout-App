-- Slice 330 — CSF-Engine ans Treasury (debit-Buchung + Cap + Multiplikatoren raus)
-- CEO-approved 2026-06-17:
--   D-A = CSF debitiert Club-Treasury; reicht Saldo nicht → Liquidation blockt fail-safe (RAISE, kein Minting/Minus). Deposit-Pfad = Slice 330b.
--   D-B = Pro-Card-Cap (success_fee_cap_cents) behalten — unverändert.
--   D-C = csf_multiplier UND mastery_bonus raus → CSF + PBT rein proportional nach Stückzahl. UI-Badge separat entfernt.
-- Baseline: live pg_get_functiondef 2026-06-17 (= 20260424070000_slice_178e_d, PATCH-AUDIT bestätigt, keine Zwischen-Patches).
-- Erhalten 1:1: auth-Guard, idempotency-Block, club-admin-Check, orders-cancel, pbt_treasury-Quelle+Decrement,
--   liquidation_events/_payouts, holder-Notif-Daten, REVOKE/GRANT (authenticated+postgres+service_role).
-- Geändert: beide Holder-Loops rein proportional (effective-qty raus); Treasury-Guard + CSF-Debit; Return-Shape.

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
  v_total_payout BIGINT;
  v_new_wallet_balance BIGINT;
  v_treasury_available BIGINT;   -- Slice 330: Ledger-Saldo − offene Withdrawals
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

  -- D-B: Pro-Card-Cap unverändert.
  IF v_player.success_fee_cap_cents IS NOT NULL AND v_player.success_fee_cap_cents > 0 THEN
    v_fee_per_dpc := LEAST(v_fee_per_dpc, v_player.success_fee_cap_cents);
  END IF;

  SELECT COALESCE(SUM(quantity), 0) INTO v_total_dpcs
  FROM holdings WHERE player_id = p_player_id;

  SELECT COUNT(*) INTO v_holder_count
  FROM holdings WHERE player_id = p_player_id AND quantity > 0;

  v_total_sf_pool := v_fee_per_dpc * v_total_dpcs;

  -- ============================================================
  -- Slice 330 D-A: Treasury-Deckungs-Guard VOR jeglichem Geld-Write.
  -- CSF kommt aus dem Club-Treasury (kein Minting). Reicht das verfügbare
  -- Guthaben nicht → fail-safe RAISE, ganze TX (inkl. dedup-Reservierung) rollt zurück.
  -- clubs-FOR-UPDATE = Serialisierungspunkt (reentrant mit book_club_treasury),
  -- damit Guard-Read + Debit gegen parallele Buchungen race-frei sind (Slice 329 Pattern).
  -- ============================================================
  IF v_total_sf_pool > 0 THEN
    PERFORM 1 FROM clubs WHERE id = v_player.club_id FOR UPDATE;

    SELECT COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END), 0)
      INTO v_treasury_available
    FROM club_treasury_ledger WHERE club_id = v_player.club_id;

    v_treasury_available := v_treasury_available - COALESCE((
      SELECT SUM(amount_cents) FROM club_withdrawals
      WHERE club_id = v_player.club_id AND status IN ('pending','approved','paid')
    ), 0);

    IF v_treasury_available < v_total_sf_pool THEN
      RAISE EXCEPTION 'treasury_insufficient_for_csf: benoetigt %, verfuegbar %',
        v_total_sf_pool, v_treasury_available;
    END IF;
  END IF;

  v_liquidation_id := gen_random_uuid();

  INSERT INTO liquidation_events (
    id, player_id, club_id, triggered_by,
    pbt_balance_cents, success_fee_cents, distributed_cents,
    holder_count, transfer_value_eur, fee_per_dpc_cents
  ) VALUES (
    v_liquidation_id, p_player_id, v_player.club_id, p_admin_id,
    v_pbt_balance, 0, 0, v_holder_count, v_transfer_value, v_fee_per_dpc
  );

  -- Slice 330 D-C: rein proportional nach Stückzahl (csf_multiplier + mastery_bonus entfernt).
  -- PBT und CSF teilen denselben Nenner v_total_dpcs.
  FOR v_holder IN
    SELECT h.user_id, h.quantity
    FROM holdings h
    WHERE h.player_id = p_player_id AND h.quantity > 0
  LOOP
    v_pbt_payout := 0;
    IF v_total_dpcs > 0 AND v_pbt_balance > 0 THEN
      v_pbt_payout := FLOOR(v_pbt_balance::NUMERIC * v_holder.quantity / v_total_dpcs);
    END IF;

    v_sf_payout := 0;
    IF v_total_dpcs > 0 AND v_total_sf_pool > 0 THEN
      v_sf_payout := FLOOR(v_total_sf_pool::NUMERIC * v_holder.quantity / v_total_dpcs);
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

  -- Slice 330 D-A: CSF aus dem Club-Treasury debitieren (tatsächlich verteilte Summe nach
  -- FLOOR-Rundung → Ledger matcht Wallets exakt, Rundungs-Staub bleibt im Treasury).
  IF v_actual_sf_distributed > 0 THEN
    PERFORM public.book_club_treasury(
      v_player.club_id, 'debit', 'csf', v_actual_sf_distributed, v_liquidation_id,
      'CSF-Auszahlung: ' || v_player_name);
  END IF;

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
    'csf_debited_cents', v_actual_sf_distributed,
    'fee_per_dpc_cents', v_fee_per_dpc,
    'transfer_value_eur', v_transfer_value,
    'liquidation_id', v_liquidation_id,
    'weighted', false,
    'formula_version', 'proportional_v3_2026_06_17'
  );

  IF p_idempotency_key IS NOT NULL THEN
    UPDATE public.request_dedup_keys
    SET response = v_result, status = 'completed'
    WHERE user_id = p_admin_id AND dedup_key = p_idempotency_key;
  END IF;

  RETURN v_result;
END;
$function$;

-- AR-44: Privilegien nach CREATE OR REPLACE explizit (Baseline-Grants 1:1, live verifiziert 2026-06-17).
REVOKE EXECUTE ON FUNCTION public.liquidate_player(uuid, uuid, integer, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.liquidate_player(uuid, uuid, integer, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.liquidate_player(uuid, uuid, integer, text) TO authenticated, postgres, service_role;

COMMENT ON FUNCTION public.liquidate_player(uuid, uuid, integer, text) IS
  'Slice 330 (2026-06-17): CSF rein proportional (csf_multiplier+mastery raus), debitiert Club-Treasury via book_club_treasury; fail-safe Guard treasury_insufficient_for_csf bei Unterdeckung. PBT-Quelle unverändert. Idempotency-fähig.';
