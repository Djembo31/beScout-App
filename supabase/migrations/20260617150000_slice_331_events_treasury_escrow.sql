-- Slice 331 — Events ans Treasury (Voll-Reconcile), NUR type='club'.
-- Problem: score_event mintet den prize_pool (deklarierte Zahl → Gewinner-Wallets, kein Konto belastet) —
--   gleiche Klasse wie Pre-330-CSF. Tickets (Live-Entry) ≠ $SCOUT-Prize → nur Treasury ist nicht-mintende Quelle.
-- 5-Quellen-Modell (worklog/concepts/csf-club-treasury-model.md §8): events.type = Geldquelle.
--   NUR type='club' → Vereins-Treasury. bescout/special/sponsor/creator minten bewusst weiter (eigene Slices).
-- Design (D39/Slice-329 trigger-zentrisch, KEIN score_event-Rewrite):
--   1) Flag prize_escrowed.
--   2) BEFORE INSERT: type='club'+prize → Treasury-Guard + Debit-Escrow.
--   3) BEFORE UPDATE OF status: ended → Rest zurück (prize_pool − Σ reward_amount); cancelled → voll zurück.
-- Grandfathering: Bestands-Events prize_escrowed=false → alte Mint-Semantik, kein Refund. (0 offene prized Events live.)

-- ============================================================
-- 1. Flag: "für dieses Event liegt Geld im Treasury-Escrow"
-- ============================================================
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS prize_escrowed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.events.prize_escrowed IS
  'Slice 331: true = prize_pool wurde bei Erstellung aus der Club-Treasury debitiert (nur type=club). Gate für Settle-Refund bei ended/cancelled.';

-- ============================================================
-- 2. BEFORE INSERT — Escrow des Prize aus der Vereins-Treasury (nur type='club')
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_events_escrow_prize()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_available bigint;
BEGIN
  -- NEW.id garantiert setzen (reference_id für den Ledger), unabhängig von Default-Timing.
  IF NEW.id IS NULL THEN NEW.id := gen_random_uuid(); END IF;

  IF NEW.type = 'club' AND NEW.prize_pool > 0 AND NEW.club_id IS NOT NULL THEN
    -- Serialisierungspunkt (race-frei, reentrant mit book_club_treasury) — wie Slice 330-Guard.
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
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_events_escrow_prize ON public.events;
CREATE TRIGGER trg_events_escrow_prize
  BEFORE INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.trg_events_escrow_prize();

-- ============================================================
-- 3. BEFORE UPDATE OF status — Settle bei 'ended' (einziger gültiger Schluss-Status).
--    Rest zurück = prize_pool − Σ reward_amount (0 Entries → voller Pool; Rundung/weniger Ränge → Rest).
--    reward_amount ist beim status='ended'-UPDATE bereits von score_event gesetzt (verteilt VOR Status-Update).
--    HINWEIS: 'cancelled' ist KEIN gültiger events.status (events_status_check: upcoming/registering/
--    late-reg/running/scoring/ended). Event-Absage existiert DB-seitig nicht → kein cancel-Refund-Zweig.
--    Wird echtes Absagen je gebaut ('cancelled' in CHECK), gehört der Voll-Refund-Zweig in jenen Slice.
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_events_prize_settle()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_distributed bigint; v_refund bigint;
BEGIN
  IF OLD.prize_escrowed AND OLD.prize_pool > 0 AND NEW.club_id IS NOT NULL
     AND NEW.status = 'ended' AND OLD.status IS DISTINCT FROM 'ended' THEN
    v_distributed := COALESCE((SELECT SUM(reward_amount) FROM lineups WHERE event_id = NEW.id), 0);
    v_refund := GREATEST(OLD.prize_pool - v_distributed, 0);
    IF v_refund > 0 THEN
      PERFORM public.book_club_treasury(NEW.club_id, 'credit', 'event_prize', v_refund, NEW.id,
        'Event-Prize-Rest zurueck: ' || NEW.name);
    END IF;
    NEW.prize_escrowed := false;   -- Escrow aufgelöst (in-row, keine Rekursion)
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_events_prize_settle ON public.events;
CREATE TRIGGER trg_events_prize_settle
  BEFORE UPDATE OF status ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.trg_events_prize_settle();

-- ============================================================
-- 4. BEFORE UPDATE OF prize_pool/type — Escrow mit dem Prize SYNCHRON halten.
--    Reviewer-Finding #1: prize_pool (registering/late-reg/running) UND type (upcoming/registering)
--    sind editierbar. Ohne Sync: prize_pool 1M→2M umgeht den Escrow (Minting durch Hintertür),
--    type club→bescout lässt die Vereins-Kaution liegen. Lösung: Ziel-Escrow neu berechnen + Differenz buchen.
--    Ziel = (type='club' ∧ prize_pool>0 ∧ club_id) ? prize_pool : 0. Gehalten = prize_escrowed ? alter prize_pool : 0.
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_events_resync_prize_escrow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_target bigint; v_held bigint; v_delta bigint; v_available bigint;
BEGIN
  v_target := CASE WHEN NEW.type = 'club' AND NEW.prize_pool > 0 AND NEW.club_id IS NOT NULL
                   THEN NEW.prize_pool ELSE 0 END;
  v_held := CASE WHEN OLD.prize_escrowed THEN OLD.prize_pool ELSE 0 END;
  v_delta := v_target - v_held;

  IF v_delta > 0 THEN
    -- Erhöhung / neu escrowt: Deckung prüfen + nach-debitieren
    PERFORM 1 FROM clubs WHERE id = NEW.club_id FOR UPDATE;
    SELECT COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END), 0)
      INTO v_available FROM club_treasury_ledger WHERE club_id = NEW.club_id;
    v_available := v_available - COALESCE((
      SELECT SUM(amount_cents) FROM club_withdrawals
      WHERE club_id = NEW.club_id AND status IN ('pending','approved','paid')), 0);
    IF v_available < v_delta THEN
      RAISE EXCEPTION 'treasury_insufficient_for_event_prize: benoetigt %, verfuegbar %', v_delta, v_available;
    END IF;
    PERFORM public.book_club_treasury(NEW.club_id, 'debit', 'event_prize', v_delta, NEW.id,
      'Event-Prize-Escrow-Anpassung: ' || NEW.name);
  ELSIF v_delta < 0 THEN
    -- Reduzierung / Quellen-Wechsel (z.B. type club→bescout): Teil zurück an die Treasury
    PERFORM public.book_club_treasury(NEW.club_id, 'credit', 'event_prize', -v_delta, NEW.id,
      'Event-Prize-Escrow-Anpassung: ' || NEW.name);
  END IF;

  NEW.prize_escrowed := (v_target > 0);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_events_resync_prize_escrow ON public.events;
CREATE TRIGGER trg_events_resync_prize_escrow
  BEFORE UPDATE OF prize_pool, type ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.trg_events_resync_prize_escrow();
