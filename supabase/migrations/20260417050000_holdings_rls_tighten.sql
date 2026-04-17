-- =============================================================================
-- Slice 014 — Holdings RLS Tighten (AUTH-08) — 2026-04-17
--
-- Replaces `holdings_select_all_authenticated` (qual = true) with an
-- access-scoped policy: own holdings, OR caller is club admin, OR caller
-- is platform admin.
--
-- Motivation: AUTH-08 (rls-checks.test.ts:167) failed because any
-- authenticated user could enumerate every holdings row (portfolio leak).
-- CEO approved Option 2 on 2026-04-17: tighten to (own | club_admin |
-- platform_admin) and wrap cross-user read paths in SECURITY DEFINER RPCs.
--
-- Writes: still blocked at the client (no INSERT/UPDATE/DELETE policy);
-- all mutations go through SECURITY DEFINER RPCs (buy_player_sc, etc.).
-- This migration does not touch those policies.
--
-- Audit helpers:
--   - INV-19 (RLS coverage): unchanged, table still has RLS enabled.
--   - INV-20 (critical-table whitelist): expects 'SELECT' — satisfied, 1
--     SELECT policy remains.
-- =============================================================================

-- Drop the permissive SELECT policy
DROP POLICY IF EXISTS holdings_select_all_authenticated ON public.holdings;

-- New scoped policy
CREATE POLICY holdings_select_own_or_admin
  ON public.holdings
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.club_admins    ca WHERE ca.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = auth.uid())
  );

COMMENT ON POLICY holdings_select_own_or_admin ON public.holdings IS
  'Slice 014 (2026-04-17): tightens from qual=true. Users see own rows; club_admins + platform_admins keep Fan-Analytics visibility. Cross-user non-admin reads (getPlayerHolderCount) use get_player_holder_count SECURITY DEFINER RPC.';
