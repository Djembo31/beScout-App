-- Slice 482 (D-26c Teil 2): players.club Freitext (stale, live 294/4556=6,45% divergent vom FK)
-- → FK-resolved Club-Name direkt in den Aggregat-RPCs. Server-seitiger Resolve an der Quelle:
-- LEFT JOIN clubs c ON c.id = players.club_id + COALESCE(c.name, players.club).
-- KEINE Signatur-Änderung (RETURNS TABLE identisch → ACL erhalten S368c, Shape erhalten →
-- Wrapper get_most_watched_players + Service-Mapper unberührt). Graceful Freitext-Fallback bei
-- club_id NULL / Orphan-FK. Schwester zu S481 (Client-getClub für Raw-Row-Surfaces) — selbe
-- clubs-SSOT, Surface-Typ-spezifischer Resolve. Kein Backfill players.club (S303).

-- 1) Trending / Movers (SQL STABLE, an authenticated granted)
CREATE OR REPLACE FUNCTION public.rpc_get_trending_players(p_limit integer DEFAULT 5)
 RETURNS TABLE(player_id uuid, trade_count bigint, volume_24h bigint, first_name text, last_name text, player_position text, club text, floor_price bigint, price_change_24h numeric)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT
    t.player_id,
    COUNT(*) AS trade_count,
    SUM(t.price * t.quantity) AS volume_24h,
    p.first_name,
    p.last_name,
    p.position AS player_position,
    COALESCE(c.name, p.club) AS club,
    p.floor_price,
    p.price_change_24h
  FROM trades t
  JOIN players p ON p.id = t.player_id
  LEFT JOIN clubs c ON c.id = p.club_id
  WHERE t.executed_at > NOW() - INTERVAL '24 hours'
  GROUP BY t.player_id, p.first_name, p.last_name, p.position, p.club, c.name, p.floor_price, p.price_change_24h
  ORDER BY trade_count DESC
  LIMIT p_limit;
$function$;

-- 2) Most-Watched (SQL SECURITY DEFINER, via auth-gated Wrapper get_most_watched_players)
CREATE OR REPLACE FUNCTION public.rpc_get_most_watched_players(p_limit integer DEFAULT 5)
 RETURNS TABLE(player_id uuid, watcher_count bigint, first_name text, last_name text, player_pos text, club text, image_url text, floor_price bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    w.player_id,
    COUNT(*)::BIGINT           AS watcher_count,
    p.first_name,
    p.last_name,
    p.position                 AS player_pos,
    COALESCE(c.name, p.club)   AS club,
    p.image_url,
    COALESCE(p.floor_price, 0) AS floor_price
  FROM watchlist w
  JOIN players p ON p.id = w.player_id
  LEFT JOIN clubs c ON c.id = p.club_id
  WHERE p.is_liquidated = false
  GROUP BY
    w.player_id,
    p.first_name, p.last_name,
    p.position, p.club, c.name,
    p.image_url, p.floor_price
  ORDER BY watcher_count DESC
  LIMIT p_limit;
$function$;

-- AR-44 / S368c: Body-Rewrite bestehender Funktionen erhält die ACL — diese Blöcke
-- re-asserten die LIVE bestehenden Grants exakt (verifiziert proacl pre==post, keine Änderung).
-- rpc_get_trending_players: an authenticated (direkt vom Client gerufen), kein anon/PUBLIC.
REVOKE EXECUTE ON FUNCTION public.rpc_get_trending_players(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpc_get_trending_players(integer) FROM anon;
GRANT  EXECUTE ON FUNCTION public.rpc_get_trending_players(integer) TO authenticated;

-- rpc_get_most_watched_players: SERVICE_ROLE-ONLY (wird NUR via auth-gated SECDEF-Wrapper
-- get_most_watched_players gerufen). NICHT an authenticated granten → sonst Bypass des
-- auth.uid()-Guards des Wrappers. anon/PUBLIC/authenticated explizit revoken.
REVOKE EXECUTE ON FUNCTION public.rpc_get_most_watched_players(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpc_get_most_watched_players(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rpc_get_most_watched_players(integer) FROM authenticated;
