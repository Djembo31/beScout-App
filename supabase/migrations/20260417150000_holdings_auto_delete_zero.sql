-- ============================================================
-- Slice 025 — Holdings Auto-Delete-Zero (Trigger Approach)
--
-- Verhindert Zombie-Holdings (quantity = 0) durch Trigger, der
-- Rows mit NEW.quantity = 0 sofort loescht. Future-proof:
-- alle decrement-RPCs (accept_offer, buy_from_order,
-- buy_player_sc) laufen automatisch richtig — keine Call-Site-
-- Aenderung noetig.
--
-- CEO approved (b) Trigger-Approach 2026-04-17.
-- CHECK (quantity >= 0) bleibt unveraendert (Trigger bridged
-- UPDATE→DELETE atomisch).
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_zero_qty_holding()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  DELETE FROM public.holdings WHERE id = OLD.id;
  RETURN NULL;  -- AFTER trigger ignoriert return, NULL ist sichere Konvention
END;
$function$;

COMMENT ON FUNCTION public.delete_zero_qty_holding() IS
  'Slice 025: Trigger-Fn. Loescht holdings-Row wenn quantity auf 0 dekrementiert. '
  'Zero-touch fuer decrement-RPCs (accept_offer, buy_from_order, buy_player_sc).';

-- Idempotent re-apply
DROP TRIGGER IF EXISTS holdings_auto_delete_zero ON public.holdings;

CREATE TRIGGER holdings_auto_delete_zero
AFTER UPDATE OF quantity ON public.holdings
FOR EACH ROW
WHEN (NEW.quantity = 0)
EXECUTE FUNCTION public.delete_zero_qty_holding();

COMMENT ON TRIGGER holdings_auto_delete_zero ON public.holdings IS
  'Slice 025: Auto-delete holdings-Row sobald quantity auf 0 faellt. '
  'Verhindert Zombie-Rows im Portfolio.';
