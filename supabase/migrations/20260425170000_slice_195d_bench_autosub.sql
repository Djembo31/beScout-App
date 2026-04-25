-- ============================================================================
-- Slice 195d: Fantasy Bench + Auto-Sub
-- Date: 2026-04-25
-- CEO-Decision: Anil 2026-04-25 — Bench (4 slots) + Auto-Sub bei No-Show
--   Position-konform (GK→GK, DEF/MID/ATT→outfield via bench_order Reihenfolge).
--   Bench ist Insurance: Holdings muessen vorhanden sein, aber KEIN holding_lock
--   (kein SC-Cost im Gegensatz zu Starting-11).
-- Source-of-truth:
--   - rpc_save_lineup: 20260425150000_slice_195c_event_max_per_club.sql (Body)
--   - score_event:     20260425140000_slice_195b_captain_boost_rename.sql (Body)
--   - save_lineup:     pg_get_functiondef live (kein eigener Migration-File vorher)
-- Applied via mcp__supabase__apply_migration on 2026-04-25
-- Spec: worklog/specs/195-fantasy-mechanics-overhaul.md (AC 5, 6 + Edge Cases 1-3)
-- ============================================================================

-- ── 1. Schema ──────────────────────────────────────────────────────────────
ALTER TABLE public.lineups
  ADD COLUMN IF NOT EXISTS bench_gk UUID NULL,
  ADD COLUMN IF NOT EXISTS bench_o1 UUID NULL,
  ADD COLUMN IF NOT EXISTS bench_o2 UUID NULL,
  ADD COLUMN IF NOT EXISTS bench_o3 UUID NULL,
  ADD COLUMN IF NOT EXISTS bench_order INT[] NOT NULL DEFAULT ARRAY[1,2,3]::INT[];

-- bench_order Permutation-Constraint: muss [1,2,3] in irgendeiner Reihenfolge sein.
-- (NULL wird durch NOT NULL bereits verhindert; CHECK validiert Inhalt.)
ALTER TABLE public.lineups
  DROP CONSTRAINT IF EXISTS lineups_bench_order_perm_chk;

ALTER TABLE public.lineups
  ADD CONSTRAINT lineups_bench_order_perm_chk
  CHECK (
    array_length(bench_order, 1) = 3
    AND 1 = ANY(bench_order)
    AND 2 = ANY(bench_order)
    AND 3 = ANY(bench_order)
  );

COMMENT ON COLUMN public.lineups.bench_gk IS
  'Slice 195d: Bench-GK (NULL = no bench GK). Position-strict via rpc_save_lineup.';
COMMENT ON COLUMN public.lineups.bench_o1 IS
  'Slice 195d: Bench-Outfield #1 (DEF/MID/ATT). NULL = leer.';
COMMENT ON COLUMN public.lineups.bench_o2 IS
  'Slice 195d: Bench-Outfield #2 (DEF/MID/ATT). NULL = leer.';
COMMENT ON COLUMN public.lineups.bench_o3 IS
  'Slice 195d: Bench-Outfield #3 (DEF/MID/ATT). NULL = leer.';
COMMENT ON COLUMN public.lineups.bench_order IS
  'Slice 195d: Sub-Reihenfolge fuer Outfield-Bench. Permutation [1,2,3]. score_event nutzt bench_o[bench_order[i]] in Reihenfolge.';

-- Belt-and-suspenders: alte rows ohne DEFAULT (theoretisch nicht moeglich da NOT NULL DEFAULT)
UPDATE public.lineups SET bench_order = ARRAY[1,2,3]::INT[]
WHERE bench_order IS NULL OR array_length(bench_order, 1) IS DISTINCT FROM 3;

-- ── 2. Wrapper save_lineup: DROP alte Signatur + CREATE neu (21 args) ──────
-- Polymorphie-Ambiguitaet vermeiden: explicit DROP der 16-arg-Variante bevor neu.
DROP FUNCTION IF EXISTS public.save_lineup(
  uuid, text, text, text[],
  uuid, uuid, uuid, uuid, uuid,
  uuid, uuid, uuid, uuid,
  uuid, uuid, uuid
);

CREATE OR REPLACE FUNCTION public.save_lineup(
  p_event_id uuid,
  p_formation text,
  p_captain_slot text DEFAULT NULL::text,
  p_wildcard_slots text[] DEFAULT '{}'::text[],
  p_slot_gk uuid DEFAULT NULL::uuid,
  p_slot_def1 uuid DEFAULT NULL::uuid,
  p_slot_def2 uuid DEFAULT NULL::uuid,
  p_slot_def3 uuid DEFAULT NULL::uuid,
  p_slot_def4 uuid DEFAULT NULL::uuid,
  p_slot_mid1 uuid DEFAULT NULL::uuid,
  p_slot_mid2 uuid DEFAULT NULL::uuid,
  p_slot_mid3 uuid DEFAULT NULL::uuid,
  p_slot_mid4 uuid DEFAULT NULL::uuid,
  p_slot_att uuid DEFAULT NULL::uuid,
  p_slot_att2 uuid DEFAULT NULL::uuid,
  p_slot_att3 uuid DEFAULT NULL::uuid,
  p_bench_gk uuid DEFAULT NULL::uuid,
  p_bench_o1 uuid DEFAULT NULL::uuid,
  p_bench_o2 uuid DEFAULT NULL::uuid,
  p_bench_o3 uuid DEFAULT NULL::uuid,
  p_bench_order int[] DEFAULT ARRAY[1,2,3]::int[]
)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT public.rpc_save_lineup(
    p_event_id, auth.uid(),
    p_formation, p_captain_slot, p_wildcard_slots,
    p_slot_gk, p_slot_def1, p_slot_def2, p_slot_def3, p_slot_def4,
    p_slot_mid1, p_slot_mid2, p_slot_mid3, p_slot_mid4,
    p_slot_att, p_slot_att2, p_slot_att3,
    p_bench_gk, p_bench_o1, p_bench_o2, p_bench_o3, p_bench_order
  );
