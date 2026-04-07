# Manager Team-Center — Engineering Specification

> **Status:** Draft — wartet auf Anil Review (SPEC GATE)
> **Erstellt:** 2026-04-07 | **Process:** `/spec` Skill (Migration-First, 3 Phasen)
> **Vorgaenger:** `2026-04-07-manager-team-center-design.md` (brainstorm output, approved)
> **Vorvorgaenger:** `2026-04-06-manager-command-center-spec.md` (gescheitert — Versuch 1)

---

## PHASE 1: SPEC

## 1.1 Current State

### Feature Inventory — alle drei betroffenen Bereiche

#### A) `/manager` (heute — Anil's "Schrott")

| # | Feature | Beschreibung | Quelle |
|---|---------|-------------|--------|
| MA1 | StatusBar | Health-Counts, naechstes Event, Portfolio-Trend | StatusBar.tsx |
| MA2 | Squad-Size Toggle | 6er ↔ 11er Formation | ManagerContent.tsx |
| MA3 | Formation Picker | 4-3-3, 4-4-2, 3-5-2, 3-4-3, 4-2-3-1 | ManagerContent.tsx + lib/formations.ts |
| MA4 | Sandbox-Pitch | SVG Field mit Slots, Tap fuer Player Assignment | SquadPitch.tsx |
| MA5 | Player Assignment | Klick auf leeren Slot → SquadStrip filtert | useManagerStore |
| MA6 | Player Removal | Klick auf besetzten Slot → IntelPanel oeffnet | useManagerStore |
| MA7 | Equipment Plan (localStorage) | EquipmentPicker pro Slot, gespeichert in Zustand | managerStore.equipmentPlan |
| MA8 | Preset Save/Load | Local Presets im managerStore | managerStore.presets |
| MA9 | Reset Assignments | Button "Reset" leert das Pitch | managerStore.clearAssignments |
| MA10 | IntelPanel — Stats Tab | L5, Form-Bars, Season Stats, Fitness, Next Fixture, Meta | intel/StatsTab.tsx |
| MA11 | IntelPanel — Form Tab | Score-Sparkline letzte 10 GW | intel/FormTab.tsx |
| MA12 | IntelPanel — Markt Tab | Holdings, Avg Buy, Floor, P&L, 7d Sparkline, Deep-Links | intel/MarktTab.tsx |
| MA13 | IntelPanel Mobile Bottom-Sheet | Mobile-Variante als Modal | ManagerContent.tsx |
| MA14 | SquadStrip | Horizontaler Player-Bar mit Sort/Filter | SquadStrip.tsx |
| MA15 | Player Detail Selection | Tap im Strip → IntelPanel zeigt Spieler | useManagerStore |

**Was am Ende rauskommt:** Nichts. Kein DB-Write, keine Event-Bindung.

#### B) `/market?tab=portfolio&sub=bestand` — BestandTab (Trader-Sicht)

| # | Feature | Beschreibung | Quelle |
|---|---------|-------------|--------|
| BT1 | Summary Stats Cards | Spieler / Squad-Wert / P&L / Activity | BestandTab.tsx Z.267-301 |
| BT2 | Lens-System (4 Sichten) | Performance, Markt, Handel, Vertrag | bestandHelpers.tsx Z.19-26 |
| BT3 | Sort pro Lens | 3-4 Optionen je Lens | bestandHelpers.tsx Z.28-52 |
| BT4 | Suche | Free-text ueber Name + Club | BestandTab.tsx Z.214-218 |
| BT5 | Position-Filter | Multi-Select GK/DEF/MID/ATT | BestandTab.tsx Z.220 |
| BT6 | Club-Filter | Single-Select pro Club | BestandTab.tsx Z.221 |
| BT7 | Group-by-Club Toggle | Liste vs Gruppen-Ansicht | BestandTab.tsx Z.226-239 |
| BT8 | Bulk-Mode + Bulk Sell | Mehrere Spieler auswaehlen + Sell-All | BestandTab.tsx Z.177-189, 384-408 |
| BT9 | Sell Modal | Quantity + Price input mit Validierung | BestandSellModal.tsx |
| BT10 | Cancel Order Action | Bestehende Listings stornieren | onCancelOrder prop |
| BT11 | Per-Player Row mit Lens-Datenpunkten | Foto, L5, Status, Trader-Daten je Lens | BestandPlayerRow.tsx |
| BT12 | Empty State | Keine Holdings → CTA zu /market?tab=kaufen | BestandTab.tsx Z.345-356 |
| BT13 | Filter Empty State | Filter ergibt 0 → Reset Button | BestandTab.tsx Z.355-357 |
| BT14 | SponsorBanner | market_portfolio Placement | BestandTab.tsx Z.303 |

#### C) `/fantasy` EventDetailModal LineupPanel (Aufstellen)

| # | Feature | Beschreibung | Quelle |
|---|---------|-------------|--------|
| LP1 | Formation Picker (per Format) | 7er oder 11er Formationen | LineupPanel + constants.ts |
| LP2 | Pitch Visualization | SVG mit Slot-Kreisen, Position-Farben | LineupPanel |
| LP3 | Slot Tap → Player Picker | Per-Position gefiltert + Search | LineupPanel + PlayerPicker |
| LP4 | Captain Selection | Tap auf Stern, 1.5x Multiplier | LineupPanel + setCaptainSlot |
| LP5 | Equipment per Slot | EquipmentPicker, Position-Match validiert | EquipmentPicker + EquipmentBadge |
| LP6 | Wildcard-Slots | Per-Slot Toggle, ueberschreibt Lock | wildcardSlots Set |
| LP7 | Synergy Preview | Club-Bonus calculation live | calculateSynergyPreview |
| LP8 | Live Progressive Scores | Polling alle 60s waehrend `running` | getProgressiveScores |
| LP9 | Final Score Display | slot_scores + total_score + rank wenn ended | slotScores, myTotalScore, myRank |
| LP10 | Lineup Persistence | DB write via submitLineup RPC | onSubmitLineup callback |
| LP11 | Equipment Persistence | equipToSlot RPC nach lineup save | equipToSlot service |
| LP12 | Edit-Mode (existing lineup) | getLineup laedt + setzt State | useEffect Z.213-281 |
| LP13 | Locked Slots | Per-fixture isPlayerLocked | fixtureDeadlines |
| LP14 | Footer Actions | Anmelden / Speichern / Verlassen / Ergebnisse | EventDetailFooter |
| LP15 | Salary Cap Validation | totalSalary check | LineupPanel |

#### D) Fantasy History (existiert via Service)

| # | Feature | Beschreibung | Quelle |
|---|---------|-------------|--------|
| FH1 | getUserFantasyHistory Service | Liste der gescorten Lineups eines Users | features/fantasy/services/lineups.queries.ts Z.209-230 |
| FH2 | UserFantasyResult Type | eventId, eventName, gameweek, eventDate, totalScore, rank, rewardAmount | types/index.ts |

**Heute genutzt von:** `ProfileView` (im Profile Tab Trader/Manager) — wird hier ein **zweiter Consumer**.

### File Inventory — alle betroffenen Files

#### Files die geloescht werden (heutiger /manager)

