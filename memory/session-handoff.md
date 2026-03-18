# Session Handoff
## Letzte Session: 2026-03-18 (Session 240)
## Was wurde gemacht
### Card Flip Bug Fix (Mobile Safari)
- `overflow-hidden` auf Outer Wrapper brach 3D-Kontext → entfernt
- `visibility`-Toggle als Safari-Fallback (50ms delay)
- `-webkit-backface-visibility: hidden` auf beiden Faces
- 3 Iterationen bis es auf echtem iPhone funktionierte

### Card Back L5 Match Timeline
- Percentile-Bars (L5/L15/AVG/MIN) ERSETZT durch horizontale Match-Bars
- Pro GW: Nummer, Gegner-Logo, XI/Sub, farbiger Score-Balken, Icons (⚽🅰️🟨🟥)
- Summary-Zeile: Ø Rating · Ø Minuten · X/5 gespielt
- Datenquelle: `getPlayerMatchTimeline()` via `matchTimeline` in CardBackData

### Card Front Cleanup
- Credits/Preis-Sektion entfernt (war doppelt mit PlayerHero + Bottom Bar)
- Tap-to-flip Hinweis entfernt
- `bescout_logo_premium.svg` auf beiden Seiten als Markenzeichen
- Aspect auf 3/4.2 optimiert

### Appearance Bars Fix
- DB-Spalten `l5_appearances`/`l15_appearances` leer
- Jetzt aus `matchTimeline` abgeleitet (derivedL5Apps/derivedL15Apps)

## Offene Arbeit
1. **RPC cron_recalc_perf erweitern** — l5/l15_appearances befuellen (Workaround aktiv)
2. **ClubContent.tsx Refactoring** (1299 Zeilen)
3. **Admin i18n** (42 hardcoded Strings)
4. **Stripe** — wartet auf Anils Account

## Blocker
- Keine
