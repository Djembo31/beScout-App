# Manager Team-Center — Design Doc

> **Status:** Brainstorm-Output, wartet auf SPEC-Phase
> **Erstellt:** 2026-04-07 | **Vorgaenger:** `2026-04-06-manager-command-center-spec.md` (gescheitert)
> **Process:** brainstorming skill (superpowers v4.3.1) → next: `/spec` Skill

---

## Problem Statement

Anil zur aktuellen `/manager` Page:

> "Die Page sagt mir gar nichts zu. Was soll der User damit, was kann er da machen, welchen Nutzen hat es fuer ihn? Aus meiner Sicht keinen. Das in Manager ist Schrott, damit kann ich nichts anfangen."

**Konkrete Bug-Findings (Code-Analyse):**
- Sandbox-Pitch ohne DB-Write — Aufstellung verschwindet bei Reload
- Equipment-Plan ist `localStorage`-Suggestion ohne Wirkung
- Keine Verbindung zu echtem Event — User muss alles im Event-Modal nochmal aufstellen
- Presets sind reine Erinnerung, kein "Apply to Event"
- IntelPanel (3 Tabs Stats/Form/Markt) zeigt Daten ohne Aktion

→ **Planung ohne Konsequenz.** Bauen ohne Output.

## Vision

`/manager` wird das **Team-Management-Center** mit drei verschmolzenen Use-Cases, alle mit echter Konsequenz:

1. **Aufstellen MIT Direct Event Join** (kein Sandbox mehr)
2. **Kader-Analyse mit Trader-Daten** (Bestand, Kaufpreis, Menge, Entwicklung, P/L)
3. **History** der vergangenen Aufstellungen + Rankings/Scorings (ohne Page-Wechsel)

Plus: konfigurierbare Spalten/Sichten wie bei Marktbestand. Plus: Bestand wandert vollstaendig von `/market` nach `/manager` (Duplicate-Resolution).

## Konkurrenten-Vergleich

| App | Squad-Center | Lineup | Trader-Daten | History |
|---|---|---|---|---|
| Fantasy Premier League | Pitch + Bench, 1 Lineup | Live nur fuer aktuellen GW | — | Pro GW Tab |
| Sorare | Card-Sammlung | Per Game Lineup | Floor + Letzter Trade | Game History |
| Football Manager | Squad List (50+ Spalten) + Tactics Screen | Per Match | Vertrag/Wert | Match Reports |
| DraftKings DFS | Player Pool | Per Contest, Salary Cap | — | Contest History |
| eFootball | Squad Tile mit Werten | Formation Editor | Pack-Wert | Match Center |

**Erkenntnisse:**
- Sorare ist am naechsten an unserem Modell (parallele Events, per-Event Lineups)
- Football Manager Trennung Squad-View vs Tactics-View ist gut, aber zu komplex
- **Niemand** hat ein reines Sandbox-Lineup ohne Wirkung — das gibts nirgends, weil sinnlos

---

## Decision: Bestand-Migration

**Option A gewaehlt** (von Anil bestaetigt): BestandTab wandert vollstaendig von `/market` nach `/manager`.

| Option | /market wird | /manager wird |
|---|---|---|
| **A (gewaehlt)** | Trading-only (Suche, Kaufen, IPO, Watchlist). Bestand raus. | Single Source fuer Squad/Bestand/Lineup/History |
| B | Bestand bleibt, kompakter | Detail-View mit Trader-Daten |
| C | Bestand bleibt | Manager nur Lineup + History |

**Konsequenz:**
- 3-Hub Logik: `/inventory` = "Was hab ich" (Equipment), `/manager` = "Mein Team", `/market` = "Was kann ich kaufen"
- BestandTab Code (1640+ LOC inkl. Subfolder) wird recycled, nur umbenannt
- 2 Files muessen Links updaten: `HomeStoryHeader.tsx`, `PortfolioStrip.tsx`
- 301 Redirects fuer `?tab=portfolio` und `?tab=bestand`

