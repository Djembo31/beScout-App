-- Slice 046 — A-04 Live-Ledger-Health Reconciliation
-- Spec: worklog/specs/046-a04-ledger-health.md
-- Date: 2026-04-18
--
-- PROBLEM:
-- 69 wallets haben SUM(transactions.amount) != wallets.balance (total 2.887M cents drift).
-- Analyse: Alle 69 User sind Dev/Test/Demo-Accounts (profile_created 2026-02-10 bis 2026-04-11).
-- Drift entstand vor Slice 022 Welcome-Bonus-Flow — initial wallet.balance wurde gesetzt
-- OHNE compensating transactions-row.
--
-- FIX:
-- Pro drifted User eine compensating tx einfuegen mit:
--   type = 'welcome_bonus' (konsistent mit claimed-welcome flow seit Slice 022)
--   amount = drift (immer positiv: wallet > sum(tx))
--   balance_after = drift (chronologisch EHRSTE tx)
--   created_at = MIN(existing_tx.created_at) - 1 second (oder profiles.created_at falls keine tx)
--
-- IDEMPOTENZ:
-- Zweiter Apply macht 0 Rows (weil drift=0 nach erstem Apply).
-- WHERE drift > 0 filtert automatisch.

INSERT INTO transactions (user_id, type, amount, balance_after, description, created_at)
SELECT
  w.user_id,
  'welcome_bonus',
  (w.balance - COALESCE((SELECT SUM(amount) FROM transactions WHERE user_id = w.user_id), 0))::BIGINT AS amount,
  (w.balance - COALESCE((SELECT SUM(amount) FROM transactions WHERE user_id = w.user_id), 0))::BIGINT AS balance_after,
  'Historical ledger reconciliation — pre-Slice-022 dev setup drift (Slice 046 A-04)',
  COALESCE(
    (SELECT MIN(created_at) FROM transactions WHERE user_id = w.user_id) - interval '1 second',
    (SELECT created_at FROM profiles WHERE id = w.user_id)
  )
FROM wallets w
WHERE (w.balance - COALESCE((SELECT SUM(amount) FROM transactions WHERE user_id = w.user_id), 0)) > 0;
