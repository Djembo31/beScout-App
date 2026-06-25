-- Slice 378 — special-Events (type='special') zahlen Prize aus dem Plattform-Topf (E3 RAUS-Kanal #3).
-- Enger Spiegel von Slice 377 (bescout): platform-finanzierte Event-Typen aus dem Topf statt Minting.
-- CEO-Entscheid (Anil 2026-06-25): special aus Topf. CTO-how: eigene Ledger-Quelle 'special_event'
--   (Kontoauszug-Ehrlichkeit) statt 'bescout_event' mitzubenutzen. Money-Verhalten identisch zu 377.
-- Baseline = Live-Trigger-Bodies post-377 (D87); club + bescout byte-erhalten, Plattform-Zweig auf
--   type IN ('bescout','special') erweitert + source per CASE. score_event UNANGETASTET.
-- Refund-source (resync delta<0) nach OLD.type (Halter), wie Club-Refund an OLD.club_id (S377-Learning).

-- ============================================================
-- (A) source-CHECK um 'special_event' widern (additiv, mirror 376-genesis).
-- ============================================================
ALTER TABLE public.platform_treasury_ledger DROP CONSTRAINT platform_treasury_ledger_source_check;
ALTER TABLE public.platform_treasury_ledger ADD CONSTRAINT platform_treasury_ledger_source_check
  CHECK (source = ANY (ARRAY['trading','ipo','poll','research','bounty','p2p','monthly_liga','bescout_event','special_event','genesis']));

-- ============================================================
-- 1. BEFORE INSERT — Escrow (club → Vereins-Treasury | bescout/special → Plattform-Topf).
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_events_escrow_prize()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_available bigint;
BEGIN
  IF NEW.id IS NULL THEN NEW.id := gen_random_uuid(); END IF;

  IF NEW.type = 'club' AND NEW.prize_pool > 0 AND NEW.club_id IS NOT NULL THEN
    PERFORM 1 FROM clubs WHERE id = NEW.club_id FOR UPDATE;

    SELECT COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END), 0)
      INTO v_available FROM club_treasury_ledger WHERE club_id = NEW.club_id;
    v_available := v_available - COALESCE((
      SELECT SUM(amount_cents) FROM club_withdrawals
      WHERE club_id = NEW.club_id AND status IN ('pending','approved','paid')), 0);

    IF v_available < NEW.prize_pool THEN
      RAISE EXCEPTION 'treasury_insufficient_for_event_prize: benoetigt %, verfuegbar %',
        NEW.prize_pool, v_available;
    END IF;

    PERFORM public.book_club_treasury(NEW.club_id, 'debit', 'event_prize', NEW.prize_pool, NEW.id,
      'Event-Prize-Escrow: ' || NEW.name);
    NEW.prize_escrowed := true;

  ELSIF NEW.type IN ('bescout','special') AND NEW.prize_pool > 0 THEN
    -- Plattform-finanziert: Singleton-Row-Lock (race-frei, reentrant mit book_platform_treasury).
    -- book_platform_treasury hat KEINEN Negativ-Guard → Deckungs-Check inline (D103 Hard-Gate).
    PERFORM 1 FROM platform_treasury WHERE id = true FOR UPDATE;

    SELECT COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END), 0)
      INTO v_available FROM platform_treasury_ledger;

    IF v_available < NEW.prize_pool THEN
      RAISE EXCEPTION 'platform_treasury_insufficient_for_event_prize: benoetigt %, verfuegbar %',
        NEW.prize_pool, v_available;
    END IF;

    PERFORM public.book_platform_treasury('debit',
      CASE WHEN NEW.type = 'special' THEN 'special_event' ELSE 'bescout_event' END,
      NEW.prize_pool, NEW.id,
      CASE WHEN NEW.type = 'special' THEN 'Special-Event-Prize-Escrow: ' ELSE 'BeScout-Event-Prize-Escrow: ' END || NEW.name);
    NEW.prize_escrowed := true;
  END IF;
  RETURN NEW;
END; $$;

