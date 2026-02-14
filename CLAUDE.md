# BeScout - Project Intelligence

> Diese Datei wird von Claude Code automatisch bei jedem Start gelesen.
> Sie ist die "Single Source of Truth" für Projektkontext.

## Projekt

BeScout ist eine **B2B2C Fan-Engagement- und Monetarisierungsplattform** für Fußballvereine. Vereine nutzen BeScout als Tool um Fans aufzubauen, zu binden und zu monetarisieren — durch DPC-Trading (Digital Player Cards), Fantasy Events, Club-Votes, Content-Paywall und Bounties. Fans verdienen BSD durch Trading, Fantasy-Turniere, Berichte verkaufen und Club-Aufträge. Ihr verifizierter Track Record baut ihre Fußball-Identität auf — bis hin zu echten Club-Positionen.

Kein Blockchain — zentrale Datenbank. Währung: BSD (BeScout Dollar). Pilot-Phase mit Sakaryaspor (TFF 1. Lig). Ziel: große Clubs (Galatasaray) über Sakaryaspor-Proof gewinnen.

Siehe `docs/VISION.md` für die vollständige Produktvision und Fan-Ökonomie.

## Tech Stack

- **Framework:** Next.js 14 (App Router, `src/` Verzeichnis)
- **Sprache:** TypeScript (strict)
- **Styling:** Tailwind CSS (Dark Mode only)
- **Icons:** lucide-react
- **State:** React Context (AuthProvider, WalletProvider)
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **Auth:** Supabase Auth (Email + Google + Apple + Magic Link)
- **Packages:** `@supabase/supabase-js`, `@supabase/ssr`
- **Caching:** In-Memory TTL Cache (`lib/cache.ts`)

## Design System

- **Background:** `#0a0a0a` (fast schwarz)
- **Primary/Gold:** `#FFD700` (Brand-Farbe, Preise, CTAs)
- **Success/Live:** `#22C55E` (Live-Status, positive Zahlen)
- **Positions:** GK=emerald, DEF=amber, MID=sky, ATT=rose
- **Borders:** `border-white/[0.06]` bis `border-white/10`
- **Cards:** `bg-white/[0.02]` mit `border border-white/10 rounded-2xl`
- **Fonts:** Headlines `font-black` (900), Zahlen `font-mono`
- **UI-Sprache:** Deutsch (alle Labels, Buttons, Texte)
- **Design-Referenz:** PokerStars (Event-Lobby) + Sorare (Gameweeks)

## Projektstruktur

