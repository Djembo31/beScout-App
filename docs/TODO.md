# BeScout - Aktuelle Tasks

> Letzte Aktualisierung: 02.03.2026 (Session 176)
> Modus: LIVE BETA — 247 Migrations, 24 Routes, 195 Unit + 70 E2E Tests
> Für erledigte Tasks → `memory/sessions.md` und `memory/sessions-archive.md`

---

## Nächste Priorität

1. [ ] Visuelle Anpassungen (Anil definiert nach Review)
2. [ ] VAPID Public Key in Vercel Environment Variables setzen
3. [ ] Real User Testing mit 50 Beta-Testern
4. [ ] GW 28 auswerten (nach letztem Fixture: Import → Auswerten)
5. [ ] GW 29 Events erstellen (automatisch via "Auswerten" Button)

## Beta-Launch Blocker

- [ ] Push Notifications: VAPID Key fehlt in Vercel → Edge Function kann nicht senden
- [x] ~~Match-Data: API-Football~~ ✅ Komplett (20 Clubs, 497 Spieler, 380 Fixtures, 6.446 Stats)
- [x] ~~SUPABASE_SERVICE_ROLE_KEY~~ ✅ Gesetzt in Vercel
- [x] ~~Live-Daten Pipeline~~ ✅ Teams + Players + Fixtures + Stats (GW1-28)
- [x] ~~Progressive Scoring~~ ✅ Import/Auswerten Buttons + Live-Scores
- [x] ~~Per-Fixture Deadline Locking~~ ✅ Individuelle Spieler-Locks
- [x] ~~Live-Setup GW 28~~ ✅ active_gameweek=28, 12 Events, 6.517 Scores

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

## Zuletzt erledigt (Sessions 170-176)

- [x] Live-Setup GW 28: active_gameweek=28, 12 Events, Scores synced (Session 176)
- [x] Progressive Scoring: Import/Auswerten Buttons, Live-Scores auf Pitch (Session 175)
- [x] Per-Fixture Deadline Locking: individuelle Spieler-Locks (Session 174)
- [x] Live-Daten Pipeline: 20 Clubs, 497 Spieler, 380 Fixtures, 6.446 Stats (Session 173)
- [x] i18n String Extraction: DashboardTab + AdminSettingsTab, 37 Keys (Session 172)
- [x] Admin-Architektur 3-Ebenen: Trading-Sperre + Platform Bypass + Clubs Tab (Session 171)
- [x] Systemharmonie Deep Dive Phase 1-4: Loading/Error States, League Params (Session 170)
