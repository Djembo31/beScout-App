# Manager Team-Center — Implementation Plan

> **Status:** Draft — wartet auf Anil Review (PLAN GATE)
> **Erstellt:** 2026-04-07 | **Process:** `/spec` Skill Phase 2 (PLAN)
> **Spec:** `2026-04-07-manager-team-center-spec.md` (SPEC GATE passed 2026-04-07)
> **Design:** `2026-04-07-manager-team-center-design.md`

---

## PHASE 2: PLAN

## 2.1 Wave Design — Uebersicht

| Wave | Zweck | Files Total | Shippable Standalone? | Risiko |
|------|-------|------|----------------------|--------|
| **0** | Hook Extraction `useLineupBuilder` aus EventDetailModal | 3-4 | Ja (kein User-Sichtbarer Change) | **Hoch** — Refactor in /fantasy |
| **1** | Foundation: managerStore Rewrite, PageHeader, 3-Tab Skeleton | 6 | **NEIN** (bundled mit Wave 2) | Niedrig |
| **2** | Tab 2 Kader Migration: BestandTab → manager + State + Redirects + Links | 10 | Ja (volle Kader-Funktionalitaet) | Mittel |
| **3** | Tab 1 Aufstellen: AufstellenTab + EventSelector | 4 | Ja (Direct Event Join) | Mittel |
| **4** | Tab 3 Historie: HistorieTab + HistoryEventCard + Stats + Filter | 5 | Ja (History sichtbar) | Niedrig |
| **5** | Cleanup: alte Manager-Files loeschen + Visual QA + Tests | 8 | Final | Niedrig |

**Total:** 36 Files (15 create + 14 modify + 7 delete). Constraint C1 (max 10 per Wave) eingehalten.

### Dependencies

```
Wave 0 (Hook Extraction)
  ↓
  ├─→ Wave 1 (Foundation) ─→ Wave 2 (Kader Migration)
  │                                      ↓
  └─→ Wave 3 (Aufstellen) ───────────────┤
                                          ↓
                                      Wave 4 (Historie)
                                          ↓
                                      Wave 5 (Cleanup)
```

**Wichtig:** Wave 1 ist **nicht** alleine shippable (leere Tabs). Wave 1+2 als Bundle pushen.

---

## 2.2 Tasks pro Wave

### Wave 0: Hook Extraction `useLineupBuilder`

**Zweck:** Extrahiere die ~440 LOC State-Maschine aus EventDetailModal in einen wiederverwendbaren Hook. EventDetailModal nutzt den Hook nach dem Refactor. AufstellenTab kann den gleichen Hook in Wave 3 nutzen.

**Risiko:** Refactor in /fantasy. Wenn ein State-Update vergessen wird, koennen User keine Lineups mehr speichern. Mitigation: Wave nur Refactor, keine neuen Features. Tests muessen alle gruen bleiben.

#### Task 0.1: useLineupBuilder Hook erstellen

**Files:**
- Create: `src/features/fantasy/hooks/useLineupBuilder.ts`

**Steps:**
1. Lese EventDetailModal.tsx Z.51-489 (alle State + Handlers + Effects)
2. Identifiziere die State-Variablen die zum Lineup-Bauen gehoeren:
   - `selectedPlayers`, `selectedFormation`, `captainSlot`, `wildcardSlots`, `equipmentMap`
   - `slotScores`, `myTotalScore`, `myRank`, `progressiveScores`, `scoringJustFinished`
3. Identifiziere die Handlers:
   - `handleSelectPlayer`, `handleRemovePlayer`, `handleFormationChange`, `handleApplyPreset`
   - `handleEquipmentTap`, `handleEquip`, `handleUnequip`, `handleSaveLineup`
4. Identifiziere die useEffects:
   - Load lineup on open (Z.213-281)
   - Leaderboard polling (Z.148-166)
   - Progressive scores polling (Z.169-185)
5. Erstelle `useLineupBuilder(event, userId, isOpen)` Hook der returns:
   ```typescript
   {
     // State
     selectedPlayers, selectedFormation, captainSlot, wildcardSlots, equipmentMap,
     slotScores, myTotalScore, myRank, progressiveScores,
     // Setters
     setSelectedFormation, setCaptainSlot, setWildcardSlots,
     // Handlers
     handleSelectPlayer, handleRemovePlayer, handleFormationChange,
     handleApplyPreset, handleEquipmentTap, handleEquip, handleUnequip,
     // Computed
     formationSlots, slotDbKeys, currentFormation, availableFormations,
     isLineupComplete, totalSalary, synergyPreview,
     getSelectedPlayer, getAvailablePlayersForPosition, isPlayerLocked,
   }
   ```
6. Verify: `npx tsc --noEmit`

**DONE means:**
- [ ] Hook exportiert mit obigen Returns
- [ ] Keine logischen Aenderungen — pure Code-Bewegung
- [ ] tsc 0 errors
- [ ] EventDetailModal kompiliert noch (Hook ist additive — modal nutzt ihn noch nicht)

#### Task 0.2: EventDetailModal nutzt useLineupBuilder

**Files:**
- Modify: `src/components/fantasy/EventDetailModal.tsx`

