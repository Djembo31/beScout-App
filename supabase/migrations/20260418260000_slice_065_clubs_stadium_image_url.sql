-- Slice 065 — Stadium-Image-Fix: clubs.stadium_image_url + RPC-Update
-- User-Bug: "Club-Page zeigt nicht eigenes Stadion"
-- Root-Cause: ClubHero.tsx fiel auf /stadiums/default.jpg zurueck weil nur 58/134
--             Clubs lokale Image-Assets hatten.
-- Fix: clubs.stadium_image_url Column als optional Override. ClubHero Fallback-Chain:
--   1. clubs.stadium_image_url (admin-uploadable, Future-Slice)
--   2. /stadiums/{slug}.jpg (legacy local assets)
--   3. /stadiums/default.jpg (final fallback)

ALTER TABLE clubs
  ADD COLUMN IF NOT EXISTS stadium_image_url text;

COMMENT ON COLUMN clubs.stadium_image_url IS
  'Slice 065: Optional explicit URL fuer Stadium-Hero-Image. Wenn NULL, fallback auf /stadiums/{slug}.jpg.';

-- RPC ergaenzen um stadium_image_url in Response
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
  IF NOT FOUND THEN RETURN NULL; END IF;

  v_result := jsonb_build_object(
    'id', v_club.id,
    'slug', v_club.slug,
    'name', v_club.name,
    'short', v_club.short,
    'league', v_club.league,
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

COMMENT ON FUNCTION public.get_club_by_slug(text, uuid) IS
  'Slice 065: erweitert um stadium_image_url fuer Hero-Image-Fallback-Chain.';
