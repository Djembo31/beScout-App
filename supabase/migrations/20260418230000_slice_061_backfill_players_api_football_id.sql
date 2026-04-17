-- Slice 061 — Backfill players.api_football_id aus player_external_ids
-- Vor: 210 NULL, 58 drift (NULL in Column aber Eintrag in External-IDs-Table)
-- Nach: 158 NULL, 7 drift (collisions — 2 players claim selben api_football_id)
-- 52 erfolgreich backfilled, 7 collisions dokumentieren fuer manuellen Review

UPDATE players p
SET api_football_id = (pei.external_id)::INTEGER
FROM player_external_ids pei
WHERE pei.player_id = p.id
  AND p.api_football_id IS NULL
  AND pei.external_id ~ '^\d+$'
  AND NOT EXISTS (
    SELECT 1 FROM players p2
    WHERE p2.api_football_id = (pei.external_id)::INTEGER
      AND p2.id <> p.id
  );

-- Trigger fuer zukuenftige Sync-Erhaltung
CREATE OR REPLACE FUNCTION public.sync_player_api_football_id()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_numeric_id INTEGER;
BEGIN
  IF NEW.external_id !~ '^\d+$' THEN RETURN NEW; END IF;
  v_numeric_id := (NEW.external_id)::INTEGER;

  UPDATE players
  SET api_football_id = v_numeric_id
  WHERE id = NEW.player_id
    AND api_football_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM players p2
      WHERE p2.api_football_id = v_numeric_id
        AND p2.id <> NEW.player_id
    );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_player_api_football_id ON public.player_external_ids;
CREATE TRIGGER trg_sync_player_api_football_id
AFTER INSERT OR UPDATE ON public.player_external_ids
FOR EACH ROW
EXECUTE FUNCTION public.sync_player_api_football_id();

COMMENT ON TRIGGER trg_sync_player_api_football_id ON public.player_external_ids IS
  'Slice 061: Sync players.api_football_id wenn Column NULL ist. Vermeidet Drift zwischen normalized Table und denormalized Column.';
