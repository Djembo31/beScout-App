# Manager Command Center — Engineering Specification

> **Status:** Draft — wartet auf Anil Review
> **Erstellt:** 2026-04-06 | **Basis:** Design Doc 2026-04-03 (von Anil approved)
> **Scope:** NUR /manager Command Center. Market bleibt unverändert.
> **Vorgänger:** `2026-04-03-manager-market-redesign.md` (Design), `2026-04-03-manager-market-implementation.md` (alter Plan)

---

## Entscheidungen (Anil, 2026-04-06)

| # | Frage | Entscheidung |
|---|-------|-------------|
| 1 | BottomNav | Manager rein, **Club raus** → 5 Items: Home, Fantasy, Manager, Market, Community |
| 2 | Equipment | Auf Manager-Pitch zeigen + vorplanen (localStorage) |
| 3 | Scope | Nur Manager Command Center. Market Redesign = separate Session |

---

## 1.1 Current State

### Feature Inventory (was User SIEHT und TUN kann bei /manager)

| # | Feature | Beschreibung | Quelle |
|---|---------|-------------|--------|
| F1 | Titel | "Manager" Heading | ManagerContent.tsx:36 |
| F2 | Squad-Size Toggle | Wechsel zwischen 6er und 11er Formation | KaderTab via useKaderState |
| F3 | Formation Picker | Dropdown: 4-3-3, 4-4-2, 3-5-2, 3-4-3, 4-2-3-1 (je nach Size) | KaderTab via constants.ts |
| F4 | Squad Pitch | SVG-Fussballfeld mit Spieler-Kreisen (Initialen + L5 Badge + Name) | SquadPitch.tsx |
| F5 | Player Assignment | Tap leeren Slot → Side Panel öffnet → Spieler wählen → zuweisen | useKaderState.handleSlotClick/handlePickPlayer |
| F6 | Player Removal | Tap besetzten Slot → Spieler entfernen | useKaderState.handleSlotClick |
| F7 | Preset Save/Load | Bis zu 5 Presets in localStorage speichern/laden | useKaderState + SQUAD_PRESET_KEY |
| F8 | Squad Summary Stats | Kaderwert, Lineup X/Y, Ø L5, Portfolio-%, Positionsverteilung | SquadSummaryStats.tsx |
| F9 | Manager Player Rows | Vertikale Liste: Photo, Name, L5, FormBars, Next Fixture, Event-Status | KaderTab ManagerPlayerRow |
| F10 | Player Picker Side Panel | Filtered by Position, sortierbar (Perf/Price/Name), Suchfeld | KaderTab pickerPlayers logic |
| F11 | Position Grouping | Player Rows gruppiert nach GK/DEF/MID/ATT mit farbigen Dividers | KaderTab |
| F12 | Player Links | Jeder Player Row linkt zu `/player/{id}` | KaderTab ManagerPlayerRow |

### Was FEHLT (laut Design Doc + Equipment Update)

| # | Feature | Status |
|---|---------|--------|
| M1 | StatusBar (Squad Health + Event Countdown + Portfolio Trend) | Nicht gebaut |
| M2 | IntelPanel (Stats/Form/Markt — 3 Tabs) | Nicht gebaut |
| M3 | SquadStrip (horizontaler Player Bar statt vertikaler Liste) | Nicht gebaut |
| M4 | Equipment auf Pitch (Badges + Vorplanung) | Nicht gebaut (System seit 06.04. live) |
| M5 | Event Prep Mode (Overlay mit Event-Requirements) | Nicht gebaut |
| M6 | Deep-Links Manager → Market | Nicht gebaut |
| M7 | Fitness/Injury Dots auf Pitch-Slots | Nicht gebaut (StatusDot existiert nur in PlayerRow) |
| M8 | Lock-Icons auf Pitch (Event-committed) | Nicht gebaut |
| M9 | BottomNav Manager-Eintrag | Nicht vorhanden (nur SideNav) |

### File Inventory

| Datei | Zeilen | Rolle |
|-------|--------|-------|
| `src/app/(app)/manager/page.tsx` | 6 | Route → dynamic import ManagerContent |
| `src/app/(app)/manager/loading.tsx` | ~10 | Skeleton |
| `src/features/manager/components/ManagerContent.tsx` | 40 | Placeholder: Title + KaderTab |
| `src/features/market/components/portfolio/KaderTab.tsx` | ~800 | Gesamte Manager-Logik (wird refactored) |
| `src/features/market/components/portfolio/useKaderState.ts` | 206 | State-Management Hook |
| `src/features/market/components/portfolio/SquadPitch.tsx` | 119 | SVG Pitch Visualisierung |
| `src/features/market/components/portfolio/SquadSummaryStats.tsx` | ~80 | Stats-Leiste |
| `src/features/market/components/portfolio/constants.ts` | ~100 | FORMATIONS, DEFAULTS |
| `src/features/market/components/portfolio/types.ts` | ~40 | FormationId, SquadPreset, etc. |
| `src/features/market/components/portfolio/helpers.ts` | ~60 | getPosColor, getScoreColor, getSlotPosition |
| `src/lib/queries/managerData.ts` | 41 | useRecentMinutes, useRecentScores, useNextFixtures, usePlayerEventUsage |
| `src/lib/nav.ts` | 42 | NAV_MAIN (Manager bereits drin) |
| `src/components/layout/BottomNav.tsx` | 79 | Mobile Nav (Manager NICHT drin, Club drin) |
| `src/components/gamification/EquipmentPicker.tsx` | ~150 | Equipment-Auswahl (reusable) |
| `src/components/gamification/EquipmentBadge.tsx` | ~60 | Equipment-Badge (reusable) |
| `src/lib/services/equipment.ts` | ~80 | Equipment Service |
| `src/lib/queries/equipment.ts` | ~30 | useEquipmentDefinitions, useUserEquipment |

### Data Flow

```
ManagerContent
  └─ useMarketData(userId)          → players, mySquadPlayers, playersLoading
  └─ KaderTab
       └─ useKaderState()
            ├─ useRecentMinutes()       → Map<playerId, number[]>     (5min stale)
            ├─ useRecentScores()        → Map<playerId, number[]>     (5min stale)
            ├─ useNextFixtures()        → Map<clubId, NextFixtureInfo> (10min stale)
            └─ usePlayerEventUsage(uid) → Map<playerId, EventUsage[]> (2min stale)
       └─ SquadPitch (formation, assignments, onSlotClick)
       └─ SquadSummaryStats (players, ownedPlayers, assignedCount, totalSlots)
       └─ ManagerPlayerRow × N (player, scores, nextFixture, isAssigned)
```