**Blast Radius:**
- Direct: nur EventDetailModal (einziger Caller)
- Indirect: alle EventDetailModal-Consumer in /fantasy
- Tests: `src/lib/services/__tests__/scoring-v2.test.ts` testet RPC-Layer (sicher), Component-Tests fuer Modal (falls vorhanden)

**Steps:**
1. Importiere `useLineupBuilder`
2. Ersetze die ~440 LOC State + Handlers durch:
   ```typescript
   const lineupState = useLineupBuilder(event, user?.id, isOpen);
   ```
3. Behalte: Tab-State, Equipment-Picker State, Leave Handler, Reset Handler, Modal-Wrapper
4. Update LineupPanel-Props um den Hook-State weiterzureichen (gleiche Props wie vorher, nur Source aus Hook)
5. Verify: `npx tsc --noEmit`
6. Verify: `npx vitest run src/lib/services/__tests__/scoring-v2.test.ts`
7. Verify: `npx vitest run src/components/fantasy/` (falls Tests existieren)

**DONE means:**
- [ ] EventDetailModal Length von 637 LOC auf ~250 LOC reduziert
- [ ] Lineup-Panel Props identisch zu vorher (wired durch Hook)
- [ ] tsc 0 errors
- [ ] Alle vorhandenen Tests gruen
- [ ] **Manueller Smoke Test in /fantasy:** 1 Lineup join + 1 Lineup edit + 1 Equipment assign + 1 Reset → alle erfolgreich

#### Task 0.3: Wave 0 Verification

**Steps:**
1. Lokal /fantasy oeffnen, Event aufrufen, Lineup aufstellen, speichern
2. Edit-Mode pruefen: gleiche Aufstellung erneut oeffnen
3. Equipment zuweisen
4. Score progression beobachten (wenn LIVE Event verfuegbar)
5. Reset Event als Admin pruefen
6. Console errors checken

**DONE means:**
- [ ] /fantasy Lineup-Flows funktional
- [ ] 0 Console-Errors in /fantasy
- [ ] Bereit zum Push

---

### Wave 1: Foundation (NICHT alleine shippable)

**Zweck:** Manager-Page Skelett mit 3 Tabs, neuer Store, PageHeader. Wird mit Wave 2 zusammen gepusht.

**Constraint C7:** Wave 1 wird **NICHT alleine geshipped**.

#### Task 1.1: managerStore Rewrite

**Files:**
- Modify (rewrite content): `src/features/manager/store/managerStore.ts`

**Steps:**
1. Backup-Note: alte Store-Felder werden geloescht (Anil approved Q4 — stille Loeschung)
2. Neuer State:
   ```typescript
   interface ManagerState {
     // Tab routing
     activeTab: 'aufstellen' | 'kader' | 'historie';

     // Tab 1: Aufstellen
     selectedEventId: string | null;

     // Tab 2: Kader (migriert aus marketStore in Wave 2)
     kaderLens: 'performance' | 'markt' | 'handel' | 'vertrag';
     kaderGroupByClub: boolean;
     kaderSellPlayerId: string | null;
     expandedClubs: Set<string>;
     kaderDetailPlayerId: string | null;

     // Tab 3: Historie
     historyTimeFilter: 'all' | '30d' | '90d' | 'season';
     historyFormatFilter: 'all' | '11er' | '7er';
     historyStatusFilter: 'all' | 'top3' | 'top10' | 'other';
     historySort: 'date' | 'score' | 'rank' | 'reward';
     expandedHistoryEventId: string | null;
   }
   ```
3. Setters fuer alle Felder
4. Alte localStorage Key (`bescout-manager-store`) explizit clear-en (Wave 0 hatte wahrscheinlich diesen Key, neuer Store ueberschreibt)
5. Verify: `npx tsc --noEmit`

**DONE means:**
- [ ] Store hat alle 13 State-Felder
- [ ] Keine Imports mehr von alten Feldern (assignments, equipmentPlan, presets, etc.)
- [ ] tsc 0 errors

#### Task 1.2: PageHeader Component

**Files:**
- Create: `src/features/manager/components/PageHeader.tsx`

**Steps:**
1. Stat-Pills:
   - Pill 1: `mySquadPlayers.length` Spieler (mit Briefcase Icon)
   - Pill 2: `healthCounts.fit / doubtful / injured` (mit Status-Dots)
   - Pill 3: `nextEvent.name` + Countdown (mit Calendar Icon, oder "kein Event")
2. Tap auf Pill 3 → setze `managerStore.selectedEventId = nextEvent.id` + `setActiveTab('aufstellen')`
3. Mobile (<lg): single row, scrollable wenn zu eng
4. Title: "Manager · Dein Team-Center"
5. Verify: `npx tsc --noEmit`

**DONE means:**
- [ ] Component akzeptiert: `mySquadPlayers, healthCounts, nextEvent` aus useManagerData
- [ ] 3 Pills rendern korrekt
- [ ] Tap auf Event-Pill funktioniert (cross-tab nav)
- [ ] Skeleton wenn Daten loading
- [ ] tsc 0 errors

#### Task 1.3: ManagerContent Rewrite — 3-Tab Hub

