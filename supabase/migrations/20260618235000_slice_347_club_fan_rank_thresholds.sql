-- Slice 347 (FRE-5): Club-konfigurierbare Fan-Rang-Schwellen
-- ============================================================
-- Macht die Score->Tier-Schwellen pro Club einstellbar (heute global hart codiert).
-- Money-nah: Fan-Rang-Tier steuert seit Slice 343 das Poll-Stimmgewicht (Geld-Tally).
-- Schutz-Grenze: NUR die Schwellen sind konfigurierbar; das Gewicht-Mapping
-- Tier->Faktor (Ultra/Legende=2x, Ehren/Ikone=3x in cast_community_poll_vote) bleibt GLOBAL.
--
-- Source-of-truth fuer calculate_fan_rank-Rewrite: LIVE pg_get_functiondef (D87, 2026-06-18),
-- NICHT 20260330_streak_benefits_rpcs.sql (stale). Erhaltene Patches:
--   - Slice 345 Follow-Bonus (+5)
--   - ELO-Boost via fn_get_streak_elo_boost
--   - SC-Score / SC-Sanitization
--   - csf_multiplier-Write (Removal = separater Backlog-Slice, D93)
-- Einzige Aenderung: der finale Tier-CASE liest die Schwellen aus club_fan_rank_thresholds
-- (mit COALESCE auf Plattform-Default 10/25/40/55/70).

-- ============================================================
-- 1. CONFIG-TABELLE (eine Zeile/Club, Spalten statt Zeilen -> monotoner CHECK atomar)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.club_fan_rank_thresholds (
  club_id        uuid PRIMARY KEY REFERENCES public.clubs(id) ON DELETE CASCADE,
  stammgast      smallint NOT NULL DEFAULT 10,
  ultra          smallint NOT NULL DEFAULT 25,
  legende        smallint NOT NULL DEFAULT 40,
  ehrenmitglied  smallint NOT NULL DEFAULT 55,
  vereinsikone   smallint NOT NULL DEFAULT 70,
  updated_by     uuid REFERENCES public.profiles(id),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  -- strikte < (nicht <=) -> keine mehrdeutigen CASE-Grenzen; zuschauer ist implizit 0
  CONSTRAINT cfrt_monotonic CHECK (
    stammgast >= 1
    AND stammgast < ultra
    AND ultra < legende
    AND legende < ehrenmitglied
    AND ehrenmitglied < vereinsikone
    AND vereinsikone <= 100
  )
);

COMMENT ON TABLE public.club_fan_rank_thresholds IS
  'Slice 347 (FRE-5): pro-Club Fan-Rang-Score-Schwellen. Fehlende Zeile = Plattform-Default (10/25/40/55/70). Writes NUR via set_club_fan_rank_thresholds (SECURITY DEFINER, Club-Admin-Gate). Kein direkter Client-Write.';

-- ============================================================
-- 2. RLS (alle Client-Ops adressiert; SELECT offen, Writes nur via RPC)
-- ============================================================
ALTER TABLE public.club_fan_rank_thresholds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cfrt_select ON public.club_fan_rank_thresholds;
CREATE POLICY cfrt_select ON public.club_fan_rank_thresholds
  FOR SELECT TO authenticated, anon
  USING (true);  -- Schwellen sind nicht-sensibel (Leiter-Anzeige); keine PII

-- INSERT/UPDATE/DELETE: kein direkter Client-Write. service_role (RPC SECURITY DEFINER) bypassed RLS.
DROP POLICY IF EXISTS cfrt_no_client_insert ON public.club_fan_rank_thresholds;
CREATE POLICY cfrt_no_client_insert ON public.club_fan_rank_thresholds
  FOR INSERT TO authenticated, anon
  WITH CHECK (false);

DROP POLICY IF EXISTS cfrt_no_client_update ON public.club_fan_rank_thresholds;
CREATE POLICY cfrt_no_client_update ON public.club_fan_rank_thresholds
  FOR UPDATE TO authenticated, anon
  USING (false);

