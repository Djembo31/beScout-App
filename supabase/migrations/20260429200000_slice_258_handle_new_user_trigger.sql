-- =============================================================================
-- Slice 258 — Beta-Blocker P0 Fix: Signup-Trigger handle_new_user (2026-04-29)
--
-- Bug-Klasse: kein Trigger erstellt profiles-Row bei auth.users INSERT.
--   Existing Trigger on_auth_user_created_wallet (Baseline-Default) inserted
--   wallet direkt aus auth.users → FK wallets_user_id_profiles_fkey (Slice 002,
--   2026-04-16) blockt mit SQLSTATE 23503 → Signup 500.
--
--   Latent seit 2026-04-16 (FK-Add). Erste Real-Signup-Versuche 2026-04-29 von
--   Beta-Testern haben den Bug aufgedeckt.
--
-- Fix:
--   1. NEW Function handle_new_user() — INSERT profile mit safe-handle aus
--      UUID-prefix (User kann später renamen). SECURITY DEFINER + search_path.
--   2. NEW Trigger on_auth_user_created AFTER INSERT ON auth.users.
--      Cascade-fires die existing profile-Triggers (init_user_wallet,
--      init_user_tickets, fn_create_scout_scores_on_profile).
--   3. DROP Trigger on_auth_user_created_wallet (Baseline-Default, war source
--      des FK-Violations). Die wallet wird jetzt korrekt via init_user_wallet
--      ON profiles INSERT erstellt (J1-03 design 2026-04-15).
--   4. handle_new_user_wallet Function bleibt als Tot-Code (kann später
--      gedroppt werden) — aktuell von keinem Trigger mehr aufgerufen.
--
-- CTO-Scope: pure Bug-Fix-Restoration (J1-03 design ist live-correct, fehlte
-- nur der profile-creation-Trigger). Kein Money-Path-Behavior-Change.
-- =============================================================================

-- Step 1: handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_handle TEXT;
BEGIN
  -- Default handle aus UUID-prefix — UUID ist global-eindeutig, prefix-Kollision
  -- in 8 chars von 124 profiles ist astronomisch unwahrscheinlich. User kann
  -- in Onboarding renamen.
  v_handle := 'user_' || substring(NEW.id::text, 1, 8);

  INSERT INTO public.profiles (id, handle, language)
  VALUES (NEW.id, v_handle, 'de')
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Slice 258 (2026-04-29): Profile-creation-Trigger bei auth.users INSERT. Cascade-fires via trg_init_user_wallet/tickets/scout_scores. Default-handle aus UUID-prefix.';

-- Step 2: Replace bad trigger with good one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_created_wallet ON auth.users;

-- Note: handle_new_user_wallet() function bleibt vorhanden aber un-attached.
-- Cleanup-Slice optional post-Beta — function-Drop hat keinen Effekt mehr da
-- kein Trigger sie mehr aufruft.