$function$;

COMMENT ON FUNCTION public.save_lineup(
  uuid, text, text, text[],
  uuid, uuid, uuid, uuid, uuid,
  uuid, uuid, uuid, uuid,
  uuid, uuid, uuid,
  uuid, uuid, uuid, uuid, int[]
) IS 'Slice 195d (2026-04-25): Wrapper mit Bench-Slots (4) + bench_order. Forwards auth.uid() zu rpc_save_lineup.';

-- ── 3. rpc_save_lineup: Bench-Validation + Bench-INSERT/UPDATE ─────────────
-- Body = 195c (max_per_club) + Bench-Validation-Branch + Bench-Spalten in INSERT/UPDATE.
-- Source-of-truth: 20260425150000_slice_195c_event_max_per_club.sql (verified pg_get_functiondef 2026-04-25).
CREATE OR REPLACE FUNCTION public.rpc_save_lineup(
  p_event_id uuid, p_user_id uuid, p_formation text,
  p_captain_slot text DEFAULT NULL::text,
  p_wildcard_slots text[] DEFAULT '{}'::text[],
  p_slot_gk uuid DEFAULT NULL, p_slot_def1 uuid DEFAULT NULL,
  p_slot_def2 uuid DEFAULT NULL, p_slot_def3 uuid DEFAULT NULL,
  p_slot_def4 uuid DEFAULT NULL, p_slot_mid1 uuid DEFAULT NULL,
  p_slot_mid2 uuid DEFAULT NULL, p_slot_mid3 uuid DEFAULT NULL,
  p_slot_mid4 uuid DEFAULT NULL, p_slot_att uuid DEFAULT NULL,
  p_slot_att2 uuid DEFAULT NULL, p_slot_att3 uuid DEFAULT NULL,
  p_bench_gk uuid DEFAULT NULL, p_bench_o1 uuid DEFAULT NULL,
  p_bench_o2 uuid DEFAULT NULL, p_bench_o3 uuid DEFAULT NULL,
  p_bench_order int[] DEFAULT ARRAY[1,2,3]::int[]
)
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
  -- Slice 195d: Bench-Validation Helpers
  v_bench_pos TEXT;
  v_bench_holdings INT;
  v_bench_uids UUID[];
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'auth_mismatch');
  END IF;

  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'event_not_found');
  END IF;

  IF v_event.status IN ('ended', 'scoring') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'event_ended');
  END IF;

  IF v_event.locks_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'event_locked');
  END IF;

  SELECT * INTO v_entry FROM public.event_entries
    WHERE event_id = p_event_id AND user_id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'must_enter_first');
  END IF;

  v_all_slots := ARRAY[
    p_slot_gk, p_slot_def1, p_slot_def2, p_slot_def3, p_slot_def4,
    p_slot_mid1, p_slot_mid2, p_slot_mid3, p_slot_mid4,
    p_slot_att, p_slot_att2, p_slot_att3
  ];

  v_formation_trim := TRIM(COALESCE(p_formation, ''));
  IF v_formation_trim = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_formation');
  END IF;
  IF NOT v_formation_trim = ANY(ARRAY[
    '1-4-3-3','1-4-4-2','1-3-4-3',
    '1-2-2-2','1-3-2-1','1-2-3-1','1-3-1-2','1-1-3-2'
  ]) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_formation', 'formation', p_formation);
  END IF;

  v_parts := string_to_array(v_formation_trim, '-');
  v_def_n := v_parts[2]::INT;
  v_mid_n := v_parts[3]::INT;
  v_att_n := v_parts[4]::INT;

  IF p_slot_gk IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'gk_required');
  END IF;

  IF v_def_n < 4 AND p_slot_def4 IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'extra_slot_for_formation', 'slot', 'def4');
  END IF;
  IF v_def_n < 3 AND p_slot_def3 IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'extra_slot_for_formation', 'slot', 'def3');
  END IF;
  IF v_def_n < 2 AND p_slot_def2 IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'extra_slot_for_formation', 'slot', 'def2');
  END IF;
  IF p_slot_def1 IS NOT NULL THEN v_def_f := v_def_f + 1; END IF;
  IF p_slot_def2 IS NOT NULL THEN v_def_f := v_def_f + 1; END IF;
  IF p_slot_def3 IS NOT NULL THEN v_def_f := v_def_f + 1; END IF;
  IF p_slot_def4 IS NOT NULL THEN v_def_f := v_def_f + 1; END IF;
  IF v_def_f != v_def_n THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_slot_count_def',
      'expected', v_def_n, 'actual', v_def_f);
  END IF;

  IF v_mid_n < 4 AND p_slot_mid4 IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'extra_slot_for_formation', 'slot', 'mid4');
  END IF;
  IF v_mid_n < 3 AND p_slot_mid3 IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'extra_slot_for_formation', 'slot', 'mid3');
  END IF;
  IF v_mid_n < 2 AND p_slot_mid2 IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'extra_slot_for_formation', 'slot', 'mid2');
  END IF;
  IF p_slot_mid1 IS NOT NULL THEN v_mid_f := v_mid_f + 1; END IF;
  IF p_slot_mid2 IS NOT NULL THEN v_mid_f := v_mid_f + 1; END IF;
  IF p_slot_mid3 IS NOT NULL THEN v_mid_f := v_mid_f + 1; END IF;
  IF p_slot_mid4 IS NOT NULL THEN v_mid_f := v_mid_f + 1; END IF;
  IF v_mid_f != v_mid_n THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_slot_count_mid',
      'expected', v_mid_n, 'actual', v_mid_f);
  END IF;

  IF v_att_n < 3 AND p_slot_att3 IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'extra_slot_for_formation', 'slot', 'att3');
  END IF;
  IF v_att_n < 2 AND p_slot_att2 IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'extra_slot_for_formation', 'slot', 'att2');
  END IF;
  IF p_slot_att IS NOT NULL THEN v_att_f := v_att_f + 1; END IF;
  IF p_slot_att2 IS NOT NULL THEN v_att_f := v_att_f + 1; END IF;
  IF p_slot_att3 IS NOT NULL THEN v_att_f := v_att_f + 1; END IF;
  IF v_att_f != v_att_n THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_slot_count_att',
      'expected', v_att_n, 'actual', v_att_f);
  END IF;

  IF p_captain_slot IS NOT NULL THEN
    v_slot_filled := CASE p_captain_slot
      WHEN 'gk' THEN p_slot_gk IS NOT NULL
      WHEN 'def1' THEN p_slot_def1 IS NOT NULL
      WHEN 'def2' THEN p_slot_def2 IS NOT NULL
      WHEN 'def3' THEN p_slot_def3 IS NOT NULL
      WHEN 'def4' THEN p_slot_def4 IS NOT NULL
      WHEN 'mid1' THEN p_slot_mid1 IS NOT NULL
      WHEN 'mid2' THEN p_slot_mid2 IS NOT NULL
      WHEN 'mid3' THEN p_slot_mid3 IS NOT NULL
      WHEN 'mid4' THEN p_slot_mid4 IS NOT NULL
      WHEN 'att' THEN p_slot_att IS NOT NULL
      WHEN 'att2' THEN p_slot_att2 IS NOT NULL
      WHEN 'att3' THEN p_slot_att3 IS NOT NULL
      ELSE FALSE
    END;
    IF NOT v_slot_filled THEN
      RETURN jsonb_build_object('ok', false, 'error', 'captain_slot_empty',
        'captain_slot', p_captain_slot);
    END IF;
  END IF;

  v_wildcard_count := COALESCE(array_length(p_wildcard_slots, 1), 0);
  IF v_wildcard_count > 0 THEN
    FOR v_i IN 1..v_wildcard_count LOOP
      v_key := p_wildcard_slots[v_i];
      IF NOT v_key = ANY(v_slot_keys) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'wildcard_slot_invalid', 'slot', v_key);
      END IF;
      v_slot_filled := CASE v_key
        WHEN 'gk' THEN p_slot_gk IS NOT NULL
        WHEN 'def1' THEN p_slot_def1 IS NOT NULL
        WHEN 'def2' THEN p_slot_def2 IS NOT NULL
        WHEN 'def3' THEN p_slot_def3 IS NOT NULL
        WHEN 'def4' THEN p_slot_def4 IS NOT NULL
        WHEN 'mid1' THEN p_slot_mid1 IS NOT NULL
        WHEN 'mid2' THEN p_slot_mid2 IS NOT NULL
        WHEN 'mid3' THEN p_slot_mid3 IS NOT NULL
        WHEN 'mid4' THEN p_slot_mid4 IS NOT NULL
        WHEN 'att' THEN p_slot_att IS NOT NULL
        WHEN 'att2' THEN p_slot_att2 IS NOT NULL
        WHEN 'att3' THEN p_slot_att3 IS NOT NULL
        ELSE FALSE
      END;
      IF NOT v_slot_filled THEN
        RETURN jsonb_build_object('ok', false, 'error', 'wildcard_slot_empty', 'slot', v_key);
      END IF;
    END LOOP;
  END IF;

  v_seen := '{}';
  FOR v_i IN 1..12 LOOP
    v_pid := v_all_slots[v_i];
    IF v_pid IS NOT NULL THEN
      IF v_pid = ANY(v_seen) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'duplicate_player', 'player_id', v_pid);
      END IF;
      v_seen := array_append(v_seen, v_pid);
    END IF;
  END LOOP;

  -- Slice 195c: max_per_club Constraint (FPL-Style Pep-Roulette-Schutz)
  IF v_event.max_per_club IS NOT NULL THEN
    SELECT MAX(cnt) INTO v_max_per_club_used FROM (
      SELECT p.club_id, COUNT(*) AS cnt
      FROM unnest(v_all_slots) AS s(pid)
      JOIN public.players p ON p.id = s.pid
      WHERE s.pid IS NOT NULL AND p.club_id IS NOT NULL
      GROUP BY p.club_id
    ) club_counts;

    IF v_max_per_club_used > v_event.max_per_club THEN
      RETURN jsonb_build_object('ok', false, 'error', 'max_per_club_exceeded',
        'max', v_event.max_per_club, 'used', v_max_per_club_used);
    END IF;
  END IF;

  -- ── Slice 195d: Bench-Validation ───────────────────────────────────────
  -- bench_order Permutation (defensive — DB-CHECK enforced bereits)
  IF p_bench_order IS NULL
     OR array_length(p_bench_order, 1) IS DISTINCT FROM 3
     OR NOT (1 = ANY(p_bench_order))
     OR NOT (2 = ANY(p_bench_order))
     OR NOT (3 = ANY(p_bench_order)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_bench_order');
  END IF;

  -- Bench-GK: muss Position 'GK' haben
  IF p_bench_gk IS NOT NULL THEN
    SELECT position INTO v_bench_pos FROM public.players WHERE id = p_bench_gk;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'bench_player_not_found', 'slot', 'bench_gk');
    END IF;
    IF v_bench_pos IS DISTINCT FROM 'GK' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'bench_gk_position_mismatch',
        'actual', v_bench_pos);
    END IF;
  END IF;

  -- Bench-Outfield 1..3: Position muss DEF/MID/ATT sein
  FOR v_i IN 1..3 LOOP
    v_pid := CASE v_i
      WHEN 1 THEN p_bench_o1
      WHEN 2 THEN p_bench_o2
      WHEN 3 THEN p_bench_o3
    END;
    IF v_pid IS NOT NULL THEN
      SELECT position INTO v_bench_pos FROM public.players WHERE id = v_pid;
      IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'bench_player_not_found',
          'slot', 'bench_o' || v_i);
      END IF;
      IF v_bench_pos NOT IN ('DEF','MID','ATT') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'bench_outfield_position_mismatch',
          'slot', 'bench_o' || v_i, 'actual', v_bench_pos);
      END IF;
    END IF;
  END LOOP;

  -- Bench-Uniqueness untereinander + nicht in Starter-11
  v_bench_uids := ARRAY[]::UUID[];
  FOREACH v_pid IN ARRAY ARRAY[p_bench_gk, p_bench_o1, p_bench_o2, p_bench_o3] LOOP
    IF v_pid IS NOT NULL THEN
      IF v_pid = ANY(v_bench_uids) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'bench_duplicate', 'player_id', v_pid);
      END IF;
      IF v_pid = ANY(v_seen) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'bench_overlaps_starter', 'player_id', v_pid);
      END IF;
      v_bench_uids := array_append(v_bench_uids, v_pid);
    END IF;
  END LOOP;

  -- Bench-Holdings-Check (>= 1, KEIN holding_lock — Bench ist Insurance)
  FOREACH v_pid IN ARRAY v_bench_uids LOOP
    SELECT COALESCE(h.quantity, 0) INTO v_bench_holdings
    FROM public.holdings h
    WHERE h.user_id = p_user_id AND h.player_id = v_pid;
    IF NOT FOUND OR COALESCE(v_bench_holdings, 0) < 1 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'bench_not_in_holdings',
        'player_id', v_pid, 'available', COALESCE(v_bench_holdings, 0));
    END IF;
  END LOOP;
  -- ── /Slice 195d Bench-Validation ───────────────────────────────────────

  v_min_sc := COALESCE(v_event.min_sc_per_slot, 1);
  FOR v_i IN 1..12 LOOP
    v_pid := v_all_slots[v_i];
    v_key := v_slot_keys[v_i];
    IF v_pid IS NOT NULL AND NOT (v_key = ANY(p_wildcard_slots)) THEN
      SELECT COALESCE(h.quantity, 0) - COALESCE(
        (SELECT SUM(hl.quantity_locked)::INT FROM public.holding_locks hl
         WHERE hl.user_id = p_user_id AND hl.player_id = v_pid
         AND hl.event_id != p_event_id), 0)
      INTO v_available
      FROM public.holdings h
      WHERE h.user_id = p_user_id AND h.player_id = v_pid;

      IF NOT FOUND OR COALESCE(v_available, 0) < v_min_sc THEN
        RETURN jsonb_build_object('ok', false, 'error', 'insufficient_sc',
          'player_id', v_pid, 'available', COALESCE(v_available, 0), 'required', v_min_sc);
      END IF;
    END IF;
  END LOOP;

  IF v_wildcard_count > 0 THEN
    IF NOT COALESCE(v_event.wildcards_allowed, false) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'wildcards_not_allowed');
    END IF;
    IF v_wildcard_count > COALESCE(v_event.max_wildcards_per_lineup, 0) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'too_many_wildcards',
        'used', v_wildcard_count, 'max', v_event.max_wildcards_per_lineup);
    END IF;
  END IF;

  IF v_event.salary_cap IS NOT NULL THEN
    v_total_salary := 0;
    FOR v_i IN 1..12 LOOP
      v_pid := v_all_slots[v_i];
      IF v_pid IS NOT NULL THEN
        SELECT COALESCE(p.perf_l5, 50) INTO v_player_perf
        FROM public.players p WHERE p.id = v_pid;
        v_total_salary := v_total_salary + COALESCE(v_player_perf, 50);
      END IF;
    END LOOP;
    IF v_total_salary > v_event.salary_cap THEN
      RETURN jsonb_build_object('ok', false, 'error', 'salary_cap_exceeded',
        'total_salary', v_total_salary, 'cap', v_event.salary_cap);
    END IF;
  END IF;

  SELECT id, COALESCE(array_length(wildcard_slots, 1), 0) AS wc_count
  INTO v_existing
  FROM public.lineups
  WHERE event_id = p_event_id AND user_id = p_user_id;

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
      formation = v_formation_trim,
      captain_slot = p_captain_slot,
      wildcard_slots = p_wildcard_slots,
      submitted_at = now(),
      slot_gk = p_slot_gk, slot_def1 = p_slot_def1, slot_def2 = p_slot_def2,
      slot_def3 = p_slot_def3, slot_def4 = p_slot_def4,
      slot_mid1 = p_slot_mid1, slot_mid2 = p_slot_mid2,
      slot_mid3 = p_slot_mid3, slot_mid4 = p_slot_mid4,
      slot_att = p_slot_att, slot_att2 = p_slot_att2, slot_att3 = p_slot_att3,
      bench_gk = p_bench_gk, bench_o1 = p_bench_o1,
      bench_o2 = p_bench_o2, bench_o3 = p_bench_o3,
      bench_order = p_bench_order
    WHERE event_id = p_event_id AND user_id = p_user_id
    RETURNING id INTO v_lineup_id;
  END IF;

  DELETE FROM public.holding_locks
    WHERE event_id = p_event_id AND user_id = p_user_id;

  -- Locks NUR fuer Starter-11 (Bench bekommt keinen Lock — Insurance, kein SC-Cost)
  INSERT INTO public.holding_locks (user_id, player_id, event_id, quantity_locked)
  SELECT p_user_id, pid, p_event_id, v_min_sc
  FROM unnest(v_all_slots) WITH ORDINALITY AS t(pid, ord)
  WHERE pid IS NOT NULL
    AND NOT v_slot_keys[ord::int] = ANY(p_wildcard_slots);

  v_wildcard_delta := v_wildcard_count - v_old_wildcard_count;
  IF v_wildcard_delta > 0 THEN
    PERFORM public.spend_wildcards(
      p_user_id, v_wildcard_delta, 'lineup_wildcard', p_event_id,
      format('Wildcard Slots (%s) fuer Event', v_wildcard_delta)
    );
  ELSIF v_wildcard_delta < 0 THEN
    PERFORM public.earn_wildcards(
      p_user_id, ABS(v_wildcard_delta), 'lineup_wildcard_refund', p_event_id,
      format('Wildcard Refund (%s) fuer Event', ABS(v_wildcard_delta))
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'lineup_id', v_lineup_id,
    'is_new', v_existing IS NULL
  );