**Equipment Queries (existieren, werden noch nicht von Manager genutzt):**
```
useUserEquipment(userId)       → DbUserEquipment[]  (30s stale)
useEquipmentDefinitions()      → DbEquipmentDef[]   (5min stale)
useEquipmentRanks()            → DbEquipmentRank[]  (5min stale)
```

### External Links TO /manager

| Quelle | Datei | Zeile | Kontext |
|--------|-------|-------|---------|
| SideNav | `src/lib/nav.ts` | 24 | `{ label: 'manager', href: '/manager', icon: ClipboardList }` |
| (BottomNav fehlt) | `src/components/layout/BottomNav.tsx` | — | Manager NICHT in BOTTOM_TABS |

### External Links FROM /manager

| Ziel | Datei | Kontext |
|------|-------|---------|
| `/player/{id}` | KaderTab ManagerPlayerRow | Jeder Spieler verlinkt |

### Shared State

| Typ | Key | Genutzt von |
|-----|-----|-------------|
| React Query | `qk.fixtures.recentMinutes` | Manager (useKaderState), BestandTab |
| React Query | `qk.fixtures.recentScores` | Manager, BestandTab, TransferListSection, ClubAccordion |
| React Query | `qk.fixtures.nextByClub` | Manager (useKaderState) |
| React Query | `qk.events.usage(userId)` | Manager (useKaderState) |
| React Query | `qk.equipment.inventory(userId)` | Fantasy EventDetailModal (NEU für Manager) |
| React Query | `qk.equipment.definitions` | Fantasy EventDetailModal (NEU für Manager) |
| localStorage | `SQUAD_PRESET_KEY` | useKaderState |
| localStorage | `SQUAD_SIZE_KEY` | useKaderState |

---

## 1.2 Goals + Non-Goals + Anti-Requirements

### Goals

| # | Ziel | Messbar |
|---|------|---------|
| G1 | 4-Zonen Layout: StatusBar + TacticalBoard + IntelPanel + SquadStrip | Alle 4 sichtbar auf Desktop, 3 + Bottom Sheet auf Mobile |
| G2 | IntelPanel zeigt Spieler-Kontext (Stats/Form/Markt) ohne Seitenwechsel | 3 Tabs funktional, Daten korrekt |
| G3 | Equipment-Inventar sichtbar + auf Pitch vorplanbar | EquipmentBadge auf Slots, EquipmentPicker öffnet, Auswahl in Preset gespeichert |
| G4 | BottomNav: Manager rein, Club raus (5 Items) | Navigation funktional auf Mobile |
| G5 | Fitness/Injury/Lock Dots auf Pitch-Slots | StatusDot + Lock-Icon auf jedem besetzten Slot |
| G6 | Deep-Links Manager → Market für "Spieler kaufen" | `/market?player={id}` und `/market?pos={pos}` funktional |
| G7 | SquadStrip ersetzt vertikale Player-Liste | Horizontal scrollbar, Position-gruppiert, Sort/Filter |

### Non-Goals

- Market-Seite redesignen (separate Session)
- Market → Manager Deep-Links (erst wenn Market redesigned)
- Neue RPCs oder DB-Tabellen
- Fantasy-Lineup Submission aus Manager heraus
- TickerBar (niedr. Priorität)
- Drag & Drop auf Mobile
- Event Prep Mode (Phase 2, nach Basis-Launch)

### Anti-Requirements

- **KEIN DB-Write aus Manager** — Manager = localStorage Planning Layer
- **KEINE Duplikation** von EquipmentPicker/EquipmentBadge — gleiche Components
- **KEINE neuen API-Calls** die nicht durch bestehende Queries abgedeckt
- **KEIN KaderTab-Copy** — Logik extrahieren, nicht kopieren
- **KEINE Market-Page Änderungen** außer BottomNav

---

## 1.3 Feature Migration Map

| # | Feature | Aktuell | Ziel | Aktion |
|---|---------|---------|------|--------|
| F1 | Titel "Manager" | ManagerContent h1 | StatusBar integriert | **REMOVE** (Titel wird Teil von StatusBar) |
| F2 | Squad-Size Toggle | KaderTab | TacticalBoard Header | **MOVE** |
| F3 | Formation Picker | KaderTab | TacticalBoard Header | **MOVE** |
| F4 | Squad Pitch | SquadPitch.tsx | TacticalBoard (enhanced) | **ENHANCE** (+ Fitness Dots, Lock Icons, Equipment Badges) |
| F5 | Player Assignment | useKaderState → Side Panel | SquadStrip Tap → Assign | **ENHANCE** (SquadStrip statt Side Panel) |
| F6 | Player Removal | Tap auf besetzten Slot | Tap auf besetzten Slot (unchanged) | **STAYS** |
| F7 | Preset Save/Load | KaderTab UI | TacticalBoard Footer | **MOVE** + **ENHANCE** (Equipment in Presets) |
| F8 | Squad Summary Stats | SquadSummaryStats.tsx | StatusBar (merged) | **MERGE** into StatusBar |
| F9 | Manager Player Rows | KaderTab (vertikal) | SquadStrip (horizontal) | **TRANSFORM** |
| F10 | Player Picker Side Panel | KaderTab | SquadStrip + IntelPanel | **TRANSFORM** |
| F11 | Position Grouping | KaderTab Dividers | SquadStrip Position-Color Dividers | **MOVE** |
| F12 | Player Links | ManagerPlayerRow | IntelPanel + SquadStrip | **MOVE** |
| M1 | StatusBar | — | Neue Komponente | **NEW** |
| M2 | IntelPanel (3 Tabs) | — | Neue Komponente (Desktop: rechts, Mobile: Bottom Sheet) | **NEW** |
| M3 | SquadStrip | — | Neue Komponente (horizontal scroll) | **NEW** |
| M4 | Equipment auf Pitch | — | EquipmentBadge auf Slots + EquipmentPicker | **NEW** (reuse existing components) |
| M5 | Fitness/Lock Dots | StatusDot nur in PlayerRow | Auf Pitch-Slots | **NEW** (reuse StatusDot pattern) |
| M6 | Deep-Links → Market | — | IntelPanel MarktTab + Empty Slot CTA | **NEW** |
| M7 | BottomNav Manager | — | BOTTOM_TABS Update | **NEW** |

**Regel-Check:** Jedes Feature hat eine Zeile. Kein Feature unaccounted. ✓

---

## 1.4 Blast Radius Map

### Direkte Änderungen

| Datei | Änderung | Begründung |
|-------|----------|-----------|
| `src/features/manager/components/ManagerContent.tsx` | **REWRITE** | Neue 4-Zonen Composition |
| `src/components/layout/BottomNav.tsx` | **MODIFY** | Club raus, Manager rein |
| `src/features/market/components/portfolio/SquadPitch.tsx` | **ENHANCE** | + Equipment, Fitness, Lock Props |

