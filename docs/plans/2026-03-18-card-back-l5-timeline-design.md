# Design: Card Back L5 Performance Timeline

## Anils Anforderungen (WOERTLICH)
- "die leistungsbalken wollte ich eigentlich auf der rückseite sehen"
- "der user soll direkt an der balken länge und farbe erkennen, was der spieler letzte woche geleistet hat"
- "kannst tor, assist mit in die balken packen?"
- "XI = Startelf, Zahl = Einwechslung in Minute"
- Referenz: Sorare Card Performance Bars

## Was sich aendert
Percentile-Bars (L5, L15, AVG, MIN) auf der Card-Rueckseite werden ERSETZT durch eine horizontale L5 Match Timeline mit Performance-Balken.

## Layout (Card Back, "LEISTUNG" Sektion)

```
         ── LEISTUNG ──

GW31 🛡 XI ██████████⚽████░░ 92
GW30 🛡 XI █████████████░░░░░ 68
GW29 🛡 XI ████████⚽🅰️██░░░░ 59
GW27 🛡 58 ██████████████░░░░ 73
GW26 🛡 XI ████🟥██░░░░░░░░░░ 40

      Ø 66  ·  83'  ·  5/5
```

### Pro Zeile (5 Zeilen, letzte 5 GWs)
| Element | Inhalt |
|---------|--------|
| GW-Nummer | `GW31` — klein, mono, white/30 |
| Gegner-Logo | Tiny Club-Logo (12-14px) |
| Startelf/Einwechslung | `XI` = Starter, `58` = Einwechslung Minute |
| Performance-Balken | Breite = Score/100, Farbe = Rating-Range |
| Icons im Balken | ⚽ Tor, 🅰️ Assist, 🟨🟥 Karten — eingebettet IN den Balken |
| Score | Zahl rechts am Balkenende |

### Balken-Farben
| Range | Farbe | CSS |
|-------|-------|-----|
| 80+ | Gruen | `emerald-500` |
| 60-79 | Lime | `lime-500` |
| 40-59 | Amber | `amber-500` |
| <40 | Rot | `rose-500` |

### Summary-Zeile
`Ø [avg rating]  ·  [avg min]'  ·  X/5 gespielt`

## Datenquelle
- `getPlayerMatchTimeline(playerId, 5)` aus `lib/services/scoring.ts`
- Liefert: `MatchTimelineEntry[]` mit gameweek, opponent, opponentLogoUrl, isHome, minutesPlayed, isStarter, score, goals, assists, yellowCard, redCard

## Interface-Aenderung

```typescript
// NEU: In CardBackData hinzufuegen
matchTimeline?: {
  gameweek: number;
  opponentShort: string;      // 3-letter code
  opponentLogoUrl: string | null;
  isStarter: boolean;
  minuteIn?: number;          // Einwechslung Minute (nur wenn !isStarter)
  minutesPlayed: number;
  score: number;
  goals: number;
  assists: number;
  yellowCard: boolean;
  redCard: boolean;
}[];

// ENTFERNT aus CardBackData:
// percentiles: { l5, l15, season, minutes }
```

## Betroffene Files
1. `TradingCardFrame.tsx` — CardBackData Interface + Rendering
2. `PlayerHero.tsx` — backData Assembly (matchTimeline hinzufuegen)
3. `scoring.ts` — getPlayerMatchTimeline() bereits vorhanden

## Scope
- IN: L5 Timeline auf Card Back, Summary-Zeile
- OUT: Vertikale Bars, Filter, Pagination, Performance Tab Aenderungen
