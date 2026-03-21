# Fantasy Player Picker Redesign — Intelligence Strip

**Datum:** 2026-03-21
**Status:** Approved
**Scope:** Fantasy Lineup Builder — Player Picker Row
**Tier:** Scoped (Tier 3)

---

## Problem

Der Fantasy Player Picker zeigt nur Name + L5 + `2T 1A` (wenn >0). Das reicht um einen Spieler zu FINDEN, aber nicht um eine ENTSCHEIDUNG zu treffen. 5 von 10 entscheidungsrelevanten Fragen (Form-Verlauf, Gegner, Gegner-Schwere, Marktwert, Synergy) sind nicht beantwortet.

Vorbild: Sorare's Player Card mit Form-Bars, prominentem L5-Circle und Bonus-Badge.

---

## Design — Intelligence Strip Row

Jede Spieler-Zeile im Picker wird von einer flachen Liste zu einer 4-Zeilen "Intelligence Strip" Row.

### Layout (Mobile-First, 360px)

```
┌─────────────────────────────────────────┐
│  [Photo]  YILMAZ  #7        ▮▮▯▮▮ (72) │
│  [48px ]  DEF  [🛡] SAK                │
│  [ring ]  vs [🛡] FEN 🟢  8S 3T 1A    │
│           42 CR • 3/5 SC • +8% Syn     │
└─────────────────────────────────────────┘
```

### Zeile 1 — Identitaet + Entscheidung

| Element | Specs | Position |
|---------|-------|----------|
| Player Photo | 48px, rund, Position-Farbring (2px border) | Links, row-span |
| Nachname | `font-bold text-sm truncate max-w-[140px]` | Nach Photo |
| Trikotnummer | `#7` — `font-mono text-xs text-white/30` | Nach Name |
| Status Badge | Nur wenn nicht fit: 🔴 verletzt, ⚠️ gesperrt, 🟡 fraglich | Nach Nummer |
| L5 Form-Bars | 5 vertikale Balken, rechts aligned | Rechts oben |
| L5 Score Circle | Runder Badge mit Score, Position-Tint Background | Rechts, nach Bars |

### Zeile 2 — Position + Club

| Element | Specs |
|---------|-------|
| Position Badge | `DEF` — Position-Farbhintergrund, `text-[10px] font-bold px-1.5 py-0.5 rounded` |
| Club Logo | 16px `rounded-full object-cover` — aus `getClub()` Cache |
| Club Short | `SAK` — `text-xs text-white/50` — `club.short` aus DB |

### Zeile 3 — Kontext (Entscheidungshilfe)

| Element | Specs |
|---------|-------|
| Gegner-Label | `vs` — `text-[10px] text-white/30` |
| Gegner Logo | 14px `rounded-full` |
| Gegner Short | `FEN` — `text-xs text-white/60` |
| FDR Badge | Fixture Difficulty: 🟢 leicht / 🟡 mittel / 🔴 schwer — `size-2 rounded-full` |
| Season Stats | `8S 3T 1A` — IMMER angezeigt, auch `0S 0T 0A` — `font-mono text-[11px] text-white/40 tabular-nums` |

### Zeile 4 — Markt-Meta (sekundaer, dezent)

| Element | Specs |
|---------|-------|
| Floor Price | `42 CR` — `font-mono text-[11px] text-white/40` |
| SC Verfuegbarkeit | `3/5 SC` — `text-[11px] text-white/40` |
| Synergy Badge | `+8% Syn` — nur wenn Clubkollege bereits aufgestellt — `text-[11px] text-gold bg-gold/10 px-1.5 rounded` |
| Events Count | `(2 Events)` — nur wenn >0, `text-[11px] text-white/25` |

Trenner zwischen Zeile 3 und 4: `border-t border-white/[0.04]`

### Row States

| State | Styling |
|-------|---------|
| Default | `bg-transparent` |
| Selected (im Lineup) | `bg-green-500/8 border-l-2 border-green-500` |
| Fixture-locked (LIVE) | `bg-emerald-500/5` + `LIVE` Badge pulsierend |
| Deployed (alle SC in Events) | `opacity-40` + `DEPLOYED` Label |
| Verletzt | `bg-red-500/5 opacity-70` |
| Gesperrt | `bg-amber-500/5 opacity-70` |

