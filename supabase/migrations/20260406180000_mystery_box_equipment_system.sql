-- ============================================
-- Mystery Box Premium + Equipment System
-- ============================================

-- 1. Equipment Definitions (config-driven, erweiterbar)
CREATE TABLE IF NOT EXISTS public.equipment_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name_de TEXT NOT NULL,
  name_tr TEXT NOT NULL,
  description_de TEXT,
  description_tr TEXT,
  position TEXT NOT NULL CHECK (position IN ('ATT', 'MID', 'DEF', 'GK', 'ALL')),
  icon TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.equipment_definitions (key, name_de, name_tr, description_de, description_tr, position, icon) VALUES
  ('fire_shot',     'Feuerschuss',    'Ates Sutu',       'Boost auf Stuermer-Bewertung fuer den Spieltag.',    'Forvet oyuncusunun mac puanini arttirir.',    'ATT', 'flame'),
  ('banana_cross',  'Bananen Flanke', 'Muz Ortasi',      'Boost auf Mittelfeld-Bewertung fuer den Spieltag.', 'Orta saha oyuncusunun mac puanini arttirir.', 'MID', 'banana'),
  ('iron_wall',     'Eiserne Mauer',  'Demir Duvar',     'Boost auf Abwehr-Bewertung fuer den Spieltag.',     'Defans oyuncusunun mac puanini arttirir.',    'DEF', 'shield'),
  ('cat_eye',       'Katzenauge',     'Kedi Gozu',       'Boost auf Torwart-Bewertung fuer den Spieltag.',    'Kaleci oyuncusunun mac puanini arttirir.',    'GK',  'eye'),
  ('captain',       'Kapitaen',       'Kaptan',          'Boost auf einen beliebigen Spieler.',               'Herhangi bir oyuncunun mac puanini arttirir.','ALL', 'crown')
ON CONFLICT (key) DO NOTHING;

-- 2. Equipment Ranks (config-driven multipliers)
CREATE TABLE IF NOT EXISTS public.equipment_ranks (
  id SERIAL PRIMARY KEY,
  rank INTEGER NOT NULL UNIQUE CHECK (rank BETWEEN 1 AND 10),
  multiplier NUMERIC(4,2) NOT NULL,
  label TEXT NOT NULL
);

INSERT INTO public.equipment_ranks (rank, multiplier, label) VALUES
  (1, 1.05, 'R1'),
  (2, 1.10, 'R2'),
  (3, 1.15, 'R3'),
  (4, 1.25, 'R4')
ON CONFLICT (rank) DO NOTHING;

-- 3. User Equipment Inventory
CREATE TABLE IF NOT EXISTS public.user_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  equipment_key TEXT NOT NULL REFERENCES public.equipment_definitions(key),
  rank INTEGER NOT NULL REFERENCES public.equipment_ranks(rank),
  source TEXT NOT NULL CHECK (source IN ('mystery_box', 'achievement', 'mission', 'admin_grant', 'event_reward')),
  equipped_player_id UUID,
  equipped_event_id UUID,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_equipment_user ON public.user_equipment(user_id);
CREATE INDEX IF NOT EXISTS idx_user_equipment_equipped ON public.user_equipment(equipped_player_id) WHERE equipped_player_id IS NOT NULL;

-- 4. Mystery Box Config (drop rates + reward weights)
CREATE TABLE IF NOT EXISTS public.mystery_box_config (
  id SERIAL PRIMARY KEY,
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary', 'mythic')),
  drop_weight INTEGER NOT NULL DEFAULT 1,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('tickets', 'equipment', 'bcredits', 'cosmetic')),
  reward_weight INTEGER NOT NULL DEFAULT 1,
  min_value INTEGER,
  max_value INTEGER,
  active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Placeholder rows (real values from Economy Session)
INSERT INTO public.mystery_box_config (rarity, drop_weight, reward_type, reward_weight, min_value, max_value) VALUES
  ('common',    50, 'tickets',   1, 5,     15),
  ('rare',      28, 'tickets',   3, 15,    40),
  ('rare',      28, 'equipment', 1, 1,     1),
  ('epic',      15, 'tickets',   2, 40,    100),
  ('epic',      15, 'equipment', 2, 1,     2),
  ('legendary',  5, 'tickets',   1, 100,   250),
  ('legendary',  5, 'equipment', 2, 1,     3),
  ('legendary',  5, 'bcredits',  1, 5000,  20000),
  ('mythic',     2, 'equipment', 3, 3,     4),
  ('mythic',     2, 'bcredits',  2, 20000, 50000);

