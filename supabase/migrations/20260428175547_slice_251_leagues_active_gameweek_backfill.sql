-- Slice 251 — Spieltag Liga-Scope-Reform · Wave 1 Track A
-- Purpose: Backfill leagues.active_gameweek from MIN(clubs.active_gameweek)
--          per league_id, so leagues becomes the single-source-of-truth
--          for the Spieltag-UI and Service-Layer (rewrite of
--          getLeagueActiveGameweek in Track B).
--
-- Background: clubs.active_gameweek was the de-facto SOT until now,
-- aggregated via MIN() in the service layer. This is a per-league
-- async-cycle bug (BL=GW10, TR=GW8 → globalMin=8 displayed everywhere).
-- leagues.active_gameweek already exists (Migration 20260413180000)
-- but was initialized to 1 and never updated. Cron-Owner extension
-- (Dual-Write) lives in src/app/api/cron/gameweek-sync/route.ts.
--
-- Idempotent: safe to re-run. Only updates rows where leagues' value
-- differs from clubs' current MIN.
--
-- Post-Apply Verify (run via mcp__supabase__execute_sql):
--   SELECT l.id, l.name, l.active_gameweek AS league_gw,
--          MIN(c.active_gameweek) AS clubs_min_gw
--   FROM leagues l
--   LEFT JOIN clubs c ON c.league_id = l.id
--   WHERE l.is_active = true
--   GROUP BY l.id, l.name, l.active_gameweek
--   HAVING l.active_gameweek != MIN(c.active_gameweek)
--      AND MIN(c.active_gameweek) IS NOT NULL;
-- Expected: 0 rows.

-- Backfill: per-league, take MIN(clubs.active_gameweek) where clubs exist.
-- COALESCE-safety: if a league has no clubs yet, keep current value
-- (do not touch — UPDATE FROM only writes rows where the JOIN finds clubs).
UPDATE public.leagues l
SET active_gameweek = sub.min_gw
FROM (
  SELECT league_id, MIN(active_gameweek) AS min_gw
  FROM public.clubs
  WHERE league_id IS NOT NULL
    AND active_gameweek IS NOT NULL
  GROUP BY league_id
) sub
WHERE l.id = sub.league_id
  AND COALESCE(l.active_gameweek, -1) IS DISTINCT FROM sub.min_gw;
