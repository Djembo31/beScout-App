-- =============================================================================
-- AR-59 (J10, 2026-04-15) — notify_watchlist_price_change SECURITY DEFINER + i18n
--
-- PROBLEM (Audit J10B-02 CRITICAL):
--   - Trigger-Function fehlt SECURITY DEFINER → RLS-Policy `notifications_insert_*`
--     blockt INSERT (AR-58 ebenfalls fixed, aber SECURITY DEFINER ist best practice
--     für Trigger die in fremde-Users schreiben)
--   - Hardcoded DE-Strings im Body (J3-Triple-Red-Flag):
--     'Preisalarm: Max Müller', 'Floor Price gefallen auf 123.45 Credits'
--   - Live-Beweis: 0 price_alert Notifs in DB trotz aktivem Trigger
--
-- FIX:
--   1. SECURITY DEFINER + SET search_path
--   2. Static i18n-keys für title/body:
--      - title: 'priceAlertDown' | 'priceAlertUp'
--      - body: player_id als reference_id, Frontend resolved via notifText.ts
-- =============================================================================

CREATE OR REPLACE FUNCTION public.notify_watchlist_price_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_entry RECORD;
  v_pct_change NUMERIC;
BEGIN
  IF NEW.floor_price IS NULL OR OLD.floor_price IS NULL
     OR NEW.floor_price = OLD.floor_price
     OR OLD.floor_price = 0 THEN
    RETURN NEW;
  END IF;

  v_pct_change := ABS((NEW.floor_price - OLD.floor_price)::NUMERIC / OLD.floor_price * 100);

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
      CASE WHEN NEW.floor_price < OLD.floor_price THEN 'priceAlertDown' ELSE 'priceAlertUp' END,
      NULL,  -- i18n: Frontend resolved via reference_id (player_id) + type
      'player',
      NEW.id
    );

    UPDATE watchlist
    SET last_alert_price = NEW.floor_price
    WHERE user_id = v_entry.user_id AND player_id = NEW.id;
  END LOOP;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.notify_watchlist_price_change() IS
  'AR-59 (2026-04-15): SECURITY DEFINER + i18n-keys (priceAlertDown/Up). Frontend notifText.ts resolved via reference_id player-lookup.';
