-- =============================================================================
-- Slice 178 (Tier A1) — Idempotency Infrastructure Foundation
--
-- Context:
--   Complement zu Slice 179 (append-only-transactions). Verhindert
--   Double-Spend bei Network-Retry (Mobile-Switch, 3G-Timeout). Bisher
--   ad-hoc per-RPC implementiert (z.B. subscribe_to_club inline-60s-window,
--   Slice 151c.2). Slice 178 etabliert standardized Foundation.
--
-- Schema:
--   request_dedup_keys(user_id, dedup_key) unique — stored response erlaubt
--   idempotent retry-replay.
--
-- Usage-Pattern (via Pilot-Slice 178a in zukuenftigen Money-RPCs):
--   SELECT is_new, existing_response INTO v_new, v_cached
--     FROM public.check_or_reserve_dedup_key(p_user_id, p_idempotency_key, 300);
--   IF NOT v_new THEN
--     RETURN v_cached;  -- network-retry replay
--   END IF;
--   -- ... money-operation ...
--   UPDATE request_dedup_keys SET response = <result>, status = 'completed'
--     WHERE user_id = p_user_id AND dedup_key = p_idempotency_key;
--   RETURN <result>;
--
-- Verify nach Apply:
--   SELECT tablename FROM pg_tables WHERE tablename = 'request_dedup_keys';
--   SELECT proname FROM pg_proc WHERE proname = 'check_or_reserve_dedup_key';
-- =============================================================================

-- 1. Table
CREATE TABLE IF NOT EXISTS public.request_dedup_keys (
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dedup_key     TEXT NOT NULL,
  response      JSONB,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'completed', 'failed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, dedup_key)
);

CREATE INDEX IF NOT EXISTS idx_request_dedup_keys_expires
  ON public.request_dedup_keys (expires_at);

COMMENT ON TABLE public.request_dedup_keys IS
  'Slice 178 (2026-04-24): Idempotency-key storage. Prevents double-spend on '
  'network-retry. Cleanup via cron (Slice 178b).';

-- 2. RLS
ALTER TABLE public.request_dedup_keys ENABLE ROW LEVEL SECURITY;

-- SELECT: own rows only
DROP POLICY IF EXISTS "request_dedup_keys_select_own" ON public.request_dedup_keys;
CREATE POLICY "request_dedup_keys_select_own"
ON public.request_dedup_keys
FOR SELECT
USING (auth.uid() = user_id);

-- INSERT/UPDATE/DELETE blocked for client-roles.
-- Writes happen exclusively via SECURITY DEFINER helper check_or_reserve_dedup_key
-- (plus application-side UPDATE via future RPCs which run as postgres).

-- 3. Helper: reserve-or-fetch dedup-key
CREATE OR REPLACE FUNCTION public.check_or_reserve_dedup_key(
  p_user_id UUID,
  p_dedup_key TEXT,
  p_ttl_seconds INT DEFAULT 300
) RETURNS TABLE(is_new BOOLEAN, existing_response JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_inserted BOOLEAN := FALSE;
BEGIN
  -- Slice 005 Pattern: auth.uid()-Guard fuer authenticated-calls, service_role exempt
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: caller=% target=%', auth.uid(), p_user_id;
  END IF;

  -- Attempt reservation; NOTHING on conflict signals existing entry
  INSERT INTO public.request_dedup_keys (user_id, dedup_key, expires_at)
  VALUES (p_user_id, p_dedup_key, NOW() + (p_ttl_seconds || ' seconds')::INTERVAL)
  ON CONFLICT (user_id, dedup_key) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted THEN
    -- Fresh reservation
    RETURN QUERY SELECT TRUE, NULL::JSONB;
  ELSE
    -- Existing entry → return cached response (may be NULL if still pending)
    RETURN QUERY
      SELECT FALSE, r.response
      FROM public.request_dedup_keys r
      WHERE r.user_id = p_user_id AND r.dedup_key = p_dedup_key;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.check_or_reserve_dedup_key(UUID, TEXT, INT) IS
  'Slice 178: Reserve or fetch idempotency-key. Returns is_new=TRUE on first '
  'call, FALSE + cached response on retry.';

-- Template-Regel (AR-44): REVOKE default PUBLIC grant, GRANT authenticated
REVOKE EXECUTE ON FUNCTION public.check_or_reserve_dedup_key(UUID, TEXT, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_or_reserve_dedup_key(UUID, TEXT, INT) FROM anon;
GRANT EXECUTE ON FUNCTION public.check_or_reserve_dedup_key(UUID, TEXT, INT) TO authenticated;
