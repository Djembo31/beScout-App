-- Slice 326 Wave A — Writer-Fix: create_club_by_platform_admin nimmt p_league_id (UUID) statt p_league (Name).
-- league_id ist die Wahrheit. clubs.league (String, NOT NULL bis Wave-B-DROP) wird via id→name befüllt.
-- fail-closed: unbekannte/fehlende league_id → klarer Error statt FK-Violation (Hermes Preflight Punkt 5).
-- Source-of-truth Vorgänger: Slice 325 (create_club setzt league_id via name-Lookup) — hier invertiert.
-- AR-44: CREATE OR REPLACE resettet Privilegien → explizites REVOKE/GRANT am Ende.

-- Alte Signatur (p_league text) droppen, sonst pg_proc-Overload-Ambiguity.
DROP FUNCTION IF EXISTS public.create_club_by_platform_admin(uuid, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.create_club_by_platform_admin(
  p_admin_id uuid,
  p_name text,
  p_slug text,
  p_short text,
  p_league_id uuid,
  p_country text,
  p_city text DEFAULT NULL::text,
  p_plan text DEFAULT 'baslangic'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_club_id UUID;
  v_league_name TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM platform_admins WHERE user_id = p_admin_id AND role IN ('superadmin', 'admin')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Keine Berechtigung. Nur Platform-Admins dürfen Clubs erstellen.');
  END IF;

  IF p_name IS NULL OR length(trim(p_name)) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Club-Name muss mindestens 2 Zeichen lang sein.');
  END IF;
  IF p_slug IS NULL OR length(trim(p_slug)) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slug muss mindestens 2 Zeichen lang sein.');
  END IF;
  IF p_short IS NULL OR length(trim(p_short)) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kürzel muss mindestens 2 Zeichen lang sein.');
  END IF;

  -- fail-closed: Liga muss existieren. v_league_name befüllt zugleich die Legacy-String-Spalte.
  SELECT name INTO v_league_name FROM leagues WHERE id = p_league_id;
  IF v_league_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unbekannte Liga.');
  END IF;

  IF EXISTS (SELECT 1 FROM clubs WHERE slug = lower(trim(p_slug))) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slug "' || p_slug || '" ist bereits vergeben.');
  END IF;

  INSERT INTO clubs (name, slug, short, league, league_id, country, city, plan, is_verified)
  VALUES (
    trim(p_name), lower(trim(p_slug)), upper(trim(p_short)),
    v_league_name, p_league_id,
    trim(p_country), trim(p_city), p_plan, false
  )
  RETURNING id INTO v_club_id;

  INSERT INTO fee_config (club_id, club_name, trade_fee_bps, trade_platform_bps, trade_pbt_bps, trade_club_bps, ipo_club_bps, ipo_platform_bps, ipo_pbt_bps, updated_by)
  VALUES (v_club_id, trim(p_name), 600, 350, 150, 100, 7000, 2000, 1000, p_admin_id);

  RETURN jsonb_build_object('success', true, 'club_id', v_club_id, 'slug', lower(trim(p_slug)));
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_club_by_platform_admin(uuid, text, text, text, uuid, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_club_by_platform_admin(uuid, text, text, text, uuid, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_club_by_platform_admin(uuid, text, text, text, uuid, text, text, text) TO authenticated;
