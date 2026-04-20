-- Slice 127: Fix 3 DB invariant violations left by parallel-terminal Slices 114/117.
--
-- INV-32: public._slice114_backfill_snapshot had RLS disabled.
-- INV-36: 11 players in Duplicate-Cluster-Poisoning (MV=600000, -07-01 contracts)
--         not flagged as transfermarkt_stale.
-- INV-38: 100 players with contract_end > 12 months in past not flagged as stale.

-- ── INV-32 ──
ALTER TABLE public._slice114_backfill_snapshot ENABLE ROW LEVEL SECURITY;

-- Deny-all policy: internal snapshot table, only service_role (bypasses RLS) reads.
CREATE POLICY "deny_all" ON public._slice114_backfill_snapshot
  FOR ALL TO authenticated, anon
  USING (false)
  WITH CHECK (false);

-- ── INV-36 ──
UPDATE players
SET mv_source = 'transfermarkt_stale'
WHERE market_value_eur > 0
  AND contract_end IS NOT NULL
  AND mv_source != 'transfermarkt_stale'
  AND contract_end::text LIKE '%-07-01'
  AND (market_value_eur, contract_end) IN (
    SELECT market_value_eur, contract_end
    FROM players
    WHERE market_value_eur > 0
      AND contract_end IS NOT NULL
      AND mv_source != 'transfermarkt_stale'
      AND contract_end::text LIKE '%-07-01'
    GROUP BY market_value_eur, contract_end
    HAVING COUNT(*) > 3
  );

-- ── INV-38 ──
UPDATE players
SET mv_source = 'transfermarkt_stale'
WHERE contract_end < (CURRENT_DATE - INTERVAL '12 months')::date
  AND mv_source != 'transfermarkt_stale';
