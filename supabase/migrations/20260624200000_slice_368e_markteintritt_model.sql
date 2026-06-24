-- Slice 368e — Markteintritt-Modell (D101)
-- Anil-Klärung 2026-06-24: Ein Verein kann mehrere geplante, vorangekündigte IPOs pro
-- Spieler starten. Der ERSTE IPO = Markteintritt (eingefroren, zeigt die Entwicklung auf
-- BeScout). Spätere IPOs = aktueller IPO-Preis (live aus der aktiven ipos-Row, keine Spalte).
--
-- players.ipo_price wird damit zur EINGEFRORENEN Markteintritt-Referenz (D100/D101),
-- NICHT mehr "folgt dem aktuellen IPO".
--
-- Vorher (kaputt):
--   - Slice 114 (April) überschrieb ipo_price=ROUND(MV/10) out-of-band für ALLE Spieler.
--   - Trigger trg_sync_player_ipo_price ließ ipo_price jedem aktiven IPO folgen (= "aktueller
--     Preis", nicht "Markteintritt") → ein zweiter IPO überschrieb den Markteintritt.
--   - Seed-IPOs hatten flache Müll-Preise (Douglas MV 500K → erster IPO 10).
--
-- Diese Migration:
--   1. Daten-Reparatur: aktive, nicht-liquidierte Spieler mit MV>0 und OHNE aktive IPO →
--      ipo_price = initial_listing_price = ROUND(MV/10) (kanonischer Markteintritt-Default,
--      D99/D100). MV=0 unangetastet (keine Marktwert-Basis → kein "—"-Massensetzen).
--      Spieler MIT aktiver IPO unangetastet (ipo_price = Live-Kaufpreis-Kontext).
--   2. trg_set_initial_listing_price: der erste IPO setzt den Markteintritt in BEIDEN
--      denormalisierten Spalten, danach eingefroren (initial_listing_price IS NULL =
--      zuverlässiger "noch kein IPO"-Sentinel).
--   3. trg_sync_player_ipo_price DROP: ipo_price folgt NICHT mehr dem aktuellen IPO.
--
-- Money-Sicherheit (live verifiziert, D87): recalc_floor_price liest den IPO-Floor aus der
-- AKTIVEN ipos-Row (nicht players.ipo_price); buy_from_ipo bucht über die ipos-Row; Orderbuch-
-- Käufe über orders.price. Die drei Spalten sind reine Anzeige-Werte → Reparatur bewegt kein Geld.

-- ── 1. Daten-Reparatur (Markteintritt = ROUND(MV/10) für geseedete Phase-1-Spieler) ──
UPDATE public.players p
SET ipo_price = ROUND(p.market_value_eur::numeric / 10),
    initial_listing_price = ROUND(p.market_value_eur::numeric / 10),
    updated_at = now()
WHERE NOT COALESCE(p.is_liquidated, false)
  AND p.market_value_eur > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.ipos i
    WHERE i.player_id = p.id
      AND i.status IN ('open', 'early_access', 'announced')
  )
  AND (
    p.ipo_price IS DISTINCT FROM ROUND(p.market_value_eur::numeric / 10)
    OR COALESCE(p.initial_listing_price, -1) IS DISTINCT FROM ROUND(p.market_value_eur::numeric / 10)
  );

-- ── 1b. Sentinel-Restore: IPO-lose Spieler dürfen initial_listing_price NICHT gesetzt haben ──
-- Schritt 1 oben setzt ilp=MV/10 auch für Spieler OHNE ipos-Row. Dann würde trg_set_initial_listing
-- (WHERE ilp IS NULL) beim ersten echten IPO nicht mehr feuern → Markteintritt bliebe der MV/10-Default
-- statt des echten ersten IPO-Preises. NULL = "noch kein Markteintritt", Sentinel intakt. ipo_price
-- (MV/10) bleibt als provisorischer Anzeige-Wert. (Reviewer-Finding 368e MEDIUM.)
UPDATE public.players p
SET initial_listing_price = NULL
WHERE NOT EXISTS (SELECT 1 FROM public.ipos i WHERE i.player_id = p.id)
  AND initial_listing_price IS NOT NULL;

-- ── 2. Erster IPO setzt Markteintritt in BEIDEN Spalten, danach eingefroren ──
CREATE OR REPLACE FUNCTION public.trg_set_initial_listing_price()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- D101 Markteintritt: der ERSTE IPO eines Spielers setzt den eingefrorenen Eintrittspreis
  -- in beiden denormalisierten Spalten. initial_listing_price IS NULL ist der "noch kein IPO"-
  -- Sentinel (Default NULL); der ipo_price-Default (MV/10-Provisorik aus createPlayer) wird hier
  -- vom echten ersten IPO-Preis überschrieben. Ab dem zweiten IPO: kein UPDATE → eingefroren.
  UPDATE public.players
  SET initial_listing_price = NEW.price,
      ipo_price = NEW.price,
      updated_at = now()
  WHERE id = NEW.player_id
    AND initial_listing_price IS NULL;
  RETURN NEW;
END;
$function$;

-- ── 3. "ipo_price folgt aktuellem IPO"-Trigger entfernen ──
-- (Markteintritt darf nicht durch spätere IPOs überschrieben werden.)
DROP TRIGGER IF EXISTS trg_sync_player_ipo_price ON public.ipos;
