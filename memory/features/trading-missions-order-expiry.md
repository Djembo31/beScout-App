# Feature: Trading Mission Definitions + Order Expiry Policy
## Status: Done
## Gestartet: 2026-03-14

## Was
1. **Trading Missions**: 3 Mission Definitions (daily_trade, weekly_5_trades, first_ipo_buy) + triggerMissionProgress calls in trading.ts und ipo.ts
2. **Order Expiry**: 30-Tage Default-Expiry auf Sell Orders, expire_pending_orders RPC, Client-Filter, Cron-Integration, Server-Side Guards in buy_player_dpc + buy_from_order

## Task 1: Trading Mission Definitions — DONE
- [x] 3 neue mission_definitions INSERTs (daily_trade, weekly_5_trades, first_ipo_buy)
- [x] buyFromMarket() triggert `['daily_trade', 'weekly_5_trades']`
- [x] buyFromOrder() triggert `['daily_trade', 'weekly_5_trades']`
- [x] placeSellOrder() triggert `['daily_trade', 'weekly_5_trades']`
- [x] buyFromIpo() triggert `['first_ipo_buy', 'daily_trade']`

## Task 2: Order Expiry Policy — DONE
- [x] place_sell_order RPC setzt expires_at = NOW() + INTERVAL '30 days'
- [x] expire_pending_orders() RPC cancelt expired orders + recalculates floor_price
- [x] getAllOpenSellOrders() filtert `.gt('expires_at', now)`
- [x] getSellOrders() filtert `.gt('expires_at', now)`
- [x] Cron ruft expire_pending_orders auf (nach expire_pending_offers)
- [x] Backfill: bestehende Orders bekommen expires_at = created_at + 30 days
- [x] buy_player_dpc: Order-Selection excludiert expired Orders
- [x] buy_from_order: Expiry-Guard nach Status-Check
- [x] Alle floor_price Subqueries excludieren expired Orders
- [x] Escrow-Berechnung (open sell qty) excludiert expired Orders

## Review-Erkenntnisse (Self-Audit)
- Client-Filter sind Kosmetik, RPCs sind Authority — IMMER beide Seiten pruefen
- Bei neuem State (expires_at) ALLE Codepfade auditen die die Tabelle lesen
- floor_price Subqueries in 4 RPCs mussten nachtraeglich gefixt werden
- Escrow-Berechnung in place_sell_order fehlte Expiry-Filter (critical bug caught in audit)

## Geaenderte Files
- supabase/migrations/20260314120000_trading_missions_order_expiry.sql (neu, 6 Sektionen)
- src/lib/services/trading.ts (3 Mission triggers + 2 Expiry filters)
- src/lib/services/ipo.ts (1 Mission trigger)
- src/app/api/cron/gameweek-sync/route.ts (1 Cron step)
- src/lib/services/__tests__/players.test.ts (Mock fix)
- src/lib/services/__tests__/notifications-batch.test.ts (Mock fix)
- playwright.config.ts + e2e/*.spec.ts + e2e/helpers.ts (E2E robustness)
