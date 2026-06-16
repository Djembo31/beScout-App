-- Slice 329b — Same-Session-Heal (v1→v2) von book_club_treasury.
-- v1 (slice_329) las den vorherigen Saldo als „letzte balance_after" via ORDER BY created_at DESC, id DESC.
-- Bug: created_at (= now()) ist bei mehreren Buchungen in EINER Transaktion gleich; uuid-id ist KEIN
-- Insert-Order-Tiebreaker → falsche prev-Lesung bei same-txn Multi-Booking. Das trifft künftige
-- CSF-/Fan-Reward-Airdrops (N Debits, 1 Club, 1 TX). Backfill (2 rows/Club) war zufällig safe
-- (Insert #2 sah nur Insert #1). Fix: Saldo = SUM(ledger) unter clubs-FOR-UPDATE — race-frei + robust.
-- Bestandsdaten korrekt (kein Repair). Siehe .claude/rules/errors-db.md „Bank-Ledger balance_after".
CREATE OR REPLACE FUNCTION public.book_club_treasury(
  p_club_id uuid, p_direction text, p_type text, p_amount bigint,
  p_ref uuid DEFAULT NULL, p_desc text DEFAULT NULL
) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_prev bigint; v_after bigint;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RETURN NULL; END IF;
  PERFORM 1 FROM clubs WHERE id = p_club_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'book_club_treasury: club % nicht gefunden', p_club_id; END IF;
  SELECT COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END), 0)
    INTO v_prev FROM club_treasury_ledger WHERE club_id = p_club_id;
  v_after := v_prev + (CASE WHEN p_direction = 'debit' THEN -p_amount ELSE p_amount END);
  INSERT INTO club_treasury_ledger (club_id, direction, type, amount, balance_after, reference_id, description)
  VALUES (p_club_id, p_direction, p_type, p_amount, v_after, p_ref, p_desc);
  RETURN v_after;
END; $$;
REVOKE ALL ON FUNCTION public.book_club_treasury(uuid,text,text,bigint,uuid,text) FROM PUBLIC, anon, authenticated;
