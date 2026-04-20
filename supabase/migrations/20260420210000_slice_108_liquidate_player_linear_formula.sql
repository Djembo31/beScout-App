-- Slice 108 — liquidate_player Linear Formula (CEO Pricing-Asset-Model)
--
-- BEFORE (Tier-Table, systematisch ~1,5× über linearer Formel):
--   v_fee_per_dpc := CASE
--     WHEN v_transfer_value >= 50000000 THEN 7500000
--     WHEN v_transfer_value >= 20000000 THEN 3500000
--     WHEN v_transfer_value >= 10000000 THEN 1500000
--     ...
--     ELSE 5000
--   END;
--
-- AFTER (CEO-Regel):
--   v_fee_per_dpc := GREATEST((v_transfer_value / 10)::BIGINT, 0);
--
-- CEO-Regel (Anil 2026-04-20, Sivasspor-DB-verifiziert):
--   - 1 $SCOUT = 1 cent = 0,01 €  (Interne BIGINT-cents = $SCOUT × 100)
--   - Card-Preis fix = MV_EUR / 100.000 in €, MV_EUR / 1.000 in $SCOUT, MV_EUR / 10 in cents
--   - Bei voll 10.000 Cards = 10% des MV als Community-Pool
--   - Bei weniger Cards → proportional kleinerer Pool (Formel bleibt gleich)
--   - 1 Mio € MV → 10 € pro Card = 1.000 $SCOUT = 100.000 cents (Bekir-Baseline)
--
-- UNVERÄNDERT (bleibt aus bestehender Implementation):
--   - SECURITY DEFINER + auth.uid() Guard
--   - Club-Admin Verification
--   - FOR UPDATE Locks (player + holdings + pbt_treasury)
--   - success_fee_cap_cents Cap (LEAST nach Formel)
--   - Mastery-Level 1-5 Bonus + CSF-Multiplier, kombiniert cap 1,15×
--   - PBT-Treasury proportionale Distribution
--   - Two-Pass Distribution (effective_qty-weighted)
--   - liquidation_events + liquidation_payouts Insert
--   - Holdings DELETE + is_liquidated := TRUE
--
-- IMPACT:
--   - 0 liquidation_events existieren (verifiziert via COUNT 2026-04-20) → keine Pilot-User-Erwartungen zu brechen
--   - Admin-UI AdminPlayersTab.tsx zeigt Liquidation-Preview via getSuccessFeeTier(tvEur) → Frontend-Helper wird simultan auf linear umgebaut
--   - RewardsTab.tsx zeigt Tier-Ladder → Werte werden ~33% niedriger, visuelles Layout bleibt

