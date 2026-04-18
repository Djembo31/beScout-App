-- Slice 079 — F2 Fix: zwei Missions mit identischem Titel "Fantasy-Event beitreten"
-- Home zeigte beide nebeneinander mit gleichem Wortlaut (daily + weekly),
-- User konnte nicht unterscheiden welches welches ist. Titel mit Zeit-Scope-Prefix
-- unterscheidbar machen.
--
-- Applied on 2026-04-19 via mcp__supabase__apply_migration.

UPDATE public.mission_definitions
SET
  title = 'Tägliches Fantasy-Event',
  title_tr = 'Günlük Fantasy Etkinliği'
WHERE key = 'daily_fantasy_entry';

UPDATE public.mission_definitions
SET
  title = 'Wöchentliches Fantasy-Event',
  title_tr = 'Haftalık Fantasy Etkinliği'
WHERE key = 'weekly_fantasy';
