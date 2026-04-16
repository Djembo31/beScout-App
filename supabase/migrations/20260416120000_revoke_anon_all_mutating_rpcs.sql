-- ============================================================
-- SECURITY: REVOKE anon access to all mutating + trigger RPCs
-- AR-44 batch hardening for all pre-2026-04-15 functions
--
-- Categories:
--   MUTATING: User actions that write data → anon REVOKED, authenticated GRANTED
--   TRIGGER: Internal functions called by DB triggers → REVOKE from ALL
--   READ-ONLY: Public query functions (club pages etc.) → kept accessible
-- ============================================================

-- ===================== MUTATING FUNCTIONS =====================

REVOKE EXECUTE ON FUNCTION public.accept_mentee FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_mentee TO authenticated;

REVOKE EXECUTE ON FUNCTION public.add_club_admin FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_club_admin TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_delete_post FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_post TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_toggle_pin FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_toggle_pin TO authenticated;

REVOKE EXECUTE ON FUNCTION public.calculate_ad_revenue_share FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_ad_revenue_share TO authenticated;

REVOKE EXECUTE ON FUNCTION public.calculate_creator_fund_payout FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_creator_fund_payout TO authenticated;

REVOKE EXECUTE ON FUNCTION public.cancel_event_entries FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_event_entries TO authenticated;

REVOKE EXECUTE ON FUNCTION public.cancel_scout_subscription FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_scout_subscription TO authenticated;

REVOKE EXECUTE ON FUNCTION public.cast_community_poll_vote FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cast_community_poll_vote TO authenticated;

REVOKE EXECUTE ON FUNCTION public.cast_vote FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cast_vote TO authenticated;

REVOKE EXECUTE ON FUNCTION public.check_all_analyst_decay FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_all_analyst_decay TO authenticated;

REVOKE EXECUTE ON FUNCTION public.check_analyst_decay FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_analyst_decay TO authenticated;

REVOKE EXECUTE ON FUNCTION public.claim_milestone_reward FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_milestone_reward TO authenticated;

REVOKE EXECUTE ON FUNCTION public.claim_score_road FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_score_road TO authenticated;

REVOKE EXECUTE ON FUNCTION public.claim_scout_mission_reward FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_scout_mission_reward TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_league FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_league TO authenticated;

REVOKE EXECUTE ON FUNCTION public.daily_price_volume_reset FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.daily_price_volume_reset TO authenticated;

REVOKE EXECUTE ON FUNCTION public.enforce_research_weekly_cap FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enforce_research_weekly_cap TO authenticated;

REVOKE EXECUTE ON FUNCTION public.init_user_tickets FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.init_user_tickets TO authenticated;

REVOKE EXECUTE ON FUNCTION public.init_user_wallet FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.init_user_wallet TO authenticated;

REVOKE EXECUTE ON FUNCTION public.join_league FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_league TO authenticated;

REVOKE EXECUTE ON FUNCTION public.leave_league FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_league TO authenticated;

REVOKE EXECUTE ON FUNCTION public.lock_event_entry FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lock_event_entry TO authenticated;

REVOKE EXECUTE ON FUNCTION public.notify_watchlist_price_change FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_watchlist_price_change TO authenticated;

REVOKE EXECUTE ON FUNCTION public.purchase_cosmetic_listing FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_cosmetic_listing TO authenticated;

REVOKE EXECUTE ON FUNCTION public.rate_research FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rate_research TO authenticated;

REVOKE EXECUTE ON FUNCTION public.recalc_floor_price FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recalc_floor_price TO authenticated;

REVOKE EXECUTE ON FUNCTION public.remove_club_admin FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_club_admin TO authenticated;

REVOKE EXECUTE ON FUNCTION public.renew_club_subscription FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.renew_club_subscription TO authenticated;

REVOKE EXECUTE ON FUNCTION public.request_club_withdrawal FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_club_withdrawal TO authenticated;

REVOKE EXECUTE ON FUNCTION public.request_mentor FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_mentor TO authenticated;

REVOKE EXECUTE ON FUNCTION public.rpc_lock_event_entry FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_lock_event_entry TO authenticated;

REVOKE EXECUTE ON FUNCTION public.rpc_save_lineup FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_save_lineup TO authenticated;

REVOKE EXECUTE ON FUNCTION public.send_tip FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_tip TO authenticated;

REVOKE EXECUTE ON FUNCTION public.submit_fan_wish FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_fan_wish TO authenticated;

REVOKE EXECUTE ON FUNCTION public.submit_player_valuation FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_player_valuation TO authenticated;

REVOKE EXECUTE ON FUNCTION public.submit_scout_mission FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_scout_mission TO authenticated;

REVOKE EXECUTE ON FUNCTION public.subscribe_to_club FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.subscribe_to_club TO authenticated;

REVOKE EXECUTE ON FUNCTION public.subscribe_to_scout FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.subscribe_to_scout TO authenticated;

REVOKE EXECUTE ON FUNCTION public.unlock_event_entry FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unlock_event_entry TO authenticated;

REVOKE EXECUTE ON FUNCTION public.unlock_research FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unlock_research TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_community_guidelines FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_community_guidelines TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_fan_wish_status FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_fan_wish_status TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_fee_config_rpc FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_fee_config_rpc TO authenticated;

REVOKE EXECUTE ON FUNCTION public.verify_scout FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_scout TO authenticated;

REVOKE EXECUTE ON FUNCTION public.vote_post FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vote_post TO authenticated;

-- ===================== TRIGGER FUNCTIONS =====================

REVOKE EXECUTE ON FUNCTION public.handle_new_user_wallet FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_fn_bounty_approved_analyst FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_fn_event_status_unlock_holdings FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_fn_sell_order_refresh FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_fn_trade_refresh FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_recalc_floor_on_trade FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_set_initial_listing_price FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_update_reference_price FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_replies_count FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_reward_structure FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_level_on_stats_update FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_player_aggregates FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_player_ipo_price FROM PUBLIC, anon, authenticated;
