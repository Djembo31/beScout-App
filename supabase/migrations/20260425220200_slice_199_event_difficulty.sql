-- ============================================================================
-- Slice 199: get_event_difficulty_score — Backend-Aggregat-RPC
-- Date: 2026-04-25
-- Spec: worklog/specs/199-backend-aggregate-rpcs.md
-- Pattern-Vorbild: Slice 095 / 195e — public-safe SECURITY DEFINER mit
--                  projiziertem Output. Difficulty-Heuristik ist deterministic.
-- Source-of-truth: NEU (keine Vorgaenger-Migration).
-- ============================================================================
-- Scope: SECURITY DEFINER RPC — berechnet Schwierigkeits-Score eines Events
-- aus dem Durchschnitts-IPO-Preis aller Spieler des associierten Clubs.
--
-- Schema-Truth (verified 2026-04-25): events hat KEIN `eligible_clubs` column,
-- nur `club_id` (single-club-association) + `event_tier` ('arena|club|user').
-- Spec-Annahme "eligible_clubs[]" ist nicht im aktuellen Schema → wir nutzen
-- ausschliesslich club_id. Bei NULL-club_id: discriminated-union error-shape.
--
-- Heuristik (initial — tune nach Live-Daten):
--   avg_ipo_price_cents <= 100_000  → easy   (score 0.30)
--   100_001 .. 500_000              → medium (score 0.60)
--   > 500_000                       → hard   (score 0.85)
--
-- Return:
--   Success: `{event_id, difficulty_score, difficulty_tier,
--             avg_ipo_price_cents, participant_clubs_count}`
--   Error:   `{success: false, error: 'event_not_found' | 'event_not_clubbed'}`
--
-- HINWEIS: Erfolgs-Path nutzt Plain-Object (keine `success: true`-Discriminator),
-- damit Service einfacher als `if ('error' in data) throw` lesen kann. Edge-Case
-- error-shape ist `{success: false, error}` (Slice 168 discriminated-union
-- pattern fuer error-paths).
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_event_difficulty_score(UUID);

CREATE OR REPLACE FUNCTION public.get_event_difficulty_score(
  p_event_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $function$
DECLARE
  v_event_id     UUID;
  v_club_id      UUID;
  v_avg_ipo      BIGINT;
  v_score        NUMERIC;
  v_tier         TEXT;
  v_clubs_count  INT;
BEGIN
  -- Phase 1: Resolve event row
  SELECT e.id, e.club_id
  INTO v_event_id, v_club_id
  FROM public.events e
  WHERE e.id = p_event_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_not_found');
  END IF;

  IF v_club_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_not_clubbed');
  END IF;

  -- Phase 2: avg IPO price across active (non-liquidated) club players.
  -- COALESCE 0 wenn keine Spieler vorhanden (defensive — Liquidation-Edge).
  SELECT COALESCE(AVG(p.ipo_price)::BIGINT, 0)::BIGINT
  INTO v_avg_ipo
  FROM public.players p
  WHERE p.club_id = v_club_id
    AND p.is_liquidated = false;

  -- Phase 3: Heuristik — 3 Tiers
  IF v_avg_ipo <= 100000 THEN
    v_score := 0.30;
    v_tier  := 'easy';
  ELSIF v_avg_ipo <= 500000 THEN
    v_score := 0.60;
    v_tier  := 'medium';
  ELSE
    v_score := 0.85;
    v_tier  := 'hard';
  END IF;

  -- Phase 4: participant_clubs_count
  -- Schema-Stand 2026-04-25: events.club_id ist single-club. Multi-Club
  -- (eligible_clubs[]) NICHT implementiert. → konstant 1 fuer single-club events.
  -- Bei spaeterer Multi-Club-Erweiterung: hier card-len(eligible_clubs) statt 1.
  v_clubs_count := 1;

  RETURN jsonb_build_object(
    'event_id',                v_event_id,
    'difficulty_score',        v_score,
    'difficulty_tier',         v_tier,
    'avg_ipo_price_cents',     v_avg_ipo,
    'participant_clubs_count', v_clubs_count
  );
END;
$function$;

COMMENT ON FUNCTION public.get_event_difficulty_score(uuid) IS
  'Slice 199 (2026-04-25): Event-difficulty score from avg ipo_price of '
  'associated club players (excluding liquidated). Heuristic: <=100k=easy(0.3), '
  '100k-500k=medium(0.6), >500k=hard(0.85). Returns JSONB object with '
  'difficulty_score/tier/avg_ipo_price_cents/participant_clubs_count. Errors '
  'return {success: false, error}: event_not_found | event_not_clubbed. Tune '
  'thresholds post-live-data.';

-- ── AR-44: REVOKE/GRANT-Block ────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.get_event_difficulty_score(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_event_difficulty_score(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_event_difficulty_score(uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_event_difficulty_score(uuid) TO service_role;
