-- =============================================================================
-- Slice 258 v2 — Heal: Drop handle_new_user-Trigger (Onboarding-Wizard restoren)
--
-- v1 (vor 30 Min) erstellte profile auto via auth.users-Trigger → bypassed
-- /onboarding-Wizard (useRequireProfile guard checkt nur profile-Existenz).
--
-- Korrektes Design (live seit Slice 002 Bug-Add bis 2026-04-16):
--   1. auth.users INSERT: KEIN profile-Trigger
--   2. Frontend useRequireProfile: profile == null → redirect /onboarding
--   3. Wizard: handle/displayName/avatar/language → createProfile()
--   4. profile-INSERT → cascade trg_init_user_wallet/tickets/scout_scores
--
-- Bug-Klasse 2026-04-16: nur on_auth_user_created_wallet (Baseline-Default)
-- musste gedroppt werden — der war der FK-Violation-Source. Mein v1 hat
-- den FK-Bug gelöst aber durch profile-Auto-Create eine zweite Lücke aufgemacht.
--
-- v2 Fix:
--   1. DROP Trigger on_auth_user_created (v1, war bypass)
--   2. DROP Function handle_new_user (v1, jetzt orphan)
--   3. Wallet-Bug bleibt gelöst weil on_auth_user_created_wallet (v0 baseline)
--      schon in v1 gedroppt wurde → kein Trigger mehr auf auth.users
--   4. handle_new_user_wallet Function bleibt orphan (egal, nicht aufgerufen)
--
-- Verify-Erwartung post-v2:
--   SELECT tgname FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
--   WHERE c.relname='users' AND NOT tgisinternal;  -- 0 rows
-- =============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user_wallet() IS
  'Slice 258 v2 (2026-04-29): orphan post-Bug-Fix. Wird seit v1 nicht mehr von Trigger aufgerufen. Cleanup-Slice optional.';