| Datei | LOC | Rolle |
|-------|-----|-------|
| `src/features/manager/components/ManagerContent.tsx` | 335 | Main Container, 4-Zonen-Layout |
| `src/features/manager/components/StatusBar.tsx` | 130 | Health/Event/Trend Bar |
| `src/features/manager/components/IntelPanel.tsx` | 76 | 3-Tab Container |
| `src/features/manager/components/intel/StatsTab.tsx` | 172 | L5/Form/Stats |
| `src/features/manager/components/intel/FormTab.tsx` | ~80 | Score Sparkline |
| `src/features/manager/components/intel/MarktTab.tsx` | 182 | Holdings/PnL/Sparkline |
| `src/features/manager/components/SquadStrip.tsx` | 311 | Horizontal Player Bar |
| `src/features/manager/store/managerStore.ts` | ~100 | Old State |
| **TOTAL DELETE** | **~1.386 LOC** | |

#### Files die migriert werden (BestandTab → Manager)

| Datei | LOC | Ziel |
|-------|-----|------|
| `src/features/market/components/portfolio/BestandTab.tsx` | 420 | `manager/components/kader/KaderTab.tsx` |
| `src/features/market/components/portfolio/bestand/bestandHelpers.tsx` | 230 | `manager/components/kader/kaderHelpers.tsx` |
| `src/features/market/components/portfolio/bestand/BestandPlayerRow.tsx` | ~250 | `manager/components/kader/KaderPlayerRow.tsx` |
| `src/features/market/components/portfolio/bestand/BestandSellModal.tsx` | ~200 | `manager/components/kader/KaderSellModal.tsx` |
| `src/features/market/components/portfolio/bestand/BestandToolbar.tsx` | ~150 | `manager/components/kader/KaderToolbar.tsx` |
| `src/features/market/components/portfolio/bestand/BestandClubGroup.tsx` | ~80 | `manager/components/kader/KaderClubGroup.tsx` |
| `src/features/market/components/portfolio/bestand/index.ts` | ~10 | `manager/components/kader/index.ts` |
| **TOTAL MIGRATE** | **~1.340 LOC** | |

#### Files die geaendert werden (in /market)

| Datei | LOC | Aenderung |
|-------|-----|-----------|
| `src/features/market/components/portfolio/PortfolioTab.tsx` | 89 | Bestand-SubTab entfernen, Default-SubTab wird `angebote` oder `watchlist` |
| `src/features/market/store/marketStore.ts` | 153 | `bestandLens`, `bestandGroupByClub`, `bestandSellPlayerId`, `expandedClubs`, `setBestand*` raus (4 fields + 4 setters) |
| `src/features/market/components/portfolio/__tests__/BestandTab.test.*` | ? | Tests mitziehen (falls vorhanden) |

#### Files die geaendert werden (interne Links)

| Datei | Zeile | Aktuell | Neu |
|-------|-------|---------|-----|
| `src/components/home/PortfolioStrip.tsx` | 25, 45, 108 | `/market?tab=portfolio` | `/manager?tab=kader` |
| `src/components/home/HomeStoryHeader.tsx` | 78 | `/market?tab=portfolio` | `/manager?tab=kader` |

**KEIN Update noetig (sind alle `tab=kaufen` oder `tab=angebote`):**
PortfolioStrip.tsx Z.26, HomeSpotlight.tsx, TraderTab.tsx, EventSummaryModal.tsx, page.tsx (Quick Actions), LineupPanel.tsx Z.592+893, WelcomeBonusModal.tsx, OnboardingChecklist.tsx, retentionEngine.ts, ScoreBreakdown.tsx, PlayerPicker.tsx, BestandTab.tsx Z.352, BestandSellModal.tsx Z.132, notifications.ts, NotificationDropdown.tsx.

#### Files die NEU erstellt werden

| Datei | Geschaetzt | Zweck |
|-------|-----------|-------|
| `src/features/manager/components/ManagerContent.tsx` | ~150 LOC | REWRITE als 3-Tab Hub |
| `src/features/manager/components/PageHeader.tsx` | ~80 LOC | Stat-Pills + Title |
| `src/features/manager/components/aufstellen/AufstellenTab.tsx` | ~250 LOC | Container Tab 1, extracted state from EventDetailModal |
| `src/features/manager/components/aufstellen/EventSelector.tsx` | ~120 LOC | Dropdown / Bottom-Sheet |
| `src/features/manager/components/kader/PlayerDetailModal.tsx` | ~150 LOC | Modal mit 3 Tabs (Stats/Form/Markt) |
| `src/features/manager/components/historie/HistorieTab.tsx` | ~80 LOC | Container Tab 3 |
| `src/features/manager/components/historie/HistoryEventCard.tsx` | ~200 LOC | Compact + Expanded State |
| `src/features/manager/components/historie/HistoryStats.tsx` | ~60 LOC | Aggregat-Stats Box |
| `src/features/manager/store/managerStore.ts` | ~120 LOC | REWRITE — neue State-Struktur |
| `src/features/manager/queries/historyQueries.ts` | ~50 LOC | useUserFantasyHistory hook |
| **TOTAL NEW** | **~1.260 LOC** | |

**Net LOC:** −1.386 (delete) +1.340 (migrate, no net change) +1.260 (new) = **−126 LOC** plus rewrite. **Bedeutet:** Wir bauen NICHT mehr Code, sondern weniger.

### Data Flow

#### Aktueller Manager (vor Refactor)

```
ManagerContent
  └─ useManagerData(userId)
       ├─ useMarketData(userId)        → players, mySquadPlayers, holdings
       ├─ useRecentMinutes()           → Map<playerId, number[]>
       ├─ useRecentScores()            → Map<playerId, number[]>
       ├─ useNextFixtures()            → Map<clubId, NextFixtureInfo>
       ├─ usePlayerEventUsage(userId)  → Map<playerId, EventUsage[]>
       ├─ useUserEquipment(userId)     → DbUserEquipment[]
       ├─ useEquipmentDefinitions()    → DbEquipmentDef[]
       └─ useEquipmentRanks()          → DbEquipmentRank[]
  └─ useManagerStore()                  → assignments, equipmentPlan, presets, intelTab, ...
```

#### Aktueller BestandTab (vor Refactor)

```
PortfolioTab → BestandTab
  ├─ Props from MarketContent: players, holdings, ipoList, userId, incomingOffers, onSell, onCancelOrder
  └─ useMarketStore()                  → bestandLens, bestandGroupByClub, bestandSellPlayerId, expandedClubs
  └─ useRecentMinutes(), useRecentScores(), useNextFixtures(), usePlayerEventUsage(userId)
  └─ useHoldingLocks(userId)           → Map<playerId, number>
```

#### Aktuelle EventDetailModal LineupPanel

```
EventDetailModal (in /fantasy)
  ├─ getLineup(eventId, userId)        → DbLineup
  ├─ getEventLeaderboard(eventId)      → LeaderboardEntry[]
  ├─ getProgressiveScores(gw, ids)     → Map<playerId, number>
  ├─ useEquipmentDefinitions()         → DbEquipmentDef[]
  ├─ useUserEquipment(userId)          → DbUserEquipment[]
  └─ LineupPanel (922 LOC view-only Component)
       ├─ Props: event, selectedPlayers, formation, captainSlot, equipmentMap, ...
       └─ Callbacks: onSelectPlayer, onRemovePlayer, onFormationChange, ...
```