### Neue Dateien

| Datei | Zweck |
|-------|-------|
| `src/features/manager/components/StatusBar.tsx` | Zone 1: Health + Event + Trend |
| `src/features/manager/components/TacticalBoard.tsx` | Zone 2: Pitch + Formation + Presets |
| `src/features/manager/components/IntelPanel.tsx` | Zone 3: Shell + 3 Tab-Buttons |
| `src/features/manager/components/intel/StatsTab.tsx` | L5, Season Stats, Fitness, Next Fixture |
| `src/features/manager/components/intel/FormTab.tsx` | Score Sparkline, Event History, Club Results |
| `src/features/manager/components/intel/MarktTab.tsx` | Holdings, P&L, Floor, Deep-Links |
| `src/features/manager/components/SquadStrip.tsx` | Zone 4: Horizontaler Player Bar |
| `src/features/manager/store/managerStore.ts` | Zustand Store (UI State) |
| `src/features/manager/hooks/useManagerData.ts` | Orchestrates all queries |
| `src/features/manager/lib/formations.ts` | Formation-Daten (extracted from market/portfolio/constants) |

### 3-Grep: Consumer Analysis

**SquadPitch.tsx** (wird enhanced):
```
Direct:   KaderTab.tsx (einziger Import)
Indirect: ManagerContent.tsx → KaderTab → SquadPitch
Runtime:  Keine Query Keys, kein Store
```
→ **Sicher zu enhancen.** Nur Manager-Pfad betroffen. Market nutzt SquadPitch NICHT.

**BottomNav.tsx** (wird geändert):
```
Direct:   layout.tsx (einziger Import)
Indirect: Alle (app) Pages rendern BottomNav via Layout
Runtime:  usePathname() für Active-State, useClub() für Club-Link
```
→ **Club-Link Logik entfernen.** Alle Pages weiterhin erreichbar. Club bleibt in SideNav (NAV_MAIN).

**KaderTab.tsx** (bleibt bestehen, wird aber nicht mehr von Manager importiert):
```
Direct:   ManagerContent.tsx (einziger Import)
Tests:    KaderTab.test.tsx, useKaderState.test.ts
Indirect: Keine anderen Consumer
```
→ **KaderTab NICHT löschen** in dieser Spec. ManagerContent hört auf KaderTab zu importieren. KaderTab + Tests bleiben als Fallback. Cleanup in separater Session.

**useKaderState.ts** (Logik wird extrahiert):
```
Direct:   KaderTab.tsx (einziger Import)
Tests:    useKaderState.test.ts
```
→ **Logik in neuen useManagerData Hook extrahieren.** useKaderState bleibt (KaderTab lebt weiter). Kein Breaking Change.

**Equipment Components** (werden von Manager genutzt):
```
EquipmentPicker: EventDetailModal.tsx (einziger Consumer)
EquipmentBadge:  LineupPanel.tsx (einziger Consumer)
```
→ **Manager wird zweiter Consumer.** Components bleiben unverändert. Parent-Callbacks steuern Verhalten (Fantasy: RPC, Manager: localStorage).

**managerData.ts Queries** (werden von Manager UND Market genutzt):
```
useRecentMinutes:       useKaderState.ts, BestandTab.tsx
useRecentScores:        useKaderState.ts, BestandTab.tsx, TransferListSection.tsx, ClubAccordion.tsx
useNextFixtures:        useKaderState.ts, BestandTab.tsx
usePlayerEventUsage:    useKaderState.ts, BestandTab.tsx
```
→ **Shared Queries.** React Query Cache shared. Keine Duplikation. Manager-Hook wrapped diese.

### Cross-Over Analysis

#### Cross-Over: Manager ↔ Fantasy

| Berührungspunkt | Risiko | Mitigation |
|----------------|--------|------------|
| Equipment-Planung (Manager) vs Equipment-Zuweisung (Fantasy) | User plant Equipment in Manager, geht zu Fantasy, Equipment-Items sind dort "available" | Manager speichert Equipment-Plan NUR in localStorage. Fantasy liest nur DB (user_equipment). Kein Konflikt. |
| Formation-Presets (Manager) vs Lineup-Submission (Fantasy) | User erwartet: "Meine Manager-Formation = mein Event-Lineup" | Kein Auto-Sync. Deep-Link "In Event übernehmen" = Future Feature (nicht v1). |
| SquadPitch (Manager) vs LineupPanel (Fantasy) | Visuelle Ähnlichkeit, aber unterschiedliche Datenmodelle | Manager: `Map<slotIndex, playerId>`. Fantasy: `lineups.slot_gk`, `lineups.slot_def1`, etc. Kein Shared State. |

#### Cross-Over: Manager ↔ Market

| Berührungspunkt | Risiko | Mitigation |
|----------------|--------|------------|
| useMarketData Hook | Manager und Market laden gleiche Spieler-Daten | React Query Cache shared. Eine Query, zwei Seiten. |
| Deep-Links Manager → Market | URL-Params (`?player=X`, `?pos=DEF`) müssen von Market-Seite geparst werden | Market parst bereits `searchParams` on mount (MarketContent.tsx). Nur Param-Namen verifizieren. |
| BottomNav Änderung | Market-Link könnte Active-State verlieren | `pathname.startsWith('/market')` bleibt korrekt. |

#### Cross-Over: Manager ↔ Navigation

| Berührungspunkt | Risiko | Mitigation |
|----------------|--------|------------|
| Club aus BottomNav entfernen | User finden Club nicht mehr auf Mobile | Club bleibt in SideNav (NAV_MAIN). SideNav = Hamburger auf Mobile. |
| Manager Active-State in BottomNav | `pathname.startsWith('/manager')` muss matchen | Einfacher String-Match, kein Edge Case. |

#### Cross-Over: Manager ↔ Equipment System

| Berührungspunkt | Risiko | Mitigation |
|----------------|--------|------------|
| Equipment-Inventar Anzeige | Items können consumed sein (nach Event-Scoring) | `useUserEquipment(userId)` filtert bereits `consumed_at IS NULL` |
| Equipment-Planung auf Pitch | User plant Item das dann in Mystery Box "verbraucht" wird | Manager-Plan = localStorage Suggestion. Beim Laden: prüfen ob Item noch existiert (ID in Inventar?). Fehlende Items = Badge nicht anzeigen. |
| Position-Matching | Equipment hat Position-Constraint (fire_shot = ATT only) | EquipmentPicker filtert bereits nach Position. Gleiche Logik in Manager. |

---

## 1.5 Pre-Mortem

> "Es ist 2 Wochen später. Der Manager Command Center Launch ist gescheitert. Was ist passiert?"

