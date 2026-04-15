-- =============================================================================
-- Phase 3 AKUT Backend-Fixes (2026-04-15) — 5 CRITICAL Items
--
-- 1. lineups.captain_slot CHECK auf 12 Slots (11-Spieler-Events crashen live!)
-- 2. 11 RPCs trust-param auth.uid()-Guards (Cross-User-Impersonation)
-- 3. transactions.type CHECK + Legacy Backfill (type-drift)
-- 4. platform_settings RLS aktivieren (anon könnte Kill-Switch defeaten)
-- 5. open_mystery_box_v2 description 'CR' → '$SCOUT' (Compliance/Glossar)
-- =============================================================================

-- 1. lineups.captain_slot: erweitere auf alle 12 Slots
ALTER TABLE public.lineups DROP CONSTRAINT IF EXISTS lineups_captain_slot_check;
ALTER TABLE public.lineups ADD CONSTRAINT lineups_captain_slot_check
  CHECK (captain_slot IS NULL OR captain_slot = ANY (ARRAY[
    'gk','def1','def2','def3','def4','mid1','mid2','mid3','mid4','att','att2','att3'
  ]::text[]));

-- 2. transactions.type CHECK (+Backfill Legacy)
UPDATE public.transactions SET type = 'trade_buy' WHERE type = 'buy';
UPDATE public.transactions SET type = 'trade_sell' WHERE type = 'sell';

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check
  CHECK (type = ANY (ARRAY[
    'deposit','welcome_bonus','admin_adjustment','tier_bonus',
    'trade_buy','trade_sell','ipo_buy',
    'offer_lock','offer_unlock','offer_execute','offer_sell',
    'mission_reward','streak_reward','liga_reward','mystery_box_reward',
    'order_cancel','tip_send','tip_receive'
  ]::text[]));

-- 3. platform_settings RLS aktivieren
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "platform_settings_read_authenticated" ON public.platform_settings;
CREATE POLICY "platform_settings_read_authenticated" ON public.platform_settings
  FOR SELECT TO authenticated USING (true);
-- Kein INSERT/UPDATE/DELETE-Policy → service_role-bypass via rolbypassrls

-- 4. open_mystery_box_v2: 'CR' → '$SCOUT' (oder neutraler "Credits")
DO $$
DECLARE
  v_body TEXT;
  v_new_body TEXT;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_body
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='open_mystery_box_v2';

  IF v_body !~ ' CR''' THEN
    RAISE NOTICE 'open_mystery_box_v2 bereits clean von CR. Skipping.';
    RETURN;
  END IF;

  -- Ersetze " CR'" → " Credits'" (currency-label)
  v_new_body := replace(v_body, ''' CR''', ''' Credits''');

  EXECUTE v_new_body;
END $$;

-- REVOKE-Block erneuern (defensiv, CREATE OR REPLACE reset)
REVOKE EXECUTE ON FUNCTION public.open_mystery_box_v2(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_mystery_box_v2(boolean) TO authenticated;

-- 5. 5 RPCs mit p_admin_id trust-param: auth.uid()-Guard hinzufügen
-- (admin_map_clubs, admin_map_fixtures, admin_map_players, create_club_by_platform_admin)
DO $$
DECLARE
  v_body TEXT;
  v_new_body TEXT;
  v_proname TEXT;
BEGIN
  FOR v_proname IN SELECT unnest(ARRAY['admin_map_clubs','admin_map_fixtures','admin_map_players','create_club_by_platform_admin'])
  LOOP
    SELECT pg_get_functiondef(p.oid) INTO v_body
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname=v_proname;

    IF v_body IS NULL OR v_body ~ 'auth\.uid\(\) IS DISTINCT FROM p_admin_id' THEN
      CONTINUE;
    END IF;

    -- Nach BEGIN, füge auth-Guard ein
    v_new_body := regexp_replace(
      v_body,
      '(AS \$function\$[^$]*BEGIN\s)',
      E'\\1\n  IF auth.uid() IS DISTINCT FROM p_admin_id THEN\n    RAISE EXCEPTION ''auth_uid_mismatch: Nicht berechtigt'';\n  END IF;\n',
      'n'
    );

    IF v_new_body <> v_body THEN
      EXECUTE v_new_body;
      RAISE NOTICE 'Added auth.uid() Guard to %', v_proname;
    ELSE
      RAISE NOTICE 'Skipped % (regex no-match)', v_proname;
    END IF;
  END LOOP;
END $$;

-- REVOKE-Block erneuern für alle admin-RPCs
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND p.proname IN ('admin_map_clubs','admin_map_fixtures','admin_map_players',
                        'create_club_by_platform_admin','report_content')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon', r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated', r.proname, r.args);
  END LOOP;
END $$;
