-- =============================================================================
-- AR-55 (J8, 2026-04-15) — Rate-Limit Config-Tier (inline per abo_tier)
--
-- PROBLEM (post-Beta, Anil priorisiert):
--   place_sell_order hat hardcoded `v_recent_orders >= 10` (10/h pro Player).
--   buy_player_sc hat hardcoded `v_recent_trades >= 20` (20/24h pro Player).
--   Veteranen die Bulk-Listing machen werden gebremst. Club-Subscribers bekommen
--   trotz bezahltem Tier keine Erleichterung.
--
-- FIX (minimal-invasive, inline):
--   Tier-based CASE-Expression vor dem Rate-Limit-Check:
--     gold    → 100 sells/h, 200 trades/24h
--     silber  →  20 sells/h,  50 trades/24h
--     bronze  →  15 sells/h,  30 trades/24h
--     free    →  10 sells/h,  20 trades/24h  (unverändert)
--
--   Tier kommt aus existing `club_subscriptions.tier` (active+not-expired).
--   Keine neue Tabelle, keine Config-Change via Admin-Panel (für Beta ausreichend).
-- =============================================================================

-- PLACE_SELL_ORDER Update (regex-replace limit + add tier-lookup)
DO $$
DECLARE
  v_body TEXT;
  v_new_body TEXT;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_body
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='place_sell_order';

  IF v_body !~ 'v_recent_orders >= 10' THEN
    RAISE NOTICE 'AR-55: place_sell_order bereits tier-based. Skipping.';
    RETURN;
  END IF;

  -- Ersetze `v_recent_orders >= 10` → `v_recent_orders >= v_sell_limit`
  -- Injiziere tier-lookup direkt vor dem IF via sed-style replace
  v_new_body := replace(
    v_body,
    'v_recent_orders >= 10',
    'v_recent_orders >= COALESCE(
      (SELECT CASE tier WHEN ''gold'' THEN 100 WHEN ''silber'' THEN 20 WHEN ''bronze'' THEN 15 ELSE 10 END
       FROM club_subscriptions WHERE user_id = p_user_id AND status = ''active'' AND expires_at > now()
       ORDER BY CASE tier WHEN ''gold'' THEN 3 WHEN ''silber'' THEN 2 WHEN ''bronze'' THEN 1 END DESC LIMIT 1),
      10)'
  );

  EXECUTE v_new_body;
END $$;

-- BUY_PLAYER_SC Update (same pattern, 20 → tier)
DO $$
DECLARE
  v_body TEXT;
  v_new_body TEXT;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_body
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='buy_player_sc';

  IF v_body !~ 'v_recent_trades >= 20' THEN
    RAISE NOTICE 'AR-55: buy_player_sc bereits tier-based. Skipping.';
    RETURN;
  END IF;

  v_new_body := replace(
    v_body,
    'v_recent_trades >= 20',
    'v_recent_trades >= COALESCE(
      (SELECT CASE tier WHEN ''gold'' THEN 200 WHEN ''silber'' THEN 50 WHEN ''bronze'' THEN 30 ELSE 20 END
       FROM club_subscriptions WHERE user_id = p_user_id AND status = ''active'' AND expires_at > now()
       ORDER BY CASE tier WHEN ''gold'' THEN 3 WHEN ''silber'' THEN 2 WHEN ''bronze'' THEN 1 END DESC LIMIT 1),
      20)'
  );

  EXECUTE v_new_body;
END $$;

-- REVOKE-Block defensiv erneuern
DO $$
DECLARE
  v_sell_args TEXT;
  v_buy_args TEXT;
BEGIN
  SELECT pg_get_function_identity_arguments(p.oid) INTO v_sell_args
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='place_sell_order';

  SELECT pg_get_function_identity_arguments(p.oid) INTO v_buy_args
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='buy_player_sc';

  EXECUTE format('REVOKE EXECUTE ON FUNCTION public.place_sell_order(%s) FROM PUBLIC, anon', v_sell_args);
  EXECUTE format('GRANT EXECUTE ON FUNCTION public.place_sell_order(%s) TO authenticated', v_sell_args);
  EXECUTE format('REVOKE EXECUTE ON FUNCTION public.buy_player_sc(%s) FROM PUBLIC, anon', v_buy_args);
  EXECUTE format('GRANT EXECUTE ON FUNCTION public.buy_player_sc(%s) TO authenticated', v_buy_args);
END $$;