| # | Failure Scenario | Wahrscheinlichkeit | Mitigation |
|---|-----------------|-------------------|------------|
| 1 | **KaderTab-Logik dupliziert statt extrahiert.** useKaderState lebt weiter, neuer Hook macht das Gleiche. Bugs müssen an zwei Stellen gefixt werden. | Hoch | Neuer `useManagerData` Hook importiert Queries direkt aus `managerData.ts`. KaderTab bleibt als separater Consumer. KEINE Logik-Kopie. |
| 2 | **SquadPitch Enhancement bricht KaderTab.** Neue Props (equipment, fitness) sind required statt optional → KaderTab kompiliert nicht. | Mittel | Alle neuen Props sind **optional** mit `?`. Default-Verhalten = wie bisher. KaderTab muss 0 Änderungen bekommen. |
| 3 | **Equipment-Plan veraltet.** User plant 3 Equipment-Items im Manager, öffnet Mystery Box, verbraucht 2, Manager zeigt noch 3. | Mittel | Beim Rendern: Equipment-IDs aus localStorage gegen `useUserEquipment()`-Result validieren. Fehlende IDs = Badge entfernen + localStorage bereinigen. |
| 4 | **BottomNav Club-Entfernung irritiert User.** User tippt wo Club war, landet jetzt auf Market. | Niedrig | Club war Position 4 (von 5). Neue Reihenfolge: Home, Fantasy, Manager, Market, Community. Market rutscht auf alte Club-Position. Gewöhnung nötig, aber kein Funktionsverlust. |
| 5 | **IntelPanel Queries verlangsamen Page Load.** 3 zusätzliche Queries (Score History, Event History, Price History) feuern beim Mount. | Hoch | IntelPanel Queries sind **on-demand**: `enabled: !!selectedPlayerId`. Tabs sind **tab-gated**: Form-Tab Query feuert nur wenn Form-Tab aktiv. Kein Query ohne User-Interaktion. |
| 6 | **Mobile Bottom Sheet IntelPanel blockiert Pitch-Interaktion.** User kann Pitch nicht sehen während IntelPanel offen. | Mittel | Bottom Sheet = 50% Höhe (half-sheet). Pitch bleibt sichtbar oben. Swipe-down schließt. Tap auf Pitch schließt ebenfalls. |
| 7 | **Equipment-Badges überlagern L5-Badges auf kleinen Screens.** Pitch-Slots haben 44px, L5 Badge top-right, Equipment Badge bottom-right. Beides gleichzeitig = visuelles Chaos. | Mittel | Equipment Badge = `bottom-left` (nicht bottom-right wie in LineupPanel). Größe `sm` (8px Text). Auf Mobile (<md): Equipment Badge nur als farbiger Dot ohne Text. |

---

## 1.6 Invarianten + Constraints

### Invarianten (darf sich NICHT ändern)

| # | Invariante | Prüfung |
|---|-----------|---------|
| I1 | `/market` Seite funktioniert identisch wie vorher | Market-Tests grün, manueller Smoke Test |
| I2 | KaderTab + Tests kompilieren und laufen | `npx vitest run src/features/market/components/portfolio/__tests__/` |
| I3 | Bestehende Links zu `/manager` und `/market` funktionieren | Navigation testen |
| I4 | Equipment-System (Mystery Box, Fantasy Lineup) unverändert | Fantasy Event Lineup mit Equipment funktional |
| I5 | Alle 4 Manager Data Queries liefern gleiche Daten | Keine Query-Änderung |
| I6 | SideNav zeigt weiterhin Club | NAV_MAIN enthält Club-Eintrag |

### Constraints (harte Grenzen)

| # | Constraint |
|---|-----------|
| C1 | Max 10 neue Dateien pro Wave |
| C2 | MOVE und CHANGE nie im selben Schritt |
| C3 | Alle neuen SquadPitch Props sind **optional** (Rückwärtskompatibilität) |
| C4 | Manager = localStorage. KEIN DB-Write, KEIN neuer RPC |
| C5 | Equipment-Planung = localStorage Suggestion. Nicht DB-persistent. |
| C6 | Queries on-demand (enabled: !!condition). Kein Query beim Mount ohne User-Aktion. |
| C7 | BottomNav bleibt bei 5 Items |
| C8 | Touch Targets min 44px (Mobile) |
| C9 | IntelPanel Mobile = Bottom Sheet (Modal mit BottomSheet-Verhalten) |
| C10 | Kein Push ohne Self-Test (navigieren, klicken, interagieren) |

---

## 1.7 Akzeptanzkriterien

### AC1: StatusBar

```
GIVEN: User hat 8 owned Players (6 fit, 1 doubtful, 1 injured)
       Nächstes Event: "Süper Lig GW28" in 2 Tagen
       Portfolio Trend: +8.3% diese Woche
WHEN:  User öffnet /manager
THEN:  StatusBar zeigt:
       - "6 fit · 1 fraglich · 1 verletzt" mit grün/gelb/rot Dots
       - "Süper Lig GW28 · 2d" mit Event-Icon
       - "+8.3% ↑" in Grün
  AND: Tap auf Event-Section → navigiert zu /fantasy (Deep-Link)
  AND: Tap auf Portfolio-Trend → navigiert zu /market
  AND NOT: StatusBar zeigt Daten bevor Queries geladen (Skeleton statt Nullen)
```

### AC2: TacticalBoard

```
GIVEN: User hat Spieler auf dem Pitch und 11er-Formation 4-3-3
WHEN:  User sieht das TacticalBoard
THEN:  Pitch zeigt 11 Slots in korrekter 4-3-3 Anordnung
       Besetzte Slots: Photo-Kreis + L5 Badge (top-right) + Name
       Leere Slots: Gestrichelt + Position-Label + Plus-Icon
  AND: Fitness-Dot (grün/gelb/rot) auf jedem besetzten Slot (top-left)
  AND: Lock-Icon auf Spielern die in einem Event committed sind
  AND: Equipment-Badge (bottom-left) wenn Equipment geplant
  AND: Tap auf besetzten Slot → IntelPanel öffnet mit Spieler-Daten
  AND: Tap auf leeren Slot → SquadStrip filtert auf passende Position
  AND NOT: Tap auf Equipment-Badge triggert Player-Removal (stopPropagation)
```

### AC3: IntelPanel — Stats Tab

