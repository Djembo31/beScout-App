-- Slice 333 — Polls P1: Erstellung + Quellen-Identität + Treasury-REIN-Routing + Follower-Tor
-- Money/CEO-Scope. Kanon: docs/knowledge/domain/polls.md (D86) + treasury.md (D83).
-- Source-of-truth Vorgänger: cast_community_poll_vote (live pg_get_functiondef 2026-06-18),
--   get_club_balance (Slice 330b), book_club_treasury (Slice 329).
-- Entscheidungen (Anil 2026-06-18): volles P1 · Follower-Schwelle 50 · cost-Cap 100.000 cents ·
--   Geld-Routing keyt auf community_polls.source (NICHT club_id) — Identitäts-Grenze §3.
-- platform_share (30%) bleibt bewusst unverbucht = impliziter Burn (ADR-026 deflationär),
--   identisch zum heutigen User-Poll-Verhalten; nur 70% Creator-Anteil fließt (Wallet bzw. Treasury).

-- ============================================================
-- 1. community_polls: Quellen-Diskriminante (analog events.type, Slice 331)
-- ============================================================
ALTER TABLE public.community_polls
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'user';

ALTER TABLE public.community_polls
  DROP CONSTRAINT IF EXISTS community_polls_source_check;
ALTER TABLE public.community_polls
  ADD CONSTRAINT community_polls_source_check CHECK (source IN ('club', 'user'));

COMMENT ON COLUMN public.community_polls.source IS
  'Slice 333: Geld-Routing-Achse. ''club'' = offizielle Vereins-Umfrage (an club_admins gebunden, 70%% -> Treasury via poll_revenue). ''user'' = User-Umfrage (70%% -> Creator-Wallet). NICHT club_id — das ist nur Bezug/Tag.';

-- ============================================================
-- 2. club_treasury_ledger CHECK: poll_revenue als CREDIT-Typ (additiv, Slice 330/332-Falle vermeiden)
--    (vorhandenes 'poll_reward' war fälschlich als DEBIT/RAUS gedacht — D86; wir führen den
--     korrekten REIN-Credit-Typ ein. 'poll_reward' bleibt im CHECK, ungenutzt.)
-- ============================================================
ALTER TABLE public.club_treasury_ledger
  DROP CONSTRAINT IF EXISTS club_treasury_ledger_type_check;
ALTER TABLE public.club_treasury_ledger
  ADD CONSTRAINT club_treasury_ledger_type_check CHECK (type = ANY (ARRAY[
    'trade_fee', 'ipo_fee', 'p2p_fee', 'subscription', 'opening_trade_fees',
    'opening_subscription', 'deposit', 'withdrawal', 'csf', 'fan_reward',
    'event_prize', 'poll_reward', 'bounty', 'poll_revenue'
  ]));

