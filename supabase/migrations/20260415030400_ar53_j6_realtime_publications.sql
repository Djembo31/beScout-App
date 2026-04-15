-- =============================================================================
-- AR-53 (J6, 2026-04-15) — Realtime-Publication user_stats + user_follows
--
-- PROBLEM:
--   Public-Profile braucht Realtime-Updates für Follow/Unfollow + Stats-Changes.
--   Tabellen sind RLS-geschuetzt aber nicht in supabase_realtime-Publication.
--
-- FIX: Idempotent ADD TABLE (via NOT EXISTS guard).
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='user_stats'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_stats;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='user_follows'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_follows;
  END IF;
END $$;
