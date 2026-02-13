-- ============================================
-- BeScout: Add formation column to lineups
-- Stores the selected formation (e.g. '1-2-2-1')
-- ============================================

ALTER TABLE lineups ADD COLUMN IF NOT EXISTS formation TEXT DEFAULT '1-2-2-1';
