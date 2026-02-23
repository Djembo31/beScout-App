# BeScout — Roadmap

> Letzte Aktualisierung: 23.02.2026 (Session 136)
> Siehe `docs/VISION.md` für die vollständige Produktvision.

---

## Übersicht

```
ABGESCHLOSSEN:
  Phase 0: Frontend MVP                                    ✅
  Phase 1: Polish & Refactoring                            ✅
  Phase 2: Backend & Auth                                  ✅
  Phase 3: Core Features (Trading, Fantasy, Community)     ✅
  Phase 4: Pilot Launch (Sakaryaspor)                      ✅ Tech fertig
  Phase 5: Content Economy (Berichte, Paywall, PBT)        ✅
  Phase 6: Club Tools (Dashboard, Multi-Club, Bounties)    ✅ (6.1-6.5)
  Phase 7: Engagement & Career Features                    ✅ (größtenteils)
  Phase A-D: Perfektionierung + Match-Data                 ✅

NÄCHSTE SCHRITTE:
  Beta-Launch mit 50 Testern                               ⬜ ← JETZT
  Galatasaray-Pitch                                        ⬜
  Native App                                               ⬜ Post-Pilot
```

---

## Phase 0–5: Komplett ✅

- **Phase 0-1:** Frontend MVP, Polish, TypeScript strict
- **Phase 2:** Supabase Backend, Auth, 207 SQL-Migrations, 30+ Services
- **Phase 3:** Trading + IPO + Fantasy + Community + Reputation (33 Achievements)
- **Phase 4:** Landing Page, Club Dashboard, Feedback, CI/CD, Sentry, PostHog
- **Phase 5:** Research Paywall (80/20), Bewertungen, Track Record, PBT, Bezahlte Polls

---

## Phase 6: Club Tools ✅

- **6.1** Multi-Club Architektur (20 Clubs, `club_id` FK, dynamisches Routing) ✅
- **6.2** Club Dashboard Self-Service (Revenue, Analytics, IPO/Event/Vote CRUD) ✅
- **6.3** Bounties (Verein→Fan-Aufträge, 3 RPCs, Missions) ✅
- **6.4** Community-Moderation (Admin Pin/Delete, Guidelines, Moderation-Tab) ✅
- **6.5** Success Fee + Liquidierung (PBT-Distribution, Trading-Guards) ✅
- **6.6** Galatasaray-Pitch → offen (Case Study, Mockup, Revenue-Projektion)

---

## Phase 7: Engagement ✅ (größtenteils)

| Feature | Status |
|---------|--------|
| Missions / Daily Quests | ✅ 8 daily + 6 weekly + Bounty-Missions |
| Streak-Bonus | ✅ 4 Milestones (3d/7d/14d/30d), Streak Shields |
| Club-Abos (Bronze/Silber/Gold) | ✅ 5 echte Perks server-enforced |
| Push Notifications | ✅ VAPID + Edge Function + DB Trigger (Key in Vercel fehlt) |
| In-App Notifications | ✅ Realtime WebSocket + Preferences (6 Kategorien) |
| Gamification v4 | ✅ 3-Dim Elo, 12 Ränge, DPC Mastery, Score Road |
| Prediction Engine | ✅ 8 Conditions, Auto-Resolve, Analyst-Score |
| Crowd Scouting | ✅ Credibility-Pill, Reputation-Flywheel |
| Private Ligen | ✅ 4 RPCs, LeaguesSection |
| Salary Cap | ✅ Budget-Bar, Admin-Input |
| Referral System | ✅ Double-Sided (500+250 $SCOUT) |
| Sponsor Tracking | ✅ Impressions + Clicks + Admin KPI-Dashboard |
| Creator-Abos | ⬜ Post-Pilot |
| Recommendation Engine | ⬜ Post-Pilot |
| Email Digest | ⬜ Post-Pilot |
| Multi-Liga Navigation | ⬜ Post-Pilot |

---

## Phase A-D: Perfektionierung ✅

- **A: Monetarisierung** — Trading Club-Fee 1%, Bounty Platform-Fee 5%, Fee Dashboard
- **B: Premium** — Dynamic Sponsor Banners (21 Placements), Confetti, Celebration Toast
- **C: Retention** — Web Push, Club-Abo, Airdrop Score, Login Streaks
- **D: Match-Data** — API-Football Service, `sync_fixture_scores` Bridge-RPC, Admin Mapping UI

---

## Beta-Launch Blocker ⬜

- [ ] VAPID Public Key in Vercel setzen
- [ ] API-Football Account + Key + Admin-Mapping
- [ ] 50 Beta-Tester einladen
- [ ] Bug-Tracking + schnelle Fixes
- [ ] KPI-Tracking einrichten

## Post-Pilot ⬜

- [ ] Galatasaray-Pitch (Case Study, Mockup, Revenue-Projektion, Demo)
- [ ] Native App (React Native)
- [ ] Next.js 15/16 Migration
- [ ] Creator-Abos, Recommendation Engine, Email Digest
- [ ] Supabase Pro Tier ($25/mo)

---

## Entscheidungen

| Thema | Entscheidung | Status |
|-------|-------------|--------|
| Backend | Supabase (PostgreSQL + Auth + Realtime) | ✅ |
| Auth | Email + Google + Apple + Magic Link | ✅ |
| State | TanStack Query v5 + Zustand v5 + React Context | ✅ |
| Caching | TanStack Query (cache.ts gelöscht) | ✅ |
| Scoring | Supabase RPCs, kanonische Scores pro GW | ✅ |
| Geld | BIGINT cents, atomare RPCs | ✅ |
| Währung | $SCOUT (ehem. BSD), ADR-021 | ✅ |
| Hosting | Vercel | ✅ |
| Gamification | 3-Dim Elo, 13 DB-Triggers, ADR-023 | ✅ |
| Security | auth.uid() Guards (40 RPCs), ADR-022 | ✅ |
| Plattform-Modell | B2B2C (Vereine = Kunden, Fans = User) | ✅ |
| Blockchain | Nein — zentrale DB | ✅ |
| i18n | next-intl (DE+TR), Cookie-basiert | ✅ |
| Legal | MiCA/CASP-konform, kein Finanzprodukt | ✅ |
