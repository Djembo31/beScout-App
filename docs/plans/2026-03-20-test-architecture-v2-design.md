# BeScout Test Architecture v2 — Design Doc

**Datum:** 2026-03-20
**Autor:** Jarvis (CTO) + Anil (Founder)
**Status:** Approved
**Trigger:** 4 Business-Logic-Bugs die der QA-Bot-Pass nicht gefangen hat

## Problem

Die bestehende Test-Suite (267 Unit Tests, 205 API QA, 5 Playwright Bots) testet:
- Service-Layer Funktionen isoliert
- API-Endpoints auf Erreichbarkeit
- UI-Navigation Happy Path

Sie testet NICHT:
- Cross-Page Business Flows (Buy → Fantasy → Lineup)
- State Machine Transitions (Event/IPO/Order Lifecycle Guards)
- Geldfluss-Korrektheit (Fee-Splits, Wallet Reconciliation, Escrow)
- Concurrency (Race Conditions bei gleichzeitigen Trades)
- Authorization (RLS Bypass-Versuche)
- Boundary Conditions (0, Max, Overflow)

## 4 Bugs die das Design motivieren

| Bug | Root Cause | Fehlende Test-Schicht |
|-----|-----------|----------------------|
| 7er Event zeigt 11 Slots | `lineup_size=11` bei 7er Events, Modal prüft lineupSize vor format | DB-Invariante |
| Gekaufter Spieler fehlt im Picker | Holdings-Cache nach Buy nicht im Fantasy-Modal refreshed | Business Flow |
| Events "running" vor Spielbeginn | Cron setzt registering→running ohne locks_at Check | State Machine |
| Keine Anmeldung möglich | Event-Timing basiert auf Erstellungszeit statt Fixture Kickoff | DB-Invariante + State Machine |

## Architektur — 7+1 Schichten

```
┌─────────────────────────────────────────────────────────┐
│  1. DB-INVARIANTEN          ~15 Tests │ <10s │ Jeder Push│
├─────────────────────────────────────────────────────────┤
│  2. STATE MACHINES          ~25 Tests │ 15s  │ Jeder Push│
├─────────────────────────────────────────────────────────┤
│  3. GELDFLUSS               ~20 Tests │ 20s  │ Jeder Push│
├─────────────────────────────────────────────────────────┤
│  4. CONCURRENCY             ~10 Tests │ 10s  │ Main Push │
├─────────────────────────────────────────────────────────┤
│  5. AUTHORIZATION           ~15 Tests │ 10s  │ Main Push │
├─────────────────────────────────────────────────────────┤
│  6. BOUNDARY/EDGE CASES     ~20 Tests │ 15s  │ Main Push │
├─────────────────────────────────────────────────────────┤
│  7. BUSINESS FLOWS          ~15 Tests │ 30s  │ Main Push │
├─────────────────────────────────────────────────────────┤
│  8. UI SMOKE TESTS           ~5 Tests │ 5min │ Pre-Deploy│
└─────────────────────────────────────────────────────────┘
```

Total: ~125 Tests. Alle API-basiert (Vitest + Supabase Client), außer Schicht 8 (Playwright).

## Schicht 1: DB-Invarianten (15 Tests)

SQL-Queries gegen Live-DB mit Assertions.

| # | Invariante |
|---|-----------|
| 1 | format ↔ lineup_size Konsistenz |
| 2 | Event starts_at = frühester Fixture Kickoff der GW |
| 3 | Event locks_at ≤ erster Fixture Kickoff |
| 4 | Kein "running" Event vor locks_at |
| 5 | Keine negativen Wallet Balances |
| 6 | locked_balance ≤ balance |
| 7 | Wallet Reconciliation: SUM(credits) - SUM(debits) = balance |
| 8 | Holdings quantity > 0 |
| 9 | IPO sold ≤ total_offered |
| 10 | Floor Price ≤ 3x IPO Price |
| 11 | Keine offenen Orders für liquidierte Spieler |
| 12 | Kein Spieler in >1 Slot im selben Event |
| 13 | Fee-Destinations: Platform + PBT + Club = Total |
| 14 | Escrow: Jede locked_balance hat zugehörige offene Order/Offer |
| 15 | Alle aktiven IPO Preise > 0 |

## Schicht 2: State Machine Tests (25 Tests)

Transition Matrix für jede State Machine.

### Event Lifecycle (8 Tests)
- registering → running: NUR wenn locks_at vorbei
- registering → cancelled: Ja (Admin)
- running → scoring: NUR wenn Fixtures done
- running → registering: VERBOTEN
- ended → running: VERBOTEN
- ended → registering: VERBOTEN
- Cron-Run vor locks_at: Status bleibt registering
- Cron-Run nach locks_at + Fixtures done: scoring → ended

### IPO Lifecycle (7 Tests)
- announced → early_access → open → ended: Happy Path
- ended → open: VERBOTEN
- open + sold=total: Auto-Close
- early_access + non-Silber User: FAIL (Server Check)
- Neue IPO < 30 Tage Cooldown: FAIL
- IPO Buy bei sold=total: FAIL (Oversell Guard)
- Max 4 Tranchen pro Spieler: 5. FAIL

