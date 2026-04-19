-- Slice 081 Extension — senke Cluster-Schwelle auf >= 4
-- Applied via mcp__supabase__apply_migration on 2026-04-20.
-- Erweitert die Stale-Markierung auf kleinere Cluster (4-9 Spieler).
-- Fängt Medium-Poisoning wie 500K/2024-07-01 (9× Spieler) oder 3.5M/2024-07-01 (8× Spieler).
-- MV unverändert → trg_update_reference_price feuert NICHT → Money-Invariant stabil.

UPDATE public.players p
SET mv_source = 'transfermarkt_stale'
WHERE p.mv_source <> 'transfermarkt_stale'
  AND (p.market_value_eur, p.contract_end) IN (
    SELECT market_value_eur, contract_end
    FROM public.players
    WHERE market_value_eur > 0 AND contract_end IS NOT NULL
    GROUP BY market_value_eur, contract_end
    HAVING COUNT(*) >= 4
  );
