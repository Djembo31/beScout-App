-- =============================================================================
-- Slice 014 — get_player_holder_count RPC (2026-04-17)
--
-- Replaces the direct holdings-count query in wallet.ts
-- (`getPlayerHolderCount`). With Slice 014's tight RLS on holdings, a
-- regular (non-admin) authenticated user can no longer read other users'
-- holdings directly — the count query would collapse to own-user-only
-- rows. This RPC bypasses RLS via SECURITY DEFINER and returns the
-- distinct holder count for a given player.
--
-- Guards:
--   - SECURITY DEFINER bypasses RLS on holdings
--   - auth.uid() IS NOT NULL → anon blocked at body level
--   - REVOKE anon + GRANT authenticated (AR-44 template)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_player_holder_count(p_player_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT COUNT(DISTINCT user_id)::integer
  FROM public.holdings
  WHERE player_id = p_player_id
    AND quantity > 0;
$$;

REVOKE EXECUTE ON FUNCTION public.get_player_holder_count(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_player_holder_count(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_player_holder_count(uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_player_holder_count(uuid) TO service_role;

COMMENT ON FUNCTION public.get_player_holder_count(uuid) IS
  'Slice 014 (2026-04-17): Distinct holder count for a player. SECURITY DEFINER because Slice 014 scoped holdings SELECT to (own | club_admin | platform_admin); this RPC is the authenticated-user cross-count path.';
