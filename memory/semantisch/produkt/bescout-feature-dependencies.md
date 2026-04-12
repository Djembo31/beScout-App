# beScout Feature Dependencies

> WIE haengt alles zusammen? Welche Systeme brauchen einander?

## Dependency Graph (Vereinfacht)

```
                    ┌──────────────────┐
                    │   SCOUT CARDS    │
                    │  (Kern-Asset)    │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
      ┌──────────────┐ ┌──────────┐ ┌──────────────┐
      │   TRADING    │ │ FANTASY  │ │  COMMUNITY   │
      │ Buy/Sell/IPO │ │ Events   │ │ Research     │
      └──────┬───────┘ └────┬─────┘ └──────┬───────┘
             │              │              │
             ▼              ▼              ▼
      ┌──────────────────────────────────────────┐
      │           GAMIFICATION LAYER             │
      │  Rank + Missions + Achievements + Streaks │
      └──────────────────┬───────────────────────┘
                         │
                         ▼
      ┌──────────────────────────────────────────┐
      │              REVENUE ENGINE              │
      │  Trading Fees + IPO Fees + Entry Fees    │
      │  + Research Sales + Bounties + Club Abos │
      └──────────────────────────────────────────┘
```

## Kern-Abhaengigkeiten

### Scout Cards → ALLES
Scout Cards sind das Kern-Asset. Ohne sie funktioniert nichts:
- **Trading** braucht SC zum Handeln
- **Fantasy** braucht SC-Besitz fuer Lineup-Slots (min_sc_per_slot)
- **Community** bewertet SC-Performance (Research, Bounties)
- **Gamification** tracked SC-bezogene Aktivitaeten

### Trading ↔ Fantasy (Bidirektional)
- **Trading → Fantasy:** User muss SC besitzen um Lineup zu bauen
- **Fantasy → Trading:** Holding Locks blockieren Verkauf waehrend aktiver Events
- **Kritischer Pfad:** `place_sell_order` prueft `available = holdings - orders - locks`
- **Unlock-Trigger:** Event endet → DB-Trigger loescht holding_locks → SC wieder handelbar

### Trading → Wallet (Unidirektional)
- Jeder Trade aendert Wallet-Balance (Escrow-Pattern)
- Fee-Splits muessen in ALLEN 4 Trading-RPCs identisch sein
- Wallet-Balance ist BIGINT cents, nie Float

### Fantasy → Scoring → Gamification (Kette)
```
API-Football Daten → player_gameweek_scores
  → score_event RPC → Lineup-Scores + DENSE_RANK
  → Prize Distribution → Wallet-Credits
  → Manager Elo Points (percentile-based)
  → Achievement Checks (DB-Trigger)
  → Notification
```

### Community → Gamification (Unidirektional)
- Research-Verkauf → Analyst Elo Points
- Bounty-Abschluss → Analyst Elo + Achievement
- Post-Upvotes → (noch nicht Elo-relevant, geplant)

## Revenue-Mechanik im Detail

### Wie Geld fliesst

```
FAN kauft SC via IPO
  → 85% → Club Wallet
  → 10% → Platform Treasury
  → 5%  → PBT (Player Bound Treasury)

FAN handelt SC auf Sekundaermarkt
  → 3.5% → Platform Treasury (Burn = deflationaer)
  → 1.5% → PBT
  → 1%   → Club Wallet

FAN spielt Fantasy Event
  → Entry Fee → Prize Pool
  → Gewinner bekommen Anteil

FAN schreibt Research
  → Leser zahlt Unlock-Preis
  → 80% → Autor
  → 20% → Platform

CLUB erstellt Bounty
  → Club Wallet → Escrow
  → Fan liefert → 95% Fan / 5% Platform

CLUB verkauft Abo
  → 100% → Club Wallet
```

### PBT (Player Bound Treasury) — Pro Spieler
- Gespeist aus: 5% IPO + 1.5% Trading Fees
- Wachstumsfonds fuer Spieler-spezifische Rewards
- Community Success Fee kommt bei realem Transfer zum Tragen

### Deflationaerer Mechanismus
- 6% Trading Fee wird "verbrannt" (aus Umlauf genommen)
- 20% Platform-Revenue → Buyback & Burn (post-Token)
- Credits werden langfristig wertvoller (Incentive fuer fruehe Adoption)

## Feature-Status-Matrix

