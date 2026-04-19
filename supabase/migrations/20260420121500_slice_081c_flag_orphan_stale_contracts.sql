-- Slice 081c — Orphan Stale Contracts (>12 Monate abgelaufen)
-- Applied via mcp__supabase__apply_migration on 2026-04-20.
-- Flags 1434 Spieler wo contract_end > 12 Monate in der Vergangenheit ist.
-- In all diesen Faellen sind TM-Daten eindeutig nicht aktualisiert (Verlaengerung/
-- Transfer nicht erfasst). MV + reference_price bleiben byte-identisch (Trigger-Guard).

UPDATE public.players
SET mv_source = 'transfermarkt_stale'
WHERE contract_end IS NOT NULL
  AND contract_end < CURRENT_DATE - INTERVAL '12 months'
  AND mv_source <> 'transfermarkt_stale';
