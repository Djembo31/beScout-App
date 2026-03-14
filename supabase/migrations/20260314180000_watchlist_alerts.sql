-- Watchlist Price Alerts: trigger function + trigger
-- Columns (alert_threshold_pct, alert_direction, last_alert_price) already exist on watchlist table
-- 'price_alert' already in notifications_type_check constraint
-- 'player' already in notifications_reference_type_check constraint

-- Create trigger function for price change alerts
CREATE OR REPLACE FUNCTION notify_watchlist_price_change()
RETURNS TRIGGER AS $$
DECLARE
  v_entry RECORD;
  v_pct_change NUMERIC;
  v_player_name TEXT;
BEGIN
  -- Only fire when floor_price actually changes and is non-zero
  IF NEW.floor_price IS NULL OR OLD.floor_price IS NULL
     OR NEW.floor_price = OLD.floor_price
     OR OLD.floor_price = 0 THEN
    RETURN NEW;
  END IF;

  v_pct_change := ABS((NEW.floor_price - OLD.floor_price)::NUMERIC / OLD.floor_price * 100);
  v_player_name := NEW.first_name || ' ' || NEW.last_name;

  -- Find all watchlist entries for this player where threshold is met
  FOR v_entry IN
    SELECT w.user_id, w.alert_threshold_pct, w.last_alert_price
    FROM watchlist w
    WHERE w.player_id = NEW.id
      AND (w.alert_threshold_pct IS NULL OR w.alert_threshold_pct = 0 OR v_pct_change >= w.alert_threshold_pct)
  LOOP
    -- Don't spam: skip if price hasn't changed since last alert
    IF v_entry.last_alert_price IS NOT NULL AND v_entry.last_alert_price = NEW.floor_price THEN
      CONTINUE;
    END IF;

    -- Insert notification
    INSERT INTO notifications (user_id, type, title, body, reference_type, reference_id)
    VALUES (
      v_entry.user_id,
      'price_alert',
      CASE WHEN NEW.floor_price < OLD.floor_price
        THEN 'Preisalarm: ' || v_player_name
        ELSE 'Preisanstieg: ' || v_player_name
      END,
      CASE WHEN NEW.floor_price < OLD.floor_price
        THEN 'Floor Price gefallen auf ' || (NEW.floor_price / 100) || ' bCredits'
        ELSE 'Floor Price gestiegen auf ' || (NEW.floor_price / 100) || ' bCredits'
      END,
      'player',
      NEW.id
    );

    -- Update last_alert_price to prevent spam
    UPDATE watchlist
    SET last_alert_price = NEW.floor_price
    WHERE user_id = v_entry.user_id AND player_id = NEW.id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on players table
DROP TRIGGER IF EXISTS watchlist_price_alert ON players;
CREATE TRIGGER watchlist_price_alert
  AFTER UPDATE OF floor_price ON players
  FOR EACH ROW
  EXECUTE FUNCTION notify_watchlist_price_change();