| Feature | DB | RPC | Service | UI | Tests | Status |
|---------|-----|-----|---------|-----|-------|--------|
| SC Trading (Buy/Sell) | ✅ | ✅ | ✅ | ✅ | Partial | LIVE |
| SC IPO | ✅ | ✅ | ✅ | ✅ | Partial | LIVE |
| P2P Offers | ✅ | ✅ | ✅ | ✅ | Partial | LIVE |
| Fantasy Events | ✅ | ✅ | ✅ | ✅ | Partial | LIVE |
| Fantasy Lineup | ✅ | ✅ | ✅ | ✅ | Partial | LIVE |
| Fantasy Scoring | ✅ | ✅ | ✅ | ✅ | ❌ | LIVE |
| Chips (Triple Captain) | ✅ | ✅ | ✅ | ✅ | ❌ | LIVE |
| Chips (Synergy/2nd Chance) | ✅ | ✅ | ❌ | ❌ | ❌ | 50% |
| Wildcards | ✅ | Partial | ❌ | ❌ | ❌ | 30% |
| Predictions | ✅ | ✅ | ✅ | ✅ | ❌ | LIVE |
| Research/Paywall | ✅ | ✅ | ✅ | ✅ | ❌ | LIVE |
| Bounties | ✅ | ✅ | ✅ | ✅ | ❌ | LIVE |
| Votes/Polls | ✅ | ✅ | ✅ | ✅ | ❌ | LIVE |
| Gamification (Elo) | ✅ | ✅ | ✅ | ✅ | ❌ | LIVE |
| Missions | ✅ | ✅ | ✅ | ✅ | ❌ | LIVE |
| Achievements (33) | ✅ | ✅ | ✅ | ✅ | ❌ | LIVE |
| Equipment/Mystery Box | ✅ | ✅ | ✅ | ✅ | ❌ | LIVE |
| Liga/Rankings | ✅ | ✅ | ✅ | ✅ | ❌ | LIVE |
| Manager Team Center | ✅ | ✅ | ✅ | ✅ | 26 Tests | LIVE |
| Following Feed | ✅ | ✅ | ✅ | Partial | ❌ | 80% |
| Transaction History | ✅ | ✅ | ✅ | Partial | ❌ | 80% |
| Sponsor Flat Fee | ❌ | ❌ | ❌ | ❌ | ❌ | DESIGNED |
| Event Boost | ❌ | ❌ | ❌ | ❌ | ❌ | DESIGNED |
| Chip Economy (kaufbar) | ❌ | ❌ | ❌ | ❌ | ❌ | DESIGNED |
| Club Package Gates | ✅ | Partial | ❌ | ❌ | ❌ | 30% |
| KYC Integration | ❌ | ❌ | ❌ | ❌ | ❌ | BACKLOG |

## Kritische Cross-Domain-Abhaengigkeiten

### Wenn du Trading aenderst → pruefe:
- Fantasy Holding Locks (werden Locks korrekt berechnet?)
- Wallet Balance (Escrow-Pattern intakt?)
- Fee-Split Parity (alle 4 RPCs identisch?)
- Gamification (Trader Elo Trigger aktiv?)
- Activity Log (Transaction geloggt?)

### Wenn du Fantasy aenderst → pruefe:
- Holding Locks (werden SC korrekt gesperrt/entsperrt?)
- Wallet (Entry Fee Deduction + Prize Distribution)
- Equipment (equipment_map in Lineup gespeichert?)
- Gamification (Manager Elo nach Scoring?)
- Notifications (Event-Status-Aenderungen?)

### Wenn du Gamification aenderst → pruefe:
- Elo-Berechnung (3 Dimensionen, Median = Overall)
- Achievement-Trigger (DB-seitig, nicht Client)
- Mission-Progress (track_my_mission_progress Wrapper)
- Score Road (Milestone-Rewards korrekt?)
- Liga Rankings (Monthly Rewards Distribution?)

### Wenn du Community aenderst → pruefe:
- Research Paywall (80/20 Split)
- Bounty Escrow (Lock → Approve → Pay)
- Vote Weight (Bronze+ = 2x)
- Activity Log (Cross-User Read Policies)
- Notifications (neue Post-Types?)

## Daten-Quellen

| Quelle | Daten | Sync |
|--------|-------|------|
| API-Football | Spieler-Stats, Spielergebnisse, Aufstellungen | Taeglich nach Spieltag |
| Transfermarkt | Marktwerte (extern, nicht API-Football!) | Manuell / geplant |
| Supabase Auth | User-Identitaet, Session | Realtime |
| Supabase Realtime | Live-Updates (Trades, Events, Notifications) | WebSocket |
