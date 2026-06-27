-- Slice 410 — Club-Treasury-Ledger: korrekte Quellen-Labels (ipo_fee / p2p_fee)
--
-- Problem (D87, live verifiziert): trg_trades_book_club_treasury() bucht JEDEN
-- trades-INSERT pauschal als type='trade_fee'. Drei RPCs schreiben aber in trades:
--   buy_from_ipo              → IPO-Erstverkaufs-Anteil (85%), setzt ipo_id        → soll 'ipo_fee'
--   buy_from_order/buy_player_sc → Markt-Orderbuch-Trade (1% Fee), setzt sell_order_id → 'trade_fee'
--   accept_offer              → P2P-Kaufgebot (1% Fee), setzt KEINEN Marker (alle NULL) → 'p2p_fee'
--
-- Geldneutral: get_club_balance bucketet 'trade_fee'/'ipo_fee'/'p2p_fee' identisch in
-- v_trade_fees → Saldo/available unverändert. UI (AdminWithdrawalTab KNOWN_LEDGER_TYPES)
-- + i18n (ledgerType.ipo_fee/p2p_fee, DE+TR) sind bereits vorhanden → kein Frontend-Change.
-- club_treasury_ledger.type hat KEINEN CHECK-Constraint (freies TEXT) → kein Widen nötig.
--
-- Discriminator code-level eindeutig: nur accept_offer lässt ipo_id+buy_order_id+sell_order_id
-- alle NULL; buy_from_ipo setzt immer ipo_id; Markt-RPCs setzen immer sell_order_id.
-- AR-44-Ausnahme: Trigger-Funktion (RETURNS trigger) braucht kein REVOKE/GRANT.

CREATE OR REPLACE FUNCTION public.trg_trades_book_club_treasury()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_club_id uuid;
  v_type    text;
  v_desc    text;
BEGIN
  IF NEW.club_fee IS NULL OR NEW.club_fee <= 0 THEN RETURN NEW; END IF;
  SELECT club_id INTO v_club_id FROM players WHERE id = NEW.player_id;
  IF v_club_id IS NULL THEN RETURN NEW; END IF;

  -- Slice 410: korrekte Quellen-Kategorie statt pauschal 'trade_fee'.
  IF NEW.ipo_id IS NOT NULL THEN
    v_type := 'ipo_fee';   v_desc := 'Erstverkauf-Anteil (85%)';
  ELSIF NEW.buy_order_id IS NOT NULL OR NEW.sell_order_id IS NOT NULL THEN
    v_type := 'trade_fee'; v_desc := 'Trade-Fee';
  ELSE
    v_type := 'p2p_fee';   v_desc := 'Kaufgebot-Fee';
  END IF;

  PERFORM public.book_club_treasury(v_club_id, 'credit', v_type, NEW.club_fee, NEW.id, v_desc);
  RETURN NEW;
END; $function$;
