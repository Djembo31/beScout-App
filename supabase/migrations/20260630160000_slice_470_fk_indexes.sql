-- Slice 470 — Perf: Covering-Indizes für 49 unindexed Foreign Keys
-- ---------------------------------------------------------------------------
-- CEO autonom-Go (Anil 2026-06-30 "Policies/Index Perf-Lane").
--
-- Supabase-Advisor unindexed_foreign_keys: 49 FK-Constraints ohne Covering-Index
-- = suboptimale Join-/Cascade-Performance. Fix = additiver Covering-Index je FK-Spalte(n)
-- (CREATE INDEX IF NOT EXISTS, idempotent, KEIN Access/Integritaet/Body beruehrt).
-- DO-Loop ueber die autoritative Advisor-conname-Liste (Spalten aus pg_constraint aufgeloest;
-- Hand-Covering-Query war PG-int2vector-Array-Semantik-falsch -> Advisor-Liste vertraut).
-- Non-concurrent OK (keine Riesen-Tabelle in der Liste: config + lineups/scores/etc., schneller Build).
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  r RECORD;
  v_cols_q text;
  v_cols_name text;
  v_idxname text;
  v_fks text[] := ARRAY[
    'achievement_definitions_updated_by_fkey','bounties_fixture_id_fkey','chip_usages_event_id_fkey',
    'club_fan_rank_thresholds_updated_by_fkey','club_withdrawals_requested_by_fkey','club_withdrawals_reviewed_by_fkey',
    'community_polls_player_id_fkey','content_reports_resolved_by_fkey','cosmetic_shop_listings_cosmetic_id_fkey',
    'creator_config_updated_by_fkey','dpc_of_the_week_player_id_fkey','elo_config_updated_by_fkey',
    'event_fee_config_updated_by_fkey','fixture_substitutions_club_id_fkey','fixture_substitutions_player_in_id_fkey',
    'fixture_substitutions_player_out_id_fkey','holding_locks_player_id_fkey','league_standings_club_id_fkey',
    'liga_reward_config_updated_by_fkey','lineups_slot_att2_fkey','lineups_slot_att3_fkey','lineups_slot_def3_fkey',
    'lineups_slot_def4_fkey','lineups_slot_mid3_fkey','lineups_slot_mid4_fkey','manager_points_config_updated_by_fkey',
    'monthly_liga_snapshots_league_id_fkey','monthly_liga_winners_league_id_fkey','monthly_liga_winners_user_id_fkey',
    'mystery_box_results_cosmetic_id_fkey','offers_counter_offer_id_fkey','player_gameweek_scores_fixture_id_fkey',
    'player_gameweek_scores_league_id_fkey','player_transfers_team_in_id_fkey','player_transfers_team_out_id_fkey',
    'rang_thresholds_updated_by_fkey','research_posts_fixture_id_fkey','score_road_config_updated_by_fkey',
    'sponsor_impressions_viewer_id_fkey','sponsors_club_id_fkey','sponsors_created_by_fkey','streak_config_updated_by_fkey',
    'user_cosmetics_cosmetic_id_fkey','user_daily_challenges_challenge_id_fkey','user_equipment_equipment_key_fkey',
    'user_equipment_rank_fkey','user_founding_passes_granted_by_fkey','user_mentorship_progress_milestone_id_fkey',
    'verified_scouts_verified_by_fkey'
  ];
BEGIN
  FOR r IN
    SELECT c.conname, c.conrelid AS reloid, cl.relname AS tblname, c.conkey
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    JOIN pg_class cl ON cl.oid = c.conrelid
    WHERE c.contype = 'f' AND n.nspname = 'public' AND c.conname = ANY(v_fks)
  LOOP
    SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY k.ord),
           string_agg(a.attname, '_' ORDER BY k.ord)
      INTO v_cols_q, v_cols_name
    FROM unnest(r.conkey) WITH ORDINALITY AS k(attnum, ord)
    JOIN pg_attribute a ON a.attrelid = r.reloid AND a.attnum = k.attnum;

    v_idxname := left('idx_' || r.tblname || '_' || v_cols_name, 63);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (%s)', v_idxname, r.tblname, v_cols_q);
  END LOOP;
END $$;
