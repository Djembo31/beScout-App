-- Slice 114 — Backfill ipo_price Flat-Defaults nach CEO Pricing-Asset-Model
--
-- CEO-Approval Anil 2026-04-20: "b" (Option B) + "x3" (User behält Card als Early-Bird)
--
-- PROBLEM: 85,5% aller Players hatten ipo_price=10000 cents (Flat Import-Default)
--          statt MV_EUR / 10. Slice 108 hat liquidate_player auf lineare Formel
--          umgestellt, aber ipo_price selbst war noch falsch. Drift-Report in
--          worklog/proofs/111-before-drift-report.txt und Scope-Analyse in
--          worklog/proofs/114-scope.txt.
--
-- DREI PHASEN (alle via Snapshot-Table für Rollback-Fähigkeit):
--
--   Phase 1+2: 3.596 aktive IPOs mit price=10000, davon 1 mit sold=1 (Livan Burcu)
--     → UPDATE ipos.price = FLOOR(MV/10). Trigger sync_player_ipo_price
--       cascaded players.ipo_price automatisch. Der 1 Early-Bird-Käufer behält
--       sein Card zum historischen 100 $SCOUT-Preis (initial_listing_price
--       bleibt 10000, ipo_price updated → 40× unrealisierter Gain).
--
--   Phase 3: 409 Pre-IPO-Players (MV>0, keine IPO, keine Trades, keine Holdings)
--     → UPDATE players.ipo_price + floor_price direkt, keine Trigger nötig.
--
--   Post-Sync: floor_price sync für Phase 1+2 affected players (Trigger updated
--     nur ipo_price, floor_price bleibt sonst auf altem 10000).
--
-- ROLLBACK: SELECT rows FROM _slice114_backfill_snapshot, manual UPDATE zurück.
-- Snapshot-Tabelle bleibt permanent als Audit-Trail (kein DROP).
--
-- SAFEGUARDS:
--   - Phase 1+2: nur status=active, price=10000, MV>0 → nur legit flat-defaults
--   - Phase 3: MV>0, no-IPO, no-trades, no-holdings → keine User-Erwartungsbruch
--   - is_liquidated=false (liquidated players untouchable per convention)

BEGIN;

