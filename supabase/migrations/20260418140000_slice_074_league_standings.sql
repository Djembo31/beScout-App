-- Slice 074 — League-Standings Snapshot from API-Football /standings

CREATE TABLE IF NOT EXISTS public.league_standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  season INTEGER NOT NULL,
  rank INTEGER NOT NULL,
  played INTEGER NOT NULL DEFAULT 0,
  won INTEGER NOT NULL DEFAULT 0,
  drawn INTEGER NOT NULL DEFAULT 0,
  lost INTEGER NOT NULL DEFAULT 0,
  goals_for INTEGER NOT NULL DEFAULT 0,
  goals_against INTEGER NOT NULL DEFAULT 0,
  goals_diff INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  form TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_league_standings_unique
  ON public.league_standings (league_id, club_id, season);

CREATE INDEX IF NOT EXISTS idx_league_standings_table
  ON public.league_standings (league_id, season, rank);

ALTER TABLE public.league_standings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "league_standings_select_authenticated" ON public.league_standings;
CREATE POLICY "league_standings_select_authenticated"
  ON public.league_standings FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON TABLE public.league_standings IS
  'Slice 074: Liga-Tabelle von API-Football /standings?league=X. Public info, qual=true OK.';
COMMENT ON COLUMN public.league_standings.form IS
  'Letzte 5 Matches: W=Win, D=Draw, L=Loss (z.B. "WWDWL")';