---

## Architektur

### Routing

```
/manager                       → Tab 1 (Aufstellen, default)
/manager?tab=kader             → Tab 2 (Kader-Verwaltung)
/manager?tab=historie          → Tab 3 (Vergangene Events)

/market?tab=portfolio          → 301 → /manager?tab=kader
/market?tab=bestand            → 301 → /manager?tab=kader
```

### Page-Header (oberhalb der Tabs)

Kompakter Header mit 3 Stat-Pills (statt heutiger StatusBar als eigene Component):

```
┌──────────────────────────────────────────────────────┐
│  📋  Manager                                          │
│      Dein Team-Center · Aufstellen, Verwalten, Lernen │
│                                                        │
│  [💼 8 Spieler] [💚 6 fit·1 doubt·1 inj] [📅 GW33 in 2d] │
└──────────────────────────────────────────────────────┘
```

Tap auf "Naechstes Event" Pill → springt zu Tab 1 mit dem Event vorgeladen.

### Tab-Bar

Standard `TabBar` Component (wie /inventory). 3 Tabs:

| Tab | Label | Short (Mobile) | Icon |
|---|---|---|---|
| `aufstellen` | Aufstellen | Auf | `Swords` / `LayoutGrid` |
| `kader` | Kader | Kader | `Users` |
| `historie` | Historie | Hist | `History` |

---

## Tab 1 — Aufstellen

**Visuell 1:1 wie LineupPanel im EventDetailModal.** Die existierende `LineupPanel.tsx` (922 LOC, fertig getestet) wird ohne visuelle Aenderungen wiederverwendet. Nur das Drumherum aendert sich.

### Layout

```
┌──────────────────────────────────────────────────┐
│ 🎯 Event-Selector (NEU)                          │
│ Aufstellen fuer:                                 │
│ ┌────────────────────────────────────────────┐  │
│ │ 🟢 Sakaryaspor 11er Showdown · GW33 ·  ▾  │  │
│ │     22h 51m · 0/40 · 0 CR Preisgeld         │  │
│ └────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────┤
│  📋 LineupPanel — IDENTISCH zu EventDetailModal  │
│  • Formation Picker (4-3-3, 4-4-2, 3-5-2)       │
│  • Pitch mit 11/7 Slots (Captain, Equipment)    │
│  • Synergy Preview                               │
│  • Player-Picker pro Position                    │
├──────────────────────────────────────────────────┤
│ 🔘 Footer — IDENTISCH zu EventDetailFooter       │
│ [Anmelden + Speichern] [Verlassen]              │
└──────────────────────────────────────────────────┘
```

### Event-Selector (einzige NEUE Component)

- Default: naechstes nicht-ended Event in dem User entweder schon ist ODER das offen ist
- Dropdown: alle nicht-ended Events sortiert nach `starts_at` ASC
- Pro Eintrag: Status-Badge (LIVE/REG/LATE), Name, GW, Countdown, Preisgeld, Teilnehmer
- Mobile: Bottom-Sheet mit Liste

### State-abhaengige Footer-Action

| Status | Footer Action |
|---|---|
| `isJoined === false` | "Anmelden + Speichern" (zahlt Entry-Fee + speichert Lineup) |
| `isJoined && status === registering` | "Aufstellung aktualisieren" |
| `status === running` | "Aufstellung aktualisieren" (nur unlocked Slots) |
| `status === ended && scoredAt` | "Ergebnisse ansehen" (inline final scores + rank) |

### Empty States

| Situation | Anzeige |
|---|---|
| Keine offenen Events | "Aktuell laeuft kein Event. Naechstes startet in X." |
| User hat 0 Holdings | "Du brauchst Spielerkarten" → /market?tab=kaufen |
| User hat <11 Spieler fuer 11er | Picker zeigt leere Slots, "Spieler kaufen" CTA → /market?pos=DEF |

### Recycled (0 Aenderung)

