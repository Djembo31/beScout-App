-- Slice 383 (E-2b): Pro-Liga-Payout — BeScout-Saison Manager pro Liga
-- =====================================================================
-- close_monthly_liga zahlt ZUSÄTZLICH (CEO-Entscheid Anil 2026-06-25) zu den 4 globalen
-- Ranglisten je aktive Fußball-Liga die Manager-Top-3 aus — mit PRO LIGA EINZELN
-- konfigurierbaren Beträgen (Default 100k/50k/25k cents). Zero-sum aus dem Plattform-Topf
-- (Slice 376-Muster), EIN Debit deckt global + pro-Liga.
--
-- Leitsatz: "Was angezeigt wird, wird ausgezahlt." Pro-Liga-Ranking = EXAKT das
-- rpc_get_season_ranking-Aggregat (E-2a, Slice 381): SUM(lineups.total_score) über
-- liga-gebundene beendete Events, saison-kumulativ. Trader/Analyst bleiben global.
--
-- Source-of-truth für close_monthly_liga-Rewrite = LIVE pg_get_functiondef (D87, 2026-06-25),
-- NICHT eine Migrations-Datei. Erhaltene Bestandteile (PATCH-AUDIT S356):
--   - globale Konstanten 500000/250000/100000 (byte-identisch)
--   - overall = Median via (a+b+c)-GREATEST-LEAST (Slice 376)
--   - Idempotenz-Guard (month_already_closed), no_active_season
--   - Deckungs-Check inline unter Singleton-Row-Lock + RAISE insufficient_treasury (Slice 376)
--   - EIN book_platform_treasury('debit','monthly_liga', v_total_paid) nach dem Loop
-- Einzige Änderungen: (1) Pro-Liga-Manager-LOOP NACH dem globalen Block / VOR dem
-- Coverage-Check; (2) Payout-Loop selektiert league_id + verzweigt die Description.

-- =====================================================================
-- 1. CONFIG-TABELLE (Muster S347 club_fan_rank_thresholds: 1 Zeile/Liga, fehlend=Default)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.liga_reward_config (
  league_id   uuid PRIMARY KEY REFERENCES public.leagues(id) ON DELETE CASCADE,
  rank1_cents bigint NOT NULL DEFAULT 100000,
  rank2_cents bigint NOT NULL DEFAULT 50000,
  rank3_cents bigint NOT NULL DEFAULT 25000,
  updated_by  uuid REFERENCES public.profiles(id),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lrc_monotonic CHECK (
    rank1_cents >= 0 AND rank2_cents >= 0 AND rank3_cents >= 0
    AND rank1_cents >= rank2_cents AND rank2_cents >= rank3_cents
  )
);

COMMENT ON TABLE public.liga_reward_config IS
  'Slice 383 (E-2b): pro-Liga Reward-Beträge (cents) für den BeScout-Saison-Manager-Payout. Fehlende Zeile = Plattform-Default (100000/50000/25000). >=0 erlaubt Liga-Deaktivierung (0 = kein Payout). Writes NUR via set_liga_reward_config (SECURITY DEFINER, platform_admin-Gate).';

ALTER TABLE public.liga_reward_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lrc_select ON public.liga_reward_config;
CREATE POLICY lrc_select ON public.liga_reward_config
  FOR SELECT TO authenticated, anon USING (true);  -- nicht-sensibel (Reward-Beträge), keine PII

DROP POLICY IF EXISTS lrc_no_client_insert ON public.liga_reward_config;
CREATE POLICY lrc_no_client_insert ON public.liga_reward_config
  FOR INSERT TO authenticated, anon WITH CHECK (false);

DROP POLICY IF EXISTS lrc_no_client_update ON public.liga_reward_config;
CREATE POLICY lrc_no_client_update ON public.liga_reward_config
  FOR UPDATE TO authenticated, anon USING (false);

DROP POLICY IF EXISTS lrc_no_client_delete ON public.liga_reward_config;
CREATE POLICY lrc_no_client_delete ON public.liga_reward_config
  FOR DELETE TO authenticated, anon USING (false);

-- =====================================================================
-- 2. league_id auf Snapshots + Winners + UNIQUE-Rebuild (NULLS NOT DISTINCT, PG17)
--    Ohne league_id würden Pro-Liga-'manager'-Zeilen mit den globalen kollidieren.
--    NULLS NOT DISTINCT hält die globale (league_id NULL) Idempotenz exakt erhalten.
-- =====================================================================
ALTER TABLE public.monthly_liga_snapshots
  ADD COLUMN IF NOT EXISTS league_id uuid REFERENCES public.leagues(id) ON DELETE CASCADE;
ALTER TABLE public.monthly_liga_winners
  ADD COLUMN IF NOT EXISTS league_id uuid REFERENCES public.leagues(id) ON DELETE CASCADE;

ALTER TABLE public.monthly_liga_snapshots
  DROP CONSTRAINT IF EXISTS monthly_liga_snapshots_month_user_id_dimension_key;