**Files:**
- Modify (rewrite content): `src/features/manager/components/ManagerContent.tsx`

**Steps:**
1. Importiere `TabBar`, `TabPanel` aus `@/components/ui/TabBar`
2. Tab-Routing via `?tab=` (Pattern wie /inventory page.tsx)
3. Wrap in Suspense fuer useSearchParams
4. PageHeader oben
5. TabBar mit 3 Tabs: aufstellen / kader / historie
6. 3 leere TabPanel Placeholders mit "Tab in Migration" Text
7. useUser Guard
8. Verify: `npx tsc --noEmit`

**DONE means:**
- [ ] /manager rendert mit Header + 3 Tabs (alle leer)
- [ ] Tab-Wechsel updated URL
- [ ] Deep-Link `?tab=kader` setzt Tab korrekt
- [ ] Default-Tab: aufstellen
- [ ] Mobile + Desktop layout korrekt
- [ ] tsc 0 errors

---

### Wave 2: Tab 2 Kader Migration

**Zweck:** BestandTab + alle Helpers + Sub-Components von /market nach /manager migrieren. State-Migration. Redirects. Link-Updates. Atomar — alles in einer Wave.

**Constraint C5+C6:** State-Migration und PortfolioTab Default-Aenderung in **selber Wave** wie BestandTab Removal.

**Constraint C2:** Move und Change in getrennten Tasks innerhalb der Wave.

#### Task 2.1: BestandTab Files moven nach manager/components/kader/

**Files (Move/Rename):**
- `src/features/market/components/portfolio/BestandTab.tsx` → `src/features/manager/components/kader/KaderTab.tsx`
- `src/features/market/components/portfolio/bestand/bestandHelpers.tsx` → `src/features/manager/components/kader/kaderHelpers.tsx`
- `src/features/market/components/portfolio/bestand/BestandPlayerRow.tsx` → `src/features/manager/components/kader/KaderPlayerRow.tsx`
- `src/features/market/components/portfolio/bestand/BestandSellModal.tsx` → `src/features/manager/components/kader/KaderSellModal.tsx`
- `src/features/market/components/portfolio/bestand/BestandToolbar.tsx` → `src/features/manager/components/kader/KaderToolbar.tsx`
- `src/features/market/components/portfolio/bestand/BestandClubGroup.tsx` → `src/features/manager/components/kader/KaderClubGroup.tsx`
- `src/features/market/components/portfolio/bestand/index.ts` → `src/features/manager/components/kader/index.ts`

**Steps:**
1. `git mv` alle 7 Files (preserve history)
2. In jedem File: Imports auf neue Pfade umbiegen
3. Innerhalb der Files: `Bestand` → `Kader` rename in Component-Names + Type-Namen + i18n keys (siehe Task 2.2)
4. **Noch NICHT** den useMarketStore-Import aendern — das passiert in Task 2.3
5. Verify: `npx tsc --noEmit` (sollte noch fail wegen Old-Path-Imports in /market — fixen wir in 2.4)

**DONE means:**
- [ ] 7 Files an neuer Stelle
- [ ] Git history preserved
- [ ] Naming `Bestand` → `Kader` durchgaengig in den Files

#### Task 2.2: KaderTab Renaming + i18n

**Files:**
- Modify: `src/features/manager/components/kader/KaderTab.tsx` (umgezogen)
- Modify: `messages/de.json`, `messages/tr.json`

**Steps:**
1. Component-Export von `ManagerBestandTab` → `KaderTab`
2. Type-Names: `BestandLens` → `KaderLens` (siehe `kaderHelpers.tsx`)
3. i18n-Keys updaten oder duplicate als alias:
   - Vorschlag: i18n-Keys behalten (`bestandLens*`, `bestandSummary*`) — Code-intern. Anil kennt die Trennung "User sieht Kader, Code nutzt bestand-keys"
   - ODER: Keys umbenennen zu `kaderLens*`, `kaderSummary*` und beide Sprachen migrieren
4. **Entscheidung:** i18n keys als `bestand*` BEHALTEN — Code-intern, kein User-Impact, kein i18n-Migration. Nur Component-Names + Type-Names werden umbenannt.
5. Verify: `npx tsc --noEmit`

**DONE means:**
- [ ] `KaderTab` Component exportiert
- [ ] `KaderLens` Type exportiert
- [ ] Keine TS errors zu fehlenden Imports
- [ ] i18n-Keys unveraendert (intentional)

#### Task 2.3: managerStore um Kader-State erweitern + marketStore reduzieren

**Files:**
- Modify: `src/features/manager/store/managerStore.ts` (Wave 1 hat Felder schon definiert)
- Modify: `src/features/market/store/marketStore.ts` (4 fields raus)

**Steps:**
1. managerStore: Setters dazu (`setKaderLens`, `setKaderGroupByClub`, `setKaderSellPlayerId`, `toggleClubExpand`, `setKaderDetailPlayerId`)
2. marketStore: 4 fields entfernen (`bestandLens`, `bestandGroupByClub`, `bestandSellPlayerId`, `expandedClubs`) + 4 setters entfernen
3. marketStore: `portfolioSubTab` Default von `'bestand'` auf `'angebote'` aendern
4. marketStore: BestandLens type import entfernen (war: `import type { BestandLens } from '@/features/market/components/portfolio/bestand/bestandHelpers';`)
5. KaderTab.tsx: useMarketStore → useManagerStore
6. Verify: `npx tsc --noEmit`

