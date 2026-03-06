# Marketplace UX Redesign — Design Document

> Date: 2026-03-06
> Status: Approved
> Scope: /market page — Navigation, Terminologie, Card-Layouts, Filter, Countdown, Onboarding

## Problem Statement

1. Abgelaufene IPOs werden noch als "Live" angezeigt (Countdown statisch, kein auto-update)
2. User koennen IPO und Transfermarkt nicht unterscheiden — gleiche Optik, kein klarer Flow
3. Keine Info ueber Clubverkaeufe und Angebote auf der Transferliste
4. Fehlende Countdown-Timer fuer Angebotsgueltigkeit
5. Neue User ohne TFF-Kenntnis finden keine Orientierung — keine klare Struktur erkennbar
6. Finanzjargon (IPO, Floor-Preis, DPC) schreckt ab

## Terminologie-Aenderungen

| Alt | Neu | Kontext |
|-----|-----|---------|
| IPO | **Club Verkauf** | Ueberall in UI, Code-Variablen bleiben englisch |
| Floor-Preis | **Gelistet ab** | Transferliste Cards, Spieler-Detail |
| DPC | **Spieler Lizenz** | UI-Label, mit Tooltip-Erklaerung |

Wording-Compliance: "Spieler Lizenz" ist MiCA-konform (kein Ownership/Anteil-Wording).

## Navigation (neu)

```
/market
+-- "Mein Kader" (Segmented Control, prominent)
|   +-- Team (Formation)
|   +-- Bestand (Portfolio-Inventar)
|   +-- Angebote (eingehende Kaufangebote — NEU hier)
|
+-- "Kaufen" (Segmented Control, prominent)
    +-- Club Verkauf (Pill-Tab, kompakter)
    |   +-- Jetzt Live — grosse Cards, Live-Countdown, Fortschrittsbalken
    |   +-- Demnaechst — kompakte Rows, "Startet in X Tagen"
    |   +-- Beendet — kompakte Rows (letzte 7 Tage), Link zum Transfermarkt
    |
    +-- Transferliste (Pill-Tab, kompakter)
        +-- Marktplatz mit erweiterten Filtern + Sortierung
```

### Aenderungen gegenueber Status Quo

- "Angebote" wandert von eigenem Haupt-Tab unter "Mein Kader" (gehoert zum Portfolio)
- "Kaufen" wird in zwei Sub-Tabs aufgeteilt: "Club Verkauf" + "Transferliste"
- Haupt-Tabs: Segmented Control (groesser, prominent)
- Sub-Tabs: Pill-Tabs (kleiner, kompakter, visuell untergeordnet)

## Club Verkauf — Drei Phasen

### Phase 1: Jetzt Live (open / early_access)
- **Layout:** Grosse Cards, volle Breite auf Mobile
- **Inhalt pro Card:**
  - Spieler-Info (Photo, Name, Position, Club-Logo, Nationalitaet)
  - Live-Countdown (tickt via setInterval, rot+pulsierend bei < 1h)
  - Fortschrittsbalken (verkauft / verfuegbar, z.B. "3.200 / 5.000")
  - Preis pro Spieler Lizenz
  - Saison-Stats (Tore, Assists, Spiele)
  - L5 Score + Trend-Pfeil
  - Kaufen-Button

### Phase 2: Demnaechst (announced)
- **Layout:** Kompakte Rows
- **Inhalt:** Spieler-Info + "Startet in X Tagen" + Preis (falls bekannt)
- Weniger visuelles Gewicht als Live

### Phase 3: Beendet (ended, letzte 7 Tage)
- **Layout:** Kompakte Rows
- **Inhalt:**
  - Spieler-Info + "X / 5.000 verkauft"
  - IPO-Preis vs. aktueller Transfermarkt-Preis (falls verfuegbar)
  - "Beendet vor 2 Tagen" Zeitstempel
  - "Auf dem Transfermarkt verfuegbar" Link (falls Sell-Orders existieren)
- Zweck: FOMO + Bruecke zum Sekundaermarkt

## Transferliste — Sekundaermarkt

### Card-Layout (unterscheidet sich von Club Verkauf)
- Spieler-Info (Photo, Name, Position, Club-Logo, Nationalitaet)
- **"Gelistet ab"** Preis (guenstigstes Angebot)
- Anzahl Verkaeufer ("5 Angebote")
- 24h Preisaenderung (+5.2% / -3.1%)
- Sparkline (7-Tage Preisverlauf)
- Saison-Stats (Tore, Assists, Spiele)
- L5 Score + Trend-Pfeil

### Erweiterte Filter (zusaetzlich zu Basis)
- Preisrange-Slider (min/max $SCOUT)
- Anzahl Verkaeufer
- "Beste Deals" Toggle (hoher L5 relativ zu niedrigem Preis)

## Filter & Sortierung

### Basis-Filter (beide Tabs)
| Filter | Typ | Optionen |
|--------|-----|----------|
| Position | Multi-Select | GK, DEF, MID, ATT |
| L5 Performance | Threshold | Alle, >= 45, >= 55, >= 65 |
| Preis | Range | Min — Max |
| Tore | Threshold | Alle, >= 3, >= 5, >= 10 |
| Assists | Threshold | Alle, >= 2, >= 4, >= 8 |
| Spiele | Threshold | Alle, >= 10, >= 20, >= 30 |
| Vertragslaufzeit | Select | Alle, < 6 Monate, < 12 Monate |

