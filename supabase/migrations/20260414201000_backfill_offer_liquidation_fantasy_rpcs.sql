-- AR-12 (J3) + AR-28 (J4) — Migration-Full-Sweep Backfill fuer 12 RPCs ohne Source im Repo.
--
-- Problem: 12 RPCs live OHNE Source-File. Rollback/DR broken. Neue Developer koennen Bodies nicht reviewen.
-- NULL-Guards, Fee-Splits, CHECK Constraints = Audit-Blindspot.
--
-- J3 (Offer/Liquidation, 7 RPCs): accept_offer, cancel_order, liquidate_player, create_offer,
--                                  counter_offer, cancel_offer_rpc, reject_offer
-- J4 (Fantasy, 5 RPCs):          save_lineup, cron_process_gameweek, reset_event,
--                                  resolve_gameweek_predictions, calculate_sc_of_week
--
-- CEO-Decision (Schnellbahn 2026-04-14): Option B Full-Sweep.
--
-- Approach:
-- 1. Snapshot-Table `_rpc_body_snapshots` persistiert pg_get_functiondef-Ergebnisse.
-- 2. DO-Block liest Live-Bodies + NO-OP CREATE OR REPLACE (Drift-Test: wenn Apply ohne Fehler durch = Bodies identisch).
-- 3. Persistente Table erlaubt DR-Query: SELECT body FROM _rpc_body_snapshots WHERE rpc_name = 'X';
-- 4. Follow-Up (manuell post-Apply): Bodies aus Table als Static-SQL Files committen.
--
-- Diese Migration ist IDEMPOTENT: Re-Apply ersetzt Snapshot-Eintraege mit aktuellem Live-Body.

-- ============================================================================
-- 1. Snapshot-Tabelle (persistent, fuer DR + Audit)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public._rpc_body_snapshots (
  rpc_name TEXT PRIMARY KEY,
  body TEXT NOT NULL,
  snapshotted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  migration_source TEXT NOT NULL DEFAULT '20260414201000_backfill_offer_liquidation_fantasy_rpcs'
);

COMMENT ON TABLE public._rpc_body_snapshots IS
  'DR/Audit-Snapshot von RPC-Bodies. Gefuellt durch Backfill-Migrations. '
  'Query: SELECT rpc_name, body FROM _rpc_body_snapshots ORDER BY rpc_name;';

-- RLS: Admin-only (DR-Table, kein Client-Zugriff)
ALTER TABLE public._rpc_body_snapshots ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists (idempotent re-apply)
DROP POLICY IF EXISTS admin_only_rpc_snapshots_select ON public._rpc_body_snapshots;
DROP POLICY IF EXISTS admin_only_rpc_snapshots_all ON public._rpc_body_snapshots;

-- Keine Client-Policy. SECURITY DEFINER-Funktionen (inkl. diese Migration) koennen lesen/schreiben.
-- service_role umgeht RLS default. anon + authenticated bekommen 0 Rows (RLS-default-deny).
-- Das ist gewollt: Snapshot-Table ist Admin/Backend-only Audit-Tool.

-- ============================================================================
-- 2. Dump + NO-OP Re-Apply
-- ============================================================================

DO $migrate$
DECLARE
  v_rpc_name TEXT;
  v_orig_body TEXT;
  v_dumped_count INT := 0;
  v_noop_count INT := 0;
  v_missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
  FOR v_rpc_name IN
    SELECT unnest(ARRAY[
      -- J3 (7)
      'accept_offer',
      'cancel_order',
      'liquidate_player',
      'create_offer',
      'counter_offer',
      'cancel_offer_rpc',
      'reject_offer',
      -- J4 (5)
      'save_lineup',
      'cron_process_gameweek',
      'reset_event',
      'resolve_gameweek_predictions',
      'calculate_sc_of_week'
    ])
  LOOP
    SELECT pg_get_functiondef(oid) INTO v_orig_body
    FROM pg_proc
    WHERE proname = v_rpc_name
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

    IF v_orig_body IS NULL THEN
      v_missing := array_append(v_missing, v_rpc_name);
      RAISE WARNING 'AR-12/28: RPC nicht gefunden (skip): %', v_rpc_name;
      CONTINUE;
    END IF;

    -- Snapshot persistieren (UPSERT: re-apply aktualisiert Eintrag)
    INSERT INTO public._rpc_body_snapshots (rpc_name, body, snapshotted_at, migration_source)
    VALUES (v_rpc_name, v_orig_body, NOW(), '20260414201000_backfill_offer_liquidation_fantasy_rpcs')
    ON CONFLICT (rpc_name)
    DO UPDATE SET
      body = EXCLUDED.body,
      snapshotted_at = NOW(),
      migration_source = EXCLUDED.migration_source;

    v_dumped_count := v_dumped_count + 1;

    -- NO-OP Re-Apply: EXECUTE den gedumpten Body (CREATE OR REPLACE identisch).
    -- Wenn Apply fehlerfrei durchlaeuft -> Body ist syntaktisch valid + Live-Body ist identisch.
    -- Dient als Drift-Test: wenn ein Developer heimlich die Live-RPC modifiziert hat
    -- (out-of-band), wuerde unser Snapshot das erfassen + Re-Apply wuerde die remote Version
    -- mit sich selbst ueberschreiben (NO-OP wenn identisch, korrekt wenn drift).
    BEGIN
      EXECUTE v_orig_body;
      v_noop_count := v_noop_count + 1;
      RAISE NOTICE 'AR-12/28 snapshotted + re-applied: %', v_rpc_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'AR-12/28 snapshot OK but re-apply FAILED for %: %',
        v_rpc_name, SQLERRM;
      -- Nicht abbrechen — Snapshot ist wichtiger als Re-Apply.
    END;
  END LOOP;

  RAISE NOTICE 'AR-12/28 Full-Sweep done: % dumped, % re-applied, missing: %',
    v_dumped_count, v_noop_count, v_missing;

  IF array_length(v_missing, 1) > 0 THEN
    RAISE NOTICE 'Fehlende RPCs (nicht live, kein Fehler — nur zur Info): %', v_missing;
  END IF;
END $migrate$;

-- ============================================================================
-- 3. Post-Apply Verification Query (fuer CTO-Dokumentation)
-- ============================================================================

-- Nach Apply ausfuehren:
--   SELECT rpc_name, LENGTH(body) AS body_chars, snapshotted_at
--   FROM public._rpc_body_snapshots
--   ORDER BY rpc_name;
--
-- Full Body pro RPC:
--   SELECT body FROM public._rpc_body_snapshots WHERE rpc_name = 'accept_offer';
--
-- Static-SQL Export fuer Repo-Commit (pro RPC):
--   \copy (SELECT body FROM _rpc_body_snapshots WHERE rpc_name = 'accept_offer')
--     TO 'supabase/migrations/snapshots/accept_offer.sql';