-- ============================================================
-- 2. BEFORE UPDATE OF status — Settle (ended=Rest / cancelled=voll), Refund-Ziel je NEW.type.
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_events_prize_settle()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_distributed bigint; v_refund bigint;
BEGIN
  IF OLD.prize_escrowed AND OLD.prize_pool > 0
     AND NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('ended','cancelled') THEN
    IF NEW.status = 'ended' THEN
      v_distributed := COALESCE((SELECT SUM(reward_amount) FROM lineups WHERE event_id = NEW.id), 0);
      v_refund := GREATEST(OLD.prize_pool - v_distributed, 0);
    ELSE
      v_refund := OLD.prize_pool;
    END IF;

    IF v_refund > 0 THEN
      IF NEW.type = 'club' AND NEW.club_id IS NOT NULL THEN
        PERFORM public.book_club_treasury(NEW.club_id, 'credit', 'event_prize', v_refund, NEW.id,
          CASE WHEN NEW.status = 'cancelled' THEN 'Event abgesagt - Prize zurueck: ' ELSE 'Event-Prize-Rest zurueck: ' END || NEW.name);
      ELSIF NEW.type IN ('bescout','special') THEN
        PERFORM public.book_platform_treasury('credit',
          CASE WHEN NEW.type = 'special' THEN 'special_event' ELSE 'bescout_event' END,
          v_refund, NEW.id,
          CASE WHEN NEW.type = 'special'
            THEN (CASE WHEN NEW.status = 'cancelled' THEN 'Special-Event abgesagt - Prize zurueck: ' ELSE 'Special-Event-Prize-Rest zurueck: ' END)
            ELSE (CASE WHEN NEW.status = 'cancelled' THEN 'BeScout-Event abgesagt - Prize zurueck: ' ELSE 'BeScout-Event-Prize-Rest zurueck: ' END)
          END || NEW.name);
      END IF;
    END IF;
    NEW.prize_escrowed := false;
  END IF;
  RETURN NEW;
END; $$;

-- ============================================================
-- 3. BEFORE UPDATE OF prize_pool/type — Escrow SYNCHRON halten, zwei-Treasury.
--    platform-Quelle deckt jetzt bescout UND special. Debit-source nach NEW.type,
--    Refund-source (delta<0) nach OLD.type (Halter, wie Club-Refund an OLD.club_id).
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_events_resync_prize_escrow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_held_club bigint; v_held_plat bigint;
  v_tgt_club bigint; v_tgt_plat bigint;
  v_delta_club bigint; v_delta_plat bigint;
  v_available bigint;
BEGIN
  v_held_club := CASE WHEN OLD.prize_escrowed AND OLD.type = 'club' AND OLD.club_id IS NOT NULL
                      THEN OLD.prize_pool ELSE 0 END;
  v_held_plat := CASE WHEN OLD.prize_escrowed AND OLD.type IN ('bescout','special')
                      THEN OLD.prize_pool ELSE 0 END;
  v_tgt_club := CASE WHEN NEW.type = 'club' AND NEW.prize_pool > 0 AND NEW.club_id IS NOT NULL
                     THEN NEW.prize_pool ELSE 0 END;
  v_tgt_plat := CASE WHEN NEW.type IN ('bescout','special') AND NEW.prize_pool > 0
                     THEN NEW.prize_pool ELSE 0 END;

  v_delta_club := v_tgt_club - v_held_club;
  v_delta_plat := v_tgt_plat - v_held_plat;

  -- ----- Club-Treasury-Anpassung -----
  IF v_delta_club > 0 THEN
    PERFORM 1 FROM clubs WHERE id = NEW.club_id FOR UPDATE;
    SELECT COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END), 0)
      INTO v_available FROM club_treasury_ledger WHERE club_id = NEW.club_id;
    v_available := v_available - COALESCE((
      SELECT SUM(amount_cents) FROM club_withdrawals
      WHERE club_id = NEW.club_id AND status IN ('pending','approved','paid')), 0);
    IF v_available < v_delta_club THEN
      RAISE EXCEPTION 'treasury_insufficient_for_event_prize: benoetigt %, verfuegbar %', v_delta_club, v_available;
    END IF;
    PERFORM public.book_club_treasury(NEW.club_id, 'debit', 'event_prize', v_delta_club, NEW.id,
      'Event-Prize-Escrow-Anpassung: ' || NEW.name);
  ELSIF v_delta_club < 0 THEN
    PERFORM public.book_club_treasury(OLD.club_id, 'credit', 'event_prize', -v_delta_club, NEW.id,
      'Event-Prize-Escrow-Anpassung: ' || NEW.name);
  END IF;

  -- ----- Plattform-Topf-Anpassung (bescout + special) -----
  IF v_delta_plat > 0 THEN
    PERFORM 1 FROM platform_treasury WHERE id = true FOR UPDATE;
    SELECT COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END), 0)
      INTO v_available FROM platform_treasury_ledger;
    IF v_available < v_delta_plat THEN
      RAISE EXCEPTION 'platform_treasury_insufficient_for_event_prize: benoetigt %, verfuegbar %', v_delta_plat, v_available;
    END IF;
    PERFORM public.book_platform_treasury('debit',
      CASE WHEN NEW.type = 'special' THEN 'special_event' ELSE 'bescout_event' END,
      v_delta_plat, NEW.id, 'Plattform-Event-Prize-Escrow-Anpassung: ' || NEW.name);
  ELSIF v_delta_plat < 0 THEN
    PERFORM public.book_platform_treasury('credit',
      CASE WHEN OLD.type = 'special' THEN 'special_event' ELSE 'bescout_event' END,
      -v_delta_plat, NEW.id, 'Plattform-Event-Prize-Escrow-Anpassung: ' || NEW.name);
  END IF;

  NEW.prize_escrowed := (v_tgt_club > 0 OR v_tgt_plat > 0);
  RETURN NEW;
END; $$;
