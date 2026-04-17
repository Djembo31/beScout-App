-- Slice 062 — Normalize Club-Logos auf api-sports canonical
-- 11 TFF-Clubs hatten Wikimedia-Logos (manual imports) → auf api-sports umgestellt.
-- Vor: 123 api-sports + 11 wikimedia. Nach: 134 api-sports, 0 wikimedia.
-- URL-Pattern: https://media.api-sports.io/football/teams/{api_football_team_id}.png
--
-- Fallback bei Image-404: separate Admin-Override-Feature (post-Phase 2).

UPDATE clubs c
SET logo_url = 'https://media.api-sports.io/football/teams/' || cei.external_id || '.png',
    updated_at = NOW()
FROM club_external_ids cei
WHERE cei.club_id = c.id
  AND cei.source = 'api_football'
  AND c.logo_url LIKE '%wikimedia.org%';
