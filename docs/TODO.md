# BeScout - Aktuelle Tasks

> Letzte Aktualisierung: 03.03.2026 (Session 183)
> Modus: LIVE BETA — 250 Migrations, 25 Routes, 195 Unit + 70 E2E Tests
> Für erledigte Tasks → `memory/sessions.md` und `memory/sessions-archive.md`

---

## Nächste Priorität

1. [ ] Vercel Env-Vars setzen: `CRON_SECRET` + `API_FOOTBALL_KEY`
2. [ ] VAPID Public Key in Vercel Environment Variables setzen
3. [ ] Visuelle Anpassungen (Anil definiert nach Review)
4. [ ] Real User Testing mit 50 Beta-Testern

## Beta-Launch Blocker

- [ ] Push Notifications: VAPID Key fehlt in Vercel → Edge Function kann nicht senden
- [ ] Cron Env-Vars: `CRON_SECRET` + `API_FOOTBALL_KEY` in Vercel setzen
- [x] ~~GW-Automatisierung~~ ✅ Cron-Job `/api/cron/gameweek-sync` (22:00+23:00 UTC, Session 183)
- [x] ~~Match-Data: API-Football~~ ✅ Komplett (20 Clubs, 497 Spieler, 380 Fixtures, 6.446 Stats)
- [x] ~~SUPABASE_SERVICE_ROLE_KEY~~ ✅ Gesetzt in Vercel
- [x] ~~Live-Daten Pipeline~~ ✅ Teams + Players + Fixtures + Stats (GW1-28)
- [x] ~~Progressive Scoring~~ ✅ Import/Auswerten Buttons + Live-Scores
- [x] ~~Per-Fixture Deadline Locking~~ ✅ Individuelle Spieler-Locks
- [x] ~~Live-Setup GW 28~~ ✅ active_gameweek=28, 12 Events, 6.517 Scores
- [x] ~~Player Data Quality~~ ✅ syncPlayerMapping Fix + TM Market Values + IPO Recalc (249 Migrations)

## Backlog (Post-Pilot)

- [ ] Leaked Password Protection (braucht Supabase Pro Plan)
- [ ] Galatasaray-Pitch (Case Study, Mockup, Revenue-Projektion)
- [ ] Native App (React Native)
- [ ] Next.js 15/16 Migration
- [ ] Creator-Abos, Recommendation Engine, Email Digest
- [ ] Supabase Pro Tier ($25/mo)
- [ ] Edge Function `create-demo-accounts` im Dashboard löschen
- [ ] Bandırmaspor Kader-Update (0/29 gemappt — neuer Kader nach Transfer-Fenster)
- [ ] Multi-Liga Navigation + Event-Konstellation

## Zuletzt erledigt (Sessions 170-183)

- [x] GW-Automatisierung: Cron-Job, supabaseAdmin, 2 RPCs, Migration #250 (Session 183)
- [x] Card Refactor: Refractor→Position Frame→Metallic Sheen + Bugfix (Sessions 181-182)
- [x] Performance Optimization: 3 Phasen Query+Rendering+Architecture (Session 180)
- [x] Player Card Redesign: Carbon+Gold FIFA UT + Refractor (Session 179)
- [x] Player Data Quality: syncPlayerMapping Fix + TM Market Values + IPO Recalc (Session 178)
- [x] i18n komplett: 27 Batches, ~500+ Keys de/tr (Sessions 172-177)
- [x] Live-Setup GW 28: active_gameweek=28, 12 Events, Scores synced (Session 176)
- [x] Progressive Scoring: Import/Auswerten Buttons, Live-Scores auf Pitch (Session 175)
- [x] Per-Fixture Deadline Locking: individuelle Spieler-Locks (Session 174)
- [x] Live-Daten Pipeline: 20 Clubs, 497 Spieler, 380 Fixtures, 6.446 Stats (Session 173)
- [x] Admin-Architektur 3-Ebenen: Trading-Sperre + Platform Bypass + Clubs Tab (Session 171)
- [x] Systemharmonie Deep Dive Phase 1-4: Loading/Error States, League Params (Session 170)
