-- ============================================
-- Mystery Box Drop Rate Calibration v1
-- Date: 2026-04-07
-- Replaces placeholder values from 20260406180000_mystery_box_equipment_system.sql
--
-- Strategy: Slight-positive EV (~+29% return), Equipment-Achievement (~50 boxes for full R1 set)
-- Simulation 50 boxes: ~970 tickets returned, ~11.6 equipment drops, ~1 CR drop, ~1 mythic
-- ============================================

DELETE FROM public.mystery_box_config;

INSERT INTO public.mystery_box_config (rarity, drop_weight, reward_type, reward_weight, min_value, max_value, active) VALUES
  -- Common 45% — 95% Tickets, 5% Equipment R1
  ('common',    45, 'tickets',   95, 8,     18,    true),
  ('common',    45, 'equipment',  5, 1,     1,     true),

  -- Rare 30% — 70% Tickets, 30% Equipment R1
  ('rare',      30, 'tickets',   70, 18,    35,    true),
  ('rare',      30, 'equipment', 30, 1,     1,     true),

  -- Epic 17% — 55% Tickets, 45% Equipment R1-R2
  ('epic',      17, 'tickets',   55, 40,    80,    true),
  ('epic',      17, 'equipment', 45, 1,     2,     true),

  -- Legendary 6% — 30% Tickets, 50% Equipment R1-R3, 20% CR (50-150 CR = 5000-15000 cents)
  ('legendary',  6, 'tickets',   30, 100,   200,   true),
  ('legendary',  6, 'equipment', 50, 1,     3,     true),
  ('legendary',  6, 'bcredits',  20, 5000,  15000, true),

  -- Mythic 2% — 65% Equipment R3-R4, 35% CR (100-250 CR = 10000-25000 cents)
  ('mythic',     2, 'equipment', 65, 3,     4,     true),
  ('mythic',     2, 'bcredits',  35, 10000, 25000, true);
