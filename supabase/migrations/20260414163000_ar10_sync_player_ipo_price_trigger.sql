-- AR-10: Defensive Trigger sync players.ipo_price mit ipos.price
-- Behebt Source-of-Truth-Drift (Backend-Audit J2B-06: 79% Drift vor AR-5)
-- Konservative Strategie: UI liest players.ipo_price unveraendert (Phase-1-Beta),
-- aber Trigger haelt den Wert sync bei jeder IPO-Aenderung.
-- Post-Beta: Code-Refactor auf getIpoForPlayer().price als echte Source-of-Truth.

CREATE OR REPLACE FUNCTION public.sync_player_ipo_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Bei neuer oder geaenderter IPO-Row: Spiegel price in players.ipo_price
  -- Nur wenn IPO aktiv ist (nicht bei cancelled/ended), sonst behaelt players den letzten aktiven Preis
  IF NEW.status IN ('announced', 'early_access', 'open') THEN
    UPDATE players
    SET ipo_price = NEW.price, updated_at = now()
    WHERE id = NEW.player_id
      AND ipo_price IS DISTINCT FROM NEW.price;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_player_ipo_price ON ipos;

CREATE TRIGGER trg_sync_player_ipo_price
AFTER INSERT OR UPDATE OF price, status ON ipos
FOR EACH ROW
EXECUTE FUNCTION public.sync_player_ipo_price();
