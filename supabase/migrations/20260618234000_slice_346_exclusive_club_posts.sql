-- Slice 346 (FRE-3) — Exklusive Vereins-Beiträge (Fan-Rang-Gate + gesperrte Vorschau)
-- Security-nah: ersetzt die posts-SELECT-RLS (war USING(true)) durch ein Fan-Rang-Lese-Gate.
-- Read-Gate = RLS (nicht RPC), weil der zu schützende Akt ein READ über mehrere Call-Sites ist.
-- Gesperrte Vorschau = Teaser-RPC (SECURITY DEFINER) maskiert den Content für Unberechtigte.
-- Live verifiziert: low-tier sieht exklusiv NICHT (0), public weiterhin sichtbar; anon nur public.

-- 1. Tier-Rank-Helper — MIRROR von FAN_RANK_TIERS (src/lib/fanRanking.ts:24-31).
--    Drift-Familie (Slice 108): ändert sich die TS-Ordnung, MUSS diese Funktion mit.
CREATE OR REPLACE FUNCTION public.fan_rank_tier_rank(p_tier text)
RETURNS int
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT CASE p_tier
    WHEN 'zuschauer'     THEN 0
    WHEN 'stammgast'     THEN 1
    WHEN 'ultra'         THEN 2
    WHEN 'legende'       THEN 3
    WHEN 'ehrenmitglied' THEN 4
    WHEN 'vereinsikone'  THEN 5
    ELSE -1
  END;
$function$;
GRANT EXECUTE ON FUNCTION public.fan_rank_tier_rank(text) TO PUBLIC; -- in RLS-Policy genutzt → für alle Rollen evaluierbar

-- 2. Spalte min_fan_rank_tier (nullable, Default NULL = öffentlich) + CHECK.
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS min_fan_rank_tier TEXT;
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_min_fan_rank_tier_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_min_fan_rank_tier_check
  CHECK (min_fan_rank_tier IS NULL OR min_fan_rank_tier IN
    ('zuschauer','stammgast','ultra','legende','ehrenmitglied','vereinsikone'));

-- 3. RLS SELECT-Policy ersetzen. Öffentliche Beiträge (min IS NULL) bleiben für ALLE sichtbar.
DROP POLICY IF EXISTS "Anyone can read posts" ON public.posts;
DROP POLICY IF EXISTS "Read posts with fan-rank gate" ON public.posts;
CREATE POLICY "Read posts with fan-rank gate" ON public.posts
  FOR SELECT TO public
  USING (
    min_fan_rank_tier IS NULL
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR fan_rank_tier_rank(
         (SELECT fr.rank_tier FROM public.fan_rankings fr
          WHERE fr.user_id = auth.uid() AND fr.club_id = posts.club_id)
       ) >= fan_rank_tier_rank(min_fan_rank_tier)
  );

-- 4. Teaser-RPC: club_news mit maskiertem Content (gesperrte Vorschau). Bypasst RLS (DEFINER),
--    gibt Unberechtigten nur Teaser-Metadaten + content=NULL. Einziger Anzeige-Pfad für exklusive News.
CREATE OR REPLACE FUNCTION public.get_club_news_teasers(p_club_id uuid, p_limit int DEFAULT 3)
RETURNS TABLE(
  id uuid,
  created_at timestamptz,
  category text,
  content text,
  min_fan_rank_tier text,
  can_view boolean,
  author_handle text,
  author_avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT
    p.id,
    p.created_at,
    p.category,
    CASE WHEN (
      p.min_fan_rank_tier IS NULL
      OR (auth.uid() IS NOT NULL AND p.user_id = auth.uid())
      OR fan_rank_tier_rank(
           (SELECT fr.rank_tier FROM fan_rankings fr
            WHERE fr.user_id = auth.uid() AND fr.club_id = p.club_id)
         ) >= fan_rank_tier_rank(p.min_fan_rank_tier)
    ) THEN p.content ELSE NULL END AS content,
    p.min_fan_rank_tier,
    (
      p.min_fan_rank_tier IS NULL
      OR (auth.uid() IS NOT NULL AND p.user_id = auth.uid())
      OR fan_rank_tier_rank(
           (SELECT fr.rank_tier FROM fan_rankings fr
            WHERE fr.user_id = auth.uid() AND fr.club_id = p.club_id)
         ) >= fan_rank_tier_rank(p.min_fan_rank_tier)
    ) AS can_view,
    pr.handle AS author_handle,
    pr.avatar_url AS author_avatar_url
  FROM posts p
  LEFT JOIN profiles pr ON pr.id = p.user_id
  WHERE p.club_id = p_club_id
    AND p.post_type = 'club_news'
    AND p.parent_id IS NULL
  ORDER BY p.created_at DESC
  LIMIT GREATEST(COALESCE(p_limit, 3), 0);
$function$;

REVOKE EXECUTE ON FUNCTION public.get_club_news_teasers(uuid, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_club_news_teasers(uuid, int) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_club_news_teasers(uuid, int) TO authenticated;
