-- Slice 428 — active_gameweek: leagues = SSOT (Expand-Phase, GW-Lifecycle-Per-Liga-Fork 2/3)
--
-- set_active_gameweek schreibt ab jetzt NUR leagues.active_gameweek (clubs-Write entfernt).
-- clubs.active_gameweek bleibt vorerst (frozen, unread) → DROP in 428b nach Vercel-Deploy-Verify
-- (Anil-Entscheid Expand/Contract, 2026-06-27).
--
-- Zusätzlich: Guard `> 38` → `> COALESCE(leagues.max_gameweeks, 38)` (BL/2BL/SL = 34).
-- league-less Club (0 live) → expliziter RAISE statt clubs-Fallback.
--
-- PATCH-AUDIT (S156): Baseline = Live pg_get_functiondef (Slice 310). Erhalten: auth.uid()-Guard,
-- club_admins-Guard, SECURITY DEFINER, search_path. Entfernt: beide UPDATE clubs. Geändert: Guard-Bound.
-- ACL (S368c): CREATE OR REPLACE erhält {authenticated, service_role}; REVOKE/GRANT-Block (AR-44) re-asserted.

CREATE OR REPLACE FUNCTION public.set_active_gameweek(p_club_id uuid, p_gameweek integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_league_id uuid;
  v_max_gw integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth_required: Nicht authentifiziert';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM club_admins WHERE user_id = auth.uid() AND club_id = p_club_id) THEN
    RAISE EXCEPTION 'admin_required: Keine Berechtigung';
  END IF;

  -- Slice 428: leagues.active_gameweek = Single Source of Truth.
  SELECT league_id INTO v_league_id FROM clubs WHERE id = p_club_id;
  IF v_league_id IS NULL THEN
    RAISE EXCEPTION 'no_league: Club hat keine Liga';
  END IF;

  -- Slice 428: Guard per-Liga-Max statt hart 38.
  SELECT max_gameweeks INTO v_max_gw FROM leagues WHERE id = v_league_id;
  IF p_gameweek < 1 OR p_gameweek > COALESCE(v_max_gw, 38) THEN
    RAISE EXCEPTION 'invalid_gameweek: Spieltag muss zwischen 1 und % sein', COALESCE(v_max_gw, 38);
  END IF;

  UPDATE leagues SET active_gameweek = p_gameweek, updated_at = now() WHERE id = v_league_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.set_active_gameweek(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_active_gameweek(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_active_gameweek(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_active_gameweek(uuid, integer) TO service_role;