```
GIVEN: User hat Spieler "Hakan Yilmaz" (MID, L5=78, fit) auf Pitch getappt
WHEN:  IntelPanel öffnet (Desktop: rechts, Mobile: Bottom Sheet)
THEN:  Stats Tab zeigt:
       - L5: 78 (groß, farbig) + Trend-Pfeil
       - Letzte 5 Scores als Mini-Bar-Chart
       - Season: Spiele, Tore, Assists, Minuten
       - Fitness: 100% (grüner Balken)
       - Nächstes Spiel: "Göztepespor (A) · Mo 14.04"
       - Alter, Vertrag, Position
  AND NOT: Daten von einem anderen Spieler angezeigt
  AND NOT: Flash of Empty State vor Datenladung
```

### AC4: IntelPanel — Form Tab

```
GIVEN: Spieler ausgewählt, Form-Tab getappt
WHEN:  Form-Tab rendert
THEN:  Score-Sparkline (letzte 10 GW Scores) sichtbar
       Event-History: letzte 3 Events wo der Spieler im Lineup war + Score
  AND: Daten laden erst nach Tab-Tap (tab-gated query)
  AND NOT: Leere Sparkline wenn Spieler <10 GWs hat (zeige verfügbare Daten)
```

### AC5: IntelPanel — Markt Tab

```
GIVEN: Spieler ausgewählt, User hält 3x diesen Spieler, Markt-Tab getappt
WHEN:  Markt-Tab rendert
THEN:  Zeigt: 3x gehalten, Ø Kaufpreis, Floor Price, P&L (absolut + %)
       7d Sparkline (falls Daten vorhanden)
       Quick-Links: "Auf Transfermarkt →" (Link zu /market?player={id})
  AND: "Verkaufen" Link zu /market?sell={id}
  AND NOT: Falsche P&L-Berechnung (muss mit BestandTab identisch sein)
```

### AC6: SquadStrip

```
GIVEN: User hat 12 owned Players (2 GK, 4 DEF, 3 MID, 3 ATT)
WHEN:  SquadStrip rendert
THEN:  Horizontal scrollbare Leiste mit 12 Mini-Cards
       Gruppiert: GK (grün) | DEF (amber) | MID (sky) | ATT (rose) mit Farb-Dividers
       Jede Card: Photo (32px), Name (truncated), L5 Badge, Fitness-Dot
       Spieler auf Pitch: ✓ Checkmark-Overlay
       Spieler in Event: 🔒 Lock-Badge
  AND: Sort-Buttons: Form | Wert | Fitness | Alpha
  AND: Position-Filter: Alle | GK | DEF | MID | ATT
  AND: Tap Card → IntelPanel zeigt Spieler-Daten
  AND: Double-Tap oder "Aufstellen" in IntelPanel → weist Slot zu
  AND NOT: Horizontal-Overflow außerhalb des Strip-Containers
```

### AC7: Equipment auf Pitch

```
GIVEN: User hat 3 Equipment Items (fire_shot R2, iron_wall R3, captain R1)
       User hat ATT Slot mit Spieler besetzt, plant fire_shot dort
WHEN:  Equipment-Badge auf Pitch sichtbar
THEN:  Badge zeigt: Flammen-Icon + "R2" + "×1.10"
       Badge-Position: bottom-left des Slots (nicht überlappend mit L5 top-right)
  AND: Tap auf Badge → EquipmentPicker öffnet (gefiltert auf Position)
  AND: Auswahl wird in localStorage Preset gespeichert
  AND NOT: Equipment-Badge für Items die consumed sind (consumed_at NOT NULL)
  AND NOT: Equipment-Badge für Items die nicht zur Position passen
```

### AC8: BottomNav

```
GIVEN: User ist auf Mobile (< lg breakpoint)
WHEN:  BottomNav rendert
THEN:  5 Items: Home, Fantasy, Manager, Market, Community
       Manager-Icon = ClipboardList
       Club ist NICHT in BottomNav
  AND: Tap Manager → navigiert zu /manager, Active-State korrekt (Gold + Glow)
  AND: Club weiterhin über SideNav erreichbar (Hamburger-Menü)
  AND NOT: 6 Items in BottomNav
```

### AC9: Mobile Layout

```
GIVEN: User ist auf Mobile (360px Viewport)
WHEN:  /manager öffnet
THEN:  Layout vertikal:
       StatusBar (kompakt, 1-2 Zeilen)
       TacticalBoard (full width, touch-optimiert)
       SquadStrip (horizontal scroll, full width)
  AND: Tap Spieler → Bottom Sheet öffnet mit IntelPanel (50% Höhe)
  AND: Swipe-down auf Bottom Sheet → schließt
  AND: Tap auf Pitch während Bottom Sheet offen → schließt Bottom Sheet
  AND NOT: Inhalt unter BottomNav versteckt (safe-area padding)
```

### AC10: Desktop Layout

```
GIVEN: User ist auf Desktop (≥ lg breakpoint, 1280px+)
WHEN:  /manager öffnet
THEN:  Layout:
       StatusBar (full width, single row)
       TacticalBoard (left ~60%) + IntelPanel (right ~40%)
       SquadStrip (full width, bottom)
  AND: IntelPanel ist immer sichtbar (kein Bottom Sheet)
  AND: Kein Spieler ausgewählt → IntelPanel zeigt Squad-Zusammenfassung
  AND NOT: IntelPanel kollapst auf Desktop
```

### AC11: Deep-Links Manager → Market

```
GIVEN: User ist auf /manager, IntelPanel offen für Spieler X
WHEN:  User tappt "Auf Transfermarkt →" in Markt-Tab
THEN:  Navigiert zu /market?player={X.id}
  AND: Market-Seite öffnet (bestehende Seite, unverändert)

GIVEN: User tappt leeren Slot (Position DEF)
WHEN:  "Spieler suchen" CTA erscheint
THEN:  Tap → navigiert zu /market?pos=DEF
```

### AC12: Invarianten-Check

```
GIVEN: Manager Command Center ist deployed
WHEN:  Alle Änderungen live
THEN:  /market zeigt identische Funktionalität wie vorher
  AND: KaderTab.test.tsx: alle Tests grün
  AND: useKaderState.test.ts: alle Tests grün
  AND: tsc --noEmit: 0 Fehler
  AND: Fantasy Event Lineup mit Equipment: funktional
  AND: SideNav zeigt Club
```

---

## SPEC GATE Checklist

- [x] Current State komplett (12 Features nummeriert)
- [x] Migration Map für JEDES Feature ausgefüllt (12 existing + 7 new)
- [x] Blast Radius für jede Änderung gegreppt (SquadPitch, BottomNav, KaderTab, Equipment, Queries)
- [x] Cross-Over Analysis (Fantasy, Market, Navigation, Equipment)
- [x] Pre-Mortem mit 7 Szenarien + Mitigations
- [x] Invarianten (6) + Constraints (10) definiert
- [x] Akzeptanzkriterien für jede User-Flow (12 ACs)
- [ ] **Anil hat die Spec reviewed und abgenommen**

