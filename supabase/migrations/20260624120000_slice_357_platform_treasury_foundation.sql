-- Slice 357 — Plattform-Treasury Topf-Fundament (E3-1, D96)
-- Mirror Club-Treasury 329/329b/330b, aber SINGLE-POT (kein per-Club).
-- Baut NUR das leere Fundament: Fee-Ströme REIN = Slice 2 (eine Quelle/Slice, Trading zuerst),
--   RAUS (Monats-Liga / BeScout-Events) = Slice 3/4.
-- Topf startet bei 0 — KEIN Backfill: die verbrannten Plattform-Fee-Anteile wurden nie gebucht,
--   es existiert kein historischer Saldo zu rekonstruieren (anders als 329, das Eröffnungssalden aggregierte).
-- Design (CEO-approved 2026-06-24, Variante A): Saldo = SUM(ledger) unter Singleton-Row-Lock,
--   KOHÄRENT mit Club-Treasury. Revisit Variante B (gecachter Saldo in der Singleton-Row, O(1) statt
--   O(n) pro Buchung) wenn platform_treasury_ledger sehr groß wird (Millionen Zeilen). Die Lock-Row
--   existiert bereits → Umstieg auf B ist später eine lokale Änderung.

-- ============================================================
-- 1. Singleton Lock-Anker (der "Topf" — genau 1 Row, reiner Serialisierungspunkt)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.platform_treasury (
  id          boolean PRIMARY KEY DEFAULT true CHECK (id),  -- id=true erzwingt max. 1 Row
  created_at  timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.platform_treasury (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.platform_treasury IS
  'Slice 357: Singleton-Lock-Anker des Plattform-Treasury (BeScout-Topf, D96). Genau 1 Row. book_platform_treasury() lockt diese Row FOR UPDATE als Serialisierungspunkt der balance_after-Kette (Mirror clubs-FOR-UPDATE aus 329). Saldo = SUM(platform_treasury_ledger), hier NICHT gecacht (Variante A).';

-- ============================================================
-- 2. Ledger (append-only Kontoauszug; Mirror club_treasury_ledger minus club_id, type→source)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.platform_treasury_ledger (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction     text NOT NULL CHECK (direction IN ('credit','debit')),
  source        text NOT NULL CHECK (source IN (
                  -- REIN (Slice 2 — verbrannte Plattform-Fee-Ströme, eine Quelle/Slice):
                  'trading','ipo','poll','research','bounty','p2p',
                  -- RAUS (Slice 3/4 — plattformweite Rewards):
                  'monthly_liga','bescout_event')),
  amount        bigint NOT NULL CHECK (amount > 0),  -- immer positiv; direction trägt das Vorzeichen
  balance_after bigint NOT NULL,
  reference_id  uuid,                                -- trade_id / liga_snapshot_id / event_id / ...
  description   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_treasury_ledger_created
  ON public.platform_treasury_ledger (created_at DESC, id DESC);

COMMENT ON TABLE public.platform_treasury_ledger IS
  'Slice 357: append-only Kontoauszug des Plattform-Treasury (BeScout-Topf, D96). Saldo = SUM(credit)-SUM(debit). Pflege NUR via book_platform_treasury(). UPDATE/DELETE Trigger-geblockt. source-Enum: REIN trading/ipo/poll/research/bounty/p2p (Slice 2), RAUS monthly_liga/bescout_event (Slice 3/4).';

-- ============================================================
-- 3. Append-only-Enforcement (Wiederverwendung der generischen 329-Trigger-Fn + shared GUC)
-- ============================================================
DROP TRIGGER IF EXISTS trg_platform_treasury_ledger_append_only ON public.platform_treasury_ledger;
CREATE TRIGGER trg_platform_treasury_ledger_append_only
  BEFORE UPDATE OR DELETE ON public.platform_treasury_ledger
  FOR EACH ROW EXECUTE FUNCTION public.prevent_treasury_ledger_mutation();
-- prevent_treasury_ledger_mutation (Slice 329) ist tabellen-agnostisch: prüft GUC
-- bescout.allow_treasury_mutation, raised sonst. Bypass: SET LOCAL bescout.allow_treasury_mutation = true.

-- ============================================================
-- 4. RLS — Definer-Only (ENABLE RLS + 0 Policies; nur SECURITY-DEFINER-RPCs lesen als owner)
--    Cron/Definer-Only-Pattern (database.md S197d) — bewusst, kein "fehlende Policy".
-- ============================================================
ALTER TABLE public.platform_treasury ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_treasury_ledger ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_treasury FROM anon, authenticated;
REVOKE ALL ON public.platform_treasury_ledger FROM anon, authenticated;
-- Keine permissive Policy → kein Client-Direktzugriff.

-- ============================================================
-- 5. Buchungs-Helper (Mirror book_club_treasury minus club_id; SUM unter Singleton-Row-Lock)
-- ============================================================
CREATE OR REPLACE FUNCTION public.book_platform_treasury(
  p_direction text, p_source text, p_amount bigint,
  p_ref uuid DEFAULT NULL, p_desc text DEFAULT NULL
) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_prev bigint; v_after bigint;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RETURN NULL; END IF;  -- no-op bei 0/NULL
  -- Singleton-Row-Lock IST der Serialisierungspunkt der balance_after-Kette (vgl. clubs-FOR-UPDATE in 329).
  -- NICHT entfernen/"optimieren": ohne ihn racen parallele Buchungen die SUM-Lesung.
  PERFORM 1 FROM platform_treasury WHERE id = true FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'book_platform_treasury: Singleton-Row fehlt (Migration 357 nicht korrekt geseedet)';
  END IF;
  SELECT COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END), 0)
    INTO v_prev FROM platform_treasury_ledger;
  v_after := v_prev + (CASE WHEN p_direction = 'debit' THEN -p_amount ELSE p_amount END);
  INSERT INTO platform_treasury_ledger (direction, source, amount, balance_after, reference_id, description)
  VALUES (p_direction, p_source, p_amount, v_after, p_ref, p_desc);
  RETURN v_after;
END; $$;
-- Kein GRANT: wird nur via Trigger / andere SECURITY-DEFINER-RPCs aufgerufen (laufen als owner). Mirror 329.
REVOKE ALL ON FUNCTION public.book_platform_treasury(text,text,bigint,uuid,text) FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 6. Saldo-Lese-RPC (Platform-Admin-guarded; read-only, kein Lock nötig)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_platform_balance()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_in bigint;
  v_out bigint;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'auth_required: Nicht authentifiziert'; END IF;
  IF NOT EXISTS (SELECT 1 FROM platform_admins WHERE user_id = v_caller) THEN
    RAISE EXCEPTION 'not_authorized: Kein Platform-Admin';
  END IF;

  SELECT COALESCE(SUM(amount) FILTER (WHERE direction = 'credit'), 0),
         COALESCE(SUM(amount) FILTER (WHERE direction = 'debit'), 0)
    INTO v_in, v_out
  FROM platform_treasury_ledger;

  RETURN json_build_object(
    'success', true,
    'balance',  v_in - v_out,
    'total_in', v_in,
    'total_out', v_out
  );
END; $$;
REVOKE EXECUTE ON FUNCTION public.get_platform_balance() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_platform_balance() TO authenticated, postgres, service_role;

-- ============================================================
-- 7. Kontoauszug-Lese-RPC (Platform-Admin-guarded; Mirror get_club_treasury_ledger)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_platform_treasury_ledger(p_limit integer DEFAULT 50)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'auth_required: Nicht authentifiziert'; END IF;
  IF NOT EXISTS (SELECT 1 FROM platform_admins WHERE user_id = v_caller) THEN
    RAISE EXCEPTION 'not_authorized: Kein Platform-Admin';
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC, t.id DESC), '[]'::jsonb)
    INTO v_result
  FROM (
    SELECT id, direction, source, amount, balance_after, description, created_at
    FROM platform_treasury_ledger
    ORDER BY created_at DESC, id DESC
    LIMIT GREATEST(LEAST(COALESCE(p_limit, 50), 200), 1)
  ) t;

  RETURN v_result;
END; $$;
REVOKE EXECUTE ON FUNCTION public.get_platform_treasury_ledger(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_platform_treasury_ledger(integer) TO authenticated, postgres, service_role;
