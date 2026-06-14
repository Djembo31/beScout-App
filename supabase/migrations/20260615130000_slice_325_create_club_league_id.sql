-- Slice 325 — create_club_by_platform_admin setzt league_id (S7 Phase-3 Paar B, Drift-Stop)
-- Problem: RPC INSERTete nur clubs.league (String), NICHT league_id → neue Admin-Clubs = league_id NULL
--          = latente Drift-Quelle (player.league wird aus league_id abgeleitet → undefined).
-- Fix: league_id zusätzlich aus leagues.name = trim(p_league) auflösen. String bleibt (Slice 326 droppt).
-- Source-of-truth: live pg_get_functiondef 2026-06-15. CREATE OR REPLACE (Signatur unverändert).

CREATE OR REPLACE FUNCTION public.create_club_by_platform_admin(
  p_admin_id uuid, p_name text, p_slug text, p_short text, p_league text, p_country text,
  p_city text DEFAULT NULL::text, p_plan text DEFAULT 'baslangic'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_club_id UUID;
BEGIN
  -- Verify platform admin
  IF NOT EXISTS (SELECT 1 FROM platform_admins WHERE user_id = p_admin_id AND role IN ('superadmin', 'admin')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Keine Berechtigung. Nur Platform-Admins dürfen Clubs erstellen.');
  END IF;

  -- Validate inputs
  IF p_name IS NULL OR length(trim(p_name)) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Club-Name muss mindestens 2 Zeichen lang sein.');
  END IF;
  IF p_slug IS NULL OR length(trim(p_slug)) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slug muss mindestens 2 Zeichen lang sein.');
  END IF;
  IF p_short IS NULL OR length(trim(p_short)) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kürzel muss mindestens 2 Zeichen lang sein.');
  END IF;

  -- Check slug uniqueness
  IF EXISTS (SELECT 1 FROM clubs WHERE slug = lower(trim(p_slug))) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slug "' || p_slug || '" ist bereits vergeben.');
  END IF;

  -- Create club — Slice 325: league_id zusätzlich aus leagues.name auflösen (Drift-Stop)
  INSERT INTO clubs (name, slug, short, league, league_id, country, city, plan, is_verified)
  VALUES (
    trim(p_name), lower(trim(p_slug)), upper(trim(p_short)),
    trim(p_league),
    (SELECT id FROM leagues WHERE name = trim(p_league) LIMIT 1),
    trim(p_country), trim(p_city), p_plan, false
  )
  RETURNING id INTO v_club_id;

  -- Create default fee_config for the club
  INSERT INTO fee_config (club_id, club_name, trade_fee_bps, trade_platform_bps, trade_pbt_bps, trade_club_bps, ipo_club_bps, ipo_platform_bps, ipo_pbt_bps, updated_by)
  VALUES (v_club_id, trim(p_name), 600, 350, 150, 100, 7000, 2000, 1000, p_admin_id);

  RETURN jsonb_build_object(
    'success', true,
    'club_id', v_club_id,
    'slug', lower(trim(p_slug))
  );
END;
$function$;

-- AR-44: CREATE OR REPLACE resettet Privilegien → explizit REVOKE + GRANT.
REVOKE EXECUTE ON FUNCTION public.create_club_by_platform_admin(uuid, text, text, text, text, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_club_by_platform_admin(uuid, text, text, text, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_club_by_platform_admin(uuid, text, text, text, text, text, text, text) TO authenticated;