---

## PHASE 2: PLAN — Wave Design

### Übersicht

| Wave | Zweck | Files | Shippable? |
|------|-------|-------|-----------|
| Wave 1 | Infra: Store, Types, Formations, Hook | 5 create | Ja (unsichtbar) |
| Wave 2 | Components: StatusBar, IntelPanel, SquadStrip | 7 create | Ja (nicht verdrahtet) |
| Wave 3 | Integration: ManagerContent Rewrite + SquadPitch Enhancement | 2 modify | Ja (volle Funktionalität) |
| Wave 4 | Navigation: BottomNav + Deep-Links + i18n | 3 modify | Ja (Navigation komplett) |
| Wave 5 | Equipment: Badges auf Pitch + Picker + Preset-Erweiterung | 2 modify | Ja (Equipment-Feature komplett) |

### Wave 1: Infrastructure

**Zweck:** Foundation ohne sichtbare Änderung. Store, Types, Formation-Daten, Data-Hook.

#### Task 1.1: Manager Store + Types

**Files:**
- Create: `src/features/manager/store/managerStore.ts`
- Create: `src/features/manager/types.ts`

**managerStore State:**
```typescript
{
  // Formation
  squadSize: '6' | '11';
  formation: FormationId;
  assignments: Map<number, string>;  // slotIndex → playerId
  equipmentPlan: Map<number, string>; // slotIndex → equipmentId (localStorage)

  // Intel Panel
  selectedPlayerId: string | null;
  intelTab: 'stats' | 'form' | 'markt';
  intelOpen: boolean; // Mobile bottom sheet

  // Squad Strip
  stripSort: 'l5' | 'value' | 'fitness' | 'alpha';
  stripFilterPos: Pos | 'all';

  // Presets (enhanced with equipment)
  presets: ManagerPreset[];
}
```

**types.ts:**
```typescript
export type ManagerPreset = {
  name: string;
  squadSize: '6' | '11';
  formationId: FormationId;
  assignments: Record<number, string>;
  equipmentPlan: Record<number, string>; // NEW
};
```

**DONE means:**
- [ ] `npx tsc --noEmit` 0 errors
- [ ] Store importierbar, Types exportierbar

#### Task 1.2: Formations Data (extract from market/portfolio)

**Files:**
- Create: `src/features/manager/lib/formations.ts`

**Extrahiert aus** `src/features/market/components/portfolio/constants.ts` — gleiche Daten, eigene Datei für Manager. Market constants.ts bleibt (KaderTab braucht es noch).

**DONE means:**
- [ ] Formation-Daten identisch mit KaderTab
- [ ] tsc 0 errors

#### Task 1.3: useManagerData Hook

**Files:**
- Create: `src/features/manager/hooks/useManagerData.ts`

**Orchestriert:**
```typescript
export function useManagerData(userId: string | undefined) {
  const { players, mySquadPlayers, playersLoading } = useMarketData(userId);
  const { data: minutesMap } = useRecentMinutes();
  const { data: scoresMap } = useRecentScores();
  const { data: nextFixturesMap } = useNextFixtures();
  const { data: eventUsageMap } = usePlayerEventUsage(userId);
  const { data: userEquipment } = useUserEquipment(userId);
  const { data: equipDefs } = useEquipmentDefinitions();

  // Derived: playerMap, healthCounts, portfolioTrend, nextEvent
  return { ... };
}
```

**DONE means:**
- [ ] Hook liefert alle Daten die 4 Zonen brauchen
- [ ] Keine neuen API-Calls (nur bestehende Queries orchestriert)
- [ ] tsc 0 errors

### Wave 2: Components (parallel baubar)

**Zweck:** Alle 4 Zonen als eigenständige Components. Noch nicht verdrahtet.

#### Task 2.1: StatusBar

**Files:** Create `src/features/manager/components/StatusBar.tsx`

**Props:**
```typescript
interface StatusBarProps {
  fitCount: number;
  doubtfulCount: number;
  injuredCount: number;
  nextEvent: { name: string; daysUntil: number; format: string } | null;
  portfolioTrendPct: number | null;
  totalValue: number;
  assignedCount: number;
  totalSlots: number;
}
```

**Layout:** Single row, 3 sections (health | event | portfolio). Mobile: 2 rows.
**Design:** `bg-white/[0.02] border border-white/10 rounded-2xl p-3`

**DONE means:**
- [ ] Rendert korrekt mit Mock-Props
- [ ] Mobile 360px: kein Overflow
- [ ] tsc 0 errors

#### Task 2.2: IntelPanel Shell + StatsTab

**Files:**
- Create: `src/features/manager/components/IntelPanel.tsx`
- Create: `src/features/manager/components/intel/StatsTab.tsx`

**IntelPanel:** Tab-Buttons (Stats/Form/Markt) + Content-Area. Desktop: 320px fixed. Mobile: wrapped in Modal (Bottom Sheet).

**StatsTab Props:**
```typescript
interface StatsTabProps {
  player: Player;
  scores: (number | null)[] | undefined;
  nextFixture: NextFixtureInfo | undefined;
  eventCount: number;
}
```

**DONE means:**
- [ ] StatsTab zeigt L5, Season Stats, Fitness, Next Fixture
- [ ] "Kein Spieler ausgewählt" → Squad-Zusammenfassung
- [ ] tsc 0 errors

#### Task 2.3: IntelPanel FormTab + MarktTab

**Files:**
- Create: `src/features/manager/components/intel/FormTab.tsx`
- Create: `src/features/manager/components/intel/MarktTab.tsx`

**FormTab:** Score-Sparkline (letzte 10 GW), Event History. Daten aus `scoresMap`.
**MarktTab:** Holdings, P&L, Floor Price, Deep-Links zu `/market?player={id}`.

**DONE means:**
- [ ] Beide Tabs rendern mit Player-Daten
- [ ] MarktTab Deep-Links korrekt
- [ ] tsc 0 errors

#### Task 2.4: SquadStrip

**Files:** Create `src/features/manager/components/SquadStrip.tsx`

**Props:**
```typescript
interface SquadStripProps {
  players: Player[];
  assignedIds: Set<string>;
  eventUsageMap: Map<string, unknown[]> | undefined;
  selectedPlayerId: string | null;
  sort: 'l5' | 'value' | 'fitness' | 'alpha';
  filterPos: Pos | 'all';
  onSort: (s: typeof sort) => void;
  onFilterPos: (p: typeof filterPos) => void;
  onSelectPlayer: (id: string) => void;
  onAssignPlayer: (id: string) => void;
}
```

**Layout:** Horizontal scroll, position-grouped, mini-cards (48px height, photo 32px).
**Design:** `bg-white/[0.02] border-t border-white/10 p-2` + `overflow-x-auto scrollbar-hide`

