# BeScout - Skalierungsarchitektur

> Ehrliche Analyse: Was funktioniert bis wann, und was muss wann geändert werden.

---

## Realitäts-Check: Wo stehen wir?

```
AKTUELL          →  PILOT (v1)      →  WACHSTUM (v2)    →  SCALE (v3)
Mock-Daten          100-1K User         10K-100K User        1M+ User
useState            Supabase            Supabase + Cache     Custom Backend
Kein Backend        1 DB                DB + Redis           Microservices
Kein Auth           Supabase Auth       Supabase Auth        Custom Auth
Kein Trading        Einfaches Matching  Queue-basiert        Trading Engine
───────────────────────────────────────────────────────────────────────
WIR SIND HIER ◄
```

**Die Wahrheit:** Supabase trägt euch bis ~50.000 User. Danach braucht ihr eine andere Architektur. Aber: 99% aller Startups scheitern nicht an der Technik, sondern daran dass sie nie 50K User erreichen. Also: **Richtig bauen für 50K, vorbereitet sein für 1M+.**

---

## Die 5 kritischen Systeme und ihre Skalierungsgrenzen

### 1. 🏦 Trading Engine (DPC Marktplatz)

**Das Problem:** Ihr baut im Kern eine Börse. Order Matching, Atomic Transactions, Echtzeit-Preise. Das ist das technisch komplexeste System.

```
PILOT (1K User)
├── Supabase PostgreSQL
├── Einfaches Matching: Buyer ↔ Seller direkt
├── DB Transactions für Atomicity
├── Preis-Updates per Polling (3s Interval)
└── ✅ Funktioniert problemlos

WACHSTUM (100K User)
├── Supabase PostgreSQL + Connection Pooling (PgBouncer)
├── Redis für Orderbook-Cache (Top 50 Bids/Asks)
├── Queue (BullMQ) für Order Matching
├── WebSocket für Echtzeit-Preise
├── DB Read Replicas für Preis-Queries
└── ⚠️ Supabase Limits beachten (Realtime: 500 concurrent/Projekt)

SCALE (1M+ User)
├── Dedizierte PostgreSQL Cluster (nicht Supabase)
├── Redis Cluster für Orderbook + Session Cache
├── Eigene Matching Engine (Rust/Go)
├── Event-Driven Architecture (Kafka/NATS)
├── Separate Read/Write DBs (CQRS Pattern)
└── 🔴 Komplett andere Architektur nötig
```

**Was ihr JETZT richtig machen müsst:**
- Orderbook-Logik als eigenständigen Service denken (nicht in die Next.js API bauen)
- Alle Trades über eine zentrale `executeTransaction()` Funktion laufen lassen
- Transaktions-Log von Anfang an (jede BSD-Bewegung wird geloggt)
- Preis-Berechnung als eigene Funktion (Floor, VWAP, 24h Change)

### 2. 🎮 Fantasy Scoring Engine

**Das Problem:** Wenn ein Spieltag endet, müssen potenziell 100.000+ Lineups gleichzeitig gescored werden. Das ist ein Batch-Job, kein Request-Response.

```
PILOT (1K User)
├── Supabase Edge Function
├── Spieltag-Ende → Function scored alle Lineups sequentiell
├── ~1.000 Lineups × 6 Spieler = 6.000 Score-Berechnungen
├── Dauer: ~10 Sekunden
└── ✅ Kein Problem

WACHSTUM (100K User)
├── Dedizierter Worker Service (Railway/Fly.io)
├── Queue-basiert: Events werden in Batches verarbeitet
├── ~100.000 Lineups = 600.000 Score-Berechnungen
├── Parallelisiert: 10 Worker × 10.000 Lineups
├── Dauer: ~30 Sekunden
└── ⚠️ Worker müssen sauber skalieren

SCALE (1M+ User)
├── Kubernetes Worker Pool (auto-scaling)
├── 1.000.000 Lineups → partitioned by Event
├── Pre-computed Player Scores (materialized views)
├── Eventual Consistency (Scores kommen in Wellen)
├── Leaderboard via Redis Sorted Sets
└── 🔴 Eigene Infrastruktur nötig
```

