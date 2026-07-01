-- Slice 499 Wave 2b (§0-Schnitt): altes club_votes-Voting-System DROP.
-- Vorbedingungen (alle erfüllt, live-verifiziert):
--   (1) Wave-1-Code deployt+live-walked (4860e4ab) — kein Client-Reader mehr (getAllVotes/castVote/
--       createVote/useClubVotes/cast_vote-Service alle entfernt).
--   (2) Einziger DB-interner Reader `refresh_user_stats` auf community_poll_votes umgestellt
--       (Migration 20260701120000, MUSS vorher laufen).
--   (3) cast_vote 0 Caller (src-grep + pg_proc-Scan leer).
-- vote_entries FKt club_votes (vote_entries_vote_id_fkey) → child zuerst droppen.
-- RLS-Policies fallen automatisch mit den Tabellen. Plain DROP (kein CASCADE nötig = Dependent-Beweis).
-- Kanonisch bleibt: community_polls + cast_community_poll_vote (70/30-Split, D86/D92).
DROP TABLE IF EXISTS public.vote_entries;
DROP TABLE IF EXISTS public.club_votes;
DROP FUNCTION IF EXISTS public.cast_vote(uuid, uuid, smallint);