**DONE means:**
- [ ] Horizontal scroll funktional
- [ ] Position-Grouping mit farbigen Dividers
- [ ] Sort/Filter Buttons
- [ ] ✓ Checkmark auf assigned, 🔒 Lock auf event-committed
- [ ] Touch targets ≥ 44px
- [ ] tsc 0 errors

### Wave 3: Integration

**Zweck:** ManagerContent Rewrite — alle 4 Zonen verdrahten. SquadPitch enhanced.

#### Task 3.1: SquadPitch Enhancement

**Files:** Modify `src/features/market/components/portfolio/SquadPitch.tsx`

**Neue optionale Props:**
```typescript
interface SquadPitchProps {
  // existing
  formation: SquadFormation;
  assignments: Map<number, Player>;
  onSlotClick: (slotIndex: number, pos: Pos) => void;
  // NEW (all optional)
  fitnessDots?: Map<string, 'fit' | 'doubtful' | 'injured'>;
  eventLocks?: Set<string>;
  equipmentPlan?: Map<number, { key: string; rank: number; position: string }>;
  onEquipmentTap?: (slotIndex: number) => void;
}
```

**Rendert zusätzlich pro Slot (wenn Props vorhanden):**
- Fitness-Dot (top-left): grün/gelb/rot
- Lock-Icon (center-bottom): wenn Spieler in eventLocks
- EquipmentBadge (bottom-left): wenn Equipment geplant

**KRITISCH:** Alle neuen Props optional. KaderTab muss ohne Änderung weiter funktionieren.

**DONE means:**
- [ ] KaderTab rendert identisch (keine neuen Props übergeben)
- [ ] KaderTab Tests grün
- [ ] Mit neuen Props: Fitness, Lock, Equipment sichtbar
- [ ] tsc 0 errors

#### Task 3.2: ManagerContent Rewrite

**Files:** Modify `src/features/manager/components/ManagerContent.tsx`

**Ersetzt KaderTab Import durch eigene Composition:**
```
StatusBar
┌─────────────────┬───────────────┐
│ TacticalBoard    │ IntelPanel    │  (Desktop: lg+)
│ (SquadPitch +    │ (3 Tabs)      │
│  Formation +     │               │
│  Presets)        │               │
└─────────────────┴───────────────┘
SquadStrip
```

**Mobile (<lg):**
```
StatusBar
TacticalBoard (full width)
SquadStrip (full width)
[Tap → Bottom Sheet IntelPanel]
```

**Data Flow:**
```
useManagerData(userId) → all queries
useManagerStore() → UI state
```

**DONE means:**
- [ ] Desktop: 4 Zonen sichtbar
- [ ] Mobile: 3 Zonen + Bottom Sheet
- [ ] Tap Player auf Pitch → IntelPanel zeigt Daten
- [ ] Tap leerer Slot → SquadStrip filtert Position
- [ ] Formation wechseln → Pitch aktualisiert
- [ ] Preset Save/Load funktional
- [ ] tsc 0 errors
- [ ] Self-Test: 3 Interaktionen auf Mobile + Desktop

### Wave 4: Navigation + i18n

**Zweck:** BottomNav Änderung, Deep-Links, i18n Keys.

#### Task 4.1: BottomNav Update

**Files:** Modify `src/components/layout/BottomNav.tsx`

**Änderung:** Club raus, Manager rein.

```typescript
// VORHER:
const BOTTOM_TABS = [
  { labelKey: 'navHome', href: '/', icon: Home },
  { labelKey: 'navSpieltag', href: '/fantasy', icon: Trophy },
  { labelKey: 'navMarkt', href: '/market', icon: Briefcase },
  { labelKey: 'navClub', href: '/club', icon: Building2 },
  { labelKey: 'navCommunity', href: '/community', icon: Compass },
];

// NACHHER:
const BOTTOM_TABS = [
  { labelKey: 'navHome', href: '/', icon: Home },
  { labelKey: 'navSpieltag', href: '/fantasy', icon: Trophy },
  { labelKey: 'navManager', href: '/manager', icon: ClipboardList },
  { labelKey: 'navMarkt', href: '/market', icon: TrendingUp },
  { labelKey: 'navCommunity', href: '/community', icon: Compass },
];
```

**Entfernen:** Club-spezifische `href`-Logik (Zeilen 48-51).

**DONE means:**
- [ ] 5 Items in BottomNav (Home, Fantasy, Manager, Market, Community)
- [ ] Manager Active-State korrekt (Gold + Glow)
- [ ] Club NICHT in BottomNav
- [ ] Club weiterhin in SideNav (NAV_MAIN)
- [ ] tsc 0 errors

#### Task 4.2: i18n Keys

**Files:**
- Modify: `messages/de.json`
- Modify: `messages/tr.json`

**Neue Keys (manager Namespace):**
```json
"manager": {
  "title": "Manager",
  "statusFit": "fit",
  "statusDoubtful": "fraglich",
  "statusInjured": "verletzt",
  "nextEvent": "Nächstes Event",
  "portfolioTrend": "Portfolio",
  "intelStats": "Stats",
  "intelForm": "Form",
  "intelMarkt": "Markt",
  "noPlayerSelected": "Wähle einen Spieler auf dem Feld",
  "squadSummary": "Kader-Übersicht",
  "stripSort": "Sortierung",
  "stripFilter": "Position",
  "toTransfermarkt": "Auf Transfermarkt →",
  "sellPlayer": "Verkaufen",
  "searchPlayer": "Spieler suchen →",
  "assignPlayer": "Aufstellen",
  "equipmentPlan": "Equipment planen",
  "presetSave": "Speichern",
  "presetLoad": "Laden",
  "presetDelete": "Löschen"
}
```

**BottomNav:** `"navManager": "Manager"` (DE) / `"navManager": "Menajer"` (TR)

**DONE means:**
- [ ] DE + TR Keys vorhanden
- [ ] Kein hardcoded Text in neuen Components
- [ ] tsc 0 errors

#### Task 4.3: Deep-Links Manager → Market

**Files:** Modify `src/features/manager/components/intel/MarktTab.tsx` (already created in Wave 2)

**Links:**
- "Auf Transfermarkt →" → `/market?player={id}`
- "Verkaufen" → `/market?sell={id}`
- Empty Slot "Spieler suchen →" → `/market?pos={pos}`

**DONE means:**
- [ ] Alle 3 Deep-Link Typen navigieren korrekt
- [ ] Market-Seite öffnet (parst Params bereits)
- [ ] tsc 0 errors

### Wave 5: Equipment Integration

**Zweck:** Equipment-Badges auf Pitch, Picker im Manager, Presets erweitert.