ALTER TABLE public.monthly_liga_snapshots
  DROP CONSTRAINT IF EXISTS monthly_liga_snapshots_month_user_dim_league_key;
ALTER TABLE public.monthly_liga_snapshots
  ADD CONSTRAINT monthly_liga_snapshots_month_user_dim_league_key
  UNIQUE NULLS NOT DISTINCT (month, user_id, dimension, league_id);

ALTER TABLE public.monthly_liga_winners
  DROP CONSTRAINT IF EXISTS monthly_liga_winners_month_dimension_rank_key;
ALTER TABLE public.monthly_liga_winners
  DROP CONSTRAINT IF EXISTS monthly_liga_winners_month_dim_rank_league_key;
ALTER TABLE public.monthly_liga_winners
  ADD CONSTRAINT monthly_liga_winners_month_dim_rank_league_key
  UNIQUE NULLS NOT DISTINCT (month, dimension, rank, league_id);

-- =====================================================================
-- 3. HELPER (Frontend-Read + Default-Resolution) — Single Source der Defaults
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_liga_reward_config(p_league_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $function$
  SELECT jsonb_build_object(
    'rank1', COALESCE(c.rank1_cents, 100000),
    'rank2', COALESCE(c.rank2_cents, 50000),
    'rank3', COALESCE(c.rank3_cents, 25000)
  )
  FROM (SELECT p_league_id AS lid) b
  LEFT JOIN public.liga_reward_config c ON c.league_id = b.lid;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_liga_reward_config(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_liga_reward_config(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_liga_reward_config(uuid) TO authenticated;

-- =====================================================================
-- 4. WRITE-RPC (platform_admin-Gate, Muster update_fee_config_rpc) — Money-Config
-- =====================================================================
CREATE OR REPLACE FUNCTION public.set_liga_reward_config(
  p_league_id uuid,
  p_rank1_cents bigint,
  p_rank2_cents bigint,
  p_rank3_cents bigint
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  SELECT role INTO v_role FROM public.platform_admins WHERE user_id = v_uid;
  IF v_role IS NULL OR v_role NOT IN ('superadmin', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_platform_admin');
  END IF;

  -- Defense-in-Depth (spiegelt CHECK): >=0 + monoton fallend
  IF p_rank1_cents IS NULL OR p_rank2_cents IS NULL OR p_rank3_cents IS NULL
     OR p_rank1_cents < 0 OR p_rank2_cents < 0 OR p_rank3_cents < 0
     OR p_rank1_cents < p_rank2_cents OR p_rank2_cents < p_rank3_cents THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_reward_config');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.leagues WHERE id = p_league_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'league_not_found');
  END IF;

  INSERT INTO public.liga_reward_config (league_id, rank1_cents, rank2_cents, rank3_cents, updated_by, updated_at)
  VALUES (p_league_id, p_rank1_cents, p_rank2_cents, p_rank3_cents, v_uid, now())
  ON CONFLICT (league_id) DO UPDATE SET
    rank1_cents = EXCLUDED.rank1_cents,
    rank2_cents = EXCLUDED.rank2_cents,
    rank3_cents = EXCLUDED.rank3_cents,
    updated_by  = EXCLUDED.updated_by,
    updated_at  = EXCLUDED.updated_at;

  RETURN jsonb_build_object('success', true);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.set_liga_reward_config(uuid, bigint, bigint, bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_liga_reward_config(uuid, bigint, bigint, bigint) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_liga_reward_config(uuid, bigint, bigint, bigint) TO authenticated;

-- =====================================================================
-- 5. close_monthly_liga REWRITE (gegen LIVE-Baseline; additiver Pro-Liga-Block)
-- =====================================================================
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
  -- Slice 383 (E-2b): Pro-Liga-Manager-Payout
  v_league RECORD;
  v_cfg1 BIGINT;
  v_cfg2 BIGINT;
  v_cfg3 BIGINT;
  v_desc TEXT;
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
    WHERE ms.month = p_month AND ms.dimension = v_dim AND ms.league_id IS NULL AND ms.rank <= 3;

    GET DIAGNOSTICS v_count = ROW_COUNT;
  END LOOP;

  -- =================================================================
  -- Slice 383 (E-2b): Pro-Liga-Manager-Payout — ZUSÄTZLICH (CEO Anil 2026-06-25).
  -- VOR dem Coverage-Check, damit v_total_needed global + pro-Liga summiert.
  -- Ranking = EXAKT rpc_get_season_ranking-Aggregat (Display==Payout, E-2a/381).
  -- =================================================================
  FOR v_league IN SELECT id, short FROM leagues WHERE is_active = true LOOP
    -- Config dieser Liga (COALESCE auf Default — Single-Source mit get_liga_reward_config)
    SELECT COALESCE(c.rank1_cents, 100000), COALESCE(c.rank2_cents, 50000), COALESCE(c.rank3_cents, 25000)
      INTO v_cfg1, v_cfg2, v_cfg3
    FROM (SELECT v_league.id AS lid) b
    LEFT JOIN liga_reward_config c ON c.league_id = b.lid;

    -- Pro-Liga-Manager-Snapshot (saison-kumulativ über liga-gebundene beendete Events)
    INSERT INTO monthly_liga_snapshots (month, user_id, dimension, score_delta, final_score, rank, league_id)
    SELECT p_month, agg.user_id, 'manager',
           ROUND(agg.season_score)::int, ROUND(agg.season_score)::int,
           ROW_NUMBER() OVER (ORDER BY agg.season_score DESC, agg.event_count DESC, agg.user_id)::int,
           v_league.id
    FROM (
      SELECT l.user_id,
             COALESCE(SUM(l.total_score), 0)::numeric AS season_score,
             COUNT(*)::int AS event_count
      FROM lineups l
      JOIN events e ON e.id = l.event_id
      WHERE e.is_liga_event = true AND e.status = 'ended' AND e.league_id = v_league.id
      GROUP BY l.user_id
    ) agg;

    -- Winner top-3 mit Liga-Config-Beträgen (nur >0 → keine 0-Reward-Geisterzeilen)
    INSERT INTO monthly_liga_winners (month, dimension, user_id, rank, reward_cents, badge_key, league_id)
    SELECT p_month, 'manager', ms.user_id, ms.rank,
      CASE ms.rank WHEN 1 THEN v_cfg1 WHEN 2 THEN v_cfg2 WHEN 3 THEN v_cfg3 END,
      'monthly_winner_manager_' || COALESCE(v_league.short, 'liga') || '_' || ms.rank,
      v_league.id
    FROM monthly_liga_snapshots ms
    WHERE ms.month = p_month AND ms.dimension = 'manager' AND ms.league_id = v_league.id AND ms.rank <= 3
      AND (CASE ms.rank WHEN 1 THEN v_cfg1 WHEN 2 THEN v_cfg2 WHEN 3 THEN v_cfg3 END) > 0;
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

  -- Slice 383: Payout-Loop selektiert league_id + leagues.short → Description verzweigt
  -- (global = Bestand, pro-Liga = "BeScout-Saison <Liga> Manager Rang N").
  FOR v_winner IN
    SELECT w.user_id, w.dimension, w.rank, w.reward_cents, w.league_id, lg.short AS league_short
    FROM monthly_liga_winners w
    LEFT JOIN leagues lg ON lg.id = w.league_id
    WHERE w.month = p_month AND w.reward_cents IS NOT NULL AND w.reward_cents > 0
  LOOP
    UPDATE wallets SET balance = balance + v_winner.reward_cents, updated_at = now()
      WHERE user_id = v_winner.user_id
      RETURNING balance INTO v_new_balance;

    IF v_new_balance IS NOT NULL THEN
      IF v_winner.league_id IS NOT NULL THEN
        v_desc := 'BeScout-Saison ' || COALESCE(v_winner.league_short, 'Liga') || ' Manager Rang ' || v_winner.rank;
      ELSE
        v_desc := 'Liga-Top3: ' || v_winner.dimension || ' Rang ' || v_winner.rank;
      END IF;
      INSERT INTO transactions (user_id, type, amount, balance_after, description)
      VALUES (v_winner.user_id, 'liga_reward', v_winner.reward_cents, v_new_balance, v_desc);
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

-- close_monthly_liga Grants (AR-44 renew). Bestand: REVOKE anon, GRANT authenticated.
REVOKE EXECUTE ON FUNCTION public.close_monthly_liga(date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.close_monthly_liga(date) FROM anon;
GRANT EXECUTE ON FUNCTION public.close_monthly_liga(date) TO authenticated;

-- =====================================================================
-- 6. get_monthly_liga_winners — additiv league_id + league_name (Admin-Anzeige)
--    DROP nötig: CREATE OR REPLACE darf RETURNS-TABLE-Shape nicht erweitern.
-- =====================================================================
DROP FUNCTION IF EXISTS public.get_monthly_liga_winners(date, integer);
CREATE OR REPLACE FUNCTION public.get_monthly_liga_winners(p_month date DEFAULT NULL::date, p_limit integer DEFAULT 12)
 RETURNS TABLE(month date, dimension text, user_id uuid, rank integer, reward_cents bigint, badge_key text, handle text, display_name text, avatar_url text, league_id uuid, league_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT
    w.month, w.dimension, w.user_id, w.rank, w.reward_cents, w.badge_key,
    p.handle, p.display_name, p.avatar_url,
    w.league_id, lg.name AS league_name
  FROM monthly_liga_winners w
  JOIN profiles p ON p.id = w.user_id
  LEFT JOIN leagues lg ON lg.id = w.league_id
  WHERE (p_month IS NULL OR w.month = p_month)
  ORDER BY w.month DESC, (w.league_id IS NOT NULL), lg.name NULLS FIRST, w.dimension, w.rank
  LIMIT p_limit;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_monthly_liga_winners(date, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_monthly_liga_winners(date, integer) TO anon, authenticated;
