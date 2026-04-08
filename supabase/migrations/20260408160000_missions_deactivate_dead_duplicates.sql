-- ============================================================================
-- Missions: Deactivate dead duplicate definitions
-- Date: 2026-04-08
-- ============================================================================
--
-- Discovery (2026-04-08 audit): 3 mission_definitions are dead duplicates of
-- actively triggered missions. They are never incremented because the code
-- path triggers the sibling key. Deactivating avoids showing assigned-but-
-- never-completable missions to users.
--
-- Duplicates (kept | deactivated):
--   - create_post     | weekly_3_posts   (both weekly, target=3, same intent)
--   - write_research  | weekly_research  (both weekly, target=1, same intent)
--
-- Dead missions (no code trigger, no near-term plan):
--   - daily_visit_players  (would need page-visit tracking)
--   - weekly_diverse       (would need holdings diversity counter)
--   - weekly_follow_3      (would need weekly follow counter — daily follow_user exists)
--
-- Deactivation is non-destructive: active=false → new user_missions rows
-- stop being assigned, but historical progress stays queryable.
-- ============================================================================

UPDATE public.mission_definitions
SET active = false
WHERE key IN (
  'weekly_3_posts',
  'weekly_research',
  'daily_visit_players',
  'weekly_diverse',
  'weekly_follow_3'
);

-- Verify: should affect 5 rows
DO $$
DECLARE
  deactivated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO deactivated_count
  FROM public.mission_definitions
  WHERE key IN (
    'weekly_3_posts',
    'weekly_research',
    'daily_visit_players',
    'weekly_diverse',
    'weekly_follow_3'
  ) AND active = false;

  IF deactivated_count != 5 THEN
    RAISE EXCEPTION 'Expected 5 deactivated missions, found %', deactivated_count;
  END IF;
END $$;