```
src/
├── app/
│   ├── layout.tsx                 # Root Layout (html/body/globals.css)
│   ├── (auth)/                    # Auth Route Group (kein SideNav)
│   │   ├── layout.tsx             # Background Effects + zentriertes Layout
│   │   ├── login/page.tsx         # Login/Register/Magic Link
│   │   └── onboarding/page.tsx    # Profil-Erstellung nach Registrierung
│   ├── auth/
│   │   └── callback/page.tsx      # OAuth/OTP Callback (standalone)
│   └── (app)/                     # App Route Group (mit SideNav + TopBar)
│       ├── layout.tsx             # SideNav + TopBar + Background Effects
│       ├── loading.tsx            # Skeleton Loader für Route-Transitions
│       ├── page.tsx               # Home Dashboard
│       ├── fantasy/
│       │   ├── page.tsx           # Server wrapper
│       │   └── FantasyContent.tsx # Fantasy Orchestrator (~690 Zeilen)
│       ├── market/
│       │   ├── layout.tsx         # Metadata: "Marktplatz"
│       │   └── page.tsx           # DPC Marktplatz (7 Tabs: Kader, Bestand, Vergleich, Spieler, Transferliste, Scouting, Angebote)
│       ├── club/
│       │   ├── layout.tsx         # Metadata: "Club"
│       │   ├── page.tsx           # Redirect → /club/sakaryaspor
│       │   └── [slug]/
│       │       ├── page.tsx       # Server Component (generateMetadata)
│       │       ├── ClubContent.tsx # Club Fan-Seite (~1400 Zeilen)
│       │       └── admin/
│       │           ├── page.tsx       # Server Component (Admin-Guard)
│       │           └── AdminContent.tsx # Admin Dashboard (8 Tabs)
│       ├── community/
│       │   ├── layout.tsx         # Metadata: "Community"
│       │   └── page.tsx           # Community Orchestrator (~350 Zeilen)
│       ├── player/[id]/
│       │   ├── page.tsx           # Server Component (generateMetadata)
│       │   └── PlayerContent.tsx  # Client Component (~1880 Zeilen)
│       ├── profile/
│       │   ├── layout.tsx         # Metadata: "Profil"
│       │   ├── page.tsx           # Eigenes Profil (SettingsTab + ProfileView isSelf=true)
│       │   └── [handle]/
│       │       └── page.tsx       # Öffentliches Profil (ProfileView isSelf=false)
│       └── (supabase-test entfernt vor Pilot-Launch)
├── components/
│   ├── ui/index.tsx               # Card, Button, Chip, Modal, StatCard
│   ├── ui/TabBar.tsx              # TabBar + TabPanel (role=tablist, aria-selected)
│   ├── ui/LoadMoreButton.tsx      # Pagination Button
│   ├── player/index.tsx           # PositionBadge, StatusBadge, ScoreCircle, MiniSparkline, IPOBadge
│   ├── player/PlayerRow.tsx       # PlayerDisplay (compact/card), TrikotBadge, posColors, getContractInfo
│   ├── community/                 # ResearchCard, CreateResearchModal, PostCard, FollowBtn, BountyCard, 5 Tab-Components
│   ├── profile/                   # ProfileView (Shared), ProfileOverviewTab, ProfilePortfolioTab, ProfileResearchTab, ProfileActivityTab
│   ├── fantasy/                   # 12 Sub-Components (EventDetailModal, DashboardTab, etc.)
│   ├── admin/                     # 8 Admin-Tab-Components (Overview, Players, Events, Votes, Bounties, Moderation, Revenue, Settings)
│   ├── missions/                  # MissionBanner (Home Page)
│   ├── layout/                    # SideNav, TopBar, NotificationDropdown, SearchDropdown, FeedbackModal
│   └── providers/                 # AuthProvider, AuthGuard, WalletProvider, Providers
├── lib/
│   ├── supabaseClient.ts          # Supabase Browser Client
│   ├── supabaseMiddleware.ts      # Supabase Server Session Management
│   ├── cache.ts                   # In-Memory TTL Cache (cached, invalidate, invalidateAll)
│   ├── clubs.ts                   # Club-Daten + Farben
│   ├── services/
│   │   ├── players.ts             # getPlayers, getPlayerById, createPlayer, dbToPlayer, centsToBsd
│   │   ├── wallet.ts              # getWallet, getHoldings, getTransactions
│   │   ├── trading.ts             # buyFromMarket, placeSellOrder, buyFromOrder, cancelOrder
│   │   ├── profiles.ts            # getProfile, createProfile, updateProfile, getProfileByHandle
│   │   ├── events.ts              # getEvents, getEventsByClubId, createEvent, updateEventStatus, getUserJoinedEventIds
│   │   ├── lineups.ts             # submitLineup, getLineup, removeLineup, getPlayerEventUsage
│   │   ├── scoring.ts             # scoreEvent, resetEvent, getEventLeaderboard, getPlayerGameweekScores
│   │   ├── ipo.ts                 # getActiveIpos, buyFromIpo, getIpoForPlayer, getIposByClub
│   │   ├── research.ts            # getResearchPosts, createResearchPost, unlockResearch, rateResearch, resolveExpiredResearch, getAuthorTrackRecord
│   │   ├── pbt.ts                 # getPbtForPlayer, getPbtTransactions, getFeeConfig, invalidatePbtData
│   │   ├── social.ts              # Follows, Stats, Leaderboard, Achievements
│   │   ├── votes.ts               # Club-Voting (CRUD + castVote RPC)
│   │   ├── posts.ts               # Community Posts (CRUD + votePost RPC + Replies + Admin Pin/Delete)
│   │   ├── communityPolls.ts      # Bezahlte Umfragen (CRUD + 70/30 Split RPC)
│   │   ├── notifications.ts      # Notification CRUD + createNotification
│   │   ├── search.ts             # Globale Suche (players, research, profiles)
│   │   ├── club.ts                # Club-Queries (getClubBySlug, Admin-Functions, Dashboard, Followers)
│   │   ├── bounties.ts            # Bounties (CRUD + RPCs + Notifications + Missions)
│   │   ├── liquidation.ts        # Success Fee + Liquidierung (RPCs + Notifications)
│   │   ├── missions.ts           # Missionen (getUserMissions, claimMissionReward, trackMissionProgress)
│   │   └── streaks.ts            # Login-Streak (recordLoginStreak RPC + Milestone Rewards)
│   ├── achievements.ts            # 19 Achievement-Definitionen (trading/manager/scout)
│   ├── activityHelpers.ts         # Shared Activity Icons/Colors/Labels/RelativeTime
│   ├── settledHelpers.ts          # val() Helper für Promise.allSettled
│   ├── utils.ts                   # cn (classNames Helper)
│   └── nav.ts                     # Navigation Config
├── types/index.ts                 # Alle Types (Player, Db*, IPO, Fantasy, etc.)
middleware.ts                      # Next.js Middleware (Route Protection)
.env.local                         # Supabase URL + Anon Key + Sentry DSN + PostHog Key
```

