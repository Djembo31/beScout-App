-- Slice 334 — Polls P2: Spieler-Bezug (player_id) für community_polls (Discovery-Anker)
-- KEIN Money-Path. Schema-Change. Vorgänger: Slice 333 (20260618120000).
-- Live-Signatur-Baseline (pg_get_function_identity_arguments 2026-06-18):
--   create_community_poll(uuid,text,jsonb,bigint,integer,text,uuid,text) — wird gedroppt.
-- Body = Slice 333 (Source-of-truth) + 2 additive Änderungen: p_player_id-Param + invalid_player-Guard + INSERT player_id.

-- ============================================================
-- 1. community_polls.player_id — optionaler Anker (analog bounties.player_id)
-- ============================================================
ALTER TABLE public.community_polls
  ADD COLUMN IF NOT EXISTS player_id uuid REFERENCES public.players(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.community_polls.player_id IS
  'Slice 334: optionaler Spieler-Bezug (Discovery-Anker, zusätzlich zu club_id). NULL = kein Spieler. ON DELETE SET NULL = Poll überlebt Spieler-Löschung, Anker wird leer.';

-- ============================================================
-- 2. create_community_poll — +p_player_id (9-arg). Alte 8-arg-Signatur droppen.
-- ============================================================
DROP FUNCTION IF EXISTS public.create_community_poll(uuid, text, jsonb, bigint, integer, text, uuid, text);

CREATE OR REPLACE FUNCTION public.create_community_poll(
  p_user_id       uuid,
  p_question      text,
  p_options       jsonb,
  p_cost_bsd      bigint,
  p_duration_days integer,
  p_source        text,
  p_club_id       uuid DEFAULT NULL,
  p_description   text DEFAULT NULL,
  p_player_id     uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_opt_count      integer;
  v_norm_options   jsonb := '[]'::jsonb;
  v_elem           jsonb;
  v_label          text;
  v_follower_count integer;
  v_is_admin       boolean;
  v_ends_at        timestamptz;
  v_poll_id        uuid;
  v_desc           text;
BEGIN
  -- Auth-Guard (NULL-safe: service_role/Cron bypass; cross-user reject) — errors-db.md 005/J4
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  -- source
  IF p_source IS NULL OR p_source NOT IN ('club', 'user') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_source');
  END IF;

  -- question
  IF p_question IS NULL OR length(trim(p_question)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_question');
  END IF;

  -- options: Array von 2..4, jede mit non-empty label. Akzeptiert ['A','B'] ODER [{label}].
  IF p_options IS NULL OR jsonb_typeof(p_options) <> 'array' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_options');
  END IF;
  v_opt_count := jsonb_array_length(p_options);
  IF v_opt_count < 2 OR v_opt_count > 4 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_options');
  END IF;
  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_options) LOOP
    IF jsonb_typeof(v_elem) = 'string' THEN
      v_label := trim(v_elem #>> '{}');
    ELSE
      v_label := trim(COALESCE(v_elem ->> 'label', ''));
    END IF;
    IF v_label IS NULL OR length(v_label) = 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'invalid_options');
    END IF;
    v_norm_options := v_norm_options || jsonb_build_object('label', v_label, 'votes', 0);
  END LOOP;

  -- cost (0 .. 100.000 cents = 0 .. 1000 $SCOUT)
  IF p_cost_bsd IS NULL OR p_cost_bsd < 0 OR p_cost_bsd > 100000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_cost');
  END IF;

  -- duration (1 .. 30 Tage)
  IF p_duration_days IS NULL OR p_duration_days < 1 OR p_duration_days > 30 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_duration');
  END IF;
  v_ends_at := now() + make_interval(days => p_duration_days);

  -- Slice 334: optionaler Spieler-Anker. Wenn gesetzt, muss existieren (kein FK-23503-Leak an UI).
  IF p_player_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM players WHERE id = p_player_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_player');
  END IF;

  -- Identitäts-/Autoritäts-Grenze (sicherheitskritisch, Canon §3)
  IF p_source = 'club' THEN
    IF p_club_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'club_id_required');
    END IF;
    SELECT EXISTS(
      SELECT 1 FROM club_admins WHERE club_id = p_club_id AND user_id = p_user_id
    ) INTO v_is_admin;
    IF NOT v_is_admin THEN
      RETURN jsonb_build_object('success', false, 'error', 'not_club_admin');
    END IF;
  ELSE
    -- User-Pfad: Follower-Tor (50, aus user_follows.following_id)
    SELECT COUNT(*) INTO v_follower_count FROM user_follows WHERE following_id = p_user_id;
    IF COALESCE(v_follower_count, 0) < 50 THEN
      RETURN jsonb_build_object('success', false, 'error', 'follower_threshold');
    END IF;
  END IF;

  v_desc := NULLIF(trim(COALESCE(p_description, '')), '');

  INSERT INTO community_polls
    (created_by, question, description, options, cost_bsd, ends_at, source, club_id, player_id, status)
  VALUES
    (p_user_id, trim(p_question), v_desc, v_norm_options, p_cost_bsd, v_ends_at, p_source, p_club_id, p_player_id, 'active')
  RETURNING id INTO v_poll_id;

  RETURN jsonb_build_object('success', true, 'poll_id', v_poll_id);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_community_poll(uuid, text, jsonb, bigint, integer, text, uuid, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_community_poll(uuid, text, jsonb, bigint, integer, text, uuid, text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_community_poll(uuid, text, jsonb, bigint, integer, text, uuid, text, uuid) TO authenticated;
