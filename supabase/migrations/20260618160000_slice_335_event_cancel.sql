-- Slice 335 — Event-Absage geld-sicher.
-- 3 Teile: (1) events_status_check +'cancelled' · (2) trg_events_prize_settle +'cancelled'-Voll-Refund-Zweig
--   (Slice 331 §3 hatte diesen Zweig hier vorgesehen) · (3) cancel_event-RPC (atomar: Auth + Status-Guard +
--   Teilnehmer-Einsatz-Refund via rpc_cancel_event_entries + status='cancelled' → Settle-Trigger Kaution zurück).
-- Source-of-truth trg_events_prize_settle = live pg_get_functiondef 2026-06-18 (== Slice 331).

-- ============================================================
-- 1. events_status_check: +'cancelled' (additiv; alle Bestands-Rows bleiben gültig)
-- ============================================================
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE public.events ADD CONSTRAINT events_status_check CHECK (
  status = ANY (ARRAY['upcoming','registering','late-reg','running','scoring','ended','cancelled'])
);

-- ============================================================
-- 1b. ticket_transactions_source_check: +'event_entry_refund' (latente CHECK-Drift, Slice-330/332-Klasse).
--     rpc_cancel_event_entries schreibt source='event_entry_refund' beim Ticket-Refund, aber der CHECK
--     kannte den Wert nie → JEDE Ticket-Entry-Erstattung wäre mit 23514 gescheitert (latent: RPC nie verdrahtet).
--     transactions_type_check kennt 'event_entry_unlock' ($SCOUT-Pfad) bereits → kein Fix nötig.
-- ============================================================
ALTER TABLE public.ticket_transactions DROP CONSTRAINT IF EXISTS ticket_transactions_source_check;
ALTER TABLE public.ticket_transactions ADD CONSTRAINT ticket_transactions_source_check CHECK (
  source = ANY (ARRAY['daily_login','mission','daily_challenge','achievement','streak_bonus','mystery_box',
    'event_entry','chip_use','live_prediction','admin_grant','event_entry_refund'])
);

-- ============================================================
-- 2. trg_events_prize_settle — +'cancelled'-Zweig (voller Pool zurück; keine Auszahlung erfolgt).
--    'ended'-Logik byte-identisch zu Slice 331 erhalten.
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_events_prize_settle()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_distributed bigint; v_refund bigint;
BEGIN
  IF OLD.prize_escrowed AND OLD.prize_pool > 0 AND NEW.club_id IS NOT NULL
     AND NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('ended','cancelled') THEN
    IF NEW.status = 'ended' THEN
      v_distributed := COALESCE((SELECT SUM(reward_amount) FROM lineups WHERE event_id = NEW.id), 0);
      v_refund := GREATEST(OLD.prize_pool - v_distributed, 0);
    ELSE
      -- 'cancelled': keine Auszahlung erfolgt → voller Pool zurück (Slice 335)
      v_refund := OLD.prize_pool;
    END IF;
    IF v_refund > 0 THEN
      PERFORM public.book_club_treasury(NEW.club_id, 'credit', 'event_prize', v_refund, NEW.id,
        CASE WHEN NEW.status = 'cancelled' THEN 'Event abgesagt - Prize zurueck: ' ELSE 'Event-Prize-Rest zurueck: ' END || NEW.name);
    END IF;
    NEW.prize_escrowed := false;
  END IF;
  RETURN NEW;
END; $function$;

-- Trigger-Binding unverändert (BEFORE UPDATE OF status), aber idempotent neu setzen.
DROP TRIGGER IF EXISTS trg_events_prize_settle ON public.events;
CREATE TRIGGER trg_events_prize_settle
  BEFORE UPDATE OF status ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.trg_events_prize_settle();

-- ============================================================
-- 3. cancel_event — atomare, Club-Admin-berechtigte Absage.
-- ============================================================
CREATE OR REPLACE FUNCTION public.cancel_event(p_event_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_event RECORD;
  v_is_club_admin boolean;
  v_is_platform_admin boolean;
  v_refund jsonb;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'auth_required');
  END IF;

  -- Race-Schutz gegen Doppel-Absage: Event-Zeile sperren.
  SELECT * INTO v_event FROM events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_not_found');
  END IF;

  -- Auth: Club-Admin des Event-Vereins ODER Platform-Admin (Pattern get_club_balance, Slice 333).
  SELECT EXISTS(SELECT 1 FROM club_admins WHERE club_id = v_event.club_id AND user_id = v_caller) INTO v_is_club_admin;
  SELECT EXISTS(SELECT 1 FROM platform_admins WHERE user_id = v_caller) INTO v_is_platform_admin;
  IF NOT (v_is_club_admin OR v_is_platform_admin) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;

  -- Nur vor dem Lauf absagbar (= ALLOWED_TRANSITIONS). 'running'/'scoring'/'ended'/'cancelled' → Fehler.
  IF v_event.status NOT IN ('upcoming','registering','late-reg') THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_cancellable');
  END IF;

  -- 1) Teilnehmer-Einsätze erstatten (Tickets/$SCOUT) + entries löschen. Interne RPC ohne eigenen
  --    Auth-Check — cancel_event ist der Auth-Gate davor (NICHT den platform-admin-Wrapper aufrufen).
  v_refund := public.rpc_cancel_event_entries(p_event_id);
  -- Fail-closed (Reviewer #1): rpc_cancel_event_entries nutzt eigenen Discriminator {ok,error}.
  -- Bei Misserfolg NICHT zum Status-Flip durchlaufen — sonst Event abgesagt ohne Erstattung.
  IF COALESCE(v_refund->>'ok','false') <> 'true' THEN
    RETURN jsonb_build_object('success', false, 'error', COALESCE(v_refund->>'error','refund_failed'));
  END IF;

  -- 2) Status='cancelled' → feuert trg_events_prize_settle → Kaution voll zurück in die Treasury.
  UPDATE events SET status = 'cancelled' WHERE id = p_event_id;

  RETURN jsonb_build_object('success', true, 'refunded_count', COALESCE((v_refund->>'refunded_count')::int, 0));
END; $function$;

REVOKE EXECUTE ON FUNCTION public.cancel_event(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cancel_event(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.cancel_event(uuid) TO authenticated;