**DONE means:**
- [ ] managerStore hat Kader-Felder + Setters
- [ ] marketStore hat 0 Bestand-Felder
- [ ] marketStore hat keinen BestandLens import mehr
- [ ] KaderTab nutzt useManagerStore
- [ ] tsc 0 errors

#### Task 2.4: PortfolioTab in /market — Bestand-SubTab raus

**Files:**
- Modify: `src/features/market/components/portfolio/PortfolioTab.tsx`

**Steps:**
1. BestandTab dynamic import entfernen
2. SubTab-Array: `bestand` Eintrag raus
3. JSX: `{portfolioSubTab === 'bestand' && (...)}` Block raus
4. PortfolioSubTab type: `'bestand' |` raus → `'angebote' | 'watchlist'`
5. marketStore type updaten (in Task 2.3 schon gemacht? Falls nein, hier nachziehen)
6. Verify: `npx tsc --noEmit`

**DONE means:**
- [ ] PortfolioTab hat 2 SubTabs (Angebote, Watchlist)
- [ ] Default-SubTab Angebote (kein Crash)
- [ ] BestandTab Import komplett weg in /market
- [ ] tsc 0 errors

#### Task 2.5: PortfolioStrip + HomeStoryHeader Link-Updates

**Files:**
- Modify: `src/components/home/PortfolioStrip.tsx` (3 Stellen: Z.25, Z.45, Z.108)
- Modify: `src/components/home/HomeStoryHeader.tsx` (1 Stelle: Z.78)

**Steps:**
1. Replace `/market?tab=portfolio` → `/manager?tab=kader` in beiden Files
2. Pruefen ob Test-Files existieren die diese Links testen
3. Verify: `npx tsc --noEmit`

**DONE means:**
- [ ] 4 Stellen aktualisiert
- [ ] Grep `tab=portfolio` in src/components/home/ = 0 Treffer

#### Task 2.6: 301 Redirects fuer Legacy URLs

**Files:**
- Modify: `src/middleware.ts` ODER `src/app/(app)/market/page.tsx`

**Steps:**
1. Best Practice: Next.js middleware fuer 301 Redirect
2. Pattern: `tab=portfolio` und `sub=bestand` → `/manager?tab=kader`
3. Pruefen welche bestehende middleware existiert
4. Verify: lokal `/market?tab=portfolio` aufrufen → erwarten `/manager?tab=kader`

**DONE means:**
- [ ] Redirect funktional
- [ ] Browser folgt zu /manager?tab=kader
- [ ] Status Code 301 (permanent)

#### Task 2.7: PlayerDetailModal mit 3 Sections

**Files:**
- Create: `src/features/manager/components/kader/PlayerDetailModal.tsx`
- (intel/StatsTab.tsx, FormTab.tsx, MarktTab.tsx werden noch nicht geloescht — das passiert in Wave 5)

**Steps:**
1. Modal Component aus `@/components/ui` (auto Bottom-Sheet auf Mobile)
2. 3 Sections vertikal gestapelt (NICHT 3 Tabs — kompakter):
   - Stats Section (recycled aus intel/StatsTab.tsx)
   - Form Section (recycled aus intel/FormTab.tsx)
   - Markt Section (recycled aus intel/MarktTab.tsx)
3. ODER: 3 Tabs intern im Modal (wie heute IntelPanel) — siehe Anil's Vision (will gleiches Feeling). **Default: 3 Tabs**.
4. Quick-Actions im Footer:
   - "Im Lineup planen" → Tab 1 wechseln + Player vormerken
   - "Verkaufen" → KaderSellModal oeffnen
5. KaderTab.tsx: Tap auf Row triggert `setKaderDetailPlayerId(player.id)`
6. Modal liest `kaderDetailPlayerId` aus Store
7. Verify: `npx tsc --noEmit`

**DONE means:**
- [ ] Modal oeffnet bei Row-Tap
- [ ] 3 Tabs (Stats/Form/Markt) funktional
- [ ] Quick-Actions wired
- [ ] Mobile = Bottom-Sheet, Desktop = Modal
- [ ] tsc 0 errors

#### Task 2.8: KaderTab in ManagerContent verdrahten

**Files:**
- Modify: `src/features/manager/components/ManagerContent.tsx`

**Steps:**
1. Tab 2 Container: `<KaderTab />` mit allen Props (players, holdings, ipoList, userId, incomingOffers, onSell, onCancelOrder)
2. Props kommen aus useManagerData + useTradingActions (oder direkt aus services)
3. Tab 1 + Tab 3 bleiben Placeholder
4. Verify: `npx tsc --noEmit`

**DONE means:**
- [ ] Tab 2 zeigt vollstaendige Kader-Funktionalitaet
- [ ] Sell + Cancel + Bulk + Lens-Wechsel + Filter alle funktional
- [ ] PlayerDetailModal oeffnet bei Row-Tap

#### Wave 2 Verification

