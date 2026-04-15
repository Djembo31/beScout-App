-- =============================================================================
-- AR-52 + AR-55 + AR-53 (J9, 2026-04-15) — Tier-Mismatch + REVOKE + rank Backfill
--
-- PROBLEMS:
--   AR-52 CRITICAL: airdrop_scores.tier CHECK = ANY('bronze','silver','gold','diamond')
--     aber TypeScript AirdropTier = 'silber' (DE). refresh_airdrop_score Body
--     schreibt auch 'silver'. Erster Call würde crashen.
--   AR-55 HIGH: refresh_my_airdrop_score + refresh_my_stats haben anon=EXECUTE
--     (AR-44 Violation, J4-earn_wildcards-Muster)
--   AR-53 CRITICAL: 55/66 Users haben user_stats.rank=0 (83% Leaderboard-
--     Corruption). refresh_user_stats nie aufgerufen für die meisten User.
--
-- FIXES:
--   1. airdrop_scores CHECK constraint → DE-Convention 'silber'
--   2. refresh_airdrop_score RPC Body: 'silver' → 'silber'
--   3. REVOKE refresh_my_airdrop_score + refresh_my_stats FROM anon
--   4. Backfill: run refresh_user_stats() for all users with rank=0
-- =============================================================================

-- AR-52: CHECK Constraint Update (DE-Convention)
ALTER TABLE public.airdrop_scores
  DROP CONSTRAINT IF EXISTS airdrop_scores_tier_check;

ALTER TABLE public.airdrop_scores
  ADD CONSTRAINT airdrop_scores_tier_check
  CHECK (tier = ANY (ARRAY['bronze'::text, 'silber'::text, 'gold'::text, 'diamond'::text]));

-- AR-52: refresh_airdrop_score Body-Fix
DO $$
DECLARE
  v_body TEXT;
  v_new_body TEXT;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_body
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='refresh_airdrop_score';

  IF v_body !~ 'THEN ''silver''' THEN
    RAISE NOTICE 'AR-52: refresh_airdrop_score bereits clean. Skipping.';
    RETURN;
  END IF;

  -- Nur das INSERT-Tier-Value ändern (NICHT die WHEN 'silber' Multiplier-Switch)
  v_new_body := regexp_replace(v_body, 'THEN ''silver''', 'THEN ''silber''', 'g');
  EXECUTE v_new_body;
END $$;

-- AR-55: REVOKE anon Grants
REVOKE EXECUTE ON FUNCTION public.refresh_my_airdrop_score() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refresh_my_airdrop_score() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.refresh_my_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refresh_my_stats() TO authenticated;

-- AR-53: Backfill rank=0 für alle User
DO $$
DECLARE
  v_uid UUID;
  v_count INTEGER := 0;
BEGIN
  FOR v_uid IN SELECT user_id FROM public.user_stats WHERE rank = 0
  LOOP
    BEGIN
      PERFORM refresh_user_stats(v_uid);
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'AR-53 Backfill: refresh_user_stats failed for % — %', v_uid, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE 'AR-53 Backfill: refreshed % user_stats', v_count;
END $$;

COMMENT ON CONSTRAINT airdrop_scores_tier_check ON public.airdrop_scores IS
  'AR-52 (2026-04-15): DE-Convention silber, konsistent mit club_subscriptions.tier';
