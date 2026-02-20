# BeScout — Player Card Component System

> **Zweck:** Einheitliches, kontextabhängiges Spieler-Darstellungssystem
> **Problem:** Spieler werden in 12+ verschiedenen Kontexten angezeigt, jedes Mal anders
> **Lösung:** 1 Base Layer + 6 Context Badges + 3 Größen = konsistentes, scanbares System

---

## DAS PRINZIP: ANATOMIE EINER SPIELER-KARTE

Jede Spieler-Darstellung in BeScout besteht aus **3 Schichten**:

```
┌─────────────────────────────────────────────────┐
│  SCHICHT 1: IDENTITÄT (immer gleich, immer da)  │
│  → Foto, Name, Position, Club, Nationalität     │
│  → Der User erkennt den Spieler in 0.3 Sekunden │
│                                                  │
│  SCHICHT 2: KONTEXT-DATEN (variabel, 1-3 KPIs)  │
│  → Zeigt NUR was in DIESEM Kontext relevant ist  │
│  → Markt: Preis + Trend. Fantasy: Form + Rating  │
│                                                  │
│  SCHICHT 3: ACTION (optional, 0-1 Aktion)        │
│  → Was kann der User HIER tun?                   │
│  → "Kaufen", "Aufstellen", "Predicten"           │
└─────────────────────────────────────────────────┘
```

---

## SCHICHT 1: IDENTITÄT (Der "Anker")

Immer gleich. Immer an der gleichen Stelle. Immer in der gleichen Reihenfolge. Das ist der visuelle Anker — der User muss HIER nie nachdenken.

```
┌─────────────────────────────────┐
│  [FOTO]  Name                   │
│          Position · Club-Logo   │
│          🇹🇷 · ⭐ Rarity-Badge │
└─────────────────────────────────┘

ELEMENTE:
├── Spieler-Foto (rund, 40/48/64px je nach Kartengröße)
├── Name (bold, abgekürzt wenn nötig: "B.A. Yılmaz")
├── Position (GK / DEF / MID / FW — farbcodiert)
│   ├── GK = Gelb
│   ├── DEF = Blau
│   ├── MID = Grün
│   └── FW = Rot
├── Club-Logo (16px, neben Position)
├── Nationalität-Flagge (16px)
└── Rarity-Badge (wenn DPC vorhanden):
    ├── Common = Grauer Punkt
    ├── Rare = Blauer Punkt
    ├── Epic = Lila Punkt
    ├── Legendary = Goldener Punkt
    └── Mythic = Roter Punkt mit Glow

REGELN:
├── Foto ist IMMER links
├── Name ist IMMER die erste Zeile rechts vom Foto
├── Position + Club ist IMMER die zweite Zeile
├── Reihenfolge ändert sich NIE, egal welcher Kontext
└── Wenn kein Foto verfügbar: Initialen auf Position-Farbe
```

---

## SCHICHT 2: KONTEXT-DATEN (Das Herzstück)

### Die 12 Kontexte und ihre KPIs

Für jeden Kontext sind EXAKT 1-3 Key Values definiert. Nicht mehr. Nicht weniger. Der User bekommt genau die Information die er für DIESE Entscheidung braucht.

---

### KONTEXT 1: MARKT — DPC KAUFEN

```
Frage des Users: "Soll ich diese DPC kaufen?"
Entscheidungs-Daten: Preis + Preis-Trend + Verfügbarkeit

┌─────────────────────────────────────────┐
│  [FOTO]  Barış A. Yılmaz                │
│          FW · 🟢 Sakaryaspor  🇹🇷       │
│          ⭐ Rare                         │
│  ┌─────────────────────────────────────┐ │
│  │  💰 1.840 BSD    📈 +12% (7T)      │ │
│  │  📦 23/80 verfügbar                 │ │
│  └─────────────────────────────────────┘ │
│              [ 🛒 Kaufen ]               │
└─────────────────────────────────────────┘

KPIs:
├── 💰 Aktueller Preis (BSD)
├── 📈 Preis-Trend (% Änderung, 7 Tage, grün/rot)
└── 📦 Verfügbarkeit (X von Y noch da)

ACTION: "Kaufen" Button
```

