-- Slice 067 — Admin-RPC fuer Club-Asset-Overrides
-- Erlaubt Club-Owner/Admin ueber Settings-Tab das Stadium-Image + Logo zu
-- ueberschreiben. Fuer die 76 Clubs ohne lokales Stadium-Asset und fuer
-- manuelle Logo-Korrekturen.
--
-- Security: AR-44-Guard auf p_admin_id + Club-Admin-Check (owner/admin).
-- Validation: URL muss mit http(s):// beginnen.
-- NULL = nicht aendern, '' = explicit clear (nur fuer stadium_image_url).

CREATE OR REPLACE FUNCTION public.update_club_assets(
  p_admin_id uuid,
  p_club_id uuid,
  p_stadium_image_url text DEFAULT NULL,
  p_logo_url text DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role TEXT;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_admin_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  SELECT role INTO v_role FROM club_admins
  WHERE club_id = p_club_id AND user_id = p_admin_id;

  IF v_role IS NULL OR v_role NOT IN ('owner', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nur Club-Admins koennen Assets anpassen');
  END IF;

  IF p_stadium_image_url IS NOT NULL AND p_stadium_image_url <> ''
     AND p_stadium_image_url !~ '^https?://' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stadium-Image-URL muss mit http(s):// beginnen');
  END IF;
  IF p_logo_url IS NOT NULL AND p_logo_url <> ''
     AND p_logo_url !~ '^https?://' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Logo-URL muss mit http(s):// beginnen');
  END IF;

  UPDATE clubs SET
    stadium_image_url = CASE
      WHEN p_stadium_image_url IS NULL THEN stadium_image_url
      WHEN p_stadium_image_url = '' THEN NULL
      ELSE p_stadium_image_url
    END,
    logo_url = CASE
      WHEN p_logo_url IS NULL THEN logo_url
      WHEN p_logo_url = '' THEN logo_url
      ELSE p_logo_url
    END,
    updated_at = NOW()
  WHERE id = p_club_id;

  RETURN jsonb_build_object('success', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.update_club_assets(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_club_assets(uuid, uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.update_club_assets(uuid, uuid, text, text) IS
  'Slice 067: Admin-Override fuer clubs.stadium_image_url + logo_url. Owner/admin-gate.';
