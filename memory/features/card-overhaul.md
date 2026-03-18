# Feature: Card Overhaul (Vorderseite + Rückseite)

## Anils Anforderungen (WÖRTLICH)
- "ich will die flagge wieder sehen auf der vorderseite"
- "die stats schlecht auf der vorderseite"
- "tore, assists und spiele gehören zusammen"
- "der preis ist da, aber sieht genauso aus, wie die anderen stats"
- "die Lscore auch ohne richtige erkennung"
- "füge der trikotnummer noch ein # hinzu"
- "füge dem noch die vertragsdauer des spielers hinzu"
- "die leistungs balken kommen aus den spieltagsbewertung"
- "personalisiert nur besitz, anteil am supply"
- "es soll edel aussehen, nicht zuviele farben"
- "die balken sollen schmal sein"
- "füge den L5 und L15, jeweils drunter ein Balken mit der Einsatzzeit in Prozent"
- DB-Migration Alternative gewählt für l5_appearances/l15_appearances

## Datenquellen

### Vorderseite
| Feld | Quelle | DB Column | Runtime Path | Status |
|------|--------|-----------|-------------|--------|
| L5 Score | players | perf_l5 | player.perf.l5 | Existiert |
| L15 Score | players | perf_l15 | player.perf.l15 | Existiert |
| L5 Appearances | players | l5_appearances | player.perf.l5Apps | **NEU — DB-Migration** |
| L15 Appearances | players | l15_appearances | player.perf.l15Apps | **NEU — DB-Migration** |
| Goals | players | goals | player.stats.goals | Existiert |
| Assists | players | assists | player.stats.assists | Existiert |
| Matches | players | matches | player.stats.matches | Existiert |
| Floor Price | players | floor_price | player.prices.floor | Existiert |
| Flagge | players | nationality | player.country → SVG | **NEU — flag-icons** |
| Shirt # | players | shirt_number | player.ticket | Existiert (nur "#" prefix) |

### Rückseite
| Feld | Quelle | DB Column | Runtime Path | Status |
|------|--------|-----------|-------------|--------|
| Marktwert | players | market_value_eur | player.marketValue | Existiert |
| Floor Price | players | floor_price | player.prices.floor | Existiert |
| 24h Change | players | price_change_24h | player.prices.change24h | Existiert |
| Fee Cap | players | success_fee_cap_cents | player.successFeeCap | Existiert |
| Holdings | holdings | quantity | holdingQty (prop) | Existiert |
| Supply | players | dpc_total | player.dpc.supply | Existiert |
| Vertragsdauer | players | contract_end | player.contractMonthsLeft | Existiert |
| L5 Percentile | berechnet | — | calcPercentile(perf.l5, samePos) | Existiert (StatsBreakdown) |
| L15 Percentile | berechnet | — | calcPercentile(perf.l15, samePos) | Existiert |
| Season Avg Pctl | players | perf_season | player.perf.season | **NEU — Type mappen** |
| Minutes Pctl | players | total_minutes | player.stats.minutes | Existiert |

### Bereits woanders sichtbar?
| Datum | Vorderseite | Rückseite | PlayerHero | Duplikat? |
|-------|-------------|-----------|------------|-----------|
| L5/L15 Wert | JA (Performance Zone) | Percentile-Bar | Nein | Nein (absolut vs. relativ) |
| Floor Price | JA (Gold Price Zone) | Trading-Grid | JA (Hero) | OK (verschiedener Kontext) |
| Goals/Assists/Matches | JA (Stats Zone) | NEIN | Nein | Kein Duplikat |
| Marktwert/Fee Cap | NEIN | JA | Nein | Kein Duplikat |
| Contract | NEIN | JA | Nein | Kein Duplikat |
| Holdings | NEIN | JA (wenn > 0) | JA (Hero Badge) | OK (verschiedener Kontext) |

## Contracts

### Player Type Erweiterung (src/types/index.ts)
```typescript
// perf erweitern:
perf: {
  l5: number;
  l15: number;
  l5Apps: number;    // NEU
  l15Apps: number;   // NEU
  season: number;    // NEU (existiert in DB, nicht gemapped)
  trend: Trend;
};
```

### CardBackData Interface (aktualisiert)
```typescript
interface CardBackData {
  marketValueEur?: number;
  floorPrice?: number;
  priceChange24h?: number;
  successFeeCap?: number;
  holdingQty?: number;
  supplyTotal: number;
  contractMonths: number;  // NEU
  l15: number;
  stats: { goals; assists; matches; cleanSheets; minutes; saves };
  percentiles: {
    l5: number;      // GEÄNDERT — L-Score Percentile statt goals
    l15: number;     // GEÄNDERT
    season: number;  // NEU
    minutes: number; // beibehalten
  };
}
```

### TradingCardFrameProps (aktualisiert)
```typescript
interface TradingCardFrameProps {
  // ... bestehende Props ...
  l5Apps: number;    // NEU — Appearances in last 5 GWs
  l15Apps: number;   // NEU — Appearances in last 15 GWs
  backData?: CardBackData;
}
```

## DB-Migration
```sql
ALTER TABLE players ADD COLUMN l5_appearances SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN l15_appearances SMALLINT NOT NULL DEFAULT 0;
```
RPC `cron_recalc_perf` muss erweitert werden: beim Berechnen von perf_l5/l15
auch COUNT(fixture_player_stats) für die jeweiligen GW-Fenster speichern.

## Flag-Icons
- Package: `flag-icons` (CSS-only, SVGs für 250+ Länder)
- Nutzung: `<span className="fi fi-tr" />` für Türkei-Flagge
- Fallback: 2-Letter Code als Text wenn kein SVG
- Mapping: `player.country` (2-Letter ISO) → CSS-Klasse `fi-${code.toLowerCase()}`
- Import: `import 'flag-icons/css/flag-icons.min.css'` in globals oder Layout

## Scope
- IN: TradingCardFrame Front + Back, PlayerHero Props, Type-Erweiterung, DB-Migration, Flag-Icons
- OUT: PlayerHero Layout (bleibt wie ist), PerformanceTab, StatsBreakdown, andere Pages

## Offene Fragen
- Keine — alle Fragen im Brainstorming geklärt

## Progress
- [ ] DB-Migration (l5_appearances, l15_appearances)
- [ ] RPC cron_recalc_perf erweitern
- [ ] Player Type erweitern (perf.l5Apps, perf.l15Apps, perf.season)
- [ ] dbToPlayer Mapping erweitern
- [ ] flag-icons installieren + integrieren
- [ ] TradingCardFrame Vorderseite (3 Zonen)
- [ ] TradingCardFrame Rückseite (Trading + Contract + Percentile-Bars)
- [ ] PlayerHero Props anpassen
- [ ] PlayerContent Props durchreichen
- [ ] i18n Keys
- [ ] Visual QA mit vollständigem Spieler
