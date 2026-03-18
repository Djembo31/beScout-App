# Card Overhaul — Vorderseite + Rückseite Redesign

## Anils Anforderungen (WÖRTLICH)
- "ich will die flagge wieder sehen auf der vorderseite" → SVG-Flaggen statt Emoji
- "die stats schlecht auf der vorderseite" → Stats-Layout komplett neu
- "tore, assists und spiele gehören zusammen" → Gruppierte Stats-Zeile
- "der preis ist da, aber sieht genauso aus, wie die anderen stats" → Floor Price visuell abgesetzt (Gold)
- "die Lscore auch ohne richtige erkennung" → L5/L15 als Performance Zone oben, prominent
- "füge der trikotnummer noch ein # hinzu" → "#99" statt "99"
- "füge dem noch die vertragsdauer des spielers hinzu" → Contract auf Rückseite
- "die leistungs balken kommen aus den spieltagsbewertung" → Percentile-Bars mit L5/L15/Season/Minutes, NICHT Goals/Assists
- "personalisiert nur besitz, anteil am supply" → Holdings-Row nur wenn > 0
- "es soll edel aussehen, nicht zuviele farben" → Monochrom, Position-Tint einzige Akzentfarbe
- "die balken sollen schmal sein" → Dünne Balken (h-[3px] oder h-1)
- L5/L15 Einsatz-Balken: "füge den L5 und L15, jeweils drunter ein Balken mit der Einsatzzeit in Prozent" → z.B. 4/5 = 80%

## Vorderseite — Layout

### Top Bar (unverändert bis auf)
- Club Logo (wie bisher)
- **SVG-Flagge** statt Emoji (`flag-icons` oder lokale SVGs, z.B. `/flags/tr.svg`)
- Age (mit null-Guard: nicht anzeigen wenn null/0)
- Position Pill: **#99** statt 99 (# prefix vor Trikotnummer)

### Photo (unverändert)
- Spielerfoto mit Position-Glow Ring
- Initials-Fallback bei fehlendem Foto

### Info-Section — 3 visuelle Zonen (ERSETZT 2x3 FIFA Grid)

```
┌──────────────────────────────┐
│  L5  65        L15  71       │  Performance Zone
│  ▓▓▓▓░ 80%    ▓▓▓░░ 47%     │  Einsatz-Balken (schmal, h-1)
├──────────────────────────────┤
│  ⚽ 13    🅰 5    📋 29     │  Stats Zone
├──────────────────────────────┤
│     750 Credits              │  Price Zone (Gold)
└──────────────────────────────┘
```

**Performance Zone:**
- L5 + L15 nebeneinander, text-[22px] font-mono font-black
- Label "L5"/"L15" in text-[8px] uppercase tracking-wider, Position-Tint Farbe
- Darunter jeweils ein SCHMALER Balken (h-1 / 4px): Einsatz-Rate
  - L5: appearances_l5 / 5 * 100
  - L15: appearances_l15 / 15 * 100
  - Balken-Farbe: Position-Tint
  - Track: bg-white/[0.06]
  - Rechts vom Balken: Prozent-Zahl text-[7px] text-white/30
- Separator-Linie darunter (tint gradient, wie auf Front)

**Stats Zone:**
- Goals | Assists | Matches in EINER Zeile, gleichmässig verteilt
- Jeder Stat: Wert (text-[16px] font-mono font-black) + Label darunter (text-[7px])
- Farbe: text-white/70 (subtiler als L-Scores)
- KEINE Icons (⚽🅰📋 waren nur Illustration) — nur Zahl + 3-Letter Label (TOR/ASS/SPI)
- Separator-Linie darunter

**Price Zone:**
- Floor Price gross: text-[18px] font-mono font-black text-gold
- "Credits" Label: text-[8px] text-gold/50
- Zentriert, klar als Preis erkennbar (Gold = Geld)

### BeScout Branding (unverändert)

## Rückseite — Layout

### Trading Block (obere ~50%)

**Section Label:**
```
text-[7px] font-bold uppercase tracking-[0.2em] text-white/25
"SCOUT CARD DATA"
```

