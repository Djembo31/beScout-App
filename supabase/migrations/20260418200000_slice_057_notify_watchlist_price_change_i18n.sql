-- Slice 057 — notify_watchlist_price_change mit structured i18n
-- Trigger auf players (floor_price-Update). Player-Name direkt via NEW.first_name/last_name.
-- Ersetzt AR-59 async-client-resolve-Pattern.
-- Date: 2026-04-18
-- Schließt TR-i18n Initiative: 14/14 notification-RPCs.

CREATE OR REPLACE FUNCTION public.notify_watchlist_price_change()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_entry RECORD;
  v_pct_change NUMERIC;
  v_player_name TEXT;
  v_is_down BOOLEAN;
  v_title TEXT;
  v_body TEXT;
  v_i18n_key TEXT;
BEGIN
  IF NEW.floor_price IS NULL OR OLD.floor_price IS NULL
     OR NEW.floor_price = OLD.floor_price
     OR OLD.floor_price = 0 THEN
    RETURN NEW;
  END IF;

  v_pct_change := ABS((NEW.floor_price - OLD.floor_price)::NUMERIC / OLD.floor_price * 100);
  v_is_down := (NEW.floor_price < OLD.floor_price);
  v_i18n_key := CASE WHEN v_is_down THEN 'priceAlertDown' ELSE 'priceAlertUp' END;

  v_player_name := TRIM(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, ''));
  IF v_player_name = '' THEN v_player_name := 'Spieler'; END IF;

  v_title := CASE WHEN v_is_down THEN 'Preis gefallen' ELSE 'Preis gestiegen' END;
  v_body := v_player_name || ': Floor Price hat sich geändert';

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

    INSERT INTO notifications (user_id, type, title, body, reference_type, reference_id, i18n_key, i18n_params)
    VALUES (
      v_entry.user_id,
      'price_alert',
      v_title,
      v_body,
      'player',
      NEW.id,
      v_i18n_key,
      jsonb_build_object('playerName', v_player_name)
    );

    UPDATE watchlist
    SET last_alert_price = NEW.floor_price
    WHERE user_id = v_entry.user_id AND player_id = NEW.id;
  END LOOP;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.notify_watchlist_price_change() IS
  'Slice 057: structured i18n (priceAlertDown/Up + playerName param). Trigger-fn, kein REVOKE noetig.';
