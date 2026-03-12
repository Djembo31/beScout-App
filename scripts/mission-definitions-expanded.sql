-- ============================================
-- Expanded Mission Definitions
-- Adds missions for: daily challenges, mystery boxes,
-- research rating, upvoting, following users, post creation,
-- research writing, and aggregated community/daily activity
-- ============================================
-- NOTE: Run via Supabase SQL editor. Idempotent (ON CONFLICT skips existing keys).

-- New daily missions
INSERT INTO mission_definitions (key, type, title, description, icon, target_value, reward_cents, tracking_type, tracking_config, active)
VALUES
  ('complete_challenge', 'daily', 'Tägliche Challenge', 'Beantworte die tägliche Frage', '🧠', 1, 5000, 'manual', '{}', true),
  ('open_mystery_box', 'daily', 'Mystery Box öffnen', 'Öffne 1 Mystery Box', '🎁', 1, 3000, 'manual', '{}', true),
  ('rate_research', 'daily', 'Research bewerten', 'Bewerte 1 Research Report', '⭐', 1, 4000, 'manual', '{}', true),
  ('upvote_post', 'daily', '3 Posts liken', 'Like 3 Community Posts', '👍', 3, 3000, 'manual', '{}', true),
  ('follow_user', 'daily', 'Folge 1 User', 'Folge einem neuen User', '👥', 1, 2500, 'manual', '{}', true)
ON CONFLICT (key) DO NOTHING;

-- New weekly missions
INSERT INTO mission_definitions (key, type, title, description, icon, target_value, reward_cents, tracking_type, tracking_config, active)
VALUES
  ('write_research', 'weekly', 'Research schreiben', 'Schreibe 1 Research Report', '📝', 1, 40000, 'manual', '{}', true),
  ('create_post', 'weekly', '3 Posts erstellen', 'Erstelle 3 Community Posts', '✍️', 3, 20000, 'manual', '{}', true),
  ('community_activity', 'weekly', 'Community aktiv', '10 Community-Aktionen', '🏘️', 10, 15000, 'manual', '{}', true),
  ('social_activity', 'weekly', 'Social aktiv', '5 soziale Aktionen', '🤝', 5, 12000, 'manual', '{}', true),
  ('daily_activity', 'weekly', 'Täglich aktiv', 'Schließe 5 tägliche Aktivitäten ab', '📅', 5, 10000, 'manual', '{}', true)
ON CONFLICT (key) DO NOTHING;
