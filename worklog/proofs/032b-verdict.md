# Slice 032b — Phase 7 Mutating-Flows Verdict

**Date:** 2026-04-17
**Tester:** Claude (CTO)
**Account:** jarvis-qa@bescout.net (id 535bbcaf...)
**Deploy:** Slice 033/034/038 live (commits f9704dfa→02d40adb)

## Phase 7 Final Status (alle 15 Flows)

| # | Flow | Slice | Status | Notes |
|---|------|-------|--------|-------|
| 1 | Login | 030 | GREEN | jarvis-qa OAuth + cookie session |
| 2 | Home Dashboard | 030 | GREEN | Wallet, Hero, Missions render |
| 3 | Wallet Load | 032 | GREEN | Header CR + Tickets, kein Skeleton-Stuck |
| 4 | Market List + Portfolio Tab | 030 | GREEN | floorMap correct, Portfolio P&L |
| **5** | **Buy from Market** | **034** | **GREEN** | Wallet 799350→798290 → 749859 (2 Buys), Holdings +2 |
| **6** | **Sell-Order place + cancel** | **032b** | **GREEN** | place_sell_order p_price=1000 cents, status open → cancelled |
| **7** | **Buy-Order/Cancel (P2P Offer)** | **032b** | **GREEN** | create_offer 5 CR escrow, cancel symmetric refund (balance+locked unchanged total) |
| 8 | Player Detail | 030 | GREEN | Header, Holdings, Orderbook, History |
| 9 | Event Browse | 032 | GREEN | Filter Süper Lig greift, 13 events render |
| **10** | **Event Join + Leave** | **032b** | **GREEN** | lock_event_entry → entry created, unlock_event_entry → row deleted |
| 11 | Lineup RPC validation | 030 | GREEN | invalid_formation, gk_required, slot_count alle live |
| 12 | Event Result/Reward UI | 032 | YELLOW | Modal zeigt User PUNKTE=0 trotz Top-3 470 — UI-Inconsistency, nicht money |
| 13 | Notifications Dropdown | 032 | GREEN+findings | markAsRead works; Compliance-Findings: "Trader: Aufstieg" + "BSD Tipp" Wording |
| 14 | Transactions History | 030 | GREEN | i18n labels, Filter, CSV |
| 15 | Logout | 030 | GREEN | sb-Cookie + localStorage wiped → redirect /login |

## Score

- **GREEN: 13/15** (incl. alle 4 Money/Mutating-Flows)
- **GREEN+findings: 1/15** (Flow 13: Compliance-Wording)
- **YELLOW: 1/15** (Flow 12: UI-Inconsistency PUNKTE-Display, nicht money)

## Money-Path End-to-End

Alle 4 Mutating-Money-Flows verifiziert:

```
Buy:    799.350 → 798.290 → 749.859  (-1060, -48431 cents)
Sell:   place sell-order @ 1000c → cancel → DB clean
Offer:  balance -500, locked +500 → cancel → balance +500, locked -500 (symmetric)
Event:  lock entry @ 0c → unlock → row deleted (free event)
```

Wallet-Total konstant durch alle Operationen. Display matched DB. Kein User-Vertrauensbruch.

## Findings (separate Slices)

### Behoben in dieser Wave (033/034/038)
- 033: BuyConfirmModal Faktor-100-Display-Drift
- 034: buy_player_sc transactions.type 'buy' → 'trade_buy'
- 038: credit_tickets reference_id UUID-Sanitization

### Pending Pipeline
- 035: trg trade_refresh auth_uid_mismatch (P1, downgraded — Buys gehen durch)
- 036: sync_event_statuses permission denied (P1, wiederholt in Logs)
- 037: 7 weitere transactions.type Drifts (INV-30 Allowlist)
- 039: user_achievements 409 UNIQUE bei wiederholtem Buy (P2)
- 040: ClubProvider.test.tsx flaky waitFor (P3)

### Neue Findings aus 032b
- 032b-finding-1: `rpc_lock_event_entry` direkter Call → 403 permission denied. Wrapper `lock_event_entry` (ohne `rpc_` prefix) hat GRANT authenticated. Dokumentations-Fix oder direct-grant ergaenzen — P2.
- 032b-finding-2: `rpc_lock_event_entry` Return `balance_after: 0` bei free events — sollte vermutlich `tickets.balance` reflectieren (266). UI-Bug, low.
- 032b-finding-3 (KEIN BUG, dokumentiert): `create_offer` macht `balance -= total + locked += total` — semantisch korrekt da `balance` = "available", `locked` = "reserved". Total wallet konstant. Cancel symmetrisch.

## Verdict

**Pilot-Ready Money-Path:** GREEN. Alle kritischen Flows live funktional auf bescout.net. Flows 12+13 haben kosmetische / UI-Findings die separate Slices verdienen, aber **keine** money-affecting Bugs uebrig in Slice 032 Scope.

Phase 7 Vollverifikation **abgeschlossen.**
