-- ============================================================
-- BeScout Demo Account Seed Script
-- ============================================================
-- PREREQUISITE: Create these 3 auth users FIRST via Supabase Dashboard
-- (Authentication → Users → Add User → Email+Password):
--
--   1. demo-fan@bescout.app      / BeScout2026!
--   2. demo-admin@bescout.app    / BeScout2026!
--   3. demo-platform@bescout.app / BeScout2026!
--
-- After creating them, copy their UUIDs into the variables below.
-- Then run this script in the SQL Editor.
-- ============================================================

DO $$
DECLARE
  v_fan_id       UUID;
  v_admin_id     UUID;
  v_platform_id  UUID;
  v_club_id      UUID := '2bf30014-db88-4567-9885-9da215e3a0d4'; -- Sakaryaspor
  v_player_ids   UUID[];
  v_event_id     UUID;
BEGIN

  -- ──────────────────────────────────────────────
  -- Step 1: Look up auth user IDs by email
  -- ──────────────────────────────────────────────
  SELECT id INTO v_fan_id FROM auth.users WHERE email = 'demo-fan@bescout.app';
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'demo-admin@bescout.app';
  SELECT id INTO v_platform_id FROM auth.users WHERE email = 'demo-platform@bescout.app';

  IF v_fan_id IS NULL THEN RAISE EXCEPTION 'Auth user demo-fan@bescout.app not found. Create it first in Supabase Dashboard.'; END IF;
  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'Auth user demo-admin@bescout.app not found. Create it first in Supabase Dashboard.'; END IF;
  IF v_platform_id IS NULL THEN RAISE EXCEPTION 'Auth user demo-platform@bescout.app not found. Create it first in Supabase Dashboard.'; END IF;

  -- ──────────────────────────────────────────────
  -- Step 2: Upsert Demo Profiles
  -- ──────────────────────────────────────────────

  -- Demo Fan
  INSERT INTO profiles (id, handle, display_name, language, plan, level, verified, is_demo, referral_code, favorite_club, favorite_club_id)
  VALUES (v_fan_id, 'demo-fan', 'Demo Fan', 'tr', 'free', 12, false, true, 'DEMOFAN1', 'Sakaryaspor', v_club_id)
  ON CONFLICT (id) DO UPDATE SET
    handle = EXCLUDED.handle,
    display_name = EXCLUDED.display_name,
    is_demo = true,
    favorite_club_id = EXCLUDED.favorite_club_id;

  -- Demo Admin
  INSERT INTO profiles (id, handle, display_name, language, plan, level, verified, is_demo, referral_code, favorite_club, favorite_club_id)
  VALUES (v_admin_id, 'demo-admin', 'Demo Admin', 'tr', 'free', 20, true, true, 'DEMOADM1', 'Sakaryaspor', v_club_id)
  ON CONFLICT (id) DO UPDATE SET
    handle = EXCLUDED.handle,
    display_name = EXCLUDED.display_name,
    is_demo = true,
    verified = true;

  -- Demo Platform Admin
  INSERT INTO profiles (id, handle, display_name, language, plan, level, verified, is_demo, referral_code)
  VALUES (v_platform_id, 'demo-platform', 'Demo Platform', 'tr', 'free', 25, true, true, 'DEMOPLT1')
  ON CONFLICT (id) DO UPDATE SET
    handle = EXCLUDED.handle,
    display_name = EXCLUDED.display_name,
    is_demo = true,
    verified = true;

  -- ──────────────────────────────────────────────
  -- Step 3: Wallet setup (welcome trigger creates wallets)
  -- Just update balance after profiles exist
  -- ──────────────────────────────────────────────
  UPDATE wallets SET balance = 500000000, locked_balance = 0  -- 50.000 $SCOUT
  WHERE user_id = v_fan_id;

  UPDATE wallets SET balance = 100000000, locked_balance = 0  -- 10.000 $SCOUT
  WHERE user_id = v_admin_id;

  UPDATE wallets SET balance = 1000000000, locked_balance = 0  -- 100.000 $SCOUT
  WHERE user_id = v_platform_id;

  -- ──────────────────────────────────────────────
  -- Step 4: Club Admin role for Demo Admin
  -- ──────────────────────────────────────────────
  INSERT INTO club_admins (user_id, club_id, role)
  VALUES (v_admin_id, v_club_id, 'owner')
  ON CONFLICT DO NOTHING;

  -- ──────────────────────────────────────────────
  -- Step 5: Platform Admin role for Demo Platform
  -- ──────────────────────────────────────────────
  INSERT INTO platform_admins (user_id, role)
  VALUES (v_platform_id, 'admin')
  ON CONFLICT DO NOTHING;

  -- ──────────────────────────────────────────────
  -- Step 6: Demo Fan holdings (5 players from Sakaryaspor)
  -- ──────────────────────────────────────────────
  SELECT ARRAY(
    SELECT id FROM players WHERE club_id = v_club_id ORDER BY perf_l5 DESC LIMIT 5
  ) INTO v_player_ids;

  IF array_length(v_player_ids, 1) >= 5 THEN
    -- 5 holdings with varied buy prices
    INSERT INTO holdings (user_id, player_id, quantity, avg_buy_price)
    VALUES
      (v_fan_id, v_player_ids[1], 3, 150000),   -- 1.500 $SCOUT avg
      (v_fan_id, v_player_ids[2], 5, 100000),   -- 1.000 $SCOUT avg
      (v_fan_id, v_player_ids[3], 2, 200000),   -- 2.000 $SCOUT avg
      (v_fan_id, v_player_ids[4], 4, 80000),    -- 800 $SCOUT avg
      (v_fan_id, v_player_ids[5], 1, 300000)    -- 3.000 $SCOUT avg
    ON CONFLICT DO NOTHING;

    -- 2 sell orders
    INSERT INTO orders (user_id, player_id, side, price, quantity, status)
    VALUES
      (v_fan_id, v_player_ids[1], 'sell', 200000, 1, 'open'),
      (v_fan_id, v_player_ids[2], 'sell', 150000, 2, 'open')
    ON CONFLICT DO NOTHING;
  END IF;

  -- ──────────────────────────────────────────────
  -- Step 7: Demo Fan community posts
  -- ──────────────────────────────────────────────
  INSERT INTO posts (user_id, club_id, content, post_type)
  VALUES
    (v_fan_id, v_club_id, 'Sakaryaspor bu sezon harika performans sergiliyor! Takim ruhu cok yuksek.', 'discussion'),
    (v_fan_id, v_club_id, 'Yeni transferlerle kadro cok guclendi. Playoff hedefi gercekci gorunuyor.', 'discussion'),
    (v_fan_id, v_club_id, 'Gecen haftaki mac inanilmazdi. Deplasmanda 3 puan almak buyuk basari.', 'discussion')
  ON CONFLICT DO NOTHING;

  -- ──────────────────────────────────────────────
  -- Step 8: Demo Fan user_stats (Silber I level)
  -- ──────────────────────────────────────────────
  INSERT INTO user_stats (user_id, trader_elo, manager_elo, analyst_elo, total_score, tier, trades_count, events_joined, posts_count, streak_current)
  VALUES (v_fan_id, 1250, 1180, 1150, 3200, 'Silber I', 15, 5, 8, 3)
  ON CONFLICT (user_id) DO UPDATE SET
    trader_elo = EXCLUDED.trader_elo,
    manager_elo = EXCLUDED.manager_elo,
    analyst_elo = EXCLUDED.analyst_elo,
    total_score = EXCLUDED.total_score,
    tier = EXCLUDED.tier;

  -- ──────────────────────────────────────────────
  -- Step 9: Demo Fan follows Sakaryaspor
  -- ──────────────────────────────────────────────
  INSERT INTO club_followers (user_id, club_id)
  VALUES (v_fan_id, v_club_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO club_followers (user_id, club_id)
  VALUES (v_admin_id, v_club_id)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Demo accounts seeded successfully!';
  RAISE NOTICE 'Fan: % | Admin: % | Platform: %', v_fan_id, v_admin_id, v_platform_id;
END $$;