### External Links — komplette Liste

#### Links die zu `/manager` zeigen

| Quelle | Zeile | Kontext |
|--------|-------|---------|
| `src/lib/nav.ts` | 25 | NAV_MAIN — SideNav Eintrag |
| `src/components/layout/BottomNav.tsx` | 13 | BOTTOM_TABS — Mobile Nav (heute hinzugefuegt im /manager?tab Block) |
| `src/components/layout/__tests__/BottomNav.test.tsx` | 40 | Test fuer Manager-Link |
| `src/app/(app)/manager/page.tsx` | 7 | Route → ManagerContent dynamic import |

**Anzahl: 4 (3 echte + 1 Test). Keine direkten Deep-Links auf /manager?tab=*** im Code (noch nicht).

#### Links die zu `/market?tab=portfolio` zeigen (muessen migriert werden)

| Quelle | Zeile | Kontext |
|--------|-------|---------|
| `src/components/home/PortfolioStrip.tsx` | 25 | SectionHeader href "Mein Spielerkader" |
| `src/components/home/PortfolioStrip.tsx` | 45 | SectionHeader href (zweite Stelle) |
| `src/components/home/PortfolioStrip.tsx` | 108 | "+N more" Link am Ende der Strip |
| `src/components/home/HomeStoryHeader.tsx` | 78 | data-tour-id="home-stats" Link |

**Anzahl: 4 — alle in `src/components/home/`. Migration-Ziel: `/manager?tab=kader`.**

#### Links die zu `/market?tab=*` zeigen (UNVERAENDERT — kein Bestand)

- 14 Stellen mit `?tab=kaufen` (Quick Actions, Empty States, etc.) — STAYS
- 3 Stellen mit `?tab=angebote` (Notifications, Sell Modal Quick-Link) — STAYS

### Shared State

#### Zustand Stores

| Store | Field | Heute genutzt von | Migration |
|-------|-------|-------------------|-----------|
| `marketStore` | `bestandLens` | BestandTab | → `managerStore.kaderLens` |
| `marketStore` | `bestandGroupByClub` | BestandTab | → `managerStore.kaderGroupByClub` |
| `marketStore` | `bestandSellPlayerId` | BestandTab | → `managerStore.kaderSellPlayerId` |
| `marketStore` | `expandedClubs` | BestandTab only (Anil bestaetigt 2026-04-07) | → `managerStore.expandedClubs` |
| `marketStore` | `tab`, `portfolioSubTab`, `kaufenSubTab` | MarketContent | STAYS, `portfolioSubTab` Default → **`'angebote'`** (Anil bestaetigt 2026-04-07) |
| `marketStore` | `filterPos`, `filterMinL5`, etc. | Marktplatz Filters | STAYS |
| `managerStore` | `assignments`, `equipmentPlan`, `presets`, etc. | ManagerContent | **DELETE** — neuer State |

#### React Query Keys

| Key | Heute | Manager Re-Use? |
|-----|-------|-----------------|
| `qk.players.all` | Market, Manager | KEEP shared |
| `qk.holdings.byUser(userId)` | BestandTab, ProfileView | KEEP shared |
| `qk.fixtures.recentMinutes` | BestandTab, Manager, ClubAccordion | KEEP shared |
| `qk.fixtures.recentScores` | BestandTab, Manager, TransferListSection, ClubAccordion | KEEP shared |
| `qk.fixtures.nextByClub` | BestandTab, Manager | KEEP shared |
| `qk.events.usage(userId)` | BestandTab, Manager | KEEP shared |
| `qk.events.holdingLocks(userId)` | BestandTab | KEEP shared |
| `qk.equipment.inventory(userId)` | EventDetailModal, Manager | KEEP shared |
| `qk.equipment.definitions` | EventDetailModal, Manager | KEEP shared |
| `qk.equipment.ranks` | Manager | KEEP |
| **NEU** `qk.fantasy.userHistory(userId)` | — | NEW fuer Tab 3 |
| **NEU** `qk.fantasy.lineup(eventId, userId)` | (Direct call existiert) | NEW als Query Hook fuer Caching |
| **NEU** `qk.events.openForUser(userId)` | (Direct call) | NEW fuer EventSelector |

---

## 1.2 Goals + Non-Goals + Anti-Requirements

### Goals

| # | Goal | Messbar |
|---|------|---------|
| G1 | `/manager` ist das Single-Source Team-Management-Center | 3 Tabs (Aufstellen / Kader / Historie) sichtbar, alle 3 funktional |
| G2 | Aufstellen-Tab schreibt direkt in echte Events (kein Sandbox) | Footer "Anmelden + Speichern" loest joinEvent + submitLineup aus |
| G3 | Kader-Tab ersetzt /market Bestand-Tab vollstaendig | 0 Bestand-Code in /market, alle Trader-Daten in /manager?tab=kader |
| G4 | Historie-Tab zeigt vergangene Lineups + Rankings ohne Page-Wechsel | getUserFantasyHistory laedt, Compact + Expanded States |
| G5 | Visuell identisch zu LineupPanel (Aufstellen) und BestandTab (Kader) | Recycled Components ohne visuelle Aenderung |
| G6 | Migration ist non-breaking — alle existing Links funktionieren | 4 Link-Updates in 2 Files + 301 Redirects fuer alte URLs |

### Non-Goals

- Marktplatz redesign (Suche/Kaufen/IPO bleibt unveraendert)
- Angebote-Tab oder Watchlist nach Manager migrieren (bleibt im /market PortfolioTab)
- LineupPanel optisch oder funktional aendern
- BestandTab Lens-System aendern oder erweitern
- Neue Achievements / Gamification Features
- Multi-User Lineup Vergleich
- Drag & Drop auf Mobile
- Event Prep Mode mit Constraints
- Football Manager Style 50-Spalten Squad List
- Manager Push Notifications
- Auto-Apply von Manager-Lineup auf alle Events
- Lineup-Templates aus Historie als Cross-Event Persistenz

### Anti-Requirements

- **KEINE Aenderung an LineupPanel.tsx** — wird nur referenziert, nicht modifiziert
- **KEINE Aenderung an BestandPlayerRow.tsx Logik** — nur Pfad + Name aendern
- **KEINE Duplikation von Components** zwischen /market und /manager
- **KEIN neuer Hook wo bestehender reicht** (useManagerData, getLineup, getUserFantasyHistory existieren)
- **KEINE neuen RPCs oder DB-Tabellen**
- **KEINE Default-Tab-Reihenfolge in /market aendern** (Portfolio bleibt 1. Tab, nur Sub-Tab Default aendert sich)
- **KEINE Mock-Daten** — alle Daten aus echten Queries
- **KEIN Push ohne Self-Test** (Tab 1 Lineup speichern + Tab 2 Lens wechseln + Tab 3 expand alle interagiert)

---

## 1.3 Feature Migration Map

