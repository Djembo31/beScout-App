# BeScout - Architektur & Technische Entscheidungen

## System-Überblick

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│  Next.js 14 (App Router) + Tailwind + TypeScript │
│                                                   │
│  Pages:  Home | Fantasy | Market | Club |         │
│          Player | Community | Profile             │
│                                                   │
│  State:  React useState (lokal)                   │
│          → Später: Zustand oder React Query        │
├─────────────────────────────────────────────────┤
│                   BACKEND (geplant)              │
│  Supabase (PostgreSQL + Auth + Realtime + Storage)│
│                                                   │
│  Alt: Next.js API Routes + eigene DB              │
├─────────────────────────────────────────────────┤
│                   EXTERNE SERVICES (geplant)     │
│  Spieler-Daten API | Payment | Push Notifications │
└─────────────────────────────────────────────────┘
```

## Frontend-Architektur

### Routing (App Router)
```
/                    → Home Dashboard
/fantasy             → Fantasy Lobby + Events
/market              → DPC Marktplatz
/club                → Club Dashboard
/player/[id]         → Spieler Detail
/community           → Social Feed
/profile             → User Profile
```

### Component-Hierarchie
```
Layout (SideNav + TopBar)
├── Pages (app/*/page.tsx)
│   └── Sections (inline, werden zu Components)
├── Shared UI (components/ui/)
│   ├── Card, Button, Chip, Modal, StatCard
│   └── Tabs, Input, Select (noch nicht extrahiert)
├── Player Components (components/player/)
│   ├── PlayerDisplay (compact/standard/detailed)
│   ├── PlayerHoldingRow
│   ├── TrikotBadge
│   ├── PositionBadge, StatusBadge
│   ├── ScoreCircle, MiniSparkline
│   └── IPOBadge, PlayerCard (legacy)
└── Layout (components/layout/)
    ├── SideNav
    └── TopBar
```

### Datenfluss (aktuell)
```
Mock-Daten (lib/mock-data.ts)
  → Page Component (useState)
    → Filter/Sort (useMemo)
      → Render (PlayerDisplay, etc.)
```

### Datenfluss (geplant)
```
Supabase DB
  → API Layer (Server Components oder API Routes)
    → React Query (Cache + Revalidation)
      → Page Component
        → Render
```

## Kernkonzepte

### DPC (Digital Player Cards)
- Jeder Spieler hat einen festen DPC Float (z.B. 10.000 Stück)
- Clubs halten einen Teil, Rest wird an User verkauft (IPO)
- DPCs werden auf dem Marktplatz gehandelt (Orderbook-Style)
- DPCs werden in Fantasy Events eingesetzt (locked während Event)
- Bei Vertragsende: DPC Burn → PBT Reward an Holder

### BSD (BeScout Dollar)
- Interne Währung, 1:1 mit EUR in der Pilot-Phase
- Wird für DPC-Kauf, Event-Eintritt, etc. verwendet
- Pilot: kein echtes Geld, nur virtuelle Währung

### PBT (Player Bound Treasury)
- Jeder Spieler hat einen Treasury
- Gespeist aus: 10% jeder DPC-Transaktion + Sponsoring
- Wird an DPC-Holder proportional ausgeschüttet
- Bei Vertragsende/Transfer: Sonder-Ausschüttung

### Fantasy Events
- PokerStars-Style Lobby mit verschiedenen Event-Typen
- 6er Formation: 1 GK, 2 DEF, 2 MID, 1 ATT
- Events haben Gameweeks (Sorare-Style)
- Scoring basiert auf echten Spieler-Performances
- Reward: BSD + Badges + Titles (Pilot: nur Badges/Titles)

## Entscheidungs-Log

| Datum | Entscheidung | Begründung |
|-------|-------------|------------|
| 2025-01 | Next.js statt React SPA | SEO, Server Components, API Routes |
| 2025-01 | Tailwind statt CSS Modules | Schnellere Entwicklung, konsistentes Design |
| 2025-01 | Kein Blockchain/NFT | Niedrigere Einstiegshürde, keine Gas Fees |
| 2025-01 | TFF 1. Lig als Startmarkt | Nische, wenig Konkurrenz, Türkei-Affinität |
| 2025-02 | Supabase als Backend (Tendenz) | Auth + DB + Realtime + Storage in einem |
| 2025-02 | Einheitlicher PlayerDisplay | Konsistenz über alle Seiten, weniger Code |

## Offene Architektur-Fragen

> Siehe `docs/SCALE.md` für detaillierte Skalierungsarchitektur und DB-Schema.

1. **State Management:** Zustand vs. React Query vs. Context API?
   - Zustand für UI-State (Modals, Filter)
   - React Query für Server-State (Spieler, Events)
   - Empfehlung: Beides kombinieren

2. **Scoring Engine:** Wo läuft die Fantasy-Berechnung?
   - Option A: Supabase Edge Functions (serverless)
   - Option B: Cron Job auf Vercel
   - Option C: Dedizierter Worker Service

3. **Spieler-Daten:** Woher kommen die echten Stats?
   - Option A: API Provider (Opta, StatsBomb, etc.)
   - Option B: Eigenes Scraping
   - Option C: Manuelle Eingabe (Pilot)

4. **Skalierung:** Wie viele gleichzeitige Events?
   - Pilot: 10-20 Events parallel
   - Später: 100+ Events mit Realtime-Updates

## Service Interfaces (Scale-Ready)

> Diese Interfaces JETZT definieren. Pilot-Implementation kann einfach sein,
> aber die Contracts bleiben stabil wenn wir später skalieren.

```typescript
// Trading
interface TradingService {
  placeOrder(order: NewOrder): Promise<Order>;
  cancelOrder(orderId: string): Promise<void>;
  getOrderbook(playerId: string): Promise<Orderbook>;
}

// Scoring
interface ScoringService {
  scoreLineup(lineup: Lineup, scores: Map<string, number>): Promise<number>;
  scoreEvent(eventId: string): Promise<EventResult>;
}

// Preise
interface PriceService {
  getFloorPrice(playerId: string): Promise<number>;
  getPriceHistory(playerId: string, days: number): Promise<PricePoint[]>;
}

// Wallet
interface WalletService {
  getBalance(userId: string): Promise<WalletBalance>;
  credit(userId: string, amount: number, reason: string): Promise<Transaction>;
  debit(userId: string, amount: number, reason: string): Promise<Transaction>;
}

// Realtime (abstrahiert – dahinter kann Supabase, Ably, oder WebSocket stecken)
interface RealtimeService {
  subscribe(channel: string, callback: (data: any) => void): Unsubscribe;
  publish(channel: string, data: any): Promise<void>;
}
```
