-- Add last_appearance_gw to track when player was last seen in a match
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_appearance_gw INT DEFAULT 0;

-- Backfill from existing fixture_player_stats data
UPDATE players p SET last_appearance_gw = COALESCE(sub.max_gw, 0)
FROM (
  SELECT fps.player_id, MAX(f.gameweek) as max_gw
  FROM fixture_player_stats fps
  JOIN fixtures f ON f.id = fps.fixture_id
  WHERE fps.player_id IS NOT NULL
  GROUP BY fps.player_id
) sub
WHERE p.id = sub.player_id;

-- Update sync_player_aggregates trigger to also set last_appearance_gw
CREATE OR REPLACE FUNCTION sync_player_aggregates()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.players SET
    matches = agg.m,
    goals = agg.g,
    assists = agg.a,
    clean_sheets = agg.cs,
    total_minutes = agg.mins,
    total_saves = agg.svs,
    last_appearance_gw = agg.max_gw
  FROM (
    SELECT player_id,
      COUNT(*) AS m,
      SUM(goals) AS g,
      SUM(assists) AS a,
      SUM(CASE WHEN clean_sheet THEN 1 ELSE 0 END) AS cs,
      SUM(minutes_played) AS mins,
      SUM(saves) AS svs,
      MAX(f.gameweek) AS max_gw
    FROM public.fixture_player_stats fps
    JOIN public.fixtures f ON f.id = fps.fixture_id
    WHERE fps.player_id = COALESCE(NEW.player_id, OLD.player_id)
    GROUP BY player_id
  ) agg
  WHERE id = COALESCE(NEW.player_id, OLD.player_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