| # | Feature | Aktuell | Ziel | Aktion |
|---|---------|---------|------|--------|
| MA1 | StatusBar (Health/Event/Trend) | StatusBar.tsx | ManagerContent PageHeader (kompakter) | **MERGE** in PageHeader, alte Component DELETE |
| MA2 | Squad-Size Toggle | ManagerContent | Tab 1 (via LineupPanel) | **REMOVE** — LineupPanel hat das ueber `event.format` |
| MA3 | Formation Picker | ManagerContent | Tab 1 (via LineupPanel) | **REMOVE** — in LineupPanel enthalten |
| MA4 | Sandbox-Pitch | SquadPitch in Manager | Tab 1 (via LineupPanel mit echtem Event) | **REPLACE** — LineupPanel uses own Pitch |
| MA5 | Player Assignment (Sandbox) | useManagerStore | Tab 1 (via LineupPanel mit DB-Write) | **REPLACE** — selectedPlayers + onSubmitLineup |
| MA6 | Player Removal (Sandbox) | useManagerStore | Tab 1 (via LineupPanel mit DB-Write) | **REPLACE** |
| MA7 | Equipment Plan localStorage | managerStore.equipmentPlan | Tab 1 (via LineupPanel + equipToSlot) | **REPLACE** mit DB-Persistenz |
| MA8 | Preset Save/Load | managerStore.presets | — | **REMOVE** — Tab 1 nutzt direkt das aktuelle Event-Lineup, History-Tab uebernimmt "Aufstellung wiederverwenden" |
| MA9 | Reset Assignments | managerStore.clearAssignments | — | **REMOVE** — Lineup ist immer event-bound |
| MA10 | IntelPanel — Stats Tab | intel/StatsTab.tsx | Tab 2 PlayerDetailModal Stats Section | **MOVE** in Modal |
| MA11 | IntelPanel — Form Tab | intel/FormTab.tsx | Tab 2 PlayerDetailModal Form Section | **MOVE** in Modal |
| MA12 | IntelPanel — Markt Tab | intel/MarktTab.tsx | Tab 2 PlayerDetailModal Markt Section | **MOVE** in Modal |
| MA13 | IntelPanel Mobile Bottom-Sheet | ManagerContent + Modal | Tab 2 PlayerDetailModal | **MERGE** — automatisch durch Modal Component |
| MA14 | SquadStrip | SquadStrip.tsx | — | **REMOVE** — Player-Picker existiert in LineupPanel |
| MA15 | Player Detail Selection | useManagerStore | Tab 2 (Click Row) + Tab 1 (Click Slot) | **REPLACE** mit lokalem State pro Tab |
| BT1 | Summary Stats Cards | BestandTab | Tab 2 KaderTab (unveraendert) | **MOVE** — Pfad + Naming |
| BT2 | Lens-System (4 Sichten) | bestandHelpers.tsx | Tab 2 kaderHelpers.tsx | **MOVE** |
| BT3 | Sort pro Lens | bestandHelpers.tsx | Tab 2 kaderHelpers.tsx | **MOVE** |
| BT4 | Suche | BestandTab | Tab 2 KaderTab | **MOVE** |
| BT5 | Position-Filter | BestandTab | Tab 2 KaderTab | **MOVE** |
| BT6 | Club-Filter | BestandTab | Tab 2 KaderTab | **MOVE** |
| BT7 | Group-by-Club Toggle | BestandTab + marketStore | Tab 2 KaderTab + managerStore | **MOVE** state |
| BT8 | Bulk-Mode + Bulk Sell | BestandTab | Tab 2 KaderTab | **MOVE** |
| BT9 | Sell Modal | BestandSellModal | Tab 2 KaderSellModal | **MOVE** |
| BT10 | Cancel Order Action | onCancelOrder prop | Tab 2 (props from /manager) | **MOVE** wiring |
| BT11 | Per-Player Row mit Lens | BestandPlayerRow | Tab 2 KaderPlayerRow | **MOVE** |
| BT12 | Empty State | BestandTab | Tab 2 KaderTab | **MOVE** |
| BT13 | Filter Empty State | BestandTab | Tab 2 KaderTab | **MOVE** |
| BT14 | SponsorBanner | BestandTab | Tab 2 KaderTab (placement bleibt) | **MOVE** |
| LP1-LP15 | LineupPanel Features | EventDetailModal | Tab 1 AufstellenTab | **REUSE** — LineupPanel Component bleibt unangetastet |
| FH1 | getUserFantasyHistory | services/lineups.queries.ts | Tab 3 HistorieTab via Hook | **REUSE** — Service unveraendert, neuer Consumer |
| FH2 | UserFantasyResult Type | types/index.ts | — | **STAYS** unveraendert |
| **NEU** N1 | EventSelector | — | Tab 1 — Dropdown mit offenen Events | **NEW** |
| **NEU** N2 | PageHeader mit Stat-Pills | — | Top of /manager (alle Tabs) | **NEW** |
| **NEU** N3 | "Im Lineup planen" Cross-Tab Action | — | Tab 2 PlayerDetailModal → Tab 1 | **NEW** |
| **NEU** N4 | "Aufstellung uebernehmen" Cross-Tab | — | Tab 3 HistoryEventCard → Tab 1 | **NEW** |
| **NEU** N5 | History Compact + Expanded Card | — | Tab 3 | **NEW** |
| **NEU** N6 | History Filter + Sort | — | Tab 3 | **NEW** |
| **NEU** N7 | History Aggregat-Stats Box | — | Tab 3 | **NEW** |
| **NEU** N8 | Tab Routing via `?tab=` | — | ManagerContent | **NEW** (Pattern wie /inventory) |

**Regel-Check:** Jedes Feature hat eine Zeile. Kein Feature unaccounted. ✓

---

## 1.4 Blast Radius Map

### 3-Grep pro Aenderung

#### A) `BestandTab.tsx` — wird nach manager migriert

```
1. Direct Imports:
   src/features/market/components/portfolio/PortfolioTab.tsx Z.15
     → const BestandTab = dynamic(() => import('./BestandTab'))

2. Indirect (PortfolioTab Consumer):
   src/features/market/components/MarketContent.tsx
     → import PortfolioTab
   Used by: /market route page

3. Runtime (state):
   useMarketStore subscribers (4 fields):
     - bestandLens     → BestandTab.tsx (1 reader/writer)
     - bestandGroupByClub → BestandTab.tsx (1 reader/writer)
     - bestandSellPlayerId → BestandTab.tsx (1 reader/writer)
     - expandedClubs   → BestandTab.tsx + (potential ClubVerkauf use, MUSS gegrept werden)
```

**Aktion:** PortfolioTab muss Bestand-SubTab entfernen + Default-SubTab aendern. State muss in 1 Wave migriert werden (sonst broken intermediate state).

#### B) `bestand/` Subfolder — wandert mit

```
1. Direct Imports von BestandTab:
   - bestandHelpers (DEFAULT_SORT, BestandLens type)
   - BestandPlayerRow
   - BestandSellModal
   - BestandToolbar
   - BestandClubGroup

2. Indirect:
   - bestandHelpers wird auch von marketStore importiert (BestandLens type)
     → marketStore muss neuen import path bekommen ODER type wird entfernt aus marketStore
   - KEINE anderen Consumer ausserhalb von BestandTab/bestand/

3. Runtime: keine
```

**Aktion:** marketStore Import-Pfad wird obsolet wenn `bestandLens` field migrated. State + Type wandern zusammen.

#### C) `ManagerContent.tsx` — wird komplett neu geschrieben

