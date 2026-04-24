# Slice 178e-a — buy_from_order Idempotency-Integration

Pattern-Wiederholung von 178a auf P2P-buy-RPC.

## Signatur
(uuid, uuid, integer) → (uuid, uuid, integer, text DEFAULT NULL)

## Preserved Guards
auth, qty, order FOR UPDATE, side=sell, status∈(open,partial), not-own-order, remaining-qty, liquidation, club_admin, advisory_lock, 24h_rate_limit(20), circular_guard(2/7d), fee_cfg+abo_discount, 2× wallet FOR UPDATE, holdings INSERT-ON-CONFLICT + seller-UPDATE, order filled_qty+status, players last_price/volume/price_change_24h, recalc_floor_price, trades, transactions trade_buy/sell, credit_pbt, clubs.treasury.

## Proof
Live pg_get_functiondef als Baseline genommen (keine Zwischen-Patches in 10 referencing files). 130/130 trading tests grün.
