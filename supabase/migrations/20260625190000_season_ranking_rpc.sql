-- Slice 381 (E-2a) — BeScout-Saison: read-only Pro-Liga-/Gesamt-Ranking-Aggregat.
--
-- Aggregiert pro Nutzer die Saison-Punkte (SUM lineups.total_score) über
-- BeScout-Saison-Events (is_liga_event = true, status='ended'):
--   p_league_id = NULL  -> Gesamt (alle Ligen; heute mit Bestandsdaten gefüllt)
--   p_league_id = <uuid> -> nur Events mit diesem league_id (E-1 events.league_id)
--
-- KEIN Money, KEIN scout_scores-Umbau, KEIN Payout (Payout = E-2b, D106).
-- Trader/Analyst bleiben global; nur Manager-/Event-Leistung ist liga-spezifisch
-- ableitbar (D104/D106).
--
-- Security: SEC DEFINER nötig (Aggregat über alle Nutzer; lineups-RLS = nur eigene).
-- Return-Shape = nur public Profile-Felder + Aggregat-Score (kein PII) -> RPC ist
-- selbst die Boundary (errors-db S095). Mirror rpc_get_scout_leaderboard_overall.

CREATE OR REPLACE FUNCTION public.rpc_get_season_ranking(
  p_league_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 100
) RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'user_id', t.user_id,
        'handle', t.handle,
        'display_name', t.display_name,
        'avatar_url', t.avatar_url,
        'season_score', t.season_score,
        'event_count', t.event_count,
        'rank', t.rank
      ) ORDER BY t.rank
    ),
    '[]'::jsonb
  )
  FROM (
    SELECT
      agg.user_id,
      p.handle,
      p.display_name,
      p.avatar_url,
      agg.season_score,
      agg.event_count,
      ROW_NUMBER() OVER (
        ORDER BY agg.season_score DESC, agg.event_count DESC, agg.user_id
      )::int AS rank
    FROM (
      SELECT
        l.user_id,
        COALESCE(SUM(l.total_score), 0)::numeric AS season_score,
        COUNT(*)::int AS event_count
      FROM lineups l
      JOIN events e ON e.id = l.event_id
      WHERE e.is_liga_event = true
        AND e.status = 'ended'
        AND (p_league_id IS NULL OR e.league_id = p_league_id)
      GROUP BY l.user_id
    ) agg
    JOIN profiles p ON p.id = agg.user_id
    ORDER BY agg.season_score DESC, agg.event_count DESC, agg.user_id
    LIMIT GREATEST(LEAST(p_limit, 200), 1)
  ) t;
$function$;

-- AR-44: neue Funktion erbt PUBLIC+anon-Default -> explizit sperren.
REVOKE EXECUTE ON FUNCTION public.rpc_get_season_ranking(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpc_get_season_ranking(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_season_ranking(uuid, integer) TO authenticated;
