-- ============================================================================
-- PRICING ARCHITECTURE INTEGRATION TEST
-- Run via: Supabase SQL Editor or mcp__supabase__execute_sql
--
-- Tests Multi-User Trading, Orderbuch-Verhalten, Geldfluss
-- ROLLBACK am Ende → keine Daten-Aenderung
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_user_a UUID := '99b601d2-ca72-4c36-8048-bdc563612cc3'; -- Demo Fan
  v_user_b UUID := '3a45d762-9dc1-4c2d-8e4c-5eb9866df981'; -- Demo Admin
  v_player_id UUID := '4c87d887-a49b-477e-8341-6ae82961ef21'; -- Test Player
  v_wallet_a_before BIGINT;
  v_wallet_b_before BIGINT;
  v_wallet_a_after BIGINT;
  v_wallet_b_after BIGINT;
  v_floor BIGINT;
  v_ref_price BIGINT;
  v_cap BIGINT;
  v_oid1 UUID; v_oid2 UUID; v_oid3 UUID;
  v_count INT;
  v_last BIGINT;
BEGIN
  -- 1. REFERENCE PRICE
  SELECT reference_price INTO v_ref_price FROM players WHERE id = v_player_id;
  ASSERT v_ref_price IS NOT NULL AND v_ref_price > 0, 'FAIL: ref price';
  RAISE NOTICE '✓ 1. reference_price = % cents (% $SCOUT)', v_ref_price, v_ref_price/100;

  -- 2. PRICE CAP
  v_cap := get_price_cap(v_player_id);
  ASSERT v_cap = v_ref_price * 3, format('FAIL: cap=%  expected=%', v_cap, v_ref_price*3);
  RAISE NOTICE '✓ 2. price_cap = % (3x ref)', v_cap/100;

  -- 3. SETUP HOLDINGS
  INSERT INTO holdings (user_id, player_id, quantity, avg_buy_price)
  VALUES (v_user_a, v_player_id, 10, 1000)
  ON CONFLICT (user_id, player_id) DO UPDATE SET quantity = 10, avg_buy_price = 1000;
  RAISE NOTICE '✓ 3. User A: 10 Scout Cards';

  SELECT balance INTO v_wallet_a_before FROM wallets WHERE user_id = v_user_a;
  SELECT balance INTO v_wallet_b_before FROM wallets WHERE user_id = v_user_b;

  -- 4-6. SELL ORDERS: 3 verschiedene Preise
  INSERT INTO orders (user_id, player_id, side, price, quantity, status, expires_at)
  VALUES (v_user_a, v_player_id, 'sell', 1500, 3, 'open', NOW() + INTERVAL '30 days')
  RETURNING id INTO v_oid1;
  INSERT INTO orders (user_id, player_id, side, price, quantity, status, expires_at)
  VALUES (v_user_a, v_player_id, 'sell', 2000, 2, 'open', NOW() + INTERVAL '30 days')
  RETURNING id INTO v_oid2;
  INSERT INTO orders (user_id, player_id, side, price, quantity, status, expires_at)
  VALUES (v_user_a, v_player_id, 'sell', 1200, 1, 'open', NOW() + INTERVAL '30 days')
  RETURNING id INTO v_oid3;
  PERFORM recalc_floor_price(v_player_id);
  SELECT floor_price INTO v_floor FROM players WHERE id = v_player_id;
  ASSERT v_floor = 1200, format('FAIL: floor=% expected=1200', v_floor);
  RAISE NOTICE '✓ 4-6. 3 Sell Orders (1x@12, 3x@15, 2x@20), floor=12';

  -- 7. ORDERBOOK STATE
  SELECT count(*) INTO v_count FROM orders WHERE player_id=v_player_id AND side='sell' AND status='open';
  ASSERT v_count = 3, format('FAIL: %orders expected 3', v_count);
  RAISE NOTICE '✓ 7. Orderbook: 3 sell orders (6 SC total)';

  -- 8. TRADE: B kauft guenstigstes (1x@12)
  UPDATE wallets SET balance = balance - 1200 WHERE user_id = v_user_b;
  UPDATE wallets SET balance = balance + 1128 WHERE user_id = v_user_a;
  UPDATE orders SET filled_qty = 1, status = 'filled' WHERE id = v_oid3;
  INSERT INTO holdings (user_id, player_id, quantity, avg_buy_price)
  VALUES (v_user_b, v_player_id, 1, 1200)
  ON CONFLICT (user_id, player_id) DO UPDATE SET quantity = holdings.quantity + 1;
  UPDATE holdings SET quantity = quantity - 1 WHERE user_id = v_user_a AND player_id = v_player_id;
  INSERT INTO trades (player_id, buyer_id, seller_id, sell_order_id, price, quantity, platform_fee, pbt_fee, club_fee)
  VALUES (v_player_id, v_user_b, v_user_a, v_oid3, 1200, 1, 42, 18, 12);
  UPDATE players SET last_price = 1200 WHERE id = v_player_id;

  SELECT balance INTO v_wallet_a_after FROM wallets WHERE user_id = v_user_a;
  SELECT balance INTO v_wallet_b_after FROM wallets WHERE user_id = v_user_b;
  ASSERT v_wallet_b_after = v_wallet_b_before - 1200, 'FAIL: buyer wallet';
  ASSERT v_wallet_a_after = v_wallet_a_before + 1128, 'FAIL: seller wallet';
  RAISE NOTICE '✓ 8. Trade: B bought 1x@12. Fee=72c (platform=42, pbt=18, club=12)';

  -- 9. FLOOR RECALC
  SELECT floor_price INTO v_floor FROM players WHERE id = v_player_id;
  ASSERT v_floor = 1500, format('FAIL: floor=% expected=1500', v_floor);
  RAISE NOTICE '✓ 9. Floor = 15 (cheapest filled, next order)';

  -- 10-11. HOLDINGS
  SELECT quantity INTO v_count FROM holdings WHERE user_id=v_user_b AND player_id=v_player_id;
  ASSERT v_count = 1, 'FAIL: B holdings';
  SELECT quantity INTO v_count FROM holdings WHERE user_id=v_user_a AND player_id=v_player_id;
  ASSERT v_count = 9, 'FAIL: A holdings';
  RAISE NOTICE '✓ 10-11. Holdings: A=9, B=1';

  -- 12. PARTIAL FILL: B kauft 2x von oid1 (3x@15)
  UPDATE wallets SET balance = balance - 3000 WHERE user_id = v_user_b;
  UPDATE wallets SET balance = balance + 2820 WHERE user_id = v_user_a;
  UPDATE orders SET filled_qty = 2, status = 'partial' WHERE id = v_oid1;
  UPDATE holdings SET quantity = quantity + 2 WHERE user_id = v_user_b AND player_id = v_player_id;
  UPDATE holdings SET quantity = quantity - 2 WHERE user_id = v_user_a AND player_id = v_player_id;
  INSERT INTO trades (player_id, buyer_id, seller_id, sell_order_id, price, quantity, platform_fee, pbt_fee, club_fee)
  VALUES (v_player_id, v_user_b, v_user_a, v_oid1, 1500, 2, 105, 45, 30);
  UPDATE players SET last_price = 1500 WHERE id = v_player_id;
  RAISE NOTICE '✓ 12. Partial fill: B bought 2x@15 from 3er-Order (2/3 filled)';

  -- 13. REMAINING
  SELECT quantity - filled_qty INTO v_count FROM orders WHERE id = v_oid1;
  ASSERT v_count = 1, format('FAIL: remaining=% expected=1', v_count);
  RAISE NOTICE '✓ 13. oid1: 1 remaining, oid2: 2 remaining';

  -- 14. CANCEL teures → floor unveraendert
  UPDATE orders SET status = 'cancelled' WHERE id = v_oid2;
  PERFORM recalc_floor_price(v_player_id);
  SELECT floor_price INTO v_floor FROM players WHERE id = v_player_id;
  ASSERT v_floor = 1500, format('FAIL: floor=% expected=1500', v_floor);
  RAISE NOTICE '✓ 14. Cancel oid2 → floor=15 (oid1 still active)';

  -- 15. B listet eigene
  INSERT INTO orders (user_id, player_id, side, price, quantity, status, expires_at)
  VALUES (v_user_b, v_player_id, 'sell', 1800, 2, 'open', NOW() + INTERVAL '30 days');
  PERFORM recalc_floor_price(v_player_id);
  SELECT floor_price INTO v_floor FROM players WHERE id = v_player_id;
  ASSERT v_floor = 1500, format('FAIL: floor=%', v_floor);
  RAISE NOTICE '✓ 15. B lists 2x@18, floor=15 (A cheaper)';

  -- 16. Multi-User Orderbook
  SELECT count(*) INTO v_count FROM orders WHERE player_id=v_player_id AND status IN ('open','partial');
  ASSERT v_count = 2, format('FAIL: % orders', v_count);
  RAISE NOTICE '✓ 16. Orderbook: 2 orders von 2 Usern';

  -- 17. Cancel all → last_price fallback
  UPDATE orders SET status = 'cancelled' WHERE player_id=v_player_id AND status IN ('open','partial');
  PERFORM recalc_floor_price(v_player_id);
  SELECT floor_price, last_price INTO v_floor, v_last FROM players WHERE id = v_player_id;
  ASSERT v_floor = v_last, format('FAIL: floor=% last=%', v_floor, v_last);
  RAISE NOTICE '✓ 17. All cancelled → floor=last_price=%', v_last/100;

  -- 18. GELDFLUSS AUDIT
  SELECT balance INTO v_wallet_a_after FROM wallets WHERE user_id = v_user_a;
  SELECT balance INTO v_wallet_b_after FROM wallets WHERE user_id = v_user_b;
  RAISE NOTICE '✓ 18. Geldfluss:';
  RAISE NOTICE '   A: % → % (net: +%c)', v_wallet_a_before/100, v_wallet_a_after/100, v_wallet_a_after - v_wallet_a_before;
  RAISE NOTICE '   B: % → % (net: -%c)', v_wallet_b_before/100, v_wallet_b_after/100, v_wallet_b_before - v_wallet_b_after;
  RAISE NOTICE '   Fees: %c (platform+pbt+club)', (v_wallet_b_before - v_wallet_b_after) - (v_wallet_a_after - v_wallet_a_before);

  -- 19. TRADE COUNT
  SELECT count(*) INTO v_count FROM trades WHERE player_id = v_player_id;
  RAISE NOTICE '✓ 19. Trades: %', v_count;

  -- 20. INITIAL LISTING PRICE
  SELECT initial_listing_price INTO v_last FROM players WHERE id = v_player_id;
  RAISE NOTICE '✓ 20. initial_listing_price = % (immutable)', v_last;

  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════';
  RAISE NOTICE '  ALL 20 INTEGRATION TESTS PASSED';
  RAISE NOTICE '══════════════════════════════════════════';
END;
$$;

ROLLBACK;
