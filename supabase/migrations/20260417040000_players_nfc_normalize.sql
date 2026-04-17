-- =============================================================================
-- Slice 013 — Players NFC Normalize (2026-04-17)
--
-- NFC-normalizes all first_name + last_name values in public.players.
--
-- Motivation: TURK-03 (turkish-handling.test.ts) queried
--   SELECT ... FROM players WHERE last_name ILIKE '%İ%'
-- and then asserted in JS: `p.last_name.includes('İ')`. One player
-- (`T. İnce`, id=bb44cdb4-...) was stored in decomposed (NFD) form —
-- bytes `49 cc 87` = `I` + U+0307 COMBINING DOT ABOVE — while every
-- other İ-player is in NFC form (single U+0130 codepoint, bytes
-- `c4 b0`). Postgres ILIKE treats both equivalents, so the SQL
-- matched the row; JS `String.prototype.includes('İ')` is strict
-- codepoint compare and failed.
--
-- Fix: run `normalize(x, NFC)` across both name columns. Idempotent —
-- rows already in NFC stay unchanged; only the single NFD row is
-- rewritten.
--
-- Data-safety: NFC normalization preserves visual rendering. The
-- affected row's name remains "İnce" in every font/browser. No
-- application-visible behavior changes except that JS `.includes('İ')`
-- now returns true (which is what downstream code already assumed).
--
-- Out of scope here: same fix for clubs.name / profiles.display_name /
-- research_posts.title / etc. TURK-06/TURK-07 passed on the same run,
-- so drift is isolated to this single row in players. Separate slice
-- can generalize if the drift recurs.
-- =============================================================================

UPDATE public.players
SET
  first_name = normalize(first_name, NFC),
  last_name  = normalize(last_name,  NFC)
WHERE
  first_name IS DISTINCT FROM normalize(first_name, NFC)
  OR last_name IS DISTINCT FROM normalize(last_name, NFC);
