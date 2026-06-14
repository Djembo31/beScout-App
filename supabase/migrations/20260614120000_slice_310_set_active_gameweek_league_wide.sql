-- Slice 310 (Fantasy-#1) — set_active_gameweek wird LIGA-WEIT.
-- Source-of-truth: LIVE pg_get_functiondef('public.set_active_gameweek') (Vorgänger nur
--   in remote-Registry, kein committed Migration-File — PATCH-AUDIT gegen Live-Body:
--   admin_required + invalid_gameweek-Guards verifiziert preserved). Vorher: nur UPDATE clubs.
-- Problem: Admin-Set schrieb nur clubs.active_gameweek → leagues (= Fantasy-Lese-Wahrheit
--          via useLeagueActiveGameweek) driftete still. Cron synct beide (Slice 277),
--          der Admin-Pfad nicht.
-- Fix (Anil-Decision liga-weit, 2026-06-14): GW ist inhärent liga-weit → setze ALLE
--          Clubs der Liga + die leagues-Zeile atomar. Hält Invariante
--          clubs-MIN === clubs-MAX === leagues.active_gameweek.
-- Auth-Guard + Input-Validation (1–38) unverändert.

CREATE OR REPLACE FUNCTION public.set_active_gameweek(p_club_id uuid, p_gameweek integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_league_id uuid;
BEGIN
  -- Auth guard
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth_required: Nicht authentifiziert';
  END IF;

  -- Admin guard: must be club admin for this club
  IF NOT EXISTS (SELECT 1 FROM club_admins WHERE user_id = auth.uid() AND club_id = p_club_id) THEN
    RAISE EXCEPTION 'admin_required: Keine Berechtigung';
  END IF;

  -- Input validation
  IF p_gameweek < 1 OR p_gameweek > 38 THEN
    RAISE EXCEPTION 'invalid_gameweek: Spieltag muss zwischen 1 und 38 sein';
  END IF;

  -- Resolve the club's league
  SELECT league_id INTO v_league_id FROM clubs WHERE id = p_club_id;

  IF v_league_id IS NOT NULL THEN
    -- Slice 310: GW is league-wide. Set ALL clubs in the league + the league row
    -- atomically so leagues (the read-truth) and clubs never drift.
    UPDATE clubs SET active_gameweek = p_gameweek WHERE league_id = v_league_id;
    UPDATE leagues SET active_gameweek = p_gameweek, updated_at = now() WHERE id = v_league_id;
  ELSE
    -- Edge: club without a league → keep legacy per-club behavior.
    UPDATE clubs SET active_gameweek = p_gameweek WHERE id = p_club_id;
  END IF;
END;
$function$;

-- AR-44: CREATE OR REPLACE resets privileges → explicit REVOKE + GRANT.
REVOKE EXECUTE ON FUNCTION public.set_active_gameweek(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_active_gameweek(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_active_gameweek(uuid, integer) TO authenticated;
