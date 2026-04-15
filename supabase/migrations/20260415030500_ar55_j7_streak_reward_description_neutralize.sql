-- =============================================================================
-- AR-55 (J7, 2026-04-15) — Streak-Reward Description Wording (J3-Triple-Red-Flag)
--
-- PROBLEM:
--   record_login_streak body hat v_milestone_label mit '$SCOUT':
--     '3-Tage-Streak: 100 $SCOUT' etc.
--   Diese wird in transactions.description gespeichert + im Activity-Log
--   user-facing gerendert. Verstoss gegen business.md (keine $SCOUT-Ticker
--   user-facing) + Triple-Red-Flag (dynamischer Betrag im Text).
--
-- FIX:
--   Neutralisiere CASE-Statement: '3-Tage-Streak' / '7-Tage-Streak' etc.
--   ohne $SCOUT + ohne Zahl (Betrag ist in transactions.amount).
--   Frontend resolved Description via Regex / i18n wenn noetig.
--
-- Historische transactions bleiben — kein Audit-Trail-Modifikation.
-- =============================================================================

DO $$
DECLARE
  v_body TEXT;
  v_new_body TEXT;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_body
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='record_login_streak';

  IF v_body !~ '\$SCOUT' THEN
    RAISE NOTICE 'AR-55: record_login_streak bereits clean. Skipping.';
    RETURN;
  END IF;

  -- Ersetze jede CASE-Branch mit Zahl+$SCOUT durch neutrale Label
  v_new_body := regexp_replace(v_body, '''3-Tage-Streak: 100 \$SCOUT''', '''3-Tage-Streak''', 'g');
  v_new_body := regexp_replace(v_new_body, '''7-Tage-Streak: 500 \$SCOUT''', '''7-Tage-Streak''', 'g');
  v_new_body := regexp_replace(v_new_body, '''14-Tage-Streak: 2\.000 \$SCOUT''', '''14-Tage-Streak''', 'g');
  v_new_body := regexp_replace(v_new_body, '''30-Tage-Streak: 5\.000 \$SCOUT''', '''30-Tage-Streak''', 'g');

  EXECUTE v_new_body;
END $$;

-- REVOKE-Block defensiv erneuern.
REVOKE EXECUTE ON FUNCTION public.record_login_streak(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_login_streak(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_login_streak(uuid) TO authenticated;
