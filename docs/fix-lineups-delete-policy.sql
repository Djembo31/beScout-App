-- ============================================
-- BeScout: Fix Lineups DELETE Policy (idempotent)
-- Kann beliebig oft ausgeführt werden ohne Fehler.
-- ============================================

-- User kann nur eigene Lineups löschen
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'lineups' AND policyname = 'lineups_delete'
  ) THEN
    CREATE POLICY "lineups_delete" ON public.lineups
      FOR DELETE USING (auth.uid() = user_id);
    RAISE NOTICE 'lineups_delete policy created.';
  ELSE
    RAISE NOTICE 'lineups_delete policy already exists — skipped.';
  END IF;
END $$;
