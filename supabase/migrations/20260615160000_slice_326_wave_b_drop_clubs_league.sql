-- Slice 326 Wave B — DROP clubs.league (String-Spalte). league_id (UUID) ist die einzige Wahrheit.
-- Atomar: erst die 3 RPCs umstellen die clubs.league lesen/schreiben, dann league_id NOT NULL härten,
-- dann DROP COLUMN. Alles in einer TX (apply_migration), damit kein Zwischenzustand entsteht
-- (create_club ohne league-INSERT + NOT-NULL-league-Spalte wären inkonsistent).
-- Pre-DROP verifiziert: 134 Clubs, 0 NULL league_id; 0 Views/Trigger/Constraints auf league-Spalte.
-- src-Reader (clubs.ts Cache, club.ts Services) bereits auf getLeagueById(league_id).name abgeleitet + live-verifiziert.

-- ── 1. create_club_by_platform_admin: INSERT ohne league-String-Spalte ──────────────
-- (gleiche Signatur p_league_id uuid wie Wave A; v_league_name bleibt nur für fail-closed-Validierung)
CREATE OR REPLACE FUNCTION public.create_club_by_platform_admin(
  p_admin_id uuid, p_name text, p_slug text, p_short text,
  p_league_id uuid, p_country text, p_city text DEFAULT NULL::text, p_plan text DEFAULT 'baslangic'::text
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

  -- fail-closed: Liga muss existieren (FK + explizite Prüfung).
  SELECT name INTO v_league_name FROM leagues WHERE id = p_league_id;
  IF v_league_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unbekannte Liga.');
  END IF;

  IF EXISTS (SELECT 1 FROM clubs WHERE slug = lower(trim(p_slug))) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slug "' || p_slug || '" ist bereits vergeben.');
  END IF;

  INSERT INTO clubs (name, slug, short, league_id, country, city, plan, is_verified)
  VALUES (
    trim(p_name), lower(trim(p_slug)), upper(trim(p_short)),
    p_league_id,
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

-- ── 2. get_club_by_slug: league-Name via leagues-Lookup statt clubs.league ───────────
CREATE OR REPLACE FUNCTION public.get_club_by_slug(p_slug text, p_user_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_club RECORD;
  v_admin RECORD;
  v_result JSONB;
BEGIN
  SELECT * INTO v_club FROM clubs WHERE slug = p_slug;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_result := jsonb_build_object(
    'id', v_club.id,
    'slug', v_club.slug,
    'name', v_club.name,
    'short', v_club.short,
    'league', (SELECT name FROM leagues WHERE id = v_club.league_id),
    'league_id', v_club.league_id,
    'country', v_club.country,
    'city', v_club.city,
    'stadium', v_club.stadium,
    'stadium_image_url', v_club.stadium_image_url,
    'logo_url', v_club.logo_url,
    'primary_color', v_club.primary_color,
    'secondary_color', v_club.secondary_color,
    'community_guidelines', v_club.community_guidelines,
    'plan', v_club.plan,
    'is_verified', v_club.is_verified,
    'created_at', v_club.created_at,
    'is_admin', false,
    'admin_role', NULL
  );

  IF p_user_id IS NOT NULL THEN
    SELECT * INTO v_admin FROM club_admins
    WHERE club_id = v_club.id AND user_id = p_user_id;
    IF FOUND THEN
      v_result := v_result || jsonb_build_object(
        'is_admin', true,
        'admin_role', v_admin.role
      );
    END IF;
  END IF;

  RETURN v_result;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_club_by_slug(text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_club_by_slug(text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_club_by_slug(text, uuid) TO authenticated;

-- ── 3. get_player_data_completeness: Liga-Gruppierung via leagues-Join ───────────────
CREATE OR REPLACE FUNCTION public.get_player_data_completeness()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  WITH categorized AS (
    SELECT
      l.name AS league,
      p.id AS player_id,
      (p.shirt_number IS NOT NULL) AS is_stammkader,
      (p.nationality IS NOT NULL AND p.nationality <> '') AS has_nationality,
      (p.image_url IS NOT NULL AND p.image_url <> '') AS has_photo,
      (p.market_value_eur IS NOT NULL AND p.market_value_eur > 0) AS has_market_value,
      (p.contract_end IS NOT NULL) AS has_contract_end,
      (p.api_football_id IS NOT NULL) AS has_api_mapping,
      (p.age IS NOT NULL) AS has_age,
      (p.shirt_number IS NOT NULL) AS has_shirt_number
    FROM players p
    JOIN clubs c ON c.id = p.club_id
    JOIN leagues l ON l.id = c.league_id
  ),
  per_liga AS (
    SELECT
      league,
      COUNT(*) FILTER (WHERE is_stammkader) AS stamm_total,
      COUNT(*) FILTER (WHERE is_stammkader AND has_nationality) AS stamm_nat,
      COUNT(*) FILTER (WHERE is_stammkader AND has_photo) AS stamm_photo,
      COUNT(*) FILTER (WHERE is_stammkader AND has_market_value) AS stamm_mv,
      COUNT(*) FILTER (WHERE is_stammkader AND has_contract_end) AS stamm_contract,
      COUNT(*) FILTER (WHERE is_stammkader AND has_api_mapping) AS stamm_api,
      COUNT(*) FILTER (WHERE is_stammkader AND has_age) AS stamm_age,
      COUNT(*) FILTER (WHERE NOT is_stammkader) AS youth_total,
      COUNT(*) AS league_total
    FROM categorized
    GROUP BY league
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'league', league,
      'league_total', league_total,
      'stammkader', jsonb_build_object(
        'total', stamm_total,
        'nationality_pct', CASE WHEN stamm_total > 0 THEN ROUND((stamm_nat::NUMERIC / stamm_total) * 100, 1) ELSE 0 END,
        'photo_pct', CASE WHEN stamm_total > 0 THEN ROUND((stamm_photo::NUMERIC / stamm_total) * 100, 1) ELSE 0 END,
        'market_value_pct', CASE WHEN stamm_total > 0 THEN ROUND((stamm_mv::NUMERIC / stamm_total) * 100, 1) ELSE 0 END,
        'contract_pct', CASE WHEN stamm_total > 0 THEN ROUND((stamm_contract::NUMERIC / stamm_total) * 100, 1) ELSE 0 END,
        'api_mapping_pct', CASE WHEN stamm_total > 0 THEN ROUND((stamm_api::NUMERIC / stamm_total) * 100, 1) ELSE 0 END,
        'age_pct', CASE WHEN stamm_total > 0 THEN ROUND((stamm_age::NUMERIC / stamm_total) * 100, 1) ELSE 0 END,
        'gold_tier', (
          stamm_total > 0
          AND stamm_nat::NUMERIC / stamm_total >= 0.999
          AND stamm_photo::NUMERIC / stamm_total >= 0.999
          AND stamm_mv::NUMERIC / stamm_total >= 0.999
          AND stamm_contract::NUMERIC / stamm_total >= 0.999
          AND stamm_api::NUMERIC / stamm_total >= 0.999
        )
      ),
      'youth_reserve_total', youth_total
    )
    ORDER BY league
  ) INTO v_result
  FROM per_liga;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_player_data_completeness() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_player_data_completeness() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_player_data_completeness() TO authenticated;

-- ── 4. league_id NOT NULL härten (alle 134 Clubs haben es) + DROP league-String ─────
ALTER TABLE public.clubs ALTER COLUMN league_id SET NOT NULL;
ALTER TABLE public.clubs DROP COLUMN league;
