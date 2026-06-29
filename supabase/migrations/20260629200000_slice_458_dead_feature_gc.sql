-- Slice 458 — Dead-Feature-GC-Batch: D-13 (season_reset_scores) + D-10 (2. Mission-System)
--
-- D-13: season_reset_scores() — verwaiste Season-Reset-RPC. Body mutiert scout_scores, ABER
--   0 statische Caller + 0 pg_cron + ACL {postgres,service_role} (kein Client) → unaufrufbar.
--   Lebender Zwilling = soft_reset_season(text,date,date), verkabelt in AdminLigaTab.
--
-- D-10: komplettes 2. Mission-System (Scout Missions) — 0 Render (grep src/), unbewusste Zwei
--   neben lebendem mission_definitions(30)/user_missions(4397). scout_mission_definitions=5 Rows
--   (Seed ohne Konsument), user_scout_missions=0. RPCs an authenticated granted aber 0 Caller →
--   GC schließt latentes A-02-Surface. Keine inbound FK/Trigger/View.
--
-- Reine Subtraktion (§0; R5). Keine CASCADE nötig. Frontend-Cleanup (scoutMissions.ts + 2 Hooks
-- + Re-Export + qk.missions.progress + db-invariants-Map) im selben Slice. qk.missions.scout BLEIBT
-- (geteilt mit lebendem useMissionHints). Pre-Apply force-rollback-Smoke: 5 DROPs fehlerfrei,
-- Survivor (soft_reset_season/scout_scores/mission_definitions/user_missions) unberührt.

-- D-13
DROP FUNCTION IF EXISTS public.season_reset_scores();

-- D-10
DROP FUNCTION IF EXISTS public.claim_scout_mission_reward(uuid, uuid, integer);
DROP FUNCTION IF EXISTS public.submit_scout_mission(uuid, uuid, uuid, integer);
DROP TABLE IF EXISTS public.user_scout_missions;
DROP TABLE IF EXISTS public.scout_mission_definitions;