---

### KONTEXT 2: MARKT — DPC VERKAUFEN

```
Frage des Users: "Soll ich diese DPC jetzt verkaufen?"
Entscheidungs-Daten: Mein Profit + Mastery-Stand + Volumen

┌─────────────────────────────────────────┐
│  [FOTO]  Barış A. Yılmaz                │
│          FW · 🟢 Sakaryaspor  🇹🇷       │
│          ⭐ Rare · Mastery ████░ Lv.4   │
│  ┌─────────────────────────────────────┐ │
│  │  Profit: +340 BSD (+22%)            │ │
│  │  Gekauft: 1.500 · Jetzt: 1.840     │ │
│  │  📊 12 Trades/7T                    │ │
│  └─────────────────────────────────────┘ │
│    [ Verkaufen ]    [ Halten ]           │
└─────────────────────────────────────────┘

KPIs:
├── 💰 Profit/Loss (BSD + %, grün/rot)
├── 📊 Kauf vs. Jetzt-Preis
└── 📊 Trading-Volumen (Liquidität — kann ich überhaupt verkaufen?)

EXTRA: Mastery-Bar (warnt: "Bei Verkauf: Mastery eingefroren")
ACTION: "Verkaufen" + "Halten"
```

---

### KONTEXT 3: PORTFOLIO — MEINE DPCs

```
Frage des Users: "Wie steht mein DPC-Portfolio?"
Entscheidungs-Daten: P&L + Mastery-Fortschritt + PBT

┌─────────────────────────────────────────┐
│  [FOTO]  Barış A. Yılmaz                │
│          FW · 🟢 Sakaryaspor            │
│          ⭐ Rare · Mastery ████░ Lv.4   │
│  ┌─────────────────────────────────────┐ │
│  │  💰 +340 BSD (+22%)                 │ │
│  │  🎯 Mastery 4/5 · 67 Tage gehalten │ │
│  │  💎 PBT: 3x Share                   │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘

KPIs:
├── 💰 Unrealisierter Profit/Loss
├── 🎯 Mastery Level + Tage bis nächstes Level
└── 💎 PBT Share (was bekomme ich)

ACTION: Keiner (Info-Ansicht). Tap → Detail.
```

---

### KONTEXT 4: FANTASY — LINEUP AUFSTELLEN

```
Frage des Users: "Soll der Spieler in mein Lineup?"
Entscheidungs-Daten: Form + Rating + Gegner + DPC-Boost

┌─────────────────────────────────────────┐
│  [FOTO]  Barış A. Yılmaz                │
│          FW · 🟢 Sakaryaspor            │
│  ┌─────────────────────────────────────┐ │
│  │  ⚡ Form: 7.2 (Ø letzte 5)         │ │
│  │  🆚 vs Kocaelispor (H) · Sa 19:00  │ │
│  │  🔋 DPC Boost: ×1.5 (Mastery 4)    │ │
│  └─────────────────────────────────────┘ │
│            [ ➕ Aufstellen ]             │
└─────────────────────────────────────────┘

KPIs:
├── ⚡ Form (Durchschnitts-Rating letzte 5 Spiele)
├── 🆚 Nächster Gegner + Heim/Auswärts + Zeit
└── 🔋 DPC Boost (wenn DPC besessen, zeige Multiplikator)

EXTRA: Wenn kein DPC → zeige "Ohne DPC-Boost" (grau)
ACTION: "Aufstellen" / "Als Captain"
```

---

### KONTEXT 5: FANTASY — IM LINEUP (Spieltag)

