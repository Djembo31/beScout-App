# Spec: Watchlist von "Mein Kader" nach "Marktplatz" verschieben

**Datum:** 2026-04-13
**Autor:** Jarvis (CTO)
**Status:** SPEC PHASE
**Scope:** Reine UI-Reorganisation, keine DB/RPC/Service-Aenderung

---

## 1.1 Current State

### Feature Inventory (Watchlist)

| # | Feature | Ort | User-Aktion |
|---|---------|-----|-------------|
| F1 | Watchlist-Tab | Portfolio → Sub-Tab "Watchlist" | User klickt auf Watchlist Tab |
| F2 | Spieler-Liste | WatchlistView | Zeigt alle gewatchten Spieler mit Photo, Name, Pos, Club, L5, Floor, 24h% |
| F3 | Sortierung | WatchlistView | 4 Sort-Optionen: Name, Price, L5, 24h Change |
| F4 | Alert-Threshold | ThresholdPopover | Pro Spieler: 0%, 5%, 10%, 20% Preisalarm |
| F5 | Remove | WatchlistView | Spieler von Watchlist entfernen (optimistic) |
| F6 | Player-Link | WatchlistView | Klick auf Spieler → /player/[id] |
| F7 | Empty State | WatchlistView | Heart Icon + "Keine Spieler auf der Watchlist" + Beschreibung |
| F8 | Count | WatchlistView | "{count} Spieler" Header |
| F9 | Toggle Watch | useWatchlistActions | Heart-Icon bei Spieler-Karten toggled Watchlist (lebt ausserhalb der View) |

### File Inventory

| File | Zeilen | Rolle |
|------|--------|-------|
| `src/features/market/components/portfolio/WatchlistView.tsx` | 350 | Haupt-Component (F1-F8) |
| `src/features/market/components/portfolio/PortfolioTab.tsx` | 99 | Container: rendert WatchlistView als Sub-Tab |
| `src/features/market/components/marktplatz/MarktplatzTab.tsx` | 168 | Ziel-Container: aktuell ohne Watchlist |
| `src/features/market/components/MarketContent.tsx` | 248 | Orchestrator: reicht Daten durch |
| `src/features/market/store/marketStore.ts` | 128 | State: Tab-Navigation |
| `src/features/market/hooks/useMarketData.ts` | 79 | Daten-Hook: laedt watchlistEntries + watchlistMap |
| `src/features/market/hooks/useWatchlistActions.ts` | 56 | Toggle-Hook: add/remove Watchlist |
| `src/features/market/queries/watchlist.ts` | ~20 | React Query Hook |
| `src/lib/services/watchlist.ts` | 156 | Service Layer |
| `src/features/market/components/portfolio/__tests__/WatchlistView.test.tsx` | 51 | Unit Test |

### Data Flow

```
useMarketData (Hook)
  → useWatchlist(userId) → getWatchlist() → DB
  → watchlistEntries: WatchlistEntry[]
  → watchlistMap: Record<string, boolean>

MarketContent (Orchestrator)
  → data.watchlistEntries → PortfolioTab Prop
  → data.watchlistMap → useWatchlistActions (Toggle-Logik)

PortfolioTab (Container)
  → portfolioSubTab === 'watchlist' → WatchlistView

WatchlistView (Display)
  → Props: players[], watchlistEntries[]
  → Intern: sort, remove, threshold-update
  → Query Keys: qk.watchlist.byUser(uid)
```

### Shared State

| Store/Key | Aktueller Bezug |
|-----------|----------------|
| `useMarketStore.portfolioSubTab` | `'watchlist'` als Wert |
| `useMarketStore.kaufenSubTab` | Kein Watchlist-Bezug (noch) |
| `qk.watchlist.byUser(uid)` | Geladen in useMarketData, konsumiert in WatchlistView + useWatchlistActions |
| `TAB_ALIAS` in MarketContent | `watchlist: 'portfolio'` |
| `PortfolioSubTab` Type | `'bestand' \| 'angebote' \| 'watchlist'` |
| `KaufenSubTab` Type | `'clubverkauf' \| 'transferliste' \| 'trending'` |

### External Links

Grep `watchlist` in allen tsx/ts ausserhalb market/: **0 Treffer**. Keine externe Seite linkt direkt zur Watchlist. Kein `?tab=watchlist` URL von aussen.

---

## 1.2 Goals + Non-Goals + Anti-Requirements

### Goals
1. Watchlist ist ein Sub-Tab im "Marktplatz" Tab (neben Club Verkauf, Transferliste, Trending)
2. Alle 9 Features (F1-F9) funktionieren identisch wie vorher
3. "Mein Kader" Tab hat nur noch Bestand + Angebote

