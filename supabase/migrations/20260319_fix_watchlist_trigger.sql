-- Fix: notify_watchlist_price_change referenced non-existent "watchlist_entries"
-- Correct table name is "watchlist"

CREATE OR REPLACE FUNCTION public.notify_watchlist_price_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_entry RECORD;
  v_pct_change NUMERIC;
  v_player_name TEXT;
BEGIN
  IF NEW.floor_price IS NULL OR OLD.floor_price IS NULL
     OR NEW.floor_price = OLD.floor_price
     OR OLD.floor_price = 0 THEN
    RETURN NEW;
  END IF;

  v_pct_change := ABS((NEW.floor_price - OLD.floor_price)::NUMERIC / OLD.floor_price * 100);
  v_player_name := NEW.first_name || ' ' || NEW.last_name;

  FOR v_entry IN
    SELECT w.user_id, w.alert_threshold_pct, w.last_alert_price
    FROM watchlist w
    WHERE w.player_id = NEW.id
      AND (w.alert_threshold_pct IS NULL OR w.alert_threshold_pct = 0 OR v_pct_change >= w.alert_threshold_pct)
    LIMIT 500
  LOOP
    IF v_entry.last_alert_price IS NOT NULL AND v_entry.last_alert_price = NEW.floor_price THEN
      CONTINUE;
    END IF;

    INSERT INTO notifications (user_id, type, title, body, reference_type, reference_id)
    VALUES (
      v_entry.user_id,
      'price_alert',
      CASE WHEN NEW.floor_price < OLD.floor_price
        THEN 'Preisalarm: ' || v_player_name
        ELSE 'Preisanstieg: ' || v_player_name
      END,
      CASE WHEN NEW.floor_price < OLD.floor_price
        THEN 'Floor Price gefallen auf ' || (NEW.floor_price / 100.0) || ' Credits'
        ELSE 'Floor Price gestiegen auf ' || (NEW.floor_price / 100.0) || ' Credits'
      END,
      'player',
      NEW.id
    );

    UPDATE watchlist
    SET last_alert_price = NEW.floor_price
    WHERE user_id = v_entry.user_id AND player_id = NEW.id;
  END LOOP;

  RETURN NEW;
END;
$$;
