-- ============================================
-- Multi-League Expansion: Add 6 new leagues + set logo_urls
-- ============================================

-- 1. Set logo_url on existing TFF 1. Lig
UPDATE public.leagues
SET logo_url = 'https://media-4.api-sports.io/football/leagues/204.png'
WHERE short = 'TFF1';

-- 2. Normalize TFF country code
UPDATE public.leagues SET country = 'TR' WHERE short = 'TFF1' AND country != 'TR';

-- 3. Add api_football_id column to leagues for sync mapping
ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS api_football_id INTEGER;

-- 4. Insert 6 new leagues with logo_urls
INSERT INTO public.leagues (id, name, short, country, season, logo_url, active_gameweek, max_gameweeks, is_active, api_football_id)
VALUES
  (gen_random_uuid(), 'Süper Lig',       'SL',  'TR', '2025-26', 'https://media-4.api-sports.io/football/leagues/203.png', 1, 38, false, 203),
  (gen_random_uuid(), '2. Bundesliga',   'BL2', 'DE', '2025-26', 'https://media-4.api-sports.io/football/leagues/79.png',  1, 34, false, 79),
  (gen_random_uuid(), 'Bundesliga',      'BL1', 'DE', '2025-26', 'https://media-4.api-sports.io/football/leagues/78.png',  1, 34, false, 78),
  (gen_random_uuid(), 'Serie A',         'SA',  'IT', '2025-26', 'https://media-4.api-sports.io/football/leagues/135.png', 1, 38, false, 135),
  (gen_random_uuid(), 'La Liga',         'LL',  'ES', '2025-26', 'https://media-4.api-sports.io/football/leagues/140.png', 1, 38, false, 140),
  (gen_random_uuid(), 'Premier League',  'PL',  'GB', '2025-26', 'https://media-4.api-sports.io/football/leagues/39.png',  1, 38, false, 39)
ON CONFLICT DO NOTHING;

-- 5. Set api_football_id for existing TFF
UPDATE public.leagues SET api_football_id = 204 WHERE short = 'TFF1' AND api_football_id IS NULL;

-- 6. Populate clubs.league_id for existing TFF clubs
UPDATE public.clubs
SET league_id = (SELECT id FROM public.leagues WHERE short = 'TFF1' LIMIT 1)
WHERE league = 'TFF 1. Lig' AND league_id IS NULL;