**Steps:**
1. `npx tsc --noEmit` clean
2. `npx vitest run src/features/market/` und `src/features/manager/` — alle gruen
3. **Manual Smoke Test:**
   - /manager?tab=kader oeffnen
   - Lens wechseln (Performance → Markt → Handel → Vertrag)
   - Filter, Sort, Search testen
   - Group-by-Club Toggle
   - 1 Sell Action
   - 1 Cancel Order
   - 1 Bulk-Mode + Bulk-Sell
   - PlayerDetailModal oeffnen + 3 Tabs durchklicken
   - "Im Lineup planen" Action (sollte zu Tab 1 wechseln, evtl. mit Toast "kein Event ausgewaehlt")
   - /market oeffnen → kein Bestand-Tab, Default ist Angebote
   - /market?tab=portfolio → 301 → /manager?tab=kader
   - Home → "Mein Spielerkader" Tile → /manager?tab=kader
4. Console-Errors checken
5. Bundle Wave 1 + Wave 2 in einem Commit oder 2 Commits (Wave 1 first, Wave 2 second, dann atomar pushen)

**DONE means:**
- [ ] Alle Smoke-Test Punkte gruen
- [ ] 0 Console-Errors
- [ ] tsc clean
- [ ] Tests gruen
- [ ] **PUSH** — User sieht funktionalen Kader im Manager + 2 Tabs Placeholder

---

### Wave 3: Tab 1 Aufstellen

**Zweck:** AufstellenTab implementieren mit EventSelector + LineupPanel via useLineupBuilder Hook (Wave 0).

#### Task 3.1: EventSelector Component

**Files:**
- Create: `src/features/manager/components/aufstellen/EventSelector.tsx`
- Create: `src/features/manager/queries/eventQueries.ts` (`useOpenEvents` Hook)

**Steps:**
1. `useOpenEvents()` Hook: ruft `getEvents()` auf, filtert `status NOT IN ('ended', 'cancelled')`, sortiert nach `starts_at` ASC
2. Default-Auswahl Logic: Erstes Event in dem User schon ist ODER erstes mit Status 'registering'/'late-reg'/'running'
3. UI:
   - Dropdown auf Desktop (Click oeffnet Liste)
   - Bottom-Sheet auf Mobile (Modal Component)
4. Pro Eintrag: Status-Badge (LIVE/REG/LATE), Name, GW, Countdown, Preisgeld, current_entries/max_entries
5. onChange → `managerStore.setSelectedEventId(eventId)`
6. Empty State: "Keine offenen Events"
7. Verify: `npx tsc --noEmit`

**DONE means:**
- [ ] Component rendert
- [ ] Filter ended/cancelled korrekt
- [ ] Default-Selection logic funktional
- [ ] Mobile + Desktop Variant
- [ ] tsc 0 errors

#### Task 3.2: AufstellenTab Container

**Files:**
- Create: `src/features/manager/components/aufstellen/AufstellenTab.tsx`

**Steps:**
1. Lese `selectedEventId` aus managerStore
2. Lade Event via `useOpenEvents()` + find by id (oder eigener Hook `useEventById`)
3. Wenn `event === null`: zeige Empty State
4. Wenn `event !== null`:
   - Verwende `useLineupBuilder(event, userId, true)` Hook (aus Wave 0)
   - Render Layout:
     - Top: `<EventSelector />`
     - Body: `<LineupPanel {...lineupState} {...neededProps} />`
     - Footer: `<EventDetailFooter {...lineupState} {...neededProps} />`
5. Save Action: ruft `joinEvent` (wenn nicht joined) + `submitLineup` + `equipToSlot` Sequenz
6. Verify: `npx tsc --noEmit`

**DONE means:**
- [ ] Tab 1 rendert mit Selector + LineupPanel + Footer
- [ ] LineupPanel visuell identisch zu /fantasy
- [ ] Save Action funktioniert (DB-Write)
- [ ] Edit-Mode laedt existing Lineup
- [ ] Empty States gerendert
- [ ] tsc 0 errors

#### Task 3.3: Tab 1 in ManagerContent verdrahten

**Files:**
- Modify: `src/features/manager/components/ManagerContent.tsx`

**Steps:**
1. Tab 1 Container: `<AufstellenTab />`
2. Placeholder entfernen
3. Verify: `npx tsc --noEmit`

**DONE means:**
- [ ] Tab 1 zeigt AufstellenTab
- [ ] Smoke Test: 1 Event auswaehlen, Lineup bauen, speichern → Erfolg

#### Wave 3 Verification

**Steps:**
1. tsc clean, Tests gruen
2. **Manual Smoke Test:**
   - /manager → Tab 1 (default)
   - Event Selector oeffnen, anderes Event waehlen
   - Lineup bauen (Spieler picken, Captain setzen, Equipment zuweisen)
   - "Anmelden + Speichern" → join + lineup save
   - Reload Page → Edit-Mode laedt existing Lineup
   - "Aufstellung aktualisieren" → save edit
   - /fantasy oeffnen, gleiches Event → identische Aufstellung sichtbar (Sync via DB)
3. Push (atomar Wave 3)

