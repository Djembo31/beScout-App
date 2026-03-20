-- ============================================================
-- Fix: Prevent current_entries from exceeding max_entries
--
-- Root cause: TOCTOU race condition in submitLineup.
-- The client reads current_entries, checks < max_entries,
-- then upserts. Concurrent requests both pass the check.
--
-- Fix: DB-level CHECK constraint. The existing trigger that
-- increments current_entries on lineup INSERT will fail if
-- the increment would violate the constraint.
-- ============================================================

-- Step 1: Fix existing data — cap current_entries at max_entries
UPDATE public.events
SET current_entries = max_entries
WHERE max_entries IS NOT NULL
  AND current_entries > max_entries;

-- Step 2: Add CHECK constraint (the real guard)
ALTER TABLE public.events
ADD CONSTRAINT chk_event_max_entries
CHECK (max_entries IS NULL OR current_entries <= max_entries);
