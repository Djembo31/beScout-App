-- Slice 060 — UNIQUE-Constraint auf players.api_football_id
-- Verhindert zukuenftige Duplicate-Imports derselben api_football_id.
-- NULL-Werte (aktuell 210) bleiben erlaubt via Partial Index.
--
-- Anomalie dokumentiert: "M. Schulz" x2 im selben Club — 2 echte Spieler
-- (21j ATT api_id=583716 vs 30j MID api_id=48456), kein Duplikat.
-- first_name als Initial "M." statt "Manuel"/"Max" — separate Data-Quality-Issue.

CREATE UNIQUE INDEX IF NOT EXISTS players_api_football_id_unique
  ON public.players (api_football_id)
  WHERE api_football_id IS NOT NULL;

COMMENT ON INDEX public.players_api_football_id_unique IS
  'Slice 060: UNIQUE api_football_id (partial, NULL erlaubt). Verhindert Duplicate-Imports.';
