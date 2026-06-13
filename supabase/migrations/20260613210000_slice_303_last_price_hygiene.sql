-- Slice 303 Part A — last_price Seed-Hygiene (S7 Floor-Konsolidierung)
--
-- Problem: Untradete Spieler tragen einen Seed-last_price (10000 cents / 0), der die
-- recalc_floor_price-`last_price`-Fallback-Branch vergiftet (3855 Spieler last_price=10000
-- ohne echte Trades). Ein naiver recalc-Backfill würde dadurch deren floor_price vom
-- sinnvollen IPO-Preis auf den 100-$SCOUT-Seed zerschießen.
--
-- Fix: Untradete Spieler auf last_price=0 normalisieren (existierender "nie getradet"-
-- Sentinel; recalc-Formel behandelt nur `last_price > 0`, 0 → "kein Trade" → behält
-- floor_price = IPO-Preis). centsToBsd(0)=0, Consumer guarden `>0` → "letzter Trade"
-- wird bei untradeten korrekt versteckt statt irreführendem Seed-Wert.
--
-- Sicherheit: NUR untradete Spieler (NOT IN trades). 202 getradete bleiben unberührt
-- (Snapshot last_price-Summe 8.347.832 muss identisch bleiben). last_price ist NOT NULL
-- → Sentinel 0 statt NULL (kein Schema-Change). Erwartung: ~4351 Zeilen → 0.

UPDATE public.players p
SET last_price = 0
WHERE p.last_price <> 0
  AND p.id NOT IN (SELECT player_id FROM public.trades WHERE player_id IS NOT NULL);
