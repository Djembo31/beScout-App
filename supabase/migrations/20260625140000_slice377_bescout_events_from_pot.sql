-- Slice 377 — BeScout-Events (type='bescout') zahlen Prize aus dem Plattform-Topf (E3 RAUS-Kanal #2).
-- Spiegel Slice 331 (Club-Event-Escrow), aber zweite Treasury = platform_treasury.
-- CEO-Entscheid (Anil 2026-06-25, AskUserQuestion): Escrow-bei-Erstellung, NICHT score_event-Rewrite.
-- Cold-Start: D103 Hard-Gate (RAISE bei Unterdeckung, kein Fallback-Mint).
--
-- Geldfluss bescout-Event (zero-sum):
--   INSERT(type=bescout,prize=P)  → Topf −P (Escrow-Debit), RAISE wenn Topf<P
--   score_event verteilt D        → mintet +D in Wallets (UNVERAENDERT)
--   status='ended'                → Topf +(P−D) (Rest zurueck)
--   Netto Topf = −D = Wallets +D  → System-Saldo 0.
--
-- Baselines live gelesen 2026-06-25 (D87): trg_events_escrow_prize / _prize_settle / _resync_prize_escrow,
--   score_event, book_platform_treasury. Settle-Live behandelt bereits 'ended' UND 'cancelled' (Slice 335).
-- Club-Zweige byte-identisch zum Live-Body uebernommen; bescout-Zweig additiv.
-- 'bescout_event' ist seit Slice 357 im platform_treasury_ledger source-CHECK → keine CHECK-Migration.
-- Funktions-Bodies via CREATE OR REPLACE; Trigger-Bindings unveraendert (kein DROP/CREATE TRIGGER noetig).

-- ============================================================
-- 1. BEFORE INSERT — Escrow des Prize (club → Vereins-Treasury | bescout → Plattform-Topf)
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_events_escrow_prize()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_available bigint;
BEGIN
  -- NEW.id garantiert setzen (reference_id fuer den Ledger), unabhaengig von Default-Timing.
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

  ELSIF NEW.type = 'bescout' AND NEW.prize_pool > 0 THEN
    -- Slice 377: Plattform-Topf-Escrow. Singleton-Row-Lock (race-frei, reentrant mit book_platform_treasury).
    -- book_platform_treasury hat KEINEN Negativ-Guard → Deckungs-Check inline (D103 Hard-Gate).
    PERFORM 1 FROM platform_treasury WHERE id = true FOR UPDATE;

    SELECT COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END), 0)
      INTO v_available FROM platform_treasury_ledger;

    IF v_available < NEW.prize_pool THEN
      RAISE EXCEPTION 'platform_treasury_insufficient_for_event_prize: benoetigt %, verfuegbar %',
        NEW.prize_pool, v_available;
    END IF;

    PERFORM public.book_platform_treasury('debit', 'bescout_event', NEW.prize_pool, NEW.id,
      'BeScout-Event-Prize-Escrow: ' || NEW.name);
    NEW.prize_escrowed := true;
  END IF;
  RETURN NEW;
END; $$;

-- ============================================================
-- 2. BEFORE UPDATE OF status — Settle bei 'ended' (Rest zurueck) / 'cancelled' (voll zurueck).
--    Refund-Ziel nach NEW.type: club → Vereins-Treasury | bescout → Plattform-Topf.
--    (Top-Level von club_id entkoppelt; club_id-Cond nur noch im club-Refund-Zweig.)
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
      ELSIF NEW.type = 'bescout' THEN
        PERFORM public.book_platform_treasury('credit', 'bescout_event', v_refund, NEW.id,
          CASE WHEN NEW.status = 'cancelled' THEN 'BeScout-Event abgesagt - Prize zurueck: ' ELSE 'BeScout-Event-Prize-Rest zurueck: ' END || NEW.name);
      END IF;
    END IF;
    NEW.prize_escrowed := false;   -- Escrow aufgeloest (in-row, keine Rekursion)
  END IF;
  RETURN NEW;
END; $$;

-- ============================================================
-- 3. BEFORE UPDATE OF prize_pool/type — Escrow SYNCHRON halten (gegen Minting-Hintertuer, 331-Finding #1).
--    Zwei-Treasury-Generalisierung: je Treasury (club | platform) gehaltenen vs. Ziel-Escrow berechnen,
--    Differenz buchen. Deckt type-Wechsel club<->bescout sauber (refund alte + escrow neue Treasury).
--    Gehalten = aus OLD (type-diskriminiert, da prize_escrowed allein die Treasury nicht kennt).
--    Refund der gehaltenen Club-Kaution geht an OLD.club_id (Halter); neuer Club-Escrow an NEW.club_id.
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_events_resync_prize_escrow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_held_club bigint; v_held_plat bigint;
  v_tgt_club bigint; v_tgt_plat bigint;
  v_delta_club bigint; v_delta_plat bigint;
  v_available bigint;
BEGIN
  -- Aktuell escrowt, je Treasury (aus OLD inferiert).
  v_held_club := CASE WHEN OLD.prize_escrowed AND OLD.type = 'club' AND OLD.club_id IS NOT NULL
                      THEN OLD.prize_pool ELSE 0 END;
  v_held_plat := CASE WHEN OLD.prize_escrowed AND OLD.type = 'bescout'
                      THEN OLD.prize_pool ELSE 0 END;
  -- Soll-Escrow nach diesem Change, je Treasury.
  v_tgt_club := CASE WHEN NEW.type = 'club' AND NEW.prize_pool > 0 AND NEW.club_id IS NOT NULL
                     THEN NEW.prize_pool ELSE 0 END;
  v_tgt_plat := CASE WHEN NEW.type = 'bescout' AND NEW.prize_pool > 0
                     THEN NEW.prize_pool ELSE 0 END;

  v_delta_club := v_tgt_club - v_held_club;
  v_delta_plat := v_tgt_plat - v_held_plat;

  -- ----- Club-Treasury-Anpassung -----
  IF v_delta_club > 0 THEN
    -- Erhoehung / neu escrowt: Deckung pruefen + nach-debitieren (an NEW.club_id).
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
    -- Reduzierung / Quellen-Wechsel: gehaltene Club-Kaution (Teil) zurueck an den Halter OLD.club_id.
    PERFORM public.book_club_treasury(OLD.club_id, 'credit', 'event_prize', -v_delta_club, NEW.id,
      'Event-Prize-Escrow-Anpassung: ' || NEW.name);
  END IF;

  -- ----- Plattform-Topf-Anpassung -----
  IF v_delta_plat > 0 THEN
    PERFORM 1 FROM platform_treasury WHERE id = true FOR UPDATE;
    SELECT COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END), 0)
      INTO v_available FROM platform_treasury_ledger;
    IF v_available < v_delta_plat THEN
      RAISE EXCEPTION 'platform_treasury_insufficient_for_event_prize: benoetigt %, verfuegbar %', v_delta_plat, v_available;
    END IF;
    PERFORM public.book_platform_treasury('debit', 'bescout_event', v_delta_plat, NEW.id,
      'BeScout-Event-Prize-Escrow-Anpassung: ' || NEW.name);
  ELSIF v_delta_plat < 0 THEN
    PERFORM public.book_platform_treasury('credit', 'bescout_event', -v_delta_plat, NEW.id,
      'BeScout-Event-Prize-Escrow-Anpassung: ' || NEW.name);
  END IF;

  NEW.prize_escrowed := (v_tgt_club > 0 OR v_tgt_plat > 0);
  RETURN NEW;
END; $$;
