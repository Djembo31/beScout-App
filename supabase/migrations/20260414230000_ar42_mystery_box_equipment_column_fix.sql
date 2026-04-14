-- =============================================================================
-- AR-42 (Operation Beta Ready, Journey #5) — Mystery Box Equipment Column-Fix
--
-- PROBLEM (J5B-01, LIVE-BROKEN 6 Tage):
--   Fix-Migration 20260411114600 hat im RPC-Body `open_mystery_box_v2` die falsche
--   Spalte referenziert: INSERT INTO public.user_equipment (...equipment_rank...).
--   Live-Schema heisst die Spalte `rank` (nicht `equipment_rank`).
--   Folge: Jeder Equipment-Drop wirft PG-Error 42703, Transaction rollback,
--   Ticket-Kosten revertiert aber User sieht "Open Error" Toast.
--
-- IMPACT:
--   - 0 Equipment-Drops seit 2026-04-08 11:02 (letzter erfolgreicher vor Fix-Migration)
--   - ~18% aller Mystery-Box-Opens scheitern silent auf equipment-Rolls
--   - Reward-Path komplett tot → UX-Regression + impliziter Reward-Loss
--
-- FIX:
--   Einzelzeile INSERT-Column `equipment_rank` → `rank`. Rest des RPC-Bodies
--   bleibt unveraendert (siehe pg_get_functiondef Beweis 2026-04-14).
--
-- SECURITY (J5-Learning, J4 SECURITY DEFINER Audit):
--   CREATE OR REPLACE resettet Grants. Explizit REVOKE from anon + GRANT to
--   authenticated erneuern (Defense-in-Depth).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.open_mystery_box_v2(p_free boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_uid UUID;
  v_effective_cost INTEGER;
  v_streak_discount INTEGER := 0;
  v_rarity TEXT;
  v_rarity_rec RECORD;
  v_rarity_roll INTEGER;
  v_rarity_acc INTEGER := 0;
  v_reward_rec RECORD;
  v_reward_roll INTEGER;
  v_reward_acc INTEGER := 0;
  v_reward_type TEXT;
  v_min_val INTEGER;
  v_max_val INTEGER;
  v_tickets_amount INTEGER;
  v_eq_key TEXT;
  v_eq_rank INTEGER;
  v_eq_name_de TEXT;
  v_eq_name_tr TEXT;
  v_eq_position TEXT;
  v_bcredits BIGINT;
  v_cosmetic_id UUID;
  v_cosmetic_key TEXT;
  v_total_w INTEGER;
  v_result_id UUID;
  v_multiplier NUMERIC;
  v_free_today INTEGER;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  -- Daily free-box cap (server-side, UTC day)
  IF p_free THEN
    SELECT COUNT(*) INTO v_free_today
    FROM public.mystery_box_results
    WHERE user_id = v_uid
      AND ticket_cost = 0
      AND opened_at >= date_trunc('day', (now() AT TIME ZONE 'UTC')) AT TIME ZONE 'UTC';

    IF v_free_today >= 1 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'daily_free_limit_reached');
    END IF;
  END IF;

  -- Ticket cost
  IF NOT p_free THEN
    SELECT COALESCE(sc.mystery_box_ticket_discount, 0) INTO v_streak_discount
    FROM public.user_streaks us
    JOIN public.streak_config sc ON us.current_streak >= sc.min_days
    WHERE us.user_id = v_uid
    ORDER BY sc.min_days DESC LIMIT 1;

    v_effective_cost := GREATEST(1, 15 - v_streak_discount);

    PERFORM 1 FROM public.user_tickets WHERE user_id = v_uid AND balance >= v_effective_cost FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Not enough tickets');
    END IF;

    UPDATE public.user_tickets
    SET balance = balance - v_effective_cost, spent_total = spent_total + v_effective_cost, updated_at = now()
    WHERE user_id = v_uid;

    INSERT INTO public.ticket_transactions (user_id, amount, balance_after, source, description)
    VALUES (v_uid, -v_effective_cost,
            (SELECT balance FROM public.user_tickets WHERE user_id = v_uid),
            'mystery_box', 'Mystery Box opened');
  ELSE
    v_effective_cost := 0;
  END IF;

  -- Roll rarity (weighted random across distinct rarities)
  SELECT COALESCE(SUM(drop_weight), 0) INTO v_total_w
  FROM (SELECT DISTINCT ON (rarity) rarity, drop_weight FROM public.mystery_box_config WHERE active) sub;

  IF v_total_w = 0 THEN
    v_rarity := 'common';
    v_reward_type := 'tickets';
    v_min_val := 5;
    v_max_val := 15;
    v_tickets_amount := 5 + floor(random() * 11)::INT;
    v_bcredits := 0;
    v_cosmetic_id := NULL;
    v_cosmetic_key := NULL;
    v_eq_key := NULL;
    v_eq_rank := NULL;
    v_eq_name_de := NULL;
    v_eq_name_tr := NULL;
    v_eq_position := NULL;
  ELSE
    v_rarity_roll := floor(random() * v_total_w)::INT;
    FOR v_rarity_rec IN
      SELECT DISTINCT ON (rarity) rarity, drop_weight FROM public.mystery_box_config WHERE active ORDER BY rarity
    LOOP
      v_rarity_acc := v_rarity_acc + v_rarity_rec.drop_weight;
      IF v_rarity_roll < v_rarity_acc THEN
        v_rarity := v_rarity_rec.rarity;
        EXIT;
      END IF;
    END LOOP;
    IF v_rarity IS NULL THEN v_rarity := 'common'; END IF;

    -- Roll reward within rarity
    SELECT COALESCE(SUM(reward_weight), 0) INTO v_total_w
    FROM public.mystery_box_config WHERE rarity = v_rarity AND active;

    v_reward_roll := floor(random() * v_total_w)::INT;
    v_reward_acc := 0;
    FOR v_reward_rec IN
      SELECT reward_type, reward_weight, min_value, max_value FROM public.mystery_box_config
      WHERE rarity = v_rarity AND active ORDER BY reward_weight DESC
    LOOP
      v_reward_acc := v_reward_acc + v_reward_rec.reward_weight;
      IF v_reward_roll < v_reward_acc THEN
        v_reward_type := v_reward_rec.reward_type;
        v_min_val := v_reward_rec.min_value;
        v_max_val := v_reward_rec.max_value;
        EXIT;
      END IF;
    END LOOP;

    IF v_reward_type IS NULL THEN
      v_reward_type := 'tickets';
      v_min_val := 5;
      v_max_val := 15;
    END IF;

    -- Resolve reward
    v_tickets_amount := 0;
    v_bcredits := 0;
    v_cosmetic_id := NULL;
    v_cosmetic_key := NULL;
    v_eq_key := NULL;
    v_eq_rank := NULL;
    v_eq_name_de := NULL;
    v_eq_name_tr := NULL;
    v_eq_position := NULL;

    CASE v_reward_type
      WHEN 'tickets' THEN
        v_multiplier := CASE v_rarity
          WHEN 'common' THEN 1.0 WHEN 'rare' THEN 1.5 WHEN 'epic' THEN 2.5
          WHEN 'legendary' THEN 5.0 WHEN 'mythic' THEN 10.0 ELSE 1.0
        END;
        v_tickets_amount := ROUND((v_min_val + floor(random() * (v_max_val - v_min_val + 1))::INT) * v_multiplier)::INT;
        UPDATE public.user_tickets
          SET balance = balance + v_tickets_amount, earned_total = earned_total + v_tickets_amount, updated_at = now()
          WHERE user_id = v_uid;
        INSERT INTO public.ticket_transactions (user_id, amount, balance_after, source, description)
        VALUES (v_uid, v_tickets_amount,
                (SELECT balance FROM public.user_tickets WHERE user_id = v_uid),
                'mystery_box', v_rarity || ' Mystery Box reward');

      WHEN 'bcredits' THEN
        v_multiplier := CASE v_rarity
          WHEN 'common' THEN 1.0 WHEN 'rare' THEN 2.0 WHEN 'epic' THEN 4.0
          WHEN 'legendary' THEN 8.0 WHEN 'mythic' THEN 15.0 ELSE 1.0
        END;
        v_bcredits := ROUND((v_min_val + floor(random() * (v_max_val - v_min_val + 1))::INT) * v_multiplier)::BIGINT;
        UPDATE public.wallets SET balance = balance + v_bcredits WHERE user_id = v_uid;
        INSERT INTO public.transactions (user_id, type, amount_cents, description)
        VALUES (v_uid, 'mystery_box_reward', v_bcredits, v_rarity || ' Mystery Box: ' || (v_bcredits / 100) || ' CR');

      WHEN 'equipment' THEN
        -- Rank range encoded in min_value/max_value. Key picked randomly from active definitions.
        v_eq_rank := v_min_val + floor(random() * (v_max_val - v_min_val + 1))::INT;
        SELECT key, name_de, name_tr, position
          INTO v_eq_key, v_eq_name_de, v_eq_name_tr, v_eq_position
        FROM public.equipment_definitions
        WHERE active = true
        ORDER BY random() LIMIT 1;

        IF v_eq_key IS NOT NULL THEN
          -- AR-42 FIX (2026-04-14): column is `rank`, NOT `equipment_rank`.
          INSERT INTO public.user_equipment (user_id, equipment_key, rank, source)
          VALUES (v_uid, v_eq_key, v_eq_rank, 'mystery_box');
        ELSE
          v_reward_type := 'tickets';
          v_tickets_amount := v_min_val;
          v_eq_rank := NULL;
          UPDATE public.user_tickets
            SET balance = balance + v_tickets_amount, earned_total = earned_total + v_tickets_amount, updated_at = now()
            WHERE user_id = v_uid;
          INSERT INTO public.ticket_transactions (user_id, amount, balance_after, source, description)
          VALUES (v_uid, v_tickets_amount,
                  (SELECT balance FROM public.user_tickets WHERE user_id = v_uid),
                  'mystery_box', v_rarity || ' Mystery Box reward (fallback)');
        END IF;

      WHEN 'cosmetic' THEN
        SELECT id, key INTO v_cosmetic_id, v_cosmetic_key
        FROM public.cosmetic_definitions
        WHERE rarity = v_rarity AND active = true
        ORDER BY random() LIMIT 1;
        IF v_cosmetic_id IS NOT NULL THEN
          INSERT INTO public.user_cosmetics (user_id, cosmetic_id, source)
          VALUES (v_uid, v_cosmetic_id, 'mystery_box')
          ON CONFLICT (user_id, cosmetic_id) DO NOTHING;
        ELSE
          v_reward_type := 'tickets';
          v_tickets_amount := v_min_val;
          UPDATE public.user_tickets
            SET balance = balance + v_tickets_amount, earned_total = earned_total + v_tickets_amount, updated_at = now()
            WHERE user_id = v_uid;
          INSERT INTO public.ticket_transactions (user_id, amount, balance_after, source, description)
          VALUES (v_uid, v_tickets_amount,
                  (SELECT balance FROM public.user_tickets WHERE user_id = v_uid),
                  'mystery_box', v_rarity || ' Mystery Box reward (fallback)');
        END IF;

      ELSE
        v_reward_type := 'tickets';
        v_tickets_amount := v_min_val;
        UPDATE public.user_tickets
          SET balance = balance + v_tickets_amount, earned_total = earned_total + v_tickets_amount, updated_at = now()
          WHERE user_id = v_uid;
        INSERT INTO public.ticket_transactions (user_id, amount, balance_after, source, description)
        VALUES (v_uid, v_tickets_amount,
                (SELECT balance FROM public.user_tickets WHERE user_id = v_uid),
                'mystery_box', v_rarity || ' Mystery Box reward (fallback)');
    END CASE;
  END IF;

  -- Record result
  INSERT INTO public.mystery_box_results (
    user_id, rarity, reward_type, tickets_amount,
    cosmetic_id, equipment_type, equipment_rank, bcredits_amount, ticket_cost
  ) VALUES (
    v_uid, v_rarity, v_reward_type, v_tickets_amount,
    v_cosmetic_id, v_eq_key, v_eq_rank, v_bcredits, v_effective_cost
  ) RETURNING id INTO v_result_id;

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_result_id,
    'rarity', v_rarity,
    'rewardType', v_reward_type,
    'ticketsAmount', v_tickets_amount,
    'bcreditsAmount', v_bcredits,
    'cosmeticKey', COALESCE(v_cosmetic_key, ''),
    'equipmentType', COALESCE(v_eq_key, ''),
    'equipmentRank', COALESCE(v_eq_rank, 0),
    'equipmentNameDe', COALESCE(v_eq_name_de, ''),
    'equipmentNameTr', COALESCE(v_eq_name_tr, ''),
    'equipmentPosition', COALESCE(v_eq_position, ''),
    'ticketCost', v_effective_cost
  );
END;
$function$;

-- Defense-in-Depth: CREATE OR REPLACE FUNCTION resettet Grants (J5-Learning).
-- Explicit REVOKE from anon + GRANT to authenticated erneuern.
REVOKE EXECUTE ON FUNCTION public.open_mystery_box_v2(boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.open_mystery_box_v2(boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.open_mystery_box_v2(boolean) TO authenticated;

COMMENT ON FUNCTION public.open_mystery_box_v2(boolean) IS
  'AR-42 (2026-04-14): INSERT INTO user_equipment uses column `rank` (not `equipment_rank`). Previous fix-migration 20260411114600 had wrong column name; live-broken 6d.';
