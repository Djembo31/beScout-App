# Bestand-Tab Design — Market "Mein Kader" Redesign

**Datum:** 2026-04-10
**Status:** Approved
**Scope:** Neuer Default-Sub-Tab "Bestand" im Market "Mein Kader"

## Problem

"Mein Kader" zeigt aktuell nur Angebote (P2P Offers) und Watchlist. Ein Trader sieht seine Holdings nicht im Markt-Kontext — keine Leistungsdaten, keine Gebote, keine Sell-Orders, keine P&L.

## Design

### Tab-Struktur

```
Mein Kader: [Bestand*] [Angebote] [Watchlist]
```

"Bestand" wird Default-Sub-Tab (vor Angebote + Watchlist).

### Portfolio-Header

```
┌──────────────────────────────────┐
│  Portfoliowert     12 Scout Cards│
│  4.250 CR          +340 CR (8,7%)│
└──────────────────────────────────┘
```

- Gesamtwert: SUM(quantity × floor_price) aller Holdings
- Anzahl: Summe aller SC quantities
- P&L: Gesamtwert vs SUM(quantity × avg_buy_price), als absolute + prozentuale Differenz

### Spieler-Zeile (konsistent mit KaderPlayerRow/FantasyPlayerRow)

```
┌──────────────────────────────────────────┐
│ [Foto48]  BAYRAM  DEF  →  ▮▮▮▯▮  (72)  │
│           Sakaryaspor                    │
│           14 Sp · 3 T · 5 A             │
│                                          │
│  3× (1🔒)   Ø 66 → 72 CR   +9,1% ▲     │
│                                          │
│  ┌──────────┐ ┌───────────────┐          │
│  │ 2 Gebote │ │ Verkauf: 80   │          │
│  └──────────┘ └───────────────┘          │
└──────────────────────────────────────────┘
```

**Layout-Pattern (MUSS identisch mit KaderPlayerRow sein):**

```
flex gap-3
├── PlayerPhoto (48px, shrink-0, self-start)
└── flex-1 min-w-0
    ├── Line 1: Name + PosBadge → ml-auto → FormBars + L5-Circle
    ├── Line 2: Club
    ├── Line 3: Saison-Stats (Sp · T · A)
    ├── Line 4: Quantity (+ locked) · Ø Kaufpreis → Floor · P&L%
    └── Line 5: Status-Chips (Gebote, Sell-Order, letzter Verkaufspreis)
```

**Line 1 — Identity + Leistung:**
- Left: `p.last.toUpperCase()` font-black + PositionBadge
- Right (ml-auto): FormBars (5 GW bars, farbcodiert) + L5-Circle (size-7, pos-tinted)

**Line 2 — Club:**
- `getClubName(p.club)`, text-xs text-white/40

**Line 3 — Saison-Stats:**
- `{stats.matches} Sp · {stats.goals} T · {stats.assists} A`
- text-xs text-white/50, font-mono tabular-nums

**Line 4 — Position + P&L:**
- `{quantity}×` bold + Lock-Icon falls gesperrt: `({locked}🔒)`
- `Ø {avgBuy}` → `{floor} CR` → P&L% (gruen/rot)
- font-mono tabular-nums

**Line 5 — Markt-Chips:**
- "X Gebote" (gruen bg-green-500/15 text-green-400) — Buy-Orders anderer auf diesen Spieler
- "Verkauf: XX CR" (gelb bg-gold/15 text-gold) — eigener aktiver Sell-Order
- "Letzter: XX CR" (neutral text-white/40) — letzter Trade-Preis

**Tap** → `/player/[id]`

### Sortierung

Default: Wert (quantity × floor, absteigend).
Toggle-Optionen: Wert | P&L% | L5 | Name

### Empty State

Icon: Briefcase oder ShoppingBag
Title: "Noch keine Scout Cards"
Desc: "Kaufe Scout Cards auf dem Marktplatz und baue dein Portfolio auf."
CTA-Button → wechselt zu Marktplatz-Tab

### Datenquellen

| Daten | Quelle | Laden |
|-------|--------|-------|
| Holdings (qty, avg_buy) | `useMarketData.holdings` | Bereits geladen |
| Spieler (enriched) | `useMarketData.mySquadPlayers` | Bereits geladen |
| Floor Prices | `useMarketData.floorMap` | Bereits geladen |
| Sell-Orders (eigene) | `useMarketData.recentOrders` filter uid | Bereits geladen |
| Buy-Orders (andere) | `useMarketData.buyOrders` filter player_id | Bereits geladen |
| Letzter Trade-Preis | `player.prices.lastTrade` | Bereits geladen |
| FormBars (L5 Scores) | `useRecentScores()` | NEU einbinden (existiert, 5min cache) |
| Locked SCs | `useHoldingLocks()` | NEU einbinden (existiert) |
| Stats (Sp/T/A) | `player.stats` | Bereits geladen |

**Kein neues Backend.** Zwei existierende Hooks (`useRecentScores`, `useHoldingLocks`) muessen im MarketContent/PortfolioTab eingebunden werden.

### Store-Erweiterung

`marketStore.ts` → `PortfolioSubTab` erweitern: `'bestand' | 'angebote' | 'watchlist'` (Default: 'bestand')

### Neue Dateien

- `src/features/market/components/portfolio/BestandView.tsx` — Hauptkomponente
- `src/features/market/components/portfolio/BestandHeader.tsx` — Portfolio-Summary
- `src/features/market/components/portfolio/BestandPlayerRow.tsx` — Spieler-Zeile
