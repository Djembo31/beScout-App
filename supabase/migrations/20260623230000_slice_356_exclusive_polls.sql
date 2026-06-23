-- Slice 356 — Exklusive Treue-Umfragen (Fan-Rang-Tor auf Community-Polls)
-- Spiegelt das 346er Fan-Rang-Gate (posts.min_fan_rank_tier + fan_rank_tier_rank), aber EINFACHER:
-- Bei Polls gibt es keinen versteckten Text-Content zu maskieren — die Frage IST der Teaser,
-- gegated wird nur das (kostenpflichtige) Abstimmen. → KEIN Teaser-RPC nötig (anders als 346).
--
-- Geld-Logik (337 Fee 20/80, 343 Stimmgewicht, Treasury-Routing) UNVERÄNDERT.
-- Beide RPC-Bodies = aus LIVE pg_get_functiondef abgeleitet (D87, PATCH-AUDIT), nur das Tor ergänzt.

-- ============================================================
-- 1. Spalte min_fan_rank_tier (NULL = offen für alle) + CHECK (6-Tier-Mirror, wie posts/346)
-- ============================================================
ALTER TABLE public.community_polls ADD COLUMN IF NOT EXISTS min_fan_rank_tier TEXT;
ALTER TABLE public.community_polls DROP CONSTRAINT IF EXISTS community_polls_min_fan_rank_tier_check;
ALTER TABLE public.community_polls ADD CONSTRAINT community_polls_min_fan_rank_tier_check
  CHECK (min_fan_rank_tier IS NULL OR min_fan_rank_tier IN
    ('zuschauer','stammgast','ultra','legende','ehrenmitglied','vereinsikone'));

-- ============================================================
-- 2. create_community_poll v2 — +p_min_fan_rank_tier (nur source='club').
--    Neuer Param = neue Signatur → alte 9-arg-Overload droppen (sonst Overload-Ambiguität, errors-db.md S326).
-- ============================================================
DROP FUNCTION IF EXISTS public.create_community_poll(uuid, text, jsonb, bigint, integer, text, uuid, text, uuid);

