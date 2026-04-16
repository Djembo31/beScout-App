-- =============================================================================
-- Slice 002 — wallets.user_id FK auf profiles.id ON DELETE CASCADE (2026-04-16)
--
-- Befund (Slice 001 INV-16): 2 Orphan-Wallets (keine matching profile-Row):
--   1. `9e0edfed` (taki.okuyucu@gmx.de): Abandoned signup, nie wieder eingeloggt,
--      balance=1_000_000 (Baseline-Default), 0 Aktivitaet → Wallet DELETE.
--   2. `862c96a1` (testtrading@bescout.test): Test-Account, balance=1_100_000,
--      2 Transactions aber 0 Holdings/Orders/Trades → Profile BACKFILL mit
--      is_demo=true (CEO-Entscheidung 2026-04-16: behalten fuer Dev-Zwecke).
--
-- wallets hatte aktuell KEIN FK — nur PK auf user_id. Profile-Delete waere
-- silent-orphan. Dieser Slice schliesst die Luecke.
--
-- CEO-approved 2026-04-16 (Option B, modified: testtrading erhalten).
--
-- Kein REVOKE-Block noetig (reine DDL, keine neue FUNCTION).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Step 1: Profile-Backfill fuer Test-Account 862c96a1 (testtrading@bescout.test)
-- -----------------------------------------------------------------------------
-- is_demo=true markiert ihn explizit als Dev-/Test-Account. handle und
-- display_name sind deterministisch aus der Email ableitbar.
INSERT INTO public.profiles (id, handle, display_name, is_demo, language, plan, level, verified)
  SELECT
    u.id,
    'testtrading',
    'Test Trading Account',
    TRUE,
    'de',
    'Free',
    1,
    FALSE
  FROM auth.users u
  WHERE u.email = 'testtrading@bescout.test'
    AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
  ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Step 2: Orphan-Wallet-Delete fuer alle die NACH Backfill noch ohne profile sind
--         (erwartet: 1 Row, User 9e0edfed)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_orphan_count INT;
  v_orphan_balance BIGINT;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(w.balance), 0)
  INTO v_orphan_count, v_orphan_balance
  FROM public.wallets w
  LEFT JOIN public.profiles p ON p.id = w.user_id
  WHERE p.id IS NULL;

  RAISE NOTICE 'Orphan wallets to delete: % (sum balance: % cents)', v_orphan_count, v_orphan_balance;
END $$;

DELETE FROM public.wallets
WHERE user_id NOT IN (SELECT id FROM public.profiles);

-- -----------------------------------------------------------------------------
-- Step 3: FK-Constraint mit CASCADE
-- -----------------------------------------------------------------------------
ALTER TABLE public.wallets
  ADD CONSTRAINT wallets_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

COMMENT ON CONSTRAINT wallets_user_id_profiles_fkey ON public.wallets IS
  'Slice 002 (2026-04-16): wallets.user_id FK auf profiles.id ON DELETE CASCADE. Verhindert Orphan-Wallets nach Profile-Delete.';