-- 5. Extend mystery_box_results with new reward types
ALTER TABLE public.mystery_box_results
  ADD COLUMN IF NOT EXISTS equipment_type TEXT,
  ADD COLUMN IF NOT EXISTS equipment_rank INTEGER,
  ADD COLUMN IF NOT EXISTS bcredits_amount BIGINT;

-- Extend CHECK constraints for rarity + reward_type
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mystery_box_results_rarity_check') THEN
    ALTER TABLE public.mystery_box_results DROP CONSTRAINT mystery_box_results_rarity_check;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mystery_box_results_reward_type_check') THEN
    ALTER TABLE public.mystery_box_results DROP CONSTRAINT mystery_box_results_reward_type_check;
  END IF;
END $$;

ALTER TABLE public.mystery_box_results
  ADD CONSTRAINT mystery_box_results_rarity_check
    CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'));

ALTER TABLE public.mystery_box_results
  ADD CONSTRAINT mystery_box_results_reward_type_check
    CHECK (reward_type IN ('tickets', 'cosmetic', 'equipment', 'bcredits'));

-- 6. RLS on new tables
ALTER TABLE public.equipment_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_ranks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mystery_box_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipment_definitions_select" ON public.equipment_definitions
  FOR SELECT USING (true);

CREATE POLICY "equipment_ranks_select" ON public.equipment_ranks
  FOR SELECT USING (true);

CREATE POLICY "user_equipment_select_own" ON public.user_equipment
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_equipment_insert_service" ON public.user_equipment
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_equipment_update_own" ON public.user_equipment
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "mystery_box_config_select" ON public.mystery_box_config
  FOR SELECT USING (true);

