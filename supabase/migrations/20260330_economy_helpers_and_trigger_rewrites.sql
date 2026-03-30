-- ============================================
-- Economy Config: Helper Functions + Trigger Rewrites
-- ============================================
-- All triggers now read from config tables instead of hardcoded values.
-- All functions applied live — this file documents the changes.

-- ── Helper Functions ──

-- fn_get_elo_delta(dimension, event_type) → INT
-- fn_get_elo_delta_by_profit(profit_pct) → INT (graduated trader deltas)
-- fn_get_rang_id_dynamic(score) → INT (replaces get_rang_id)
-- fn_get_rang_name_dynamic(score) → TEXT (replaces get_rang_name)
-- fn_get_manager_points_dynamic(rank, total) → INT (percentile or rank-based)
-- fn_get_streak_fantasy_bonus(streak_days) → NUMERIC
-- fn_get_streak_elo_boost(streak_days) → NUMERIC

-- ── Trigger Rewrites (all read from elo_config) ──

-- 1. fn_trader_score_on_trade → fn_get_elo_delta + fn_get_elo_delta_by_profit
-- 2. fn_analyst_score_on_post → fn_get_elo_delta('analyst','post_create')
-- 3. fn_analyst_score_on_research → fn_get_elo_delta('analyst','research_create'/'research_create_eval')
-- 4. trg_fn_research_unlock_gamification → fn_get_elo_delta('analyst','research_sold')
-- 5. trg_fn_post_vote_gamification → fn_get_elo_delta('analyst','post_upvote'/'post_excessive_downvotes')
-- 6. trg_fn_follow_gamification → fn_get_elo_delta('analyst','new_follower')
-- 7. trg_fn_event_scored_manager → fn_get_manager_points_dynamic()
-- 8. award_dimension_score → fn_get_rang_id_dynamic / fn_get_rang_name_dynamic

-- ── RPC Rewrites ──

-- score_event: v_fantasy_bonus_pct → fn_get_streak_fantasy_bonus(streak)
-- calculate_fan_rank: v_elo_boost_pct → fn_get_streak_elo_boost(streak)
-- claim_score_road: reward CASE → SELECT FROM score_road_config

-- NOTE: Full function bodies applied via Supabase MCP (too large for inline SQL).
-- See docs/plans/2026-03-30-economy-admin-design.md for details.
