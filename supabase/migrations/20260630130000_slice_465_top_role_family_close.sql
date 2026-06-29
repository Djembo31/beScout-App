-- Slice 465 — D-37b: top_role='Admin'-Familie vollständig schließen (platform_admins)
-- ---------------------------------------------------------------------------
-- CEO autonom-Go (Anil 2026-06-30 "mach autonom weiter", §3 — kein Money).
--
-- Post-464-Vollständigkeits-Audit fand die letzten 2 top_role='Admin'-RPCs (0 Match global):
--   * get_sponsor_stats_summary (RETURNS TABLE, read-only) = SOLE-gate-tot + vestigial anon-granted.
--   * set_club_fan_rank_thresholds (config-write + fan_rankings-recompute) = Sekundär-Branch
--     (club_admins owner/admin funktioniert, Platform-Override via top_role tot — DER S347-Fall).
--
-- Fix: top_role-Check je RPC auf kanonische platform_admins (= 464/D-36/v2/get_club_balance/UI
-- isPlatformAdmin). Bodies byte-true (RETURN QUERY / UPSERT + recompute-Loop, S156). get_sponsor:
-- platform_admins QUALIFIZIERT public. (Fn hat SET search_path TO '') + REVOKE anon. set_thresholds:
-- club_admins-Branch unverändert (permissiv-only fuer Platform-Admins). calculate_fan_rank-PERFORM
-- laeuft im SECDEF-Owner-Kontext -> von 460-REVOKE unberuehrt. Kanon: errors-db S463/S464/S462/S347.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_sponsor_stats_summary(p_sponsor_id uuid DEFAULT NULL::uuid, p_days integer DEFAULT 30)
 RETURNS TABLE(sponsor_id uuid, sponsor_name text, placement text, total_impressions bigint, total_clicks bigint, ctr numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Admin guard (platform_admins = kanonische Quelle, D-37b/S462)
  IF NOT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    ss.sponsor_id,
    s.name AS sponsor_name,
    ss.placement,
    SUM(ss.impressions)::BIGINT AS total_impressions,
    SUM(ss.clicks)::BIGINT AS total_clicks,
    CASE WHEN SUM(ss.impressions) > 0
      THEN ROUND(SUM(ss.clicks)::NUMERIC / SUM(ss.impressions) * 100, 2)
      ELSE 0
    END AS ctr
  FROM public.sponsor_stats ss
  JOIN public.sponsors s ON s.id = ss.sponsor_id
  WHERE ss.date >= CURRENT_DATE - p_days
    AND (p_sponsor_id IS NULL OR ss.sponsor_id = p_sponsor_id)
  GROUP BY ss.sponsor_id, s.name, ss.placement
  ORDER BY total_impressions DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_club_fan_rank_thresholds(p_club_id uuid, p_stammgast smallint, p_ultra smallint, p_legende smallint, p_ehrenmitglied smallint, p_vereinsikone smallint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_recalc INT := 0;
  r RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  -- Club-Admin-Gate (owner/admin) ODER Platform-Superadmin (platform_admins — D-37b/S347)
  IF NOT EXISTS (
    SELECT 1 FROM public.platform_admins WHERE user_id = v_uid
  ) AND NOT EXISTS (
    SELECT 1 FROM public.club_admins
    WHERE user_id = v_uid AND club_id = p_club_id AND role IN ('owner','admin')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_club_admin');
  END IF;

  IF p_stammgast IS NULL OR p_ultra IS NULL OR p_legende IS NULL
     OR p_ehrenmitglied IS NULL OR p_vereinsikone IS NULL
     OR p_stammgast < 1
     OR p_stammgast >= p_ultra
     OR p_ultra >= p_legende
     OR p_legende >= p_ehrenmitglied
     OR p_ehrenmitglied >= p_vereinsikone
     OR p_vereinsikone > 100 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_thresholds');
  END IF;

  INSERT INTO public.club_fan_rank_thresholds (
    club_id, stammgast, ultra, legende, ehrenmitglied, vereinsikone, updated_by, updated_at
  ) VALUES (
    p_club_id, p_stammgast, p_ultra, p_legende, p_ehrenmitglied, p_vereinsikone, v_uid, now()
  )
  ON CONFLICT (club_id) DO UPDATE SET
    stammgast = EXCLUDED.stammgast,
    ultra = EXCLUDED.ultra,
    legende = EXCLUDED.legende,
    ehrenmitglied = EXCLUDED.ehrenmitglied,
    vereinsikone = EXCLUDED.vereinsikone,
    updated_by = EXCLUDED.updated_by,
    updated_at = EXCLUDED.updated_at;

  FOR r IN SELECT user_id FROM public.fan_rankings WHERE club_id = p_club_id LOOP
    BEGIN
      PERFORM public.calculate_fan_rank(r.user_id, p_club_id);
      v_recalc := v_recalc + 1;
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;
    END;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'recalculated', v_recalc);
END;
$function$;

-- AR-44: CREATE OR REPLACE erhaelt ACL (S368c). get_sponsor war vestigial anon-granted -> REVOKE.
REVOKE EXECUTE ON FUNCTION public.get_sponsor_stats_summary(uuid, integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_sponsor_stats_summary(uuid, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.set_club_fan_rank_thresholds(uuid, smallint, smallint, smallint, smallint, smallint) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.set_club_fan_rank_thresholds(uuid, smallint, smallint, smallint, smallint, smallint) TO authenticated;
