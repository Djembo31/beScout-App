-- ============================================================================
-- Migration: SC Blocking for Fantasy Events
-- Date: 2026-03-25
-- Design: docs/plans/2026-03-25-sc-blocking-design.md
--
-- 1) holding_locks table — tracks locked SCs per event
-- 2) Event columns — min_sc_per_slot, wildcards_allowed, max_wildcards_per_lineup
-- 3) Helper: get_available_sc(user_id, player_id)
-- ============================================================================

-- 1. holding_locks table
CREATE TABLE IF NOT EXISTS public.holding_locks (
  user_id    UUID NOT NULL REFERENCES public.profiles(id),
  player_id  UUID NOT NULL REFERENCES public.players(id),
  event_id   UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  quantity_locked SMALLINT NOT NULL CHECK (quantity_locked > 0),
  locked_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, player_id, event_id)
);

ALTER TABLE public.holding_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own locks"
  ON public.holding_locks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- Index for fast available_qty calculation
CREATE INDEX IF NOT EXISTS idx_holding_locks_user_player
  ON public.holding_locks(user_id, player_id);

-- Index for fast cleanup on event end
CREATE INDEX IF NOT EXISTS idx_holding_locks_event
  ON public.holding_locks(event_id);

-- 2. Event columns for SC requirements
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS min_sc_per_slot SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS wildcards_allowed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_wildcards_per_lineup SMALLINT NOT NULL DEFAULT 0;

-- 3. Helper: get available (unlocked) SC quantity for a user+player
CREATE OR REPLACE FUNCTION public.get_available_sc(p_user_id UUID, p_player_id UUID)
RETURNS INT LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    (SELECT h.quantity FROM public.holdings h
     WHERE h.user_id = p_user_id AND h.player_id = p_player_id),
    0
  ) - COALESCE(
    (SELECT SUM(hl.quantity_locked)::INT FROM public.holding_locks hl
     WHERE hl.user_id = p_user_id AND hl.player_id = p_player_id),
    0
  );
$$;