## Wichtige Konventionen

### Spieler-Darstellung (EINHEITLICH!)
Verwende **immer** `PlayerDisplay` aus `@/components/player/PlayerRow`:
- `variant="compact"` -> Listen, Rankings, Holdings, Sidebar (~55px Zeile)
- `variant="card"` -> Grids, Transferliste, Club-Seite (~170px Karte mit Indikatoren)
- Kontext-Props: `holding?` (DPC/EK/P&L), `ipoData?` (IPO-Status/Progress), `onBuy?`, `onWatch?`
- Club-Logo: `getClub()` aus `lib/clubs.ts`, Fallback zu farbigem Dot
- L5-Bar: Sorare-inspirierter 5-Segment-Balken + Score-Pill

### Code-Patterns
- Alle Pages sind `'use client'` (Client Components)
- **Supabase NIE direkt in Components** -> immer über Service Layer (`lib/services/`)
- Types zentral in `src/types/index.ts` (Frontend + DB Types)
- Shared UI in `src/components/ui/index.tsx`
- `cn()` Utility für conditional classNames
- `fmtBSD()` für Zahlenformatierung (deutsch: 1.000 statt 1,000)
- Trading via Supabase RPCs (atomare DB-Funktionen)
- Cache-Invalidation nach Writes via `invalidateTradeData()` oder `invalidate(prefix)`

### Benennungen
- Deutsche UI-Labels (Buttons, Überschriften, Statusmeldungen)
- Englische Code-Variablen und Funktionsnamen
- Englische Kommentare im Code

### Scoring-System
- `player_gameweek_scores` Tabelle: ein kanonischer Score pro Spieler pro Event
- `score_event` RPC: generiert Scores, schreibt in Lineups, updated `perf_l5`/`perf_l15`
- `reset_event` RPC: setzt Event komplett zurück (Testing)
- Normierung: GW-Scores 40-150 -> `perf_l5` = AVG(letzte 5) / 1.5 (Skala 0-100)
- Score-Farben: >=100 Gold, 70-99 Weiß, <70 Rot

### Trading-System
- `ipo_price`: fester Club/IPO-Preis, ändert sich NIE durch Marktaktivität
- `floor_price`: MIN(offene User-Sell-Orders) oder `ipo_price` als Fallback
- Pool/IPO verkauft immer zu `ipo_price`, nicht `floor_price`

## Aktueller Status

