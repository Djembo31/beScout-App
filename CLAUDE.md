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
- **State:** React Context (AuthProvider, ClubProvider, WalletProvider)
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **Auth:** Supabase Auth (Email + Google + Apple + Magic Link)
- **Packages:** `@supabase/supabase-js`, `@supabase/ssr`
- **Caching:** TanStack React Query v5 + Zustand v5 (einziges Caching-Layer)

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
│       │   ├── page.tsx           # Redirect → /clubs (Club Discovery)
│       │   └── [slug]/
│       │       ├── page.tsx       # Server Component (generateMetadata)
│       │       ├── not-found.tsx  # 404 für ungültige Club-Slugs
│       │       ├── ClubContent.tsx # Club Fan-Seite (~1400 Zeilen)
│       │       └── admin/
│       │           ├── page.tsx       # Server Component (Admin-Guard)
│       │           └── AdminContent.tsx # Admin Dashboard (8 Tabs)
│       ├── community/
│       │   ├── layout.tsx         # Metadata: "Community"
│       │   └── page.tsx           # Community Orchestrator (~350 Zeilen)
│       ├── player/[id]/
│       │   ├── page.tsx           # Server Component (generateMetadata)
│       │   ├── not-found.tsx      # 404 für ungültige Player-IDs
│       │   └── PlayerContent.tsx  # Client Component (~1880 Zeilen)
│       ├── profile/
│       │   ├── layout.tsx         # Metadata: "Profil"
│       │   ├── page.tsx           # Eigenes Profil (SettingsTab + ProfileView isSelf=true)
│       │   └── [handle]/
│       │       ├── page.tsx       # Öffentliches Profil (ProfileView isSelf=false)
│       │       └── not-found.tsx  # 404 für ungültige Handles
│       ├── clubs/
│       │   ├── layout.tsx         # Metadata: "Clubs entdecken"
│       │   └── page.tsx           # Club Discovery (Suche, Liga-Gruppierung, Follow)
│       ├── compare/
│       │   └── page.tsx           # Spieler-Vergleich (Radar Chart, Side-by-Side)
│       └── bescout-admin/
│           ├── page.tsx               # Server Component (Platform-Admin-Guard)
│           ├── BescoutAdminContent.tsx # Platform Admin (~243 Zeilen, 3 inline + 4 extracted Tabs)
│           ├── AdminUsersTab.tsx       # Users Tab (Suche, Wallet-Korrektur)
│           ├── AdminFeesTab.tsx        # Fees Tab (Fee-Config CRUD)
│           ├── AdminGameweeksTab.tsx   # Gameweeks Tab (Status-Grid, Simulate+Score)
│           └── AdminAirdropTab.tsx     # Airdrop Tab (Stats, Tiers, Export, Leaderboard)
├── components/
│   ├── ui/index.tsx               # Card, Button, Chip, Modal, StatCard
│   ├── ui/TabBar.tsx              # TabBar + TabPanel (role=tablist, aria-selected)
│   ├── ui/LoadMoreButton.tsx      # Pagination Button
│   ├── ui/Confetti.tsx            # CSS-only Confetti Animation (24 Partikel, 3s auto-cleanup)
│   ├── player/index.tsx           # PositionBadge, StatusBadge, ScoreCircle, MiniSparkline, IPOBadge
│   ├── player/PlayerRow.tsx       # PlayerDisplay (compact/card), TrikotBadge, posColors, getContractInfo
│   ├── community/                 # ResearchCard, CreateResearchModal, PostCard, FollowBtn, BountyCard, 5 Tab-Components
│   ├── profile/                   # ProfileView (Shared), ProfileOverviewTab, ProfilePortfolioTab, ProfilePostsTab, ProfileResearchTab, ProfileActivityTab, FollowListModal
│   ├── fantasy/                   # 14 Sub-Components (EventDetailModal, PredictionsTab, CreatePredictionModal, PredictionCard, etc.)
│   ├── manager/                   # ManagerOffersTab (4 Sub-Tabs: Eingehend, Ausgehend, Offene Gebote, Verlauf)
│   ├── admin/                     # 8 Admin-Tab-Components (Overview, Players, Events, Votes, Bounties, Moderation, Revenue, Settings)
│   ├── missions/                  # MissionBanner (Home Page)
│   ├── onboarding/                # OnboardingChecklist (5 Tasks, Home Page)
│   ├── layout/                    # SideNav, TopBar (+ Push Toggle), NotificationDropdown, SearchDropdown, FeedbackModal, ClubSwitcher
│   └── providers/                 # AuthProvider, AuthGuard, WalletProvider, ClubProvider, Providers
├── lib/
│   ├── supabaseClient.ts          # Supabase Browser Client
│   ├── supabaseMiddleware.ts      # Supabase Server Session Management
│   ├── queryClient.ts             # TanStack React Query Client (singleton)
│   ├── clubs.ts                   # Club-Daten (DB-backed Cache: initClubCache, getClub, getAllClubsCached)
│   ├── services/
│   │   ├── players.ts             # getPlayers, getPlayerById, createPlayer, dbToPlayer, centsToBsd
│   │   ├── wallet.ts              # getWallet, getHoldings, getTransactions
│   │   ├── trading.ts             # buyFromMarket, placeSellOrder, buyFromOrder, cancelOrder
│   │   ├── profiles.ts            # getProfile, createProfile, updateProfile, getProfileByHandle
│   │   ├── events.ts              # getEvents, getEventsByClubId, createEvent, updateEventStatus, getUserJoinedEventIds, createNextGameweekEvents
│   │   ├── lineups.ts             # submitLineup, getLineup, removeLineup, getPlayerEventUsage
│   │   ├── scoring.ts             # scoreEvent, resetEvent, getEventLeaderboard, getPlayerGameweekScores, getFullGameweekStatus
│   │   ├── ipo.ts                 # getActiveIpos, buyFromIpo, getIpoForPlayer, getIposByClub
│   │   ├── research.ts            # getResearchPosts, createResearchPost, unlockResearch, rateResearch, resolveExpiredResearch, getAuthorTrackRecord
│   │   ├── pbt.ts                 # getPbtForPlayer, getPbtTransactions, getFeeConfig, invalidatePbtData
│   │   ├── social.ts              # Follows, Stats, Leaderboard, Achievements
│   │   ├── votes.ts               # Club-Voting (CRUD + castVote RPC)
│   │   ├── posts.ts               # Community Posts (CRUD + votePost RPC + Replies + Admin Pin/Delete)
│   │   ├── communityPolls.ts      # Bezahlte Umfragen (CRUD + 70/30 Split RPC)
│   │   ├── notifications.ts      # Notification CRUD + createNotification
│   │   ├── search.ts             # Globale Suche (players, research, profiles)
│   │   ├── club.ts                # Club-Queries (getClubBySlug, Admin-Functions, Dashboard, Followers, TradingFees, Multi-Club)
│   │   ├── leagues.ts             # Liga-Queries (getLeagues, getLeagueActiveGameweek)
│   │   ├── bounties.ts            # Bounties (CRUD + RPCs + Notifications + Missions)
│   │   ├── liquidation.ts        # Success Fee + Liquidierung (RPCs + Notifications)
│   │   ├── missions.ts           # Missionen (getUserMissions, claimMissionReward, trackMissionProgress)
│   │   ├── streaks.ts            # Login-Streak (recordLoginStreak RPC + Milestone Rewards)
│   │   ├── offers.ts             # User-to-User Angebote (CRUD + RPCs + Notifications)
│   │   ├── activityLog.ts        # Activity-Logging (Batch-Queue, 5s Flush, fire-and-forget)
│   │   ├── platformAdmin.ts      # Plattform-Admin (Stats, Users, Wallet-Korrektur, Fee-Config)
│   │   ├── pushSubscription.ts   # Web Push (subscribe/unsubscribe, VAPID, localStorage state)
│   │   ├── clubSubscriptions.ts  # Club-Abo (Bronze/Silber/Gold, BSD-Payments, TIER_CONFIG)
│   │   ├── airdropScore.ts       # Airdrop Score (refresh_airdrop_score RPC, Tier-Berechnung)
│   │   ├── referral.ts           # Referral System (reward_referral RPC, Code-Generierung)
│   │   ├── footballData.ts       # API-Football Integration (Fetch, Map, Import Gameweeks)
│   │   ├── auth.ts               # Auth Helpers (signOut, deleteAccount, updateEmail, updatePassword)
│   │   ├── avatars.ts            # Avatar Upload (Supabase Storage, Public URL)
│   │   ├── sponsors.ts           # Sponsor CRUD + getSponsorForPlacement (DB-backed)
│   │   ├── predictions.ts        # Prediction Engine (CRUD + RPCs + Stats + Resolve)
│   │   └── fixtures.ts           # Fixture Queries + syncFixtureScores Bridge RPC
│   ├── achievements.ts            # 25 Achievement-Definitionen (trading/manager/scout)
│   ├── activityHelpers.ts         # Shared Activity Icons/Colors/Labels/RelativeTime
│   ├── settledHelpers.ts          # val() Helper für Promise.allSettled
│   ├── utils.ts                   # cn (classNames Helper)
│   └── nav.ts                     # Navigation Config
├── types/index.ts                 # Alle Types (Player, Db*, IPO, Fantasy, etc.)
middleware.ts                      # Next.js Middleware (Route Protection)
.env.local                         # Supabase URL + Anon Key + Sentry DSN + PostHog Key + VAPID Key
```

## Wichtige Konventionen

### Spieler-Darstellung (EINHEITLICH!)
Verwende **immer** `PlayerDisplay` aus `@/components/player/PlayerRow`:
- `variant="compact"` -> Listen, Rankings, Holdings, Sidebar (~55px Zeile)
- `variant="card"` -> Grids, Transferliste, Club-Seite (~170px Karte mit Indikatoren)
- Kontext-Props: `holding?` (DPC/EK/P&L), `ipoData?` (IPO-Status/Progress), `onBuy?`, `onWatch?`
- Club-Logo: `getClub()` aus `lib/clubs.ts` (DB-backed Cache), Fallback zu farbigem Dot
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
- Club-Logos: `ClubLogo` Komponente (SpieltagTab) — `<img>` mit Fallback zu farbigem Kreis

### Benennungen
- Deutsche UI-Labels (Buttons, Überschriften, Statusmeldungen)
- Englische Code-Variablen und Funktionsnamen
- Englische Kommentare im Code

### Scoring-System
- `player_gameweek_scores` Tabelle: ein kanonischer Score pro Spieler pro Event
- `score_event` RPC: generiert Scores, schreibt in Lineups, updated `perf_l5`/`perf_l15`
- `reset_event` RPC: setzt Event komplett zurück (Testing)
- `sync_fixture_scores` RPC: Bridge von `fixture_player_stats.fantasy_points` (0-15) → `player_gameweek_scores.score` (40-150)
- Normierung: GW-Scores 40-150 -> `perf_l5` = AVG(letzte 5) / 1.5 (Skala 0-100)
- Score-Farben: >=100 Gold, 70-99 Weiß, <70 Rot
- Match-Data: API-Football Integration (TFF 1. Lig, League ID 203) oder Simulation als Fallback

### Trading-System
- `ipo_price`: fester Club/IPO-Preis, ändert sich NIE durch Marktaktivität
- `floor_price`: MIN(offene User-Sell-Orders) oder `ipo_price` als Fallback
- Pool/IPO verkauft immer zu `ipo_price`, nicht `floor_price`
- **Fee-Split (6% total):** `trade_fee_bps=600` → Platform 3.5% + PBT 1.5% + Club 1% (aus `fee_config`)
- `buy_player_dpc` RPC berechnet Fees, Seller erhält Netto, PBT-Treasury wird aufgeladen
- Bounty Platform-Fee: 5% auf `approve_bounty_submission` (Creator erhält 95%)

### Club-Abo-System
- 3 Tiers: Bronze (500 BSD/Monat), Silber (1.500 BSD), Gold (3.000 BSD)
- `subscribe_to_club` RPC: Balance-Check → BSD abziehen → 30 Tage Laufzeit
- `renew_club_subscription` RPC: Auto-Renew bei ausreichend Balance
- **Enforced Perks (Server-seitig in RPCs):**
  - Bronze+: Stimmgewicht ×2 bei Votes (`cast_vote` RPC)
  - Silber+: IPO-Vorkaufsrecht (`buy_from_ipo` RPC, Early-Access Gate)
  - Silber+: Exklusive Bounties (`bounties.min_tier` DB-Spalte + UI-Gate)
  - Gold: BeScout Score Boost +20% (`award_score_points` RPC)
  - Gold: Premium Fantasy Events (`events.min_subscription_tier` DB-Spalte + UI-Gate)

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
**"Alle Spieler" Tab fertig:** Manager Office 7. Tab — Club-gruppierte Ansicht aller 566 Spieler (20 Clubs), aufklappbar, Suche + Positions-Filter.
**TFF 1. Lig League Simulation fertig:** 20 Clubs, 380 Fixtures (38 GW), FPL-Style Scoring, `simulate_gameweek` RPC, 2.800 player_gameweek_scores (GW 1-10).
**Fantasy Redesign fertig:** Spieltag-zentriert (3 Tabs), Sorare-inspirierte UI — grüner Pitch (SVG Feldlinien), echte Club-Logos, Formation-Labels (z.B. "4-3-3"), Starter/Bank-Split, Sponsor-Banner. `simulateGameweekFlow()` Client-seitig. 3 Events für GW 11 erstellt.
**Beta-Ready fertig:** Activity-Logging (Batch-Queue), User-to-User Angebote (5 RPCs, 4 Sub-Tabs), BeScout Admin Dashboard (6 Tabs, `/bescout-admin`), Profil Redesign (Sorare-style, Follower-Listen, Posts-Tab). 103 Migrationen deployed.
**Admin-gesteuerter Spieltag-Flow fertig:** `deriveEventStatus()` vertraut nur DB-Status, `simulateGameweekFlow()` mit vollem Lifecycle (close → simulate → score → clone → advance), `createNextGameweekEvents()` klont Events, "Spieltag starten" Button mit Confirmation Dialog.
**Phase 7 (Engagement & Career Features) fertig:** Captain Bonus, Score Tiers, DPC der Woche, Liga System, Radar Chart, Comparison, Watchlist DB, Synergy, Scout Missions, Community Valuations, Scout Network, Academy. 8 Migrationen (#110-#117).
**Community Datenkonsistenz + Visibility Waves 1-3 fertig:** Activity Logging, Notifications, Globale Suche, Player Detail, Gerüchte Tab, Following Feed, Level Auto-Increment, Reputation Score, Expert Badges, Role Badges. Migrationen #118-#122.
**Phase A+B+C (Perfektionierung) fertig:** Monetarisierung (Trading Club-Fee 1%, Bounty Platform-Fee 5%, Fee Dashboard), Premium-Feel (Dynamic Sponsor Banners, Confetti Animation, Celebration Toast), Retention (Web Push Infrastructure, Club-Abo Bronze/Silber/Gold). 5 Migrationen (#123-#127) + 1 Edge Function (send-push).
**Multi-Club Expansion fertig:** 8 Phasen — `leagues` Tabelle, `club_followers` Tabelle, DB-backed `clubs.ts` (ClubLookup Cache), ClubProvider Context, ClubSwitcher UI, Club Discovery `/clubs`, Onboarding 3-Step Club-Wahl, Community Club-Scoping. 3 Migrationen (#128-#130), 5 neue + 16 geänderte Dateien.
**Airdrop Score + Referral System fertig:** `airdrop_scores` Tabelle, `refresh_airdrop_score` RPC, Referral-Codes + Belohnungen (500 BSD), Admin Airdrop-Tab (Stats, Tier-Verteilung, CSV Export). 2 Migrationen (#131-#132).
**Launch-Readiness fertig:** Content Seeding (89 IPOs, 15 Bounties, 9 Events), 4 neue Notification-Types, VAPID Keys + Edge Function v2 (send-push) + DB Trigger (pg_net). 2 Migrationen (#133-#134).
**Stakeholder Audit + Retention fertig:** Referral-Belohnung RPC, Club-Withdrawal (Balance + Auszahlung), Fan-Analytics, Trending Posts, Creator Earnings Dashboard, Season Leaderboard, Cross-App CTAs. 2 Migrationen (#135-#136).
**Phase D (Match-Data Integration) fertig:** API-Football Service (`footballData.ts`), `api_football_id` auf clubs/players/fixtures, `sync_fixture_scores` Bridge-RPC, Admin Mapping UI (Teams/Spieler/Fixtures), SpieltagTab dual-button (Import/Simulieren). 2 Migrationen (#137-#138).
**Codebase Audit + Quality Sprints 1-4 fertig:** 6 Experten-Agents (Dead Code, DB, UI, Security, Architecture, Services) → 21 Issues (4C+5H+8M+4L) → alle gefixt. Silent catches (78×), lineup exploit, missing notifications, service layer extraction (auth.ts, avatars.ts), activity logging gaps, not-found pages, CreateEventModal rewrite, cancellation flags, ErrorState, BescoutAdmin tab extraction (757→243 Zeilen), Loader2 standardization.
**Project Harmony Sprints 1-5 fertig:** Fee-Fix (3-Way-Split Trading 3.5%+1.5%+1%, IPO 85/10/5), Gamification (BeScout Score mit Arena+Club+Scout, 7 Ränge Bronze III→Legende, 5 DB-Trigger, RangBadge), Arena Events (event_tier, getTierStyle, 8-stufige Punktetabelle, Visual Distinction), Abo-System Overhaul (5 echte Perks server-seitig enforced in RPCs), Achievement-Fix (alle 25/25 Checks, 6 neue Lazy Queries). 9 Migrationen (#148-#156).
**Gamification Rewrite fertig:** 3-Dimensionen Elo (Trader/Manager/Analyst), 12 Ränge Bronze I→Legendär, DPC Mastery Level 1-5, neue Airdrop-Formel, Streak Shields, Fee-Rabatte per Abo. 10 Migrationen (#162-#171).
**Deep Dive Audit fertig:** 6K+3H+1M gefixt, pg_cron Jobs, Fee-Discount enforced. 3 Migrationen (#172-#174).
**Kaufen-Tab Redesign + Trading Deep Dive fertig:** 12 RPC-Bug-Fixes, IPO Follow-Gate entfernt, ALL Trading Flows E2E verified. 5 Migrationen (#182-#186).
**Score Road UI fertig:** `claim_score_road` RPC rewritten (3-Dim Median), ScoreRoadCard Component, i18n DE+TR. Migration #187.
**Prediction Engine fertig:** `predictions` Tabelle, `create_prediction` + `resolve_gameweek_predictions` RPCs, Fantasy 4. Tab "Vorhersagen", PredictionStatsCard im Profil, auto-resolve in simulateGameweekFlow, i18n DE+TR. 2 Migrationen (#188-#189).
**Code-seitig launch-fertig.** Nur 2 manuelle Setup-Schritte blockieren Beta-Launch: VAPID Key in Vercel + API-Football Account+Mapping.

Siehe `docs/VISION.md` für die vollständige Produktvision und Fan-Ökonomie.
Siehe `docs/TODO.md` für den aktuellen Task.
Siehe `docs/ROADMAP.md` für den Gesamtplan (Phase 6–7).
Siehe `docs/STATUS.md` für den detaillierten Fortschritt (inkl. SQL-Migration-Tabelle).
Siehe `docs/SCALE.md` für Skalierungsarchitektur und DB-Schema.

**TFF 1. Lig 2025/26 Reset fertig:** 11 Clubs auf-/abgestiegen, 566 neue Spieler (Transfermarkt), 505 Player Images (89%), 100 IPOs, 380 Fixtures, 3 Events (GW 1), 15 Bounties, 10 Votes. 2 Migrationen (#137-#138).
**Security Hardening #2 fertig:** RLS auf leagues, 12 Funktionen SET search_path, 36 RLS Policies initplan-optimiert. 2 Migrationen (#139-#140). Security Advisors clean (nur 2 verbleibende WARN: dpc_of_the_week gewollt, Leaked PW braucht Pro Plan).
**Fantasy Club-Unabhängigkeit fertig:** Events laden global ohne Club-Zugehörigkeit (ADR-017). Wallet-Query-Fix (`wallets.id` existierte nicht → 400 Error). Admin-Queries `.single()` → `.maybeSingle()` (406 Error bei Non-Admins). ClubProvider Race Condition gefixt.
**State Management Migration fertig:** TanStack React Query v5 + Zustand v5 als einziges Caching-Layer. cache.ts komplett gelöscht. ~41 Query-Hooks in 13 Dateien.
**Sponsor-Flächen produktionsreif:** sponsors Tabelle (Migration #142), SponsorBanner DB-backed, 21 Placements (7 original + 14 neu in Migration #143), Admin CRUD Tab, 8 Seed-Einträge. Placements decken alle Bereiche ab: Home, Market (4 Tabs), Club (2 Unterseiten), Fantasy (Spieltag, Pitch LED Boards, Leaderboard, History), Profile (Hero+Footer), Community (Feed+Research).
**Pilot-Scope:** Multi-Club-ready, 566 Spieler (20 Clubs), 505 Player Images, 50 Beta-Tester.
**189 SQL-Migrationen + 1 Edge Function v2 + 2 pg_cron Jobs deployed.** Trading + IPO + Fantasy + Scoring + Predictions + Reputation & Engagement + Feedback + Research Paywall + Research Ratings + Track Record + Activity Tracking + PBT + Fee Split + Bezahlte Polls + Content-Kategorien + Research-Kategorien + Security Hardening + Notifications + Missions + Multi-Club Architektur + Club Dashboard + Bounties + Success Fee + Liquidierung + Community-Moderation + Streak-Bonus + Activity-Log + Offers + Platform-Admin + Trading Club-Fee + Bounty Platform-Fee + Event Sponsors + Push Subscriptions + Club Subscriptions + Leagues + Club Followers + Club Discovery + Airdrop Score + Referral System + Match-Data Integration + Security Hardening #2 + Sponsor-Flächen (21 Placements) + Gamification v4 (3-Dim Elo) + DPC Mastery + Score Road + Prediction Engine live. Manager Office (7 Tabs inkl. "Alle Spieler") + Engagement-Wellen 1-4 (32 Features) + Phase A+B+C + Multi-Club Expansion + Phase D (Match-Data) live.
**GitHub:** Private Repo `Djembo31/beScout-App`, CI/CD via GitHub Actions, Sentry Error Tracking, PostHog Analytics.

## Bekannte Issues

- Fantasy: Presets nur in localStorage (bewusste Pilot-Entscheidung), Events sind global (kein Club nötig)
- Community: Research-Tab live (Premium Posts mit Paywall, 80/20 Split)
- Community: Bezahlte Polls live (70/30 Split Creator/Plattform)
- Community: Mute/Block/Tag-Following nur localStorage (50 User, kein DB-Backend nötig)
- Push: VAPID Keys lokal konfiguriert, DB Trigger aktiv — VAPID Public Key muss noch in Vercel Environment Variables gesetzt werden
- Club-Abo: Auto-Renew braucht Supabase Cron/Scheduled Function (noch nicht eingerichtet)
- API-Football: Account erstellen + Key in `.env.local` setzen, dann Admin-Mapping durchführen (~30 Min)

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
