-- ============================================================================
-- Slice 197c: 4 neue Formationen (1-3-5-2, 1-4-5-1, 1-5-3-2, 1-5-4-1)
-- Date: 2026-04-25
-- CEO-Decision: Anil 2026-04-25 (Slice 197 SPEC) — FPL-Standard Formationen
-- Source-of-truth: pg_get_functiondef live verifiziert 2026-04-25
--   (matches 195d Migration + 195d Bench-Patches)
-- Patch: NUR formation-Validierungs-Liste erweitert (Body sonst identisch)
-- Spec: worklog/specs/197-fm-mechanics-fundament.md (197c)
-- Applied via mcp__supabase__apply_migration on 2026-04-25
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_save_lineup(p_event_id uuid, p_user_id uuid, p_formation text, p_captain_slot text DEFAULT NULL::text, p_wildcard_slots text[] DEFAULT '{}'::text[], p_slot_gk uuid DEFAULT NULL::uuid, p_slot_def1 uuid DEFAULT NULL::uuid, p_slot_def2 uuid DEFAULT NULL::uuid, p_slot_def3 uuid DEFAULT NULL::uuid, p_slot_def4 uuid DEFAULT NULL::uuid, p_slot_mid1 uuid DEFAULT NULL::uuid, p_slot_mid2 uuid DEFAULT NULL::uuid, p_slot_mid3 uuid DEFAULT NULL::uuid, p_slot_mid4 uuid DEFAULT NULL::uuid, p_slot_att uuid DEFAULT NULL::uuid, p_slot_att2 uuid DEFAULT NULL::uuid, p_slot_att3 uuid DEFAULT NULL::uuid, p_bench_gk uuid DEFAULT NULL::uuid, p_bench_o1 uuid DEFAULT NULL::uuid, p_bench_o2 uuid DEFAULT NULL::uuid, p_bench_o3 uuid DEFAULT NULL::uuid, p_bench_order integer[] DEFAULT ARRAY[1, 2, 3])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_event RECORD; v_entry RECORD; v_existing RECORD;
  v_lineup_id UUID; v_all_slots UUID[];
  v_slot_keys TEXT[] := ARRAY['gk','def1','def2','def3','def4','mid1','mid2','mid3','mid4','att','att2','att3'];
  v_pid UUID; v_key TEXT;
  v_min_sc INT; v_available INT; v_seen UUID[]; v_i INT;
  v_wildcard_count INT; v_old_wildcard_count INT; v_wildcard_delta INT;
  v_total_salary INT; v_player_perf INT;
  v_formation_trim TEXT; v_parts TEXT[];
  v_def_n INT; v_mid_n INT; v_att_n INT;
  v_def_f INT := 0; v_mid_f INT := 0; v_att_f INT := 0;
  v_slot_filled BOOLEAN;
  v_max_per_club_used INT;
  v_bench_pos TEXT;
  v_bench_holdings INT;
  v_bench_uids UUID[];
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'auth_mismatch');
  END IF;

  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'event_not_found'); END IF;
  IF v_event.status IN ('ended', 'scoring') THEN RETURN jsonb_build_object('ok', false, 'error', 'event_ended'); END IF;
  IF v_event.locks_at <= now() THEN RETURN jsonb_build_object('ok', false, 'error', 'event_locked'); END IF;

  SELECT * INTO v_entry FROM public.event_entries WHERE event_id = p_event_id AND user_id = p_user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'must_enter_first'); END IF;

  v_all_slots := ARRAY[
    p_slot_gk, p_slot_def1, p_slot_def2, p_slot_def3, p_slot_def4,
    p_slot_mid1, p_slot_mid2, p_slot_mid3, p_slot_mid4,
    p_slot_att, p_slot_att2, p_slot_att3
  ];

  v_formation_trim := TRIM(COALESCE(p_formation, ''));
  IF v_formation_trim = '' THEN RETURN jsonb_build_object('ok', false, 'error', 'invalid_formation'); END IF;
  -- Slice 197c: +4 neue Formationen (1-3-5-2, 1-4-5-1, 1-5-3-2, 1-5-4-1)
  IF NOT v_formation_trim = ANY(ARRAY['1-4-3-3','1-4-4-2','1-3-4-3','1-3-5-2','1-4-5-1','1-5-3-2','1-5-4-1','1-2-2-2','1-3-2-1','1-2-3-1','1-3-1-2','1-1-3-2']) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_formation', 'formation', p_formation);
  END IF;

  v_parts := string_to_array(v_formation_trim, '-');
  v_def_n := v_parts[2]::INT; v_mid_n := v_parts[3]::INT; v_att_n := v_parts[4]::INT;

  IF p_slot_gk IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'gk_required'); END IF;

  IF v_def_n < 4 AND p_slot_def4 IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'extra_slot_for_formation', 'slot', 'def4'); END IF;
  IF v_def_n < 3 AND p_slot_def3 IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'extra_slot_for_formation', 'slot', 'def3'); END IF;
  IF v_def_n < 2 AND p_slot_def2 IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'extra_slot_for_formation', 'slot', 'def2'); END IF;
  IF p_slot_def1 IS NOT NULL THEN v_def_f := v_def_f + 1; END IF;
  IF p_slot_def2 IS NOT NULL THEN v_def_f := v_def_f + 1; END IF;
  IF p_slot_def3 IS NOT NULL THEN v_def_f := v_def_f + 1; END IF;
  IF p_slot_def4 IS NOT NULL THEN v_def_f := v_def_f + 1; END IF;
  IF v_def_f != v_def_n THEN RETURN jsonb_build_object('ok', false, 'error', 'invalid_slot_count_def', 'expected', v_def_n, 'actual', v_def_f); END IF;

  IF v_mid_n < 4 AND p_slot_mid4 IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'extra_slot_for_formation', 'slot', 'mid4'); END IF;
  IF v_mid_n < 3 AND p_slot_mid3 IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'extra_slot_for_formation', 'slot', 'mid3'); END IF;
  IF v_mid_n < 2 AND p_slot_mid2 IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'extra_slot_for_formation', 'slot', 'mid2'); END IF;
  IF p_slot_mid1 IS NOT NULL THEN v_mid_f := v_mid_f + 1; END IF;
  IF p_slot_mid2 IS NOT NULL THEN v_mid_f := v_mid_f + 1; END IF;
  IF p_slot_mid3 IS NOT NULL THEN v_mid_f := v_mid_f + 1; END IF;
  IF p_slot_mid4 IS NOT NULL THEN v_mid_f := v_mid_f + 1; END IF;
  IF v_mid_f != v_mid_n THEN RETURN jsonb_build_object('ok', false, 'error', 'invalid_slot_count_mid', 'expected', v_mid_n, 'actual', v_mid_f); END IF;

  IF v_att_n < 3 AND p_slot_att3 IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'extra_slot_for_formation', 'slot', 'att3'); END IF;
  IF v_att_n < 2 AND p_slot_att2 IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'extra_slot_for_formation', 'slot', 'att2'); END IF;
  IF p_slot_att IS NOT NULL THEN v_att_f := v_att_f + 1; END IF;
  IF p_slot_att2 IS NOT NULL THEN v_att_f := v_att_f + 1; END IF;
  IF p_slot_att3 IS NOT NULL THEN v_att_f := v_att_f + 1; END IF;
  IF v_att_f != v_att_n THEN RETURN jsonb_build_object('ok', false, 'error', 'invalid_slot_count_att', 'expected', v_att_n, 'actual', v_att_f); END IF;

  IF p_captain_slot IS NOT NULL THEN
    v_slot_filled := CASE p_captain_slot
      WHEN 'gk' THEN p_slot_gk IS NOT NULL
      WHEN 'def1' THEN p_slot_def1 IS NOT NULL WHEN 'def2' THEN p_slot_def2 IS NOT NULL
      WHEN 'def3' THEN p_slot_def3 IS NOT NULL WHEN 'def4' THEN p_slot_def4 IS NOT NULL
      WHEN 'mid1' THEN p_slot_mid1 IS NOT NULL WHEN 'mid2' THEN p_slot_mid2 IS NOT NULL
      WHEN 'mid3' THEN p_slot_mid3 IS NOT NULL WHEN 'mid4' THEN p_slot_mid4 IS NOT NULL
      WHEN 'att' THEN p_slot_att IS NOT NULL WHEN 'att2' THEN p_slot_att2 IS NOT NULL
      WHEN 'att3' THEN p_slot_att3 IS NOT NULL ELSE FALSE
    END;
    IF NOT v_slot_filled THEN RETURN jsonb_build_object('ok', false, 'error', 'captain_slot_empty', 'captain_slot', p_captain_slot); END IF;
  END IF;

  v_wildcard_count := COALESCE(array_length(p_wildcard_slots, 1), 0);
  IF v_wildcard_count > 0 THEN
    FOR v_i IN 1..v_wildcard_count LOOP
      v_key := p_wildcard_slots[v_i];
      IF NOT v_key = ANY(v_slot_keys) THEN RETURN jsonb_build_object('ok', false, 'error', 'wildcard_slot_invalid', 'slot', v_key); END IF;
      v_slot_filled := CASE v_key
        WHEN 'gk' THEN p_slot_gk IS NOT NULL
        WHEN 'def1' THEN p_slot_def1 IS NOT NULL WHEN 'def2' THEN p_slot_def2 IS NOT NULL
        WHEN 'def3' THEN p_slot_def3 IS NOT NULL WHEN 'def4' THEN p_slot_def4 IS NOT NULL
        WHEN 'mid1' THEN p_slot_mid1 IS NOT NULL WHEN 'mid2' THEN p_slot_mid2 IS NOT NULL
        WHEN 'mid3' THEN p_slot_mid3 IS NOT NULL WHEN 'mid4' THEN p_slot_mid4 IS NOT NULL
        WHEN 'att' THEN p_slot_att IS NOT NULL WHEN 'att2' THEN p_slot_att2 IS NOT NULL
        WHEN 'att3' THEN p_slot_att3 IS NOT NULL ELSE FALSE
      END;
      IF NOT v_slot_filled THEN RETURN jsonb_build_object('ok', false, 'error', 'wildcard_slot_empty', 'slot', v_key); END IF;
    END LOOP;
  END IF;

  v_seen := '{}';
  FOR v_i IN 1..12 LOOP
    v_pid := v_all_slots[v_i];
    IF v_pid IS NOT NULL THEN
      IF v_pid = ANY(v_seen) THEN RETURN jsonb_build_object('ok', false, 'error', 'duplicate_player', 'player_id', v_pid); END IF;
      v_seen := array_append(v_seen, v_pid);
    END IF;
  END LOOP;

  IF v_event.max_per_club IS NOT NULL THEN
    SELECT MAX(cnt) INTO v_max_per_club_used FROM (
      SELECT p.club_id, COUNT(*) AS cnt
      FROM unnest(v_all_slots) AS s(pid)
      JOIN public.players p ON p.id = s.pid
      WHERE s.pid IS NOT NULL AND p.club_id IS NOT NULL
      GROUP BY p.club_id
    ) club_counts;
    IF v_max_per_club_used > v_event.max_per_club THEN
      RETURN jsonb_build_object('ok', false, 'error', 'max_per_club_exceeded', 'max', v_event.max_per_club, 'used', v_max_per_club_used);
    END IF;
  END IF;

  -- Slice 195d Bench-Validation
  IF p_bench_order IS NULL OR array_length(p_bench_order, 1) IS DISTINCT FROM 3
     OR NOT (1 = ANY(p_bench_order)) OR NOT (2 = ANY(p_bench_order)) OR NOT (3 = ANY(p_bench_order)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_bench_order');
  END IF;

  IF p_bench_gk IS NOT NULL THEN
    SELECT position INTO v_bench_pos FROM public.players WHERE id = p_bench_gk;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'bench_player_not_found', 'slot', 'bench_gk'); END IF;
    IF v_bench_pos IS DISTINCT FROM 'GK' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'bench_gk_position_mismatch', 'actual', v_bench_pos);
    END IF;
  END IF;

  FOR v_i IN 1..3 LOOP
    v_pid := CASE v_i WHEN 1 THEN p_bench_o1 WHEN 2 THEN p_bench_o2 WHEN 3 THEN p_bench_o3 END;
    IF v_pid IS NOT NULL THEN
      SELECT position INTO v_bench_pos FROM public.players WHERE id = v_pid;
      IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'bench_player_not_found', 'slot', 'bench_o' || v_i); END IF;
      IF v_bench_pos NOT IN ('DEF','MID','ATT') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'bench_outfield_position_mismatch', 'slot', 'bench_o' || v_i, 'actual', v_bench_pos);
      END IF;
    END IF;
  END LOOP;

  v_bench_uids := ARRAY[]::UUID[];
  FOREACH v_pid IN ARRAY ARRAY[p_bench_gk, p_bench_o1, p_bench_o2, p_bench_o3] LOOP
    IF v_pid IS NOT NULL THEN
      IF v_pid = ANY(v_bench_uids) THEN RETURN jsonb_build_object('ok', false, 'error', 'bench_duplicate', 'player_id', v_pid); END IF;
      IF v_pid = ANY(v_seen) THEN RETURN jsonb_build_object('ok', false, 'error', 'bench_overlaps_starter', 'player_id', v_pid); END IF;
      v_bench_uids := array_append(v_bench_uids, v_pid);
    END IF;
  END LOOP;

  FOREACH v_pid IN ARRAY v_bench_uids LOOP
    SELECT COALESCE(h.quantity, 0) INTO v_bench_holdings FROM public.holdings h
    WHERE h.user_id = p_user_id AND h.player_id = v_pid;
    IF NOT FOUND OR COALESCE(v_bench_holdings, 0) < 1 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'bench_not_in_holdings', 'player_id', v_pid, 'available', COALESCE(v_bench_holdings, 0));
    END IF;
  END LOOP;

  v_min_sc := COALESCE(v_event.min_sc_per_slot, 1);
  FOR v_i IN 1..12 LOOP
    v_pid := v_all_slots[v_i]; v_key := v_slot_keys[v_i];
    IF v_pid IS NOT NULL AND NOT (v_key = ANY(p_wildcard_slots)) THEN
      SELECT COALESCE(h.quantity, 0) - COALESCE(
        (SELECT SUM(hl.quantity_locked)::INT FROM public.holding_locks hl
         WHERE hl.user_id = p_user_id AND hl.player_id = v_pid AND hl.event_id != p_event_id), 0)
      INTO v_available FROM public.holdings h WHERE h.user_id = p_user_id AND h.player_id = v_pid;
      IF NOT FOUND OR COALESCE(v_available, 0) < v_min_sc THEN
        RETURN jsonb_build_object('ok', false, 'error', 'insufficient_sc', 'player_id', v_pid, 'available', COALESCE(v_available, 0), 'required', v_min_sc);
      END IF;
    END IF;
  END LOOP;

  IF v_wildcard_count > 0 THEN
    IF NOT COALESCE(v_event.wildcards_allowed, false) THEN RETURN jsonb_build_object('ok', false, 'error', 'wildcards_not_allowed'); END IF;
    IF v_wildcard_count > COALESCE(v_event.max_wildcards_per_lineup, 0) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'too_many_wildcards', 'used', v_wildcard_count, 'max', v_event.max_wildcards_per_lineup);
    END IF;
  END IF;

  IF v_event.salary_cap IS NOT NULL THEN
    v_total_salary := 0;
    FOR v_i IN 1..12 LOOP
      v_pid := v_all_slots[v_i];
      IF v_pid IS NOT NULL THEN
        SELECT COALESCE(p.perf_l5, 50) INTO v_player_perf FROM public.players p WHERE p.id = v_pid;
        v_total_salary := v_total_salary + COALESCE(v_player_perf, 50);
      END IF;
    END LOOP;
    IF v_total_salary > v_event.salary_cap THEN
      RETURN jsonb_build_object('ok', false, 'error', 'salary_cap_exceeded', 'total_salary', v_total_salary, 'cap', v_event.salary_cap);
    END IF;
  END IF;

  SELECT id, COALESCE(array_length(wildcard_slots, 1), 0) AS wc_count INTO v_existing
  FROM public.lineups WHERE event_id = p_event_id AND user_id = p_user_id;
  v_old_wildcard_count := COALESCE(v_existing.wc_count, 0);

  IF v_existing IS NULL THEN
    INSERT INTO public.lineups (
      event_id, user_id, formation, captain_slot, wildcard_slots, submitted_at, locked,
      slot_gk, slot_def1, slot_def2, slot_def3, slot_def4,
      slot_mid1, slot_mid2, slot_mid3, slot_mid4,
      slot_att, slot_att2, slot_att3,
      bench_gk, bench_o1, bench_o2, bench_o3, bench_order
    ) VALUES (
      p_event_id, p_user_id, v_formation_trim, p_captain_slot, p_wildcard_slots, now(), false,
      p_slot_gk, p_slot_def1, p_slot_def2, p_slot_def3, p_slot_def4,
      p_slot_mid1, p_slot_mid2, p_slot_mid3, p_slot_mid4,
      p_slot_att, p_slot_att2, p_slot_att3,
      p_bench_gk, p_bench_o1, p_bench_o2, p_bench_o3, p_bench_order
    ) RETURNING id INTO v_lineup_id;
  ELSE
    UPDATE public.lineups SET
      formation = v_formation_trim, captain_slot = p_captain_slot,
      wildcard_slots = p_wildcard_slots, submitted_at = now(),
      slot_gk = p_slot_gk, slot_def1 = p_slot_def1, slot_def2 = p_slot_def2,
      slot_def3 = p_slot_def3, slot_def4 = p_slot_def4,
      slot_mid1 = p_slot_mid1, slot_mid2 = p_slot_mid2,
      slot_mid3 = p_slot_mid3, slot_mid4 = p_slot_mid4,
      slot_att = p_slot_att, slot_att2 = p_slot_att2, slot_att3 = p_slot_att3,
      bench_gk = p_bench_gk, bench_o1 = p_bench_o1,
      bench_o2 = p_bench_o2, bench_o3 = p_bench_o3,
      bench_order = p_bench_order
    WHERE event_id = p_event_id AND user_id = p_user_id RETURNING id INTO v_lineup_id;
  END IF;

  DELETE FROM public.holding_locks WHERE event_id = p_event_id AND user_id = p_user_id;

  INSERT INTO public.holding_locks (user_id, player_id, event_id, quantity_locked)
  SELECT p_user_id, pid, p_event_id, v_min_sc
  FROM unnest(v_all_slots) WITH ORDINALITY AS t(pid, ord)
  WHERE pid IS NOT NULL AND NOT v_slot_keys[ord::int] = ANY(p_wildcard_slots);

  v_wildcard_delta := v_wildcard_count - v_old_wildcard_count;
  IF v_wildcard_delta > 0 THEN
    PERFORM public.spend_wildcards(p_user_id, v_wildcard_delta, 'lineup_wildcard', p_event_id, format('Wildcard Slots (%s) fuer Event', v_wildcard_delta));
  ELSIF v_wildcard_delta < 0 THEN
    PERFORM public.earn_wildcards(p_user_id, ABS(v_wildcard_delta), 'lineup_wildcard_refund', p_event_id, format('Wildcard Refund (%s) fuer Event', ABS(v_wildcard_delta)));
  END IF;

  RETURN jsonb_build_object('ok', true, 'lineup_id', v_lineup_id, 'is_new', v_existing IS NULL);
END;
$function$;

COMMENT ON FUNCTION public.rpc_save_lineup(uuid, uuid, text, text, text[], uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, integer[]) IS
  'Slice 197c (2026-04-25): + 4 neue Formationen (1-3-5-2, 1-4-5-1, 1-5-3-2, 1-5-4-1). Body komplett aus 195d Live-State.';

REVOKE EXECUTE ON FUNCTION public.rpc_save_lineup(uuid, uuid, text, text, text[], uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, integer[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpc_save_lineup(uuid, uuid, text, text, text[], uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, integer[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_save_lineup(uuid, uuid, text, text, text[], uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, integer[]) TO authenticated;