```
Frage des Users: "Wie performt mein Lineup-Spieler GERADE?"
Entscheidungs-Daten: Live-Punkte + Key Events

┌─────────────────────────────────────────┐
│  [FOTO]  Barış A. Yılmaz     🔴 LIVE   │
│          FW · 🟢 Sakaryaspor            │
│  ┌─────────────────────────────────────┐ │
│  │  🏆 14 Pkt (×1.5 Boost = 21)       │ │
│  │  ⚽ 1 Tor · 🅰️ 1 Assist            │ │
│  │  📊 Rating: 8.1 · Min: 72'         │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘

KPIs:
├── 🏆 Fantasy-Punkte (roh + mit Boost)
├── ⚽ Key Events (Tore, Assists, Clean Sheets)
└── 📊 Live-Rating + Minuten

EXTRA: "Captain" Badge wenn Captain. "🔴 LIVE" Indikator.
ACTION: Keiner (Read-Only während Spiel).
```

---

### KONTEXT 6: PREDICTION — VORHERSAGE STELLEN

```
Frage des Users: "Was sage ich über diesen Spieler vorher?"
Entscheidungs-Daten: Stats die Predictions informieren

┌─────────────────────────────────────────┐
│  [FOTO]  Barış A. Yılmaz                │
│          FW · 🟢 Sakaryaspor            │
│  ┌─────────────────────────────────────┐ │
│  │  Saison: 8 ⚽ · 4 🅰️ · Ø 6.9      │ │
│  │  Letzte 5: 3 ⚽ · Form ↑            │ │
│  │  🆚 vs Kocaelispor (H)              │ │
│  └─────────────────────────────────────┘ │
│  [ >1 Tor ] [ >7.0 Rating ] [ Assist ]  │
└─────────────────────────────────────────┘

KPIs:
├── 📊 Saison-Stats (Tore, Assists, Ø-Rating)
├── 📊 Letzte 5 Spiele (Kurzform + Trend ↑↓)
└── 🆚 Nächster Gegner

ACTION: Prediction-Buttons (kontextabhängig nach Position)
├── FW: Tore, Assists, Rating
├── MID: Assists, Rating, Tore
├── DEF: Clean Sheet, Rating, Karten
└── GK: Clean Sheet, Paraden, Rating
```

---

### KONTEXT 7: IPO — NEUER SPIELER KAUFEN

```
Frage des Users: "Ist dieser IPO ein guter Kauf?"
Entscheidungs-Daten: Preis + Stats + Supply + Rarity

┌─────────────────────────────────────────┐
│  [FOTO]  NEU — Mehmet Yıldız            │
│  🆕 IPO  FW · 🟢 Sakaryaspor  🇹🇷      │
│          ⭐ Rare                         │
│  ┌─────────────────────────────────────┐ │
│  │  💰 IPO Preis: 2.000 BSD            │ │
│  │  📦 Supply: 80 Rare DPCs            │ │
│  │  📊 Alter: 22 · Letzte Saison: 12⚽ │ │
│  │  ⏰ IPO endet in 47:23:15           │ │
│  └─────────────────────────────────────┘ │
│              [ 🛒 IPO Kaufen ]           │
└─────────────────────────────────────────┘

KPIs:
├── 💰 IPO-Preis (BSD)
├── 📦 Supply (wie viele existieren)
├── 📊 Kerndaten (Alter, letzte Saison Highlights)
└── ⏰ IPO-Countdown

ACTION: "IPO Kaufen"
```

---

### KONTEXT 8: ERGEBNIS — NACH DEM SPIEL

```
Frage des Users: "Wie hat mein Spieler abgeschnitten?"
Entscheidungs-Daten: Performance + Score Impact + Prediction

┌─────────────────────────────────────────┐
│  [FOTO]  Barış A. Yılmaz     ✅ 8.1     │
│          FW · 🟢 Sakaryaspor            │
│  ┌─────────────────────────────────────┐ │
│  │  ⚽ 1 Tor · 🅰️ 1 Assist · 86'      │ │
│  │  🏆 Fantasy: 14 Pkt (+21 mit Boost) │ │
│  │  🎯 Prediction: ✅ ">1 Tor" +10     │ │
│  │  📈 DPC Preis: +8% seit Anpfiff     │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘

KPIs:
├── ⚽ Match-Performance (Events + Minuten)
├── 🏆 Fantasy-Punkte (mit Boost wenn relevant)
├── 🎯 Prediction-Ergebnis (wenn gestellt)
└── 📈 DPC-Preis-Impact

FARB-CODING: Rating als Badge
├── ≥8.0: Gold (herausragend)
├── ≥7.0: Grün (gut)
├── ≥6.0: Gelb (okay)
├── <6.0: Rot (schlecht)
```