-- ============================================================
-- 3. create_community_poll — die fehlende Tür (Money/Security)
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_community_poll(
  p_user_id       uuid,
  p_question      text,
  p_options       jsonb,
  p_cost_bsd      bigint,
  p_duration_days integer,
  p_source        text,
  p_club_id       uuid DEFAULT NULL,
  p_description   text DEFAULT NULL
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
    (created_by, question, description, options, cost_bsd, ends_at, source, club_id, status)
  VALUES
    (p_user_id, trim(p_question), v_desc, v_norm_options, p_cost_bsd, v_ends_at, p_source, p_club_id, 'active')
  RETURNING id INTO v_poll_id;

  RETURN jsonb_build_object('success', true, 'poll_id', v_poll_id);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_community_poll(uuid, text, jsonb, bigint, integer, text, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_community_poll(uuid, text, jsonb, bigint, integer, text, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_community_poll(uuid, text, jsonb, bigint, integer, text, uuid, text) TO authenticated;

-- ============================================================
-- 4. cast_community_poll_vote — Geld-Routing-Branch (source='club' -> Treasury REIN)
--    Source-of-truth = live pg_get_functiondef 2026-06-18. Nur Creator-Share-Routing geändert;
--    Voter-Deduktion + Validierungen + Vote-Insert + Options-Update byte-identisch erhalten.
-- ============================================================
CREATE OR REPLACE FUNCTION public.cast_community_poll_vote(
  p_user_id uuid,
  p_poll_id uuid,
  p_option_index integer
)
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
  v_cost := v_poll.cost_bsd;
  v_creator_share := (v_cost * 70) / 100;
  v_platform_share := v_cost - v_creator_share;  -- impliziter Burn (nicht verbucht), wie heute
  IF v_cost > 0 THEN
    SELECT balance INTO v_voter_balance FROM wallets WHERE user_id = p_user_id FOR UPDATE;
    IF NOT FOUND OR (v_voter_balance - COALESCE((SELECT locked_balance FROM wallets WHERE user_id = p_user_id), 0)) < v_cost THEN
      RETURN jsonb_build_object('success', false, 'error', 'Nicht genug BSD');
    END IF;
    UPDATE wallets SET balance = balance - v_cost, updated_at = now() WHERE user_id = p_user_id;

    IF v_poll.source = 'club' AND v_poll.club_id IS NOT NULL THEN
      -- REIN: Creator-Anteil in die Vereins-Treasury (Slice 333). Kein poll_earn an eine Person.
      PERFORM public.book_club_treasury(
        v_poll.club_id, 'credit', 'poll_revenue', v_creator_share,
        p_poll_id, 'Umfrage-Einnahme: ' || left(v_poll.question, 50)
      );
      INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description) VALUES
        (p_user_id, 'poll_vote_cost', -v_cost, v_voter_balance - v_cost, p_poll_id, 'Umfrage: ' || left(v_poll.question, 50));
    ELSE
      -- Defense-in-Depth (Reviewer NIT #1): eine source='club'-Umfrage MUSS club_id haben
      -- (create-RPC erzwingt das). Erreicht eine club-Umfrage ohne club_id diesen Wallet-Zweig,
      -- niemals still ins Privat-Wallet zahlen — laut scheitern.
      IF v_poll.source = 'club' THEN
        RAISE EXCEPTION 'club_poll_missing_club_id: Vereins-Umfrage ohne club_id';
      END IF;
      -- User-Umfrage: Creator-Anteil ins Creator-Wallet (unverändert).
      SELECT balance INTO v_creator_balance FROM wallets WHERE user_id = v_poll.created_by FOR UPDATE;
      IF FOUND THEN UPDATE wallets SET balance = balance + v_creator_share, updated_at = now() WHERE user_id = v_poll.created_by; END IF;
      INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description) VALUES
        (p_user_id, 'poll_vote_cost', -v_cost, v_voter_balance - v_cost, p_poll_id, 'Umfrage: ' || left(v_poll.question, 50)),
        (v_poll.created_by, 'poll_earn', v_creator_share, COALESCE(v_creator_balance, 0) + v_creator_share, p_poll_id, 'Umfrage-Einnahme: ' || left(v_poll.question, 50));
    END IF;
  ELSE v_creator_share := 0; v_platform_share := 0; END IF;
  INSERT INTO community_poll_votes (poll_id, user_id, option_index, amount_paid, creator_share, platform_share)
  VALUES (p_poll_id, p_user_id, p_option_index, v_cost, v_creator_share, v_platform_share);
  v_option := v_options -> p_option_index;
  v_option := jsonb_set(v_option, '{votes}', to_jsonb(COALESCE((v_option ->> 'votes')::int, 0) + 1));
  v_options := jsonb_set(v_options, ARRAY[p_option_index::text], v_option);
  UPDATE community_polls SET options = v_options, total_votes = total_votes + 1, creator_earned = creator_earned + v_creator_share WHERE id = p_poll_id;
  RETURN jsonb_build_object('success', true, 'total_votes', v_poll.total_votes + 1, 'cost', v_cost, 'creator_share', v_creator_share);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.cast_community_poll_vote(uuid, uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cast_community_poll_vote(uuid, uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.cast_community_poll_vote(uuid, uuid, integer) TO authenticated;

-- ============================================================
-- 5. get_club_balance — poll_revenue in total_earned-Breakdown (available war bereits korrekt)
--    Source-of-truth = Slice 330b live-Body.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_club_balance(p_club_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_is_club_admin boolean;
  v_is_platform_admin boolean;
  v_trade_fees bigint;
  v_sub_revenue bigint;
  v_poll_revenue bigint;
  v_total_earned bigint;
  v_total_withdrawn bigint;
  v_ledger_net bigint;
  v_total_debited bigint;
  v_csf_paid bigint;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'auth_required: Nicht authentifiziert'; END IF;
  SELECT EXISTS(SELECT 1 FROM club_admins WHERE club_id = p_club_id AND user_id = v_caller) INTO v_is_club_admin;
  SELECT EXISTS(SELECT 1 FROM platform_admins WHERE user_id = v_caller) INTO v_is_platform_admin;
  IF NOT (v_is_club_admin OR v_is_platform_admin) THEN
    RAISE EXCEPTION 'not_authorized: Kein Club-Admin oder Platform-Admin';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_trade_fees FROM club_treasury_ledger
    WHERE club_id = p_club_id AND direction = 'credit'
      AND type IN ('trade_fee','ipo_fee','p2p_fee','opening_trade_fees');
  SELECT COALESCE(SUM(amount), 0) INTO v_sub_revenue FROM club_treasury_ledger
    WHERE club_id = p_club_id AND direction = 'credit'
      AND type IN ('subscription','opening_subscription');
  SELECT COALESCE(SUM(amount), 0) INTO v_poll_revenue FROM club_treasury_ledger
    WHERE club_id = p_club_id AND direction = 'credit' AND type = 'poll_revenue';
  v_total_earned := v_trade_fees + v_sub_revenue + v_poll_revenue;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_debited FROM club_treasury_ledger
    WHERE club_id = p_club_id AND direction = 'debit';
  SELECT COALESCE(SUM(amount), 0) INTO v_csf_paid FROM club_treasury_ledger
    WHERE club_id = p_club_id AND direction = 'debit' AND type = 'csf';

  SELECT COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END), 0)
    INTO v_ledger_net FROM club_treasury_ledger WHERE club_id = p_club_id;

  SELECT COALESCE(SUM(amount_cents), 0) INTO v_total_withdrawn FROM club_withdrawals
    WHERE club_id = p_club_id AND status IN ('pending','approved','paid');

  RETURN json_build_object(
    'total_earned', v_total_earned,
    'trade_fees', v_trade_fees,
    'sub_revenue', v_sub_revenue,
    'poll_revenue', v_poll_revenue,
    'total_withdrawn', v_total_withdrawn,
    'csf_paid', v_csf_paid,
    'total_debited', v_total_debited,
    'available', v_ledger_net - v_total_withdrawn
  );
END; $function$;

REVOKE EXECUTE ON FUNCTION public.get_club_balance(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_club_balance(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_club_balance(uuid) TO authenticated;
