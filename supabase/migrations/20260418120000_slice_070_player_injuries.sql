-- Slice 070 — Player-Injuries Sync (API-Football /injuries)
-- Adds 3 columns + CHECK constraint for status

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS injury_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS injury_until DATE NULL,
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- CHECK constraint: status muss eines von 4 Werten sein (NULL bleibt erlaubt)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'players_status_check'
      AND conrelid = 'public.players'::regclass
  ) THEN
    ALTER TABLE public.players
      ADD CONSTRAINT players_status_check
      CHECK (status IS NULL OR status IN ('fit','doubtful','injured','suspended'));
  END IF;
END $$;

-- Index fuer effizientes "alle nicht-fit Players" Query
CREATE INDEX IF NOT EXISTS idx_players_status_not_fit
  ON public.players (status_updated_at)
  WHERE status IS NOT NULL AND status != 'fit';

COMMENT ON COLUMN public.players.injury_reason IS
  'Slice 070: Verletzungsgrund von API-Football /injuries (z.B. "Knee Injury", "Suspended")';
COMMENT ON COLUMN public.players.injury_until IS
  'Slice 070: Geschaetztes Comeback-Datum (oft NULL — API liefert nicht immer)';
COMMENT ON COLUMN public.players.status_updated_at IS
  'Slice 070: Audit-Trail wann status zuletzt geaendert wurde (Trigger oder cron)';
