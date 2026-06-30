-- Slice 485 (D-04, W3): lineups DB-Integrität — additive Defense-in-Depth.
-- Integrität lebte 100% im 27k-rpc_save_lineup (root-cause #2). Zwei DB-Lücken geschlossen:
-- (a) bench_gk/o1/o2/o3 hatten KEINEN FK→players (12 Starter-Slots schon) — referenzielle Lücke.
-- (b) Kein DB-Constraint gegen denselben Spieler in >1 Slot. Der RPC prüft Distinctness nur über
--     die 12 Starter (v_all_slots) — Bench (v_bench_uids, S455) ist NICHT abgedeckt. Trigger
--     schließt die Bench-Lücke + backstoppt Direkt-Writes/Future-Writer (alle 16 Slots).
-- Daten verifiziert read-only: 447 Lineups, 0 Doppel-Spieler, 0 befüllte/Orphan-Bench → additiv ohne Cleanup.
-- D-20 (Wide-Column) bewusst behalten — keine Normalisierung.

-- (a) Bench-FKs (spiegeln die Starter-Slot-FK: plain REFERENCES players(id), NO ACTION on delete)
ALTER TABLE public.lineups ADD CONSTRAINT lineups_bench_gk_fkey FOREIGN KEY (bench_gk) REFERENCES public.players(id);
ALTER TABLE public.lineups ADD CONSTRAINT lineups_bench_o1_fkey FOREIGN KEY (bench_o1) REFERENCES public.players(id);
ALTER TABLE public.lineups ADD CONSTRAINT lineups_bench_o2_fkey FOREIGN KEY (bench_o2) REFERENCES public.players(id);
ALTER TABLE public.lineups ADD CONSTRAINT lineups_bench_o3_fkey FOREIGN KEY (bench_o3) REFERENCES public.players(id);

-- (b) Distinctness-Trigger (D39-Pattern, wie prevent_player_ghost_insert).
-- Prüft alle 16 Slots (Starter + Bench) mutually distinct (NULLs ignoriert).
-- RAISE 'duplicate_player' = reuse des RPC-Error-Codes → bestehende i18n duplicatePlayer (DE+TR).
CREATE OR REPLACE FUNCTION public.enforce_lineup_player_distinct()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_cnt INT;
  v_distinct INT;
BEGIN
  -- Escape-Hatch für bewusste Bulk-Migrationen (D39): SET LOCAL bescout.allow_lineup_dup='true';
  IF current_setting('bescout.allow_lineup_dup', true) = 'true' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*), COUNT(DISTINCT s)
    INTO v_cnt, v_distinct
  FROM unnest(ARRAY[
    NEW.slot_gk, NEW.slot_def1, NEW.slot_def2, NEW.slot_def3, NEW.slot_def4,
    NEW.slot_mid1, NEW.slot_mid2, NEW.slot_mid3, NEW.slot_mid4,
    NEW.slot_att, NEW.slot_att2, NEW.slot_att3,
    NEW.bench_gk, NEW.bench_o1, NEW.bench_o2, NEW.bench_o3
  ]) AS s
  WHERE s IS NOT NULL;

  IF v_cnt <> v_distinct THEN
    RAISE EXCEPTION 'duplicate_player' USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

-- AR-44: Trigger-Funktionen sind REVOKE-exempt (nur via TRIGGER aufgerufen, nie direkt).
-- Block trotzdem gesetzt (Hygiene + Pre-Commit-Gate): kein Direkt-EXECUTE für PUBLIC/anon.
REVOKE EXECUTE ON FUNCTION public.enforce_lineup_player_distinct() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_lineup_player_distinct() FROM anon;

DROP TRIGGER IF EXISTS trg_lineups_player_distinct ON public.lineups;
CREATE TRIGGER trg_lineups_player_distinct
  BEFORE INSERT OR UPDATE ON public.lineups
  FOR EACH ROW EXECUTE FUNCTION public.enforce_lineup_player_distinct();