END;
$function$;

COMMENT ON FUNCTION public.rpc_save_lineup(
  uuid, uuid, text, text, text[],
  uuid, uuid, uuid, uuid, uuid,
  uuid, uuid, uuid, uuid,
  uuid, uuid, uuid,
  uuid, uuid, uuid, uuid, int[]
) IS 'Slice 195d (2026-04-25): + Bench-Slots (4) + bench_order Validation. Bench ist Insurance (Holdings-Check ohne Lock).';

-- ── 4. score_event: Auto-Sub bei No-Show (Position-Match) ──────────────────
-- Body = 195b (captain_boost) + Auto-Sub-Block.
-- Source-of-truth: 20260425140000_slice_195b_captain_boost_rename.sql (verified pg_get_functiondef 2026-04-25).
-- Auto-Sub Source-of-Truth: SUM(fixture_player_stats.minutes_played) per player_id;
-- pgs.score=0 ist NICHT ausreichendes Signal (Score kann 0 sein bei played).
CREATE OR REPLACE FUNCTION public.score_event(p_event_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_event RECORD;
  v_lineup RECORD;
  v_slot_keys TEXT[] := ARRAY['gk','def1','def2','def3','def4','mid1','mid2','mid3','mid4','att','att2','att3'];
  v_scores JSONB;
  v_player_id UUID;
  v_gw_score INT;
  v_total INT;
  v_scored_count INT := 0;
  v_slot_key TEXT;
  v_i INT;
  v_captain_slot TEXT;
  v_has_captain_boost BOOLEAN;
  v_has_synergy_surge BOOLEAN;
  v_tier_bonuses JSONB;
  v_tier_bonus_total BIGINT;
  v_club_ids UUID[];
  v_club_id UUID;
  v_synergy_pct NUMERIC(5,2);
  v_synergy_details JSONB;
  v_synergy_bonus INT;
  v_ranked RECORD;
  v_prize_pool BIGINT;
  v_distributed BIGINT := 0;
  v_winner_name TEXT;
  v_total_entries INT;
  v_user_streak INT;
  v_fantasy_bonus_pct NUMERIC(5,2);
  v_streak_bonus INT;
  v_equipment_map JSONB;
  v_eq_id UUID;
  v_eq_multiplier NUMERIC(4,2);
  -- Slice 195d: Auto-Sub Helpers
  v_played JSONB;             -- {player_id_text: minutes_played}
  v_starter_pos TEXT;          -- Position des No-Show-Starters (DEF/MID/ATT)
  v_sub_player_id UUID;        -- Substitute-Kandidat
  v_sub_pos TEXT;              -- Substitute-Position
  v_sub_minutes INT;           -- Minutes des Substitute
  v_used_bench UUID[];         -- Bench-Spieler die bereits als Sub verwendet wurden
  v_bench_o_arr UUID[];        -- bench_o1..o3 Array fuer order-Lookup
  v_bench_idx INT;             -- bench_order[i] (1/2/3)
  v_bench_loop INT;            -- separate counter fuer bench-loop (nicht v_i ueberschreiben!)
  v_starter_minutes INT;       -- Minutes des originalen Starters
  v_did_sub BOOLEAN;           -- War dieser Slot ein Auto-Sub?
BEGIN
  SELECT e.*, e.tier_bonuses AS tb INTO v_event FROM events e WHERE e.id = p_event_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Event nicht gefunden');
  END IF;

  IF auth.uid() IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid())
     AND NOT EXISTS (SELECT 1 FROM club_admins WHERE user_id = auth.uid() AND club_id = v_event.club_id)
     AND v_event.created_by IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nur Admins koennen Events auswerten');
  END IF;

  IF v_event.scored_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Event bereits ausgewertet');
  END IF;
  IF v_event.gameweek IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Event hat keinen Gameweek');
  END IF;

  v_tier_bonuses := COALESCE(v_event.tb, '{"decisive":500,"strong":300,"good":100}'::jsonb);

  FOR v_lineup IN
    SELECT l.id, l.user_id, l.captain_slot, l.equipment_map,
           ARRAY[l.slot_gk, l.slot_def1, l.slot_def2, l.slot_def3, l.slot_def4,
                 l.slot_mid1, l.slot_mid2, l.slot_mid3, l.slot_mid4,
                 l.slot_att, l.slot_att2, l.slot_att3] AS slot_players,
           l.bench_gk, l.bench_o1, l.bench_o2, l.bench_o3, l.bench_order
    FROM lineups l WHERE l.event_id = p_event_id
  LOOP
    v_scores := '{}'::jsonb;
    v_total := 0;
    v_captain_slot := v_lineup.captain_slot;
    v_tier_bonus_total := 0;
    v_club_ids := ARRAY[]::UUID[];
    v_equipment_map := COALESCE(v_lineup.equipment_map, '{}'::jsonb);
    v_used_bench := ARRAY[]::UUID[];
    v_bench_o_arr := ARRAY[v_lineup.bench_o1, v_lineup.bench_o2, v_lineup.bench_o3];

    -- Slice 195b: chip_type renamed to 'captain_boost'
    SELECT EXISTS(
      SELECT 1 FROM public.chip_usages
      WHERE user_id = v_lineup.user_id AND event_id = p_event_id AND chip_type = 'captain_boost'
    ) INTO v_has_captain_boost;

    SELECT EXISTS(
      SELECT 1 FROM public.chip_usages
      WHERE user_id = v_lineup.user_id AND event_id = p_event_id AND chip_type = 'synergy_surge'
    ) INTO v_has_synergy_surge;

    -- Slice 195d: Pre-loop Played-Map Build (single query, vermeidet N+1).
    -- minutes_played > 0 = gespielt. Source: fixture_player_stats JOIN fixtures(gameweek=event.gw).
    SELECT COALESCE(
      jsonb_object_agg(p::text, mp),
      '{}'::jsonb
    ) INTO v_played
    FROM (
      SELECT fps.player_id AS p, COALESCE(SUM(fps.minutes_played), 0)::INT AS mp
      FROM public.fixture_player_stats fps
      JOIN public.fixtures f ON f.id = fps.fixture_id
      WHERE f.gameweek = v_event.gameweek
        AND fps.player_id IS NOT NULL
        AND fps.player_id = ANY(
          v_lineup.slot_players ||
          ARRAY[v_lineup.bench_gk, v_lineup.bench_o1, v_lineup.bench_o2, v_lineup.bench_o3]
        )
      GROUP BY fps.player_id
    ) sub;

    FOR v_i IN 1..12 LOOP
      v_slot_key := v_slot_keys[v_i];
      v_player_id := v_lineup.slot_players[v_i];
      v_did_sub := FALSE;
      v_starter_minutes := 0;
      v_starter_pos := NULL;
      v_sub_minutes := 0;
      v_sub_pos := NULL;
      v_sub_player_id := NULL;

      IF v_player_id IS NOT NULL THEN
        -- ── Slice 195d: Auto-Sub bei No-Show ─────────────────────────────
        v_starter_minutes := COALESCE((v_played->>v_player_id::text)::INT, 0);
        IF v_starter_minutes <= 0 THEN
          -- Originaler Starter hat NICHT gespielt → Auto-Sub versuchen
          IF v_slot_key = 'gk' THEN
            -- GK-Bench-Sub: nur wenn bench_gk gespielt hat
            IF v_lineup.bench_gk IS NOT NULL
               AND NOT (v_lineup.bench_gk = ANY(v_used_bench)) THEN
              v_sub_minutes := COALESCE((v_played->>v_lineup.bench_gk::text)::INT, 0);
              IF v_sub_minutes > 0 THEN
                v_player_id := v_lineup.bench_gk;
                v_used_bench := array_append(v_used_bench, v_lineup.bench_gk);
                v_did_sub := TRUE;
              END IF;
            END IF;
          ELSE
            -- Outfield-Sub: Position-Match aus bench_o[bench_order[1..3]]
            -- Hole Position des originalen Starters
            SELECT position INTO v_starter_pos
            FROM public.players WHERE id = v_player_id;

            IF v_starter_pos IN ('DEF','MID','ATT') THEN
              FOR v_bench_loop IN 1..3 LOOP
                EXIT WHEN v_did_sub;
                v_bench_idx := v_lineup.bench_order[v_bench_loop]; -- 1/2/3
                v_sub_player_id := v_bench_o_arr[v_bench_idx];
                IF v_sub_player_id IS NULL THEN CONTINUE; END IF;
                IF v_sub_player_id = ANY(v_used_bench) THEN CONTINUE; END IF;

                v_sub_minutes := COALESCE((v_played->>v_sub_player_id::text)::INT, 0);
                IF v_sub_minutes <= 0 THEN CONTINUE; END IF;

                SELECT position INTO v_sub_pos
                FROM public.players WHERE id = v_sub_player_id;

                IF v_sub_pos = v_starter_pos THEN
                  v_player_id := v_sub_player_id;
                  v_used_bench := array_append(v_used_bench, v_sub_player_id);
                  v_did_sub := TRUE;
                END IF;
              END LOOP;
            END IF;
          END IF;
          -- Wenn kein Sub gefunden: v_player_id bleibt der originale Starter
          -- und v_gw_score wird unten aus pgs gelesen (= NULL → 40 Default? NEIN!
          -- Default 40 ist FPL "did not play" → wir setzen 0 fuer No-Show).
        END IF;
        -- ── /Slice 195d Auto-Sub ────────────────────────────────────────

        SELECT pgs.score INTO v_gw_score
        FROM player_gameweek_scores pgs
        WHERE pgs.player_id = v_player_id AND pgs.gameweek = v_event.gameweek;

        -- Slice 195d: Wenn kein Sub gefunden UND Starter nicht gespielt → 0 Pkt.
        -- Sonst (Starter played ODER Sub eingerechnet): pgs.score, default 40 wenn NULL.
        IF NOT v_did_sub AND v_starter_minutes <= 0 THEN
          v_gw_score := 0;
        ELSIF v_gw_score IS NULL THEN
          v_gw_score := 40;
        END IF;

        -- Captain bonus: 1.1x default (+10%), 1.25x with captain_boost chip.
        -- Bei Auto-Sub: Multiplier wirkt auf SUB-Score (FPL-Standard).
        IF v_captain_slot IS NOT NULL AND v_captain_slot = v_slot_key THEN
          IF v_has_captain_boost THEN
            v_gw_score := LEAST(150, ROUND(v_gw_score * 1.25));
          ELSE
            v_gw_score := LEAST(150, ROUND(v_gw_score * 1.1));
          END IF;
        END IF;

        IF v_equipment_map ? v_slot_key THEN
          v_eq_id := (v_equipment_map->>v_slot_key)::UUID;
          SELECT er.multiplier INTO v_eq_multiplier
          FROM public.user_equipment ue
          JOIN public.equipment_ranks er ON er.rank = ue.rank
          WHERE ue.id = v_eq_id AND ue.user_id = v_lineup.user_id;
          IF v_eq_multiplier IS NOT NULL THEN
            v_gw_score := ROUND(v_gw_score * v_eq_multiplier);
          END IF;
        END IF;

        v_scores := v_scores || jsonb_build_object(v_slot_key, v_gw_score);
        v_total := v_total + v_gw_score;

        IF v_gw_score >= 80 THEN
          v_tier_bonus_total := v_tier_bonus_total + COALESCE((v_tier_bonuses->>'decisive')::BIGINT, 500);
        ELSIF v_gw_score >= 70 THEN
          v_tier_bonus_total := v_tier_bonus_total + COALESCE((v_tier_bonuses->>'strong')::BIGINT, 300);
        ELSIF v_gw_score >= 60 THEN
          v_tier_bonus_total := v_tier_bonus_total + COALESCE((v_tier_bonuses->>'good')::BIGINT, 100);
        END IF;

        SELECT p.club_id INTO v_club_id FROM players p WHERE p.id = v_player_id;
        IF v_club_id IS NOT NULL THEN
          v_club_ids := array_append(v_club_ids, v_club_id);
        END IF;
      END IF;
    END LOOP;

    v_synergy_pct := 0;
    v_synergy_details := '[]'::jsonb;
    IF array_length(v_club_ids, 1) > 1 THEN
      DECLARE
        v_cid UUID; v_cnt INT; v_cname TEXT;
        v_seen UUID[] := ARRAY[]::UUID[];
      BEGIN
        FOR v_i IN 1..array_length(v_club_ids, 1) LOOP
          v_cid := v_club_ids[v_i];
          IF v_cid = ANY(v_seen) THEN CONTINUE; END IF;
          v_seen := array_append(v_seen, v_cid);
          v_cnt := 0;
          FOR v_gw_score IN 1..array_length(v_club_ids, 1) LOOP
            IF v_club_ids[v_gw_score] = v_cid THEN v_cnt := v_cnt + 1; END IF;
          END LOOP;
          IF v_cnt >= 2 THEN
            SELECT c.name INTO v_cname FROM clubs c WHERE c.id = v_cid;
            v_synergy_pct := LEAST(15.0, v_synergy_pct + 5.0);
            v_synergy_details := v_synergy_details || jsonb_build_array(jsonb_build_object(
              'type', 'club', 'source', COALESCE(v_cname, 'Club'), 'count', v_cnt, 'bonus_pct', 5.0
            ));
          END IF;
        END LOOP;
      END;
    END IF;

    IF v_has_synergy_surge AND v_synergy_pct > 0 THEN
      v_synergy_pct := LEAST(30.0, v_synergy_pct * 2);
    END IF;

    IF v_synergy_pct > 0 THEN
      v_synergy_bonus := ROUND(v_total * v_synergy_pct / 100);
      v_total := v_total + v_synergy_bonus;
    END IF;

    SELECT COALESCE(us.current_streak, 0) INTO v_user_streak
    FROM user_streaks us WHERE us.user_id = v_lineup.user_id;
    v_user_streak := COALESCE(v_user_streak, 0);

    v_fantasy_bonus_pct := CASE
      WHEN v_user_streak >= 60 THEN 0.15
      WHEN v_user_streak >= 7 THEN 0.05
      ELSE 0
    END;

    v_streak_bonus := 0;
    IF v_fantasy_bonus_pct > 0 THEN
      v_streak_bonus := ROUND(v_total * v_fantasy_bonus_pct);
      v_total := v_total + v_streak_bonus;
    END IF;

    UPDATE lineups SET
      slot_scores = v_scores,
      total_score = v_total,
      synergy_bonus_pct = v_synergy_pct,
      synergy_details = CASE WHEN v_synergy_pct > 0 THEN v_synergy_details ELSE NULL END,
      streak_bonus_pct = v_fantasy_bonus_pct * 100,
      locked = true
    WHERE id = v_lineup.id;

    IF v_equipment_map <> '{}'::jsonb THEN
      UPDATE public.user_equipment
      SET consumed_at = now()
      WHERE equipped_event_id = p_event_id
        AND user_id = v_lineup.user_id
        AND consumed_at IS NULL;
    END IF;

    IF v_tier_bonus_total > 0 THEN
      UPDATE wallets SET balance = balance + v_tier_bonus_total, updated_at = NOW()
      WHERE user_id = v_lineup.user_id;
      INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
      SELECT v_lineup.user_id, 'tier_bonus', v_tier_bonus_total, w.balance, p_event_id,
        'Score-Tier Bonus (GW ' || v_event.gameweek || ')'
      FROM wallets w WHERE w.user_id = v_lineup.user_id;
    END IF;

    v_scored_count := v_scored_count + 1;
  END LOOP;

  IF v_scored_count = 0 THEN
    UPDATE events SET status = 'ended', scored_at = NOW() WHERE id = p_event_id;
    RETURN jsonb_build_object(
      'success', true, 'scored_count', 0, 'note', 'no_lineups',
      'winner_name', 'Keine Top-Platzierung', 'prize_distributed', 0
    );
  END IF;

  FOR v_ranked IN
    SELECT l.id, l.user_id, l.total_score,
           DENSE_RANK() OVER (ORDER BY l.total_score DESC) AS drank
    FROM lineups l WHERE l.event_id = p_event_id AND l.total_score IS NOT NULL
    ORDER BY l.total_score DESC
  LOOP
    UPDATE lineups SET rank = v_ranked.drank WHERE id = v_ranked.id;
    IF v_ranked.drank = 1 AND v_winner_name IS NULL THEN
      SELECT COALESCE(p.display_name, p.handle) INTO v_winner_name
      FROM profiles p WHERE p.id = v_ranked.user_id;
    END IF;
  END LOOP;

  v_prize_pool := v_event.prize_pool;
  SELECT COUNT(*) INTO v_total_entries FROM lineups WHERE event_id = p_event_id AND total_score IS NOT NULL;

  IF v_prize_pool > 0 AND v_total_entries > 0 THEN
    DECLARE
      v_rs JSONB; v_max_rank INT; v_rank_rewards BIGINT[];
      v_rk INT; v_rk_count INT; v_rk_total BIGINT;
      v_rk_per_person BIGINT; v_next_slot INT := 1;
    BEGIN
      v_rs := COALESCE(v_event.reward_structure,
        '[{"rank":1,"pct":50},{"rank":2,"pct":30},{"rank":3,"pct":20}]'::jsonb);
      v_max_rank := jsonb_array_length(v_rs);
      FOR v_i IN 0..v_max_rank-1 LOOP
        v_rank_rewards[v_i+1] := ROUND(v_prize_pool * (v_rs->v_i->>'pct')::NUMERIC / 100)::BIGINT;
      END LOOP;
      FOR v_rk IN 1..v_max_rank LOOP
        IF v_next_slot > v_max_rank THEN EXIT; END IF;
        SELECT COUNT(*) INTO v_rk_count FROM lineups WHERE event_id = p_event_id AND rank = v_rk;
        IF v_rk_count > 0 THEN
          v_rk_total := 0;
          FOR v_i IN v_next_slot..LEAST(v_next_slot + v_rk_count - 1, v_max_rank) LOOP
            v_rk_total := v_rk_total + v_rank_rewards[v_i];
          END LOOP;
          v_next_slot := v_next_slot + v_rk_count;
          v_rk_per_person := FLOOR(v_rk_total / v_rk_count);
          IF v_rk_per_person > 0 THEN
            UPDATE lineups SET reward_amount = v_rk_per_person
            WHERE event_id = p_event_id AND rank = v_rk;
            UPDATE wallets w SET balance = w.balance + v_rk_per_person, updated_at = NOW()
            FROM lineups l WHERE l.event_id = p_event_id AND l.rank = v_rk AND w.user_id = l.user_id;
            INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
            SELECT l.user_id, 'fantasy_reward', v_rk_per_person, ww.balance, p_event_id,
              'Platz #' || v_rk || ' — ' || v_event.name
            FROM lineups l JOIN wallets ww ON ww.user_id = l.user_id
            WHERE l.event_id = p_event_id AND l.rank = v_rk;
            v_distributed := v_distributed + (v_rk_per_person * v_rk_count);
          END IF;
        END IF;
      END LOOP;
    END;
  END IF;

  UPDATE events SET status = 'ended', scored_at = NOW() WHERE id = p_event_id;

  UPDATE players p SET
    perf_l5 = LEAST(100, ROUND(sub.avg5)),
    perf_l15 = LEAST(100, ROUND(sub.avg15))
  FROM (
    SELECT pgs.player_id,
      AVG(pgs.score) FILTER (WHERE pgs.rn <= 5) AS avg5,
      AVG(pgs.score) FILTER (WHERE pgs.rn <= 15) AS avg15
    FROM (
      SELECT player_id, score,
        ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY gameweek DESC) AS rn
      FROM player_gameweek_scores
    ) pgs GROUP BY pgs.player_id
  ) sub WHERE p.id = sub.player_id;

  RETURN jsonb_build_object(
    'success', true,
    'scored_count', v_scored_count,
    'winner_name', COALESCE(v_winner_name, 'Keine Top-Platzierung'),
    'prize_distributed', v_distributed
  );
