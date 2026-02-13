-- ============================================
-- BeScout: Sync Event State
-- Dieses Script einmal in Supabase SQL Editor ausführen.
-- Es macht:
--   1. formation-Spalte in lineups hinzufügen (falls noch nicht da)
--   2. Event-Status anhand Timestamps aktualisieren
--   3. current_entries mit echten Lineup-Zahlen synchronisieren
--   4. Trigger für automatisches current_entries Update
-- ============================================

-- 1. Formation-Spalte (idempotent)
ALTER TABLE lineups ADD COLUMN IF NOT EXISTS formation TEXT DEFAULT '1-2-2-1';

-- 2. Event-Status anhand Timestamps aktualisieren
-- Events die bereits gestartet sind → running
UPDATE events
SET status = 'running'
WHERE status IN ('upcoming', 'registering', 'late-reg')
  AND starts_at <= NOW()
  AND (ends_at IS NULL OR ends_at > NOW());

-- Events die bereits beendet sind → ended
UPDATE events
SET status = 'ended'
WHERE status NOT IN ('ended', 'scoring')
  AND ends_at IS NOT NULL
  AND ends_at <= NOW();

-- 3. current_entries mit echten Lineup-Counts synchronisieren
UPDATE events e
SET current_entries = (
  SELECT COUNT(*) FROM lineups l WHERE l.event_id = e.id
);

-- 4. Trigger-Funktion: current_entries automatisch aktualisieren
CREATE OR REPLACE FUNCTION update_event_entries()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE events SET current_entries = current_entries + 1 WHERE id = NEW.event_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE events SET current_entries = GREATEST(0, current_entries - 1) WHERE id = OLD.event_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger entfernen falls vorhanden, dann neu erstellen
DROP TRIGGER IF EXISTS trg_lineup_entries_insert ON lineups;
DROP TRIGGER IF EXISTS trg_lineup_entries_delete ON lineups;

CREATE TRIGGER trg_lineup_entries_insert
  AFTER INSERT ON lineups
  FOR EACH ROW
  EXECUTE FUNCTION update_event_entries();

CREATE TRIGGER trg_lineup_entries_delete
  AFTER DELETE ON lineups
  FOR EACH ROW
  EXECUTE FUNCTION update_event_entries();

-- 5. Funktion zum periodischen Status-Sync (kann per pg_cron oder manuell aufgerufen werden)
CREATE OR REPLACE FUNCTION sync_event_statuses()
RETURNS void AS $$
BEGIN
  -- Registering/Upcoming → Running (Start-Zeit vorbei)
  UPDATE events
  SET status = 'running'
  WHERE status IN ('upcoming', 'registering', 'late-reg')
    AND starts_at <= NOW()
    AND (ends_at IS NULL OR ends_at > NOW());

  -- Running → Ended (End-Zeit vorbei)
  UPDATE events
  SET status = 'ended'
  WHERE status = 'running'
    AND ends_at IS NOT NULL
    AND ends_at <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Einmal sofort ausführen
SELECT sync_event_statuses();