**MODUS: Pilot Sprint** -- Ziel ist echte User in 4 Wochen.
**Phase 0–3 (Frontend, Backend, Core Features) fertig.** Trading + IPO + Fantasy + Scoring + Community + Reputation live.
**Phase 4 (Pilot Launch) fertig.** Landing Page + Club Dashboard + Feedback.
**Phase 5 (Content Economy) fertig:** Premium Posts / Paywall (80/20 Split) + Bewertungssystem + Track Record + Activity Tracking + PBT + Fee Split + Bezahlte Polls (70/30 Split) live.
**Optimierungen (Items 4-11) fertig:** Pagination + Page-Splitting + Promise.allSettled + Lazy-Loading + SEO/OG + Notifications + Globale Suche + Accessibility.
**Phase 6.1 + 6.2 (Multi-Club + Club Dashboard) fertig:** `clubs` + `club_admins` Tabellen, `club_id` FK auf 7 Tabellen, dynamisches Routing `/club/[slug]` + Admin-Dashboard mit 7 Tabs.
**Phase 6.3 (Club-Aufträge / Bounties) fertig:** `bounties` + `bounty_submissions` Tabellen, 3 RPCs (submit/approve/reject), Admin-Bounties-Tab, Community-Aufträge-Tab, Notifications + Missions.
**Phase 6.5 (Success Fee + Liquidierung) fertig:** `liquidation_events` + `liquidation_payouts` Tabellen, 2 RPCs (set_success_fee_cap, liquidate_player), Admin-UI (Cap + Liquidieren), Player-UI (Banner + Guards), PBT-Ausschüttung an Holder.
**Phase 6.4 (Community-Moderation) fertig:** Admin Pin/Delete Posts, Community Guidelines, Admin-Moderation-Tab (8. Tab). Streak-Bonus System (Server-seitig, 4 Milestones: 3d/7d/14d/30d).
**Unified PlayerDisplay Refactor fertig:** 2 Varianten (`compact` + `card`), 6+ Custom-Komponenten entfernt, ~900 Zeilen netto reduziert. Sorare-inspirierte L5-Bars, Club-Logos, Stats-Pills.
**Pilot-Blocker Fixes fertig:** Scout Score + Achievements auto-triggern (5 Services), Research Track Record funktional (floor_price statt last_price), Welcome Page BSD-Fix (10.000 statt 500), Trading-Notifications (Seller benachrichtigt), Fantasy Lineup-Lock verifiziert.
**Verbleibende Lücken geschlossen:** Participant-Limit-Guard (Fantasy Join), Fee-Breakdown (Sell-Form), Admin Event-Erstellung (volle CRUD), Admin Spieler-Anlegen (Create-Modal), Öffentliche Profile (`/profile/[handle]` + Shared ProfileView + Leaderboard-Links).
**Launch-Readiness fertig:** GitHub Repo (Private, `Djembo31/beScout-App`) + CI/CD Pipeline (GitHub Actions) + Sentry Error Tracking + PostHog Analytics. npm audit clean (Next.js 14.2.35). `/supabase-test` Route entfernt.
**"Alle Spieler" Tab fertig:** Manager Office 7. Tab — Club-gruppierte Ansicht aller 500 Spieler (20 Clubs), aufklappbar, Suche + Positions-Filter.
**Danach:** Phase 7 (Scale).

Siehe `docs/VISION.md` für die vollständige Produktvision und Fan-Ökonomie.
Siehe `docs/TODO.md` für den aktuellen Task.
Siehe `docs/ROADMAP.md` für den Gesamtplan (Phase 6–7).
Siehe `docs/STATUS.md` für den detaillierten Fortschritt (inkl. SQL-Migration-Tabelle).
Siehe `docs/SCALE.md` für Skalierungsarchitektur und DB-Schema.

