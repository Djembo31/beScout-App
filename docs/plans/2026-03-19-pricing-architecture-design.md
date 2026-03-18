# Pricing & Market Architecture — Design Doc

**Datum:** 2026-03-19
**Status:** Approved
**Brainstorming:** Anil + Jarvis

---

## Problem

- 0 aktive Orders, 0 aktive IPOs, nur 47 je gehandelte Spieler
- Floor Price ist synthetisch (MV/10), nicht marktbasiert
- 351 Spieler haben Floor der nicht zum aktuellen MV passt
- User kann nicht erkennen ob Angebote/Gesuche existieren
- Kein klares "verfuegbar ab X" vs "letzter Preis" vs "noch nie gehandelt"

## Anils Anforderungen (WOERTLICH)

- "den bescout referenz wert zu seinem marktwert, das ist der index, wo dran sich die clubs orientieren"
- "fuer die vereine soll das ja so sein, als ob sie zu dem preis anteile von dem spieler an die user ausgeben"
- "der preis soll sich durch angebot und nachfrage bilden, aber fair. so kann der wert auch realitaetbezogen auch fair wachsen"
- "wie im echten trading aus mehreren sourcen. wie ein orderbook verteilt"
- "der user soll angezeigt bekommen, dass er mehrere moeglichkeiten hat, er kann direkt vom guenstigsten kaufen, aber soll selbst noch entscheiden, woher er kauft"
- "nach den ersten trades ist das eh nicht mehr relevant" (zur visuellen Unterscheidung Referenzwert vs. echter Preis)
- "das muss legalkonform sein" (zum Orderbook)
- "wir sollten den letzten verkaufspreis immer mit anzeigen und den ersten IPO verkauf als referenz fuer die wertentwicklung auf der plattform nehmen"

---

## 1. Preis-Hierarchie

Eine Zahl, immer gleich dargestellt — keine visuelle Unterscheidung der Quelle.

| Prioritaet | Quelle | Bedingung |
|------------|--------|-----------|
| 1 | MIN(Sell-Orders, IPO) | Aktive Angebote existieren |
| 2 | Last Trade Price | Schon gehandelt, aber nichts kaufbar |
| 3 | Referenzwert (MV/10) | Noch nie gehandelt |

### Referenzwert

- Formel: `market_value_eur / 10` (in $SCOUT cents)
- Clubs orientieren sich daran fuer IPO-Preissetzung
- Gleiche Darstellung wie echte Preise — kein Label "Referenz"

## 2. Manipulationsschutz

### Sell-Order Price Cap

```
cap = MAX(3x reference_price, 3x MEDIAN(letzte 10 Trades))
```

- Unter 10 Trades: nur `3x reference_price` als Cap
- Ab 10 Trades: der hoehere der beiden Caps gilt
- Sell-Order mit Preis > Cap wird **abgelehnt** (Hard Cap)
- Median resistent gegen Wash Trading (braechte 6/10 kolludierende Trades)

### Warum Median statt Durchschnitt

- Einzelne Ausreisser manipulieren nicht
- Organisches Wachstum ueber Referenzwert hinaus moeglich
- Phase 1 (Pilot, wenig Trades): Referenzwert schuetzt
- Phase 2 (Markt aktiv): Median erlaubt Wachstum

## 3. Neue DB-Felder

| Feld | Typ | Berechnung | Update |
|------|-----|------------|--------|
| `reference_price` | BIGINT cents | `market_value_eur / 10` | Trigger bei MV-Update, cached |
| `initial_listing_price` | BIGINT cents | Erster IPO-Preis | Einmalig, immutable |

### reference_price

- DB Column als Cache + Trigger der bei MV-Update rechnet
- Single Source of Truth fuer Manipulationsschutz + Fallback-Preis
- Ermoeglicht schnelle Queries ohne on-the-fly Berechnung

### initial_listing_price

- Gesetzt beim allerersten IPO eines Spielers
- Danach unveraenderbar (immutable per RPC-Guard)
- Benchmark fuer Wertentwicklung: "Kam mit 500, steht jetzt bei 1.200 (+140%)"

## 4. Marktplatz (Player Detail Page)

### Marktplatz-Sprache (Compliance)