---

### KONTEXT 9: LEADERBOARD / PROFIL — SPIELER-EXPERTISE

```
Frage: "Wie gut kennt dieser User diesen Spieler?"
Entscheidungs-Daten: Mastery + Prediction Accuracy

┌─────────────────────────────────────────┐
│  [FOTO]  Barış A. Yılmaz                │
│          FW · 🟢 Sakaryaspor            │
│  ┌─────────────────────────────────────┐ │
│  │  🎯 Mastery 4/5 · "Experte"        │ │
│  │  📊 Predictions: 8/10 (80%)         │ │
│  │  🏷️ "Barış-Kenner"                 │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘

KPIs:
├── 🎯 Mastery Level + Label
├── 📊 Prediction-Accuracy für diesen Spieler
└── 🏷️ Expertise-Tag (wenn Mastery ≥3)

ACTION: Keiner (Showcase-Ansicht)
```

---

### KONTEXT 10: FEED — IN EINEM POST / ANALYSE

```
Frage: Kontext zu einem Beitrag über den Spieler.
Entscheidungs-Daten: Minimal — nur Identifikation + 1 relevanter Stat

┌──────────────────────────────┐
│  [FOTO] Barış · FW · 🟢 SAK │
│  Ø 7.2 · 📈 +12%            │
└──────────────────────────────┘

KPIs (nur 1, kontextabhängig):
├── In Performance-Post: Ø Rating
├── In Markt-Post: Preis-Trend
├── In Transfer-Post: Alter + Vertrag
└── In Prediction-Post: Prediction-Accuracy

ACTION: Tap → Spieler-Detail
```

---

### KONTEXT 11: SUCHE / AUSWAHL

```
Frage: "Welcher Spieler ist das?"
Entscheidungs-Daten: Minimal — Identifikation + Position + Club

┌──────────────────────────────┐
│  [FOTO]  Barış A. Yılmaz    │
│          FW · 🟢 Sakaryaspor │
└──────────────────────────────┘

KPIs: Keine. Nur Identität.
ACTION: Tap → Kontextabhängig (Markt, Fantasy, Prediction)
```

---

### KONTEXT 12: EVENT — SPIELER IM EVENT-KONTEXT

```
Frage: "Wie relevant ist dieser Spieler für DIESES Event?"
Entscheidungs-Daten: Event-spezifische Performance

┌─────────────────────────────────────────┐
│  [FOTO]  Barış A. Yılmaz                │
│          FW · 🟢 Sakaryaspor            │
│  ┌─────────────────────────────────────┐ │
│  │  🏆 "Barış Week" Event              │ │
│  │  📊 Event Stats: 2⚽ · 1🅰️ · Ø 7.8 │ │
│  │  🔥 Event Rang: #3 von 487          │ │
│  └─────────────────────────────────────┘ │
│  [ Prediction stellen ] [ DPC kaufen ]   │
└─────────────────────────────────────────┘

KPIs:
├── 🏆 Event-Name + Kontext
├── 📊 Performance im Event
└── 🔥 Event-Rang

ACTION: Kontextabhängig (Prediction / Kauf)
```

---

## 3 KARTEN-GRÖßEN

```
COMPACT (40px Foto, 1 Zeile Kontext):
├── Für: Listen, Lineups, Feed-Inline, Suchergebnisse
├── Höhe: ~56px
├── Zeigt: Identität + 1 KPI
└── Beispiel: [FOTO] Barış · FW · 🟢 · 7.2 ⭐

STANDARD (48px Foto, 2-3 Zeilen Kontext):
├── Für: Markt-Listen, Portfolio, Fantasy-Auswahl, Events
├── Höhe: ~88px
├── Zeigt: Identität + 2-3 KPIs + optional 1 Action
└── Die häufigste Kartengröße

EXPANDED (64px Foto, 3-4 Zeilen + Action-Bar):
├── Für: IPO, Verkaufs-Entscheidung, Ergebnis-Screen, Detail-Preview
├── Höhe: ~120px
├── Zeigt: Identität + 3-4 KPIs + Action Buttons
└── Für Momente wo eine ENTSCHEIDUNG getroffen wird
```