**Pilot-Scope:** 1 Club (Sakaryaspor), 25 Spieler, 50 Beta-Tester.
**Alle 76 SQL-Migrationen deployed.** Trading + IPO + Fantasy + Scoring + Reputation & Engagement + Feedback + Research Paywall + Research Ratings + Track Record + Activity Tracking + PBT + Fee Split + Bezahlte Polls + Content-Kategorien + Research-Kategorien + Security Hardening + Notifications + Missions + Multi-Club Architektur + Club Dashboard + Bounties + Success Fee + Liquidierung + Community-Moderation + Streak-Bonus live. Manager Office (7 Tabs inkl. "Alle Spieler") + Engagement-Wellen 1-4 (32 Features) live.
**GitHub:** Private Repo `Djembo31/beScout-App`, CI/CD via GitHub Actions, Sentry Error Tracking, PostHog Analytics.

## Bekannte Issues

- Fantasy: Presets nur in localStorage (bewusste Pilot-Entscheidung)
- Community: Research-Tab live (Premium Posts mit Paywall, 80/20 Split)
- Community: Bezahlte Polls live (70/30 Split Creator/Plattform)
- Community: Mute/Block/Tag-Following nur localStorage (50 User, kein DB-Backend nötig)

## Workflow

### Session-Protokoll (PFLICHT bei jeder Session!)

**Session-Start:**
1. MEMORY.md wird automatisch geladen (Projekt-Snapshot, Quick-Reference, offene Themen)
2. Bei Bedarf: relevante Memory-Files lesen (`errors.md` bei Bugs, `patterns.md` bei Code, `decisions.md` bei Architektur)
3. `sessions.md` lesen um zu wissen wo wir zuletzt standen
4. TODO.md und STATUS.md prüfen für aktuelle Tasks

**Während der Session:**
5. Shared Components nutzen (nicht duplizieren!)
6. Types in types/index.ts pflegen
7. Service Layer nutzen (nie Supabase direkt in Components)
8. Cache-Invalidation nach Writes nicht vergessen
9. Deutsche Labels verwenden
10. Bei neuem Fehler → sofort in `memory/errors.md` dokumentieren
11. Bei neuer Architektur-Entscheidung → in `memory/decisions.md` als ADR dokumentieren
12. Bei neuem Pattern/Anti-Pattern → in `memory/patterns.md` dokumentieren

**Session-Ende (PFLICHT — nie vergessen!):**
13. `memory/sessions.md` updaten: Session-Nummer, Datum, was wurde gemacht, was wurde gelernt
14. `memory/MEMORY.md` updaten: Projekt-Snapshot (Migrations, Routes, Build-Status), offene Themen, letzter Stand
15. Relevante Topic-Files updaten wenn neues Wissen dazukam
16. TODO.md und STATUS.md aktualisieren
17. `npx next build` zur Verifikation

### Memory-System (`~/.claude/projects/.../memory/`)
Das Memory-System ist das **Langzeitgedächtnis** des Projekts. Es ersetzt ein ganzes Entwicklerteam:
- `MEMORY.md` — Index (wird automatisch geladen, max 200 Zeilen)
- `architecture.md` — Component Map, Services, Routes, Data Flow
- `decisions.md` — Architektur-Entscheidungen (ADR) mit Kontext + Begründung
- `patterns.md` — Code-Patterns, Anti-Patterns, bewährte Lösungen
- `errors.md` — Error Journal: Symptom → Ursache → Fix (NIE denselben Fehler zweimal machen)
- `sessions.md` — Session-Historie: Was wurde wann gemacht + gelernt
- `backend-systems.md` — DB Schema, RPCs, Services (Detail)
- `engagement-waves.md` — Feature Waves 1-4 (32 Features)
- `user-prefs.md` — Anils Arbeitsweise, Kommunikation, Prioritäten

## Scale-Regeln (immer beachten!)

- Geld IMMER als BIGINT in Cents (nicht Float, nicht Decimal)
- Alle Geld-Operationen als atomare DB Transactions (RPCs)
- Nie direkt Supabase in Components aufrufen -> Data Access Layer dazwischen
- Service Interfaces benutzen (siehe ARCHITECTURE.md)
- Trades/Transactions append-only (kein UPDATE/DELETE auf Logs)
- TypeScript: `Array.from(new Set(arr))` statt `[...new Set(arr)]` (strict TS)
- Map-Iteration: `Array.from(map.keys()).forEach()` statt `for..of` (strict TS)
