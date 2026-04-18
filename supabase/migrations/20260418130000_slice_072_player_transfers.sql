-- Slice 072 — Player-Transfers Log from API-Football /transfers endpoint

CREATE TABLE IF NOT EXISTS public.player_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  transfer_date DATE NOT NULL,
  transfer_type TEXT NOT NULL,
  team_in_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL,
  team_out_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL,
  team_in_api_football_id INTEGER,
  team_out_api_football_id INTEGER,
  season INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotency: same player + same date + same target-team = one entry only
CREATE UNIQUE INDEX IF NOT EXISTS idx_player_transfers_unique
  ON public.player_transfers (player_id, transfer_date, team_in_api_football_id)
  WHERE team_in_api_football_id IS NOT NULL;

-- For UI: "latest transfers per player"
CREATE INDEX IF NOT EXISTS idx_player_transfers_player_date
  ON public.player_transfers (player_id, transfer_date DESC);

-- RLS
ALTER TABLE public.player_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_transfers_select_authenticated" ON public.player_transfers;
CREATE POLICY "player_transfers_select_authenticated"
  ON public.player_transfers FOR SELECT
  TO authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policies = nur service_role kann schreiben

COMMENT ON TABLE public.player_transfers IS
  'Slice 072: Transfer-Log von API-Football /transfers?team=X. Eine Row pro Transfer-Event (IN+OUT separate date-entries moeglich).';
COMMENT ON COLUMN public.player_transfers.transfer_type IS
  'Free | Loan | Fee | N/A — wie API-Football es liefert';
COMMENT ON COLUMN public.player_transfers.team_in_api_football_id IS
  'Tracking auch wenn destination-team NICHT in clubs-Tabelle ist (z.B. 3. Liga, auslaendische Liga)';
