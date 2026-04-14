-- =============================================================================
-- AR-50b (J7, 2026-04-15) — Streak Excess Reversal + Backfill
--
-- SCOPE:
--   1. Reverse excess wallet-credits fuer die 2 live-exploiteten User
--   2. Backfill streak_milestones_claimed mit den 6 legitimen Claims
--      (damit AR-50 RPC-Fix die korrekten Claims als "already claimed" erkennt)
--
-- LIVE-DATEN (SELECT type='streak_reward' FROM transactions 2026-04-15):
--   46535ade: 3-day (2026-03-17) + 7-day (2026-03-21)      → 2 legit
--   535bbcaf: 3-day (2026-04-05) + 7-day (2026-04-09)      → 2 legit
--   99b601d2: 3-day 2x (2026-03-15 22:58:48.117 + .120)    → 1 legit + 1 excess (race)
--   700c1316: 3-day 2x (2026-04-03 + 2026-04-09)           → 1 legit + 1 excess (rebuild)
--
-- REVERSAL:
--   2 User × 10000c = 20000c (200 $SCOUT) excess wird aus wallet.balance abgezogen.
--   transactions-audit-row dokumentiert reversal.
--
-- BACKFILL: 6 Rows in streak_milestones_claimed (unique user_id+milestone).
-- =============================================================================

-- 1. Reversal: Excess-Balance abziehen fuer 2 User (jeweils 10000c)
UPDATE public.wallets SET balance = balance - 10000, updated_at = now()
WHERE user_id = '99b601d2-ca72-4c36-8048-bdc563612cc3';

INSERT INTO public.transactions (user_id, type, amount, balance_after, description)
VALUES (
  '99b601d2-ca72-4c36-8048-bdc563612cc3',
  'admin_adjustment',
  -10000,
  (SELECT balance FROM public.wallets WHERE user_id = '99b601d2-ca72-4c36-8048-bdc563612cc3'),
  'AR-50 Reversal: double-claim 3-day streak milestone (3ms race 2026-03-15 22:58:48.120691)'
);

UPDATE public.wallets SET balance = balance - 10000, updated_at = now()
WHERE user_id = '700c1316-11e1-4ee4-a7b9-a0c676106167';

INSERT INTO public.transactions (user_id, type, amount, balance_after, description)
VALUES (
  '700c1316-11e1-4ee4-a7b9-a0c676106167',
  'admin_adjustment',
  -10000,
  (SELECT balance FROM public.wallets WHERE user_id = '700c1316-11e1-4ee4-a7b9-a0c676106167'),
  'AR-50 Reversal: re-claim 3-day streak milestone after drop-rebuild (2026-04-09 08:57:46)'
);

-- 2. Backfill streak_milestones_claimed (UNIQUE user_id, milestone)
INSERT INTO public.streak_milestones_claimed (user_id, milestone, reward_cents, claimed_at) VALUES
  ('46535ade-4db2-4866-8dfa-b8a8bcdbd933', 3, 10000, '2026-03-17 09:22:42.47678+00'),
  ('46535ade-4db2-4866-8dfa-b8a8bcdbd933', 7, 50000, '2026-03-21 13:13:24.051183+00'),
  ('535bbcaf-f33c-4c66-8861-b15cbff2e136', 3, 10000, '2026-04-05 16:56:54.159458+00'),
  ('535bbcaf-f33c-4c66-8861-b15cbff2e136', 7, 50000, '2026-04-09 14:19:09.975007+00'),
  ('99b601d2-ca72-4c36-8048-bdc563612cc3', 3, 10000, '2026-03-15 22:58:48.117043+00'),
  ('700c1316-11e1-4ee4-a7b9-a0c676106167', 3, 10000, '2026-04-03 00:22:27.867088+00')
ON CONFLICT (user_id, milestone) DO NOTHING;
