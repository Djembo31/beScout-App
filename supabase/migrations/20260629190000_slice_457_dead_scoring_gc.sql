-- Slice 457 — D-11: Dead-Scoring-Modell GC
--
-- Entfernt das tote 3./4./5. Scoring-Modell neben den zwei lebenden
-- (scout_scores = kanonisch/geld-gekoppelt; user_stats = drift-sichere Projektion seit S454).
--
-- Live-D87 (DB skzjfhvgccaeplydsunz, 2026-06-29):
--   bescout_scores  = 0 Rows, 2 RLS-Policies, FK→profiles (outbound), keine inbound FK/Trigger/View.
--   score_events    = 0 Rows, 1 RLS-Policy,  FK→profiles (outbound), keine inbound FK/Trigger/View.
--   award_score_points(uuid,text,integer,text,uuid,text) = schreibt NUR in die 2 toten Tabellen
--     (pg_proc.prosrc), 0 SQL-Caller (Writer-Enum S453), 0 echte src/-Caller (Grep: nur Cron-Step-
--     Label 'score_events' + Test-Listen = False-Positives). ACL {postgres,service_role} (kein anon).
--
-- Reine Subtraktion (§0 „Subtrahieren ist ein Zug"; R5 Bauen-auf-Vorrat-ohne-GC). Keine CASCADE
-- nötig: Policies/FK/Indizes droppen automatisch mit der Tabelle; keine inbound Dependency.
-- Pre-Apply force-rollback-Smoke bewies: DROP läuft fehlerfrei, 3 Objekte weg, scout_scores/
-- user_stats/score_history unberührt.

DROP FUNCTION IF EXISTS public.award_score_points(uuid, text, integer, text, uuid, text);
DROP TABLE IF EXISTS public.score_events;
DROP TABLE IF EXISTS public.bescout_scores;