`LineupPanel.tsx`, `EventDetailFooter.tsx`, `JoinConfirmDialog.tsx`, `EquipmentPicker`, `EquipmentBadge`, alle Lineup/Event Services.

### Neu

- `EventSelector.tsx` (~80 LOC)
- `useEventSelector` Hook in `managerStore`

---

## Tab 2 — Kader

### Was schon existiert (BestandTab heisst intern bereits ManagerBestandTab)

| Feature | Status |
|---|---|
| Summary Stats (Spieler / Squad-Wert / P&L / Activity) | ✓ |
| **Lens-System** (4 Sicht-Modi: Performance, Markt, Handel, Vertrag) | ✓ |
| Sort pro Lens (3-4 Optionen pro Sicht) | ✓ |
| Suche, Position-Filter, Club-Filter | ✓ |
| Group-by-Club Toggle | ✓ |
| Bulk-Mode + Bulk Sell | ✓ |
| Sell-Modal mit Quantity + Price | ✓ |
| Cancel Order Action | ✓ |

### Lens-System = "konfigurierbare Spalten"

| Lens | Datenpunkte pro Zeile |
|---|---|
| **Performance** | L5, Minutes-Bar, Form, Status, Next Fixture |
| **Markt** (Trader-Sicht) | Menge, Avg Buy, Floor, **P/L absolut + %**, IPO-Badge |
| **Handel** | Listed Qty, Offers Count, Floor, Sell-CTA |
| **Vertrag** | Contract Months Left, Alter, Position |

### Migration

```
src/features/market/components/portfolio/
  ├── BestandTab.tsx                 →  src/features/manager/components/kader/KaderTab.tsx
  └── bestand/
      ├── bestandHelpers.tsx         →  manager/components/kader/kaderHelpers.tsx
      ├── BestandPlayerRow.tsx       →  manager/components/kader/KaderPlayerRow.tsx
      ├── BestandSellModal.tsx       →  manager/components/kader/KaderSellModal.tsx
      ├── BestandToolbar.tsx         →  manager/components/kader/KaderToolbar.tsx
      ├── BestandClubGroup.tsx       →  manager/components/kader/KaderClubGroup.tsx
      └── index.ts                   →  manager/components/kader/index.ts
```

**Naming:** Bestand → Kader (Manager-Sprache statt Trader-Sprache).

### Neue Features

1. **Tap Spieler → Detail-View** (statt nur Sell-Button)
   - Recycled Modal aus heutigem `IntelPanel` (3 Tabs Stats/Form/Markt)
   - Mobile Bottom-Sheet, Desktop Modal
   - Quick-Actions: Sell, Watch, Listing, "Im Lineup planen"

2. **"Im Lineup planen"** Cross-Tab-Action
   - Springt zu Tab 1 (Aufstellen)
   - Versucht Spieler in passenden leeren Slot zu setzen

---

## Tab 3 — Historie

### Daten-Quelle (existiert schon)

```typescript
getUserFantasyHistory(userId, limit) → UserFantasyResult[]
// returns: { eventId, eventName, gameweek, eventDate, totalScore, rank, rewardAmount }
```

Lazy bei Detail-Aufruf:
- `getLineup(eventId, userId)` → Lineup-Snapshot mit Slot-Scores
- `getEventLeaderboard(eventId)` → optional fuer Top-3 Vergleich

### Eintrag — Compact + Expandable

