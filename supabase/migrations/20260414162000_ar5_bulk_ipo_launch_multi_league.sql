-- AR-5 (Operation Beta Ready, Journey #2) — Multi-League Bulk-IPO-Launch
--
-- PROBLEM: 3.715 Multi-League-Spieler (87% des Markts) haben dpc_total=0 und
-- kein aktives IPO. Core-USP aus Multi-League-Expansion (Commit 8a5014d, 7 Ligen,
-- 4.263 Spieler) waere zum 50-Mann-Beta-Start nutzlos — User kauft BL/PL/Serie-A/
-- LaLiga/SuperLig/BL2-Spieler, nichts zu kaufen verfuegbar.
--
-- STRATEGIE: Convention aus TFF 1. Lig angewandt:
--   dpc_total = 100, dpc_available = 100, max_supply = 500
--   IPO: total_offered=100, max_per_user=10, status='open', duration=30 days, price=players.ipo_price
--
-- GUARDS (aus AR-6):
--   - WHERE ipo_price >= 1000 (AR-6 Layer 1 Filter)
--   - NOT is_liquidated
--   - Kein existing active IPO fuer den Player
--
-- IDEMPOTENT: Script kann mehrfach laufen ohne Doppel-Launch.
--
-- VERIFY nach Apply:
--   SELECT COUNT(*) FROM ipos WHERE status='open' AND starts_at >= '2026-04-14';
--   SELECT COUNT(*) FROM players WHERE dpc_total > 0;  -- Sollte ~4.280 sein

BEGIN;

-- 1. UPDATE players: Multi-League-Spieler auf TFF-Convention bringen
UPDATE players
SET
  dpc_total = 100,
  dpc_available = 100,
  max_supply = 500,
  updated_at = now()
WHERE dpc_total = 0
  AND NOT is_liquidated
  AND ipo_price >= 1000;  -- AR-6 Layer 1: Zero-Price-Filter

-- 2. INSERT ipos: eine offene IPO pro upgedatetem Player
INSERT INTO ipos (
  player_id,
  status,
  format,
  price,
  total_offered,
  sold,
  max_per_user,
  starts_at,
  ends_at,
  season,
  created_at,
  updated_at
)
SELECT
  p.id,
  'open',
  'fixed',
  p.ipo_price,
  100,
  0,
  10,
  now(),
  now() + INTERVAL '30 days',
  1,
  now(),
  now()
FROM players p
WHERE p.dpc_total = 100
  AND p.dpc_available = 100
  AND p.max_supply = 500
  AND p.ipo_price >= 1000
  AND NOT p.is_liquidated
  AND NOT EXISTS (
    SELECT 1 FROM ipos i
    WHERE i.player_id = p.id
      AND i.status IN ('announced', 'early_access', 'open')
  );

COMMIT;
