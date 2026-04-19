-- Slice 081b — Paired-Poisoning (Cluster 2-3 mit gleichem TR-normalisiertem last_name)
-- Applied via mcp__supabase__apply_migration on 2026-04-20.
-- Faengt Arda Yilmaz + Baris Alper Yilmaz (beide 26M EUR + 2021-07-10) und
-- aehnliche Paare (Cihan/Yunus Akgun, Mio Backhaus × 2 etc).
-- 0 Holdings, 0 Orders betroffen → safe.
-- trg_update_reference_price guarded → Money-Invariant byte-stabil.
-- TR-Normalize-Pattern aus .claude/rules/common-errors.md ("Turkish Unicode").

UPDATE public.players p
SET mv_source = 'transfermarkt_stale'
WHERE p.id IN (
  WITH normalized AS (
    SELECT id, market_value_eur, contract_end,
           LOWER(TRANSLATE(last_name, 'şçğıöüİŞÇĞÖÜ', 'scgiouisCGOU')) AS norm_last
    FROM public.players
    WHERE market_value_eur > 0
      AND contract_end IS NOT NULL
      AND mv_source <> 'transfermarkt_stale'
  ),
  victims AS (
    SELECT UNNEST(array_agg(id)) AS player_id
    FROM normalized
    GROUP BY market_value_eur, contract_end, norm_last
    HAVING COUNT(*) BETWEEN 2 AND 3
  )
  SELECT player_id FROM victims
);