```
1. Direct Imports:
   src/app/(app)/manager/page.tsx Z.7
     → const ManagerContent = dynamic(() => import('@/features/manager/components/ManagerContent'))

2. Indirect:
   /manager route → ManagerContent (einziger Konsument)

3. Runtime:
   useManagerStore (8+ fields) → wird komplett gewipt
```

**Aktion:** Page-Import bleibt — die exportierte Component wird intern komplett umgeschrieben.

#### D) `useMarketStore` — 4 Bestand-Felder weg

```
1. Direct Readers/Writers:
   - BestandTab.tsx (4 fields)
   - bestandHelpers.tsx (BestandLens type only — type stays in helpers, not in store)

2. Indirect:
   - marketStore.ts type imports from bestandHelpers
   - Removing the fields breaks any consumer

3. Runtime: only BestandTab
```

**Aktion:** Atomare Migration — wenn BestandTab in /manager funktioniert, dann den State aus /market wegnehmen. Nicht gleichzeitig sondern in separater Wave.

#### E) `getUserFantasyHistory` — neuer Consumer

```
1. Direct Callers:
   src/components/profile/TraderTab.tsx (oder ProfileView — pruefen)

2. Indirect:
   - ProfileView Tab "Trader" oder "Manager" ruft das Service auf

3. Runtime: keine, einfacher one-shot Service Call
```

**Aktion:** Nur lesender Konsument hinzufuegen, keine Mutation. Sicher.

#### F) `LineupPanel.tsx` — neuer Consumer

```
1. Direct Callers (heute):
   src/components/fantasy/EventDetailModal.tsx (einziger)
     → wird in EventTab "lineup" gerendert mit ~30 Props

2. Indirect:
   alle anderen Konsumenten von EventDetailModal nutzen indirect

3. Runtime:
   - getLineup, submitLineup, getEventLeaderboard, getProgressiveScores
   - useEquipmentDefinitions, useUserEquipment
   - calculateSynergyPreview, etc.
```

**Aktion:** AufstellenTab wird ZWEITER Consumer. **Kritisch:** LineupPanel hat ~30 Props. Wir muessen die ganze State-Maschine die in EventDetailModal lebt (lines 51-489) extrahieren.

**Entscheidung (Anil 2026-04-07): Option 1 — Extract zu Hook** `useLineupBuilder(event, userId)`. Beide Consumer (EventDetailModal + AufstellenTab) nutzen den Hook. Hook-Extraction in eigener **Wave 0** VOR der Manager-Integration. Reines Refactoring, alte Tests muessen alle gruen bleiben.

#### G) `marketStore.ts` Default-Tab Aenderung

```
portfolioSubTab default ist heute 'bestand'
→ Wenn 'bestand' nicht mehr existiert, MUSS Default geaendert werden
→ Sonst: Component crash beim ersten Render
```

**Aktion:** marketStore Default ändern auf **`'angebote'`** in **selber Wave** wie BestandTab Removal aus PortfolioTab. **Constraint check:** bestaetigt durch Pre-Mortem Failure #5 vom skill template.

### Cross-Over Analysis

#### Cross-Over: Manager ↔ Fantasy

| Beruehrungspunkt | Risiko | Mitigation |
|------------------|--------|------------|
| LineupPanel von beiden Pages genutzt | Aenderungen brechen Fantasy | LineupPanel.tsx bleibt unveraendert. Alle State-Manipulation in shared Hook (Option 1) ODER kopiertem State (Option 2) |
| getLineup, submitLineup Services | Beide Pages schreiben in gleiche DB-Tabelle | Ist Pflicht — eine Source of Truth fuer Lineups. RPC ist idempotent, keine Race Condition |
| equipToSlot RPC | Manager + Fantasy weisen Equipment zu | RPC ist transactional, OK. Optimistic Updates zu pruefen |
| Live Progressive Scores Polling | Doppelt beim Manager + Fantasy gleichzeitig | React Query dedupliziert. Polling-Interval in beiden gleich (60s) |

#### Cross-Over: Manager ↔ Market

| Beruehrungspunkt | Risiko | Mitigation |
|------------------|--------|------------|
| useMarketData / Holdings | Beide Seiten lesen das gleiche | React Query Cache shared, OK |
| useMarketStore tab/portfolioSubTab | /market Default ist 'bestand' — wenn weg, Crash | Default in **selber Wave** auf 'angebote' setzen |
| Sell Action onSell | Manager braucht eigene Trading-Action | Wave 2: onSell prop wird in /manager bereitgestellt aus services/trading.ts |
| Watchlist State | Wenn Bestand weg, default zu watchlist? | Default-SubTab Entscheidung: `'angebote'` (mehr Trading-relevant) |
| /market route bleibt funktional ohne Bestand-Tab | Bestand-Bookmark koennte 404 | 301 Redirect via middleware oder useEffect in /market layout |

#### Cross-Over: Manager ↔ Profile

| Beruehrungspunkt | Risiko | Mitigation |
|------------------|--------|------------|
| getUserFantasyHistory in beiden | Profile zeigt History auch — duplicate UI? | OK — Profile zeigt nur Top 5 als Teaser, Manager zeigt full list mit Details. Service stays unchanged. |
| ProfileView Trader-Stats vs Manager Kader-Stats | Konzeptuelle Doppelung von "Squad Value" etc. | Profile-Stats sind aggregiert (Trader Score, Win Rate). Kader zeigt Per-Player. Kein Konflikt. |

#### Cross-Over: Manager ↔ Navigation

| Beruehrungspunkt | Risiko | Mitigation |
|------------------|--------|------------|
| BottomNav Manager-Eintrag | bereits vorhanden seit heutigem 7-Item Push | OK |
| `?tab=kader` Deep-Link aus PortfolioStrip + HomeStoryHeader | Beide Files muessen in Wave 2 updaten | Atomar mit BestandTab Migration |
| Notification deep-links zu Bestand | grep zeigt: nur `tab=angebote` Notifications, kein `tab=bestand` Notification | Sicher, keine Notification-Migration |
| Search Overlay Player-Klick → Detail-Modal | Heute → /player/[id] Page. Manager neuer Detail-Modal? | Search bleibt → /player/[id]. Manager Detail-Modal ist NUR fuer Kader-Tab Click |

---

## 1.5 Pre-Mortem

> "Es ist 2 Wochen spaeter. Manager Team-Center Launch ist gescheitert. Was ist passiert?"

