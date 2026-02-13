-- ============================================
-- BeScout Pilot: Seed Events
-- Preise in Cents (entry_fee, prize_pool)
-- ============================================

INSERT INTO events (name, type, status, format, gameweek, entry_fee, prize_pool, max_entries, current_entries, starts_at, locks_at, ends_at)
VALUES
  (
    'BeScout Weekly #13',
    'bescout',
    'registering',
    '6er',
    13,
    0,         -- free entry
    5000000,   -- 50.000 BSD
    NULL,      -- unlimited
    0,
    NOW() + INTERVAL '1 day',
    NOW() + INTERVAL '23 hours',
    NOW() + INTERVAL '4 days'
  ),
  (
    'Sakaryaspor Cup',
    'club',
    'registering',
    '6er',
    13,
    1000,      -- 10 BSD
    500000,    -- 5.000 BSD
    500,
    0,
    NOW() + INTERVAL '2 days',
    NOW() + INTERVAL '47 hours',
    NOW() + INTERVAL '5 days'
  ),
  (
    'LEGENDS Challenge',
    'sponsor',
    'upcoming',
    '11er',
    14,
    2500,      -- 25 BSD
    5000000,   -- 50.000 BSD
    200,
    0,
    NOW() + INTERVAL '5 days',
    NOW() + INTERVAL '119 hours',
    NOW() + INTERVAL '8 days'
  ),
  (
    'Daily Grind #1',
    'bescout',
    'registering',
    '6er',
    13,
    500,       -- 5 BSD
    150000,    -- 1.500 BSD
    500,
    0,
    NOW() + INTERVAL '6 hours',
    NOW() + INTERVAL '5 hours',
    NOW() + INTERVAL '1 day'
  ),
  (
    'TFF 1. Lig Spezial',
    'special',
    'upcoming',
    '6er',
    14,
    1500,      -- 15 BSD
    1000000,   -- 10.000 BSD
    1000,
    0,
    NOW() + INTERVAL '7 days',
    NOW() + INTERVAL '167 hours',
    NOW() + INTERVAL '10 days'
  );