---

## L5 Form-Bars — Spezifikation

Inspiriert von Sorare's Leistungsbalken, angepasst auf BeScout-Farbsprache.

### Abmessungen

| Property | Mobile (<400px) | Desktop (>=768px) |
|----------|----------------|-------------------|
| Balken-Breite | 6px | 8px |
| Balken-Gap | 2px | 3px |
| Max-Hoehe | 28px | 32px |
| Min-Hoehe (gespielt) | 6px | 8px |
| Nicht-gespielt | 4px, dashed `white/10` | 4px, dashed `white/10` |
| Gesamt-Breite | 38px | 55px |
| Border-Radius | 2px (top) | 2px (top) |

### Farbkodierung (Score-basiert)

| Score | Farbe | Tailwind |
|-------|-------|----------|
| >= 80 | Emerald | `bg-emerald-500` |
| >= 60 | Lime | `bg-lime-500` |
| >= 40 | Amber | `bg-amber-500` |
| < 40 | Rose | `bg-rose-500` |
| Nicht gespielt | Transparent + Strich | `border border-dashed border-white/10` |

### Hoehen-Berechnung

```
barHeight = Math.max(MIN_HEIGHT, (score / 100) * MAX_HEIGHT)
```

Score 0 (gespielt aber 0 Punkte) = MIN_HEIGHT in Rose.
Score null (nicht gespielt) = 4px dashed Strich.

### Reihenfolge

Neuestes Spiel RECHTS (chronologisch links-nach-rechts, wie Sorare).
Datenquelle: `matchTimeline` aus `usePlayerMatchTimeline()` — erste 5 Eintraege.

---

## L5 Score Circle

| Property | Wert |
|----------|------|
| Size | 32px (mobile), 36px (desktop) |
| Shape | Rund, `rounded-full` |
| Background | Position-Tint mit 20% Opacity: `${posTint}33` |
| Border | 1.5px solid Position-Tint 60%: `${posTint}99` |
| Text | Score Zahl, `font-mono font-black text-sm tabular-nums` |
| Text Color | Weiss 90% |

---

## Fixture Difficulty Rating (FDR)

Berechnung basierend auf Gegner-Staerke (Liga-Position oder L15-Durchschnitt des Gegner-Kaders).

### Pilot-Implementierung (einfach)

Fuer den Pilot: FDR aus der Liga-Tabellenposition des Gegners ableiten.

| Gegner Tabellenposition | FDR | Farbe | Label |
|--------------------------|-----|-------|-------|
| Platz 1-4 (Top) | Schwer | `bg-rose-500/20 text-rose-400` | 🔴 |
| Platz 5-12 (Mitte) | Mittel | `bg-amber-500/20 text-amber-400` | 🟡 |
| Platz 13+ (Unten) | Leicht | `bg-emerald-500/20 text-emerald-400` | 🟢 |

Datenquelle: `clubs.league_position` (existiert) oder hartcodiert fuer TFF 1. Lig Pilot.

---

## Enhanced Sort/Filter

### Sort-Pillen (horizontal, scrollbar)

4 Optionen als Pill-Buttons:

| Sort | Key | Richtung |
|------|-----|----------|
| L5 | `perf_l5` | Absteigend (beste zuerst) |
| Form ↑ | L5 minus L15 (Trend) | Absteigend (staerkster Aufwaertstrend) |
| Preis | `floor_price` | Absteigend (teuerste zuerst) |
| A-Z | `last_name` | Alphabetisch |

Active Pill: `bg-white/10 text-white font-bold`
Inactive Pill: `bg-transparent text-white/40`

### Filter-Chips (horizontal, scrollbar, unter Sort)

| Filter | Typ | Default |
|--------|-----|---------|
| Club | Multi-Select Dropdown (Club-Logos + Short) | Alle |
| Nur verfuegbare | Toggle-Chip | An |
| Synergy | Toggle-Chip ("Nur Synergy-Spieler") | Aus |

