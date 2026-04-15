-- =============================================================================
-- AR-54 (J9, 2026-04-15) — close_monthly_liga Wallet-Payout
--
-- PROBLEM (Audit CRITICAL):
--   RPC close_monthly_liga inseriert in monthly_liga_snapshots + monthly_liga_winners
--   aber zahlt KEINE reward_cents aus. Max 10.8M CR/Monat Gap (12 winners × 3
--   ranks × 4 dims × rewards). 0 rows aktuell = nie getriggered.
--
-- FIX:
--   Nach winners-INSERT: neue FOR-Loop über Winners, UPDATE wallets + INSERT
--   transactions mit type='liga_reward'. Atomisch in derselben Transaction.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.close_monthly_liga(p_month date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_season liga_seasons%ROWTYPE;
  v_count INTEGER := 0;
  v_payouts INTEGER := 0;
  v_total_paid BIGINT := 0;
  v_dim TEXT;
  v_dims TEXT[] := ARRAY['trader', 'manager', 'analyst', 'overall'];
  v_reward_1 BIGINT := 500000;
  v_reward_2 BIGINT := 250000;
  v_reward_3 BIGINT := 100000;
  v_winner RECORD;
  v_new_balance BIGINT;
BEGIN
  SELECT * INTO v_season FROM liga_seasons WHERE is_active = true LIMIT 1;
  IF v_season.id IS NULL THEN
    RETURN jsonb_build_object('error', 'no_active_season');
  END IF;

  IF EXISTS (SELECT 1 FROM monthly_liga_snapshots WHERE month = p_month LIMIT 1) THEN
    RETURN jsonb_build_object('error', 'month_already_closed', 'month', p_month);
  END IF;

  FOREACH v_dim IN ARRAY v_dims LOOP
    IF v_dim = 'overall' THEN
      INSERT INTO monthly_liga_snapshots (month, user_id, dimension, score_delta, final_score, rank)
      SELECT
        p_month,
        s.user_id,
        'overall',
        (ARRAY[
          s.trader_score - s.season_start_trader,
          s.manager_score - s.season_start_manager,
          s.analyst_score - s.season_start_analyst
        ])[2] AS score_delta,
        (ARRAY[s.trader_score, s.manager_score, s.analyst_score])[2] AS final_score,
        ROW_NUMBER() OVER (ORDER BY
          (ARRAY[
            s.trader_score - s.season_start_trader,
            s.manager_score - s.season_start_manager,
            s.analyst_score - s.season_start_analyst
          ])[2] DESC
        )::INTEGER
      FROM scout_scores s;
    ELSE
      INSERT INTO monthly_liga_snapshots (month, user_id, dimension, score_delta, final_score, rank)
      SELECT
        p_month,
        s.user_id,
        v_dim,
        CASE v_dim
          WHEN 'trader' THEN s.trader_score - s.season_start_trader
          WHEN 'manager' THEN s.manager_score - s.season_start_manager
          WHEN 'analyst' THEN s.analyst_score - s.season_start_analyst
        END AS score_delta,
        CASE v_dim
          WHEN 'trader' THEN s.trader_score
          WHEN 'manager' THEN s.manager_score
          WHEN 'analyst' THEN s.analyst_score
        END AS final_score,
        ROW_NUMBER() OVER (ORDER BY
          CASE v_dim
            WHEN 'trader' THEN s.trader_score - s.season_start_trader
            WHEN 'manager' THEN s.manager_score - s.season_start_manager
            WHEN 'analyst' THEN s.analyst_score - s.season_start_analyst
          END DESC
        )::INTEGER
      FROM scout_scores s;
    END IF;

    INSERT INTO monthly_liga_winners (month, dimension, user_id, rank, reward_cents, badge_key)
    SELECT
      p_month,
      v_dim,
      ms.user_id,
      ms.rank,
      CASE ms.rank WHEN 1 THEN v_reward_1 WHEN 2 THEN v_reward_2 WHEN 3 THEN v_reward_3 END,
      'monthly_winner_' || v_dim || '_' || ms.rank
    FROM monthly_liga_snapshots ms
    WHERE ms.month = p_month AND ms.dimension = v_dim AND ms.rank <= 3;

    GET DIAGNOSTICS v_count = ROW_COUNT;
  END LOOP;

  -- AR-54 FIX: Wallet-Payout für alle Winners (Top 3 × 4 dims = 12 payouts).
  FOR v_winner IN
    SELECT user_id, dimension, rank, reward_cents
    FROM monthly_liga_winners
    WHERE month = p_month
      AND reward_cents IS NOT NULL
      AND reward_cents > 0
  LOOP
    UPDATE wallets
      SET balance = balance + v_winner.reward_cents, updated_at = now()
      WHERE user_id = v_winner.user_id
      RETURNING balance INTO v_new_balance;

    IF v_new_balance IS NOT NULL THEN
      INSERT INTO transactions (user_id, type, amount, balance_after, description)
      VALUES (
        v_winner.user_id,
        'liga_reward',
        v_winner.reward_cents,
        v_new_balance,
        'Liga-Top3: ' || v_winner.dimension || ' Rang ' || v_winner.rank
      );
      v_payouts := v_payouts + 1;
      v_total_paid := v_total_paid + v_winner.reward_cents;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'month', p_month,
    'winners_inserted', v_count,
    'payouts_credited', v_payouts,
    'total_paid_cents', v_total_paid
  );
END;
$function$;

-- REVOKE-Block (defensive)
REVOKE EXECUTE ON FUNCTION public.close_monthly_liga(date) FROM PUBLIC, anon, authenticated;
-- Nur service_role + cron kann triggern

COMMENT ON FUNCTION public.close_monthly_liga(date) IS
  'AR-54 (2026-04-15): Wallet-Payout hinzugefügt. Schließt 10.8M CR/Monat Gap.';