**Compact (default):**
- Event-Name + GW-Badge
- Datum + Format
- 3 KPI-Pills: Score / Rank (mit Position-Color: 🥇 #1, 🥈 #2, 🥉 #3) / Reward

**Expanded (nach Tap):**
- Mini-Pitch (recycled `SquadPitch.tsx`) — readonly
- Slot-Scores, Captain-Crown
- Equipment-Items + Synergy-Bonus
- "In neue Aufstellung uebernehmen" → Tab 1

### Filter + Sort

| Filter | Werte |
|---|---|
| Zeitraum | Alle / 30 Tage / 90 Tage / Diese Saison |
| Format | Alle / 11er / 7er |
| Status | Alle / Top 3 / Top 10 / Sonstige |

| Sort | Default |
|---|---|
| Datum | ↓ (DEFAULT) |
| Score | ↓ |
| Rank | ↓ |
| Reward | ↓ |

### Stats-Block (oben)

Aggregierte KPIs vor der Liste: `Events: 12 · Top 10: 8 · Wins: 2 · Total: 1.450 CR`.

### Cross-Tab-Action

"In Aufstellung uebernehmen" auf einem History-Lineup:
- Springt zu Tab 1
- Lineup wird als Template vorgeladen
- Verkaufte Spieler bleiben leere Slots, Toast: "X Spieler nicht mehr im Bestand"

---

## Migration Plan — 5 Waves

| Wave | Scope | Shippable? |
|---|---|---|
| **1** | Foundation: Page-Header, 3-Tab Skeleton, managerStore Rewrite | Ja (Brueckenwoche, Tabs sichtbar aber leer) |
| **2** | Tab 2 Kader Migration (BestandTab → /manager) + Redirects + 2 Link-Updates | Ja (volle Kader-Funktionalitaet) |
| **3** | Tab 1 Aufstellen (LineupPanel + EventSelector + Footer) | Ja (Direct Event Join funktional) |
| **4** | Tab 3 Historie (Liste + Detail + Filter + Stats) | Ja (History-Sicht ohne /fantasy-Wechsel) |
| **5** | Cleanup (alte Manager-Komponenten loeschen) + Visual QA + Tests | Final |

### Was wegfaellt (heutiger /manager)

| Component | Fate |
|---|---|
| `ManagerContent.tsx` (335 LOC) | REWRITE als 3-Tab Hub |
| `StatusBar.tsx` (130 LOC) | DELETE → Logik in Page-Header |
| `IntelPanel.tsx` (76 LOC) | DELETE → Detail-Modal in Tab 2 |
| `intel/StatsTab.tsx` + `FormTab.tsx` + `MarktTab.tsx` (370 LOC) | MOVE zu kader/PlayerDetailModal |
| `SquadStrip.tsx` (311 LOC) | DELETE — Picker existiert in LineupPanel |
| `managerStore.ts` | REWRITE |
| `useManagerData.ts` | KEEP + EXTEND |
| `lib/formations.ts` | KEEP |

### Risiken + Mitigation

| # | Risiko | Mitigation |
|---|---|---|
| 1 | LineupPanel ist tief mit EventDetailModal verknuepft | Neuer Container `AufstellenTab` extrahiert State-Logik aus EventDetailModal — `LineupPanel` selbst bleibt unveraendert |
| 2 | BestandTab nutzt `useMarketStore` — State-Migration kann Bugs einfuehren | Wave 2 macht state-by-state Migration. Tests pro Slice |
| 3 | Redirects koennten Bookmarks brechen | 301 Redirect, kein Hard-Break |
| 4 | Mobile Layout: 3 Tabs eng | TabBar `shortLabel` (Auf/Kader/Hist) |
| 5 | Tab 1 mit LineupPanel hat eigenen Footer + Page eigener Footer | LineupPanel Footer im Tab 1 Container zentral, kein Doppel |
| 6 | Historie braucht `getLineup` lazy — Cache muss getuned werden | React Query `staleTime: Infinity` per eventId — Lineups sind immutable nach scoring |
| 7 | "In Aufstellung uebernehmen" — verkaufte Spieler | Validierung gegen aktuellen Bestand, fehlende = leere Slots + Toast |

---

## Data Model + State

### managerStore Rewrite

```typescript
interface ManagerState {
  // Tab-State
  activeTab: 'aufstellen' | 'kader' | 'historie';

  // Tab 1: Aufstellen
  selectedEventId: string | null;       // null = Default ist next-open Event

  // Tab 2: Kader (migriert aus marketStore)
  kaderLens: 'performance' | 'markt' | 'handel' | 'vertrag';
  kaderGroupByClub: boolean;
  kaderSellPlayerId: string | null;
  expandedClubs: Set<string>;
  kaderDetailPlayerId: string | null;   // NEU

  // Tab 3: Historie
  historyTimeFilter: 'all' | '30d' | '90d' | 'season';
  historyFormatFilter: 'all' | '11er' | '7er';
  historyStatusFilter: 'all' | 'top3' | 'top10' | 'other';
  historySort: 'date' | 'score' | 'rank' | 'reward';
  expandedHistoryEventId: string | null;
}
```

### React Query Keys

**Bestehend (kein Aenderung):**
- `qk.players.all`, `qk.holdings.byUser(userId)`
- `qk.fixtures.recentMinutes`, `recentScores`, `nextByClub`
- `qk.events.usage(userId)`, `qk.events.holdingLocks(userId)`
- `qk.equipment.inventory(userId)`, `qk.equipment.definitions`

**Neu:**
- `qk.fantasy.userHistory(userId)` — getUserFantasyHistory
- `qk.fantasy.lineup(eventId, userId)` — getLineup
- `qk.events.openForUser(userId)` — fuer EventSelector

### Existing Services

```typescript
// Lineups
getLineup(eventId, userId)               → Tab 1 Edit + Tab 3 Detail
submitLineup(...)                         → Tab 1 Save
getUserFantasyHistory(userId, limit)      → Tab 3 Liste
getEventLeaderboard(eventId)              → Tab 1 (ended) + Tab 3
getProgressiveScores(gw, playerIds)       → Tab 1 (running)

// Events
joinEvent(eventId)                        → Footer Action

// Trading (Kader)
sellListing()                             → Sell Modal
cancelOrder()                             → Cancel Action

// Manager-Data (zentral)
useManagerData(userId)                    → KEEP
```

### State-Migration aus marketStore

```
bestandLens          → kaderLens
bestandGroupByClub   → kaderGroupByClub
bestandSellPlayerId  → kaderSellPlayerId
expandedClubs        → expandedClubs (gleicher Name)
```

`marketStore` behaelt nur: Watchlist, Search, Filter fuers Trading.

---

## Visual Reference — Final ASCII

```
┌─────────────────────────────────────────────────────────┐
│ /manager                                                 │
├─────────────────────────────────────────────────────────┤
│ 📋 Manager · Dein Team-Center                            │
│ [💼 8 Spieler] [💚 6 fit] [📅 GW33 · 2d]                │
├─────────────────────────────────────────────────────────┤
│ [Aufstellen] [Kader] [Historie]                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Tab 1 (default): EventSelector + LineupPanel + Footer  │
│  Tab 2: Kader-Toolbar + Lens + Liste + Detail-Modal     │
│  Tab 3: Filter + Sort + History-Cards + Stats           │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Brainstorm-Approval

- [x] Section 1: Page-Architektur + Header (3-Tab Hub)
- [x] Section 2: Tab Aufstellen (LineupPanel + EventSelector + Footer)
- [x] Section 3: Tab Kader (BestandTab Migration mit Lens-System)
- [x] Section 4: Tab Historie (UserFantasyHistory mit Lazy-Detail)
- [x] Section 5: Migration Plan + 5 Waves
- [x] Section 6: Data Model + State
- [x] **Anil hat Design abgenommen (2026-04-07)**

---

## Next Step: SPEC Phase

Per brainstorming skill terminal state: invoke `writing-plans` skill.
Per Anil's Wunsch (morning briefing): `/spec` Skill (Migration-First Engineering Specification).

`/spec` ersetzt `writing-plans` mit erweiterter Methodik (Current State Analysis, Blast Radius Mapping, Pre-Mortem, Wave Delivery). Naechster Schritt: `/spec` mit diesem Design Doc als Eingabe.
