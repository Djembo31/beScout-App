-- Slice 456 — D-02b: holdings Row-Lock gegen cross-event Concurrency-Race (Reviewer-Catch S455)
--
-- Problem: rpc_save_lineup Verfuegbarkeits-Check (Starter-Loop + Bench-Block A, S455) liest
--   holdings.quantity - SUM(holding_locks WHERE event_id != p_event_id) per PLAIN SELECT ohne
--   Row-Lock. Zwei gleichzeitige Saves desselben Users auf verschiedene Events mit derselben Karte
--   sehen beide available >= v_min_sc -> beide INSERTen einen Lock (verschiedene PK event_id) =
--   Over-Commit (TOCTOU). Vererbt vom Starter-Pfad; S455 (D-02) schliesst nur den SEQUENTIELLEN Reuse.
--
-- Fix (1 additiver Block C, vor v_min_sc :=): upfront Row-Lock auf alle beteiligten holdings-Rows
--   (Starter ∪ Bench, non-null) in deterministischer player_id-Ordnung (deadlock-frei) VOR den
--   Verfuegbarkeits-Checks. rpc_save_lineup ist der EINZIGE holding_locks-INSERT-Writer (S453-Writer-
--   Enum, S455-verifiziert) -> beide konkurrierenden Saves nehmen vor dem Read denselben holdings-Row
--   FOR UPDATE -> serialisieren. T1 committed seinen Lock, T2 unblockt, liest frische holding_locks,
--   rejected korrekt. holdings-Row = Rendezvous (deckt Starter+Bench: Lock auf der Karte, nicht der Rolle).
--   Nicht-besessene Karten: kein Match/Lock, aber Verfuegbarkeits-Check rejected sie ohnehin.
--
-- METHODE (S156 PATCH-AUDIT): byte-true Basis = LIVE pg_get_functiondef (jetzt mit den 455-Bloecken
--   A+B). Block C an Anker 'v_min_sc := COALESCE(...)' eingefuegt (replace), self-verify, idempotent
--   (skip wenn 'FOR UPDATE' schon vorhanden). CREATE OR REPLACE bewahrt Owner + Grants + SECDEF.
--
-- Proof: force-rollback (Patch + happy-path 8 Locks unveraendert + cross-event reject + FOR UPDATE=1).
--   Echte 2-Session-Concurrency via MCP-Single-Connection nicht testbar -> Korrektheit per Konstruktion.

DO $migrate$
DECLARE
  v_src text;
  v_new text;
  v_anchorC text;
BEGIN
  v_src := pg_get_functiondef('public.rpc_save_lineup(uuid,uuid,text,text,text[],uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,integer[])'::regprocedure);

  -- Idempotenz-Marker spezifisch (Reviewer S456 Finding#2): nicht generisches 'FOR UPDATE'
  -- (das ein kuenftiger Slice unabhaengig einfuehren koennte), sondern der Block-C-Marker selbst.
  IF position('D-02b (Slice 456)' in v_src) > 0 THEN
    RAISE NOTICE 'Slice 456: D-02b Row-Lock bereits vorhanden, skip.';
    RETURN;
  END IF;

  v_anchorC := $c$  v_min_sc := COALESCE(v_event.min_sc_per_slot, 1);$c$;
  IF position(v_anchorC in v_src) = 0 THEN RAISE EXCEPTION 'Slice 456: D-02b anchorC (v_min_sc :=) not found in live rpc_save_lineup'; END IF;

  v_new := replace(v_src, v_anchorC, $cc$  -- D-02b (Slice 456): Row-Lock auf alle beteiligten holdings-Rows (player_id-geordnet, deadlock-frei)
  -- VOR den Verfuegbarkeits-Checks -> serialisiert konkurrierende Saves desselben Users auf derselben
  -- Karte (schliesst den TOCTOU cross-event Over-Commit-Race; rpc_save_lineup = einziger Lock-Writer).
  PERFORM 1 FROM public.holdings
  WHERE user_id = p_user_id
    AND player_id IN (
      SELECT DISTINCT pid FROM unnest(v_all_slots || v_bench_uids) AS u(pid) WHERE pid IS NOT NULL
    )
  ORDER BY player_id
  FOR UPDATE;

$cc$ || v_anchorC);

  IF v_new = v_src THEN RAISE EXCEPTION 'Slice 456: D-02b patch produced no change'; END IF;

  EXECUTE v_new;
  RAISE NOTICE 'Slice 456: D-02b holdings Row-Lock angewendet (1 additiver Block).';
END $migrate$;