### Non-Goals
- Watchlist-UI redesignen oder neue Features hinzufuegen
- Service/Hook/Query-Logik aendern
- Neue Watchlist-Features (z.B. "Most Watched" im Marktplatz)
- Andere Tabs reorganisieren

### Anti-Requirements
- KEINE Logik-Aenderung an WatchlistView Component
- KEINE Aenderung an watchlist.ts Service
- KEINE Aenderung an useWatchlistActions Hook
- KEINE neuen Query Keys
- KEINE Aenderung am Toggle-Mechanismus (Heart-Icon in Spieler-Karten)

---

## 1.3 Feature Migration Map

| # | Feature | Current Location | Target | Action |
|---|---------|-----------------|--------|--------|
| F1 | Watchlist Tab-Button | PortfolioTab subTabs Array | MarktplatzTab subTabs Array | MOVE |
| F2 | Spieler-Liste | WatchlistView in portfolio/ | WatchlistView in marktplatz/ | MOVE (File) |
| F3 | Sortierung | WatchlistView intern | WatchlistView intern | STAYS (keine Aenderung) |
| F4 | Alert-Threshold | ThresholdPopover in WatchlistView | ThresholdPopover in WatchlistView | STAYS |
| F5 | Remove | WatchlistView intern | WatchlistView intern | STAYS |
| F6 | Player-Link | WatchlistView intern | WatchlistView intern | STAYS |
| F7 | Empty State | WatchlistView intern | WatchlistView intern | STAYS |
| F8 | Count | WatchlistView intern | WatchlistView intern | STAYS |
| F9 | Toggle Watch | useWatchlistActions (global) | useWatchlistActions (global) | STAYS |

---

## 1.4 Blast Radius Map

### WatchlistView.tsx Consumers
- `PortfolioTab.tsx:22` — dynamic import → **ENTFERNEN**
- `PortfolioTab.tsx:93` — conditional render → **ENTFERNEN**
- `WatchlistView.test.tsx:39` — import → **PFAD UPDATEN**

### PortfolioTab.tsx Consumers
- `MarketContent.tsx:24` — import → **BLEIBT** (PortfolioTab existiert weiter)

### MarktplatzTab.tsx Consumers
- `MarketContent.tsx:25` — import → **BLEIBT** (Props erweitern)

### marketStore Types
- `PortfolioSubTab` genutzt in: PortfolioTab.tsx:9 → **'watchlist' ENTFERNEN**
- `KaufenSubTab` genutzt in: MarktplatzTab.tsx:10 → **'watchlist' HINZUFUEGEN**

### TAB_ALIAS in MarketContent
- `watchlist: 'portfolio'` → **AENDERN zu** `watchlist: 'marktplatz'`

### watchlistEntries Prop-Flow
- `MarketContent:183` → PortfolioTab Prop → **ENTFERNEN aus PortfolioTab Props**
- `MarketContent:189-206` → MarktplatzTab → **HINZUFUEGEN als Prop**

---

## 1.5 Pre-Mortem

| # | Failure Scenario | Mitigation |
|---|-----------------|------------|
| 1 | Watchlist an BEIDEN Orten sichtbar (Portfolio UND Marktplatz) | Migration Map: MOVE = Delete old in SAME wave. Nicht 2 separate Waves. |
| 2 | `portfolioSubTab` Default ist 'watchlist' bei User der zuletzt dort war | Store hat `portfolioSubTab: 'bestand'` als Default. Zustand ist nicht persistiert. KEIN Risiko. |
| 3 | MarktplatzTab rendert Watchlist aber bekommt keine `watchlistEntries` Prop | MarketContent MUSS `data.watchlistEntries` + `data.players` an MarktplatzTab weiterreichen. tsc faengt fehlende Props. |
| 4 | Test-Import bricht | WatchlistView.test.tsx Import-Pfad muss von `../WatchlistView` auf neuen Pfad geaendert werden. |
| 5 | `kaufenSubTab` Default springt auf 'watchlist' statt 'clubverkauf' | Store Default bleibt `kaufenSubTab: 'clubverkauf'`. Watchlist ist nur eine Option, nicht Default. |

---

## 1.6 Invarianten + Constraints

### Invarianten (DUERFEN SICH NICHT AENDERN)
- Watchlist-Daten werden identisch geladen (useMarketData → useWatchlist)
- Optimistic Updates funktionieren identisch (qk.watchlist.byUser)
- Alle 4 Sort-Optionen funktionieren
- Alert-Threshold Popover funktioniert
- Remove funktioniert mit optimistischem Update
- Player-Links fuehren zu /player/[id]
- Empty State zeigt Heart + Text
- Toggle-Watch (Heart-Icon) in Spieler-Karten funktioniert weiterhin global