Active Filter: `bg-gold/10 border-gold/20 text-gold`
Inactive Filter: `bg-white/[0.04] border-white/10 text-white/40`

---

## Responsive Breakpoints

| Screen | Club-Name | Gegner | Stats | Form-Bars | Row-Hoehe |
|--------|-----------|--------|-------|-----------|-----------|
| <400px | `SAK` (short) | `FEN` (short) | `8S 3T 1A` | 5x6px, gap 2px | ~88px |
| >=768px | `Sakaryaspor` (full) | `Fenerbahce` (full) | `8 Sp 3 Tore 1 Ast` | 5x8px, gap 3px | ~96px |

---

## Datenquellen (alle existierend)

| Daten | Quelle | Hook |
|-------|--------|------|
| Spieler-Stammdaten | `players` Table | `usePlayers()` |
| L5/L15 Score | `players.perf_l5`, `perf_l15` | In Player-Objekt |
| Form-Bars (letzte 5 Spiele) | `fixture_player_stats` | `usePlayerMatchTimeline(id, 5)` |
| Club-Logo | `clubs` via `getClub()` Cache | `initClubCache()` |
| Floor Price | `players.floor_price` / Sell Orders | In Player-Objekt |
| SC Holdings | `holdings` Table | `useHoldings()` |
| Saison-Stats (S/T/A) | `players.matches`, `goals`, `assists` | In Player-Objekt |
| Trikotnummer | `players.shirt_number` | In Player-Objekt |
| Gegner (naechstes Spiel) | `fixtures` Table | `useClubFixtures()` oder neu |
| FDR | Liga-Position des Gegners | Abzuleiten aus `clubs` |
| Synergy | Bereits aufgestellte Spieler im Lineup | Client-side Berechnung |

### Neue Daten noetig

| Daten | Loesung |
|-------|---------|
| Naechstes Fixture pro Spieler | Query: naechstes Fixture nach `now()` fuer den Club des Spielers |
| FDR (Gegner-Schwere) | Pilot: Hartcodierte Liga-Tabelle ODER `clubs.league_position` Column |
| Match Timeline fuer ALLE Spieler im Picker | Batch-Query statt per-Player (Performance!) |

---

## Scope — Pilot vs. Spaeter

### Pilot (jetzt)

- [x] Intelligence Strip Row (4-Zeilen Layout)
- [x] L5 Form-Bars (5 Balken, farbkodiert)
- [x] L5 Score Circle (Position-Tint)
- [x] Trikotnummer
- [x] Club-Logo + Gegner-Logo
- [x] Stats immer sichtbar (0S 0T 0A)
- [x] FDR Badge (einfache Berechnung)
- [x] Enhanced Sort (4 Optionen)
- [x] Enhanced Filter (Club, Verfuegbar, Synergy)
- [x] Synergy-Badge (Client-side)
- [x] Responsive (Mobile-First)

### Spaeter

- [ ] Smart Fill / Auto-Aufstellung
- [ ] Aufstellungswahrscheinlichkeit (Starting XI %)
- [ ] Gegner-Staerke pro Position (wie Sorare)
- [ ] Spieler-Vergleich Side-by-Side
- [ ] Swipe-to-Add Gesture

---

## Betroffene Dateien (geschaetzt)

| Datei | Aenderung |
|-------|-----------|
| `src/components/fantasy/event-tabs/LineupPanel.tsx` | Player-Liste Rendering ersetzen |
| `src/components/fantasy/FantasyPlayerRow.tsx` | **NEU** — Intelligence Strip Component |
| `src/components/fantasy/FormBars.tsx` | **NEU** — L5 Form Visualization |
| `src/components/fantasy/FDRBadge.tsx` | **NEU** — Fixture Difficulty Badge |
| `src/components/fantasy/PickerFilters.tsx` | **NEU** — Sort/Filter Bar |
| `src/lib/queries/fixtures.ts` | Erweitern: naechstes Fixture pro Club |
| `src/lib/queries/misc.ts` | Batch matchTimeline fuer mehrere Spieler |
| `messages/de.json` + `messages/tr.json` | i18n Keys fuer neue Labels |