**Was ihr JETZT richtig machen müsst:**
- Scoring als reine Funktion: `calculateScore(lineup, playerPerformances) → number`
- Kein Side-Effect in der Scoring-Logik (keine DB-Writes drin)
- Player-Performance Daten getrennt von Lineup-Daten speichern
- Event-Ergebnis als eigene Tabelle, nicht inline in der Events-Tabelle

### 3. 📡 Echtzeit-Updates (WebSocket/Realtime)

**Das Problem:** Preis-Ticker, Live-Event-Scores, Trading-Updates – alles muss in Echtzeit kommen. WebSocket-Connections bei Scale sind teuer.

```
PILOT (1K User)
├── Supabase Realtime (inkl. im Plan)
├── ~500 gleichzeitige WebSocket-Connections
├── Broadcasts für Preis-Updates
├── Presence für "X User schauen diesen Spieler an"
└── ✅ Supabase Pro Plan reicht

WACHSTUM (100K User)
├── Supabase Realtime reicht NICHT (Limit: 500-10K concurrent)
├── Eigener WebSocket Server (Socket.io / ws)
├── Redis Pub/Sub für Cross-Server Broadcasting
├── Channel-basiert: /prices, /events/{id}, /player/{id}
├── Nur Subscriptions die der User braucht
└── ⚠️ Dedizierter WebSocket Service nötig

SCALE (1M+ User)
├── Ably / Pusher / eigener Cluster
├── 100K+ gleichzeitige Connections
├── Edge-basierte Distribution
├── Smart Reconnection + Fallback zu Polling
└── 🔴 Managed Service oder eigener Cluster
```

**Was ihr JETZT richtig machen müsst:**
- Realtime-Updates als abstrakten Layer bauen (`useRealtimePrice(playerId)`)
- Dahinter kann Polling, Supabase Realtime, oder WebSocket stecken
- Client muss graceful degraden: WebSocket → SSE → Polling
- Nicht alles in Echtzeit: Preise ja, Portfolio-Wert kann 30s cached sein

### 4. 💾 Datenbank-Design

**Das Problem:** Schlechtes DB-Design kann man später kaum fixen. Millionen Rows mit falschen Indizes = App wird unbenutzbar langsam.

