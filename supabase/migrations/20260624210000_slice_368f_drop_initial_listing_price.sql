-- Slice 368f Phase 2 — DROP players.initial_listing_price (redundant seit D101) + Trigger-Rewrite.
--
-- Kontext: Seit Slice 368e/D101 ist initial_listing_price ein redundanter Spiegel von ipo_price
-- (= Markteintritt). Phase 1 (Code-Reader-Entfernung: PLAYER_SELECT_COLS, Mapper, Type, Test) ist
-- live deployed → kein App-Select greift mehr auf die Spalte zu. Jetzt sicher droppbar.
--
-- ACHTUNG Reihenfolge: Der Set-once-Trigger trg_set_initial_listing_price nutzte
-- `initial_listing_price IS NULL` als "erster-IPO"-Sentinel. Da die Spalte entfällt, MUSS der Trigger
-- VOR dem DROP auf eine andere Erst-IPO-Detektion umgestellt werden: NOT EXISTS(andere ipo-Row).

-- ── 1. Trigger-Rewrite: erster IPO setzt ipo_price (Markteintritt, eingefroren) via NOT EXISTS ──
CREATE OR REPLACE FUNCTION public.trg_set_initial_listing_price()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- D101 Markteintritt: der ERSTE IPO eines Spielers setzt players.ipo_price (eingefroren).
  -- Detektion = diese ipo-Row ist die einzige des Spielers (NOT EXISTS andere). Ab dem zweiten
  -- IPO: no-op → Markteintritt bleibt eingefroren. (Funktionsname historisch — die namensgebende
  -- Spalte initial_listing_price wurde in diesem Slice 368f gedroppt.)
  UPDATE public.players p
  SET ipo_price = NEW.price,
      updated_at = now()
  WHERE p.id = NEW.player_id
    AND NOT EXISTS (
      SELECT 1 FROM public.ipos i
      WHERE i.player_id = NEW.player_id AND i.id <> NEW.id
    );
  RETURN NEW;
END;
$function$;

-- ── 2. DROP COLUMN ──
ALTER TABLE public.players DROP COLUMN initial_listing_price;
