# Session Handoff
## Letzte Session: 2026-03-18 (Session 241)
## Was wurde gemacht

### Performance Overhaul v2 (5 Phasen, KOMPLETT)
- **P1 Query Fundamentals:** staleTime fix (activeGW 0→5min), tab-gating PlayerContent (16→7 queries), invalidation fix (leaderboard entfernt), Home queries deferred (800ms)
- **P2 Service Layer:** .limit() auf bounties/airdrop, clubCrm parallelisiert (6 seq→2 batches)
- **P3 Neue RPCs:** rpc_get_trending_players (DB-Aggregation statt 1000-row JS), rpc_get_author_track_records (GROUP BY statt N+1)
- **P4 React Rendering:** React.memo auf 8 Components, Community 18 useState→useReducer
- **P5 Bundle:** optimizePackageImports 3→6, Community Modals dynamic import
- Design Doc: `docs/plans/2026-03-18-performance-overhaul-v2-design.md`
- Plan Doc: `docs/plans/2026-03-18-performance-overhaul-v2-plan.md`

### Query Key Integrity Fix
- 5 orphaned raw query keys in misc.ts → migriert zu qk Factory
- invalidateTradeQueries + invalidatePlayerDetailQueries erweitert (holdings.qty, holderCount, offers.bids, ipos.byPlayer)
- Metadata photo_url → image_url fix (Share Previews)

### API-Football Data Integrity (Audit + Fix)
- **Scoring:** Dual-Scale Bug gefixt (Rating×10 vs Formel 0-30 → einheitlich 55-100 mit scaleFormulaToRating())
- **cron_recalc_perf:** total_minutes, total_saves, matches jetzt aggregiert
- **5 defensive Guards:** Ghost Starter Cap, Grid Validation, Position Logging, Name-Disambiguierung, Ambiguity Guard
- **DB Reparatur:** 15 excess Starters demoted, 252 Formel-Scores skaliert, L5/L15 neu berechnet (607 Spieler)

### Daten-Audit Ergebnis (Live-DB)
- 0 Fixtures mit >11 Starters (war 15)
- 0 Formula-Scale Scores (war 259)
- 0 fehlende GW Scores
- 0 falsche total_minutes
- 704 historisch ungematchte Stats (5.6%) — nicht reparierbar ohne manuellen Abgleich

## Offene Arbeit
1. **Admin i18n Rest** — ~80 Strings in kleineren Admin-Tabs
2. **Stripe** — wartet auf Anils Account
3. **704 orphaned fixture_player_stats** — historisch ungematchte Spieler, braucht manuellen Abgleich
4. **Card Back:** Stop-Hook Feedback offen (aria-labels, loading state)

## Blocker
- Keine