```sql
-- KERN-SCHEMA (von Anfang an richtig designen)

-- Spieler: ~500 Rows (TFF 1. Lig), wächst auf ~10.000 (Multi-Liga)
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  position TEXT NOT NULL CHECK (position IN ('GK','DEF','MID','ATT')),
  club_id UUID REFERENCES clubs(id),
  age INT,
  nationality TEXT,
  contract_end DATE,
  market_value BIGINT DEFAULT 0,
  -- Denormalisierte Stats für schnelle Queries (werden per Cron aktualisiert)
  stats_matches INT DEFAULT 0,
  stats_goals INT DEFAULT 0,
  stats_assists INT DEFAULT 0,
  perf_l5 NUMERIC(5,2) DEFAULT 0,
  perf_l15 NUMERIC(5,2) DEFAULT 0,
  perf_season NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DPC Supply pro Spieler: 1 Row pro Spieler
CREATE TABLE dpc_supply (
  player_id UUID PRIMARY KEY REFERENCES players(id),
  total_float INT NOT NULL DEFAULT 10000,        -- Gesamt DPCs
  club_held INT NOT NULL DEFAULT 5000,            -- Vom Club gehalten
  circulation INT NOT NULL DEFAULT 0,             -- Im Umlauf bei Usern
  on_market INT NOT NULL DEFAULT 0,               -- Aktuell zum Verkauf
  floor_price BIGINT DEFAULT 0,                   -- Günstigstes Angebot
  last_price BIGINT DEFAULT 0,                    -- Letzter Trade-Preis
  price_change_24h NUMERIC(8,4) DEFAULT 0,        -- 24h Änderung %
  volume_24h BIGINT DEFAULT 0,                    -- 24h Handelsvolumen
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_dpc_supply_floor ON dpc_supply(floor_price) WHERE on_market > 0;

-- User Holdings: Wächst schnell! 1M User × Ø10 Spieler = 10M Rows
CREATE TABLE holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  player_id UUID NOT NULL REFERENCES players(id),
  quantity INT NOT NULL DEFAULT 0,
  avg_buy_price BIGINT DEFAULT 0,
  locked_qty INT DEFAULT 0,                       -- In Fantasy Events gesperrt
  locked_event_id UUID,                           -- Welches Event
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, player_id)                      -- Ein Eintrag pro User+Player
);
CREATE INDEX idx_holdings_user ON holdings(user_id) WHERE quantity > 0;
CREATE INDEX idx_holdings_player ON holdings(player_id);

-- Orderbook: Aktive Orders. Wächst und schrumpft. ~100K aktive Orders bei Scale.
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  player_id UUID NOT NULL REFERENCES players(id),
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  price BIGINT NOT NULL,                          -- Preis in BSD-Cents
  quantity INT NOT NULL,
  filled_qty INT DEFAULT 0,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','partial','filled','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);
CREATE INDEX idx_orders_matching ON orders(player_id, side, price, created_at) 
  WHERE status IN ('open', 'partial');

-- Trades: Append-only Log. Wächst unbegrenzt. Partitioning nach Monat!
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  buy_order_id UUID REFERENCES orders(id),
  sell_order_id UUID REFERENCES orders(id),
  price BIGINT NOT NULL,
  quantity INT NOT NULL,
  pbt_fee BIGINT DEFAULT 0,                      -- 10% → PBT Treasury
  platform_fee BIGINT DEFAULT 0,                  -- Platform Cut
  executed_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (executed_at);

-- Pro Monat eine Partition erstellen:
-- CREATE TABLE trades_2026_01 PARTITION OF trades FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- BSD Wallet: 1 Row pro User
CREATE TABLE wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  balance BIGINT NOT NULL DEFAULT 0,              -- In Cents (1 BSD = 100)
  locked_balance BIGINT DEFAULT 0,                -- In offenen Orders/Events
  total_deposited BIGINT DEFAULT 0,
  total_withdrawn BIGINT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT positive_balance CHECK (balance >= 0)
);

-- BSD Transaktionslog: Append-only. JEDE Bewegung wird geloggt.
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,                             -- 'trade_buy','trade_sell','event_entry','event_reward','deposit','withdrawal','pbt_payout'
  amount BIGINT NOT NULL,                         -- Positiv = Eingang, Negativ = Ausgang
  balance_after BIGINT NOT NULL,                  -- Saldo danach (für Audit)
  reference_id UUID,                              -- Trade ID, Event ID, etc.
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- PBT Treasury: 1 Row pro Spieler
CREATE TABLE pbt_treasury (
  player_id UUID PRIMARY KEY REFERENCES players(id),
  balance BIGINT NOT NULL DEFAULT 0,
  total_inflow BIGINT DEFAULT 0,
  total_distributed BIGINT DEFAULT 0,
  last_distribution_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fantasy Events
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,                             -- 'bescout','club','sponsor','creator','special'
  status TEXT DEFAULT 'upcoming',                 -- 'upcoming','registering','late-reg','running','scoring','ended'
  format TEXT DEFAULT '6er',
  gameweek INT,
  entry_fee BIGINT DEFAULT 0,
  prize_pool BIGINT DEFAULT 0,
  max_entries INT,
  current_entries INT DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL,
  locks_at TIMESTAMPTZ NOT NULL,                  -- Lineup Lock Deadline
  ends_at TIMESTAMPTZ,
  scored_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_events_status ON events(status, starts_at);

-- Lineups: 1M User × Ø3 Events/Woche = 3M Lineups/Woche
CREATE TABLE lineups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  -- 6er Format: genau 6 Slots
  slot_gk UUID REFERENCES players(id),
  slot_def1 UUID REFERENCES players(id),
  slot_def2 UUID REFERENCES players(id),
  slot_mid1 UUID REFERENCES players(id),
  slot_mid2 UUID REFERENCES players(id),
  slot_att UUID REFERENCES players(id),
  total_score NUMERIC(8,2),
  rank INT,
  reward_amount BIGINT DEFAULT 0,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  locked BOOLEAN DEFAULT FALSE,
  UNIQUE(event_id, user_id)                       -- 1 Lineup pro User pro Event
) PARTITION BY RANGE (submitted_at);
CREATE INDEX idx_lineups_event_rank ON lineups(event_id, rank) WHERE rank IS NOT NULL;
```

**Kritische Design-Entscheidungen:**