**2x2 Metric Grid** (Glassmorphism-Zellen wie bisher):
```
┌─────────┬─────────┐
│ Marktwert│  Floor  │
│  750K €  │ 750 CR  │
├─────────┼─────────┤
│ 24h Chg  │ Fee Cap │
│  +3.2%   │ 120 CR  │
└─────────┴─────────┘
```

**Vertragsdauer** (NEU — unter dem Grid):
```
Zeile: "Vertrag: 18M" oder "Vertrag: Jun 2027" oder "—"
text-[9px] text-white/40, Wert in text-white/70 font-mono
Nur anzeigen wenn contract_end vorhanden
```

**Holdings Row** (nur wenn holdingQty > 0):
```
"3 SC · 1.0% Supply"
bg: tint/08, border: tint/15, rounded-lg
```

### Label-Divider
```
────── LEISTUNG ──────
Position-Tint Gradient-Linien + Text in tint/60
```

### Performance Bars (untere ~35%)

**4 SCHMALE Percentile-Bars** (h-1 / 4px, Position-Tint):
- L5 Percentile (vs. gleiche Position)
- L15 Percentile (vs. gleiche Position)
- Season Avg Percentile (perf_season vs. gleiche Position)
- Minutes Percentile (total_minutes vs. gleiche Position)

**NICHT Goals/Assists/Matches** — die stehen auf der Vorderseite.

Labels: L5 / L15 / AVG / MIN (3-Letter, text-[7px])
Wert: Absoluter Score (text-[9px] font-mono)
Percentile: text-[7px] text-white/25

### Footer
"Tippen zum Drehen · BESCOUT"

## Duplikat-Check

| Datum | Vorderseite | Rückseite | Duplikat? |
|-------|-------------|-----------|-----------|
| L5/L15 Score | Absoluter Wert + Einsatz-Balken | Percentile-Bar (relativ) | Nein — verschiedene Perspektive |
| Floor Price | Gold-Highlight Preis | Im Trading-Grid | Akzeptabel — verschiedener Kontext |
| Goals/Assists/Matches | Stats Zone | NICHT auf Rückseite | Kein Duplikat |
| Marktwert/Fee Cap/Contract | NICHT auf Vorderseite | Trading-Grid | Kein Duplikat |
| Holdings | NICHT auf Vorderseite | Personalisierte Row | Kein Duplikat |

## DB-Migration

```sql
ALTER TABLE players ADD COLUMN l5_appearances SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN l15_appearances SMALLINT NOT NULL DEFAULT 0;
```

RPC `cron_recalc_perf` erweitern: Beim Berechnen von perf_l5/l15 auch
die Appearance-Counts aus fixture_player_stats zählen und in die neuen
Columns schreiben.

## Flag-Icons

SVG-Flaggen statt Emoji. Optionen:
- `flag-icons` npm Package (populär, 250+ Länder)
- Lokale SVGs in `/public/flags/` (leichtgewichtiger, nur benötigte)

Empfehlung: `flag-icons` CSS-only Package — kein JS, nur CSS + SVGs.
Fallback: 2-Letter Country Code wenn SVG fehlt.

## Dateien betroffen

1. `src/components/player/detail/TradingCardFrame.tsx` — Front + Back komplett
2. `src/components/player/detail/PlayerHero.tsx` — neue Props (appearances, perf_season, contract)
3. `src/app/(app)/player/[id]/PlayerContent.tsx` — Props durchreichen
4. `src/lib/services/players.ts` — neue Columns mappen (l5_appearances, l15_appearances)
5. `src/types/index.ts` — Player Type erweitern
6. `messages/de.json` + `messages/tr.json` — neue/angepasste Keys
7. DB-Migration — l5_appearances + l15_appearances Columns
8. Supabase RPC — cron_recalc_perf erweitern

## Was NICHT gemacht wird
- Keine RadarCharts
- Keine Multi-Color Stats (nur Position-Tint)
- Keine Goals/Assists/Matches auf der Rückseite
- Keine animierten Übergänge beim Flip (CSS reicht)