| # | Failure Scenario | Wahrscheinlichkeit | Mitigation |
|---|-----------------|---|------------|
| 1 | **Doppelter Bestand:** BestandTab in /market UND /manager weil Wave 2 nur added ohne removed. User sieht 2x dasselbe, Bug-Reports. | Hoch | Constraint: Move + Delete in **derselben Wave**. Wave 2 schreibt PortfolioTab.tsx um (Bestand-SubTab raus) **gleichzeitig** mit dem KaderTab Import in /manager. Spec GATE prueft `grep BestandTab src/features/market` = 0 Treffer nach Wave 2. |
| 2 | **Externe Links brechen:** PortfolioStrip + HomeStoryHeader linken zu `/market?tab=portfolio` nach der Migration. User klickt auf Spielerkader-Card auf Home, landet in leerem Market-Bestand-State. | Hoch | Blast Radius Map listet alle 4 Link-Stellen. Wave 2 enthaelt explizit den Update dieser 2 Files. Self-Test Gate: alle 4 Links manuell klicken nach Push. |
| 3 | **Leere Manager Page deployed:** Wave 1 Skeleton committed ohne dass die Tabs Inhalt zeigen. User oeffnet /manager und sieht "Coming Soon" oder Crash. | Mittel | Wave 1 Skeleton zeigt **bewusst Placeholder** mit "Tab in Migration" Text. ABER: Wave 1 wird NICHT alleine geshipped. Wave 1 + Wave 2 als Bundle. Erst Push wenn Tab 2 (Kader) funktioniert. |
| 4 | **LineupPanel Hook-Extraction bricht EventDetailModal:** Beim Refactor um `useLineupBuilder` Hook zu extrahieren wird ein State-Update vergessen. Fantasy User koennen plötzlich keine Lineups mehr speichern. | Sehr hoch | **Wave 0 dedicated** (Anil bestaetigt 2026-04-07). Reines Refactor — keine neuen Features, alte Tests muessen alle gruen bleiben. EventDetailModal nutzt den neuen Hook **vor** Manager AufstellenTab gebaut wird. Komplette Manual-Smoke-Test in /fantasy nach Wave 0: 1 Lineup join + 1 Lineup edit + 1 Equipment assign + 1 Reset. |
| 5 | **marketStore Default-Tab Crash:** `portfolioSubTab` default ist `'bestand'`, BestandTab existiert nicht mehr → Component nicht gefunden → /market crash beim ersten Open. | Sehr hoch | Wave 2 enthaelt **gleichzeitig**: BestandTab raus + marketStore Default = 'angebote' + PortfolioTab JSX angepasst. Self-Test Gate: /market direkt nach Push laden, keine Console-Errors. |
| 6 | **EventSelector zeigt ENDED Events:** EventSelector laedt alle Events aber filtert nicht nach Status → User sieht alte Events und kann sich anmelden zu Toten Events. RPC Error oder lock 0-rows. | Mittel | EventSelector Service-Call: `getEvents().filter(e => !['ended','cancelled'].includes(e.status))`. Test mit ended Events in DB pruefen. |
| 7 | **Kader-Detail-Modal "Im Lineup planen" Action verliert sich:** User klickt auf Spieler in Tab 2, sieht Detail-Modal, klickt "Im Lineup planen", Tab wechselt zu Tab 1, aber Player wird nicht gesetzt weil Event-Selector noch null ist oder Slot nicht gefunden. | Mittel | "Im Lineup planen" prueft FIRST: ist ein Event ausgewaehlt? Wenn nein → erst EventSelector oeffnen. Wenn ja → versuche Slot zu finden, sonst Toast "Kein passender Slot frei" + Spieler im Picker hervorheben. |
| 8 | **History Performance:** User mit 50+ vergangenen Events laedt Historie-Tab, alle Lineup-Snapshots werden gleichzeitig geladen → 50 parallele DB-Queries → langsame Page. | Mittel | Compact-State ist EINE Query (`getUserFantasyHistory`). Expanded-State laed `getLineup` **on-demand pro Click**. React Query Cache mit `staleTime: Infinity` (Lineups sind immutable nach scoring). |
| 9 | **Equipment-Plan localStorage geht verloren:** Heute speichern manche User Equipment in `managerStore.equipmentPlan` localStorage. Wenn Manager rewrite den Store wiped, gehen User-Daten kaputt. | Niedrig | **Entscheidung Anil 2026-04-07: stille Loeschung.** Presets waren nie funktional persistent. Store-Rewrite clear-t den alten Key (`bescout-manager-store`). Kein Toast, kein Migration-Warning. |
| 10 | **Mobile Tab-Bar zu eng:** 3 Tabs auf 360px viewport mit deutschen Labels (Aufstellen / Kader / Historie) — Labels koennten gequetscht werden. | Niedrig | TabBar `shortLabel` Pattern wie /inventory: "Auf / Kader / Hist". Visual Self-Test bei 360px. |
| 11 | **Loading-State Flash:** Tab-Wechsel zeigt kurz Skeleton, dann Content, dann Layout-Shift weil React Query Daten erst nach Mount laden. | Mittel | Tab 2 + Tab 3 nutzen `keepPreviousData: true`. Tab 1 zeigt Skeleton bis Event-Daten geladen. Stable Layout-Container fuer Pitch (fixed aspect-ratio). |
| 12 | **Self-Test ueberspringt einen Edge-Case:** wir testen Tab 1 + Tab 2 + Tab 3, aber nicht: 0 Holdings, 0 Events, 1 Spieler in Lineup. | Mittel | Akzeptanzkriterien (Section 1.7) decken alle Empty-States ab. Self-Test Checklist enthaelt explizit "with 0 holdings" und "with no open events". |

---

## 1.6 Invarianten + Constraints

### Invarianten — duerfen sich NICHT aendern

| # | Invariante | Pruefung |
|---|-----------|----------|
| I1 | Floor Price Berechnung in Kader-Tab identisch zu BestandTab | Manueller Vergleich + Snapshot-Test (1 Spieler vorher/nachher) |
| I2 | Sell-Modal Verhalten + Validierung identisch | Manuelle 3 Sell-Aktionen in Tab 2 |
| I3 | LineupPanel visuelle Darstellung identisch zu EventDetailModal Lineup-Tab | Side-by-side Screenshot-Vergleich |
| I4 | submitLineup RPC bekommt identische Args (event, lineup, formation, captain, wildcards) | Code-Review der AufstellenTab Save-Action |
| I5 | EventDetailModal in /fantasy funktioniert nach LineupPanel Hook-Extraction unveraendert | Wave 0 Tests + manueller Lineup-Save in /fantasy |
| I6 | /market `?tab=portfolio` linkt nach Migration auf /manager?tab=kader (301) | Browser-Test |
| I7 | /market funktioniert ohne Bestand-SubTab (Angebote + Watchlist bleiben) | /market direkt oeffnen, beide Sub-Tabs interagieren |
| I8 | BottomNav Manager-Item bleibt funktional | bereits getestet (heute) |
| I9 | Holdings-Daten in beiden Locations (Profile + Manager-Kader) identisch | React Query Cache Inspection |
| I10 | getUserFantasyHistory liefert in Profile + Manager-Historie identische Daten | React Query Cache Inspection |
| I11 | useMarketStore Filter-State (filterPos, filterMinL5, etc.) bleibt unveraendert | grep + manueller Filter-Test |
| I12 | KaderTab Test-Files (falls existieren) gruen | `npx vitest run src/features/manager/components/kader/` |

### Constraints — harte Grenzen

| # | Constraint |
|---|-----------|
| C1 | Max 10 Files pro Wave (Skill Vorgabe) |
| C2 | Move und Change NIE im selben Schritt — Refactoring vor Feature-Add |
| C3 | LineupPanel.tsx wird **NICHT modifiziert** — nur Hook-Extraction in EventDetailModal |
| C4 | BestandPlayerRow Logik wird **NICHT geaendert** — nur Pfad + Naming |
| C5 | marketStore Bestand-Felder werden in **selber Wave** entfernt wie BestandTab Removal |
| C6 | PortfolioTab Default-SubTab wird in **selber Wave** geaendert (kein Crash) |
| C7 | Wave 1 Skeleton wird **NICHT alleine geshipped** — bundled mit Wave 2 |
| C8 | Mobile Touch Targets min 44px |
| C9 | Tab Routing via `?tab=` (Pattern wie /inventory) |
| C10 | Self-Test vor jedem Push: 3 kritische User-Flows manuell |
| C11 | tsc 0 errors nach jedem Task |
| C12 | Vitest gruen fuer alle betroffenen Suites nach jeder Wave |

