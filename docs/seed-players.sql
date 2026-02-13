-- ============================================
-- BeScout Pilot: 25 Sakaryaspor Spieler Seed
-- ============================================
-- Quelle: Transfermarkt.us, Saison 2025/26
-- Preise: Marktwert / 50 = BSD Startpreis (in Cents)
-- Stats: Geschaetzt fuer Halbsaison (ca. Spieltag 20)
-- ============================================

INSERT INTO public.players (
  first_name, last_name, position, club, age, shirt_number, nationality, image_url,
  matches, goals, assists, clean_sheets,
  perf_l5, perf_l15, perf_season,
  dpc_total, dpc_available, floor_price, last_price, price_change_24h, volume_24h
) VALUES

-- ============================================
-- TORHUETER (3)
-- ============================================

('Ataberk', 'Dadakdeniz', 'GK', 'Sakaryaspor', 26, 29, 'TR', NULL,
 20, 0, 0, 7,
 58.00, 55.00, 54.00,
 10000, 5000, 6000, 6000, 0, 0),

('Jakub', 'Szumski', 'GK', 'Sakaryaspor', 33, 34, 'PL', NULL,
 3, 0, 0, 1,
 42.00, 40.00, 40.00,
 10000, 5000, 1000, 1000, 0, 0),

('Goktug', 'Baytekin', 'GK', 'Sakaryaspor', 21, 90, 'TR', NULL,
 0, 0, 0, 0,
 0.00, 0.00, 0.00,
 10000, 5000, 1000, 1000, 0, 0),

-- ============================================
-- VERTEIDIGER (8)
-- ============================================

('Arif', 'Kocaman', 'DEF', 'Sakaryaspor', 22, 43, 'TR', NULL,
 19, 2, 1, 6,
 65.00, 62.00, 60.00,
 10000, 5000, 18000, 18000, 0, 0),

('Burak', 'Bekaroglu', 'DEF', 'Sakaryaspor', 28, 4, 'TR', NULL,
 18, 1, 2, 5,
 52.00, 54.00, 52.00,
 10000, 5000, 6000, 6000, 0, 0),

('Batuhan', 'Cakir', 'DEF', 'Sakaryaspor', 25, 24, 'TR', NULL,
 14, 0, 0, 4,
 48.00, 46.00, 45.00,
 10000, 5000, 4000, 4000, 0, 0),

('Emrecan', 'Terzi', 'DEF', 'Sakaryaspor', 22, 94, 'TR', NULL,
 17, 0, 3, 5,
 60.00, 58.00, 56.00,
 10000, 5000, 9000, 9000, 0, 0),

('Dogukan', 'Tuzcu', 'DEF', 'Sakaryaspor', 20, 88, 'TR', NULL,
 10, 0, 1, 3,
 50.00, 47.00, 46.00,
 10000, 5000, 3000, 3000, 0, 0),

('Caner', 'Erkin', 'DEF', 'Sakaryaspor', 37, 2, 'TR', NULL,
 12, 0, 2, 3,
 44.00, 46.00, 44.00,
 10000, 5000, 1000, 1000, 0, 0),

('Ruan', 'Carlos', 'DEF', 'Sakaryaspor', 30, 21, 'BR', NULL,
 18, 1, 4, 5,
 62.00, 58.00, 57.00,
 10000, 5000, 12000, 12000, 0, 0),

('Serkan', 'Yavuz', 'DEF', 'Sakaryaspor', 29, 22, 'TR', NULL,
 15, 0, 1, 4,
 46.00, 48.00, 46.00,
 10000, 5000, 3000, 3000, 0, 0),

-- ============================================
-- MITTELFELD (7)
-- ============================================

('Ismaila', 'Soro', 'MID', 'Sakaryaspor', 27, 44, 'CI', NULL,
 19, 1, 3, 0,
 63.00, 60.00, 58.00,
 10000, 5000, 15000, 15000, 0, 0),

('Sergio', 'Pena', 'MID', 'Sakaryaspor', 30, 16, 'PE', NULL,
 18, 4, 7, 0,
 72.00, 68.00, 66.00,
 10000, 5000, 24000, 24000, 0, 0),

('Kerem', 'Sen', 'MID', 'Sakaryaspor', 23, 25, 'TR', NULL,
 16, 2, 4, 0,
 58.00, 55.00, 54.00,
 10000, 5000, 7000, 7000, 0, 0),

('Alparslan', 'Demir', 'MID', 'Sakaryaspor', 26, 85, 'TR', NULL,
 8, 0, 1, 0,
 40.00, 42.00, 40.00,
 10000, 5000, 1000, 1000, 0, 0),

('Mohamed Hassan', 'Fofana', 'MID', 'Sakaryaspor', 20, 14, 'CI', NULL,
 6, 0, 0, 0,
 38.00, 36.00, 35.00,
 10000, 5000, 1000, 1000, 0, 0),

('Emre', 'Demir', 'MID', 'Sakaryaspor', 22, NULL, 'TR', NULL,
 15, 3, 5, 0,
 66.00, 62.00, 60.00,
 10000, 5000, 11000, 11000, 0, 0),

('Josip', 'Vukovic', 'MID', 'Sakaryaspor', 33, NULL, 'HR', NULL,
 12, 1, 2, 0,
 50.00, 48.00, 47.00,
 10000, 5000, 3500, 3500, 0, 0),

-- ============================================
-- ANGRIFF (7)
-- ============================================

('Owusu', 'Kwabena', 'ATT', 'Sakaryaspor', 28, 8, 'GH', NULL,
 17, 5, 3, 0,
 60.00, 56.00, 55.00,
 10000, 5000, 8000, 8000, 0, 0),

('Mirza', 'Cihan', 'ATT', 'Sakaryaspor', 25, 61, 'TR', NULL,
 14, 3, 2, 0,
 54.00, 50.00, 49.00,
 10000, 5000, 4000, 4000, 0, 0),

('Mete', 'Demir', 'ATT', 'Sakaryaspor', 27, 77, 'TR', NULL,
 16, 4, 3, 0,
 58.00, 55.00, 54.00,
 10000, 5000, 5500, 5500, 0, 0),

('Eren', 'Erdogan', 'ATT', 'Sakaryaspor', 24, 99, 'TR', NULL,
 15, 3, 2, 0,
 56.00, 52.00, 51.00,
 10000, 5000, 5500, 5500, 0, 0),

('Poyraz', 'Yildirim', 'ATT', 'Sakaryaspor', 21, 91, 'TR', NULL,
 20, 12, 4, 0,
 76.00, 72.00, 70.00,
 10000, 5000, 30000, 30000, 0, 0),

('Melih', 'Bostan', 'ATT', 'Sakaryaspor', 21, 9, 'TR', NULL,
 18, 8, 3, 0,
 68.00, 64.00, 62.00,
 10000, 5000, 16000, 16000, 0, 0),

('Lukasz', 'Zwolinski', 'ATT', 'Sakaryaspor', 32, 11, 'PL', NULL,
 16, 6, 2, 0,
 56.00, 54.00, 52.00,
 10000, 5000, 4000, 4000, 0, 0);


-- ============================================
-- Verify: 25 Spieler
-- ============================================
-- SELECT position, count(*) FROM players GROUP BY position ORDER BY position;
-- Erwartet: ATT=7, DEF=8, GK=3, MID=7