DROP POLICY IF EXISTS cfrt_no_client_delete ON public.club_fan_rank_thresholds;
CREATE POLICY cfrt_no_client_delete ON public.club_fan_rank_thresholds
  FOR DELETE TO authenticated, anon
  USING (false);

-- ============================================================
-- 3. HELPER (Frontend-Read + Default-Resolution) -- Single Source der Defaults
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_club_fan_rank_thresholds(p_club_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT jsonb_build_object(
    'stammgast',     COALESCE(t.stammgast, 10),
    'ultra',         COALESCE(t.ultra, 25),
    'legende',       COALESCE(t.legende, 40),
    'ehrenmitglied', COALESCE(t.ehrenmitglied, 55),
    'vereinsikone',  COALESCE(t.vereinsikone, 70)
  )
  FROM (SELECT p_club_id AS cid) base
  LEFT JOIN public.club_fan_rank_thresholds t ON t.club_id = base.cid;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_club_fan_rank_thresholds(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_club_fan_rank_thresholds(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_club_fan_rank_thresholds(uuid) TO authenticated;

-- ============================================================
-- 4. calculate_fan_rank REWRITE (gegen LIVE-Baseline; nur Tier-CASE variabel)
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_fan_rank(p_user_id uuid, p_club_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_event_score NUMERIC(5,2) := 0;
  v_dpc_score NUMERIC(5,2) := 0;
  v_abo_score NUMERIC(5,2) := 0;
  v_community_score NUMERIC(5,2) := 0;
  v_streak_score NUMERIC(5,2) := 0;
  v_total_score NUMERIC(5,2) := 0;
  v_rank_tier TEXT;
  v_csf_multiplier NUMERIC(3,2);
  v_holdings_count INT;
  v_avg_holding_days NUMERIC;
  v_sub_tier TEXT;
  v_post_count INT;
  v_vote_count INT;
  v_streak_count INT;
  v_total_entries INT;
  v_avg_percentile NUMERIC;
  v_login_streak INT;
  v_elo_boost_pct NUMERIC(5,2);
  -- Slice 347 (FRE-5): pro-Club Schwellen (COALESCE auf Plattform-Default)
  v_th_stammgast smallint;
  v_th_ultra smallint;
  v_th_legende smallint;
  v_th_ehren smallint;
  v_th_ikone smallint;
BEGIN
  SELECT
    COUNT(*),
    AVG(
      CASE WHEN total_entries > 1 THEN
        (1.0 - (COALESCE(l.rank, total_entries)::NUMERIC - 1) / (total_entries - 1)) * 100
      ELSE 50 END
    )
  INTO v_total_entries, v_avg_percentile
  FROM lineups l
  JOIN events e ON e.id = l.event_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*) as total_entries
    FROM lineups l2
    WHERE l2.event_id = e.id
  ) entry_counts ON true
  WHERE l.user_id = p_user_id
    AND e.club_id = p_club_id
    AND e.status = 'ended';

  IF v_total_entries > 0 AND v_avg_percentile IS NOT NULL THEN
    v_event_score := LEAST(v_avg_percentile, 100);
  END IF;

  SELECT
    COALESCE(SUM(h.quantity), 0),
    COALESCE(AVG(EXTRACT(EPOCH FROM (now() - h.created_at)) / 86400), 0)
  INTO v_holdings_count, v_avg_holding_days
  FROM holdings h
  JOIN players p ON p.id = h.player_id
  WHERE h.user_id = p_user_id
    AND p.club_id = p_club_id
    AND h.quantity > 0;

  v_dpc_score := LEAST(v_holdings_count * 10, 70) + LEAST(v_avg_holding_days / 30.0 * 10, 30);
  v_dpc_score := LEAST(v_dpc_score, 100);

  SELECT tier INTO v_sub_tier
  FROM club_subscriptions
  WHERE user_id = p_user_id
    AND club_id = p_club_id
    AND status = 'active'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  v_abo_score := CASE v_sub_tier
    WHEN 'gold' THEN 100
    WHEN 'silber' THEN 75
    WHEN 'bronze' THEN 50
    ELSE 0
  END;

  SELECT COALESCE(SUM(cnt), 0) INTO v_post_count FROM (
    SELECT COUNT(*) as cnt
    FROM posts
    WHERE user_id = p_user_id
      AND club_id = p_club_id
      AND created_at > now() - INTERVAL '90 days'
    UNION ALL
    SELECT COUNT(*) as cnt
    FROM research_posts
    WHERE user_id = p_user_id
      AND club_id = p_club_id
      AND created_at > now() - INTERVAL '90 days'
  ) sub;

  SELECT COUNT(*) INTO v_vote_count
  FROM post_votes pv
  JOIN posts p ON p.id = pv.post_id
  WHERE pv.user_id = p_user_id
    AND p.club_id = p_club_id
    AND pv.created_at > now() - INTERVAL '90 days';

  v_community_score := LEAST(v_post_count * 5 + v_vote_count * 1, 100);

  WITH ordered_events AS (
    SELECT e.id as event_id,
           e.starts_at,
           ROW_NUMBER() OVER (ORDER BY e.starts_at DESC) as rn,
           CASE WHEN EXISTS (
             SELECT 1 FROM lineups l WHERE l.event_id = e.id AND l.user_id = p_user_id
           ) THEN true ELSE false END as participated
    FROM events e
    WHERE e.club_id = p_club_id
      AND e.status = 'ended'
    ORDER BY e.starts_at DESC
  )
  SELECT COUNT(*) INTO v_streak_count
  FROM ordered_events
  WHERE participated = true
    AND rn <= (
      SELECT COALESCE(MIN(rn) - 1, (SELECT MAX(rn) FROM ordered_events WHERE participated = true))
      FROM ordered_events
      WHERE participated = false
    );

  v_streak_score := LEAST(COALESCE(v_streak_count, 0) * 15, 100);

  v_total_score := ROUND(
    v_event_score * 0.30 +
    v_dpc_score * 0.25 +
    v_abo_score * 0.20 +
    v_community_score * 0.15 +
    v_streak_score * 0.10,
    2
  );

  SELECT COALESCE(us.current_streak, 0) INTO v_login_streak
  FROM user_streaks us WHERE us.user_id = p_user_id;
  v_login_streak := COALESCE(v_login_streak, 0);

  v_elo_boost_pct := fn_get_streak_elo_boost(v_login_streak);

  IF v_elo_boost_pct > 0 THEN
    v_total_score := ROUND(v_total_score * (1 + v_elo_boost_pct / 100.0), 2);
  END IF;

  -- 6.6 FOLLOW BONUS (Slice 345 / FRE-2): +5 wenn der Fan dem Club folgt. Monoton, cap 100.
  IF EXISTS (
    SELECT 1 FROM club_followers
    WHERE user_id = p_user_id AND club_id = p_club_id
  ) THEN
    v_total_score := LEAST(v_total_score + 5, 100);
  END IF;

  -- Slice 347 (FRE-5): pro-Club Schwellen lesen (fehlende Zeile -> Plattform-Default).
  -- Defaults hier MUESSEN mit get_club_fan_rank_thresholds + Tabellen-DEFAULT uebereinstimmen.
  SELECT t.stammgast, t.ultra, t.legende, t.ehrenmitglied, t.vereinsikone
    INTO v_th_stammgast, v_th_ultra, v_th_legende, v_th_ehren, v_th_ikone
  FROM public.club_fan_rank_thresholds t
  WHERE t.club_id = p_club_id;
  v_th_stammgast := COALESCE(v_th_stammgast, 10);
  v_th_ultra     := COALESCE(v_th_ultra, 25);
  v_th_legende   := COALESCE(v_th_legende, 40);
  v_th_ehren     := COALESCE(v_th_ehren, 55);
  v_th_ikone     := COALESCE(v_th_ikone, 70);

  IF v_total_score >= v_th_ikone THEN
    v_rank_tier := 'vereinsikone'; v_csf_multiplier := 1.50;
  ELSIF v_total_score >= v_th_ehren THEN
    v_rank_tier := 'ehrenmitglied'; v_csf_multiplier := 1.35;
  ELSIF v_total_score >= v_th_legende THEN
    v_rank_tier := 'legende'; v_csf_multiplier := 1.25;
  ELSIF v_total_score >= v_th_ultra THEN
    v_rank_tier := 'ultra'; v_csf_multiplier := 1.15;
  ELSIF v_total_score >= v_th_stammgast THEN
    v_rank_tier := 'stammgast'; v_csf_multiplier := 1.05;
  ELSE
    v_rank_tier := 'zuschauer'; v_csf_multiplier := 1.00;
  END IF;

  INSERT INTO fan_rankings (
    user_id, club_id, rank_tier, csf_multiplier,
    event_score, dpc_score, abo_score, community_score, streak_score,
    total_score, calculated_at
  ) VALUES (
    p_user_id, p_club_id, v_rank_tier, v_csf_multiplier,
    v_event_score, v_dpc_score, v_abo_score, v_community_score, v_streak_score,
    v_total_score, now()
  )
  ON CONFLICT (user_id, club_id) DO UPDATE SET
    rank_tier = EXCLUDED.rank_tier,
    csf_multiplier = EXCLUDED.csf_multiplier,
    event_score = EXCLUDED.event_score,
    dpc_score = EXCLUDED.dpc_score,
    abo_score = EXCLUDED.abo_score,
    community_score = EXCLUDED.community_score,
    streak_score = EXCLUDED.streak_score,
    total_score = EXCLUDED.total_score,
    calculated_at = EXCLUDED.calculated_at;

  RETURN jsonb_build_object(
    'ok', true,
    'rank_tier', v_rank_tier,
    'csf_multiplier', v_csf_multiplier,
    'total_score', v_total_score,
    'components', jsonb_build_object(
      'event_score', v_event_score,
      'dpc_score', v_dpc_score,
      'abo_score', v_abo_score,
      'community_score', v_community_score,
      'streak_score', v_streak_score
    )
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.calculate_fan_rank(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calculate_fan_rank(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.calculate_fan_rank(uuid, uuid) TO authenticated;

-- ============================================================
-- 5. WRITE-RPC (Club-Admin-Gate + Validierung + UPSERT + sofort-Recalc)
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_club_fan_rank_thresholds(
  p_club_id uuid,
  p_stammgast smallint,
  p_ultra smallint,
  p_legende smallint,
  p_ehrenmitglied smallint,
  p_vereinsikone smallint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_recalc INT := 0;
  r RECORD;
BEGIN
  -- Auth + Club-Admin-Gate (role owner/admin des EIGENEN Vereins; Identitaetsgrenze D86)
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  -- Club-Admin-Gate (owner/admin des EIGENEN Vereins) ODER Platform-Superadmin.
  -- top_role='Admin'-Bypass spiegelt das UI-Override (AdminContent: superadmin -> synthetic owner)
  -- + das etablierte Muster (bounty_rpcs_rls). Sonst UI-zeigt-Button-aber-RPC-rejected-Drift.
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_uid AND top_role = 'Admin'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.club_admins
    WHERE user_id = v_uid AND club_id = p_club_id AND role IN ('owner','admin')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_club_admin');
  END IF;

  -- Defense-in-Depth-Validierung (zusaetzlich zum CHECK): monoton steigend, 1..100
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

  -- Sofort-Recalc aller Fan-Tiers des Clubs (Money-Tally-Korrektheit, fail-isoliert).
  FOR r IN SELECT user_id FROM public.fan_rankings WHERE club_id = p_club_id LOOP
    BEGIN
      PERFORM public.calculate_fan_rank(r.user_id, p_club_id);
      v_recalc := v_recalc + 1;
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;  -- ein fehlerhafter Fan-Recalc darf den Rest nicht blocken
    END;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'recalculated', v_recalc);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.set_club_fan_rank_thresholds(uuid, smallint, smallint, smallint, smallint, smallint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_club_fan_rank_thresholds(uuid, smallint, smallint, smallint, smallint, smallint) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_club_fan_rank_thresholds(uuid, smallint, smallint, smallint, smallint, smallint) TO authenticated;
