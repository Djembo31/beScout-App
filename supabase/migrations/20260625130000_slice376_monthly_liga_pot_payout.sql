-- Slice 376 — Monats-Liga e2e: Payout aus dem Plattform-Topf (E3 RAUS-Kanal #1)
-- (A) source-CHECK um 'genesis' widern  (B) Genesis-Seed 500.000 Credits  (C) close_monthly_liga: debit-from-pot + Coverage + overall-Median
-- Applied via mcp__supabase__apply_migration 2026-06-25 (project skzjfhvgccaeplydsunz). Force-Rollback-Smoke: worklog/proofs/376-money-smoke.txt.

-- ============================================================
-- (A) source-CHECK widern (additiv, bricht keine Zeile)
-- ============================================================
ALTER TABLE public.platform_treasury_ledger DROP CONSTRAINT platform_treasury_ledger_source_check;
ALTER TABLE public.platform_treasury_ledger ADD CONSTRAINT platform_treasury_ledger_source_check
  CHECK (source = ANY (ARRAY['trading','ipo','poll','research','bounty','p2p','monthly_liga','bescout_event','genesis']));

-- ============================================================
-- (B) Genesis-Seed: einmalig 500.000 Credits = 50.000.000 cents (idempotent)
-- ============================================================
DO $seed$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.platform_treasury_ledger WHERE source = 'genesis') THEN
    PERFORM public.book_platform_treasury('credit', 'genesis', 50000000, NULL, 'Genesis-Anschub Liga-Topf (Slice 376)');
  END IF;
END
$seed$;

-- ============================================================
-- (C) close_monthly_liga: Payout aus Topf statt Minten + Deckungs-Check + overall-Median
-- ============================================================
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
  v_total_needed BIGINT := 0;
  v_pot BIGINT := 0;
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
      -- Slice 376: overall = MEDIAN der 3 Deltas/Scores (vorher fälschlich [2]=manager).
      -- Median von 3 Werten = (a+b+c) - GREATEST(a,b,c) - LEAST(a,b,c) (exakt, ties-safe).
      INSERT INTO monthly_liga_snapshots (month, user_id, dimension, score_delta, final_score, rank)
      SELECT
        p_month, s.user_id, 'overall',
        ((s.trader_score - s.season_start_trader) + (s.manager_score - s.season_start_manager) + (s.analyst_score - s.season_start_analyst))
          - GREATEST(s.trader_score - s.season_start_trader, s.manager_score - s.season_start_manager, s.analyst_score - s.season_start_analyst)
          - LEAST(s.trader_score - s.season_start_trader, s.manager_score - s.season_start_manager, s.analyst_score - s.season_start_analyst) AS score_delta,
        (s.trader_score + s.manager_score + s.analyst_score)
          - GREATEST(s.trader_score, s.manager_score, s.analyst_score)
          - LEAST(s.trader_score, s.manager_score, s.analyst_score) AS final_score,
        ROW_NUMBER() OVER (ORDER BY (
          ((s.trader_score - s.season_start_trader) + (s.manager_score - s.season_start_manager) + (s.analyst_score - s.season_start_analyst))
            - GREATEST(s.trader_score - s.season_start_trader, s.manager_score - s.season_start_manager, s.analyst_score - s.season_start_analyst)
            - LEAST(s.trader_score - s.season_start_trader, s.manager_score - s.season_start_manager, s.analyst_score - s.season_start_analyst)
        ) DESC)::INTEGER
      FROM scout_scores s;
    ELSE
      INSERT INTO monthly_liga_snapshots (month, user_id, dimension, score_delta, final_score, rank)
      SELECT
        p_month, s.user_id, v_dim,
        CASE v_dim WHEN 'trader' THEN s.trader_score - s.season_start_trader WHEN 'manager' THEN s.manager_score - s.season_start_manager WHEN 'analyst' THEN s.analyst_score - s.season_start_analyst END AS score_delta,
        CASE v_dim WHEN 'trader' THEN s.trader_score WHEN 'manager' THEN s.manager_score WHEN 'analyst' THEN s.analyst_score END AS final_score,
        ROW_NUMBER() OVER (ORDER BY CASE v_dim WHEN 'trader' THEN s.trader_score - s.season_start_trader WHEN 'manager' THEN s.manager_score - s.season_start_manager WHEN 'analyst' THEN s.analyst_score - s.season_start_analyst END DESC)::INTEGER
      FROM scout_scores s;
    END IF;

    INSERT INTO monthly_liga_winners (month, dimension, user_id, rank, reward_cents, badge_key)
    SELECT p_month, v_dim, ms.user_id, ms.rank,
      CASE ms.rank WHEN 1 THEN v_reward_1 WHEN 2 THEN v_reward_2 WHEN 3 THEN v_reward_3 END,
      'monthly_winner_' || v_dim || '_' || ms.rank
    FROM monthly_liga_snapshots ms
    WHERE ms.month = p_month AND ms.dimension = v_dim AND ms.rank <= 3;

    GET DIAGNOSTICS v_count = ROW_COUNT;
  END LOOP;

  -- Slice 376: Deckungs-Check gegen Plattform-Topf (RAUS-Kanal, zero-sum statt Minten).
  -- book_platform_treasury schützt NICHT gegen Negativ-Saldo → Coverage hier, inline, race-frei unter Singleton-Row-Lock.
  PERFORM 1 FROM platform_treasury WHERE id = true FOR UPDATE;
  SELECT COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END), 0)
    INTO v_pot FROM platform_treasury_ledger;

  SELECT COALESCE(SUM(reward_cents), 0) INTO v_total_needed
    FROM monthly_liga_winners
    WHERE month = p_month AND reward_cents IS NOT NULL AND reward_cents > 0;

  IF v_pot < v_total_needed THEN
    -- RAISE (kein RETURN): rollt die Snapshot/Winner-Inserts atomar zurück → Monat bleibt retry-bar (Idempotenz erhalten).
    RAISE EXCEPTION 'insufficient_treasury: Topf % cents < benoetigt % cents (Monat %)', v_pot, v_total_needed, p_month;
  END IF;

  FOR v_winner IN
    SELECT user_id, dimension, rank, reward_cents
    FROM monthly_liga_winners
    WHERE month = p_month AND reward_cents IS NOT NULL AND reward_cents > 0
  LOOP
    UPDATE wallets SET balance = balance + v_winner.reward_cents, updated_at = now()
      WHERE user_id = v_winner.user_id
      RETURNING balance INTO v_new_balance;

    IF v_new_balance IS NOT NULL THEN
      INSERT INTO transactions (user_id, type, amount, balance_after, description)
      VALUES (v_winner.user_id, 'liga_reward', v_winner.reward_cents, v_new_balance,
              'Liga-Top3: ' || v_winner.dimension || ' Rang ' || v_winner.rank);
      v_payouts := v_payouts + 1;
      v_total_paid := v_total_paid + v_winner.reward_cents;
    END IF;
  END LOOP;

  -- Slice 376: EINE Debit-Buchung aus dem Topf für das tatsächlich Ausgezahlte (≤ needed ≤ pot → nie negativ).
  IF v_total_paid > 0 THEN
    PERFORM book_platform_treasury('debit', 'monthly_liga', v_total_paid, NULL, 'Monats-Liga Payout ' || p_month);
  END IF;

  RETURN jsonb_build_object('ok', true, 'month', p_month, 'winners_inserted', v_count, 'payouts_credited', v_payouts, 'total_paid_cents', v_total_paid);
END;
$function$;