| Vermeiden | Nutzen |
|-----------|--------|
| Orderbook | Marktplatz |
| Asks / Bids | Verkaufsangebote / Kaufgesuche |
| Depth | Verfuegbarkeit |
| Spread | (nicht zeigen) |

### Verkaufsangebote (sortiert nach Preis, guenstigstes oben)

```
Verkaufsangebote (4)
  1.200 $SCOUT - 2x - Clubverkauf
  1.400 $SCOUT - 1x - @scout_fan
  1.500 $SCOUT - 3x - @trader99
  1.800 $SCOUT - 1x - @holder42
```

### Kaufgesuche (sortiert nach Preis, hoechstes oben)

```
Kaufgesuche (2)
  900 $SCOUT - 1x - @user3
  850 $SCOUT - 2x - @user4
```

### Zusaetzlich immer sichtbar

- Letzter Verkaufspreis: "Zuletzt: 1.100 $SCOUT"
- Wertentwicklung: "Markteintritt: 500 $SCOUT -> +140%"

## 5. Kompakte Ansicht (PlayerRow)

```
Hakan Demir  GK  |  1.200 $SCOUT  [4 Angebote]
Emre Yilmaz  ATT |    800 $SCOUT  [Nicht gelistet]
```

- Preis = guenstigstes Angebot (oder Referenzwert als Fallback)
- Badge aggregiert ALLE Quellen (IPO + Sell-Orders zusammen)
- "Nicht gelistet" wenn nichts kaufbar

## 6. Buy Flow (zwei Wege)

1. **Aus Angebotsliste:** User klickt Angebot -> Bestaetigungs-Modal (Preis, Menge, Quelle) -> Kaufen
2. **Ueber "Kaufen"-Button:** Oeffnet Modal mit allen Angeboten -> User waehlt -> Bestaetigung -> Kaufen

## 7. Sell Flow (zwei Wege)

1. **Frei listen:** User setzt Preis (Cap: `MAX(3x Ref, 3x Median)`) + Menge -> Sell-Order erstellt
   - Orientierungshilfe: Referenzwert + hoechstes Kaufgesuch angezeigt
2. **Sofort verkaufen:** User sieht offene Kaufgesuche -> klickt eines an -> Bestaetigung -> Verkauft

## 8. Market Page

- 2 Tabs: **"Mein Kader"** / **"Marktplatz"**
- Marktplatz zeigt Spieler filterbar mit Angeboten + Gesuchen
- Umbenennung von "Kaufen" -> "Marktplatz"

## 9. Wertentwicklung

- Sichtbar auf: Player Detail Page + Portfolio
- Berechnung: `(aktueller_preis - initial_listing_price) / initial_listing_price * 100`
- Darstellung: "Markteintritt: 500 $SCOUT -> Aktuell: 1.200 $SCOUT (+140%)"

## 10. Betroffene Komponenten

| Bereich | Was | Aufwand |
|---------|-----|--------|
| **DB** | `reference_price` + Trigger, `initial_listing_price`, Cap-Logik in `place_sell_order` | Migration |
| **players.ts** | Preis-Hierarchie (MIN Orders/IPO -> Last Trade -> Referenzwert) | Service |
| **PlayerKPIs** | Neue Hierarchie in allen 8 Kontexten | Component |
| **PlayerRow** | Badge "X Angebote" / "Nicht gelistet" | Component |
| **Player Detail** | Marktplatz-Sektion (Verkaufsangebote + Kaufgesuche + Letzter Preis + Wertentwicklung) | Neue Sektion |
| **BuyOrderModal** | Zwei Wege: direkt aus Liste + ueber Button mit Auswahl | Component |
| **Sell Flow** | Orientierungshilfe + "Sofort verkaufen" an Kaufgesuch | Component |
| **Market Page** | Tab-Umbenennung + Filter fuer Angebote + Gesuche | Component |
| **TopMoversStrip** | Neue Preis-Hierarchie | Component |
| **DiscoveryCard** | Neue Preis-Hierarchie + Badge | Component |
| **Portfolio** | Wertentwicklung (initial_listing_price -> aktuell) | Component |

## Scope OUT

- Preis-Charts / Kerzencharts
- Echtzeit-WebSocket Orderbook Updates
- P2P Offers Redesign
- Depth Chart / Spread-Anzeige
