-- Slice 081 — Data-Cleanup Phase A.1 (Duplicate Default-Poisoning)
-- Applied via mcp__supabase__apply_migration on 2026-04-20.
-- Adds mv_source column to track market_value_eur provenance.
-- Flags 268 players whose (market_value_eur, contract_end) pair appears >= 10 times
-- as 'transfermarkt_stale' — these are Scraper-Fallback-Defaults that need re-verify.
-- trg_update_reference_price is guarded (IF NEW.mv IS DISTINCT FROM OLD.mv),
-- so updating only mv_source does NOT recompute reference_price → zero money drift.

-- 1. Add column + CHECK constraint
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS mv_source TEXT NOT NULL DEFAULT 'unknown';

ALTER TABLE public.players
  DROP CONSTRAINT IF EXISTS players_mv_source_check;

ALTER TABLE public.players
  ADD CONSTRAINT players_mv_source_check
  CHECK (mv_source IN ('unknown','transfermarkt_verified','transfermarkt_stale','manual_csv','api_football'));

-- 2. Flag the 268 poisoned players (duplicate-cluster >= 10)
UPDATE public.players p
SET mv_source = 'transfermarkt_stale'
WHERE (p.market_value_eur, p.contract_end) IN (
  SELECT market_value_eur, contract_end
  FROM public.players
  WHERE market_value_eur > 0 AND contract_end IS NOT NULL
  GROUP BY market_value_eur, contract_end
  HAVING COUNT(*) >= 10
);

-- 3. Partial index for fast lookup during Phase A.2 re-scraper
CREATE INDEX IF NOT EXISTS idx_players_mv_source_stale
  ON public.players (mv_source)
  WHERE mv_source = 'transfermarkt_stale';

-- 4. Docs
COMMENT ON COLUMN public.players.mv_source IS
  'Slice 081 (2026-04-20): Tracks provenance of market_value_eur. Values: unknown|transfermarkt_verified|transfermarkt_stale|manual_csv|api_football. transfermarkt_stale = Duplicate-Cluster >= 10 (Parser-Fallback-Default), needs re-verify via Phase A.2 re-scraper.';