END;
$function$;

COMMENT ON FUNCTION public.score_event(uuid) IS
  'Slice 195d (2026-04-25): + Auto-Sub bei No-Show (Position-konform, GK-Bench + bench_order Reihenfolge). Captain-Bonus wirkt auf SUB-Score (FPL-Standard). No-Show ohne Sub = 0 Pkt.';

-- ── 5. AR-44: REVOKE/GRANT-Block ───────────────────────────────────────────
-- save_lineup wrapper
REVOKE EXECUTE ON FUNCTION public.save_lineup(
  uuid, text, text, text[],
  uuid, uuid, uuid, uuid, uuid,
  uuid, uuid, uuid, uuid,
  uuid, uuid, uuid,
  uuid, uuid, uuid, uuid, int[]
) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.save_lineup(
  uuid, text, text, text[],
  uuid, uuid, uuid, uuid, uuid,
  uuid, uuid, uuid, uuid,
  uuid, uuid, uuid,
  uuid, uuid, uuid, uuid, int[]
) FROM anon;
GRANT EXECUTE ON FUNCTION public.save_lineup(
  uuid, text, text, text[],
  uuid, uuid, uuid, uuid, uuid,
  uuid, uuid, uuid, uuid,
  uuid, uuid, uuid,
  uuid, uuid, uuid, uuid, int[]
) TO authenticated;

-- rpc_save_lineup (internal)
REVOKE EXECUTE ON FUNCTION public.rpc_save_lineup(
  uuid, uuid, text, text, text[],
  uuid, uuid, uuid, uuid, uuid,
  uuid, uuid, uuid, uuid,
  uuid, uuid, uuid,
  uuid, uuid, uuid, uuid, int[]
) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpc_save_lineup(
  uuid, uuid, text, text, text[],
  uuid, uuid, uuid, uuid, uuid,
  uuid, uuid, uuid, uuid,
  uuid, uuid, uuid,
  uuid, uuid, uuid, uuid, int[]
) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_save_lineup(
  uuid, uuid, text, text, text[],
  uuid, uuid, uuid, uuid, uuid,
  uuid, uuid, uuid, uuid,
  uuid, uuid, uuid,
  uuid, uuid, uuid, uuid, int[]
) TO authenticated;

-- score_event
REVOKE EXECUTE ON FUNCTION public.score_event(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.score_event(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.score_event(uuid) TO authenticated;
