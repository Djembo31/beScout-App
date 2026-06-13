-- Slice 303 Part B — cancel_order: Inline-Floor-Formel → Kanon recalc_floor_price (S7)
--
-- Problem: cancel_order hatte eine EIGENE Inline-Floor-Formel (MIN(open-sell) → players.ipo_price),
-- abweichend von der Kanon-RPC recalc_floor_price (LEAST(MIN(non-expired-sell), aktive-IPO-aus-ipos)
-- → last_price>0 → keep). = 7. divergierende Floor-Berechnung, in der DB selbst.
--
-- Fix: Inline-UPDATE durch PERFORM recalc_floor_price(player_id) ersetzen → eine Floor-Quelle
-- auch in der DB. Schließt zugleich die "cancel lässt Floor stale-low"-Lücke (Kanon-Formel
-- berücksichtigt expires_at + aktive IPO + last_price-Fallback korrekt).
--
-- Slice-156 PATCH-AUDIT: kompletter Body aus pg_get_functiondef übernommen, NUR der Floor-
-- Update-Block getauscht. Auth-Guard + FOR UPDATE + alle Checks erhalten.
-- CREATE OR REPLACE erhält Grants (kein DROP); REVOKE/GRANT trotzdem re-asserted (AR-44).

CREATE OR REPLACE FUNCTION public.cancel_order(p_user_id uuid, p_order_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_order RECORD;
BEGIN
  -- AUTH GUARD
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Order nicht gefunden');
  END IF;

  IF v_order.user_id != p_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Nicht deine Order');
  END IF;

  IF v_order.status NOT IN ('open', 'partial') THEN
    RETURN json_build_object('success', false, 'error', 'Order kann nicht storniert werden');
  END IF;

  UPDATE public.orders SET status = 'cancelled' WHERE id = p_order_id;

  -- Slice 303: Kanon-Floor statt Inline-Formel (eine Quelle)
  PERFORM public.recalc_floor_price(v_order.player_id);

  RETURN json_build_object('success', true, 'order_id', p_order_id);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.cancel_order(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_order(uuid, uuid) TO authenticated;
