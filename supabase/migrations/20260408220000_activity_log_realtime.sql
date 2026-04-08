-- ============================================
-- Enable Supabase Realtime for activity_log
-- Date: 2026-04-08 (evening)
--
-- The Following Feed on the home page currently relies on a 2-minute
-- staleTime to pick up new scout activity. We want live updates so users
-- see a "X neue Aktivitäten"-Pill as soon as someone they follow does
-- something visible (trade, research post, scouting bounty, etc.).
--
-- Two things are required:
--   1. REPLICA IDENTITY FULL — so UPDATE/DELETE events carry the old row
--      (INSERT alone would not strictly need this but we set it for
--      consistency with other realtime tables and future-proofing).
--   2. Add the table to the supabase_realtime publication so the Realtime
--      listener actually receives change events.
--
-- The cross-user SELECT policy added in 20260408180000_activity_log_feed_rls.sql
-- already restricts which rows a subscriber sees: users only receive INSERTs
-- for activity_log rows they're allowed to read (i.e. only from users they
-- follow, and only whitelisted FEED_ACTIONS). No extra filter needed on
-- the client channel.
-- ============================================

ALTER TABLE public.activity_log REPLICA IDENTITY FULL;

-- Add to publication if not already present (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'activity_log'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;
  END IF;
END $$;
