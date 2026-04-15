-- =============================================================================
-- FIX: Liga-Logos Broken auf bescout.net (E2E-Discovery 2026-04-15)
--
-- Root Cause: leagues.logo_url hatten alle 'media-4.api-sports.io' als Host.
-- Dieser Subdomain-Prefix existiert NICHT (net::ERR_NAME_NOT_RESOLVED).
-- Korrekter Host: 'media.api-sports.io' (serves PNG auf GET, returns 403 auf HEAD).
--
-- E2E-Evidence: Playwright-MCP /market?tab=kaufen zeigte 51 Image-Errors,
-- davon 7× `media-4.api-sports.io/football/leagues/*.png` mit DNS-Fail.
--
-- Data-Layer-Fix (diese Migration): 7 Rows in leagues.logo_url sanitiert.
-- Config-Layer-Fix (separater Commit): next.config.mjs remotePatterns
-- erweitert um 'media.api-sports.io' — sonst blockt next/image mit 400.
-- =============================================================================

UPDATE public.leagues
SET logo_url = REPLACE(logo_url, 'media-4.api-sports.io', 'media.api-sports.io')
WHERE logo_url LIKE '%media-4.api-sports.io%';

-- Verify (0 remaining):
--   SELECT COUNT(*) FROM leagues WHERE logo_url LIKE '%media-4.%';
