-- Slice 109: get_home_dashboard_v1 RPC
-- Consolidates 4 per-user /home queries (holdings + user_stats + tickets + highest_pass)
-- into a single SECURITY DEFINER RPC call to cut Slow 4G Roundtrip count by 3.
--
-- Security: AR-44 Guard pattern (auth.uid IS NULL | IS DISTINCT FROM p_user_id)
-- plus REVOKE PUBLIC/anon + GRANT authenticated.
-- Read-only — no writes, no money-side effects.

CREATE OR REPLACE FUNCTION public.get_home_dashboard_v1(
  p_user_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := COALESCE(p_user_id, auth.uid());
  v_holdings jsonb;
  v_user_stats jsonb;
  v_tickets jsonb;
  v_highest_pass jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'auth_uid_mismatch';
  END IF;

  -- Holdings with player join — matches HoldingWithPlayer TS type
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', h.id,
        'user_id', h.user_id,
        'player_id', h.player_id,
        'quantity', h.quantity,
        'avg_buy_price', h.avg_buy_price,
        'created_at', h.created_at,
        'updated_at', h.updated_at,
        'player', jsonb_build_object(
          'first_name', p.first_name,
          'last_name', p.last_name,
          'image_url', p.image_url,
          'position', p.position,
          'club', p.club,
          'club_id', p.club_id,
          'floor_price', p.floor_price,
          'price_change_24h', p.price_change_24h,
          'perf_l5', p.perf_l5,
          'perf_l15', p.perf_l15,
          'matches', p.matches,
          'goals', p.goals,
          'assists', p.assists,
          'status', p.status,
          'shirt_number', p.shirt_number,
          'age', p.age
        )
      )
      ORDER BY h.quantity DESC
    ),
    '[]'::jsonb
  )
  INTO v_holdings
  FROM public.holdings h
  JOIN public.players p ON p.id = h.player_id
  WHERE h.user_id = v_uid
    AND h.quantity > 0;

  -- User stats (may be NULL for brand-new users without stats row)
  SELECT to_jsonb(us.*)
  INTO v_user_stats
  FROM public.user_stats us
  WHERE us.user_id = v_uid;

  -- Tickets balance row (may be NULL for users without tickets init)
  SELECT to_jsonb(ut.*)
  INTO v_tickets
  FROM public.user_tickets ut
  WHERE ut.user_id = v_uid;

  -- Highest founding pass: tier rank fan=1, scout=2, pro=3, founder=4
  SELECT to_jsonb(fp.*)
  INTO v_highest_pass
  FROM public.user_founding_passes fp
  WHERE fp.user_id = v_uid
  ORDER BY
    CASE fp.tier
      WHEN 'founder' THEN 4
      WHEN 'pro' THEN 3
      WHEN 'scout' THEN 2
      WHEN 'fan' THEN 1
      ELSE 0
    END DESC,
    fp.created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'holdings', v_holdings,
    'user_stats', v_user_stats,
    'tickets', v_tickets,
    'highest_pass', v_highest_pass
  );
END;
$$;

-- AR-44 Pflicht: REVOKE + GRANT
REVOKE EXECUTE ON FUNCTION public.get_home_dashboard_v1(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_home_dashboard_v1(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_home_dashboard_v1(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_home_dashboard_v1(uuid) IS
  'Slice 109: Aggregates per-user home-dashboard data (holdings + user_stats + tickets + highest_pass) in a single RPC call. SECURITY DEFINER with AR-44 auth.uid guard. Read-only.';