---

## 1.7 Akzeptanzkriterien

### AC1: Page-Header

```
GIVEN: User oeffnet /manager
WHEN:  Page laedt
THEN:  Page-Header zeigt:
       - Title "Manager · Dein Team-Center"
       - Stat-Pill 1: "💼 N Spieler" — N = mySquadPlayers.length (filtert isLiquidated)
       - Stat-Pill 2: "💚 X fit · Y doubt · Z inj" — health counts aus mySquadPlayers
       - Stat-Pill 3: "📅 EventName in Zd" oder "kein Event"
  AND: Tap auf "Naechstes Event" Pill → Tab wechselt zu "Aufstellen" mit dem Event vorgewaehlt
  AND NOT: Header zeigt holdings.length (das wuerde liquidierte Holdings einschliessen)
  AND NOT: Header zeigt Daten bevor useManagerData geladen (Skeleton statt 0)
  AND NOT: Header bleibt sichtbar wenn User nicht eingeloggt
```

### AC2: Tab-Navigation

```
GIVEN: User ist eingeloggt
WHEN:  /manager geoeffnet
THEN:  3 Tabs sichtbar: Aufstellen / Kader / Historie
       Default-Tab: Aufstellen
  AND: Deep-Link /manager?tab=kader → Kader Tab aktiv
  AND: Deep-Link /manager?tab=historie → Historie Tab aktiv
  AND: Tab-Wechsel updated URL ohne Page-Reload
  AND: Browser Back-Button respektiert Tab-Wechsel
  AND: Mobile (<lg): kurze Labels "Auf / Kader / Hist"
  AND NOT: Tab Bar overflow auf 360px viewport
```

### AC3: Tab 1 Aufstellen — Event Selector

```
GIVEN: 3 offene Events existieren (1 LIVE, 2 REG)
WHEN:  Aufstellen-Tab oeffnet
THEN:  EventSelector zeigt das LIVE Event als Default-Auswahl
       (Falls User schon angemeldet: das Event wo er drin ist)
  AND: Tap auf Selector → Dropdown/Bottom-Sheet mit allen 3 Events
  AND: Pro Eintrag: Status-Badge, Name, GW, Countdown, Preisgeld, Teilnehmer
  AND: Wahl eines Events → Lineup wird neu geladen via getLineup
  AND NOT: Ended Events erscheinen im Selector
  AND NOT: Cancelled Events erscheinen im Selector
```

### AC4: Tab 1 Aufstellen — LineupPanel Visual

```
GIVEN: Event-Selector hat ein 11er Event ausgewaehlt
WHEN:  Tab 1 rendert
THEN:  LineupPanel zeigt:
       - Formation Picker (4-3-3, 4-4-2, 3-5-2, etc.)
       - Pitch mit 11 Slots
       - Player-Picker pro Position (gefiltert)
       - Captain-Selection
       - Equipment-Picker pro Slot
       - Synergy-Preview
  AND: Visuell **identisch** zu LineupPanel im EventDetailModal /fantasy
  AND: Mobile vs Desktop layout unterscheidet sich nicht von EventDetailModal
  AND NOT: Sandbox-Pitch ohne Konsequenz
```

### AC5: Tab 1 Aufstellen — Direct Event Join

```
GIVEN: User ist NICHT angemeldet zum gewaehlten Event
WHEN:  User baut Lineup + tippt "Anmelden + Speichern"
THEN:  joinEvent RPC aufgerufen (Entry-Fee debitiert)
  AND: submitLineup RPC aufgerufen mit (event, lineup, formation, captain, wildcards)
  AND: equipToSlot RPC aufgerufen fuer jedes geplante Equipment
  AND: Footer wechselt zu "Aufstellung aktualisieren"
  AND: Toast "Erfolgreich angemeldet"
  AND NOT: Doppelte Anmeldung wenn User mehrfach klickt (button disabled waehrend joining)
  AND NOT: Lineup wird gespeichert ohne join (atomar)
```

### AC6: Tab 1 Aufstellen — Edit Mode

```
GIVEN: User ist bereits angemeldet zum Event
WHEN:  Tab 1 oeffnet mit dem Event ausgewaehlt
THEN:  Existing Lineup wird via getLineup geladen
  AND: Spieler im Pitch positioniert
  AND: Captain markiert
  AND: Equipment Badges sichtbar
  AND: Footer zeigt "Aufstellung aktualisieren"
  AND: Tap auf besetzten Slot → entfernt Spieler oder Confirm
  AND: Save → submitLineup mit aktualisierten Daten
```

### AC7: Tab 1 Aufstellen — Empty States

```
GIVEN: User hat 0 Holdings
WHEN:  Tab 1 oeffnet
THEN:  Anzeige "Du brauchst Spielerkarten" + CTA "Zum Markt" → /market?tab=kaufen

GIVEN: Keine offenen Events
WHEN:  Tab 1 oeffnet
THEN:  Anzeige "Aktuell laeuft kein Event" + Hinweis wann naechstes startet

GIVEN: User hat 5 Spieler, 11er Event
WHEN:  Tab 1 oeffnet
THEN:  6 leere Slots werden angezeigt mit "Spieler kaufen" CTA → /market?pos=DEF
```

### AC8: Tab 2 Kader — Visuell identisch zu BestandTab

```
GIVEN: User hat 8 Holdings
WHEN:  Tab 2 oeffnet
THEN:  Summary Stats Cards (4): Spieler, Squad-Wert, P&L, Activity
  AND: Lens-Toolbar (4 Modes: Performance, Markt, Handel, Vertrag)
  AND: Sort/Filter/Search/Group-by-Club Toolbar
  AND: 8 Player Rows mit Lens-spezifischen Datenpunkten
  AND: Visuell **identisch** zu BestandTab im /market?tab=portfolio
  AND NOT: Bestand-Tab in /market sichtbar
```

### AC9: Tab 2 Kader — Sell + Cancel + Bulk

```
GIVEN: User hat 5 Holdings, 1 listed
WHEN:  Tap "Verkaufen" auf einem Spieler
THEN:  KaderSellModal oeffnet (visuell wie BestandSellModal)
  AND: Quantity + Price input mit Validierung
  AND: Submit → onSell wird aufgerufen → success Toast
  
GIVEN: User hat aktive Listings
WHEN:  Cancel Order Action ausfuehrt
THEN:  Listing wird via cancelOrder RPC entfernt
  
GIVEN: User wechselt in Bulk-Mode
WHEN:  3 Spieler ausgewaehlt + "Sell All"
THEN:  Sequenzielle onSell Calls fuer jeden ausgewaehlten Spieler
```

### AC10: Tab 2 Kader — Detail Modal

