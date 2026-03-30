-- Fantasy-specific mission definitions
INSERT INTO mission_definitions (key, type, title, description, icon, target_value, reward_cents, tracking_type, tracking_config) VALUES
  ('daily_fantasy_entry', 'daily', 'Fantasy-Event beitreten', 'Tritt einem Fantasy-Event bei', 'Trophy', 1, 5000, 'manual', '{}'),
  ('weekly_3_lineups', 'weekly', '3 Lineups einreichen', 'Reiche 3 Lineups in einer Woche ein', 'Users', 3, 15000, 'manual', '{}')
ON CONFLICT (key) DO NOTHING;