**DONE means:**
- [ ] Direct Event Join funktional
- [ ] Edit-Mode funktional
- [ ] /fantasy zeigt gleiche Daten
- [ ] 0 Console-Errors

---

### Wave 4: Tab 3 Historie

**Zweck:** Historie-Tab mit lazy lineup loading.

#### Task 4.1: useUserFantasyHistory Hook

**Files:**
- Create: `src/features/manager/queries/historyQueries.ts`

**Steps:**
1. React Query Hook der `getUserFantasyHistory(userId, 50)` ruft
2. Query Key: `qk.fantasy.userHistory(userId)` (neuen Key in queryKeys.ts hinzufuegen)
3. `staleTime: 60_000` (1 Min)
4. Helper Hook `useLineupSnapshot(eventId, userId)` der `getLineup` lazy auf Click ruft, mit `staleTime: Infinity` (immutable nach scoring)
5. Verify: `npx tsc --noEmit`

**DONE means:**
- [ ] Beide Hooks exportiert
- [ ] Query Keys in queryKeys.ts ergaenzt
- [ ] tsc 0 errors

#### Task 4.2: HistoryEventCard Component

**Files:**
- Create: `src/features/manager/components/historie/HistoryEventCard.tsx`

**Steps:**
1. Compact-State:
   - Event-Name + GW Badge
   - Datum + Format
   - 3 KPI-Pills: Score / Rank (mit Color: 🥇 #1, 🥈 #2, 🥉 #3) / Reward
   - Disclosure-Indicator
2. Expanded-State (toggled via `expandedHistoryEventId` aus managerStore):
   - Lazy load `useLineupSnapshot`
   - Mini-Pitch (recycled `SquadPitch.tsx`) readonly
   - Pro Slot: Spieler-Photo, Slot-Score, Captain-Crown
   - Equipment-Items + Synergy-Bonus
   - "In neue Aufstellung uebernehmen" Button
3. Single Open enforced (Anil Q3): Tap auf neue Card schliesst alte
4. Verify: `npx tsc --noEmit`

**DONE means:**
- [ ] Compact + Expanded States rendern
- [ ] Lazy load funktional
- [ ] Single open enforced
- [ ] tsc 0 errors

#### Task 4.3: HistorieTab Container

**Files:**
- Create: `src/features/manager/components/historie/HistorieTab.tsx`
- Create: `src/features/manager/components/historie/HistoryStats.tsx`

**Steps:**
1. HistorieTab:
   - Header: HistoryStats Box
   - Filter-Toolbar: Zeitraum / Format / Status / Sort
   - Liste der HistoryEventCards
2. Apply Filters client-side
3. Apply Sort client-side
4. Empty States: 0 Events, Filter ergibt 0
5. HistoryStats:
   - Aggregate aus History-Daten: Events count, Top10 count, Wins (rank=1) count, Total reward
6. Verify: `npx tsc --noEmit`

**DONE means:**
- [ ] Tab 3 rendert mit Stats + Filter + Liste
- [ ] Filter funktional
- [ ] Sort funktional
- [ ] Empty States
- [ ] tsc 0 errors

#### Task 4.4: Cross-Tab Action "In Aufstellung uebernehmen"

**Files:**
- Modify: `src/features/manager/components/historie/HistoryEventCard.tsx`
- Modify: `src/features/manager/components/aufstellen/AufstellenTab.tsx`

**Steps:**
1. HistoryEventCard "In Aufstellung uebernehmen" Action:
   - Read selectedEventId from store, if null → setze auf naechstes offenes Event (via useOpenEvents)
   - Setze `managerStore.setActiveTab('aufstellen')`
   - Spieler-Liste aus dem History-Lineup als "Apply-Template" merken (im store oder als Query Param)
2. AufstellenTab: Wenn Apply-Template gesetzt, im useEffect:
   - Iteriere Template-Slots
   - Pro Slot: pruefe ob Player noch im aktuellen Bestand
   - Verfuegbare Spieler in Lineup setzen via `handleSelectPlayer`
   - Toast wenn Spieler fehlen: "X Spieler nicht mehr im Bestand"
3. Apply-Template danach clear (one-shot)
4. Verify: `npx tsc --noEmit`

**DONE means:**
- [ ] Action funktioniert end-to-end
- [ ] Verkaufte Spieler bleiben leere Slots
- [ ] Toast bei fehlenden Spielern
- [ ] tsc 0 errors

#### Task 4.5: Tab 3 in ManagerContent verdrahten

**Files:**
- Modify: `src/features/manager/components/ManagerContent.tsx`

**Steps:**
1. Tab 3 Container: `<HistorieTab />`
2. Placeholder entfernen
3. Verify: `npx tsc --noEmit`

**DONE means:**
- [ ] Tab 3 zeigt HistorieTab
- [ ] Smoke Test: vergangene Events sichtbar, expand funktional, Cross-Tab Action funktional

#### Wave 4 Verification

- [ ] Alle 3 Tabs funktional
- [ ] Tab-Wechsel ohne Crashes
- [ ] Cross-Tab Actions funktional ("Im Lineup planen" + "Aufstellung uebernehmen")
- [ ] 0 Console-Errors
- [ ] Push

---

### Wave 5: Cleanup + Visual QA

**Zweck:** Alte Manager-Komponenten loeschen, Tests aktualisieren, Visual QA Mobile + Desktop, Final Polish.

#### Task 5.1: Alte Manager-Files loeschen

**Files (Delete):**
- `src/features/manager/components/StatusBar.tsx`
- `src/features/manager/components/IntelPanel.tsx`
- `src/features/manager/components/intel/StatsTab.tsx`
- `src/features/manager/components/intel/FormTab.tsx`
- `src/features/manager/components/intel/MarktTab.tsx`
- `src/features/manager/components/SquadStrip.tsx`
- (und ggf. `intel/` Subfolder leer → loeschen)

**Steps:**
1. Pre-Check: `grep -r "StatusBar.*manager" src/` → 0 Treffer (sonst broken import)
2. Pre-Check fuer jede Datei: kein anderer Consumer existiert
3. `git rm` die 6 Files (+ leerer Subfolder)
4. PlayerDetailModal in /manager/components/kader/ nutzt jetzt die intel-Logik (kopiert in Wave 2 Task 2.7) — alte intel/* Files koennen weg
5. Verify: `npx tsc --noEmit` (sollte clean sein)

**DONE means:**
- [ ] 6 Files geloescht
- [ ] tsc clean
- [ ] Keine broken imports

#### Task 5.2: Test-Suite Update

**Files:**
- Modify: `src/components/layout/__tests__/BottomNav.test.tsx` (falls Pfad-Aenderungen)
- Check: `src/features/market/components/portfolio/__tests__/` (Tests fuer geloeschte Files entfernen)
- Check: `src/features/manager/components/__tests__/` (neue Tests fuer neue Components nicht in Scope dieser Wave — separate Task)

**Steps:**
1. Identifiziere geloeschte/migrierte Files mit zugehoerigen Tests
2. Tests fuer geloeschte Files: ebenfalls loeschen
3. Tests fuer migrierte Files: entweder migrieren ODER loeschen (Anil entscheidet — Vorschlag: migrieren falls bestehend, sonst skip)
4. `npx vitest run`
5. Verify: alle Tests gruen

**DONE means:**
- [ ] Vitest gruen
- [ ] Keine "missing module" Errors
- [ ] Test-Coverage nicht schlechter als vor Migration

#### Task 5.3: Visual QA Mobile + Desktop

**Steps:**
1. Mobile (360px viewport) — Playwright:
   - /manager Tab 1 — LineupPanel rendert, EventSelector funktional
   - /manager Tab 2 — KaderTab rendert, Lens-Wechsel funktional
   - /manager Tab 3 — HistorieTab rendert, expand funktional
   - PageHeader Stat-Pills sichtbar
   - BottomNav Manager-Item active state
2. Desktop (1280px viewport) — Playwright:
   - Alle 3 Tabs durchklicken
   - PlayerDetailModal als Modal (nicht Bottom-Sheet)
3. Cross-Tab Actions:
   - Tab 2 → "Im Lineup planen" → Tab 1 mit Player gesetzt
   - Tab 3 → "Aufstellung uebernehmen" → Tab 1 mit Lineup gesetzt
4. Edge Cases:
   - 0 Holdings User: Tab 1 + Tab 2 zeigen Empty States
   - 0 History User: Tab 3 zeigt Empty State
   - Keine offenen Events: Tab 1 zeigt "Kein Event"
5. Console-Errors checken auf jeder Tab
6. Screenshots fuer Anil-Approval

**DONE means:**
- [ ] Mobile + Desktop alle Tabs visuell OK
- [ ] Cross-Tab Actions funktional
- [ ] Edge Cases gehandled
- [ ] 0 Console-Errors auf jeder Tab
- [ ] Screenshots an Anil

#### Task 5.4: Final Cleanup + Polish

**Files:**
- Code review of all new files
- Check for `console.log`, TODO comments, debug code
- Optimize imports

**Steps:**
1. Lint + Format check
2. Bundle size check (vor/nach Migration)
3. Performance check: Tab-Wechsel Latency, History Lazy-Load Latency
4. **Final Smoke Test in production-like Setup**

**DONE means:**
- [ ] Code clean (kein debug, kein TODO)
- [ ] Bundle size acceptable
- [ ] Performance OK
- [ ] **PUSH** — Final Wave

---

## 2.3 Agent-Dispatch Regeln

### Agent-suitable Tasks (klar definiert, isoliert)

| Task | Agent? | Grund |
|------|--------|-------|
| 0.1 useLineupBuilder Hook | **NEIN** | Critical refactoring, EventDetailModal touch — needs human |
| 0.2 EventDetailModal nutzt Hook | **NEIN** | Refactor, kann viele Side-Effects haben |
| 1.1 managerStore Rewrite | **NEIN** | State migration, kritisch |
| 1.2 PageHeader Component | **JA** | Klar definierte Props, isoliertes File |
| 1.3 ManagerContent Skeleton | **NEIN** | Architektur, mehrere Files referenced |
| 2.1-2.6 Migration Tasks | **NEIN** | Move + Change muss atomar sein |
| 2.7 PlayerDetailModal | **JA** | Klar definierte Props (player, holdings, events), isoliertes File, recycled Logic |
| 3.1 EventSelector | **JA** | Klar definierte Props, isoliert |
| 3.2 AufstellenTab Container | **NEIN** | Integration mehrerer Components, useLineupBuilder Hook |
| 4.1 historyQueries | **JA** | Klar definierter Hook, isoliert |
| 4.2 HistoryEventCard | **JA** | Klar definierte Props, isoliertes File |
| 4.3 HistorieTab + HistoryStats | **JA** | Klar definierte Props, isoliert |
| 4.4 Cross-Tab Action | **NEIN** | Touches mehrere Files |
| 5.1 Delete Files | **NEIN** | Manual review noetig |
| 5.3 Visual QA | **NEIN** | Playwright + Anil-feedback noetig |

**Total Agent-suitable: 7 Tasks (PageHeader, PlayerDetailModal, EventSelector, historyQueries, HistoryEventCard, HistorieTab, HistoryStats).**

### Agent-Brief Template (fuer agent-suitable Tasks)

```
Du baust EINE Komponente. Lies die Spec section X.Y. Kopiere KEINE Files,
modifiziere KEINE anderen Files. Output: 1 neue Datei mit Component-Code.

Props (verbindlich):
[type interface from Spec]

Verhalten:
[bullet points from Spec section]

Verwende bestehende Patterns:
- TabBar aus @/components/ui/TabBar (falls Tabs)
- Modal aus @/components/ui (falls Modal)
- cn() fuer classNames
- useTranslations('manager') fuer i18n
- mySquadPlayers aus useManagerData (falls noetig)

Output muss:
- npx tsc --noEmit clean kompilieren
- Mobile-friendly sein (min-h-44px Touch Targets)
- Dark Mode Tokens nutzen (white/[0.02], gold, etc.)

Schreibe NUR die Component, keine Tests, keine Stories.
```

---

## PLAN GATE Checklist

- [x] Jede Wave ist eigenstaendig shippbar (ausser Wave 1, bundled mit Wave 2)
- [x] Max 10 Files pro Wave (maximum: Wave 2 mit 10 Files)
- [x] Move und Change in getrennten Tasks innerhalb derselben Wave
- [x] Jeder Task hat "DONE means" Checkliste
- [x] Agent-Tasks sind vollstaendig spezifiziert (Props, Verhalten, Patterns)
- [x] Wave-Dependencies klar dokumentiert
- [x] Verification-Steps pro Wave
- [x] **Anil hat den Plan reviewed** (PLAN GATE passed 2026-04-07)

---

## Status (2026-04-08)

Alle 6 Waves DONE und auf prod (https://www.bescout.net) deployt.

| Wave | Status | Commits |
|------|--------|---------|
| **0** Hook Extraction `useLineupBuilder` | ✓ DONE | 8553968, cae9326 (race-fix during smoke test) |
| **1+2** Foundation + Kader Migration | ✓ DONE | 461d021, a80abb5, c0dadca, 27b36c3 |
| **3** Aufstellen-Tab | ✓ DONE | bbe6086, 4911ce0 |
| **4** Historie-Tab | ✓ DONE | 8ee4c0f, 5777788 (W4.4 cross-tab) |
| **5** Cleanup + Visual QA | ✓ DONE | 9646ec2, cb4ce3f, 4a300c1, 9763f95, d9c1a5a |

**Wave 5 T5.1 Note:** Plan sah Loeschung der `intel/{Stats,Form,Markt}Tab.tsx` vor. Tatsaechliche Implementation: dynamic-imported von `kader/PlayerDetailModal.tsx` statt Logik zu kopieren — DRY > Plan-Treue. Pragmatische Abweichung.

**Wave 5 T5.3 Visual QA Findings (2026-04-08):**
- Mobile 390px alle 3 Tabs OK (Aufstellen / Kader / Historie)
- Desktop 1280px alle 3 Tabs OK
- BottomNav Manager-Active-State OK
- 0 Console-Errors auf /manager
- **Issue gefunden + gefixt:** PageHeader Pill 3 zeigte permanent "Kein Event" weil `nextEvent={null}` in ManagerContent.tsx hardcoded war. Fix: `useOpenEvents()` einbinden, ersten Event als nextEvent reichen.
- 5 prod console-errors auf Homepage (AuthProvider+Wallet timeout retries) — nicht Wave-related, separater Issue.

**Wave 5 T5.4 Final Cleanup Findings (2026-04-08):**
- 0 console.log/debug in features/manager + features/fantasy
- 0 TODO/FIXME/HACK in features/manager
- 0 ESLint errors
- 7 ESLint warnings (5x `<img>` PitchView, 2x exhaustive-deps useLineupBuilder) — alle pre-existing, intentional, non-blocking
- 2 vitest failures gefixt:
  - AchievementUnlockModal: erwartete `/profile?tab=overview`, Code zeigt `/missions` (post 3-Hub Refactor) → Test angepasst
  - business-flows FLOW-11: erlaubt jetzt ended events mit 0 lineups + scored_at IS NOT NULL (Migration edge case `score_event_no_lineups_handling`)

Final Test Suite: **170/170 files, 2347/2347 tests gruen.**