```
GIVEN: User in Tab 2
WHEN:  Tap auf einen Player Row (nicht Sell-Button)
THEN:  PlayerDetailModal oeffnet mit 3 Sections (Stats / Form / Markt)
  AND: Mobile = Bottom-Sheet, Desktop = Centered Modal
  AND: Stats Section identisch zu heutigem IntelPanel StatsTab
  AND: Form Section identisch zu heutigem IntelPanel FormTab
  AND: Markt Section identisch zu heutigem IntelPanel MarktTab
  AND: Quick-Action "Im Lineup planen" → Tab 1 wechseln
  AND: Quick-Action "Verkaufen" → KaderSellModal oeffnen
  AND: Close-Button schliesst Modal, kein Player ausgewaehlt
```

### AC11: Tab 3 Historie — Liste

```
GIVEN: User hat 12 vergangene Events gespielt
WHEN:  Tab 3 oeffnet
THEN:  Stats-Box oben: "Events: 12 · Top 10: 8 · Wins: 2 · Total: 1.450 CR"
  AND: Liste mit 12 HistoryEventCards (Compact-State)
  AND: Pro Card: Event-Name, GW, Datum, 3 KPI-Pills (Score, Rank mit Color, Reward)
  AND: Default-Sort: Datum desc (neueste oben)
  AND: Filter: Zeitraum (Alle/30d/90d/Saison), Format (Alle/11er/7er), Status (Alle/Top3/Top10/Sonstige)
  AND: Tap "Aufstellung anzeigen ▾" → Card expandiert
  AND: Single Open Behavior — beim Expand einer neuen Card schliesst die vorher offene
  AND NOT: Lineup-Snapshots werden eager geladen (Performance)
  AND NOT: Mehrere Cards gleichzeitig expanded (Single Open enforced)
```

**Future Enhancement (Anil 2026-04-07):** History-Liste eventuell als horizontale Slidebar/Carousel statt vertikale Liste. Nicht in v1, evaluieren nach Launch wenn User-Feedback es nahelegt.

### AC12: Tab 3 Historie — Expand + Lineup-Snapshot

```
GIVEN: HistoryEventCard im Compact-State
WHEN:  Tap "Aufstellung anzeigen ▾"
THEN:  getLineup(eventId, userId) wird aufgerufen (lazy)
  AND: Mini-Pitch mit den Spielern aus dem Event rendert
  AND: Pro Slot: Foto, Slot-Score, Captain-Crown wenn Captain
  AND: Equipment-Items + Synergy-Bonus angezeigt
  AND: Quick-Action "In neue Aufstellung uebernehmen"
  AND: Tap-Wechsel zu anderem Card → vorheriger schliesst, neuer expandiert (oder beides offen?)
  AND NOT: Re-Fetch wenn schon in Cache (staleTime: Infinity)
```

### AC13: Tab 3 Historie — Cross-Tab "Aufstellung uebernehmen"

```
GIVEN: User in Tab 3, Event-Card expanded
WHEN:  Tap "In neue Aufstellung uebernehmen"
THEN:  Tab wechselt zu Tab 1 (Aufstellen)
  AND: Wenn Event-Selector noch leer → naechstes offenes Event vorgewaehlt
  AND: Lineup wird mit den Spielern aus Historie vorbefuellt
  AND: Verkaufte Spieler bleiben leere Slots
  AND: Toast "X Spieler nicht mehr im Bestand" wenn welche fehlen
  AND NOT: Captain wird automatisch gesetzt (User muss neu waehlen)
```

### AC14: /market funktioniert ohne Bestand

```
GIVEN: Bestand wurde aus /market migriert
WHEN:  User oeffnet /market
THEN:  Portfolio-Tab Sub-Tabs: Angebote + Watchlist (kein Bestand)
  AND: Default-SubTab: **'angebote'** (Anil bestaetigt 2026-04-07)
  AND: Marktplatz-Tab unveraendert (Club Verkauf, Transferliste, Trending)
  AND: Filters und Search funktionieren
  AND NOT: Console errors zu fehlendem BestandTab
  AND NOT: marketStore Field-References auf bestand* in PortfolioTab
  AND NOT: marketStore enthaelt expandedClubs Field (wandert nach managerStore)
```

### AC15: Redirects + Link-Updates

```
GIVEN: Existing Bookmark zu /market?tab=portfolio
WHEN:  User folgt dem Link
THEN:  301 Redirect zu /manager?tab=kader

GIVEN: Existing Bookmark zu /market?tab=portfolio&sub=bestand
WHEN:  User folgt dem Link
THEN:  301 Redirect zu /manager?tab=kader

GIVEN: Home Page mit PortfolioStrip
WHEN:  User tippt "Mein Spielerkader"
THEN:  Navigiert direkt zu /manager?tab=kader (nicht via Redirect)
```

### AC16: Invarianten-Check (Regression-Sicherheit)

```
GIVEN: Manager Team-Center deployed
WHEN:  Alle Aenderungen live
THEN:  /fantasy EventDetailModal Lineup-Tab funktional unveraendert
  AND: Lineup speichern in /fantasy klappt
  AND: Equipment in /fantasy zuweisen klappt
  AND: /market Marktplatz-Tab unveraendert
  AND: /market Portfolio-Tab Angebote + Watchlist funktional
  AND: tsc --noEmit: 0 errors
  AND: Vitest betroffene Suites gruen
  AND: 0 Console-Errors auf jeder /manager Tab
  AND: Profile View (TraderTab) Fantasy-History identisch zu Tab 3
  AND: SideNav + BottomNav Manager-Eintraege funktional
```

---

## SPEC GATE Checklist

- [x] Section 1.1 Current State komplett — alle 4 Bereiche, jedes Feature nummeriert
- [x] Section 1.2 Goals + Non-Goals + Anti-Requirements
- [x] Section 1.3 Migration Map — fuer JEDES Feature (15 MA + 14 BT + 15 LP + 2 FH + 8 NEU = 54 Features)
- [x] Section 1.4 Blast Radius — 7 Areas mit 3-Grep + 4 Cross-Over Analyses
- [x] Section 1.5 Pre-Mortem mit 12 Failure Scenarios + Mitigations
- [x] Section 1.6 Invarianten (12) + Constraints (12)
- [x] Section 1.7 Akzeptanzkriterien (16 ACs)
- [x] **Open Questions Q1-Q6 von Anil beantwortet (2026-04-07)**
- [x] **Anil hat die Spec reviewed und abgenommen (2026-04-07)**

**SPEC GATE PASSED 2026-04-07** — bereit fuer PHASE 2 PLAN.

---

## Open Questions — beantwortet von Anil 2026-04-07

| # | Frage | Antwort |
|---|-------|---------|
| Q1 | `marketStore.expandedClubs` shared? | **Nur BestandTab** → wandert nach `managerStore.expandedClubs` |
| Q2 | PortfolioTab Default-SubTab nach Bestand-Removal? | **`'angebote'`** (Trading-relevant) |
| Q3 | History Cards Single oder Multi Open? | **Single Open** + Future Enhancement: evtl. horizontale Slidebar/Carousel (nicht in v1) |
| Q4 | localStorage Migration alte Manager-Presets? | **Stille Loeschung** — alte Presets waren nie funktional persistent |
| Q5 | LineupPanel Hook Extraction Wave 0 oder Direct? | **Option 1: Wave 0 dedicated** Hook-Extraction (`useLineupBuilder`) — reines Refactoring, alte Tests gruen |
| Q6 | PageHeader Stats Datenquelle? | **`mySquadPlayers.length`** (filtert isLiquidated, konsistent) |