-- ─────────────────────────────────────────────────────
-- PHASE 0: Snapshot-Audit-Tabelle
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS _slice114_backfill_snapshot (
  snapshot_id BIGSERIAL PRIMARY KEY,
  snapshot_phase TEXT NOT NULL,
  player_id UUID NOT NULL,
  ipo_id UUID,
  old_ipo_price_cents BIGINT,
  old_player_ipo_price_cents BIGINT,
  old_player_floor_price_cents BIGINT,
  new_price_cents BIGINT NOT NULL,
  mv_eur INTEGER NOT NULL,
  sold_at_snapshot INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE _slice114_backfill_snapshot IS
  'Slice 114 Rollback-Basis. Enthaelt pre-update Werte fuer alle 3 Backfill-Phasen. Permanent archiviert.';

-- ─────────────────────────────────────────────────────
-- PHASE 1+2: IPO-Snapshot (active IPOs mit price=10000)
-- ─────────────────────────────────────────────────────
INSERT INTO _slice114_backfill_snapshot (
  snapshot_phase, player_id, ipo_id, old_ipo_price_cents,
  old_player_ipo_price_cents, old_player_floor_price_cents,
  new_price_cents, mv_eur, sold_at_snapshot
)
SELECT
  'ipo_flat_priced',
  i.player_id,
  i.id,
  i.price,
  p.ipo_price,
  p.floor_price,
  FLOOR(p.market_value_eur::BIGINT / 10),
  p.market_value_eur,
  i.sold
FROM ipos i
JOIN players p ON p.id = i.player_id
WHERE i.status IN ('announced', 'early_access', 'open')
  AND i.price = 10000
  AND p.market_value_eur > 0
  AND p.is_liquidated = false;

-- ─────────────────────────────────────────────────────
-- PHASE 1+2: UPDATE ipos.price (Trigger sync_player_ipo_price
--           cascaded → players.ipo_price automatically)
-- ─────────────────────────────────────────────────────
UPDATE ipos AS i
SET price = FLOOR(p.market_value_eur::BIGINT / 10),
    updated_at = now()
FROM players AS p
WHERE i.player_id = p.id
  AND i.status IN ('announced', 'early_access', 'open')
  AND i.price = 10000
  AND p.market_value_eur > 0
  AND p.is_liquidated = false;

-- ─────────────────────────────────────────────────────
-- PHASE 1+2 POST-SYNC: floor_price für betroffene Players
--   Trigger sync_player_ipo_price updated nur ipo_price,
--   floor_price bleibt sonst auf altem 10000.
--   Sync auf neuen ipo_price, aber nur wenn kein sell-order existiert.
-- ─────────────────────────────────────────────────────
UPDATE players p
SET floor_price = p.ipo_price,
    updated_at = now()
WHERE p.id IN (
    SELECT DISTINCT player_id FROM _slice114_backfill_snapshot
    WHERE snapshot_phase = 'ipo_flat_priced'
  )
  AND p.floor_price = 10000
  AND p.ipo_price != 10000
  AND NOT EXISTS (
    SELECT 1 FROM orders o
    WHERE o.player_id = p.id
      AND o.side = 'sell'
      AND o.status IN ('open', 'partial')
      AND (o.expires_at IS NULL OR o.expires_at > NOW())
  );

-- ─────────────────────────────────────────────────────
-- PHASE 3: Pre-IPO-Player Snapshot (MV>0, no-IPO, no-trades, no-holdings, drift)
-- ─────────────────────────────────────────────────────
INSERT INTO _slice114_backfill_snapshot (
  snapshot_phase, player_id, ipo_id, old_ipo_price_cents,
  old_player_ipo_price_cents, old_player_floor_price_cents,
  new_price_cents, mv_eur, sold_at_snapshot
)
SELECT
  'player_pre_ipo',
  p.id,
  NULL,
  NULL,
  p.ipo_price,
  p.floor_price,
  FLOOR(p.market_value_eur::BIGINT / 10),
  p.market_value_eur,
  NULL
FROM players p
WHERE p.is_liquidated = false
  AND p.market_value_eur > 0
  AND p.ipo_price != FLOOR(p.market_value_eur::BIGINT / 10)
  AND NOT EXISTS (
    SELECT 1 FROM ipos i WHERE i.player_id = p.id
      AND i.status IN ('announced', 'early_access', 'open')
  )
  AND NOT EXISTS (SELECT 1 FROM trades t WHERE t.player_id = p.id)
  AND NOT EXISTS (
    SELECT 1 FROM holdings h WHERE h.player_id = p.id AND h.quantity > 0
  );

-- ─────────────────────────────────────────────────────
-- PHASE 3: UPDATE players direkt (keine IPO existiert, keine Trigger-Cascade)
-- ─────────────────────────────────────────────────────
UPDATE players p
SET ipo_price = FLOOR(p.market_value_eur::BIGINT / 10),
    floor_price = FLOOR(p.market_value_eur::BIGINT / 10),
    updated_at = now()
WHERE p.is_liquidated = false
  AND p.market_value_eur > 0
  AND p.ipo_price != FLOOR(p.market_value_eur::BIGINT / 10)
  AND NOT EXISTS (
    SELECT 1 FROM ipos i WHERE i.player_id = p.id
      AND i.status IN ('announced', 'early_access', 'open')
  )
  AND NOT EXISTS (SELECT 1 FROM trades t WHERE t.player_id = p.id)
  AND NOT EXISTS (
    SELECT 1 FROM holdings h WHERE h.player_id = p.id AND h.quantity > 0
  );

COMMIT;