### Sortier-Optionen
1. L5 Score (beste zuerst)
2. Preis aufsteigend / absteigend
3. Tore (meiste zuerst)
4. Assists (meiste zuerst)
5. Spiele (meiste zuerst)
6. Vertragslaufzeit (kuerzeste zuerst)

### Zusatz-Filter nur Transferliste
- Preisrange-Slider
- Anzahl Verkaeufer (min)
- "Beste Deals" Toggle

## Live-Countdown

### Technische Umsetzung
- `useEffect` + `setInterval(1000)` statt einmaligem Render
- Cleanup bei Unmount
- Countdown-Format: "Xd Xh" (> 24h), "Xh Xm" (> 1h), "Xm Xs" (< 1h)

### Visuelles Verhalten
- **Normal (> 1h):** Uhr-Icon + Text, normale Farbe
- **Urgent (< 1h):** Rot + pulsierender Punkt (wie Live-Indicator)
- **Abgelaufen:** Card verschwindet aus "Live", erscheint in "Beendet"

### Gilt fuer
- Club Verkauf: IPO-Ablaufzeit (ends_at)
- Transferliste: Order-Ablaufzeit (expires_at)

## Suche

- Eine globale Suchleiste oben im "Kaufen"-Tab
- Durchsucht beide Sub-Tabs gleichzeitig
- Ergebnisse gruppiert anzeigen:
  - "2 Treffer im Club Verkauf"
  - "5 Treffer auf der Transferliste"
- Suche nach: Spielername, Club, Position, Nationalitaet

## Onboarding (Tooltips)

Info-Icons (i) neben folgenden Begriffen, Tooltip bei Tap:

| Begriff | Tooltip-Text |
|---------|-------------|
| Club Verkauf | "Hier kaufst du Spieler Lizenzen direkt vom Verein — limitierte Stueckzahl, fester Preis, begrenzte Zeit." |
| Transferliste | "Hier kaufst du Spieler Lizenzen von anderen Fans — der Preis wird vom Markt bestimmt." |
| Spieler Lizenz | "Eine BeScout Spieler Lizenz ist dein digitaler Vertrag mit einem Spieler. Wird der Spieler transferiert, verdienst du mit." |
| Gelistet ab | "Der guenstigste Preis zu dem dieser Spieler aktuell auf der Transferliste angeboten wird." |
| Vertragslaufzeit | "Je kuerzer der Vertrag, desto wahrscheinlicher ein Transfer — und damit eine Ausschuettung an Lizenz-Halter." |

## Mobile-Verhalten

- Haupt-Tabs: Segmented Control (44px Hoehe, prominent)
- Sub-Tabs: Pill-Tabs (36px Hoehe, kompakter, darunter)
- Alle Touch Targets >= 44px
- Kein horizontaler Overflow
- Filter als Bottom-Sheet (nicht Dropdown)
- Cards: volle Breite, kein Grid auf Mobile

## Betroffene Dateien (geschaetzt)

### Umbenennung IPO -> Club Verkauf
- `src/app/(app)/market/page.tsx` — Tab-Labels, IPO-Sektion
- `src/components/market/KaufenDiscovery.tsx` — Discovery-Sektionen
- `src/components/market/DiscoveryCard.tsx` — Card-Labels
- `src/components/player/detail/BuyModal.tsx` — Modal-Header
- `src/components/player/detail/trading/IPOBuySection.tsx` — UI-Texte
- `messages/de.json`, `messages/en.json`, `messages/tr.json` — i18n Keys

### Navigation-Umbau
- `src/app/(app)/market/page.tsx` — Tab-Struktur, Sub-Tabs
- `src/lib/stores/marketStore.ts` — Zustand Store erweitern
- `src/components/manager/ManagerOffersTab.tsx` — unter Mein Kader verschieben

### Neue Komponenten
- `src/components/market/ClubSaleSection.tsx` — Drei-Phasen Club Verkauf
- `src/components/market/TransferListSection.tsx` — Transferliste mit Filtern
- `src/components/market/MarketSearch.tsx` — Globale Suche mit gruppierten Ergebnissen
- `src/components/ui/Countdown.tsx` — Shared Live-Countdown
- `src/components/ui/InfoTooltip.tsx` — Shared Tooltip fuer Onboarding

### Countdown-Fix
- `src/components/player/detail/trading/IPOBuySection.tsx` — setInterval
- `src/components/player/detail/BuyModal.tsx` — setInterval

### Filter-Erweiterung
- `src/components/market/KaufenDiscovery.tsx` — Basis-Filter erweitern
- `src/lib/stores/marketStore.ts` — Filter-State erweitern

## Nicht im Scope

- Preisalarm-Feature (spaeter)
- Walkthrough/Onboarding-Overlay (nicht gewuenscht)
- Aktienmarkt-Style Orderbook (zu komplex fuer Piloten)
- Swipe-Navigation (zu riskant fuer Discoverability)
- Farbliche Card-Differenzierung (Layout-Unterschied reicht)
