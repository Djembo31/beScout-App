-- ============================================
-- BeScout: Add player status column
-- Values: 'fit', 'injured', 'suspended', 'doubtful'
-- ============================================

ALTER TABLE players ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'fit';

-- Optional: Set some test players to different statuses
-- UPDATE players SET status = 'injured' WHERE last_name = 'Akgün';
-- UPDATE players SET status = 'suspended' WHERE last_name = 'Demir';
-- UPDATE players SET status = 'doubtful' WHERE last_name = 'Kaya';