#### Task 5.1: Equipment auf TacticalBoard

**Files:**
- Modify: `src/features/manager/components/ManagerContent.tsx` (Wire equipment data)
- (SquadPitch bereits enhanced in Wave 3)

**Flow:**
1. `useUserEquipment(userId)` liefert Inventar
2. `useEquipmentDefinitions()` liefert Namen/Icons
3. `managerStore.equipmentPlan` enthält `Map<slotIndex, equipmentId>`
4. Beim Rendern: equipmentPlan-IDs gegen Inventar validieren (consumed Items entfernen)
5. SquadPitch erhält `equipmentPlan` Prop → zeigt EquipmentBadge

**Equipment-Picker Flow (Manager-Modus):**
1. Tap EquipmentBadge oder "Equipment planen" Button
2. EquipmentPicker öffnet (gleiche Komponente wie Fantasy)
3. `onEquip` Callback → speichert in `managerStore.equipmentPlan` (localStorage via Zustand persist)
4. `onUnequip` Callback → entfernt aus equipmentPlan
5. KEIN RPC-Call (Unterschied zu Fantasy wo equip_to_slot aufgerufen wird)

**DONE means:**
- [ ] Equipment-Badges auf Pitch sichtbar
- [ ] EquipmentPicker öffnet und Equipment zuweisbar
- [ ] Equipment-Plan in Preset gespeichert
- [ ] Consumed Equipment wird nicht angezeigt (Inventar-Validierung)
- [ ] Position-Matching funktional (fire_shot nur auf ATT etc.)
- [ ] tsc 0 errors

---

### Task Dependencies

```
Wave 1: [1.1, 1.2, 1.3] — parallel, Foundation
Wave 2: [2.1, 2.2, 2.3, 2.4] — parallel, Components (hängt von Wave 1 Types ab)
Wave 3: [3.1] → [3.2] — sequentiell (Pitch enhancement vor Content Rewrite)
Wave 4: [4.1, 4.2, 4.3] — parallel, Navigation + i18n
Wave 5: [5.1] — hängt von Wave 3 + Wave 4 ab
```

### Parallel Execution Strategy

```
Wave 1: Tasks 1.1 + 1.2 parallel (kein Overlap). Task 1.3 danach (braucht Types).
Wave 2: Alle 4 Tasks parallel (Sub-Agents: StatusBar, IntelPanel, SquadStrip).
         Agent-geeignet: klar definierte Props, isolierte Dateien.
Wave 3: Jarvis direkt (Integration, Cross-Cutting).
Wave 4: Tasks 4.1 + 4.2 parallel. Task 4.3 = Modify von Wave 2 Output.
Wave 5: Jarvis direkt (Equipment-Verdrahtung über mehrere Files).
```

### Aufwand-Schätzung

| Wave | Tasks | Agent-fähig | Geschätzter Aufwand |
|------|-------|------------|-------------------|
| Wave 1 | 3 | Teilweise | Klein (Foundation) |
| Wave 2 | 4 | Ja (3 von 4) | Mittel (meiste neue Zeilen) |
| Wave 3 | 2 | Nein | Mittel (Integration) |
| Wave 4 | 3 | Teilweise | Klein |
| Wave 5 | 1 | Nein | Klein-Mittel |

---

## PLAN GATE Checklist

- [x] Jede Wave ist eigenständig shippbar
- [x] Max 10 Files pro Wave
- [x] Move und Change in getrennten Waves (Wave 2 = Create, Wave 3 = Modify)
- [x] Jeder Task hat "DONE means" Checkliste
- [x] Agent-Tasks sind vollständig spezifiziert (Props Interfaces, Layout, Design Tokens)
- [ ] **Anil hat den Plan reviewed**

---

## Anhang A: Layouts (ASCII)

### Desktop (≥ lg / 1024px)

```
+-------------------------------------------------------------+
| STATUS BAR                                                   |
| 6 fit · 1 fraglich · 1 verletzt | GW28 · 2d | +8.3% ↑      |
+-----------------------------------+-------------------------+
|                                   |                         |
|  TACTICAL BOARD                   |  INTEL PANEL            |
|  [11er v] [4-3-3 v]              |  [Stats] [Form] [Markt] |
|                                   |                         |
|       ATT  ATT  ATT              |  Hakan Yilmaz · MID     |
|  [🔥R2]                          |  L5: 78 ↑               |
|       MID  MID  MID              |  Season: 24 Sp, 5 T     |
|                                   |  Fitness: 100%          |
|     DEF DEF DEF DEF              |  Next: Göztepespor (A)  |
|  [🛡R3]                          |                         |
|           GK                     |  [Auf Transfermarkt →]  |
|                                   |  [Verkaufen]            |
|  [Preset v] [Save] [Load]       |                         |
+-----------------------------------+-------------------------+
| SQUAD STRIP (horizontal scroll)                              |
| [Sort: Form v] [Alle|GK|DEF|MID|ATT]                       |
| [GK·GK] | [DEF·DEF·DEF·DEF] | [MID·MID·MID] | [ATT·ATT]  |
+-------------------------------------------------------------+
```

### Mobile (< lg / 360px)

```
+---------------------------+
| 6·1·1 | GW28 2d | +8.3%  |
+---------------------------+
|                           |
|  TACTICAL BOARD           |
|  [11er v] [4-3-3 v]      |
|       ATT  ATT  ATT      |
|       MID  MID  MID      |
|     DEF DEF DEF DEF      |
|           GK              |
|  [Preset v] [Save]       |
+---------------------------+
| SQUAD STRIP (scroll →)    |
| [GK] [DEF DEF DEF DEF]   |
+---------------------------+
| ↑ Tap Spieler = Bottom    |
| Sheet mit IntelPanel      |
+---------------------------+
```

## Anhang B: Equipment-Plan Datenmodell

```typescript
// localStorage (via Zustand persist)
{
  equipmentPlan: {
    3: "eq-uuid-fire-shot-r2",   // slotIndex 3 (ATT) → fire_shot R2
    7: "eq-uuid-iron-wall-r3",   // slotIndex 7 (DEF) → iron_wall R3
  }
}

// Validation beim Rendern:
// 1. equipmentPlan IDs gegen useUserEquipment() result prüfen
// 2. Fehlende IDs (consumed/gelöscht) → aus Plan entfernen
// 3. Position-Match prüfen (equipment.position vs slot.pos)
```

## Anhang C: BottomNav Vorher/Nachher

```
VORHER: [Home] [Fantasy] [Market🧳] [Club🏛] [Community]
NACHHER: [Home] [Fantasy] [Manager📋] [Market📈] [Community]
```

Icons: Manager = ClipboardList, Market = TrendingUp (statt Briefcase)