| Entscheidung | Warum |
|---|---|
| `BIGINT` für alle Geldbeträge (Cents) | Keine Floating-Point Fehler bei Geld |
| `PARTITION BY RANGE` für Trades/Transactions/Lineups | Alte Daten archivieren ohne Performance-Verlust |
| Denormalisierte Stats in `players` | Vermeidet JOIN für die häufigste Query |
| `balance_after` in Transactions | Audit-Trail, Saldo jederzeit nachvollziehbar |
| `UNIQUE(user_id, player_id)` in Holdings | Kein Duplicate-Problem bei Concurrency |
| Separate `dpc_supply` Tabelle | Hot Table (häufig aktualisiert), klein halten |
| `CHECK` Constraints | DB-Level Validierung, nicht nur App-Level |

### 5. 🔐 Sicherheit & Finanzsystem

**Das Problem:** Ihr verwaltet virtuelles Geld. Jeder Bug = User verliert BSD. Jede Race Condition = Geld wird dupliziert.

**MUSS von Tag 1:**

```
1. ACID Transactions für ALLE Geldflüsse
   - Kein "erst Geld abziehen, dann DPC zuweisen" als 2 separate Queries
   - ALLES in einer DB Transaction mit SERIALIZABLE Isolation

2. Optimistic Locking für Orders
   - Version-Counter auf Orders
   - Concurrent Modifications werden abgefangen
   
3. Idempotency Keys
   - Jede Aktion hat eine eindeutige ID
   - Doppelte Requests führen nicht zu doppelten Trades

4. Rate Limiting
   - Max 10 Orders/Minute pro User
   - Max 100 API Calls/Minute pro User
   - DDoS-Schutz via Cloudflare

5. Audit Log
   - JEDE BSD-Bewegung wird in `transactions` geloggt
   - `balance_after` für lückenlosen Nachweis
   - Logs sind append-only (kein DELETE erlaubt)

6. Row Level Security (Supabase)
   - User sieht nur eigene Holdings, Orders, Transactions
   - Keine API Route die "alle User Balances" zurückgibt
```

---

## Skalierungs-Fahrplan

### Phase: Pilot (100-1K User) ← NÄCHSTES ZIEL

```
Frontend:  Next.js auf Vercel (Edge Network, global)
Backend:   Supabase Pro ($25/Monat)
           ├── PostgreSQL (8GB RAM, 100GB Storage)
           ├── Auth (Social + Email)
           ├── Realtime (500 concurrent)
           └── Edge Functions (Scoring)
Cache:     Vercel KV (Redis) für Preis-Cache
Monitoring: Vercel Analytics + Supabase Dashboard
Kosten:    ~$50/Monat
```

### Phase: Wachstum (10K-100K User)

```
Frontend:  Next.js auf Vercel (gleich)
Backend:   Supabase Enterprise ODER Migration
           ├── PostgreSQL mit Read Replicas
           ├── PgBouncer für Connection Pooling
           └── Eigene Edge Functions → Railway Workers
Cache:     Upstash Redis ($20-200/Monat)
           ├── Orderbook Cache (Top Bids/Asks)
           ├── Player Price Cache (TTL: 10s)
           ├── Session Cache
           └── Rate Limiting
Queue:     BullMQ auf Railway ($20/Monat)
           ├── Order Matching Queue
           ├── Scoring Queue
           └── Notification Queue
Realtime:  Ably oder Pusher ($50-500/Monat)
Monitoring: Sentry (Errors) + Grafana (Metrics)
Kosten:    ~$300-1.000/Monat
```

### Phase: Scale (1M+ User)

```
Frontend:  Next.js auf Vercel (gleich, Edge-cached)
Backend:   Eigene Services auf Kubernetes (AWS/GCP)
           ├── API Gateway (Kong/Express)
           ├── Trading Service (Rust/Go) ← Performance-kritisch
           ├── Scoring Service (Node.js Workers)
           ├── Notification Service
           └── Admin Service
Database:  
           ├── PostgreSQL Cluster (RDS/CloudSQL) - Primary
           ├── Read Replicas (2-4 Stück)
           ├── Redis Cluster (ElastiCache)
           └── ClickHouse für Analytics
Queue:     Kafka oder NATS
Realtime:  Eigener WebSocket Cluster oder Ably Enterprise
CDN:       Cloudflare (DDoS + Edge Cache)
Monitoring: Datadog oder Grafana Cloud
Kosten:    ~$3.000-10.000/Monat
```

---

