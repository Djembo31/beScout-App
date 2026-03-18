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
- Pro GW: Nummer, Gegner-Logo, XI/Sub, farbiger Score-Balken, Icons
- Summary-Zeile: Ø Rating, Ø Minuten, X/5 gespielt
- Datenquelle: `getPlayerMatchTimeline()` via `matchTimeline` in CardBackData

### Card Front Cleanup
- Credits/Preis-Sektion entfernt (doppelt mit PlayerHero + Bottom Bar)
- Tap-to-flip Hinweis entfernt
- `bescout_logo_premium.svg` auf beiden Seiten als Markenzeichen
- Aspect auf 3/4.2 optimiert

### RPC cron_recalc_perf (ERLEDIGT)
- `l5_appearances`, `l15_appearances`, `perf_season` zur RPC hinzugefuegt
- 607 Spieler updated, Migration in Git
- Frontend-Workaround (derivedL5Apps) bleibt als Fallback

### ClubContent Refactoring (ERLEDIGT)
- 1299 → 935 Zeilen (-28%)
- 3 neue Files: ClubSkeleton.tsx, SquadOverviewWidget.tsx, FixtureCards.tsx
- Reines Refactoring, kein Verhaltenswechsel

### Admin i18n (TEILWEISE ERLEDIGT)
- 82 neue Keys (DE+TR) unter bescoutAdmin Namespace (201 → 282)
- 4 Files migriert: BescoutAdminContent, AdminFoundingPasses, AdminFees, AdminTreasury
- ~80 Strings in kleineren Tabs noch offen (Events, Airdrop, Debug, Players, etc.)

## Offene Arbeit
1. **Admin i18n Rest** — ~80 Strings in kleineren Admin-Tabs
2. **Stripe** — wartet auf Anils Account
3. **Card Back:** Stop-Hook Feedback offen (aria-labels, loading state)

## Blocker
- Keine