CREATE OR REPLACE FUNCTION public.liquidate_player(p_admin_id uuid, p_player_id uuid, p_transfer_value_eur integer DEFAULT 0)
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
BEGIN
  -- AUTH GUARD
  IF auth.uid() IS DISTINCT FROM p_admin_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  -- 1. Lock player row
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

  -- 2. Verify admin
  IF NOT EXISTS (
    SELECT 1 FROM club_admins ca
    WHERE ca.club_id = v_player.club_id AND ca.user_id = p_admin_id
  ) THEN
    RAISE EXCEPTION 'Not authorized: not a club admin';
  END IF;

  -- 3. Cancel all open/partial orders
  UPDATE orders SET status = 'cancelled'
  WHERE player_id = p_player_id AND status IN ('open', 'partial');

  -- 3b. Lock ALL holding rows to prevent concurrent trades during distribution
  PERFORM 1 FROM holdings WHERE player_id = p_player_id FOR UPDATE;

  -- 4. Get PBT balance
  SELECT COALESCE(balance, 0) INTO v_pbt_balance
  FROM pbt_treasury WHERE player_id = p_player_id FOR UPDATE;
  IF v_pbt_balance IS NULL THEN v_pbt_balance := 0; END IF;

  -- 5. Transfer value
  v_transfer_value := COALESCE(NULLIF(p_transfer_value_eur, 0), v_player.market_value_eur);

  -- 6. ───────── CEO PRICING-ASSET-MODEL (LINEAR FORMEL) ─────────
  -- Card-Preis skaliert 1:1 mit MV: Payout pro Card = MV_EUR / 10 cents
  -- Beispiele:
  --   MV 100.000 €  → fee =    10.000 cents (    100 $SCOUT =    1 €)
  --   MV 1.000.000 € → fee =   100.000 cents (  1.000 $SCOUT =   10 €)   ← Bekir-Baseline
  --   MV 5.000.000 € → fee =   500.000 cents (  5.000 $SCOUT =   50 €)
  --   MV 50.000.000 € → fee = 5.000.000 cents ( 50.000 $SCOUT =  500 €)
  --   MV 0 €         → fee = 0 (kein Payout, Player ohne MV)
  -- GREATEST-Guard: Bei MV < 0 oder negative integer-division → 0 (defensive)
  v_fee_per_dpc := GREATEST((v_transfer_value::BIGINT / 10), 0);

  -- 7. Apply cap (Verein-Schutz vor Runaway-Payouts bei hohen MV)
  -- Max-Cap ist 10.000.000 cents (100.000 $SCOUT) gemäß set_success_fee_cap Bound
  -- Bei Cap = NULL: kein Cap, Formel-Output direkt
  IF v_player.success_fee_cap_cents IS NOT NULL AND v_player.success_fee_cap_cents > 0 THEN
    v_fee_per_dpc := LEAST(v_fee_per_dpc, v_player.success_fee_cap_cents);
  END IF;

  -- 8. Get total SCs + holder count
  SELECT COALESCE(SUM(quantity), 0) INTO v_total_dpcs
  FROM holdings WHERE player_id = p_player_id;

  SELECT COUNT(*) INTO v_holder_count
  FROM holdings WHERE player_id = p_player_id AND quantity > 0;

  -- 9. Total CSF pool = fee_per_card × Summe aller Holdings
  --    Bei voll 10k Cards: pool ≈ 10% des MV (automatisch aus Formel)
  --    Bei weniger Cards: proportional kleinerer Community-Anteil
  v_total_sf_pool := v_fee_per_dpc * v_total_dpcs;

  -- 10. FIRST PASS: Calculate total effective quantity (mit Mastery + CSF Multiplier, cap 1.15×)
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

    -- PILOT CAP: Combined multiplier capped at 1.15x
    v_raw_multiplier := (1 + v_mastery_bonus) * v_csf_mult;
    v_effective_qty := v_holder.quantity::NUMERIC * LEAST(1.15, v_raw_multiplier);
    v_total_effective_qty := v_total_effective_qty + v_effective_qty;
  END LOOP;

  IF v_total_effective_qty = 0 THEN v_total_effective_qty := v_total_dpcs; END IF;

  v_liquidation_id := gen_random_uuid();

  -- 11. Insert liquidation_events
  INSERT INTO liquidation_events (
    id, player_id, club_id, triggered_by,
    pbt_balance_cents, success_fee_cents, distributed_cents,
    holder_count, transfer_value_eur, fee_per_dpc_cents
  ) VALUES (
    v_liquidation_id, p_player_id, v_player.club_id, p_admin_id,
    v_pbt_balance, 0, 0, v_holder_count, v_transfer_value, v_fee_per_dpc
  );

  -- 12. SECOND PASS: Distribute weighted payouts (MUSS mit FIRST PASS sync bleiben)
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

    -- PILOT CAP: Combined multiplier capped at 1.15x (must match first pass)
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

  -- 13. Update liquidation_events
  UPDATE liquidation_events
  SET distributed_cents = v_actual_pbt_distributed + v_actual_sf_distributed,
      success_fee_cents = v_actual_sf_distributed
  WHERE id = v_liquidation_id;

  -- 14. Drain PBT
  IF v_pbt_balance > 0 THEN
    UPDATE pbt_treasury SET balance = balance - v_actual_pbt_distributed, updated_at = now()
    WHERE player_id = p_player_id;
    IF v_actual_pbt_distributed > 0 THEN
      INSERT INTO pbt_transactions (player_id, source, amount, balance_after)
      VALUES (p_player_id, 'liquidation', -v_actual_pbt_distributed,
              v_pbt_balance - v_actual_pbt_distributed);
    END IF;
  END IF;

  -- 15. Delete holdings
  DELETE FROM holdings WHERE player_id = p_player_id;

  -- 16. Mark liquidated
  UPDATE players SET is_liquidated = TRUE WHERE id = p_player_id;

  RETURN jsonb_build_object(
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
END;
$function$;

COMMENT ON FUNCTION public.liquidate_player(uuid, uuid, integer) IS
  'Slice 108: Linear CEO-Formel fee_per_dpc = transfer_value_eur / 10 cents. '
  'Früher Tier-Table (2026-03-31 bis 2026-04-20), ersetzt durch lineare MV-proportionale Auszahlung. '
  'Siehe worklog/specs/108-liquidate-player-linear-formula.md und memory/decision_pricing_asset_model.md.';
