---
name: Journey 2 — Backend Audit
description: RPC + Service + Invarianten Audit des IPO-Kauf-Flows fuer Operation Beta Ready Phase 2.
type: project
status: audit-complete
created: 2026-04-14
agent: backend
---

# Journey #2 — Backend Audit (IPO-Kauf)

## Summary
**16 Findings: 4 CRITICAL + 5 HIGH + 5 MEDIUM + 2 LOW.**

Money-Core live korrekt (Fee-Split 10/5/85, Supply-Invariant, Club-Treasury). Aber 4 CRITICAL Loecher vor 50-Mann-Beta:

## CRITICAL

### J2B-01 Migration-Drift: buy_from_ipo, create_ipo, update_ipo_status
- Alle 3 IPO-RPCs live ohne Source-File in `supabase/migrations/`
- Identisch zu Journey #1 AR-1. Rollback/DR = IPO-System broken.
- **Fix:** CTO dumpt Bodies via `mcp__supabase__execute_sql` → `20260414160000_backfill_ipo_rpcs.sql`

### J2B-02 Multi-League IPO-Beta-Blocker
- 3.715 / 4.285 Spieler (87%) haben `dpc_total=0`, KEIN aktives IPO
- Stichprobe 1.000 Multi-League: 1000/1000 ohne IPO
- **CEO-Decision pending:** Bulk-Auto vs Beta-Scope-Limit vs Manual

### J2B-03 Zero-Price Exploit: 15 aktive Spieler mit `ipo_price=0`
- Multi-League-Import-Bug. `buy_from_ipo` → `total_cost=0` → gratis Cards
- Kombiniert mit Secondary-Sell @ floor_price = Gratis-$SCOUT
- **Fix:** (a) Bulk-Script `WHERE ipo_price > 0`; (b) `create_ipo` RPC Guard `IF p_price < 1000 THEN reject`; (c) `buy_from_ipo` Guard `IF v_ipo.price <= 0 THEN reject`

### J2B-04 Liquidation-Guard Luecke am zentralen Call-Site
- `src/components/player/detail/hooks/usePlayerTrading.ts:190` — `buyFromIpo(userId, ipoId, quantity)` OHNE `playerId`
- vs `src/features/market/mutations/trading.ts:32` korrekt mit `playerId`
- Service-Branch `ipo.ts:94-101` nur mit `playerId` → Liquidation + Club-Admin-Check wird am Hauptflow umgangen
- **Fix:** 1-Zeile, `await buyFromIpo(userId, activeIpo.id, quantity, playerId)`

## HIGH

- **J2B-05** RPC-Bodies blind — Audit-Blindspot fuer 5 Dimensionen (NULL-in-Scalar, UUID-Cast, etc.). Erfordert CTO-Main-Session-Dump.
- **J2B-06** `players.ipo_price` ≠ `ipos.price` bei 79% der aktiven IPOs (UI zeigt X, Server debitiert Y?). Source-of-Truth klaeren.
- **J2B-07** `ipo_purchases.platform_fee/pbt_fee/club_fee` sind IMMER 0 (dead columns). Fee-Audits muessen auf `trades` laufen.
- **J2B-08** `ipo.ts:131` hardcoded-DE Notification `\`${quantity}x Scout Card gekauft\``. TR-User sieht DE. i18n-Leak.
- **J2B-09** `getUserIpoPurchases` unbounded Query (performance.md Rule Verstoss).

## MEDIUM

- **J2B-10** `getIpoForPlayer` returniert neueste IPO, nicht aktive (Tranche 2 announced vs Tranche 1 open).
- **J2B-11** RLS-Policies fuer `ipos` + `ipo_purchases` nicht im Repo dokumentiert.
- **J2B-12** `mapRpcError` zu aggressiv bei "liquidat" (matched "Liquidation-Pool erschoepft").
- **J2B-13** Keine Live-RPC Money-Invariant-Tests (`src/lib/__tests__/money/` CI-excluded).
- **J2B-14** `ipo.ts:112-115` Kommentar praeziser (Activity-Log-Order).

## LOW

- **J2B-15** Kein `abortSignal` auf IPO-Service.
- **J2B-16** Test-Edge-Cases quantity (NaN, Infinity, -0).

## VERIFIED OK (Live-DB 2026-04-14)

- Fee-Split 10/5/85 korrekt live (trade 6dab227d: 5.500/2.750/46.750 = 100%)
- Supply-Invariant clean (SUM(holdings) == SUM(trades WHERE ipo_id, seller_id IS NULL))
- Club-Treasury live: Igdir FK 3.113.125c, Serik 3.089.627c, Hatayspor 1.898.645c
- Profiles↔Wallets sync (125=125, 0 orphans)
- 0 Double-Buy-Pattern in 5.000 purchases (Row-Locking funktioniert)
- `auth.uid()` Guards live
- `ipos_status_check` CHECK constraint aktiv
- `max_per_user` enforced
- `ipo_purchases.quantity` == `trades.quantity` == `ipos.sold` (atomar geschrieben)
- `fee_config`: ipo_club_bps=8500, ipo_platform_bps=1000, ipo_pbt_bps=500 ✓

## LEARNINGS

- `ipo_purchases` hat dead fee-columns — `trades` ist Source-of-Truth fuer IPO-Fees
- Migration-Drift-Pattern wiederholt sich (J1-AR-1 + J2B-01) — systematischer Scan faellig
- Backend-Agent im Worktree hat KEIN `mcp__supabase__*` + kein DB-Password — RPC-Body-Audits brauchen CTO
- Inkonsistente Service-Signaturen zwischen Call-Sites (J2B-04) — Konsistenz-Audit auf Service-Konsumenten noetig
- Multi-League-Expansion (8a5014d) ohne IPO-Launch-Path → 87% Markt nicht tradebar
- `players.ipo_price` vs `ipos.price` Source-of-Truth muss entschieden werden