---

## KONTEXT-MATRIX (Welche Größe wo?)

```
KONTEXT              GRÖßE      KPIs                        ACTION
─────────────────────────────────────────────────────────────────────
Markt: Kaufen        Standard   Preis, Trend, Supply        Kaufen
Markt: Verkaufen     Expanded   Profit, Kaufpreis, Volume   Verkaufen/Halten
Portfolio            Standard   P&L, Mastery, PBT           —
Fantasy: Aufstellen  Standard   Form, Gegner, DPC-Boost     Aufstellen
Fantasy: Im Lineup   Standard   Live-Pkt, Events, Rating    —
Fantasy: Ergebnis    Expanded   Performance, Pkt, Prediction Ergebnis  —
Prediction stellen   Expanded   Saison-Stats, Form, Gegner  Prediction-Buttons
IPO                  Expanded   IPO-Preis, Supply, Stats    IPO Kaufen
Profil/Expertise     Standard   Mastery, Accuracy           —
Feed/Post            Compact    1 relevanter Stat            Tap → Detail
Suche                Compact    —                           Tap → Kontext
Event                Standard   Event-Stats, Event-Rang      Prediction/Kauf
```

---

## FARBSYSTEM

```
POSITIONS-FARBEN (konsistent überall):
├── GK:  #FFC107 (Gelb)
├── DEF: #2196F3 (Blau)
├── MID: #4CAF50 (Grün)
├── FW:  #F44336 (Rot)

RARITY-FARBEN:
├── Common:    #9E9E9E (Grau)
├── Rare:      #2196F3 (Blau)
├── Epic:      #9C27B0 (Lila)
├── Legendary: #FFD700 (Gold)
├── Mythic:    #FF1744 (Rot) + Glow-Effekt

TREND-FARBEN:
├── Positiv: #4CAF50 (Grün)
├── Neutral: #9E9E9E (Grau)
├── Negativ: #F44336 (Rot)

RATING-FARBEN:
├── ≥8.0: #FFD700 (Gold)
├── ≥7.0: #4CAF50 (Grün)
├── ≥6.0: #FFC107 (Gelb)
├── <6.0: #F44336 (Rot)
```

---

## SPIELER-DETAIL-SEITE (Alles an einem Ort)

Wenn der User auf IRGENDEINER Karte tappt, kommt er zur Spieler-Detail-Seite. Diese hat ALLE Informationen, strukturiert in Tabs:

```
┌─────────────────────────────────────────┐
│  [GROßES FOTO]                          │
│  Barış Alper Yılmaz                     │
│  FW · Sakaryaspor · 🇹🇷 Türkei          │
│  23 Jahre · Vertrag bis 2027            │
│  ⭐ Rare DPC · Mastery ████░ Lv.4      │
│                                          │
│  [📊 Stats] [💰 Markt] [🎯 Predict] [📋 DPC]  │
│─────────────────────────────────────────│
│                                          │
│  TAB: 📊 STATS                          │
│  ├── Saison-Statistiken (Tore, Assists) │
│  ├── Letzte 5 Spiele (Rating-Verlauf)   │
│  ├── Fantasy-Punkte (Verlauf)           │
│  └── Positionsvergleich (vs Liga Ø)     │
│                                          │
│  TAB: 💰 MARKT                          │
│  ├── DPC Preis-Chart (7T, 30T, Saison)  │
│  ├── Trading-Volumen                    │
│  ├── Orderbook (Kauf/Verkauf)           │
│  ├── Supply (X/Y verkauft)              │
│  └── Float (wie viele im Umlauf)        │
│                                          │
│  TAB: 🎯 PREDICTIONS                   │
│  ├── Meine Predictions (History)        │
│  ├── Community Accuracy (% richtig)     │
│  ├── Beliebteste Predictions            │
│  └── Meine Accuracy für diesen Spieler  │
│                                          │
│  TAB: 📋 DPC INFO                      │
│  ├── Rarity + Supply                    │
│  ├── Mastery Fortschritt (Detail)       │
│  ├── PBT Status                         │
│  ├── Fantasy Boost                      │
│  ├── Holding-Dauer                      │
│  └── Vertragsdaten / Biografie          │
│                                          │
│  [ 🛒 Kaufen ] [ ➕ Lineup ] [ 🎯 Predict ] │
└─────────────────────────────────────────┘

Die Action-Bar unten ist IMMER sichtbar (sticky).
Die 3 Haupt-Aktionen sind immer erreichbar.
```