### Order Lifecycle (6 Tests)
- Cancel offene Order: locked_balance zurück
- Partial Fill 3/5: 3 SC transferiert, 2 bleiben offen
- Fill gecancelte Order: FAIL
- Expire pending Order: Balance unlocked
- Fill + Cancel gleichzeitig: Einer gewinnt
- Sell Order + Liquidation: Auto-Cancel

### Player Lifecycle (4 Tests)
- Liquidation: Alle Orders gecancelt
- Buy liquidierter Spieler: FAIL
- Sell nach Liquidation: FAIL
- Offene Orders bei Liquidation: Auto-Cancel + Balance unlock

## Schicht 3: Geldfluss Tests (20 Tests)

### Trading Fees (8 Tests)
- Market Buy 1000c: Seller 940, Platform 35, PBT 15, Club 10
- IPO Buy 500c: Club 425, Platform 50, PBT 25
- 1-Cent Trade (Rounding): Kein Cent verschwindet
- 10.000 Trades: Wallet Reconciliation stimmt noch
- Community Success Fee Berechnung
- Success Fee Cap unveränderbar nach First IPO
- Multiple SC Holder: Pro-rata Verteilung
- Research Fee Split: 20% Platform, 80% Creator

### Escrow (4 Tests)
- Offer erstellt: Balance locked
- Offer akzeptiert: Escrow → Seller, SC → Buyer
- Offer abgelehnt: Escrow zurück
- Offer expired: Escrow zurück

### Wallet Guards (4 Tests)
- Buy > Balance: FAIL
- Welcome Bonus 2x: Nur 1x credited
- Negative Balance Constraint
- Locked + Available Accounting

### Liquidation Auszahlung (4 Tests)
- SC-Holder erhalten anteilig
- Community Success Fee korrekt
- PBT Anteil korrekt
- Trading-Gewinn korrekt

## Schicht 4: Concurrency Tests (10 Tests)

Via Promise.all() mit 5 Bot-Clients:

| # | Szenario | Erwartung |
|---|----------|-----------|
| 1 | 5 Bots kaufen letzten SC aus IPO | 1 Erfolg, 4 FAIL |
| 2 | 5 Bots kaufen dieselbe Sell Order | 1 Erfolg |
| 3 | Seller cancelt + Buyer kauft gleichzeitig | Einer gewinnt |
| 4 | 2x Welcome Bonus gleichzeitig | 1 Credit |
| 5 | 5 Bots joinen Event bei max_entries-1 | 1 Erfolg |
| 6 | 2 Cron-Runs gleichzeitig | Kein Double-Scoring |
| 7 | Buy + Liquidation gleichzeitig | Konsistenter State |
| 8 | 5 Bots voten auf denselben Post | Alle gezählt |
| 9 | Sell Order + Price Cap Update gleichzeitig | Gültiger Preis |
| 10 | Lineup Submit genau bei locks_at | Accept ODER Reject |

## Schicht 5: Authorization Tests (15 Tests)

| # | Test | Erwartung |
|---|------|-----------|
| 1 | User A liest Wallet von User B | FAIL (RLS) |
| 2 | User A cancelt Order von User B | FAIL (RLS) |
| 3 | Anon User ruft Trading RPC auf | FAIL |
| 4 | User erstellt Event (kein Admin) | FAIL |
| 5 | User ändert Event-Status direkt | FAIL (RLS) |
| 6 | User setzt eigenen Wallet Balance | FAIL (RLS) |
| 7 | User liest Activity Log von User B | FAIL (RLS) |
| 8 | Non-Silber kauft bei early_access IPO | FAIL |
| 9 | TIER_RESTRICTED User handelt | FAIL |
| 10 | User submitted Lineup für fremdes Event | FAIL |
| 11 | User votet auf eigenen Post | FAIL |
| 12 | User gibt sich selbst Achievements | FAIL |
| 13 | User ändert anderen User's Profil | FAIL (RLS) |
| 14 | Direct table INSERT auf orders | FAIL (RLS) |
| 15 | Service Role Key nicht in NEXT_PUBLIC | Check |

## Schicht 6: Boundary/Edge Cases (20 Tests)

| # | Test | Erwartung |
|---|------|-----------|
| 1 | Buy 0 SC | FAIL |
| 2 | Buy 301 SC (>300 max) | FAIL |
| 3 | Sell Preis = 0 | FAIL |
| 4 | Sell Preis > price_cap | FAIL |
| 5 | Buy mit Balance = Preis - 1 | FAIL |
| 6 | Buy mit Balance = exakt Preis | SUCCESS |
| 7 | Leeres Lineup submitten | FAIL |
| 8 | Selber Spieler in 2 Slots | FAIL |
| 9 | Self-Trade | Definiertes Verhalten |
| 10 | Türkischer Unicode İ/ı | Korrekte Normalisierung |
| 11 | Event bei max_entries → Join | FAIL |
| 12 | Salary Cap überschritten | FAIL |
| 13 | IPO Tranche 5 (>4 max) | FAIL |
| 14 | Lineup nach scored editieren | FAIL |
| 15 | Order quantity > holdings | FAIL |
| 16 | Player in 2 Events (2 SC owned) | SUCCESS |
| 17 | Player in 2 Events (1 SC owned) | FAIL |
| 18 | Buy Order Preis = 0 | FAIL |
| 19 | Event locks_at in Vergangenheit | FAIL/Warning |
| 20 | Handle mit Sonderzeichen | FAIL |

