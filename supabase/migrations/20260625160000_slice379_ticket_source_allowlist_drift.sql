-- Slice 379 — credit_tickets / spend_tickets source-allowlist drift fix
--
-- Bug: both RPCs carried a hardcoded `p_source NOT IN (...)` allowlist that had
-- drifted from the TS `TicketSource` union (src/types/index.ts). 4 sources used
-- by app code raised a live 400 "Ungueltige Ticket-Quelle: post_create" and
-- silently failed (Live-Count = 0): post_create (posts.ts), research_publish +
-- research_rating (research.ts), event_entry_refund (type-only).
-- THREE drift surfaces, all reconciled to the same 16-value union here:
--   1. credit_tickets allowlist (RPC body)
--   2. spend_tickets allowlist (RPC body, kept identical)
--   3. ticket_transactions_source_check CHECK constraint (drifted independently —
--      was missing post_create/research_publish/research_rating AND chip_refund/
--      cosmetic_shop, so chip_refund would fail the CHECK even though both RPCs
--      allow it). Classic S330 4-file-sync — the live smoke caught this 3rd surface.
--
-- Fix: widen BOTH allowlists to the UNION of (RPC-legacy values) + (all TS
-- TicketSource values). Purely additive — no value removed, so no narrowing risk.
-- SSOT for the list = `TicketSource` in src/types/index.ts (keep in sync there).
-- Bodies are otherwise byte-identical to live (D87 baseline). Grants untouched:
-- CREATE OR REPLACE on an existing function preserves its ACL
-- ({service_role,authenticated}); verified post-apply via proacl (S368c).

CREATE OR REPLACE FUNCTION public.credit_tickets(
  p_user_id uuid,
  p_amount bigint,
  p_source text,
  p_reference_id uuid DEFAULT NULL::uuid,
  p_description text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_new_balance BIGINT;
  v_caller_uid UUID := auth.uid();
BEGIN
  -- Auth guard: authenticated users can only credit themselves
  IF v_caller_uid IS NOT NULL THEN
    IF p_user_id <> v_caller_uid THEN
      RAISE EXCEPTION 'Nicht berechtigt: nur eigene Tickets';
    END IF;
    -- Authenticated callers cannot use admin_grant source
    IF p_source = 'admin_grant' THEN
      RAISE EXCEPTION 'admin_grant nur fuer service_role';
    END IF;
    -- Cap per-call amount for authenticated (max 100 tickets)
    IF p_amount > 100 THEN
      RAISE EXCEPTION 'Maximale Ticket-Gutschrift pro Aufruf: 100';
    END IF;
  END IF;

  -- Allowlist = UNION(RPC-legacy, TS TicketSource). Keep in sync with
  -- `TicketSource` in src/types/index.ts (single source of truth).
  IF p_source NOT IN (
    'daily_login', 'mission', 'daily_challenge', 'achievement',
    'streak_bonus', 'mystery_box', 'event_entry', 'event_entry_refund',
    'chip_use', 'chip_refund', 'live_prediction', 'admin_grant',
    'cosmetic_shop', 'post_create', 'research_publish', 'research_rating'
  ) THEN
    RAISE EXCEPTION 'Ungueltige Ticket-Quelle: %', p_source;
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Ticket-Betrag muss positiv sein';
  END IF;

  INSERT INTO user_tickets (user_id, balance, earned_total, spent_total)
  VALUES (p_user_id, p_amount, p_amount, 0)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = user_tickets.balance + p_amount,
      earned_total = user_tickets.earned_total + p_amount,
      updated_at = now()
  RETURNING balance INTO v_new_balance;

  INSERT INTO ticket_transactions (user_id, amount, balance_after, source, reference_id, description)
  VALUES (p_user_id, p_amount, v_new_balance, p_source, p_reference_id, p_description);

  RETURN jsonb_build_object('ok', true, 'new_balance', v_new_balance);
END;
$function$;

-- Surface 3: ticket_transactions.source CHECK constraint — widen to the same union.
-- Purely additive (existing values are a subset), so no existing row violates it.
ALTER TABLE public.ticket_transactions DROP CONSTRAINT IF EXISTS ticket_transactions_source_check;
ALTER TABLE public.ticket_transactions ADD CONSTRAINT ticket_transactions_source_check
  CHECK (source IN (
    'daily_login', 'mission', 'daily_challenge', 'achievement',
    'streak_bonus', 'mystery_box', 'event_entry', 'event_entry_refund',
    'chip_use', 'chip_refund', 'live_prediction', 'admin_grant',
    'cosmetic_shop', 'post_create', 'research_publish', 'research_rating'
  ));

CREATE OR REPLACE FUNCTION public.spend_tickets(
  p_user_id uuid,
  p_amount bigint,
  p_source text,
  p_reference_id uuid DEFAULT NULL::uuid,
  p_description text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_current_balance BIGINT;
  v_new_balance BIGINT;
  v_caller_uid UUID := auth.uid();
BEGIN
  -- Auth guard: authenticated users can only spend their own tickets
  IF v_caller_uid IS NOT NULL AND p_user_id <> v_caller_uid THEN
    RAISE EXCEPTION 'Nicht berechtigt: nur eigene Tickets';
  END IF;

  -- Allowlist kept IDENTICAL to credit_tickets (no asymmetric drift).
  IF p_source NOT IN (
    'daily_login', 'mission', 'daily_challenge', 'achievement',
    'streak_bonus', 'mystery_box', 'event_entry', 'event_entry_refund',
    'chip_use', 'chip_refund', 'live_prediction', 'admin_grant',
    'cosmetic_shop', 'post_create', 'research_publish', 'research_rating'
  ) THEN
    RAISE EXCEPTION 'Ungueltige Ticket-Quelle: %', p_source;
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Ticket-Betrag muss positiv sein';
  END IF;

  SELECT balance INTO v_current_balance
  FROM user_tickets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_ticket_wallet');
  END IF;

  IF v_current_balance < p_amount THEN
    RETURN jsonb_build_object(
      'ok', false, 'error', 'insufficient_tickets',
      'current_balance', v_current_balance, 'requested', p_amount
    );
  END IF;

  UPDATE user_tickets
  SET balance = balance - p_amount,
      spent_total = spent_total + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  INSERT INTO ticket_transactions (user_id, amount, balance_after, source, reference_id, description)
  VALUES (p_user_id, -p_amount, v_new_balance, p_source, p_reference_id, p_description);

  RETURN jsonb_build_object('ok', true, 'new_balance', v_new_balance);
END;
$function$;
