-- Fix infinite recursion in fantasy_league_members SELECT policy.
--
-- Root cause:
--   The previous "members_select" policy queried fantasy_league_members
--   inside its own USING clause:
--     league_id IN (SELECT league_id FROM fantasy_league_members
--                    WHERE user_id = auth.uid())
--   Postgres re-applies the same policy on that inner SELECT, which loops
--   and PostgREST returns HTTP 500 for every client-side read.
--
-- Fix:
--   Encapsulate the membership lookup in a SECURITY DEFINER function so the
--   inner query bypasses RLS. The outer policy stays simple and references
--   the function instead of the table directly.

CREATE OR REPLACE FUNCTION public.fantasy_get_my_league_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT league_id
  FROM public.fantasy_league_members
  WHERE user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.fantasy_get_my_league_ids() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fantasy_get_my_league_ids() TO authenticated;

DROP POLICY IF EXISTS "members_select" ON public.fantasy_league_members;

CREATE POLICY "members_select" ON public.fantasy_league_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR league_id IN (SELECT public.fantasy_get_my_league_ids())
  );
