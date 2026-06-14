-- Slice 323 — Ticket-Ledger-Reconciliation (P1-Demo Gamif #3, money-adjacent Data-Fix)
-- 1 User (99b601d2): user_tickets.balance=70, SUM(ticket_transactions.amount)=65 → +5 Drift.
-- Investigation: 14× +5 daily_login + 1× -5 event_entry über 1 Monat; balance_after-Progression
-- endet bei 70 (= balance); eine daily_login-Race ließ balance_after 35→45 springen ohne passende
-- amount-Zeile. → balance (70) ist die gelebte Wahrheit; der Ledger ist um +5 unvollständig.
-- Fix: +5 Reconciliation-Ledger-Zeile (source='admin_grant'), KEINE Reduktion der balance.
-- Anil-OK 2026-06-14. Idempotent: nur INSERT wenn balance > SUM(amount).

DO $$
DECLARE
  v_uid uuid := '99b601d2-ca72-4c36-8048-bdc563612cc3';
  v_balance integer;
  v_ledger  integer;
  v_diff    integer;
BEGIN
  SELECT balance INTO v_balance FROM user_tickets WHERE user_id = v_uid;
  IF v_balance IS NULL THEN
    RAISE NOTICE 'Slice 323: user_tickets row for % not found — skip', v_uid;
    RETURN;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_ledger FROM ticket_transactions WHERE user_id = v_uid;
  v_diff := v_balance - v_ledger;

  IF v_diff > 0 THEN
    INSERT INTO ticket_transactions (user_id, amount, balance_after, source, description)
    VALUES (
      v_uid, v_diff, v_balance, 'admin_grant',
      'Slice 323 reconciliation: ledger was short by ' || v_diff ||
      ' vs balance (balance was truth; daily_login race). No tickets added to balance.'
    );
    RAISE NOTICE 'Slice 323: inserted +% reconciliation for % (ledger %→%)', v_diff, v_uid, v_ledger, v_balance;
  ELSE
    RAISE NOTICE 'Slice 323: no positive drift for % (balance=%, ledger=%) — idempotent skip', v_uid, v_balance, v_ledger;
  END IF;
END $$;
