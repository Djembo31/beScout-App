-- ============================================
-- Slice 267 — Realtime-Live-Score Foundation
-- Date: 2026-05-03
--
-- Adds two columns to public.fixtures (minute + last_live_update_at),
-- enables REPLICA IDENTITY FULL so UPDATE events carry the full row,
-- and adds the table to the supabase_realtime publication so the
-- Realtime listener actually broadcasts change events.
--
-- Layer 1 of the 3-layer architecture (Spec §2):
--   Layer 1 — DB-Schema-Erweiterung (this file)
--   Layer 2 — live-score-sync Cron (api/cron/live-score-sync/route.ts)
--   Layer 3 — Frontend Realtime-Subscription (subscribeFixtureUpdates)
--
-- Idempotent + additive — no breaking changes:
--   - ADD COLUMN IF NOT EXISTS — re-run safe.
--   - REPLICA IDENTITY FULL — re-run safe.
--   - Publication-Add wrapped in pg_publication_tables-EXISTS check.
--
-- Cost-Analysis (IMPACT §1 + Capacity-Sanity):
--   - WAL-Size grows ×3-5 for fixtures only (REPLICA FULL).
--   - fixtures is small (~500 rows/season × 7 leagues), so impact is LOW.
--   - Realtime Pro-Plan: 5M messages/month free, this slice ≈ 1M (20%).
--
-- RLS:
--   fixtures already has RLS-policies for SELECT (public sport-data).
--   Realtime respects RLS on subscribe — clients only receive UPDATEs
--   for rows they're allowed to read.
-- ============================================

ALTER TABLE public.fixtures
  ADD COLUMN IF NOT EXISTS minute INTEGER NULL,
  ADD COLUMN IF NOT EXISTS last_live_update_at TIMESTAMPTZ NULL;

ALTER TABLE public.fixtures REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'fixtures'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fixtures;
  END IF;
END $$;

COMMENT ON COLUMN public.fixtures.minute IS
  'Slice 267: Live-Match-Minute (NULL = nicht-live oder pre-kickoff). Source: API-Football fixture.status.elapsed.';

COMMENT ON COLUMN public.fixtures.last_live_update_at IS
  'Slice 267: Letzter live-score-sync-Cron-Update. Stale-Detection > 5min = Live-Cron offline.';
