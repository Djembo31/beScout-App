-- Slice 363 (E3-2c, D96/D98): Polls-Plattform-Fee (20 %) REIN in den BeScout-Topf.
-- Additiver Inline-Booking-Block (1:1 gespiegelt aus 358/360), platziert NACH dem source-IF/ELSE
-- und VOR dem ELSE-Reset im `IF v_cost > 0`-Block — deckt BEIDE source-Branches (club + user).
-- Fee-Konstante (v_cost * 80) / 100 unverändert (S356-Klasse). 'poll' im
-- platform_treasury_ledger_source_check bereits erlaubt -> keine CHECK-Migration.
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
  v_weight          SMALLINT := 1;
  v_sub_tier        TEXT;
  v_abo_weight      SMALLINT := 1;
  v_rank_weight     SMALLINT := 1;
  v_rank_tier       TEXT;
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

  -- Slice 356: Exklusives Treue-Tor — VOR jeder Wallet-Belastung (money-safe reject).
  IF v_poll.min_fan_rank_tier IS NOT NULL AND v_poll.club_id IS NOT NULL THEN
    SELECT fr.rank_tier INTO v_rank_tier FROM fan_rankings fr
    WHERE fr.user_id = p_user_id AND fr.club_id = v_poll.club_id LIMIT 1;
    IF fan_rank_tier_rank(v_rank_tier) < fan_rank_tier_rank(v_poll.min_fan_rank_tier) THEN
      RETURN jsonb_build_object('success', false, 'error', 'fan_rank_too_low');
    END IF;
    v_rank_tier := NULL;
  END IF;

  -- Slice 343: Loyalitäts-Gewicht = MAX(Abo-Bonus, Fan-Rang-Stufe). Nur bei club-bezogenem Poll.
  IF v_poll.club_id IS NOT NULL THEN
    SELECT cs.tier INTO v_sub_tier FROM club_subscriptions cs
    WHERE cs.user_id = p_user_id AND cs.club_id = v_poll.club_id
      AND cs.status = 'active' AND cs.expires_at > now() LIMIT 1;
    IF v_sub_tier IS NOT NULL THEN v_abo_weight := 2; END IF;

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
  -- Slice 356/337-Heal: 80% Creator/Treasury, 20% Plattform (CEO-approved Slice 337; live war seit 343 fälschlich 70).
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
    -- E3-2c (Slice 363): Polls-Plattform-Fee (20 %) in den BeScout-Topf — voller Auffang (D96/D98).
    -- Platziert NACH dem source-IF/ELSE -> deckt beide Branches (club + user).
    IF v_platform_share > 0 THEN
      PERFORM book_platform_treasury('credit', 'poll', v_platform_share, p_poll_id, 'Umfrage-Fee');
    END IF;
  ELSE v_creator_share := 0; v_platform_share := 0; END IF;

  INSERT INTO community_poll_votes (poll_id, user_id, option_index, amount_paid, creator_share, platform_share, weight)
  VALUES (p_poll_id, p_user_id, p_option_index, v_cost, v_creator_share, v_platform_share, v_weight);
  v_option := v_options -> p_option_index;
  v_option := jsonb_set(v_option, '{votes}', to_jsonb(COALESCE((v_option ->> 'votes')::int, 0) + v_weight));
  v_options := jsonb_set(v_options, ARRAY[p_option_index::text], v_option);
  UPDATE community_polls SET options = v_options, total_votes = total_votes + v_weight, creator_earned = creator_earned + v_creator_share WHERE id = p_poll_id;
  RETURN jsonb_build_object('success', true, 'total_votes', v_poll.total_votes + v_weight, 'cost', v_cost, 'creator_share', v_creator_share, 'weight', v_weight);
END;
$function$;

-- AR-44: CREATE OR REPLACE resettet Grants -> SEC-DEFINER-RPC neu absichern.
REVOKE EXECUTE ON FUNCTION public.cast_community_poll_vote(uuid, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cast_community_poll_vote(uuid, uuid, integer) TO authenticated;
