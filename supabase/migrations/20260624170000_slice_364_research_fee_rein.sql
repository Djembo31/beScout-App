-- Slice 364 (E3-2d, D96/D98): Research-Plattform-Fee (20 %) REIN in den BeScout-Topf.
-- Additiver Inline-Booking-Block (1:1 gespiegelt aus 358/360/363), platziert NACH dem
-- transactions-INSERT und VOR dem success-RETURN in `unlock_research` (Single-Path).
-- Fee-Konstante (v_price * 80) / 100 unverändert (S356-Klasse). 'research' im
-- platform_treasury_ledger_source_check bereits erlaubt -> keine CHECK-Migration.
CREATE OR REPLACE FUNCTION public.unlock_research(p_user_id uuid, p_research_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_post       RECORD;
  v_price      BIGINT;
  v_author_share BIGINT;
  v_platform_fee BIGINT;
  v_buyer_balance BIGINT;
  v_author_balance BIGINT;
  v_already    BOOLEAN;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;
  SELECT id, user_id, price INTO v_post FROM research_posts WHERE id = p_research_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Bericht nicht gefunden'); END IF;
  IF v_post.user_id = p_user_id THEN RETURN jsonb_build_object('success', false, 'error', 'Eigenen Bericht kann man nicht freischalten'); END IF;
  SELECT EXISTS(SELECT 1 FROM research_unlocks WHERE research_id = p_research_id AND user_id = p_user_id) INTO v_already;
  IF v_already THEN RETURN jsonb_build_object('success', false, 'error', 'Bereits freigeschaltet'); END IF;
  v_price := v_post.price;
  v_author_share := (v_price * 80) / 100;
  v_platform_fee := v_price - v_author_share;
  SELECT balance INTO v_buyer_balance FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND OR (v_buyer_balance - COALESCE((SELECT locked_balance FROM wallets WHERE user_id = p_user_id), 0)) < v_price THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nicht genug BSD');
  END IF;
  UPDATE wallets SET balance = balance - v_price, updated_at = now() WHERE user_id = p_user_id;
  SELECT balance INTO v_author_balance FROM wallets WHERE user_id = v_post.user_id FOR UPDATE;
  IF FOUND THEN UPDATE wallets SET balance = balance + v_author_share, updated_at = now() WHERE user_id = v_post.user_id; END IF;
  INSERT INTO research_unlocks (research_id, user_id, amount_paid, author_earned, platform_fee)
  VALUES (p_research_id, p_user_id, v_price, v_author_share, v_platform_fee);
  UPDATE research_posts SET unlock_count = unlock_count + 1, total_earned = total_earned + v_author_share, updated_at = now() WHERE id = p_research_id;
  INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description) VALUES
    (p_user_id, 'research_unlock', -v_price, v_buyer_balance - v_price, p_research_id, 'Bericht freigeschaltet'),
    (v_post.user_id, 'research_earn', v_author_share, v_author_balance + v_author_share, p_research_id, 'Bericht-Einnahme');
  -- Slice 364 (E3-2d): Research-Plattform-Fee (20 %) in den BeScout-Topf -- voller Auffang (D96/D98)
  IF v_platform_fee > 0 THEN
    PERFORM book_platform_treasury('credit', 'research', v_platform_fee, p_research_id, 'Research-Fee');
  END IF;
  RETURN jsonb_build_object('success', true, 'amount_paid', v_price, 'author_earned', v_author_share, 'platform_fee', v_platform_fee);
END;
$function$;

-- AR-44: CREATE OR REPLACE resettet Grants -> REVOKE/GRANT erneuern.
REVOKE EXECUTE ON FUNCTION public.unlock_research(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unlock_research(uuid, uuid) TO authenticated;