-- 7. open_mystery_box_v2 RPC
-- Uses weighted random from mystery_box_config for both rarity and reward selection.
CREATE OR REPLACE FUNCTION public.open_mystery_box_v2(p_free BOOLEAN DEFAULT false)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid UUID;
  v_effective_cost INTEGER;
  v_streak_discount INTEGER := 0;
  -- Rarity roll
  v_rarity TEXT;
  v_rarity_rec RECORD;
  v_rarity_roll INTEGER;
  v_rarity_acc INTEGER := 0;
  -- Reward roll
  v_reward_rec RECORD;
  v_reward_roll INTEGER;
  v_reward_acc INTEGER := 0;
  v_reward_type TEXT;
  v_min_val INTEGER;
  v_max_val INTEGER;
  -- Results
  v_tickets_amount INTEGER;
  v_eq_key TEXT;
  v_eq_rank INTEGER;
  v_eq_name_de TEXT;
  v_eq_name_tr TEXT;
  v_eq_position TEXT;
  v_bcredits BIGINT;
  v_cosmetic_id UUID;
  v_cosmetic_key TEXT;
  v_cosmetic_name TEXT;
  v_result_id UUID;
  v_total_w INTEGER;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  -- ── Ticket cost ──
  IF NOT p_free THEN
    SELECT COALESCE(sc.mystery_box_ticket_discount, 0) INTO v_streak_discount
    FROM public.user_streaks us
    JOIN public.streak_config sc ON us.current_streak >= sc.min_days
    WHERE us.user_id = v_uid
    ORDER BY sc.min_days DESC LIMIT 1;

    v_effective_cost := GREATEST(1, 15 - v_streak_discount);

    PERFORM 1 FROM public.user_tickets WHERE user_id = v_uid AND balance >= v_effective_cost FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Not enough tickets');
    END IF;

    UPDATE public.user_tickets
    SET balance = balance - v_effective_cost, spent_total = spent_total + v_effective_cost, updated_at = now()
    WHERE user_id = v_uid;

    INSERT INTO public.ticket_transactions (user_id, amount, balance_after, source, description)
    VALUES (v_uid, -v_effective_cost,
            (SELECT balance FROM public.user_tickets WHERE user_id = v_uid),
            'mystery_box', 'Mystery Box opened');
  ELSE
    v_effective_cost := 0;
  END IF;

  -- ── Roll rarity (weighted random across distinct rarities) ──
  SELECT COALESCE(SUM(drop_weight), 0) INTO v_total_w
  FROM (SELECT DISTINCT ON (rarity) rarity, drop_weight FROM public.mystery_box_config WHERE active) sub;

  IF v_total_w = 0 THEN
    -- No config: fallback
    v_rarity := 'common';
    v_reward_type := 'tickets';
    v_min_val := 5;
    v_max_val := 15;
  ELSE
    v_rarity_roll := floor(random() * v_total_w)::INTEGER;
    FOR v_rarity_rec IN
      SELECT DISTINCT ON (rarity) rarity, drop_weight
      FROM public.mystery_box_config WHERE active ORDER BY rarity
    LOOP
      v_rarity_acc := v_rarity_acc + v_rarity_rec.drop_weight;
      IF v_rarity_acc > v_rarity_roll THEN
        v_rarity := v_rarity_rec.rarity;
        EXIT;
      END IF;
    END LOOP;

    IF v_rarity IS NULL THEN v_rarity := 'common'; END IF;

    -- ── Roll reward type within rarity ──
    SELECT COALESCE(SUM(reward_weight), 0) INTO v_total_w
    FROM public.mystery_box_config WHERE active AND rarity = v_rarity;

    v_reward_roll := floor(random() * v_total_w)::INTEGER;
    v_reward_acc := 0;
    FOR v_reward_rec IN
      SELECT reward_type, reward_weight, min_value, max_value
      FROM public.mystery_box_config WHERE active AND rarity = v_rarity ORDER BY id
    LOOP
      v_reward_acc := v_reward_acc + v_reward_rec.reward_weight;
      IF v_reward_acc > v_reward_roll THEN
        v_reward_type := v_reward_rec.reward_type;
        v_min_val := v_reward_rec.min_value;
        v_max_val := v_reward_rec.max_value;
        EXIT;
      END IF;
    END LOOP;

    IF v_reward_type IS NULL THEN
      v_reward_type := 'tickets'; v_min_val := 5; v_max_val := 15;
    END IF;
  END IF;

  -- ── Generate reward ──
  CASE v_reward_type
    WHEN 'tickets' THEN
      v_tickets_amount := v_min_val + floor(random() * (v_max_val - v_min_val + 1))::INTEGER;
      UPDATE public.user_tickets
      SET balance = balance + v_tickets_amount, earned_total = earned_total + v_tickets_amount, updated_at = now()
      WHERE user_id = v_uid;
      INSERT INTO public.ticket_transactions (user_id, amount, balance_after, source, description)
      VALUES (v_uid, v_tickets_amount,
              (SELECT balance FROM public.user_tickets WHERE user_id = v_uid),
              'mystery_box',
              'Mystery Box: ' || v_tickets_amount || ' tickets (' || v_rarity || ')');

    WHEN 'equipment' THEN
      v_eq_rank := v_min_val + floor(random() * (v_max_val - v_min_val + 1))::INTEGER;
      SELECT key, name_de, name_tr, position
      INTO v_eq_key, v_eq_name_de, v_eq_name_tr, v_eq_position
      FROM public.equipment_definitions WHERE active ORDER BY random() LIMIT 1;

      INSERT INTO public.user_equipment (user_id, equipment_key, rank, source)
      VALUES (v_uid, v_eq_key, v_eq_rank, 'mystery_box');

    WHEN 'bcredits' THEN
      v_bcredits := v_min_val + floor(random() * (v_max_val - v_min_val + 1))::BIGINT;
      UPDATE public.wallets
      SET balance = balance + v_bcredits, updated_at = now()
      WHERE user_id = v_uid;

    WHEN 'cosmetic' THEN
      SELECT id, key, name INTO v_cosmetic_id, v_cosmetic_key, v_cosmetic_name
      FROM public.cosmetic_definitions
      WHERE active AND rarity = v_rarity
      ORDER BY random() LIMIT 1;
      IF v_cosmetic_id IS NOT NULL THEN
        INSERT INTO public.user_cosmetics (user_id, cosmetic_id, source)
        VALUES (v_uid, v_cosmetic_id, 'mystery_box')
        ON CONFLICT DO NOTHING;
      END IF;

    ELSE
      v_reward_type := 'tickets'; v_tickets_amount := 5;
      UPDATE public.user_tickets
      SET balance = balance + 5, earned_total = earned_total + 5, updated_at = now()
      WHERE user_id = v_uid;
  END CASE;

  -- ── Record result ──
  INSERT INTO public.mystery_box_results (
    user_id, rarity, reward_type, tickets_amount,
    cosmetic_id, equipment_type, equipment_rank, bcredits_amount, ticket_cost
  ) VALUES (
    v_uid, v_rarity, v_reward_type, v_tickets_amount,
    v_cosmetic_id, v_eq_key, v_eq_rank, v_bcredits, v_effective_cost
  ) RETURNING id INTO v_result_id;

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_result_id,
    'rarity', v_rarity,
    'reward_type', v_reward_type,
    'tickets_amount', v_tickets_amount,
    'equipment_type', v_eq_key,
    'equipment_rank', v_eq_rank,
    'equipment_name_de', v_eq_name_de,
    'equipment_name_tr', v_eq_name_tr,
    'equipment_position', v_eq_position,
    'bcredits_amount', v_bcredits,
    'cosmetic_key', v_cosmetic_key,
    'cosmetic_name', v_cosmetic_name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.open_mystery_box_v2 FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_mystery_box_v2 TO authenticated;
