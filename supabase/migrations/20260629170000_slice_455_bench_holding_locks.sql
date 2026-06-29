-- Slice 455 — D-02: Bench-Karten in holding_locks (Geld-Leck schliessen)
--
-- Problem (Live-D87, DB skzjfhvgccaeplydsunz): rpc_save_lineup (25k-Money-RPC) lockt nur die
--   12 Starter (v_all_slots), die Bank (v_bench_uids) wird voll validiert (Position/Holdings>=1/
--   Duplikat/overlaps-starter/Liga/lineup_rules) ABER NIE in holding_locks geschrieben. Auch der
--   Cross-Event-Verfuegbarkeits-Check (FOR 1..12) laeuft nur ueber Starter. Folge: dieselbe Karte
--   als Bench in N gleichzeitigen Events -> Auto-Sub punktet ueberall (echtes Wallet-Credit) =
--   Reward-Leck. Latent (Bench-Feature aktuell unbenutzt: holding_locks=0, lineups_with_bench=0 live).
--
-- Fix (CEO Anil "weiter mit D-02"; CTO-WIE: 2 additive Bloecke, spiegeln die Starter-Logik 1:1,
--   Starter-Pfad byte-treu). Konsistent mit S386-S392 (age/nation/mv-Regeln pruefen bereits
--   Starter + Bank via v_all_slots + v_bench_uids):
--   (A) Bench cross-event-Verfuegbarkeit (nach dem Starter-Verfuegbarkeits-Loop): pro Bench-Karte
--       available = holdings.quantity - SUM(locks WHERE event_id != p_event_id); < v_min_sc ->
--       reject 'insufficient_sc_bench'. Spiegelt den Starter-Check exakt.
--   (B) Bench-Lock-INSERT (nach dem Starter-Lock-INSERT): unnest(v_bench_uids) -> holding_locks,
--       qty = v_min_sc (= Starter-Semantik: Bench ist potenzieller Starter via Auto-Sub ->
--       gleiches Commitment). ON CONFLICT DO NOTHING ist nur defensiv (Starter/Bench disjunkt
--       durch bench_overlaps_starter, kein interner Bench-Dup durch bench_duplicate).
--
-- METHODE (S156 PATCH-AUDIT): byte-true Basis = LIVE pg_get_functiondef (nicht diese/alte Datei).
--   Wir lesen den aktuellen RPC zur Apply-Zeit, fuegen die 2 Bloecke an 2 eindeutigen Ankern ein
--   (replace), self-verifizieren (RAISE wenn Anker fehlt) und re-EXECUTEn. Idempotent (skip wenn
--   'insufficient_sc_bench' schon vorhanden). CREATE OR REPLACE bewahrt Owner + Grants
--   (authenticated/postgres/service_role; anon hat KEIN EXECUTE -> §3-Posture korrekt) + SECDEF.
--
-- Proof: force-rollback Money-Smoke (1-2-2-2, 7+7 disjunkte Starter + 1 geteilte Bench-Karte):
--   A speichert (8 Locks = 7 Starter + 1 Bench), B mit derselben Bench-Karte -> insufficient_sc_bench
--   (available=0), B 0 Locks, Re-Save A idempotent (8 Locks). Post-Apply: functiondef-Diff = nur 2 Bloecke.

DO $migrate$
DECLARE
  v_src text;
  v_new text;
  v_anchorA text;
  v_anchorB text;
BEGIN
  v_src := pg_get_functiondef('public.rpc_save_lineup(uuid,uuid,text,text,text[],uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,integer[])'::regprocedure);

  -- Idempotenz: bereits gepatcht?
  IF position('insufficient_sc_bench' in v_src) > 0 THEN
    RAISE NOTICE 'Slice 455: D-02 Bench-Bloecke bereits vorhanden, skip.';
    RETURN;
  END IF;

  -- Anker A = Ende des Starter-Verfuegbarkeits-Loops (eindeutig durch 'insufficient_sc')
  v_anchorA := $a$      IF NOT FOUND OR COALESCE(v_available, 0) < v_min_sc THEN
        RETURN jsonb_build_object('ok', false, 'error', 'insufficient_sc', 'player_id', v_pid, 'available', COALESCE(v_available, 0), 'required', v_min_sc);
      END IF;
    END IF;
  END LOOP;$a$;

  -- Anker B = Starter-Lock-INSERT (eindeutig durch 'unnest(v_all_slots) WITH ORDINALITY')
  v_anchorB := $b$  INSERT INTO public.holding_locks (user_id, player_id, event_id, quantity_locked)
  SELECT p_user_id, pid, p_event_id, v_min_sc
  FROM unnest(v_all_slots) WITH ORDINALITY AS t(pid, ord)
  WHERE pid IS NOT NULL AND NOT v_slot_keys[ord::int] = ANY(p_wildcard_slots);$b$;

  IF position(v_anchorA in v_src) = 0 THEN RAISE EXCEPTION 'Slice 455: D-02 anchorA (Starter-Verfuegbarkeits-Loop) not found in live rpc_save_lineup'; END IF;
  IF position(v_anchorB in v_src) = 0 THEN RAISE EXCEPTION 'Slice 455: D-02 anchorB (Starter-Lock-INSERT) not found in live rpc_save_lineup'; END IF;

  -- (A) Bench cross-event-Verfuegbarkeit nach dem Starter-Loop
  v_new := replace(v_src, v_anchorA, v_anchorA || $ba$

  -- D-02 (Slice 455): Bench-Karten cross-event-verfuegbar pruefen (spiegelt Starter-Check;
  -- verhindert dieselbe Karte als Bench in N gleichzeitigen Events -> Auto-Sub-Reward-Leck)
  FOREACH v_pid IN ARRAY v_bench_uids LOOP
    SELECT COALESCE(h.quantity, 0) - COALESCE(
      (SELECT SUM(hl.quantity_locked)::INT FROM public.holding_locks hl
       WHERE hl.user_id = p_user_id AND hl.player_id = v_pid AND hl.event_id != p_event_id), 0)
    INTO v_available FROM public.holdings h WHERE h.user_id = p_user_id AND h.player_id = v_pid;
    IF NOT FOUND OR COALESCE(v_available, 0) < v_min_sc THEN
      RETURN jsonb_build_object('ok', false, 'error', 'insufficient_sc_bench', 'player_id', v_pid, 'available', COALESCE(v_available, 0), 'required', v_min_sc);
    END IF;
  END LOOP;$ba$);

  -- (B) Bench-Lock-INSERT nach dem Starter-Lock-INSERT
  v_new := replace(v_new, v_anchorB, v_anchorB || $bb$

  -- D-02 (Slice 455): Bench-Karten ebenfalls locken (echtes Commitment -> nicht in weiteren Events
  -- wiederverwendbar; Starter/Bench disjunkt via bench_overlaps_starter, ON CONFLICT nur defensiv)
  INSERT INTO public.holding_locks (user_id, player_id, event_id, quantity_locked)
  SELECT p_user_id, pid, p_event_id, v_min_sc
  FROM unnest(v_bench_uids) AS t(pid)
  ON CONFLICT (user_id, player_id, event_id) DO NOTHING;$bb$);

  IF v_new = v_src THEN RAISE EXCEPTION 'Slice 455: D-02 patch produced no change (anchors matched but replace was a no-op?)'; END IF;

  EXECUTE v_new;
  RAISE NOTICE 'Slice 455: D-02 Bench-holding-locks angewendet (2 additive Bloecke).';
END $migrate$;
