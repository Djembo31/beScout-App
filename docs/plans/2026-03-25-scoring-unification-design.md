# Scoring Unification Design

**Date:** 2026-03-25
**Status:** Approved
**Tier:** 4 (Full Feature)

## Problem

Spieler-Scores werden inkonsistent angezeigt:
- 0-100 Skala in Player Detail, Market, Fantasy Picker, Portfolio
- 5.5-10.0 Skala in Fantasy Results, Spieltag, Fixture Detail
- 4 verschiedene Farbfunktionen mit unterschiedlichen Schwellen
- 3 lokale Redefinitionen derselben Logik
- User sehen 78 und 7.8 fuer dasselbe Konzept

**Konsequenz:** Kein Vertrauen in die Werte, obwohl diese den Spielerwert und das User-Interesse bestimmen.

## Entscheidungen

### Skala: 0-100 (Sorare-Modell)

- BeScout ist ein Trading-Produkt, keine Stats-App
- Sorare (naechster Wettbewerber) nutzt 0-100
- 90% der App zeigt bereits 0-100
- Feinere Differenzierung: 72 vs 74 sagt mehr als 7.2 vs 7.4

### Basis-Score: API-Football Rating x 10

- `rating * 10` = BeScout Score (Bereich: 30-100)
- Kein Rating (Spielzeit <15 min) = **kein Score** anzeigen, Label "N/A"
- `calcFantasyPoints()` + `scaleFormulaToRating()` **entfernen** — kein Fake-Score
- Wenn API kein Rating liefert, hat der Spieler fuer dieses Spiel keinen Score

### Fantasy-Punkte: Separates Konzept

Fantasy Lineups nutzen den Match-Score als Basis, addieren aber Multiplikatoren:
- Captain: x1.5
- Synergy: +X%
- Ergebnis kann >100 sein — das ist korrekt und gewollt
- **Klar getrennt anzeigen** vom reinen Match Rating

### Farbsystem: 6-Tier Unified

Eine einzige Funktion `getScoreStyle()` fuer ALLE Score-Anzeigen:

| Tier | Range | Label | Hex | Anwendung |
|------|-------|-------|-----|-----------|
| Elite | 90-100 | Elite | `#374DF5` | Royal Blue |
| Sehr gut | 80-89 | Sehr gut | `#00ADC4` | Cyan |
| Gut | 70-79 | Gut | `#00C424` | Emerald |
| Durchschnitt | 60-69 | Durchschnitt | `#D9AF00` | Gold |
| Unterdurchschnitt | 45-59 | Unterdurchschnitt | `#ED7E07` | Orange |
| Schwach | <45 | Schwach | `#DC0C00` | Red |
| Kein Rating | null/0 | N/A | `#555555` | Grau |
| Bonus (>100) | >100 | — | `var(--gold)` | Gold + Glow (Fantasy Captain) |

Schwelle "Unterdurchschnitt" bei 45 statt 55, weil API-Ratings bis 3.0 runtergehen (Horror-Spiele, Rot-Karten).

## Zukunft: BeScout Scoring Bonuses (NUR GEPLANT)

Wird spaeter auf den Base-Score addiert, positionsabhaengig:
- Tor: ST +3, MF +4, DEF +5
- Assist, Clean Sheet, etc. — Details spaeter
- Kann Score ueber 100 pushen → Gold-Tier greift

**NICHT in dieser Iteration umsetzen.** Nur in der Architektur beruecksichtigen (Score-Funktion muss >100 unterstuetzen).

## Daten-Analyse (Ist-Zustand)

### Score-Verteilung (player_gameweek_scores)

| Bucket | Anzahl | Anteil |
|--------|--------|--------|
| 100 | 136 | 1.1% |
| 90-99 | 56 | 0.5% |
| 80-89 | 349 | 2.8% |
| 70-79 | 2.427 | 19.5% |
| 60-69 | 5.904 | 47.5% |
| 50-59 | 706 | 5.7% |
| <50 | 2.904 | 23.4% |

### NULL Ratings (fixture_player_stats)

