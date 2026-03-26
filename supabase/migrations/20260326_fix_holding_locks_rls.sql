-- ============================================================================
-- Fix: Missing RLS policies on holding_locks
-- Root Cause: Only SELECT policy existed — INSERT and DELETE were blocked by RLS
-- Result: holding_locks was always empty (0 rows), SC blocking never worked
-- ============================================================================

-- Allow authenticated users to insert their own locks
CREATE POLICY IF NOT EXISTS "Users insert own locks"
  ON public.holding_locks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to delete their own locks
CREATE POLICY IF NOT EXISTS "Users delete own locks"
  ON public.holding_locks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