## Schicht 7: Business Flows (15 Tests)

End-to-End User Journeys via API:

| # | Flow |
|---|------|
| 1 | Event-Lifecycle: registering → running → scoring → ended |
| 2 | Event-Format: 7er Event → 7 Slots, 11er → 11 Slots |
| 3 | Buy DEF → Fantasy → Pick für DEF Slot → Submit |
| 4 | Registration Window: Join vor locks_at OK, danach FAIL |
| 5 | IPO Happy Path: Announce → Early Access → Open → Buy → Ended |
| 6 | Orderbuch: List → Fill → Seller Geld → Buyer SC |
| 7 | PBT Full Cycle: Trade → Fee Split → Treasury Credit |
| 8 | Community Success Fee: Transfer → Reward → SC Holder |
| 9 | Liquidation: Trigger → Cancel Orders → Payout |
| 10 | Lineup Scoring: Submit → Fixture Done → Punkte korrekt |
| 11 | Mission Completion: Action → Progress → Reward |
| 12 | Watchlist: Add → Price Change → Notification |
| 13 | Community Post → Vote → Score Update |
| 14 | Offer: Create → Accept → SC + Money Transfer |
| 15 | Cron Idempotency: 2x Run → No Double Effects |

## Schicht 8: UI Smoke Tests (5 Tests)

Playwright, gezielt für React-State-Bugs:

| # | Flow |
|---|------|
| 1 | 7er Event öffnen → genau 7 Slots im Modal |
| 2 | Spieler kaufen → Fantasy → Picker → Spieler da |
| 3 | Event "registering" → Join Button sichtbar |
| 4 | Balance nach Kauf korrekt aktualisiert |
| 5 | Lineup nach Submit korrekt angezeigt |

## File-Struktur

```
src/lib/__tests__/
  db-invariants.test.ts
  state-machines/
    event-lifecycle.test.ts
    ipo-lifecycle.test.ts
    order-lifecycle.test.ts
    player-lifecycle.test.ts
  money/
    trading-fees.test.ts
    success-fee.test.ts
    escrow.test.ts
    wallet-guards.test.ts
  concurrency/
    race-conditions.test.ts
  auth/
    rls-checks.test.ts
    role-permissions.test.ts
  boundaries/
    edge-cases.test.ts
  flows/
    buy-to-lineup.test.ts
    event-registration.test.ts
    ipo-flow.test.ts
    orderbook-flow.test.ts
    pbt-fees.test.ts
    liquidation.test.ts
    community-success-fee.test.ts
    lineup-scoring.test.ts
    cron-idempotency.test.ts
  helpers/
    concurrency-harness.ts
    time-helper.ts
    auth-helper.ts
    bot-client-pool.ts
  bug-regression.test.ts
```

## CI/CD Integration

```
Push (any branch):
  → Schicht 1: DB-Invarianten (<10s)
  → Schicht 2: State Machines (15s)
  → Schicht 3: Geldfluss (20s)

Push (main):
  → + Schicht 4: Concurrency (10s)
  → + Schicht 5: Authorization (10s)
  → + Schicht 6: Edge Cases (15s)
  → + Schicht 7: Business Flows (30s)

Pre-Deploy:
  → + Schicht 8: UI Smoke (5min)
```

## Test-Daten-Strategie

- DB-Invarianten: Testen LIVE-Daten (echte Production DB)
- Business-Flows: Nutzen Bot-Accounts (bot-001..050), cleanup nach Test
- Concurrency: Dedizierte Bot-Accounts (bot-race-01..10)
- Auth: Anon Client + verschiedene User-Rollen
- Playwright: Bestehende 5 Bot-Personas

## Implementierungsreihenfolge

| Phase | Schicht | Fängt |
|-------|---------|-------|
| 1 | DB-Invarianten + Bug Regression | Daten-Bugs sofort, 4 Bugs als rote Tests |
| 2 | State Machines | Lifecycle-Bugs |
| 3 | Geldfluss | Finanz-Bugs |
| 4 | Concurrency + Auth | Race Conditions + Security |
| 5 | Edge Cases | Grenzbedingungen |
| 6 | Business Flows + UI | UX + Cross-Page-Bugs |

## Entscheidungen

- **Tests-first:** Tests werden ROT geschrieben (die 4 Bugs). Danach separat fixen.
- **API-basiert:** Kein Browser nötig außer Schicht 8. Schnell, stabil, CI-fähig.
- **Live-DB für Invarianten:** Testet echten Zustand, nicht Mock-Daten.
- **Bot-Accounts für Flows:** Isoliert, aufräumbar, parallel-fähig.
