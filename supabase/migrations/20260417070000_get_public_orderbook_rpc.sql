-- =============================================================================
-- Slice 020 — Projection-RPC: get_public_orderbook (2026-04-17)
--
-- Orderbook-Projektion: liefert offene Orders mit `handle` (via JOIN auf
-- profiles) und `is_own` (= auth.uid() matcht user_id), OHNE user_id im
-- Response. Vorbereitung fuer RLS-Tighten in Slice 021.
--
-- Ersetzt direkte Client-Reads von `orders` fuer cross-user Orderbook-
-- Zwecke: getSellOrders, getAllOpenSellOrders, getAllOpenBuyOrders.
--
-- SECURITY DEFINER weil nach RLS-Tighten (Slice 021) direkter Zugriff
-- nur noch auf own+admin geht. AR-44 Template: REVOKE anon, GRANT
-- authenticated.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_public_orderbook(
  p_player_id uuid DEFAULT NULL,
  p_side text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  player_id uuid,
  side text,
  price bigint,
  quantity int,
  filled_qty int,
  status text,
  created_at timestamptz,
  expires_at timestamptz,
  handle text,
  is_own boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT
    o.id,
    o.player_id,
    o.side::text,
    o.price,
    o.quantity,
    o.filled_qty,
    o.status::text,
    o.created_at,
    o.expires_at,
    p.handle,
    COALESCE(o.user_id = auth.uid(), false) AS is_own
  FROM orders o
  LEFT JOIN profiles p ON p.id = o.user_id
  WHERE o.status IN ('open', 'partial')
    AND o.expires_at > now()
    AND (p_player_id IS NULL OR o.player_id = p_player_id)
    AND (p_side IS NULL OR o.side = p_side)
  ORDER BY
    CASE o.side WHEN 'sell' THEN o.price END ASC NULLS LAST,
    CASE o.side WHEN 'buy'  THEN o.price END DESC NULLS LAST,
    o.created_at ASC
  LIMIT 1000;
$$;

REVOKE EXECUTE ON FUNCTION public.get_public_orderbook(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_public_orderbook(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_public_orderbook(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_orderbook(uuid, text) TO service_role;

COMMENT ON FUNCTION public.get_public_orderbook(uuid, text) IS
  'Slice 020 (2026-04-17): Orderbook-Projektion ohne user_id, mit handle+is_own. Ersetzt direkte orders-Reads. Vorbereitung fuer RLS-Tighten in Slice 021.';
