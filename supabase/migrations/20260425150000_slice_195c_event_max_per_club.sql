-- ============================================================================
-- Slice 195c: events.max_per_club Event-Parameter (FPL-Style Pep-Roulette-Schutz)
-- Date: 2026-04-25
-- CEO-Decision: Anil 2026-04-25 — Constraint NICHT global, sondern als Event-Parameter
--   bei Event-Erstellung. NULL = unlimited (Multi-Liga-Events).
-- Spec: worklog/specs/195-fantasy-mechanics-overhaul.md (AC 7, AC 8)
-- Source-of-truth: rpc_save_lineup ist neue Funktion (lebte vorher in baseline_fantasy)
-- Applied via mcp__supabase__apply_migration on 2026-04-25
-- ============================================================================

-- ── 1. Schema ──────────────────────────────────────────────────────────────
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS max_per_club INT NULL
  CHECK (max_per_club IS NULL OR max_per_club > 0);

COMMENT ON COLUMN public.events.max_per_club IS
  'Slice 195c: Max Spieler pro Verein im Lineup. NULL = unlimited. >0 = FPL-Style-Constraint.';

-- ── 2. rpc_save_lineup: max_per_club Validation (post-formation, pre-INSERT) ─
-- Body identisch zu existing, NUR max_per_club-Check + DECLARE v_max_per_club_used hinzugefuegt.
-- Source-of-truth: pre-existing rpc_save_lineup body (keine Migration-File-Referenz, lebte
-- in baseline_fantasy + inkrementellen Patches; full body via pg_get_functiondef gelesen).
CREATE OR REPLACE FUNCTION public.rpc_save_lineup(
  p_event_id uuid, p_user_id uuid, p_formation text,
  p_captain_slot text DEFAULT NULL::text,
  p_wildcard_slots text[] DEFAULT '{}'::text[],
  p_slot_gk uuid DEFAULT NULL, p_slot_def1 uuid DEFAULT NULL,
  p_slot_def2 uuid DEFAULT NULL, p_slot_def3 uuid DEFAULT NULL,
  p_slot_def4 uuid DEFAULT NULL, p_slot_mid1 uuid DEFAULT NULL,
  p_slot_mid2 uuid DEFAULT NULL, p_slot_mid3 uuid DEFAULT NULL,
  p_slot_mid4 uuid DEFAULT NULL, p_slot_att uuid DEFAULT NULL,
  p_slot_att2 uuid DEFAULT NULL, p_slot_att3 uuid DEFAULT NULL
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
  -- NULL = unlimited (Multi-Liga-Events). >0 = strict limit per club.
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
      slot_att, slot_att2, slot_att3
    ) VALUES (
      p_event_id, p_user_id, v_formation_trim, p_captain_slot, p_wildcard_slots, now(), false,
      p_slot_gk, p_slot_def1, p_slot_def2, p_slot_def3, p_slot_def4,
      p_slot_mid1, p_slot_mid2, p_slot_mid3, p_slot_mid4,
      p_slot_att, p_slot_att2, p_slot_att3
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
      slot_att = p_slot_att, slot_att2 = p_slot_att2, slot_att3 = p_slot_att3
    WHERE event_id = p_event_id AND user_id = p_user_id
    RETURNING id INTO v_lineup_id;
  END IF;

  DELETE FROM public.holding_locks
    WHERE event_id = p_event_id AND user_id = p_user_id;

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

COMMENT ON FUNCTION public.rpc_save_lineup(uuid,uuid,text,text,text[],uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid) IS
  'Slice 195c (2026-04-25): + max_per_club Constraint-Check (FPL-Style Pep-Roulette-Schutz)';

-- AR-44: REVOKE/GRANT-Block (Greenfield-Safety)
REVOKE EXECUTE ON FUNCTION public.rpc_save_lineup(uuid,uuid,text,text,text[],uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpc_save_lineup(uuid,uuid,text,text,text[],uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_save_lineup(uuid,uuid,text,text,text[],uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid) TO authenticated;