---

## REGELN FÜR ENTWICKLER

```
1. IDENTITÄT IST HEILIG
   Foto + Name + Position + Club darf NIRGENDS weggelassen werden.
   Auch in der kleinsten Compact-Karte.

2. POSITION WIRD ÜBERALL GLEICH DARGESTELLT
   Immer als farbcodiertes Badge (GK/DEF/MID/FW).
   Nie als Text "Stürmer" oder "Mittelfeld".

3. MAXIMAL 3 KPIs PRO KARTE
   Wenn du mehr als 3 Datenpunkte zeigen willst → falsche Größe.
   Wechsle auf Expanded oder zeig es im Detail.

4. 1 ACTION MAXIMUM PRO KARTE
   Nie 3 Buttons auf einer Karte.
   Exception: Verkaufen/Halten (binäre Entscheidung).

5. TRENDS IMMER MIT FARBE + RICHTUNG
   Nie nur "+12%". Immer: "📈 +12%" in Grün.
   Der User muss in 0.5 Sekunden wissen: gut oder schlecht?

6. DPC-BESITZ SICHTBAR MACHEN
   Wenn User die DPC besitzt: Rarity-Border um die Karte.
   Rare = blauer Border. Legendary = goldener Border.
   Der User sieht SOFORT: "Das ist MEIN Spieler."

7. MASTERY NUR WENN RELEVANT
   Portfolio, Verkauf, Fantasy-Auswahl: Mastery zeigen.
   Markt-Kauf, Suche, Feed: Mastery weglassen.

8. ZAHLEN IMMER GLEICH FORMATIERT
   BSD: "1.840 BSD" (mit Punkt als Tausender)
   Prozent: "+12%" (mit Vorzeichen)
   Rating: "7.2" (1 Dezimalstelle)
   Punkte: "14 Pkt" (abgekürzt)
```

---

## IMPLEMENTIERUNGS-CHECKLISTE

```
COMPONENT-NAMEN:
├── <PlayerIdentity />      — Schicht 1 (wiederverwendbar überall)
├── <PlayerCardCompact />   — Compact (40px, 1 KPI)
├── <PlayerCardStandard />  — Standard (48px, 2-3 KPIs)
├── <PlayerCardExpanded />  — Expanded (64px, 3-4 KPIs + Action)
├── <PlayerDetail />        — Full-Page Detail mit Tabs
└── <PlayerActionBar />     — Sticky Actions (Kaufen/Lineup/Predict)

PROPS:
├── player: PlayerData
├── context: "market-buy" | "market-sell" | "portfolio" | "fantasy-select"
│           | "fantasy-lineup" | "fantasy-result" | "prediction"
│           | "ipo" | "profile" | "feed" | "search" | "event"
├── size: "compact" | "standard" | "expanded"
├── owned: boolean (zeigt DPC-Border)
├── mastery: number (0-5)
└── action: ActionConfig (optional)

JEDER KONTEXT BESTIMMT:
├── Welche KPIs gezeigt werden
├── Welche Farben prominent sind
├── Ob und welcher Action-Button erscheint
└── Das Component wählt automatisch basierend auf context
```
