-- Slice 375: DPC-Mastery-Feature entfernt (Anil-Entscheid 2026-06-25).
-- Stoppt die tägliche Mock-Progression (+1 hold_day/+1 xp pro Tag für jeden Holding)
-- und droppt die tote hold_days-Spalte. Echte XP-Engine (award_mastery_xp via Fantasy/Content)
-- + freeze/unfreeze (fn_mastery_on_trade) bleiben erhalten (reversibel).

-- 1. Mock-Cron unscheduln (idempotent: 0 rows wenn schon weg)
SELECT cron.unschedule(jobid) FROM cron.job WHERE command ILIKE '%increment_mastery_hold_days%';

-- 2. Mock-Engine-Funktion droppen
DROP FUNCTION IF EXISTS public.increment_mastery_hold_days();

-- 3. Tote Spalte droppen (kein Reader/Writer mehr nach 1+2)
ALTER TABLE public.dpc_mastery DROP COLUMN IF EXISTS hold_days;
