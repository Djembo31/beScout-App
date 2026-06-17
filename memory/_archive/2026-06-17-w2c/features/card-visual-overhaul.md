# Feature: Card Visual Overhaul + Performance Tab Hero

## Status: SPEC
## Typ: Visual Polish (P0 + P1)

---

## Problem

1. Karten-Glow ragt 40% ueber die Karte hinaus (scale(1.4)) → sieht wie Rendering-Bug aus
2. 6 Effekt-Layer uebereinander = visuelles Rauschen (Carbon + Tint + Gradient + Metallic + Holographic + Topo)
3. RadarChart auf Kartenrueckseite kommuniziert Daten schlecht
4. MatchTimeline hat keinen visuellen "Hero Moment" im Performance Tab

---

## Fix 1: Karten-Glow auf Kartengrenzen beschraenken (P0)

### Aktuell (TradingCardFrame.tsx Zeile 98-106):
```tsx
<div className="relative card-entrance ...">
  {/* Ambient glow — 40% GROESSER als Karte */}
  <div
    className="absolute inset-0 rounded-3xl blur-2xl opacity-40"
    style={{ transform: 'scale(1.4)' }}  // ← PROBLEM
  />
```

### Fix:
- Aeusseren Container (`div.relative.card-entrance`) mit `overflow-hidden rounded-2xl` versehen
- ODER: Ambient Glow komplett entfernen und durch `box-shadow` auf der Karte selbst ersetzen
- Tier-Effekte (::after mit top:-50%, width:40%) muessen ebenfalls contained werden

### Empfehlung: box-shadow statt scale(1.4)
```tsx
// Statt skaliertem div:
style={{
  boxShadow: `0 0 40px ${tint}20, 0 0 80px ${tint}10`
}}
```
Das erzeugt einen sauberen Glow der natuerlich an den Kartenraendern endet.

---

## Fix 2: Effekt-Layer reduzieren auf max 3 (P0)

### Aktuell: 6 Layer
1. `card-carbon` — Carbon Fiber Pattern
2. Position Tint — full-card `opacity-[0.08]`
3. Position Gradient — top-to-center
4. `card-metallic::after` — Metallic Sheen (Specular Highlight)
5. `card-holographic::before` — Rainbow Prismatic
6. `topo-overlay::after` — Topo-Map Pattern auf Foto

### Neu: 3 Layer
1. `card-carbon` — BEHALTEN (gibt Textur)
2. Position Tint + Gradient — ZUSAMMENFASSEN zu einem Layer
3. `card-metallic::after` — BEHALTEN (gibt Premium-Gefuehl)

### Entfernen:
- `card-holographic::before` — NUR bei Tier 3+ beibehalten (dort ist es der Tier-Differentiator)
- `topo-overlay::after` auf dem Foto — KOMPLETT entfernen (stoert mehr als es hilft)
- Position edge glow (left side w-12) — ENTFERNEN (kaum sichtbar, noise)
- Subtle bottom gradient — ENTFERNEN (redundant mit Tint)

### CSS Aenderungen (globals.css):
- `card-holographic::before` default auf `display: none`
- `.card-tier-3 .card-holographic::before, .card-tier-4 ..., .card-tier-5 ...` → `display: block`
- `.topo-overlay::after` → entfernen oder `display: none`

---

## Fix 3: RadarChart ersetzen (P1)

### Aktuell: Kartenrueckseite
- RadarChart (130px) + FIFA Stats Grid
- RadarChart importiert aus `@/components/player/RadarChart`

### Neu: Percentile Bars (wie StatsBreakdown, aber kompakter)
- 6 horizontale Bars: L5, L15, Goals, Assists, Matches, Minutes
- Positionsfarbe als Bar-Color
- Wert rechts als Zahl
- Kompakter als RadarChart, besser lesbar

### Aenderungen:
1. `TradingCardFrame.tsx`: RadarChart import + Rendering entfernen
2. Stattdessen: Kompakte Stat-Bars im gleichen Bereich
3. `RadarChart.tsx` + `buildPlayerRadarAxes` bleiben vorerst (werden noch in ScoutCard + Compare genutzt)

### Design der Stat-Bars:
```
L5    ████████████░░░░  82
L15   ██████████░░░░░░  71
GOL   ████░░░░░░░░░░░░  12
AST   ██████░░░░░░░░░░  8
MAT   ██████████████░░  28
MIN   █████████████░░░  2340
```
- Bar-Breite proportional zum Max-Wert in der Position
- Positionsfarbe (tint) fuer die Bar

---

## Fix 4: MatchTimeline als Hero im Performance Tab (P2)

### Aktuell:
- MatchTimeline sieht aus wie jede andere Card
- Gleiche `bg-white/[0.02] border border-white/10 rounded-2xl`

### Neu:
- MatchTimeline bekommt einen subtilen Position-Tint-Header
- Groessere L5-Score-Anzeige
- Form-Dots prominenter
- Leichter visueller Unterschied zu den anderen Sections

### MINIMAL-Aenderung:
- Header-Bereich von MatchTimeline: leichter Gradient mit Position-Tint
- Score-Zahl groesser (text-3xl statt text-xl)
- Rest bleibt gleich

---

## Betroffene Files

| File | Aenderung |
|------|-----------|
| `src/components/player/detail/TradingCardFrame.tsx` | Glow-Fix, Layer-Reduktion, RadarChart → Stat-Bars |
| `src/app/globals.css` | Holographic nur Tier 3+, Topo-Overlay entfernen |
| `src/components/player/detail/MatchTimeline.tsx` | Hero-Styling (minimal) |

## NICHT aendern
- `RadarChart.tsx` — wird noch in ScoutCard + Compare genutzt
- `PlayerHero.tsx` — keine Aenderungen noetig
- `PerformanceTab.tsx` — Reihenfolge stimmt schon

## i18n
- Keine neuen Keys noetig (Stat-Labels existieren bereits)

## Risiken
- Tier-Effekte koennten nach Aenderung anders aussehen → jedes Tier visuell pruefen
- Holographic-Entfernung auf Default-Karten → muss immer noch "Premium" wirken

## Progress (Implementer)
- [ ] Fix 1: Glow auf Kartengrenzen (box-shadow statt scale)
- [ ] Fix 2: Effekt-Layer auf 3 reduzieren
- [ ] Fix 3: RadarChart → Stat-Bars auf Rueckseite
- [ ] Fix 4: MatchTimeline Hero-Styling
- [ ] tsc --noEmit: PASS
- [ ] next build: PASS
