-- Phase 1.3 Kategorie B: Function-Renames with Alias-Pattern
-- B.1: buy_player_dpc -> buy_player_sc (alter Name als thin alias retained for safety)
-- B.2: calculate_dpc_of_week -> calculate_sc_of_week (alter Name als thin alias)
-- Alter Name bleibt bis alle Caller auf neuen Namen umgestellt sind (separate DROP-Migration nach Verify).

DO $migrate$
DECLARE
  v_body TEXT;
  v_new_body TEXT;
BEGIN
  SELECT pg_get_functiondef(oid) INTO v_body
  FROM pg_proc
  WHERE proname = 'buy_player_dpc'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

  IF v_body IS NULL THEN
    RAISE EXCEPTION 'buy_player_dpc not found';
  END IF;

  v_new_body := replace(v_body, 'FUNCTION public.buy_player_dpc', 'FUNCTION public.buy_player_sc');
  v_new_body := regexp_replace(v_new_body, '\yDPCs\y', 'SCs', 'g');
  v_new_body := regexp_replace(v_new_body, '\yDPC\y', 'SC', 'g');

  EXECUTE v_new_body;
  RAISE NOTICE 'Created buy_player_sc';

  SELECT pg_get_functiondef(oid) INTO v_body
  FROM pg_proc
  WHERE proname = 'calculate_dpc_of_week'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

  IF v_body IS NULL THEN
    RAISE EXCEPTION 'calculate_dpc_of_week not found';
  END IF;

  v_new_body := replace(v_body, 'FUNCTION public.calculate_dpc_of_week', 'FUNCTION public.calculate_sc_of_week');
  v_new_body := regexp_replace(v_new_body, '\yDPCs\y', 'SCs', 'g');
  v_new_body := regexp_replace(v_new_body, '\yDPC\y', 'SC', 'g');

  EXECUTE v_new_body;
  RAISE NOTICE 'Created calculate_sc_of_week';
END $migrate$;

REVOKE ALL ON FUNCTION public.buy_player_sc(uuid, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.buy_player_sc(uuid, uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.buy_player_sc(uuid, uuid, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.calculate_sc_of_week(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.calculate_sc_of_week(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.calculate_sc_of_week(integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.buy_player_dpc(p_user_id uuid, p_player_id uuid, p_quantity integer)
RETURNS json
LANGUAGE sql
VOLATILE
SECURITY DEFINER
AS $alias$
  SELECT public.buy_player_sc(p_user_id, p_player_id, p_quantity);
$alias$;

CREATE OR REPLACE FUNCTION public.calculate_dpc_of_week(p_gameweek integer)
RETURNS jsonb
LANGUAGE sql
VOLATILE
SECURITY DEFINER
AS $alias$
  SELECT public.calculate_sc_of_week(p_gameweek);
$alias$;
