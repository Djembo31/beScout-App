-- Slice 064 — Extract Transfermarkt-IDs aus image_url
-- 505 Players haben transfermarkt-image_url. ID aus URL-Pattern extrahierbar:
-- https://img.a.transfermarkt.technology/portrait/{size}/{tm_id}-{timestamp}.{ext}
--
-- Idempotent via ON CONFLICT DO NOTHING.
-- Scraper-Endpoint /api/cron/sync-transfermarkt-batch nutzt diese IDs fuer
-- Market-Value + Contract-End Fetching.

INSERT INTO player_external_ids (player_id, external_id, source)
SELECT
  id AS player_id,
  substring(image_url FROM '/portrait/\w+/(\d+)-\d+\.') AS external_id,
  'transfermarkt' AS source
FROM players
WHERE image_url LIKE '%transfermarkt.technology%'
  AND image_url ~ '/portrait/\w+/\d+-\d+\.'
ON CONFLICT DO NOTHING;