### Constraints
- Max 10 Files geaendert
- Move und Change in EINER Wave (weil zusammengehoerend und klein genug)
- Keine neuen Components
- Keine neuen Query Keys
- Keine Service-Aenderungen
- `tsc --noEmit` clean nach jeder Aenderung

---

## 1.7 Akzeptanzkriterien

### AK1: Watchlist im Marktplatz sichtbar
```
GIVEN: User hat 3 Spieler auf der Watchlist
WHEN: User oeffnet /market → Tab "Marktplatz" → Sub-Tab "Watchlist"
THEN: 3 Spieler angezeigt mit Photo, Name, Pos, Club, L5, Floor, 24h%
  AND: Sort-Buttons (Name, Price, L5, 24h) funktionieren
  AND: Alert-Bell Popover oeffnet sich und speichert Threshold
  AND: Remove-Button entfernt Spieler (optimistic, kein Reload)
  AND: Klick auf Spieler → /player/[id]
```

### AK2: Watchlist NICHT mehr in Mein Kader
```
GIVEN: User oeffnet /market → Tab "Mein Kader"
THEN: Nur 2 Sub-Tabs sichtbar: "Bestand" + "Angebote"
  AND NOT: "Watchlist" Tab sichtbar
```

### AK3: Empty State
```
GIVEN: User hat 0 Spieler auf der Watchlist
WHEN: User oeffnet Marktplatz → Watchlist
THEN: Heart Icon + "Keine Spieler auf der Watchlist" + Beschreibung
```

### AK4: Toggle Watch weiterhin global
```
GIVEN: User ist auf irgendeiner Seite mit Spieler-Karte (Market, Player Detail)
WHEN: User klickt Heart-Icon
THEN: Spieler wird zur Watchlist hinzugefuegt/entfernt
  AND: Watchlist im Marktplatz-Tab zeigt aktualisierten Stand
```

---

## SPEC GATE

- [x] Current State komplett (9 Features nummeriert)
- [x] Migration Map fuer JEDES Feature
- [x] Blast Radius fuer jede Aenderung gegreppt
- [x] Pre-Mortem mit 5 Szenarien
- [x] Invarianten + Constraints definiert
- [x] Akzeptanzkriterien fuer jede betroffene User-Flow

**Warte auf Anil-Review bevor Plan-Phase.**

---

## PHASE 2: PLAN

### Wave 1 (einzige Wave — Move + Wire, zusammen weil < 10 Files und reine UI)

| Task | File | Aenderung |
|------|------|-----------|
| T1 | `marketStore.ts` | `PortfolioSubTab`: 'watchlist' entfernen. `KaufenSubTab`: 'watchlist' hinzufuegen. |
| T2 | `WatchlistView.tsx` | Physisch verschieben: `portfolio/` → `marktplatz/` |
| T3 | `PortfolioTab.tsx` | Dynamic import WatchlistView entfernen. Sub-Tab Button entfernen. `watchlistEntries` aus Props entfernen. Conditional render entfernen. |
| T4 | `MarktplatzTab.tsx` | Dynamic import WatchlistView hinzufuegen. Sub-Tab Button hinzufuegen (Heart Icon + Label). `watchlistEntries` als Prop hinzufuegen. Conditional render hinzufuegen. |
| T5 | `MarketContent.tsx` | `watchlistEntries` aus PortfolioTab Props entfernen. An MarktplatzTab Props hinzufuegen. `TAB_ALIAS.watchlist` von 'portfolio' auf 'marktplatz' aendern. |
| T6 | `WatchlistView.test.tsx` | Import-Pfad updaten (portfolio → marktplatz). |
| T7 | Verify | `npx tsc --noEmit` + `npx vitest run src/features/market/` |

**Files (7 total):** marketStore.ts, WatchlistView.tsx (move), PortfolioTab.tsx, MarktplatzTab.tsx, MarketContent.tsx, WatchlistView.test.tsx, de.json/tr.json (pruefen, wahrscheinlich keine Aenderung noetig)

**DONE means:**
- [ ] Watchlist Sub-Tab sichtbar im Marktplatz (neben Club Verkauf, Transferliste, Trending)
- [ ] Watchlist NICHT sichtbar im Portfolio
- [ ] Sorting, Alerts, Remove, Player-Links, Empty State funktionieren
- [ ] `tsc --noEmit` 0 errors
- [ ] `vitest run` betroffene Tests gruen
- [ ] Playwright Screenshot 390px zeigt Watchlist im Marktplatz
