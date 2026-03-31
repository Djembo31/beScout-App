# Current Sprint — Quality-First + Performance

## Stand (2026-04-01, Session 275)
- **Tests:** tsc 0 Errors, 195+ Unit Tests
- **Branch:** main
- **Deploys:** Vercel green, pushed

## Erledigt (Session 275)
- **Quality-First Workflow:** 3-Phase System (BEFORE/DURING/AFTER), 9-Punkt Checkliste, Beweis-Pflicht
- **Performance Audit:** FCP Community 652ms → 460ms (-29%), Load 833ms → 680ms (-18%)
- **PostHog entfernt:** 0 Console-Errors (war 7), 3+ fehlgeschlagene Requests eliminiert
- **3 Debounce-Fixes:** resolveExpiredResearch, record_login_streak, assign_user_missions
- **user_follows RPC:** 3 Queries → 1 (neue Migration rpc_get_user_social_stats)
- **Community deferred loading:** below-fold Queries 500ms delayed
- **Player Detail:** Buy/Sell/Offer Modals lazy-loaded
- **Agent Team Test:** BES-23 + BES-24, Quality-First in Issue-Description funktioniert
- **Lockfile-Fix:** pnpm-lock.yaml nach PostHog-Removal aktualisiert

## Board Status
- BES-23: get_club_by_slug vereinfacht (done)
- BES-24: assign_user_missions debounce (done)
- Pipeline operational, Quality-First Workflow in Agent-Definitionen

## Naechste Prioritaet
1. auto_close_expired_bounties → Cron statt Client-Call
2. Echtes Feature (Roadmap)
3. Connection Pool Tuning (Infra)

## Bekannte Issues
- Vercel Connection Pool Contention bei 40+ parallelen Queries
- auto_close_expired_bounties client-seitig (2.8s)

## Blocker
- Keine