## Was ihr JETZT tun müsst (damit Scale später möglich ist)

### ✅ Tun (kostet nichts extra, spart euch Monate später)

1. **Geld als BIGINT in Cents speichern** – Nicht als Float, nicht als Dezimal
2. **Alle DB-Operationen als Transactions** – Atomic oder gar nicht
3. **API Layer zwischen Frontend und DB** – Frontend ruft nie direkt die DB auf
4. **Abstrakte Data Access Layer** – `getPlayerById(id)` statt direkte Supabase Calls in Components
5. **Trades/Transactions partitionieren** – Von Tag 1, nicht nachträglich
6. **Idempotency Keys** – Jeder Mutating Request hat eine Client-generated UUID
7. **Event-basierte Architektur denken** – "Trade executed" als Event, nicht als Seiteneffekt

### ❌ NICHT tun (Overengineering für jetzt)

1. ~~Microservices~~ → Monolith ist schneller gebaut und debugged
2. ~~Kubernetes~~ → Vercel + Supabase reicht bis 100K
3. ~~Kafka~~ → BullMQ reicht als Queue bis 100K
4. ~~Eigene Matching Engine~~ → Einfaches DB-basiertes Matching reicht bis 50K
5. ~~Multi-Region~~ → Ein Region (eu-central-1) reicht für Türkei + DACH
6. ~~GraphQL~~ → REST/tRPC ist einfacher für euer Team

### 🔶 Vorbereiten (Interface definieren, Implementation später)

```typescript
// Diese Interfaces JETZT definieren, Implementation kommt später

interface TradingService {
  placeOrder(order: NewOrder): Promise<Order>;
  cancelOrder(orderId: string): Promise<void>;
  getOrderbook(playerId: string): Promise<Orderbook>;
  executeMatch(buyOrder: Order, sellOrder: Order): Promise<Trade>;
}

interface ScoringService {
  calculatePlayerScore(playerId: string, gameweekId: string): Promise<number>;
  scoreLineup(lineup: Lineup, scores: Map<string, number>): Promise<number>;
  scoreEvent(eventId: string): Promise<EventResult>;
}

interface PriceService {
  getFloorPrice(playerId: string): Promise<number>;
  get24hChange(playerId: string): Promise<number>;
  getPriceHistory(playerId: string, days: number): Promise<PricePoint[]>;
}

interface WalletService {
  getBalance(userId: string): Promise<WalletBalance>;
  credit(userId: string, amount: number, reason: string): Promise<Transaction>;
  debit(userId: string, amount: number, reason: string): Promise<Transaction>;
  transfer(fromId: string, toId: string, amount: number): Promise<Transaction>;
}
```

---

## Konkrete Zahlen: Was hält wie viel aus?

| Komponente | 1K User | 100K User | 1M User |
|---|---|---|---|
| Supabase Free | ✅ | ❌ | ❌ |
| Supabase Pro ($25) | ✅ | ⚠️ Grenzwertig | ❌ |
| Supabase Enterprise | ✅ | ✅ | ⚠️ |
| Vercel Hobby | ✅ | ❌ | ❌ |
| Vercel Pro ($20) | ✅ | ✅ | ⚠️ |
| Supabase Realtime (500 conn.) | ✅ | ❌ | ❌ |
| Ably Free (200 conn.) | ⚠️ | ❌ | ❌ |
| Ably Pro | ✅ | ✅ | ✅ |
| PostgreSQL ohne Replicas | ✅ | ⚠️ | ❌ |
| PostgreSQL mit 2 Replicas | ✅ | ✅ | ⚠️ |
| Redis (single node) | ✅ | ✅ | ⚠️ |

---

## TL;DR

**Jetzt:** Supabase + Vercel bauen, aber die Interfaces sauber halten.
**Bei 10K Usern:** Redis dazuschalten, Scoring als eigenen Worker auslagern.
**Bei 100K Usern:** Von Supabase Realtime auf Ably/Pusher wechseln, Read Replicas.
**Bei 1M Usern:** Trading Engine in Rust/Go, eigene Infra, Kubernetes.

Die Frontend-Architektur (Next.js + React) skaliert problemlos. Die Skalierungsprobleme kommen ALLE vom Backend. Deswegen ist es so wichtig, dass die **Interfaces** jetzt sauber sind – die Implementation kann man später tauschen.