| Kategorie | Anzahl | Grund |
|-----------|--------|-------|
| 0 min (Bank) | 3.586 (93%) | Erwartet — kein Score noetig |
| 1-15 min (Spaeteinwechslung) | 259 (7%) | API-Football Limitation |
| **Gesamt** | **3.845 / 13.083** | **29.4%** (aber 93% davon sind 0-min) |

## Betroffene Components

### Farbfunktionen (ENTFERNEN / ERSETZEN)

| Funktion | Datei | Aktion |
|----------|-------|--------|
| `scoreColor()` | `player/scoreColor.ts` | **Rewrite** → `getScoreStyle()` |
| `getL5Color/Hex/Bg()` | `player/index.tsx` | Delegieren an `getScoreStyle()` |
| `scoreBadgeColor()` | `fantasy/spieltag/helpers.ts` | **Entfernen** → `getScoreStyle()` |
| `ratingHeatStyle()` | `fantasy/spieltag/helpers.ts` | **Entfernen** → `getScoreStyle()` |
| `getScoreColor()` | `fantasy/helpers.ts` | **Entfernen** → `getScoreStyle()` |
| `getBarColor()` (lokal) | `player/detail/GameweekScoreBar.tsx` | **Entfernen** → `getScoreStyle()` |
| `scoreColor()` (lokal) | `player/detail/MatchTimeline.tsx` | **Entfernen** → `getScoreStyle()` |

### Score-Konvertierung (5.5-10.0 → 0-100)

| Component | Datei | Aenderung |
|-----------|-------|-----------|
| TopScorerShowcase | `fantasy/spieltag/TopScorerShowcase.tsx` | `rating` → GW Score (0-100) nutzen |
| BestElevenShowcase | `fantasy/spieltag/BestElevenShowcase.tsx` | Gleich |
| FixtureDetailModal | `fantasy/spieltag/FixtureDetailModal.tsx` | Gleich |
| PersonalResults | `fantasy/ergebnisse/PersonalResults.tsx` | Gleich |
| FormationTab | `fantasy/spieltag/fixture-tabs/FormationTab.tsx` | Gleich |
| RankingTab | `fantasy/spieltag/fixture-tabs/RankingTab.tsx` | Gleich |

### Farbsystem-Migration (4-Tier → 6-Tier)

| Component | Datei | Aenderung |
|-----------|-------|-----------|
| FormBars | `fantasy/FormBars.tsx` | `scoreColor()` → `getScoreStyle()` |
| TradingCardFrame | `player/detail/TradingCardFrame.tsx` | Gleich |
| ScoreCircle | `player/index.tsx` | L5_THRESHOLDS anpassen |
| PlayerRow | `player/PlayerRow.tsx` | `getL5Color()` bleibt (delegiert intern) |
| DiscoveryCard | `market/DiscoveryCard.tsx` | Via PlayerKPIs — automatisch |
| LineupPanel | `fantasy/event-tabs/LineupPanel.tsx` | `getScoreColor()` → `getScoreStyle()` |

### Fallback-Logik (ENTFERNEN)

| Funktion | Datei | Aktion |
|----------|-------|--------|
| `calcFantasyPoints()` | `lib/footballApi.ts` | **Entfernen** (nicht mehr als Score-Fallback genutzt) |
| `scaleFormulaToRating()` | `lib/footballApi.ts` | **Entfernen** |
| Fallback-Branch in Sync | `lib/services/footballData.ts` | NULL speichern statt Fake-Score |

## Was sich NICHT aendert

- DB-Schema (Spalten bleiben, Werte werden korrekt)
- L5/L15/Season Aggregation (`cron_recalc_perf`)
- API-Football Datenimport
- Trading/Pricing Logik
- Fantasy Event Scoring RPC (Captain-Multiplikator bleibt)

## Geschaetzte Files

~30 Files betroffen, davon:
- 4 Primary (Farbfunktionen)
- 6 Konvertierung (5.5-10.0 → 0-100 Datenquelle wechseln)
- 8 Farbsystem-Migration
- 2 Fallback-Entfernung
- ~10 Tests