CREATE OR REPLACE FUNCTION public.create_community_poll(
  p_user_id uuid,
  p_question text,
  p_options jsonb,
  p_cost_bsd bigint,
  p_duration_days integer,
  p_source text,
  p_club_id uuid DEFAULT NULL::uuid,
  p_description text DEFAULT NULL::text,
  p_player_id uuid DEFAULT NULL::uuid,
  p_min_fan_rank_tier text DEFAULT NULL::text
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
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  IF p_source IS NULL OR p_source NOT IN ('club', 'user') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_source');
  END IF;

  IF p_question IS NULL OR length(trim(p_question)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_question');
  END IF;

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

  IF p_cost_bsd IS NULL OR p_cost_bsd < 0 OR p_cost_bsd > 100000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_cost');
  END IF;

  IF p_duration_days IS NULL OR p_duration_days < 1 OR p_duration_days > 30 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_duration');
  END IF;
  v_ends_at := now() + make_interval(days => p_duration_days);

  -- Slice 334: optionaler Spieler-Anker. Wenn gesetzt, muss existieren (kein FK-23503-Leak an UI).
  IF p_player_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM players WHERE id = p_player_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_player');
  END IF;

  -- Slice 356: exklusives Treue-Tor — nur offizielle Vereins-Umfragen (Identitäts-Grenze §3).
  -- Gültige Mindeststufen = stammgast(1)..vereinsikone(5); zuschauer(0)=sinnlos (alle erfüllen), -1=unbekannt.
  IF p_min_fan_rank_tier IS NOT NULL THEN
    IF p_source <> 'club' THEN
      RETURN jsonb_build_object('success', false, 'error', 'exclusive_requires_club');
    END IF;
    IF fan_rank_tier_rank(p_min_fan_rank_tier) < 1 THEN
      RETURN jsonb_build_object('success', false, 'error', 'invalid_fan_rank_tier');
    END IF;
  END IF;

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
    SELECT COUNT(*) INTO v_follower_count FROM user_follows WHERE following_id = p_user_id;
    IF COALESCE(v_follower_count, 0) < 50 THEN
      RETURN jsonb_build_object('success', false, 'error', 'follower_threshold');
    END IF;
  END IF;

  v_desc := NULLIF(trim(COALESCE(p_description, '')), '');

  INSERT INTO community_polls
    (created_by, question, description, options, cost_bsd, ends_at, source, club_id, player_id, min_fan_rank_tier, status)
  VALUES
    (p_user_id, trim(p_question), v_desc, v_norm_options, p_cost_bsd, v_ends_at, p_source, p_club_id, p_player_id, p_min_fan_rank_tier, 'active')
  RETURNING id INTO v_poll_id;

  RETURN jsonb_build_object('success', true, 'poll_id', v_poll_id);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_community_poll(uuid,text,jsonb,bigint,integer,text,uuid,text,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_community_poll(uuid,text,jsonb,bigint,integer,text,uuid,text,uuid,text) TO authenticated;

-- ============================================================
-- 3. cast_community_poll_vote v2 — +Fan-Rang-Tor VOR jeder Wallet-Belastung (Money/Security-Kern).
--    Gespeicherter Rang (stale-tolerant, money-safe da Reject vor Geldfluss; konsistent 346/343).
--    Signatur unverändert → CREATE OR REPLACE (kein DROP). Alle Patches (336/337/343/Treasury) erhalten.
-- ============================================================
CREATE OR REPLACE FUNCTION public.cast_community_poll_vote(p_user_id uuid, p_poll_id uuid, p_option_index integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_poll            RECORD;
  v_options         JSONB;
  v_option          JSONB;
  v_cost            BIGINT;
  v_creator_share   BIGINT;
  v_platform_share  BIGINT;
  v_voter_balance   BIGINT;
  v_creator_balance BIGINT;
  v_already         BOOLEAN;
  v_weight          SMALLINT := 1;   -- Slice 336
  v_sub_tier        TEXT;            -- Slice 336
  v_abo_weight      SMALLINT := 1;   -- Slice 343
  v_rank_weight     SMALLINT := 1;   -- Slice 343
  v_rank_tier       TEXT;            -- Slice 343
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;
  SELECT * INTO v_poll FROM community_polls WHERE id = p_poll_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Umfrage nicht gefunden'); END IF;
  IF v_poll.status != 'active' THEN RETURN jsonb_build_object('success', false, 'error', 'Umfrage ist nicht aktiv'); END IF;
  IF now() > v_poll.ends_at THEN
    UPDATE community_polls SET status = 'ended' WHERE id = p_poll_id;
    RETURN jsonb_build_object('success', false, 'error', 'Umfrage ist beendet');
  END IF;
  IF v_poll.created_by = p_user_id THEN RETURN jsonb_build_object('success', false, 'error', 'Eigene Umfrage — nicht abstimmbar'); END IF;
  v_options := v_poll.options;
  IF p_option_index < 0 OR p_option_index >= jsonb_array_length(v_options) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ungültige Option');
  END IF;
  SELECT EXISTS(SELECT 1 FROM community_poll_votes WHERE poll_id = p_poll_id AND user_id = p_user_id) INTO v_already;
  IF v_already THEN RETURN jsonb_build_object('success', false, 'error', 'Bereits abgestimmt'); END IF;

  -- Slice 356: Exklusives Treue-Tor. Wenn gesetzt, muss der (gespeicherte) Fan-Rang des Voters für
  -- den Verein die Mindeststufe erreichen — VOR jeder Wallet-Belastung (money-safe reject, kein Geldfluss).
  -- Gespeicherter Rang (stale-tolerant, kein recalc-on-read): konsistent zu 346-Read-Gate + 343-Gewicht.
  -- fan_rank_tier_rank(NULL)=-1 < jede Mindeststufe → kein Rang = fail-closed (korrekt).
  IF v_poll.min_fan_rank_tier IS NOT NULL AND v_poll.club_id IS NOT NULL THEN
    SELECT fr.rank_tier INTO v_rank_tier FROM fan_rankings fr
    WHERE fr.user_id = p_user_id AND fr.club_id = v_poll.club_id LIMIT 1;
    IF fan_rank_tier_rank(v_rank_tier) < fan_rank_tier_rank(v_poll.min_fan_rank_tier) THEN
      RETURN jsonb_build_object('success', false, 'error', 'fan_rank_too_low');
    END IF;
    v_rank_tier := NULL;  -- 343-Block unten liest frisch neu (Klarheit; Reuse hier nicht erzwingen)
  END IF;

  -- Slice 343: Loyalitäts-Gewicht = MAX(Abo-Bonus, Fan-Rang-Stufe). Nur bei club-bezogenem Poll.
  -- Tally-only (Geld bleibt 1 echte Stimme, D86). Abo-Floor verhindert Regression der Live-2× (336).
  IF v_poll.club_id IS NOT NULL THEN
    -- Abo-Bonus (Bestand 336, identisch zu cast_vote): aktives Club-Abo → 2×.
    SELECT cs.tier INTO v_sub_tier FROM club_subscriptions cs
    WHERE cs.user_id = p_user_id AND cs.club_id = v_poll.club_id
      AND cs.status = 'active' AND cs.expires_at > now() LIMIT 1;
    IF v_sub_tier IS NOT NULL THEN v_abo_weight := 2; END IF;

    -- Fan-Rang-Stufe (Slice 343): gespeicherter Rang (stale-toleriert, Tally-only, kein recalc-on-read).
    SELECT fr.rank_tier INTO v_rank_tier FROM fan_rankings fr
    WHERE fr.user_id = p_user_id AND fr.club_id = v_poll.club_id LIMIT 1;
    v_rank_weight := CASE v_rank_tier
      WHEN 'ultra' THEN 2
      WHEN 'legende' THEN 2
      WHEN 'ehrenmitglied' THEN 3
      WHEN 'vereinsikone' THEN 3
      ELSE 1
    END;

    v_weight := GREATEST(v_abo_weight, v_rank_weight);
  END IF;

  v_cost := v_poll.cost_bsd;
  -- Slice 356/337-Heal: 80% Creator/Treasury, 20% Plattform (CEO-approved Slice 337). Live war seit
  -- Slice 343 fälschlich * 70 (343 rekonstruierte aus slice_336-Datei statt Live → Patch-Revert von 337).
  v_creator_share := (v_cost * 80) / 100;
  v_platform_share := v_cost - v_creator_share;
  IF v_cost > 0 THEN
    SELECT balance INTO v_voter_balance FROM wallets WHERE user_id = p_user_id FOR UPDATE;
    IF NOT FOUND OR (v_voter_balance - COALESCE((SELECT locked_balance FROM wallets WHERE user_id = p_user_id), 0)) < v_cost THEN
      RETURN jsonb_build_object('success', false, 'error', 'Nicht genug BSD');
    END IF;
    UPDATE wallets SET balance = balance - v_cost, updated_at = now() WHERE user_id = p_user_id;
    IF v_poll.source = 'club' AND v_poll.club_id IS NOT NULL THEN
      PERFORM public.book_club_treasury(
        v_poll.club_id, 'credit', 'poll_revenue', v_creator_share,
        p_poll_id, 'Umfrage-Einnahme: ' || left(v_poll.question, 50)
      );
      INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description) VALUES
        (p_user_id, 'poll_vote_cost', -v_cost, v_voter_balance - v_cost, p_poll_id, 'Umfrage: ' || left(v_poll.question, 50));
    ELSE
      IF v_poll.source = 'club' THEN
        RAISE EXCEPTION 'club_poll_missing_club_id: Vereins-Umfrage ohne club_id';
      END IF;
      SELECT balance INTO v_creator_balance FROM wallets WHERE user_id = v_poll.created_by FOR UPDATE;
      IF FOUND THEN UPDATE wallets SET balance = balance + v_creator_share, updated_at = now() WHERE user_id = v_poll.created_by; END IF;
      INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description) VALUES
        (p_user_id, 'poll_vote_cost', -v_cost, v_voter_balance - v_cost, p_poll_id, 'Umfrage: ' || left(v_poll.question, 50)),
        (v_poll.created_by, 'poll_earn', v_creator_share, COALESCE(v_creator_balance, 0) + v_creator_share, p_poll_id, 'Umfrage-Einnahme: ' || left(v_poll.question, 50));
    END IF;
  ELSE v_creator_share := 0; v_platform_share := 0; END IF;

  -- Slice 336: weight gespeichert (Tally skaliert, Geld unverändert: amount_paid/creator_share/platform_share = echte Stimme).
  INSERT INTO community_poll_votes (poll_id, user_id, option_index, amount_paid, creator_share, platform_share, weight)
  VALUES (p_poll_id, p_user_id, p_option_index, v_cost, v_creator_share, v_platform_share, v_weight);
  v_option := v_options -> p_option_index;
  v_option := jsonb_set(v_option, '{votes}', to_jsonb(COALESCE((v_option ->> 'votes')::int, 0) + v_weight));
  v_options := jsonb_set(v_options, ARRAY[p_option_index::text], v_option);
  UPDATE community_polls SET options = v_options, total_votes = total_votes + v_weight, creator_earned = creator_earned + v_creator_share WHERE id = p_poll_id;
  RETURN jsonb_build_object('success', true, 'total_votes', v_poll.total_votes + v_weight, 'cost', v_cost, 'creator_share', v_creator_share, 'weight', v_weight);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.cast_community_poll_vote(uuid,uuid,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cast_community_poll_vote(uuid,uuid,integer) TO authenticated;
