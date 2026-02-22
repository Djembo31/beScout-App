# BeScout Status

> Aktualisiert nach jeder Session. Einzige Datei die du pflegen MUSST.

## Jetzt
**Woche 9** – 199 Migrations, 21 Routes, 1 Edge Function v2, 2 pg_cron Jobs, 21 Sponsor-Placements, 13 Gamification-Triggers. Build sauber (0 Fehler). Notifications Realtime (kein Polling). User Notification Preferences (6 Kategorien). **Beta-Launch ready.**

## Session 22.02.2026 (123) – Notification System Fix + Preferences

### Änderungen
- **Migration #198 (add_notifications_to_realtime):** `ALTER PUBLICATION supabase_realtime ADD TABLE notifications` — enables WebSocket delivery of new notifications.
- **Migration #199 (create_notification_preferences):** `notification_preferences` Tabelle mit 6 boolean Kategorien (trading, offers, fantasy, social, bounties, rewards) + RLS Policies.
- **`useNotificationRealtime` Hook (NEU):** Ersetzt 60s `setInterval` Polling mit Supabase Realtime `postgres_changes` INSERT subscription. Initial fetch + live prepend + toast callback ref.
- **TopBar refactored:** Polling entfernt, nutzt `useNotificationRealtime` Hook. Toast bei neuer Notification wenn Dropdown geschlossen.
- **NotificationDropdown refactored:** Props-basiert (`notifications`, `loading`, `onMarkRead`, `onMarkAllRead`) statt interner `useState`/`useEffect` Fetch. Optimistic mark-as-read.
- **`notifications.ts` erweitert:** `NOTIFICATION_CATEGORIES` (6 Kategorien), `TYPE_TO_CATEGORY` (35 NotificationTypes → 6+system), `getNotificationPreferences()`, `updateNotificationPreferences()`. `createNotification()` prüft jetzt User-Preferences vor INSERT — disabled Kategorien werden silently skipped.
- **SettingsTab erweitert:** Neue "Benachrichtigungen" Card zwischen Account und Danger Zone. 6 Toggle-Rows mit gold pill switch, 44px touch targets, debounced save (500ms).
- **i18n:** 14 neue Keys in DE+TR (notificationPrefs, 6 Kategorien mit Label+Desc).

### Dateien (1 neu + 7 modifiziert)
- NEU: `src/lib/hooks/useNotificationRealtime.ts`
- Modifiziert: `TopBar.tsx`, `NotificationDropdown.tsx`, `notifications.ts`, `profile/page.tsx`, `types/index.ts`, `messages/de.json`, `messages/tr.json`

## Session 22.02.2026 (122) – Gamification Triggers + REVOKE

### Änderungen
- **Migration #197 (gamification_triggers_and_revoke):** 13 DB-Triggers für alle Gamification-Seiteneffekte. 6 gefährliche RPCs REVOKED (award_dimension_score, award_score_points, award_mastery_xp, update_mission_progress, refresh_user_stats, refresh_airdrop_score). 3 Wrapper RPCs mit auth.uid() (refresh_my_stats, refresh_my_airdrop_score, track_my_mission_progress). Double-Scoring Fix.
- **~15 TS-Files bereinigt:** Fire-and-forget Calls zu revoked RPCs entfernt.

### Dateien
- DB: Migration #197
- ~15 modifizierte TS-Dateien (Services + Components)

## Session 22.02.2026 (121) – Security Audit + auth.uid() Hardening

### Änderungen
- **5-Agenten Security/Fraud Audit:** Trading RPCs, Fantasy Scoring, Wallet Exploits, RLS/Auth, Social Manipulation — initial 30+ Befunde, ~75% als False Positives eliminiert nach RPC-Verifikation via `pg_get_functiondef`.
- **Systemische Schwachstelle:** ALLE SECURITY DEFINER RPCs akzeptierten `p_user_id`/`p_admin_id` vom Client statt `auth.uid()` → Impersonation möglich.
- **Migration #196 (auth_uid_security_guards):** 40 RPCs mit `IF auth.uid() IS DISTINCT FROM p_xxx THEN RAISE EXCEPTION` Guards versehen. Dynamisches Patching via `pg_get_functiondef()` + `regexp_replace()`.
- **score_event Admin-Guard:** platform_admins + club_admins Check injiziert.
- **REVOKE EXECUTE** auf `deduct_wallet_balance` + `refund_wallet_balance` von PUBLIC (interne Helper).
- **Verifikation:** Spot-Checks auf adjust_user_wallet, buy_player_dpc, send_tip, score_event — alle Guards korrekt.

### Dateien
- DB: Migration #196 (auth_uid_security_guards) — 40 RPCs + 2 REVOKE
- Keine Code-Änderungen (Frontend ruft RPCs bereits mit eigenem user_id auf)

### Known Risk
- `award_dimension_score`, `award_score_points`, `award_mastery_xp`, `refresh_user_stats`, `refresh_airdrop_score`, `update_mission_progress` — vom Client mit fremden user_ids aufrufbar. Sollten zu DB-Triggers migriert werden.

## Session 22.02.2026 (120) – Club Multi-Admin: Rollen-Differenzierung

### Änderungen
- **`adminRoles.ts` (NEU):** Zentrales Role-Permission-Mapping mit `canAccessTab()`, `canPerformAction()`, `getRoleBadge()`. 3 Rollen: Owner (volle Kontrolle), Admin (operativ, kein Finance/GW), Editor (read-only).
- **AdminContent.tsx:** Tab-Filtering basierend auf `club.admin_role` (Owner: 11, Admin: 9, Editor: 4 Tabs). Rollen-Badge (Gold/Blau/Grau) im Header. useEffect für Tab-Reset bei Rollen-Wechsel.
- **AddAdminModal.tsx (NEU):** Handle-Suche via `getProfileByHandle()`, Rollen-Auswahl (Admin/Editor), Profil-Preview mit Avatar, Submit via `addClubAdmin()` RPC.
- **AdminSettingsTab.tsx:** Stub "Phase 7" durch echte Team-Verwaltung ersetzt — Admin-Liste mit Rollen-Dropdown (ON CONFLICT DO UPDATE), Entfernen-Button. Gameweek/Jurisdiction Owner-only, API-Sync Admin+.
- **AdminOverviewTab.tsx:** News-Post-Button hinter `canPerformAction('publish_news')` Guard.
- **AdminPlayersTab.tsx:** IPO-Create/Status-Change/Liquidation/SuccessFee Owner-only, CreatePlayer Admin+.
- **AdminModerationTab.tsx:** Pin/Delete/Guidelines hinter Role-Guards, Editor read-only (textarea disabled).
- **i18n:** ~20 neue Keys in de.json + tr.json (admin.teamManagement, admin.role*, admin.ownerOnlyTeam etc.)

### Dateien (2 neu + 7 modifiziert)
- NEU: `src/lib/adminRoles.ts`, `src/components/admin/AddAdminModal.tsx`
- Modifiziert: `AdminContent.tsx`, `AdminSettingsTab.tsx`, `AdminOverviewTab.tsx`, `AdminPlayersTab.tsx`, `AdminModerationTab.tsx`, `messages/de.json`, `messages/tr.json`

## Session 22.02.2026 (119) – Deep-Dive Harmony Audit + Sponsor Seeding

### Änderungen
- **5-Agenten Harmony Audit:** Navigation, Types/Services, Feature Integration, i18n/Dead Code, UI/UX Flow — ~425K Tokens, ~230 Dateien geprüft
- **2 False Positives eliminiert:** Wallet `balance` (DB korrekt), Trader Score Gap (DB-Trigger existiert)
- **8 Befunde gefixt:** Metadata "Manager Office"→"Marktplatz", 5 Touch-Targets, ProfileView i18n, 2 Dead Files gelöscht, FeedItem→ActivityFeedItem, Nav-Key manager→market
- **21 Sponsor-Placements** mit echten Fußball-Marken: Nike, Adidas, Turkish Airlines, EA Sports, Mastercard, Coca-Cola, Puma, Heineken, PlayStation, Pepsi, Visa, Trendyol. Clearbit-Logos (öffentliche CDN).

### Dateien modifiziert/gelöscht (~13)
- Layout: `market/layout.tsx`
- Touch: `PostCard.tsx`, `FollowBtn.tsx`, `EventDetailModal.tsx`, `CreateCommunityPollModal.tsx`
- Profile: `ProfileView.tsx` (i18n), gelöscht: `ProfilePostsTab.tsx`, `ProfileResearchTab.tsx`
- Types: `types/index.ts` (ActivityFeedItem)
- Services: `social.ts` (ActivityFeedItem)
- Nav: `nav.ts` (market key)
- i18n: `de.json`, `tr.json`
- DB: 21 Sponsor-Einträge (INSERT)

## Session 22.02.2026 (118) – Nav Umbau + Profil Dedup + Scouting Zone Fixes

### Änderungen
- **Sprint 1: Navigation Restructure** — Profile aus NAV_MAIN entfernt, Club von NAV_MORE nach NAV_MAIN verschoben. `report` → `scouting` (Compass Icon). BottomNav: Home|Spieltag|Markt|Club|Scouting. TopBar Avatar klickbar auf Desktop + Active-Ring. SideNav: Club mit dynamischem Slug-Routing.
- **Sprint 2: Scouting Zone** — 7 Content-Type Filter-Pills (Alle, Beiträge, Gerüchte, Berichte, Aufträge, Abstimmungen, News). FeedItem Union-Type für Mixed-Content Feed. ClubNewsSection + CommunityBountySection gelöscht (in Feed integriert). CommunitySidebar: Votes Section entfernt.
- **Sprint 3: User Aufträge** — Migration #195 (`is_user_bounty` boolean + RLS Policy). `createUserBounty()` mit Wallet-Escrow (locked_balance). CreateBountyModal (~150 Zeilen). BountyCard: "Community-Auftrag" Badge.
- **Sprint 4: i18n + Cleanup** — ~35 neue Keys DE+TR (scoutingZone, filters, hero, createBounty). Nav Keys bereinigt. Unused imports entfernt.
- **Profil Dedup** — Research-Tab + Posts-Tab aus ProfileView entfernt (duplizierten Scouting Zone). Track Record + Research Earnings in ProfileOverviewTab gemerged. ProfileTab Type: 6→4 Tabs.
- **Scouting Zone Fixes** — Vote-Button aus CommunityHero entfernt (nur Clubs). Filter-aware Empty States: 5 kontextuelle Leer-Meldungen je Content-Filter. 5 neue i18n Keys DE+TR.

### Dateien modifiziert/neu/gelöscht (~20)
- Nav: `nav.ts`, `BottomNav.tsx`, `SideNav.tsx`, `TopBar.tsx`
- Community: `page.tsx` (rewrite), `layout.tsx`, `CommunityFeedTab.tsx` (rewrite), `CommunityHero.tsx` (rewrite), `CommunitySidebar.tsx`, `BountyCard.tsx`
- Profil: `ProfileView.tsx`, `ProfileOverviewTab.tsx`
- Neu: `CreateBountyModal.tsx`
- Gelöscht: `ClubNewsSection.tsx`, `CommunityBountySection.tsx`
- Service: `bounties.ts` (+createUserBounty)
- Types: `types/index.ts` (+is_user_bounty, ProfileTab 4 Tabs)
- i18n: `de.json`, `tr.json`

## Session 22.02.2026 (114–117) – QA + Spotlight + Modal + Content-System

## Session 22.02.2026 (114) – Final QA Sprint vor Beta-Launch

### Änderungen
- **`.single()` → `.maybeSingle()`** — club.ts (1), bounties.ts (6), research.ts (4), posts.ts (1) — verhindert 406 Errors bei 0 Rows in fire-and-forget Blöcken
- **i18n 4 Scouting Components** — ~90 Keys in 3 neuen Namespaces (bounty, bountyAdmin, research). AdminScoutingTab, BountyCard, AdminBountiesTab, CreateResearchModal vollständig lokalisiert DE+TR
- **Migration #194: RLS initplan** — 24 Policies über 14 Tabellen: `auth.uid()` → `(select auth.uid())` für Query-Performance
- **text-[8px] → text-[9px]** — 14 Instanzen in 5 Fantasy/Community/Manager-Dateien (Minimum-Textgröße)
- **Touch Targets min-h-[44px]** — 13 Instanzen in 6 Dateien (Apple HIG Compliance)
- **Security Advisors clean** — Nur 2 bekannte WARNs (dpc_of_the_week intentional, Leaked PW braucht Pro Plan)

### Dateien modifiziert (~20)
- Services: club.ts, bounties.ts, research.ts, posts.ts (.maybeSingle)
- Admin: AdminScoutingTab.tsx, AdminBountiesTab.tsx (i18n rewrite)
- Community: BountyCard.tsx, CreateResearchModal.tsx (i18n rewrite)
- Fantasy: SpieltagTab, EventDetailModal, DashboardTab (text-[9px])
- Community/Player: CommunityFeedTab, ScoutingEvaluationForm, page.tsx, HoldingsSection, SellModal, MarktTab (min-h-[44px])
- i18n: de.json + tr.json (~90 neue Keys)

## Session 21.02.2026 (113) – Scouting × Gamification Integration (5 Sprints)

## Session 21.02.2026 (112) – Crowd Scouting Modul (5 Sprints, 2 Migrations #192-#193)

## Session 21.02.2026 (111) – Community Redesign: Single-Scroll

### Änderungen
- **CommunityHero.tsx (NEU)** — 3 Quick-Action-Cards: Post schreiben, Gerücht teilen, Analyse schreiben. Gradient-Borders, Icons, i18n DE+TR
- **CommunitySidebar.tsx (NEU)** — Research Highlights (Top 3), Top Scouts (Top 5), Laufende Votes. Aus CommunityFeedTab extrahiert
- **CommunityBountySection.tsx (NEU)** — Bounty-Strip mit BountyCard, horizontaler Scroll Mobile, 2-Col Grid Desktop. Nur sichtbar wenn Bounties > 0
- **CommunityFeedTab.tsx vereinfacht** — Sidebar + Category-Pills entfernt, Filter auf 1 Zeile (Search + Type + Sort). 289→155 Zeilen (-47%)
- **page.tsx umgebaut** — TabBar/TabPanel entfernt, Single-Scroll: Hero → Scope+Network → Bounties → Grid(Feed+Sidebar) → Modals. Neue Hooks: useActiveBounties, useClubSubscription. Dead Code entfernt
- **CommunityBountiesTab.tsx gelöscht** — Ersetzt durch CommunityBountySection
- **i18n** — hero.*, bountySection.*, sidebar.*, feed.* Keys in DE+TR

### Dateien modifiziert/neu
- `src/components/community/CommunityHero.tsx` (NEU)
- `src/components/community/CommunitySidebar.tsx` (NEU)
- `src/components/community/CommunityBountySection.tsx` (NEU)
- `src/app/(app)/community/page.tsx` (REWRITE)
- `src/components/community/CommunityFeedTab.tsx` (SIMPLIFIED)
- `src/components/community/CommunityBountiesTab.tsx` (DELETED)
- `messages/de.json` + `messages/tr.json` (i18n)

## Session 21.02.2026 (110) – Build-Fix + DPC-Verteilung + Rewards Tab

### Änderungen
- **Build-Fix** — 4 tote Barrel-Exports entfernt, ManagerCompareTab gelöscht. -992 Zeilen
- **DPC-Ring Redesign** — 4 Segmente (Reserviert/Verfügbar/Andere/Du), max_supply (300) Basis
- **Rewards Tab (NEU)** — 5. Player-Detail Tab, Success Fee Wachstums-Treppe (10 Tiers), i18n DE+TR

## Session 20.02.2026 (109) – $SCOUT Umbenennung

### Änderungen
- ADR-021: BSD → $SCOUT. fmtBSD→fmtScout, formatBsd→formatScout, ~242 UI-Strings, i18n DE+TR, Docs

## Session 20.02.2026 (108) – Beta-Launch Must-Haves (4 Sprints)

### Änderungen
- **Sprint 1: Public Club Page** — `/club/[slug]` ohne Login zugänglich (Middleware + AuthGuard conditional). Hero + Kader-Vorschau + Stats + Fixtures + CTA. OG Meta Tags für Social Sharing
- **Sprint 2: Club-Referral** — Migration #190 (`clubs.referral_code` + `profiles.invited_by_club`). Onboarding `?club=CODE` Parameter. Admin Referral-Count + Copy-Link Card
- **Sprint 3: Abo-Badge** — `SubscriptionBadge` Component. Batch-Fetch in Community Feed. PostCard + ProfileView Integration
- **Sprint 4: Club-News** — Migration #191 (`post_type='club_news'`). Admin News-Modal. PostCard gold styling. Neuigkeiten-Section in Club Übersicht. PostType-Filter "Club-News" Pill

### Dateien modifiziert/neu
- `src/lib/supabaseMiddleware.ts` (publicRoutes + `/club`)
- `src/app/(app)/layout.tsx` (AuthGuard conditional für `/club/`)
- `src/app/(app)/club/[slug]/page.tsx` (OG Meta Tags)
- `src/app/(app)/club/[slug]/ClubContent.tsx` (Public View + Club-News Section)
- `src/app/(auth)/login/page.tsx` (`?club` param forwarding)
- `src/app/(auth)/onboarding/page.tsx` (`?club=CODE` auto-club + banner)
- `src/app/(app)/community/page.tsx` (Subscription batch-fetch)
- `src/types/index.ts` (PostType + DbClub + Profile erweitert)
- `src/lib/services/referral.ts` (3 neue Funktionen)
- `src/lib/services/clubSubscriptions.ts` (`getActiveSubscriptionsByUsers`)
- `src/lib/services/posts.ts` (`createClubNews`)
- `src/components/ui/SubscriptionBadge.tsx` (NEU)
- `src/components/community/PostCard.tsx` (club_news badge + abo badge)
- `src/components/community/CommunityFeedTab.tsx` (subscriptionMap + club_news filter)
- `src/components/profile/ProfileView.tsx` (SubscriptionBadge)
- `src/components/admin/AdminOverviewTab.tsx` (Referral + News Modal)
- `messages/de.json` + `messages/tr.json` (i18n keys)

## Session 20.02.2026 (106) – UX Radical Simplification

### Änderungen
- **Home:** 3-Tab System (Mein Stand/Aktuell/Entdecken) → 1 scrollbare Seite. 10+ Queries entfernt, 9 Sections eliminiert, 6 Sections inlined
- **Market:** 'Spieler' Tab entfernt (KaufenDiscovery Search-Mode deckt ab), 4→3 Tabs. `MarketTab` Type 4→3
- **Community:** 'Gerüchte' + 'Aktionen' Tabs entfernt. Gerüchte-Filter als PostType-Pills (Alle/Posts/Gerüchte) in FeedTab gemerged. 5→3 Tabs
- **Club:** 'Club' Community-Tab komplett entfernt. DeineSpieler, ActivityFeed, SquadOverview aus Übersicht entfernt. 15+ State-Vars, Vote/Research-Handlers entfernt. 4→3 Tabs
- **Fantasy:** Category-Pills, View-Mode-Toggle, Table-View entfernt. Nur: GW-Selector + Search + Status-Pills + Card-View
- **Nav:** "Manager" + Badge "Office" → "Markt" (DE) / "Pazar" (TR). "Report" → "Community" (DE) / "Topluluk" (TR). Badge entfernt
- **Ergebnis:** 20→13 Tabs, 10 Dateien, 299 Insertions / 864 Deletions (-565 net)

### Dateien modifiziert
- `src/app/(app)/page.tsx` (Home — single scrollable page)
- `src/app/(app)/market/page.tsx` (Spieler tab removed)
- `src/app/(app)/community/page.tsx` (Gerüchte+Aktionen removed)
- `src/app/(app)/club/[slug]/ClubContent.tsx` (Club tab removed, Übersicht simplified)
- `src/app/(app)/fantasy/FantasyContent.tsx` (Category pills + view toggle removed)
- `src/components/community/CommunityFeedTab.tsx` (PostType filter pills added)
- `src/lib/stores/marketStore.ts` (MarketTab type 4→3)
- `src/lib/nav.ts` (badge removed)
- `messages/de.json` (nav labels)
- `messages/tr.json` (nav labels)

## Session 19.02.2026 (96) – Guided Onboarding Checklist

### Änderungen
- **WelcomeBanner entfernt** — statische 3-Button-Banner durch interaktive Checklist ersetzt
- **OnboardingChecklist.tsx** (~130 Zeilen) — 5 Kern-Aktionen tracked via bestehende React Query Hooks (dedupliziert)
- **5 Tasks:** Ersten Spieler kaufen, Fantasy Event beitreten, Einem Scout folgen, Ersten Beitrag erstellen, Erste Prognose abgeben
- **Auto-Detect:** Completion via Holdings/JoinedEvents/FollowingCount/Posts/Predictions — kein zusätzlicher DB-State nötig
- **UX:** Progress-Bar (gold→grün), Confetti bei 5/5, Dismiss via localStorage, Auto-Hide bei Completion
- **Service:** `hasAnyPrediction()` — prüft alle Prediction-Status (nicht nur resolved wie `getPredictionStats`)
- **Hook:** `useHasAnyPrediction()` mit 5min staleTime
- **Barrel-Exports:** `useHasAnyPrediction` + `useJoinedEventIds` in queries/index.ts
- **i18n:** `onboarding` Namespace (12 Keys) in DE+TR

### Dateien erstellt
- `src/components/onboarding/OnboardingChecklist.tsx`

### Dateien modifiziert
- `src/lib/services/predictions.ts` (+hasAnyPrediction)
- `src/lib/queries/predictions.ts` (+useHasAnyPrediction)
- `src/lib/queries/index.ts` (+2 Exports)
- `src/app/(app)/page.tsx` (WelcomeBanner → OnboardingChecklist)
- `messages/de.json` (+onboarding Namespace)
- `messages/tr.json` (+onboarding Namespace)

## Session 19.02.2026 (95) – Prediction Engine

### Änderungen
- **Migration #188:** `predictions` Tabelle (15 Spalten, 3 Indices, 3 RLS Policies), `create_prediction` RPC (Validation, 5-per-GW Limit, auto Difficulty via IPO price heuristic), `resolve_gameweek_predictions` RPC (auto-resolve per Fixture/Stats, awards analyst_score), `notifications_type_check` + `score_events_event_type_check` erweitert
- **Migration #189 (Audit Fixes):** `notifications_reference_type_check` + `prediction` hinzugefügt, `resolve_gameweek_predictions` Admin-Guard + `ROUND()` Fix, `starts→sub` Rename
- **Types:** `Prediction`, `PredictionType`, `PredictionStatus`, `MatchCondition`, `PlayerCondition`, `PredictionCondition`, `NotificationType` erweitert
- **Service:** `predictions.ts` — 8 Funktionen (create, get, count, stats, fixtures, players, resolve, notify)
- **Query Hooks:** 6 Hooks (usePredictions, usePredictionCount, usePredictionStats, useResolvedPredictions, usePredictionFixtures, useCreatePrediction)
- **UI:** PredictionsTab (4. Fantasy-Tab), CreatePredictionModal (3-Step), PredictionCard, PredictionStatsCard
- **Scoring Integration:** `simulateGameweekFlow` → `resolvePredictions(gw)` nach Score-Sync
- **i18n:** 50+ Keys in `predictions.*` namespace (DE+TR)
- **Profil:** PredictionStatsCard nach ScoreRoadCard

### Dateien erstellt
- `src/lib/services/predictions.ts`, `src/lib/queries/predictions.ts`
- `src/components/fantasy/PredictionsTab.tsx`, `src/components/fantasy/CreatePredictionModal.tsx`
- `src/components/fantasy/PredictionCard.tsx`, `src/components/profile/PredictionStatsCard.tsx`

### Dateien modifiziert
- `src/types/index.ts`, `src/lib/queries/keys.ts`, `src/lib/queries/index.ts`
- `src/components/fantasy/types.ts`, `src/components/fantasy/index.ts`
- `src/app/(app)/fantasy/FantasyContent.tsx`, `src/lib/services/scoring.ts`
- `src/components/layout/NotificationDropdown.tsx`, `src/components/profile/ProfileOverviewTab.tsx`
- `messages/de.json`, `messages/tr.json`

## Session 19.02.2026 (94) – Score Road UI

### Änderungen
- **Migration #187:** `claim_score_road` RPC rewritten (scout_scores 3-Dim, Median via `PERCENTILE_DISC(0.5)`, korrekte SCORE_ROAD Milestones)
- **ScoreRoadCard.tsx:** Vertikale Timeline mit 11 Milestones, 4 States (claimed/claimable/active/locked), Progress-Bar, Confetti
- **i18n:** 11 Keys unter `gamification.scoreRoad.*` (DE+TR)
- **Rang Sub-Tier Ordering:** I < II < III (aufsteigend, konsistent mit League-of-Legends-Stil)

## Session 19.02.2026 (93) – Kaufen-Tab Redesign + Trading Deep Dive

### Änderungen
- **Kaufen-Tab:** Komplett redesigned mit DPC-Karten, Preisen, Schnellkauf, IPO Follow-Gate entfernt
- **Trading E2E Simulation:** 12 RPC-Bugs in 5 Migrationen (#182-#186) gefixt
- **Key Fixes:** `::TEXT` Cast auf UUID-Spalten (häufigstes Bug-Pattern), `liquidate_player` 5 Bugs, `is_liquidated` Guards auf allen 4 Trading-RPCs

## Session 19.02.2026 (92) – i18n Gamification + Streak Shield UI

### Änderungen
- **H2 Fix:** Gamification-Texte (Rang, Dimension, Score Labels) in DE+TR via `i18nKey` Pattern
- **H4 Fix:** Streak Shield UI in Profil-Settings (Shield-Icon, Verbrauch/Gesamt, Abo-Upgrade-Hint)

## Session 19.02.2026 (91) – Deep Dive Audit

### Änderungen
- **6K+3H+1M Bugs gefixt** aus Gamification-Rewrite-Audit
- **3 Migrationen (#172-#174):** pg_cron Jobs (score_history cleanup, streak expiry), Fee-Discount enforced in buy_player_dpc
- **pg_cron** Extension aktiviert (Supabase Free Tier)

## Session 18.02.2026 (90) – Gamification System Rewrite (6 Sprints)

### Änderungen
- **Sprint 1 — DB Foundation:** `scout_scores` (3 Dimensionen, Start 500) + `score_history` (Event-Sourced Audit Trail) + `award_dimension_score` RPC (Gold-Abo +20%, Floor bei 0)
- **Sprint 2 — Rang-System + Frontend:** `gamification.ts` komplett neu (12 Tiers Bronze I→Legendär, Median-Gesamt-Rang), `RangBadge` mit DimensionRangStack, 4-Tab Leaderboard (Gesamt/Trader/Manager/Analyst), Home + Profil auf 3 Dimensionen
- **Sprint 3 — Scoring-Regeln:** 5 alte Trigger → neue dimension-basierte (Trader: Profit/Loss-Skalierung, Panic-Sell -20; Manager: Percentile +50 bis -25, Absent -15; Analyst: Content-Metriken ±)
- **Sprint 4 — DPC Mastery:** Level 1-5 pro DPC (XP: Hold +1/Tag, Fantasy +10, Content +15), Freeze bei Verkauf, PlayerContent + ProfileOverview UI
- **Sprint 5 — Airdrop + Achievements + Streaks:** Neue Airdrop-Formel (Rang+Mastery+Activity, Founding 3x, Abo-Mult), 15 Featured + 16 Hidden Achievements, Streak Shields per Abo-Tier (1/2/3 pro Monat)
- **Sprint 6 — Club Perks + Notifications + Cleanup:** Fee-Rabatt per Abo (50/100/150 bps), Rang-Change Notifications (rang_up/rang_down/mastery_level_up), season_reset_scores(), deprecated bescout_scores
- **10 Migrationen (#162-#171)**, ~24 geänderte/neue Dateien, 0 Build-Fehler

## Session 18.02.2026 (89) – Final Report v3 (DPC Supply, Legal Brief, i18n)

### Änderungen
- **DPC Supply:** max_supply=300/Spieler, CHECK Constraint, create_ipo Supply-Cap-Check
- **Legal Brief:** `docs/legal-brief.md` — 10 Kapitel + 3 Appendices, an Anwalt sendbar
- **i18n Tier 3-6:** 7 Pages + Navigation konvertiert, ~404 Keys in 13 Namespaces (DE+TR)
- **1 Migration (#161)**, Build verifiziert (0 Fehler)

## Session 18.02.2026 (88) – Pilot-Readiness Briefing (8 Sprints)

### Änderungen
- **Sprint 0 — UI-Copy Audit:** ~14 verbotene Begriffe gefixt (Investor→Sammler, Buy-in→Teilnahme, Entry Fee→Teilnahmegebühr, Gewinn→Prämie, Trading Platform→Fan-Plattform, Profit→Wert-Entwicklung)
- **Sprint 1 — Entry Fees = 0:** DB Migration (all events → 0, DEFAULT 0), CreateEventModal locked
- **Sprint 2 — Airdrop Score prominent:** Neue `/airdrop` Route (Leaderboard Top 100, Stats, Tips), 3 Query-Hooks, Nav-Eintrag, AirdropScoreCard auf Home
- **Sprint 3 — Founding Scout Badge:** Achievement `founding_scout` für erste 50 User, 1.5x Airdrop-Multiplikator, FoundingScoutBadge Component auf Profil
- **Sprint 4 — PWA v2:** manifest.webmanifest (categories, screenshots), sw.js v2 (App-Shell + Static Asset Caching)
- **Sprint 5 — Prestige-Loop:** Achievement+Level-Up Notification-Types (DB), auto-Notifications bei Achievement-Unlock, Confetti bei Celebration-Toasts, Level-Up Detection (localStorage) auf Profil
- **Sprint 6 — Club Fantasy Settings:** 3 DB-Spalten auf clubs (entry_fee, jurisdiction, allow_fees), AdminSettingsTab UI mit Jurisdiktion-Dropdown, Service-Functions
- **Sprint 7 — i18n (next-intl):** Infrastruktur (request.ts, de.json, tr.json, NextIntlClientProvider), Login+Welcome Pages internationalisiert, Locale Cookie + Profile Language Sync
- **4 Migrationen (#157-#160)**, ~20 geänderte/neue Dateien, 0 Build-Fehler

## Session 18.02.2026 (87) – Project Harmony Sprints 1-5

### Änderungen
- **Sprint 1 — Fee-Fix + Gamification DB:** 3-Way-Split Trading (3.5%+1.5%+1%), IPO 85/10/5, BeScout Score (3 Kategorien), 7 Ränge (Bronze III→Legende), 5 DB-Trigger, `gamification.ts` Service
- **Sprint 2 — Dead Code + RangBadge:** Altes Tier-System entfernt, einheitliches `getRang()` System, RangBadge Component, BeScout Score auf Profile
- **Sprint 3 — Arena Events + Global Leaderboard:** `event_tier` Spalte, `getTierStyle()`, 8-stufige Punktetabelle (+50 bis −15), Visual Distinction in EventCard+DetailModal, CommunityLeaderboardTab mit BeScout Score
- **Sprint 4 — Abo-System Overhaul:** 5 echte Perks enforced: Bronze Vote ×2 (RPC), Silber IPO Early Access (RPC), Silber+ exklusive Bounties (DB+UI), Gold Score +20% (RPC), Gold Premium Events (DB+UI)
- **Sprint 5 — Achievement-Fix:** Alle 25/25 Achievement-Keys mit auto-unlock Checks, 6 neue Lazy Queries (sell_order, verified, posts, research, research_sold, upvotes)
- **9 Migrationen (#148-#156)**, 15+ geänderte Dateien, 0 Build-Fehler

## Session 18.02.2026 (84) – ManagerKaderTab Redesign + Navigation Rename

### Änderungen
- **ManagerKaderTab Redesign:** Konsistentes Player-Card-Design mit Foto, Position-Border, Club-Logo, Performance-KPIs
- **Score-Circle + L5-Bars:** Neuer `getRecentPlayerScores()` Batch-Query + `useRecentScores()` Hook
- **Mobile Picker:** Full-Screen Overlay statt Bottom-Sheet (3 Iterationen, komplett redesigned)
- **CompactPickerRow + FullPlayerRow:** Split für unterschiedliche Kontexte (Picker vs Display)
- **Navigation Rename:** Fantasy→Spieltag, Markt→Manager, Community→Report (BottomNav + SideNav konsistent)
- **6 Dateien geändert**, 0 Build-Fehler

## Session 17.02.2026 (83) – AI Agent Team + Full Audit + CR-4 Fee-Breakdown

### Änderungen
- **14 AI-Agenten** als Claude Code Skills (.claude/skills/)
- **Full Project Audit:** 6 Agents parallel → 7C+7H+15M dedupliziert
- **11 Fixes:** SQL Injection, TipButton, Fee-Breakdown, Focus-Ring, Offers, Touch Targets, EmptyState
- **3 False Positives** identifiziert und übersprungen

## Session 17.02.2026 (82) – Scout-Sponsoring: Creator Monetarisierung

### Änderungen
- **4 Säulen:** Scout-Tipp (95/5), Beratervertrag (85/15), Creator Fund (Impression-basiert), Werbeanteil (Ad Revenue Share)
- **4 Migrationen (#144-#147)**, 9 neue + 7 geänderte Dateien
- **6 neue Transaction-Types**, 4 neue Notification-Types

## Session 17.02.2026 (81) – Sponsor-Placements Expansion (7→21)

### Änderungen
- **Migration #143:** `expand_sponsor_placements` — CHECK Constraint von 7 auf 21 Werte erweitert
- **Types + Labels:** `SponsorPlacement` Union +14, `PLACEMENT_LABELS` +14, Admin Options+Colors +14
- **12 Standard-Placements:** SponsorBanner in Market (transferlist, ipo, portfolio, offers), Club (players, community), Fantasy (spieltag, leaderboard, history), Profile (hero, footer), Community (feed, research)
- **Fantasy Pitch LED Boards:** Hardcodierte Texte → `useSponsor('fantasy_pitch')` dynamic (DashboardTab)
- **4 neue Seed-Einträge:** BeScout auf fantasy_spieltag, community_feed, profile_hero, fantasy_pitch
- **14 Dateien geändert**, 83 Insertions, 0 Build-Fehler

## Session 17.02.2026 (80) – Sponsor-Flächen produktionsreif

### Änderungen
- **Migration #142:** `create_sponsors_table` — sponsors Tabelle + 4 RLS Policies + Partial Index
- **Types + Service:** `DbSponsor`, `SponsorPlacement`, `sponsors.ts` (6 Funktionen), `useSponsor` Hook
- **SponsorBanner Redesign:** Hardcoded → datengetrieben (DB-Fetch oder direkte Props, null wenn kein Sponsor)
- **Event-Flow Fix:** `createEvent()` + `createNextGameweekEvents()` mit sponsorName/sponsorLogo
- **6 Page Placements:** Home (hero+mid), Market (top), Club (hero), Player (mid+footer)
- **AdminSponsorsTab:** CRUD mit Active-Toggle, Logo-Preview, Placement-Badges, Zeitsteuerung
- **BescoutAdminContent:** Sponsoren als 8. Tab (Megaphone-Icon)
- **4 Seed-Einträge:** BeScout auf home_hero, market_top, player_mid, player_footer
- **3 .maybeSingle() Fixes** in liquidation.ts, pbt.ts, wallet.ts

## Session 17.02.2026 (79) – cache.ts Removal

### Änderungen
- 7 Phasen: 33 Services + 2 Providers + 4 Pages von cache.ts → React Query migriert
- cache.ts + cache.test.ts gelöscht — TanStack React Query v5 ist einziges Caching-Layer
- ~41 Query-Hooks in 13 Dateien (queries/), alle Pages migriert

## Session 16.02.2026 (72) – Type Cleanup + Doku Sync

### Änderungen
- **TypeScript Types:** 7 fehlende DB-Felder als optional hinzugefügt (DbEvent.tier_bonuses/min_tier, DbClub.api_football_id, DbCommunityPoll.club_id, DbFeedback.category/status, Profile.top_role, DbUserStats.valuation_score, DbAirdropScore.created_at)
- **Doku:** TODO.md, STATUS.md, MEMORY.md auf aktuellen Stand synchronisiert
- Build verifiziert (0 Fehler, 20 Routes)

## Session 16.02.2026 (71) – Player Images von Transfermarkt

### Änderungen
- **Transfermarkt Scraping:** 9 parallele Agents, Squad-Pages + individuelle Profil-Seiten
- **505/566 Spieler (89%)** mit echten Portrait-URLs
- 7 Clubs 100% (Sakaryaspor, Çorum FK, Erzurumspor FK, Bodrum FK, Sivasspor, Keçiörengücü, İstanbulspor)
- Bandırmaspor 0% (Roster-Mismatch zwischen DB und TM)
- SQL UPDATEs mit türkischer Zeichen-Normalisierung (`translate()`)

## Session 16.02.2026 (70) – TFF 1. Lig Full Reset + Reseed

### Änderungen
- **DB Reset:** TRUNCATE alle Game-Data Tabellen, 11 Clubs ab-/aufgestiegen
- **566 neue Spieler** von Transfermarkt (alle 20 Clubs, echte Namen/Positionen/Trikotnummern)
- **Game Data Reseed:** 380 Fixtures (38 GW), 100 IPOs, 3 Events (GW 1), 15 Bounties, 10 Votes
- 2 Migrationen (#137-#138): api_football_id Spalten + sync_fixture_scores RPC

## Session 16.02.2026 (69) – Performance Optimization

### Änderungen
- Wallet RLS Fix, Market Single-Phase Load, Home Single-Batch Load
- Lightweight Trade Refresh (nur holdings + orders, floor_price client-seitig)

## Session 16.02.2026 (68) – Full Pilot Audit + Fixes

### Änderungen
- 4 Audit-Agents, 23 Issues dedupliziert (5C+7H+12M)
- Sprint 1: Silent Catches (78×), Lineup Exploit, Missing Notification, Event Lifecycle
- Sprint 2: Service Layer, Activity Logging (12 Gaps), Cache topPost, Dead Code
- Sprint 3: not-found pages, CreateEventModal, Cancellation Flags, ErrorState, Admin Tab Extraction
- Sprint 4: Loader2 Spinners, TODO entfernt, FeeKey Type, Button SVG→Loader2

## Session 16.02.2026 (67) – Match-Data Integration (API-Football)

### Änderungen
- 2 Migrationen (#137-#138): api_football_id Spalten, sync_fixture_scores RPC
- footballData.ts Service (API wrapper + mapping + import orchestrator)
- Admin Mapping UI (Teams/Spieler/Fixtures sync + Status Dashboard)
- SpieltagTab dual button (Daten importieren / Simulieren)

## Sessions 64-66 – Airdrop, Launch-Readiness, Stakeholder Audit, Retention

### Änderungen
- Airdrop Score + Referral System (Migrationen #131-#132)
- Launch-Readiness Fixes (Migrationen #133-#134, Content Seeding, Push Notifications)
- Stakeholder Audit (Migrationen #135-#136, Referral Rewards, Club Withdrawal, Analytics)
- Retention Features (Trending Posts, Creator Earnings, Season Leaderboard)
- Cross-App Engagement CTAs

## Session 16.02.2026 (63) – Multi-Club Expansion (8 Phasen)

### Kontext
BeScout war zu 70% multi-club-ready (DB-Schema, Routing, Admin, Services), aber 11 Dateien nutzten hardcoded `TFF_CLUBS`/`PILOT_CLUB_ID`/`getClub()`. Ziel: Volle Multi-Club-Plattform mit Multi-Liga-Vorbereitung.

### Änderungen
- **Phase 1 (Data Layer):** 3 Migrationen (#128-#130) — `leagues` Tabelle (TFF 1. Lig Seed), `club_followers` Tabelle (RLS + Datenmigration von profiles), `club_id` auf community_polls
- **Phase 2 (clubs.ts Refactor):** Komplettes Rewrite von hardcoded TFF_CLUBS zu DB-backed ClubLookup Cache. `initClubCache()` async → `getClub()` sync (gleiche Signatur, 0 Änderungen in 13 Consumern). Neue `leagues.ts` Service. `club.ts` Follower-Logik auf club_followers umgestellt mit Dual-Write
- **Phase 3 (ClubProvider):** Neuer React Context (activeClub, followedClubs, primaryClub, toggleFollow). ClubSwitcher Dropdown in SideNav. Provider-Hierarchie: Auth → Analytics → Club → Wallet → Toast
- **Phase 4 (Hardcoding weg):** 5 Dateien refactored — club/page.tsx redirect → /clubs, FantasyContent PILOT_CLUB_ID → useClub(), community/page sakaryaspor → getUserPrimaryClub(), BescoutAdmin → useClub(), profile TFF_CLUBS → getAllClubsCached()
- **Phase 5 (Club Discovery):** Neue /clubs Route mit Suche, Liga-Gruppierung, Follow/Unfollow, Club-Cards
- **Phase 6 (Fantasy Multi-Club):** getEventsByClubIds() in events.ts, Fantasy nutzt clubId aus ClubProvider
- **Phase 7 (Onboarding):** 3-Step Flow (Handle → Avatar → Club-Wahl mit Suche + Multi-Select + Skip)
- **Phase 8 (Community Scoping):** "Alle Clubs" / "Mein Club" Toggle, clubId Filter auf getPosts, getCommunityPolls, getAllActiveBounties

### Dateien erstellt
- `src/components/providers/ClubProvider.tsx` (~160 Zeilen)
- `src/components/layout/ClubSwitcher.tsx` (~120 Zeilen)
- `src/lib/services/leagues.ts` (~50 Zeilen)
- `src/app/(app)/clubs/layout.tsx`
- `src/app/(app)/clubs/page.tsx` (~190 Zeilen)

### Dateien modifiziert
- `src/types/index.ts` — DbLeague, DbClubFollower, DbClub+league_id, DbFixture+league_id
- `src/lib/clubs.ts` — Komplettes Rewrite (ClubLookup, initClubCache, DB-backed)
- `src/lib/services/club.ts` — Follower-Logik auf club_followers, 4 neue Funktionen
- `src/lib/services/events.ts` — getEventsByClubIds()
- `src/lib/services/posts.ts` — clubId Filter auf getPosts()
- `src/lib/services/bounties.ts` — clubId auf getAllActiveBounties()
- `src/lib/services/communityPolls.ts` — clubId auf getCommunityPolls()
- `src/components/providers/Providers.tsx` — ClubProvider eingebaut
- `src/components/layout/SideNav.tsx` — ClubSwitcher + dynamischer Club-Link
- `src/app/(app)/club/page.tsx` — redirect /clubs statt /club/sakaryaspor
- `src/app/(app)/fantasy/FantasyContent.tsx` — useClub() statt PILOT_CLUB_ID
- `src/app/(app)/community/page.tsx` — Club-Scope Toggle + getUserPrimaryClub
- `src/app/(app)/bescout-admin/BescoutAdminContent.tsx` — useClub() statt PILOT_CLUB_ID
- `src/app/(app)/profile/page.tsx` — getAllClubsCached() statt TFF_CLUBS
- `src/app/(auth)/onboarding/page.tsx` — 3-Step Flow mit Club-Wahl
- `src/app/(app)/club/[slug]/ClubContent.tsx` — stadiumImage Fix

## Session 15.02.2026 (44) – Admin-gesteuerter Spieltag-Flow

### Kontext
GW 11 Events sprangen durch Timestamps automatisch auf "running" → User konnten sich nicht anmelden. Flow soll admin-gesteuert sein.

### Änderungen
- **`deriveEventStatus()`** vertraut jetzt nur DB-Status, keine `Date.now()` Timestamp-Overrides mehr
- **`simulateGameweekFlow()`** erweitert: Events → running (Anmeldung schließen) → Fixtures simulieren → Events scoren → Events für nächsten GW klonen → Active GW vorrücken
- **`createNextGameweekEvents()`** NEU in `events.ts`: Klont Events des aktuellen GW für nächsten GW (idempotent, max GW 38)
- **SpieltagTab Button:** "Simulieren" → "Spieltag starten" mit Confirmation Dialog (Zusammenfassung aller Schritte)
- **`handleSimulated` Callback:** Toast "Spieltag abgeschlossen!", auto-navigate zum neuen Active GW
- **Migration #103:** `reset_gw11_events_and_fix_flow` — GW 11 Events auf "registering" zurückgesetzt

### Dateien modifiziert
- `src/app/(app)/fantasy/FantasyContent.tsx` — deriveEventStatus + handleSimulated
- `src/components/fantasy/SpieltagTab.tsx` — Button + Confirmation Dialog
- `src/lib/services/events.ts` — createNextGameweekEvents()
- `src/lib/services/scoring.ts` — simulateGameweekFlow() erweitert

## Session 15.02.2026 (43) – Beta-Ready Plan: 5 Phasen

### Kontext
App mit Freunden testen: Activity-Logging, User-to-User Angebote, BeScout-Admin Dashboard, Profil Redesign, Gameweek-Flow Verifikation.

### Änderungen
- **Phase 1 (Activity-Logging):** Migration #97 (`activity_log` Tabelle + RLS), `activityLog.ts` Service (Batch-Queue 5s Flush), Integration in trading/social/posts/lineups/AuthProvider/layout
- **Phase 2 (Angebote):** Migration #98 (`offers` Tabelle), Migration #99 (5 RPCs), `offers.ts` Service, `ManagerOffersTab.tsx` (4 Sub-Tabs), NotificationDropdown (4 neue Types), PlayerContent Offer-Button + Open Bids
- **Phase 3 (Admin):** Migration #100 (`platform_admins`), Migration #101 (2 Admin-RPCs), `platformAdmin.ts` Service, `/bescout-admin` Route (6 Tabs), SideNav Admin-Link conditional
- **Phase 4 (Profil):** `getFollowerList()`/`getFollowingList()`, `FollowListModal.tsx`, `ProfilePostsTab.tsx`, ProfileView Redesign (96px Avatar, Portfolio Hero, Bio, Mitglied seit, klickbare Follower-Counts, Posts-Tab)
- **Phase 5 (GW-Flow):** `getFullGameweekStatus()` in scoring.ts, Spieltage-Tab im Admin
- **Migration #102:** `fix_rpc_search_paths` — SET search_path = public auf 10 RPCs

### Dateien erstellt
- `src/lib/services/activityLog.ts`, `src/lib/services/offers.ts`, `src/lib/services/platformAdmin.ts`
- `src/components/manager/ManagerOffersTab.tsx`, `src/components/profile/FollowListModal.tsx`, `src/components/profile/ProfilePostsTab.tsx`
- `src/app/(app)/bescout-admin/page.tsx`, `src/app/(app)/bescout-admin/BescoutAdminContent.tsx`

### Dateien modifiziert
- `src/types/index.ts` — OfferStatus, OfferSide, DbOffer, OfferWithDetails, ProfileSummary, ProfileTab+'posts', NotificationType+4
- `src/lib/services/trading.ts`, `social.ts`, `posts.ts`, `lineups.ts`, `scoring.ts` — Activity-Logging + Follower-Listen + GW-Status
- `src/components/providers/AuthProvider.tsx`, `src/app/(app)/layout.tsx` — Activity-Logging
- `src/app/(app)/market/page.tsx` — ManagerOffersTab
- `src/components/layout/NotificationDropdown.tsx`, `SideNav.tsx` — Offer-Notifications + Admin-Link
- `src/lib/nav.ts` — NAV_ADMIN
- `src/app/(app)/player/[id]/PlayerContent.tsx` — Offer-Button + Open Bids
- `src/components/profile/ProfileView.tsx`, `ProfileOverviewTab.tsx`, `ProfilePortfolioTab.tsx` — Redesign

## Session 14.02.2026 (42) – Fantasy Redesign: GW-zentriert + Sorare UI

### Kontext
Fantasy-Seite war Event-zentriert, Spieltage hatten keinen Fokus. Redesign zu Gameweek-zentriertem Manager-Modus inspiriert von Sorare.

### Änderungen
- **DB Migration #96:** `active_gameweek INT DEFAULT 1` auf `clubs` Tabelle, Sakaryaspor auf GW 11
- **Service Layer:** `getActiveGameweek()`, `setActiveGameweek()` in `club.ts`, `simulateGameweekFlow()` in `scoring.ts`
- **3 Tabs statt 4:** Spieltag (Hero) / Events (GW-gefiltert) / Verlauf — Dashboard entfernt
- **SpieltagTab (NEU):** Unified GW View mit Navigation, Status, Admin-Buttons, Paarungen, Events, Aufstellungen, Ergebnisse, Top Scorer
- **Sorare-inspirierte UI:**
  - `ClubLogo` Komponente: echte Club-Logo-Bilder mit Fallback
  - FixtureRow: vertikale Spielliste mit Logos
  - FixtureDetailModal: Gradient Header mit Logos, 2 Tabs (Aufstellungen/Spieler)
  - Grüner Pitch: SVG Feldlinien, Strafräume, Mittelkreis, Grasstreifen — einheitlich mit EventDetailModal
  - `splitStartersBench()`: Top 11 nach Spielminuten als Starter, Rest als Einwechslungen
  - Formation-Label pro Team (z.B. "4-3-3") + Logo + Teamname
  - PlayerNode: Position-farbige Borders, Score-Badge top-right, Glow-Effekt
  - Sponsor-Banner oben/unten + Mittelkreis-Overlay
- **AdminSettingsTab:** Aktiver-Spieltag Selector (1-38)
- **GameweekSelector:** Dynamisch GW 1-38, Status aus DB
- **3 Events für GW 11:** Gratis (0 BSD), 50 BSD Buy-In, Premium (250 BSD)

### Dateien geändert/erstellt
- `src/components/fantasy/SpieltagTab.tsx` — NEU (~820 Zeilen)
- `src/app/(app)/fantasy/FantasyContent.tsx` — Komplett umgebaut (3 Tabs)
- `src/components/fantasy/GameweekSelector.tsx` — Dynamisch rewritten
- `src/components/fantasy/constants.ts` — Vereinfacht
- `src/components/fantasy/types.ts` — FantasyTab geändert
- `src/components/fantasy/index.ts` — SpieltagTab Export
- `src/components/admin/AdminSettingsTab.tsx` — GW-Steuerung
- `src/lib/services/club.ts` — +getActiveGameweek, +setActiveGameweek
- `src/lib/services/scoring.ts` — +simulateGameweekFlow
- `src/types/index.ts` — DbClub +active_gameweek

## Session 14.02.2026 (37) – "Alle Spieler" Tab im Marktplatz

### Kontext
Marktplatz hatte 500 Spieler, aber Transferliste zeigt nur aktive Sell-Orders und Scouting nur IPOs. Fehlende Möglichkeit, **alle** Spieler zu durchsuchen.

### Änderungen
- `ManagerTab` um `'spieler'` erweitert (`components/manager/types.ts`)
- Neuer Tab "Spieler" im TABS-Array (zwischen Vergleich und Transferliste, Users Icon)
- Club-gruppierte Ansicht: Aufklappbare Sektionen mit Club-Farbpunkt, Short-Code, Spieleranzahl
- Eigene Suche + Positions-Filter (GK/DEF/MID/ATT), unabhängig von Transferliste-Filtern
- `PlayerDisplay variant="compact"` + Watchlist pro Spieler
- Spieler innerhalb jedes Clubs nach Position sortiert (GK→DEF→MID→ATT), dann Name
- Ergebnis-Counter: "500 Spieler in 20 Clubs" (dynamisch bei Filterung)
- Erster Club initial aufgeklappt, Rest zugeklappt → skaliert auf 50+ Clubs
- Build verifiziert: 0 Fehler

## Session 14.02.2026 (35) – Launch-Readiness: GitHub + CI/CD + Monitoring

### Kontext
Vor Pilot-Launch: Versionskontrolle, CI/CD, Error Tracking und Analytics aufsetzen. Security-Audit (npm, Leaked PW Protection). Test-Route entfernen.

### 1. GitHub Repo Setup
- **`git init`** im Projektverzeichnis, Private Repo `Djembo31/beScout-App` auf GitHub erstellt
- **Initial Commit:** 204 Dateien, ~52.000 Zeilen Code, pushed to `main`
- **3 GitHub Secrets** für Build konfiguriert: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SENTRY_DSN`

### 2. Sentry Error Tracking
- **`NEXT_PUBLIC_SENTRY_DSN`** in `.env.local` + GitHub Secrets gesetzt
- **CI Pipeline** (`ci.yml`) erweitert um Sentry env var

### 3. PostHog Analytics
- **`NEXT_PUBLIC_POSTHOG_KEY`** + **`NEXT_PUBLIC_POSTHOG_HOST`** in `.env.local` + GitHub Secrets gesetzt

### 4. Leaked Password Protection
- **Übersprungen** — erfordert Supabase Pro Plan (Authentication → Providers → Email → Password Security)

### 5. npm audit + Dependency-Updates
- **Next.js 14.2.5 → 14.2.35** — kritische CVEs gefixt
- **4 verbleibende high-severity** sind non-exploitable:
  - `glob` CLI in dev dependency (nicht in Produktion)
  - Next.js Image Optimizer DoS (nur self-hosted, nicht Vercel/Supabase)

### 6. /supabase-test Route entfernt
- **`src/app/(app)/supabase-test/page.tsx`** gelöscht — Test-Seite darf nicht in Pilot-Launch

### 7. CI Pipeline
- **GitHub Actions** (`ci.yml`) — Build + Test bei jedem Push/PR auf `main`
- Umgebungsvariablen: Supabase URL/Key + Sentry DSN inkludiert

### Dateien geändert/erstellt
- `.env.local` — +SENTRY_DSN, +POSTHOG_KEY, +POSTHOG_HOST
- `.github/workflows/ci.yml` — NEU (CI Pipeline)
- `package.json` / `package-lock.json` — Next.js Update
- `src/app/(app)/supabase-test/page.tsx` — GELÖSCHT

## Session 13.02.2026 (34) – Verbleibende Lücken geschlossen

### Kontext
Session 33 identifizierte 12 Lücken im Logik-Check (Vision vs. Implementierung), davon 6 Pilot-Blocker gefixt. Diese Session schließt die restlichen 5 Lücken (Membership-Tiers → Phase 7 übersprungen).

### 1. Participant-Limit-Guard
- **FantasyContent.tsx:** `handleJoinEvent` prüft jetzt `maxParticipants >= participants` vor Join → Toast "Event voll"
- **EventDetailModal.tsx:** Join-Button `disabled` + Text "Event voll" wenn `isFull`

### 2. Fee-Breakdown Sell-Form
- **PlayerContent.tsx:** YourHoldingsWidget zeigt Brutto / Gebühr (5%) / Netto statt nur "Erlös"
- Hardcoded 5% = `trade_fee_bps = 500` (DB-Standard), kein neuer Fetch/State

### 3. Admin Event-Erstellung
- **AdminEventsTab.tsx:** Komplett rewritten von 26-Zeilen-Stub → ~270 Zeilen voll-funktional
  - Event-Liste mit Status-Badges (registering/running/scoring/ended/cancelled)
  - Create-Modal: Name, Typ (club/bescout/sponsor/special), Format (6er/11er), Gameweek, Entry Fee, Preisgeld, Max Teilnehmer, Start/Lock/End-Zeit
  - Status-Aktionen pro Event: Starten, Abbrechen, Beenden
- **events.ts:** +`getEventsByClubId()`, +`createEvent()`, +`updateEventStatus()`

### 4. Admin Spieler-Anlegen
- **AdminPlayersTab.tsx:** "Spieler anlegen" Button in Spieler-Verwaltung + Create-Modal
  - Felder: Vorname, Nachname, Position (GK/DEF/MID/ATT), Trikotnr., Alter, Nationalität, IPO-Preis
  - Club-Info automatisch aus `club` Prop
- **players.ts:** +`createPlayer()` — Insert mit allen Standard-Defaults (dpc=0, matches=0, status=fit)

### 5. Öffentliche Profile
- **ProfileView.tsx:** Neuer Shared Client-Component (~280 Zeilen)
  - Props: `targetUserId`, `targetProfile`, `isSelf`, `renderSettings?`
  - `isSelf` steuert: Wallet-Card, Portfolio-Tab, Settings-Tab, Edit-Button vs. Follow-Button
  - Follow/Unfollow für öffentliche Profile (optimistischer Follower-Count)
- **profile/page.tsx:** Refactored → nutzt ProfileView mit `isSelf=true`, SettingsTab bleibt inline
- **profile/[handle]/page.tsx:** Neue Route für öffentliche Profile
  - Resolve via `getProfileByHandle()`, 404 wenn nicht gefunden
  - Redirect zu `/profile` wenn eigenes Handle
- **profiles.ts:** +`getProfileByHandle(handle)` Query
- **Home page.tsx:** 3 Leaderboard-Sektionen (Top Scouts, Top Traders, Follow-Empfehlungen) verlinken jetzt auf `/profile/{handle}` via `<Link>`

### Dateien geändert (9) + erstellt (3)
- `src/app/(app)/fantasy/FantasyContent.tsx` — Participant-Limit check
- `src/components/fantasy/EventDetailModal.tsx` — isFull disabled + Text
- `src/app/(app)/player/[id]/PlayerContent.tsx` — Fee-Breakdown
- `src/components/admin/AdminEventsTab.tsx` — Komplett rewritten
- `src/lib/services/events.ts` — +3 Funktionen
- `src/components/admin/AdminPlayersTab.tsx` — +Create Player Modal
- `src/lib/services/players.ts` — +createPlayer
- `src/app/(app)/profile/page.tsx` — Refactored auf ProfileView
- `src/app/(app)/page.tsx` — Leaderboard Links
- `src/components/profile/ProfileView.tsx` — NEU (Shared Profile Component)
- `src/app/(app)/profile/[handle]/page.tsx` — NEU (Public Profile Route)
- `src/lib/services/profiles.ts` — +getProfileByHandle

### Verbleibende Lücken
- Membership-Tiers rein dekorativ — Phase 7 Feature-Gating
- Leaked Password Protection — erfordert Supabase Pro Plan

## Session 13.02.2026 (33) – Pilot-Blocker Fixes

### Logik-Check
Vision-Dokument gegen Implementierung geprüft. 4 parallele Deep-Dive Agents: Onboarding-Flow, Trading+IPO E2E, Community+Reputation, Club+Admin+Fantasy. 12 Lücken identifiziert, 6 als Pilot-Blocker priorisiert.

### Fix 1+2: Scout Score + Achievements auto-berechnen
- **social.ts:** `checkAndUnlockAchievements()` erweitert: `podium_3x` echte DB-Query (lineups rank<=3), `first_bounty` echte DB-Query (bounty_submissions approved), lazy-queried
- **social.ts:** `followUser()` → refreshUserStats + checkAndUnlockAchievements für followed User
- **votes.ts:** `castVote()` → fire-and-forget stats+achievements refresh
- **bounties.ts:** `approveBountySubmission()` → stats+achievements für Submitter (nicht nur Admin)
- **scoring.ts:** `scoreEvent()` → stats+achievements für alle Teilnehmer nach Auswertung

### Fix 3: Research price_at_creation
- **research.ts:** `select('last_price')` → `select('floor_price, ipo_price')` mit Fallback. Track Record Resolution funktioniert jetzt (vorher: price_at_creation=0 → resolve RPC skippt)

### Fix 4: Welcome Page BSD-Betrag
- **welcome/page.tsx:** "500 BSD" → "10.000 BSD" (Zeile 44 + 215). Stimmt jetzt mit DB-Startguthaben (1.000.000 Cents) überein

### Fix 5: Fantasy Lineup-Lock
- **Bereits implementiert:** EventDetailModal.tsx `isReadOnly = running || ended`, Pitch-Slots disabled, Join/Update Buttons hidden, "Aufstellung gesperrt" Banner

### Fix 6: Trading-Notifications
- **types/index.ts:** `'trade'` zu NotificationType Union hinzugefügt
- **trading.ts:** `buyFromMarket()` + `buyFromOrder()` senden fire-and-forget Notification an Seller ("DPC verkauft", Spielername)
- **NotificationDropdown.tsx:** `trade` Case: ArrowLeftRight Icon, Gold-Farbe

### Dateien geändert (8)
- `src/lib/services/social.ts` — Achievements + followUser trigger
- `src/lib/services/scoring.ts` — Stats+Achievements für alle Teilnehmer
- `src/lib/services/votes.ts` — Stats+Achievements nach castVote
- `src/lib/services/bounties.ts` — Stats+Achievements für Submitter
- `src/lib/services/research.ts` — price_at_creation Fix
- `src/lib/services/trading.ts` — Seller-Notifications
- `src/types/index.ts` — NotificationType erweitert
- `src/components/layout/NotificationDropdown.tsx` — trade Icon+Farbe
- `src/app/welcome/page.tsx` — BSD-Betrag korrigiert

### Verbleibende Lücken (nicht Pilot-kritisch) → ✅ Session 34 geschlossen
- ~~Profile ist self-only~~ → ✅ Öffentliche Profile (`/profile/[handle]`) implementiert
- ~~Admin Event Creation ist Stub~~ → ✅ Volle Event-CRUD in AdminEventsTab
- ~~Admin Player Creation fehlt~~ → ✅ Spieler-Anlegen Modal in AdminPlayersTab
- ~~Fee-Breakdown wird Sellern nicht angezeigt~~ → ✅ Brutto/Gebühr/Netto im Sell-Form
- ~~Participant-Limit-Guard fehlt~~ → ✅ maxParticipants Check + Button disabled
- Membership-Tiers rein dekorativ — Phase 7 Feature-Gating

## Session 13.02.2026 (32) – Projekt-Audit + Cleanup

### Smoke Test
- **Build:** 0 Fehler, 0 Warnungen, 16 Routes (Static + Dynamic)
- **Type-Konsistenz:** Alle PlayerDisplay-Imports korrekt, keine toten Referenzen
- **Service Layer:** Alle Pages nutzen Services (außer Avatar-Upload + Auth — bewusst)
- **console.log:** Nur in Error Boundaries (korrekt)

### Fixes
- **SideNav.tsx:** "Balance"→"Guthaben", "More"→"Mehr", "Logout"→"Abmelden"
- **profile/page.tsx:** Duplicate `HoldingRow` entfernt → importiert von `ProfileOverviewTab`
- **PlayerRow.tsx:** `PlayerHoldingRow` deprecated Export entfernt (~60 Zeilen, nirgends importiert)
- **PlayerRow.tsx:** Club-Logo `alt=""` → `alt={player.club}` (4 Instanzen, Accessibility)

### Verifiziert sauber
- Keine `variant="standard"` / `variant="detailed"` Referenzen
- Keine `PlayerCard` Imports
- Empty States + Loading Skeletons auf allen Seiten
- Responsive: Keine versteckten kritischen Infos auf Mobile
- Design System konsistent (Gold/Green/Position-Farben)

## Session 13.02.2026 (31) – Unified PlayerDisplay Refactor

### PlayerRow.tsx — Neues Komponentensystem
- **Entfernt:** `standard` + `detailed` Varianten, `PlayerCard` aus `player/index.tsx`
- **Neu:** `card` Variante (~170px, Karte mit Indikatoren: PBT, Contract, Owned, IPO)
- **Erweitert:** `compact` Variante mit kontextabhängigen Modi (default/holding/ipoData)
- **Compact Holding:** L5 Score-Pill + Sorare-inspirierter 5-Segment-Bar + Stats-Pills (Sp/T/A) + Club-Logo
- **Club-Logo:** `getClub()` aus `lib/clubs.ts` → `<img>` mit Fallback zu farbigem Dot
- **TrikotBadge/PositionBadge:** `useTrikot = player.ticket > 0` entscheidet welches Badge links steht

### Types + Query-Erweiterung
- **DpcHolding:** +ticket, +age, +perfL5, +matches, +goals, +assists
- **HoldingWithPlayer:** +shirt_number, +age (aus getHoldings Supabase-Query)
- **HoldingRow** (Profile): +shirt_number, +age, +perf_l5, +matches, +goals, +assists

### Dateien (8 geändert, ~-900 Zeilen netto)
- `PlayerRow.tsx` — Foundation: card + compact Varianten
- `player/index.tsx` — PlayerCard entfernt (~80 Zeilen)
- `market/page.tsx` — PlayerRowTable, IPOCardGrid, IPORowTable, ClubLabel entfernt (~450 Zeilen)
- `ManagerBestandTab.tsx` — Custom Table/Cards → PlayerDisplay compact mit holding
- `page.tsx (Home)` — PlayerHoldingRow Table + Mobile-Cards → PlayerDisplay compact
- `ProfilePortfolioTab.tsx` — Custom Table → PlayerDisplay compact
- `ManagerKaderTab.tsx` — Custom-Zeilen → PlayerDisplay compact
- `ClubContent.tsx` — PlayerCard → PlayerDisplay card

### Bugfixes
- Double PositionBadge (ticket=0): inline POS badge nur wenn TrikotBadge links steht
- `Trend` type ist `'UP'|'DOWN'|'FLAT'` (nicht `'stable'`)
- DB: `shirt_number` (nicht `ticket_number`), kein `league` Column
- `Player.prices`: `lastTrade` + `change24h` (nicht `ipo`), `dpc` braucht `supply/float/circulation/onMarket/owned`

## Session 13.02.2026 (30) – Phase 6.4: Community-Moderation + Streak-Bonus

### DB Schema (2 Migrationen: 75-76 + RPC-Update)
- **Migration 75:** `community_moderation` — clubs.community_guidelines (TEXT), `admin_delete_post` RPC (SECURITY DEFINER, löscht Post+Replies+Votes, Notification an Autor), `admin_toggle_pin` RPC (SECURITY DEFINER, max 3 pinned/club), `update_community_guidelines` RPC
- **Migration 76:** `streak_bonus_system` — user_streaks (PK user_id, current/longest streak, last_login_date), streak_milestones_claimed (UNIQUE user_id+milestone), `record_login_streak` RPC (SECURITY DEFINER, auto-claim milestones: 3d=5 BSD, 7d=15 BSD, 14d=50 BSD, 30d=150 BSD)
- **RPC Update:** `get_club_by_slug` erweitert um community_guidelines Feld

### Types
- **Erweitert:** `DbClub` (+community_guidelines), `StreakResult` (NEU)

### Service Layer
- **posts.ts:** +adminDeletePost, +adminTogglePin, getPosts sortiert jetzt is_pinned DESC vor created_at DESC
- **club.ts:** +updateCommunityGuidelines (RPC + invalidate)
- **streaks.ts (NEU):** ~20 Zeilen. recordLoginStreak → RPC + wallet invalidation bei Rewards
- **activityHelpers.ts:** `streak_bonus` → Flame icon, Orange color, "Streak-Bonus" label

### Components
- **PostCard.tsx:** +isClubAdmin, +onAdminDelete, +onTogglePin Props. Gepinnt-Badge (Pin icon, gold). Admin-Menu: Anpinnen/Lösen + Admin:Löschen
- **CommunityFeedTab.tsx:** Pinned Posts always on top (vor Neu/Top Sort). Admin-Props pass-through
- **AdminModerationTab.tsx (NEU):** ~200 Zeilen. Guidelines-Editor (Textarea, max 1000), Gepinnte Posts (max 3), Club-Posts Liste mit Pin/Delete
- **AdminContent.tsx:** 7→8 Tabs (+Moderation mit Shield icon)
- **ClubContent.tsx:** Community-Richtlinien Info-Card (gold border, über Posts)
- **community/page.tsx:** isClubAdmin State via getClubBySlug, handleAdminDeletePost + handleTogglePin Callbacks

### Home Page (Streak)
- **page.tsx:** Server-seitige Streak via recordLoginStreak (fire-and-forget, überschreibt localStorage). Milestone-Toast bei Reward. Streak-Badge mit nächstem Milestone-Hinweis ("noch Xd bis Yd Bonus"). ICON_MAP erweitert (Flame, Banknote)

### Bugfix: MissionBanner Hook-Violation
- **MissionBanner.tsx:** `useMemo` war NACH `if (loading) return null` → "Rendered more hooks than during the previous render" Crash. Fix: `useMemo` vor early return verschoben.

### Leaked Password Protection
- **Manuell im Dashboard aktivieren:** Authentication → Settings → Password Security → Leaked password protection

## Session 13.02.2026 (29) – Phase 6.5: Success Fee + Liquidierung

### DB Schema (4 Migrationen: 71-74)
- **Migration 71:** `add_liquidation_columns` — players.success_fee_cap_cents (BIGINT), players.is_liquidated (BOOLEAN), partial index
- **Migration 72:** `create_liquidation_tables` — liquidation_events (audit log), liquidation_payouts (pro-holder payout), RLS + Indexes
- **Migration 73:** `fix_constraints_for_liquidation` — pbt_transactions amount CHECK (<>0 statt >0), source (+liquidation), notifications type (+pbt_liquidation, +bounty types), reference_type (+player, +liquidation, +bounty)
- **Migration 74:** `create_liquidation_rpcs` — `set_success_fee_cap` (admin guard, cap setzen), `liquidate_player` (SECURITY DEFINER, atomic: cancel orders, distribute PBT, delete holdings, mark liquidated)

### Types
- **Neue Types:** `DbLiquidationEvent`, `DbLiquidationPayout`
- **Erweitert:** `DbPlayer` (+success_fee_cap_cents, +is_liquidated), `Player` (+successFeeCap, +isLiquidated), `NotificationType` (+pbt_liquidation)

### Service Layer
- **liquidation.ts (NEU):** ~130 Zeilen. setSuccessFeeCap, liquidatePlayer (RPC + cache invalidation + fire-and-forget notifications to all holders + mission tracking), getLiquidationEvent (cached 5min), getLiquidationPayouts (enriched with handles). invalidateLiquidationData().

### Integration
- **players.ts:** dbToPlayer maps success_fee_cap_cents → successFeeCap, is_liquidated → isLiquidated
- **activityHelpers.ts:** `pbt_liquidation` → Banknote icon, Gold color, "PBT-Ausschüttung" label
- **NotificationDropdown.tsx:** `pbt_liquidation` type (Banknote icon, gold), reference_type `player`/`liquidation` → href to player page
- **trading.ts:** `buyFromMarket` + `placeSellOrder` pre-check `is_liquidated` before RPC call

### Admin UI (AdminPlayersTab.tsx)
- **Spieler-Verwaltung Sektion:** Pro Spieler: Shield-Button (Cap setzen) + Flame-Button (Liquidieren)
- **Success Fee Cap Modal:** BSD-Eingabefeld, aktueller Cap-Anzeige
- **Liquidation Confirmation Modal:** PBT-Balance, Cap, geschätzte Ausschüttung, UNWIDERRUFLICH-Warnung → Ergebnis-Anzeige (Holder, ausgeschüttet, Success Fee)
- **Status-Badges:** Liquidierte Spieler mit "Liquidiert"-Chip, ausgeblendet bei Cap/Liquidation-Buttons
- **Eligible Players:** Liquidierte Spieler aus IPO-Erstellung ausgeschlossen

### Player UI (PlayerContent.tsx)
- **Liquidation-Banner:** Roter Banner mit Flame icon, Ausschüttungs-Details (Betrag, Fee, Holder, Datum)
- **Trading gesperrt:** Lock-Card in rechter Spalte wenn liquidiert
- **Trade Widgets ausgeblendet:** IPO, Transfer-Buy, Holdings-Widget hidden wenn isLiquidated
- **PBT Widget:** "Reserviert (Success Fee)" statt "Treasury Guthaben" wenn liquidiert, gedämpfte Farben
- **Buy/Sell Guards:** handleBuy/handleSell prüfen isLiquidated

### Market Guards (market/page.tsx)
- **Transferliste:** Liquidierte Spieler ausgeschlossen
- **Kader:** Liquidierte Spieler ausgeschlossen

## Session 13.02.2026 (28) – Phase 6.3: Club-Aufträge / Bounties

### DB Schema (5 Migrationen: 66-70)
- **Migration 66:** `create_bounties_table` — bounties (club_id FK, title, description, reward_cents, deadline_at, max_submissions, player_id FK optional, status open/closed/cancelled) + RLS + Indexes
- **Migration 67:** `create_bounty_submissions_table` — bounty_submissions (bounty_id FK, user_id FK, title, content, status pending/approved/rejected, admin_feedback, reward_paid, UNIQUE bounty+user) + RLS + Indexes
- **Migration 68:** `create_bounty_rpcs` — 3 RPCs: `submit_bounty_response` (guards + insert), `approve_bounty_submission` (atomic wallet transfer, dual TX logs bounty_cost/bounty_reward), `reject_bounty_submission` (feedback + status)
- **Migration 69:** `create_bounty_auto_close` — `auto_close_expired_bounties()` lazy trigger
- **Migration 70:** `seed_bounty_missions` — 2 missions: daily_submit_bounty (10 BSD), weekly_bounty_complete (50 BSD)

### Types
- **Neue Types:** `BountyStatus`, `SubmissionStatus`, `DbBounty`, `BountyWithCreator`, `DbBountySubmission`, `BountySubmissionWithUser`, `BountySubmissionWithBounty`
- **Erweitert:** `NotificationType` (+bounty_submission, bounty_approved, bounty_rejected)

### Service Layer
- **bounties.ts (NEU):** ~300 Zeilen. getBountiesByClub, getAllActiveBounties, createBounty, cancelBounty, submitBountyResponse (RPC + Notification + Mission), approveBountySubmission (RPC + Notification + Achievement), rejectBountySubmission (RPC + Notification), getBountySubmissions, getUserBountySubmissions. invalidateBountyData().

### Integration
- **cache.ts:** `invalidateBountyData(userId?, clubId?)` added (nicht als separate Funktion — direkt in bounties.ts)
- **activityHelpers.ts:** `bounty_cost` (Target, amber) + `bounty_reward` (Target, grün)
- **achievements.ts:** `first_bounty` ("Club Scout", scout category)
- **NotificationDropdown.tsx:** 3 neue Notification-Types (bounty_submission/approved/rejected) mit Icons + Farben + href

### Admin Components
- **AdminBountiesTab.tsx (NEU):** ~280 Zeilen. Bounty-Liste (offen/beendet), Create Modal, Submissions Modal, Review Modal (Inhalt lesen + Feedback + Genehmigen/Ablehnen), Cancel-Button
- **AdminContent.tsx:** +bounties Tab (Target Icon, "Aufträge")

### Community Components
- **BountyCard.tsx (NEU):** ~150 Zeilen. Amber-Theme Header, Titel/Beschreibung, Reward/Deadline/Submissions Info, Submit Modal
- **CommunityBountiesTab.tsx (NEU):** ~50 Zeilen. Wrapper mit Empty State
- **community/page.tsx:** +bounties Tab, +getAllActiveBounties in data fetch, +handleSubmitBounty handler

### Betroffene Dateien (~12)
- **Neue (4):** bounties.ts, AdminBountiesTab.tsx, BountyCard.tsx, CommunityBountiesTab.tsx
- **Modifiziert (8):** types/index.ts, activityHelpers.ts, achievements.ts, cache.ts (via bounties.ts), NotificationDropdown.tsx, AdminContent.tsx, community/page.tsx

## Session 13.02.2026 (27) – Phase 6.1 + 6.2: Multi-Club Architektur + Club Dashboard

### DB Schema (10 Migrationen: 56-65)
- **Migration 56:** `create_clubs_table` — clubs Tabelle (slug, name, short, league, country, city, stadium, logo_url, primary_color, secondary_color, plan, is_verified) + RLS
- **Migration 57:** `create_club_admins_table` — club_admins (club_id FK, user_id FK, role CHECK owner/admin/editor, UNIQUE) + RLS
- **Migration 58:** `seed_sakaryaspor_club` — Sakaryaspor als Pilot-Club (ID: `2bf30014-db88-4567-9885-9da215e3a0d4`)
- **Migration 59:** `add_club_id_to_players` — club_id FK auf players + Backfill 25 Spieler + Index
- **Migration 60:** `add_club_id_to_club_votes` — club_id FK auf club_votes + Backfill + Index
- **Migration 61:** `add_club_id_to_events` — club_id FK auf events + Backfill 3 Events + Index
- **Migration 62:** `add_club_id_to_fee_config` — club_id FK auf fee_config + Backfill + UNIQUE Index
- **Migration 63:** `add_club_id_to_content_tables` — club_id FK auf posts + research_posts + Backfill + Indexes
- **Migration 64:** `add_club_id_to_profiles` — favorite_club_id FK auf profiles + Backfill + Index
- **Migration 65:** `create_club_admin_rpcs` — 6 RPCs: is_club_admin, get_club_by_slug (JSONB mit is_admin/admin_role), get_club_dashboard_stats_v2, add_club_admin, remove_club_admin

### Types
- **Neue Types:** `ClubAdminRole`, `DbClub`, `ClubWithAdmin`, `DbClubAdmin`
- **Erweitert:** `DbPlayer`, `DbClubVote`, `DbEvent`, `DbFeeConfig`, `DbPost`, `DbResearchPost` (+club_id), `Profile` (+favorite_club_id)

### Service Layer (9 Dateien)
- **club.ts:** Komplett rewritten (~83→~227 Zeilen). Alle Funktionen nutzen `clubId` (UUID) statt `clubName` (String). Neue: `getClubBySlug`, `getClubById`, `getAllClubs`, Admin-Funktionen.
- **votes.ts:** `getActiveVotes`/`getAllVotes` → `.eq('club_id', clubId)`. `createVote` dual-write (club_id + club_name).
- **players.ts:** Neue `getPlayersByClubId()` (cached 5min).
- **ipo.ts:** Neue `getIposByClubId()` (zwei-Schritt: Players → IPOs).
- **posts.ts:** `createPost` +clubId Parameter (optional, dual-write).
- **research.ts:** `getResearchPosts` +clubId Filter. `createResearchPost` +clubId dual-write.
- **pbt.ts:** `getFeeConfig` +byId Option für club_id Lookup.
- **profiles.ts:** `createProfile`/`updateProfile` +favorite_club_id.
- **cache.ts:** Neue `invalidateClubData(clubId?)`.

### Routes + Pages
- **`/club`** → Redirect zu `/club/sakaryaspor` (Pilot)
- **`/club/[slug]`** → Server Component (generateMetadata) + `ClubContent.tsx` (~1400 Zeilen)
  - Dynamische Club-Daten via `getClubBySlug(slug, userId)`
  - 5 Tabs: Übersicht, Spieler, Membership, Community, Dashboard
  - Admin-Link in Tab-Bar wenn `club.is_admin`
  - Error State für ungültige Slugs
- **`/club/[slug]/admin`** → Server Component + `AdminContent.tsx`
  - Auth-Guard: Redirect wenn kein Admin
  - 6 Tabs: Übersicht, Spieler, Events, Abstimmungen, Einnahmen, Einstellungen

### Admin Components (6 neue Dateien in `src/components/admin/`)
- `AdminOverviewTab.tsx` — KPI Cards (Revenue, Fans, Volume, Followers) + Top Traded + Top Fans
- `AdminPlayersTab.tsx` — IPO-Management (Create/Start/End IPOs)
- `AdminEventsTab.tsx` — Platzhalter für Event-Erstellung
- `AdminVotesTab.tsx` — Club-Votes erstellen/verwalten
- `AdminRevenueTab.tsx` — Revenue-Dashboard mit KPI Cards
- `AdminSettingsTab.tsx` — Club-Info Display + Platzhalter für Branding/Team

### Hardcoded-Referenzen
- **community/page.tsx:** 4 `'Sakaryaspor'` Referenzen → dynamisch via `profile.favorite_club_id` (Fallback: Sakaryaspor per Slug-Lookup)

### Betroffene Dateien (~25)
- **Neue (13):** ClubContent.tsx, AdminContent.tsx, 6 Admin-Tabs, club/page.tsx (redirect), club/[slug]/page.tsx, club/[slug]/admin/page.tsx
- **Modifiziert (12):** types/index.ts, cache.ts, club.ts, votes.ts, players.ts, ipo.ts, posts.ts, research.ts, pbt.ts, profiles.ts, community/page.tsx

## Session 13.02.2026 (26) – Engagement Wellen 1-4

### Welle 1: Day-1 Retention (8 Items)
- **Trending Players:** 24h Trade-Aggregation + horizontaler Strip auf Manager Office (Flame icon, Position, Floor, 24h %)
- **Price Sparklines:** `getAllPriceHistories()` Bulk-Loader (500 Trades → `history7d` pro Spieler), MiniSparkline in PlayerDisplay
- **Weitere Items (vorherige Session):** Welcome-Flow, Onboarding-Tooltips, Quick-Stats, IPO-Highlights, Portfolio-Value, Kader-Link-Fix

### Welle 2: Week-1 Retention (8 Items)
- **Live Trade Feed:** `getRecentGlobalTrades()` → horizontaler Ticker auf Home (Player+Preis+Typ, kein Buyer-Name wegen FK-Constraint)
- **Login Streak:** localStorage-basiert (Flame Badge bei >=2 Tagen im Greeting-Bereich)
- **Quick-Actions Portfolio:** Handeln/Details-Buttons auf Mobile Portfolio-Cards (Home)
- **Achievement-Notifications:** `triggerStatsRefresh()` erstellt Notifications via `createNotification()` bei neuen Achievements
- **Leaderboard Rank-Changes:** localStorage Rank-Snapshot + ↑N/↓N Badges in CommunityLeaderboardTab
- **Share-to-Community:** "In Community teilen" Button nach Trade-Erfolg auf Spieler-Detailseite (dynamischer `createPost()` Import)
- **Watchlist Persistence + Preis-Notifications:** localStorage-Persistenz + Preis-Snapshot bei Watchlist-Add. Bei nächstem Besuch: Toast bei >=5% Preisänderung. Neuer "Beobachtet"-Filter-Button.
- **Portfolio Performance Widget:** Bereits vorhanden (P&L + Portfoliowert Stats)

### Welle 3: Monetarisierung & Tiefe (8 Items)
- **Preis-Chart:** SVG Line Chart auf Spieler-Detailseite (Übersicht Tab), Preisverlauf aus Trade-Historie mit Area-Fill + Change-Anzeige
- **Preis-Alerts:** localStorage-basiert. Zielpreis setzen auf Spieler-Seite → Toast bei nächstem Besuch wenn Preis erreicht (above/below)
- **"Unter Wert" Empfehlungen:** Schnäppchen-Strip auf Home (L5 Perf / Floor Price Ratio), horizontale Scroll-Leiste
- **Research-Einnahmen Dashboard:** Profil Research-Tab: Gesamteinnahmen, Verkäufe, Ø Bewertung, Top-Bericht
- **Top-Trader Showcase:** `getTopTraders()` in trading.ts (7d Volumen), Sidebar-Card auf Home
- **IPO FOMO-Indicators:** "Fast ausverkauft!" Badge (>90%), "Beliebt" (>70%), Farb-Shift Progressbar (grün→orange→rot), "Nur noch X DPC!" Text
- **Portfolio-Insights Widget:** Diversifikations-Score, Top-Performer, Positions-Verteilungs-Bar auf Home
- **Orderbook-Tiefe:** Sell-Order-Depth-Balken auf Spieler-Seite (Markt-Tab), aggregiert nach Preislevel mit Kumulation

### Welle 4: Social & Viral (8 Items)
- **Community-Highlights:** Top 3 Posts auf Home-Seite (Autor-Avatar, Kategorie, Vorschau, Upvotes)
- **Reply-Notifications:** `createReply()` → Fire-and-forget Notification an Parent-Autor. Neuer NotificationType `'reply'` + MessageCircle Icon.
- **Social-Proof:** "X Scouts halten" Badge auf Spieler-Detailseite (Header). `getPlayerHolderCount()` + `getBulkHolderCounts()` in wallet.ts.
- **Quick-Share Buttons:** Share2-Button auf Spieler-Seite → native Share API / Clipboard. "Teilen"-Button in PostCard → Clipboard mit Inhalt.
- **Achievement-Badges auf Leaderboard:** Top-Rolle Badge (Trader/Manager/Scout) neben Username. Score-Breakdown (TRD/MGR/SCT Spalten).
- **Plattform-Puls Widget:** `getPlatformStats()` in trading.ts → 4-Stats-Grid auf Home (Scouts, 24h Trades, 24h Volumen, Aktive Spieler).
- **Follow-Empfehlungen:** "Entdecken"-Card in Home-Sidebar (Top 3 Leaderboard-User excl. self, Ansehen-Button).
- **Einladungs-Banner:** Gold-Gradient CTA-Card am Ende des Home-Contents (native Share / Clipboard).

### Betroffene Dateien (Welle 1-4)
- Trading.ts: +6 Funktionen (getTrendingPlayers, getAllPriceHistories, getRecentGlobalTrades, getTopTraders, getPlayerPriceHistory, getPlatformStats)
- Wallet.ts: +2 Funktionen (getPlayerHolderCount, getBulkHolderCounts)
- PlayerContent.tsx: +Price-Chart, +Price-Alerts, +Share-to-Community, +IPO FOMO, +Orderbook-Depth, +Social-Proof, +Quick-Share
- Market/page.tsx: +Trending, +Sparklines, +Watchlist-Persistence, +Beobachtet-Filter, +IPO FOMO
- Home/page.tsx: +Live Feed, +Streak, +Quick-Actions, +Unter-Wert, +Top-Traders, +Portfolio-Insights, +Community-Highlights, +Platform-Pulse, +Follow-Suggestions, +Invite-Banner
- Posts.ts: +Reply-Notifications (createReply)
- PostCard.tsx: +Quick-Share (Teilen Button)
- CommunityLeaderboardTab.tsx: +Rank-Snapshots, +Top-Role Badge, +Score-Breakdown
- NotificationDropdown.tsx: +'reply' type handling
- Types/index.ts: +NotificationType 'reply'
- ProfileResearchTab.tsx: +Einnahmen-Dashboard

## Session 13.02.2026 (25) – Manager Office + Missions + Quick Fixes

### Phase 1: Quick Fixes
- **Wallet Balance Fix:** `WalletProvider` von `useState(0)` → `useState<number | null>(null)` + sessionStorage-Hydration. Kein "0 BSD" Flash mehr. Skeleton-Shimmer in TopBar, SideNav, Home, Profile.
- **Mein Kader Link Fix:** `href="/market"` → `href="/market?tab=kader"`. Market-Page liest `?tab=` via `useSearchParams()`.

### Phase 2: Manager Office
- **Nav umbenannt:** "Markt" → "Manager" (Icon: Briefcase, Badge: "Office")
- **Metadata:** "Marktplatz" → "Manager Office"
- **Neue Tab-Struktur:** Kader | Vergleich | Transferliste | Scouting | Angebote (Default: Kader)
- **11 neue Dateien in `src/components/manager/`:**
  - `types.ts` — ManagerTab, FormationId, SquadSlot, SquadPreset, CompareSlot
  - `constants.ts` — FORMATIONS (4-3-3, 4-4-2, 3-5-2, 5-3-2), SQUAD_PRESET_KEY
  - `helpers.ts` — getPosColor, getPosBorderClass, getScoreColor, getSlotPosition
  - `SquadPitch.tsx` — SVG Pitch (400x500) + 11er Formation + Player Circles + Click-to-Assign
  - `SquadSummaryStats.tsx` — Kaderwert, Aufstellung x/11, Position-Verteilung, Avg Perf
  - `ManagerKaderTab.tsx` — Pitch + Formation-Selector + Player-Picker Modal + Presets (localStorage) + Owned Player List
  - `ManagerCompareTab.tsx` — 2-3 Slot Auswahl + Side-by-Side Vergleichs-Tabelle
  - `ComparePlayerCard.tsx` — Einzelne Spieler-Spalte mit Gold-Highlight für Höchstwerte
- **Transferliste/Scouting/Angebote:** Unverändert (Tabs umbenannt: Club Sale → Scouting, Watchlist entfällt)
- **Home-Page:** "Zum Markt" → "Manager Office", Schnellzugriff "Handeln" → "Manager"

### Phase 3: Missions-System
- **3 SQL-Migrationen (53-55):**
  - Migration 53: `mission_definitions` + `user_missions` Tabellen + RLS + Indexes
  - Migration 54: `assign_user_missions` (idempotent, 3 daily + 2 weekly), `claim_mission_reward` (atomic wallet credit), `update_mission_progress` (increment + auto-complete)
  - Migration 55: 8 Daily + 6 Weekly Mission-Definitionen (Seed)
- **Types:** `MissionType`, `MissionStatus`, `DbMissionDefinition`, `DbUserMission`, `UserMissionWithDef`
- **Service:** `src/lib/services/missions.ts` — getUserMissions (1min), claimMissionReward, trackMissionProgress, triggerMissionProgress
- **Activity:** `mission_reward` TX-Type in activityHelpers (Icon: Target, Farbe: Gold)
- **Integration (8 Services):** Fire-and-forget `triggerMissionProgress` nach: buyFromMarket, placeSellOrder, buyFromOrder, buyFromIpo, createPost, createResearchPost, unlockResearch, castVote, castCommunityPollVote, followUser, submitLineup
- **Login-Tracking:** `daily_login` Mission auf Home-Page (fire-and-forget)
- **MissionBanner:** `src/components/missions/MissionBanner.tsx` — Home-Page zwischen Stats + IPO Banner. Collapsed/Expanded. Progress-Bars. Claim-Button (Gold pill). Daily + Weekly Sections.

### Betroffene Dateien (~25)
- Neue: 11 (manager/) + 2 (missions/ + missions service) = 13
- Modifiziert: WalletProvider, TopBar, SideNav, Home page, market/page.tsx, market/layout.tsx, nav.ts, PlayerContent.tsx, FantasyContent.tsx, profile/page.tsx, types/index.ts, activityHelpers.ts, trading.ts, ipo.ts, posts.ts, research.ts, votes.ts, communityPolls.ts, social.ts, lineups.ts

## Session 12.02.2026 (24) – Optimierungen 4–11

### Block A: Architecture (Items 5, 6, 7)
- **Community Page splitten:** ~1317 → ~350 Zeilen. 7 neue Tab-Components in `src/components/community/` (PostCard, FollowBtn, CreatePostModal, CommunityFeedTab, CommunityResearchTab, CommunityVotesTab, CommunityLeaderboardTab)
- **Profile Page splitten:** ~1119 → ~350 Zeilen. 4 neue Tab-Components in `src/components/profile/` (ProfileOverviewTab, ProfilePortfolioTab, ProfileResearchTab, ProfileActivityTab)
- **Activity-Helpers extrahiert:** `src/lib/activityHelpers.ts` — shared getActivityIcon/getActivityColor/getActivityLabel/getRelativeTime (Home + Profile)
- **Promise.allSettled:** 6 Pages migriert (Home, Community, Profile, Market, Player, Club, Fantasy). `val()` helper in `src/lib/settledHelpers.ts`. Partielles Error-Rendering: kritische Daten → ErrorState, sekundäre → graceful degradation
- **Lazy-Loading EventDetailModal:** `next/dynamic` mit `ssr: false` + loading skeleton (1387 Zeilen nur bei Bedarf geladen)

### Block B: Pagination (Item 4)
- **LoadMoreButton:** `src/components/ui/LoadMoreButton.tsx` — "Mehr laden" / Spinner / "Alle geladen"
- **wallet.ts:** `getTransactions()` + `offset` Param mit `.range()`
- **ProfileActivityTab:** Pagination mit LoadMoreButton (20er-Pages)

### Block C: Features (Items 9, 10)
- **Notification-System:**
  - SQL Migration 52: `notifications` Tabelle + RLS + Partial Index (unread)
  - Types: `NotificationType`, `DbNotification` in `types/index.ts`
  - Service: `src/lib/services/notifications.ts` (getUnreadCount, getNotifications, markAsRead, markAllAsRead, createNotification)
  - Component: `src/components/layout/NotificationDropdown.tsx` (Dropdown mit Type-Icons, Unread-Dot, "Alle gelesen")
  - Cache: `invalidateNotifications(userId)` in `cache.ts`
  - Triggers: research.ts (research_unlock), social.ts (follow), scoring.ts (fantasy_reward top 3)
  - TopBar: echte unreadCount (60s Polling), Badge hidden bei 0, Dropdown on click
- **Globale Suche:**
  - Service: `src/lib/services/search.ts` — 3 parallele Queries (players, research_posts, profiles)
  - Component: `src/components/layout/SearchDropdown.tsx` (300ms Debounce, kategorisierte Ergebnisse, ESC/Outside-Click)
  - TopBar: Desktop Search-Input mit Typeahead, Mobile Search-Overlay (expandiert Full-Width)

### Block D: Polish (Items 8, 11)
- **SEO + Open Graph:**
  - Root Layout: `title.template` ('%s | BeScout'), OpenGraph (de_DE, website)
  - 5 Route Layouts mit statischer Metadata (Community, Marktplatz, Club, Fantasy, Profil)
  - Player Page: Server/Client Split — `PlayerContent.tsx` (Client) + `page.tsx` (Server mit `generateMetadata()`)
- **Accessibility:**
  - TabBar Component: `role="tablist"`, `aria-selected`, `aria-controls` — `src/components/ui/TabBar.tsx`
  - Modal: `role="dialog"`, `aria-modal`, `aria-labelledby`, ESC-Key, Focus-Trap, Backdrop-Click, Close `aria-label`
  - Button: Focus-Ring `focus-visible:ring-2 focus-visible:ring-[#FFD700]/50`
  - TopBar ARIA-Labels: Bell ("Benachrichtigungen"), Search ("Suche"), Feedback ("Feedback senden"), Mobile Search Close ("Suche schließen")

### DB Schema (1 Migration: 52)
- **Migration 52:** `create_notifications_table` — notifications Tabelle, RLS, Partial Index (unread)

### Betroffene Dateien (~35 Dateien)
- **Neue Dateien (25):** 7 Community-Tabs, 4 Profile-Tabs, activityHelpers.ts, settledHelpers.ts, LoadMoreButton.tsx, TabBar.tsx, notifications.ts, search.ts, NotificationDropdown.tsx, SearchDropdown.tsx, 5 Route-Layouts, PlayerContent.tsx
- **Modifizierte Dateien (~12):** ui/index.tsx, TopBar.tsx, page.tsx (Home), community/page.tsx, profile/page.tsx, market/page.tsx, player/[id]/page.tsx, club/page.tsx, FantasyContent.tsx, wallet.ts, scoring.ts, research.ts, social.ts, cache.ts, types/index.ts, layout.tsx

## Session 12.02.2026 (23) – Security Hardening

### DB Schema (4 Migrationen: 48-51)
- **Migration 48:** `fix_function_search_path` — 30 public Functions mit `SET search_path = public`
- **Migration 49:** `fix_rls_auth_uid_initplan` — 39 RLS Policies: `auth.uid()` → `(select auth.uid())` (Performance)
- **Migration 50:** `add_missing_fk_indexes` — 18 Indexes auf unindexierten Foreign Keys
- **Migration 51:** `merge_research_unlocks_select_policies` — 2 SELECT Policies → 1 merged (OR-Bedingung)

### Supabase Security Advisor: Ergebnis
- **Vorher:** 24 search_path Warnings + 39 auth.uid() Warnings + 18 FK-Index Warnings + 4 Multiple Policy Warnings
- **Nachher:** 0 Security Warnings, 0 Performance Warnings (nur INFO: unused indexes — erwartet bei Pilot-Scale)
- **Offen:** Leaked Password Protection (Dashboard-Toggle, kein SQL)

### Betroffene Dateien
- Nur SQL-Migrationen (kein Frontend-Code geändert)

## Session 12.02.2026 (22) – Projekt-Audit #2

### 5-Agent-Parallel-Audit
- Services + Cache Layer
- Types + Shared Components
- Alle Pages (Business Logic)
- Business Logic (Trading, Scoring, Wallet, Research, Polls)
- DB Schema vs TypeScript Types Alignment

### Kritische Fixes
- **ResearchCard Preis-Bug (CRITICAL):** `formatBsd(centsToBsd(price))` doppelt /100 → Preise 100x zu klein. Fix: `fmtBSD(centsToBsd(price))` in ResearchCard.tsx
- **withTimeout + ErrorState (CRITICAL):** Community, Profile, Fantasy fehlten Timeout-Schutz. Profile: `withTimeout(Promise.all(...), 10000)` + `dataError`/`retryCount` State + ErrorState UI. Fantasy: `withTimeout` hinzugefügt.
- **Math.min Rank-Bug (CRITICAL):** `Math.min(...fantasyResults.map(r => r.rank))` konnte 0 liefern (unscored). Fix: `.filter(r => r.rank > 0)` vor `.map()`

### Cache-Invalidation (6 Lücken geschlossen)
- `scoring.ts`: +`invalidate('fantasyHistory:')`, +`invalidate('wallet:')`, +`invalidate('transactions:')` nach scoreEvent/resetEvent
- `ipo.ts`: +`invalidateTradeData('', '')` nach createIpo/updateIpoStatus (cleared ipos: Cache)
- `lineups.ts`: +`invalidate('fantasyHistory:${userId}')` nach submitLineup/removeLineup
- `social.ts`: +`invalidate('userStats:${followingId}')` nach followUser/unfollowUser

### Deutsche Labels (12 Fixes)
- Home: Free→Gratis, Prize Pool→Preisgeld, Buy-in→Eintritt
- Fantasy: Free→Gratis, Prize Pool→Preisgeld (CreateEventModal)
- Market: Seller→Verkäufer (2x)
- Club: Presented by→Präsentiert von
- Player: Treasury Balance→Treasury Guthaben
- Profile: Free→Kostenlos (Plan-Label)

### alert→toast (7 Fixes)
- Fantasy: 6x `alert()` → `addToast()` (3 error, 3 success)
- Community: Vote-Error catch → `addToast('Fehler beim Abstimmen', 'error')`

### Audit-Ergebnisse (kein Handlungsbedarf für Pilot)
- Trade Fee Split: Korrekt implementiert im deployed RPC (3.5% Platform + 1.5% PBT). Audit-Agent las veraltete docs/*.sql
- DB Schema vs Types: 28 Tabellen geprüft, 13 nullable Mismatches (alle mit DEFAULT, low-risk)
- RLS: 24 RPCs mit mutable search_path (Security Hardening für Phase 7)
- Performance: 30+ RLS auth.uid() → (select auth.uid()) (für Scale)
- Dead Exports: Behalten (Admin-Funktionen für Phase 6)

### Betroffene Dateien (12 Dateien)
- `src/components/community/ResearchCard.tsx` — formatBsd→fmtBSD
- `src/app/(app)/community/page.tsx` — Vote-Error toast
- `src/app/(app)/profile/page.tsx` — withTimeout + ErrorState + dataError/retryCount + Math.min fix + Kostenlos label
- `src/app/(app)/fantasy/FantasyContent.tsx` — withTimeout + alert→toast (6x) + Gratis label
- `src/components/fantasy/CreateEventModal.tsx` — Preisgeld label
- `src/app/(app)/page.tsx` — Gratis + Preisgeld + Eintritt labels
- `src/app/(app)/market/page.tsx` — Verkäufer label (2x)
- `src/app/(app)/club/page.tsx` — Präsentiert von label
- `src/app/(app)/player/[id]/page.tsx` — Treasury Guthaben label
- `src/lib/services/scoring.ts` — +3 invalidate() calls
- `src/lib/services/ipo.ts` — +invalidateTradeData nach createIpo/updateIpoStatus
- `src/lib/services/lineups.ts` — +invalidate fantasyHistory
- `src/lib/services/social.ts` — +invalidate userStats

## Session 12.02.2026 (21) – Profil-Erweiterungen (Phase 5.7)

### Rein Frontend (keine DB/Service-Migration)

### Types
- `UserTradeWithPlayer`: Trade + Player-Name/Position (für Profil-Anzeige)
- `UserFantasyResult`: Event-Name, GW, Score, Rank, Reward (für Profil-Anzeige)

### Service Layer
- `getUserTrades(userId, limit)` in `trading.ts`: `.or()` für buyer/seller, Joins `players` für Namen, cached 2min
- `getUserFantasyHistory(userId, limit)` in `lineups.ts`: scored Lineups mit Event-Join, cached 2min

### Cache
- `invalidateTradeData()` erweitert: invalidiert auch `userTrades:${userId}` Prefix

### Profile Page
- **Übersicht — Letzte Trades Card:** Buy/Sell-Icon (gold/grün) + PositionBadge + Spielername + Kauf/Verkauf-Chip + Menge + Zeitstempel + Gesamtbetrag + Stückpreis. Klick → `/player/[id]`.
- **Übersicht — Fantasy-Ergebnisse Card:** 4-spaltige Summary (Events, Ø Score, Bester Rang, Gewonnen) + Event-Liste mit Trophy-Icon (gold/silber/bronze nach Rang) + Score-Farben (>=100 Gold, 70-99 Weiß, <70 Rot) + Reward.
- **Research — Verifizierungs-Badge:** Gold "Verifizierter Scout" (Shield) bei >=5 Calls + >=60% Hit-Rate. Grauer Progress-Badge bei <5 Calls oder <60% Hit-Rate.

### Betroffene Dateien (5 Dateien)
- `src/types/index.ts` — +UserTradeWithPlayer, +UserFantasyResult
- `src/lib/services/trading.ts` — +getUserTrades()
- `src/lib/services/lineups.ts` — +getUserFantasyHistory()
- `src/lib/cache.ts` — userTrades Invalidation
- `src/app/(app)/profile/page.tsx` — Trades Card, Fantasy Card, Verifizierungs-Badge

## Session 12.02.2026 (20) – Research-Kategorien (Phase 5.1)

### DB Schema (1 Migration)
- `add_research_category`: `category TEXT DEFAULT 'Spieler-Analyse'` auf `research_posts`. CHECK Constraint: `('Spieler-Analyse', 'Transfer-Empfehlung', 'Taktik', 'Saisonvorschau', 'Scouting-Report')`. Alle bestehenden Posts erhalten Default 'Spieler-Analyse'.

### Types
- `ResearchCategory` = 'Spieler-Analyse' | 'Transfer-Empfehlung' | 'Taktik' | 'Saisonvorschau' | 'Scouting-Report'
- `DbResearchPost` +category: string

### Service Layer
- `createResearchPost()` erweitert: neuer `category` Parameter
- `getResearchPosts()` erweitert: neuer `clubName` Filter-Parameter + erweiterter Cache-Key

### Components
- **ResearchCard:** `categoryColor` Map (sky/purple/amber/emerald/rose). Farbiges Category-Badge als erstes Badge-Element.
- **CreateResearchModal:** `CATEGORIES` Konstante, `category` State + pill selector UI nach Titel, `category` im onSubmit-Payload + Reset.

### Pages
- **Community:** `RESEARCH_CATEGORIES` Konstante, `researchCategoryFilter` State, Category-Filter in `sortedResearchPosts` useMemo, Filter-Pills Row, kontextsensitive Empty-States, `handleCreateResearch` +category Parameter.
- **Club:** Research-Vorschau im Community-Tab (FileText + Header + top 5 ResearchCards + "Alle anzeigen" Link). `clubResearch` State + `getResearchPosts({ clubName: 'Sakaryaspor' })` im Daten-Laden. `handleResearchUnlock` + `handleResearchRate` Handler.

### Betroffene Dateien (6 Dateien + 1 SQL-Migration)
- 1 SQL-Migration via Supabase MCP (Migration 47)
- `src/types/index.ts` — +ResearchCategory, +category zu DbResearchPost
- `src/lib/services/research.ts` — createResearchPost +category, getResearchPosts +clubName
- `src/components/community/ResearchCard.tsx` — categoryColor Map, Category badge
- `src/components/community/CreateResearchModal.tsx` — CATEGORIES, category state/pills/payload/reset
- `src/app/(app)/community/page.tsx` — RESEARCH_CATEGORIES, filter state/logic/pills, handler update
- `src/app/(app)/club/page.tsx` — Research imports, state, data loading, handlers, UI section

## Session 12.02.2026 (19) – Research Sortierung + Filter (Phase 5.1)

### Rein Frontend (keine DB/Service-Änderung)
- Research Hub: 3 Sort-Optionen (Neueste, Top bewertet, Meistverkauft) als goldene Pill-Buttons
- Research Hub: 3 Call-Filter (Bullish, Bearish, Neutral) als farbige Toggle-Pills (grün/rot/grau)
- `sortedResearchPosts` useMemo: Call-Filter + Sortierung (avg_rating tie-break by ratings_count, unlock_count)
- Count zeigt gefilterte Anzahl, kontextsensitive Empty-States
- Sort + Filter kombinierbar (z.B. nur Bullish, sortiert nach Meistverkauft)

### Betroffene Dateien (1 Datei)
- `src/app/(app)/community/page.tsx` — ResearchSort Type, RESEARCH_SORTS/RESEARCH_CALLS Konstanten, researchSort/researchCallFilter State, sortedResearchPosts useMemo, Research Tab UI

## Session 12.02.2026 (18) – Content-Kategorien für Posts (Phase 4.3)

### DB Schema (1 Migration)
- `add_post_category`: `category TEXT DEFAULT 'Meinung'` auf `posts`. CHECK Constraint: `('Analyse', 'Prediction', 'Meinung', 'News')`. Alle bestehenden Posts erhalten Default 'Meinung'.

### Types
- `PostCategory` = 'Analyse' | 'Prediction' | 'Meinung' | 'News'
- `DbPost` +category: string

### Service Layer
- `createPost()` erweitert: neuer `category` Parameter (Default 'Meinung')
- `createReply()` unverändert (Replies bekommen DB-Default)

### Pages
- **Community:**
  - `POST_CATEGORIES` Konstanten mit farbigen Badges (sky=Analyse, purple=Prediction, amber=Meinung, emerald=News)
  - CreatePostModal: Kategorie-Pills (4 Buttons) vor Spieler-Dropdown
  - PostCard: Farbiges Kategorie-Badge unter Author-Row (nur Top-Level Posts, nicht Replies)
  - Feed: Kategorie-Filter-Pills unter Search+Sort (toggle on/off, filtert in `filteredPosts` useMemo)

### Betroffene Dateien (4 Dateien + 1 SQL-Migration)
- 1 SQL-Migration via Supabase MCP (Migration 46)
- `src/types/index.ts` — +PostCategory, +category zu DbPost
- `src/lib/services/posts.ts` — createPost() +category Parameter
- `src/app/(app)/community/page.tsx` — POST_CATEGORIES, CreatePostModal Kategorie-Pills, PostCard Badge, Feed Filter-Pills

## Session 12.02.2026 (17) – Kommentare / Replies (Phase 4.3)

### DB Schema (1 Migration)
- `add_post_replies`: `parent_id UUID` Spalte auf `posts` (self-referencing FK, ON DELETE CASCADE). Partial Index `idx_posts_parent_id`. Trigger `trg_posts_replies_count` pflegt `replies_count` automatisch bei INSERT/DELETE.

### Types
- `DbPost` erweitert: `parent_id: string | null` (null = Top-Level Post, UUID = Reply)

### Service Layer
- `src/lib/services/posts.ts` erweitert:
  - `getPosts()`: filtert Replies aus (`parent_id IS NULL`)
  - `getReplies(parentId)`: lädt Replies mit Author-Profilen (2min Cache)
  - `createReply(userId, parentId, content)`: erstellt Reply + invalidiert Cache
  - `deletePost()`: invalidiert auch `replies:` Cache

### Components
- `src/components/community/PostReplies.tsx` — **NEU**: Expand/Collapse Replies unter Posts. Inline Reply-Form (Input + Send). Voting auf Replies (Up/Down). Delete eigener Replies. Author-Zeile + Text + Time + Actions.

### Pages
- **Community:** PostCard erhält `userId` Prop + `showReplies`/`repliesCount` State. MessageSquare-Button togglet Replies (gold wenn aktiv). `PostReplies` wird inline unter Actions gemountet. Optimistic `repliesCount` Update.

### Betroffene Dateien (4 Dateien + 1 SQL-Migration)
- 1 SQL-Migration via Supabase MCP (Migration 45)
- `src/types/index.ts` — `parent_id` zu `DbPost`
- `src/lib/services/posts.ts` — `getReplies`, `createReply`, `getPosts` Filter, `deletePost` Cache
- `src/components/community/PostReplies.tsx` — **NEU**
- `src/app/(app)/community/page.tsx` — PostCard Reply-Toggle + PostReplies mounting

## Session 12.02.2026 (16) – Bezahlte Polls (Phase 5.6)

### DB Schema (2 Migrationen)
- `create_community_poll_tables`: `community_polls` (question, options JSONB, cost_bsd, creator_earned, status, ends_at) + `community_poll_votes` (UNIQUE poll_id+user_id, amount_paid, creator_share, platform_share). RLS auf beiden Tabellen. Indices auf status, created_by, poll_id, user_id.
- `create_cast_community_poll_vote_rpc`: SECURITY DEFINER RPC — atomic 70/30 split (Creator 70%, Plattform 30%). Guards: active check, no self-vote, no double-vote, balance check. Wallet deduct/credit mit FOR UPDATE lock. TX logs (poll_vote_cost, poll_earning). Auto-ends expired polls.

### Types
- `CommunityPollStatus` = 'active' | 'ended' | 'cancelled'
- `DbCommunityPoll`, `DbCommunityPollVote`, `CommunityPollWithCreator` in `types/index.ts`

### Service Layer
- `src/lib/services/communityPolls.ts` — **NEU**: getCommunityPolls (2min cache, joins profiles), getUserPollVotedIds (2min cache), castCommunityPollVote (RPC + invalidation), createCommunityPoll (insert + invalidate), cancelCommunityPoll (only if 0 votes)
- `src/lib/cache.ts` — +`invalidatePollData(userId)` (communityPolls: + pollVotedIds: + wallet: + transactions:)

### Components
- `src/components/community/CommunityPollCard.tsx` — **NEU**: Amber-themed card (vs purple for Club votes). Creator line, options with progress bars after vote, cost display, "Deine Umfrage"/"Abgestimmt" chips, cancel button for own polls with 0 votes.
- `src/components/community/CreateCommunityPollModal.tsx` — **NEU**: Question (5-200 chars), description (optional, 0-500), 2-4 dynamic options (1-100 chars each), price (1-10K BSD) with 70/30 hint, duration pills (1d/3d/7d).

### Pages
- **Community:** Votes-Tab redesigned: Header with "Umfrage erstellen" button, Community Polls section, divider, Club Votes section, empty state. Poll data loaded in parallel (getCommunityPolls + getUserPollVotedIds). Handlers: handleCastPollVote, handleCreatePoll, handleCancelPoll with toasts.
- **Profile:** Activity helpers extended: `poll_vote_cost` (Vote icon, amber), `poll_earning` (Vote icon, green), labels "Umfrage-Teilnahme"/"Umfrage-Einnahme".

### Betroffene Dateien (7 Dateien + 2 SQL-Migrationen)
- 2 SQL-Migrationen via Supabase MCP
- `src/types/index.ts` — +CommunityPollStatus, +DbCommunityPoll, +DbCommunityPollVote, +CommunityPollWithCreator
- `src/lib/services/communityPolls.ts` — **NEU**
- `src/lib/cache.ts` — +invalidatePollData()
- `src/components/community/CommunityPollCard.tsx` — **NEU**
- `src/components/community/CreateCommunityPollModal.tsx` — **NEU**
- `src/app/(app)/community/page.tsx` — Votes-Tab mit Community Polls + Club Votes
- `src/app/(app)/profile/page.tsx` — Activity: poll_vote_cost + poll_earning

## Session 12.02.2026 (15) – PBT + Fee Split (Phase 5.5)

### DB Schema (3 Migrationen)
- `create_pbt_tables`: `pbt_treasury` (1 Row/Spieler, balance + Inflow-Tracking), `pbt_transactions` (Audit Log), `fee_config` (pro Club, NULL=Global Default). RLS auf allen 3 Tabellen. Fee-Spalten auf `trades` (pbt_fee, club_fee) und `ipo_purchases` (platform_fee, pbt_fee, club_fee). Global Default geseeded, 25 PBT-Rows geseeded.
- `create_credit_pbt_function`: `credit_pbt()` SECURITY DEFINER Helper — UPSERT auf Treasury + Audit-Log-Insert. Wiederverwendbar in allen RPCs.
- `update_trading_rpcs_with_fees`: Alle 3 Trading RPCs (`buy_from_order`, `buy_player_dpc`, `buy_from_ipo`) mit Fee-Logik:
  - Loads `fee_config` per Player-Club (Override) oder Global Default
  - Trade Fee (5%): Seller zahlt → bekommt Netto (v_total_cost - v_total_fee)
  - IPO Fee Split: 85% Club, 10% BeScout, 5% PBT
  - `club_fee` = Remainder (fängt Rundungsdifferenzen auf)
  - `PERFORM credit_pbt(...)` nach jedem Trade/IPO
  - Trade-Log + IPO-Purchase-Log mit Fee-Breakdown
  - Return enthält `fees` Objekt

### Fee-Struktur (Basis Points, 10000 = 100%)
- **Trade:** 500 bps (5%) → Platform 350 (3.5%), PBT 150 (1.5%), Club 0 (0%)
- **IPO:** Club 8500 (85%), Platform 1000 (10%), PBT 500 (5%)
- Admin-konfigurierbar pro Club via `fee_config` Tabelle

### Types
- `DbPbtTreasury`, `DbPbtTransaction`, `DbFeeConfig` in `types/index.ts`
- `DbTrade` +pbt_fee, +club_fee
- `DbIpoPurchase` +platform_fee, +pbt_fee, +club_fee

### Service Layer
- `src/lib/services/pbt.ts` — **NEU**: getPbtForPlayer (5min cache), getPbtTransactions (2min), getFeeConfig (5min), getAllFeeConfigs, invalidatePbtData
- `src/lib/cache.ts` — `invalidateTradeData()` erweitert um PBT-Invalidation

### Player Detail
- PBT-Daten parallel geladen (getPbtForPlayer in Promise.all)
- `playerWithOwnership` useMemo erweitert: pbt.balance, pbt.sources (Cents→BSD)
- PBTWidget zeigt jetzt echte DB-Daten (Balance, Sources, Share-Berechnung)

### Betroffene Dateien (5 Dateien + 3 SQL-Migrationen)
- 3 SQL-Migrationen via Supabase MCP
- `src/types/index.ts` — +3 Types, DbTrade/DbIpoPurchase erweitert
- `src/lib/services/pbt.ts` — **NEU**
- `src/lib/cache.ts` — PBT-Invalidation in invalidateTradeData
- `src/app/(app)/player/[id]/page.tsx` — PBT-Daten laden + an Widget übergeben

## Session 12.02.2026 (14) – Vollständiger Projekt-Audit + Dead Code Cleanup

### 5-Agent-Audit (parallel)
- Services Layer: 13 Service-Dateien, Cache-Patterns, Error-Handling
- Types & Components: Dead Types/Components, Duplicates
- Pages: State-Management, Dead State, Error-Handling
- Providers & Utilities: Memory Leaks, Race Conditions, Config
- DB Schema vs Code: Table-Type-Mapping, RPC-Usage, Orphaned RPCs

### Kritische Bugs gefixt (2)
- `research.ts:204` — Cache-Key nutzte `researchIds.length` statt IDs → falsche Cache-Daten. Fix: sortierte IDs als Key.
- `club.ts:toggleFollowClub()` — Fehlende Cache-Invalidation nach Mutation. Fix: `invalidate('profile:')` + `invalidate('clubDashboard:')`.

### Type-Mismatches gefixt (2)
- `DbTrade.seller_id`: `string` → `string | null` (DB erlaubt null bei Pool/IPO-Trades)
- `DbPlayer.status`: non-nullable → `| null` (DB erlaubt null)
- `dbToPlayer()`: Hardcoded `'fit'` → nutzt echten DB-Wert mit Fallback

### Medium Issues gefixt (2)
- Profile `isSelf`: `useState(true)` → `const isSelf = true` (nie geändert)
- SideNav Settings-Button: Dead button → Link zu `/profile` mit deutschem Label

### Dead Code entfernt
- **10 Service-Exports**: getBalance, getPortfolioValue, formatBsdDecimal, getEventById, getUserOrders, searchPlayers, getPlayersByPosition, getMarketMovers, getIpoHistory, getUserAllIpoPurchases, getAllIpos
- **6 Dead Types**: Offer, OfferStatus, OfferDirection, UserRole, UserPlan, UserProfile
- **4 Dead Functions**: getPlayerName, getFloorPrice, getPerfTone, fmtPct (types/index.ts)
- **2 Dead Components**: Pill, SectionTitle (ui/index.tsx)
- **2 Dead Utilities**: slugify(), clampInt() (utils.ts)
- **1 Dead File**: `src/lib/mock-data.ts` (gesamte Datei gelöscht)
- **1 Duplicate**: posTintColors in player/index.tsx → importiert aus PlayerRow.tsx
- **2 Unused Imports**: Sparkles + fmtBSD in SideNav.tsx

### Hinzugefügt
- `DbFeedback` Type für feedback-Tabelle (fehlte)

### Betroffene Dateien (14 Dateien)
- `src/lib/services/research.ts` — Cache-Key Fix
- `src/lib/services/club.ts` — Cache-Invalidation
- `src/lib/services/players.ts` — Dead exports entfernt, PlayerStatus import, dbToPlayer fix
- `src/lib/services/wallet.ts` — Dead exports entfernt
- `src/lib/services/events.ts` — Dead export entfernt
- `src/lib/services/ipo.ts` — Dead exports entfernt
- `src/lib/services/trading.ts` — Dead export entfernt
- `src/types/index.ts` — Dead types entfernt, Type-Mismatches gefixt, DbFeedback hinzugefügt
- `src/components/ui/index.tsx` — Pill + SectionTitle entfernt
- `src/components/player/index.tsx` — Duplicate posTintColors → import
- `src/components/layout/SideNav.tsx` — Settings-Button → Link, unused imports entfernt
- `src/app/(app)/profile/page.tsx` — isSelf: useState → const
- `src/lib/utils.ts` — slugify + clampInt entfernt
- `src/lib/mock-data.ts` — **Datei gelöscht**

## Session 12.02.2026 (13) – Activity Tracking Audit + Fixes

### Audit-Ergebnis (6 Bugs gefunden)
- **Bug 1-3:** Profile Activity UI fehlte Handler für `ipo_buy`, `fantasy_reward`, `vote_fee` → zeigte raw Type-String
- **Bug 4-5:** `deduct_wallet_balance` + `refund_wallet_balance` RPCs schrieben KEINE Transaction-Logs → Entry Fees/Refunds unsichtbar
- **Bug 6:** `reset_event` RPC erstattete Entry Fees nicht zurück bei Event-Reset

### DB Schema (2 Migrationen)
- `fix_wallet_rpcs_add_transaction_logging`: Beide Wallet-RPCs erweitert um optionale `p_type`, `p_description`, `p_reference_id` Params. Bei `p_type IS NOT NULL` → Transaction-Log geschrieben. Backward-compatible (alte Aufrufe funktionieren weiter).
- `fix_reset_event_refund_entry_fees`: `reset_event` RPC komplett neu geschrieben — refunded Entry Fees an alle Teilnehmer, erstellt `entry_refund` Transactions, löscht alte `entry_fee` Transactions, updated `current_entries`.

### Profile Activity UI
- `getActivityIcon()`: +`ipo_buy`, +`entry_fee`, +`entry_refund`, +`fantasy_reward`, +`vote_fee`, +Legacy `buy`/`sell`
- `getActivityColor()`: Gleiches Mapping (Gold=Kauf, Grün=Verkauf/Reward, Lila=Event, Amber=Vote, Sky=Deposit)
- `getActivityLabel()`: Gleiches Mapping (deutsche Labels)

### Service Layer
- `wallet.ts`: `deductEntryFee()` + `refundEntryFee()` übergeben jetzt `p_type`, `p_description`, `p_reference_id` an RPCs
- `FantasyContent.tsx`: `handleJoinEvent` + `handleLeaveEvent` übergeben `event.name` + `event.id`

### 10-User-Simulation (Verifikation)
- 10 Test-User erstellt (auth.users + wallets + profiles)
- Alle 11 TX-Types durchgetestet: `ipo_buy`, `trade_buy`, `trade_sell`, `vote_fee`, `entry_fee`, `entry_refund`, `research_unlock`, `research_earning`, `fantasy_reward`, `deposit`, `reward`
- **Ergebnis: 0 Wallet-Diskrepanzen bei allen 10 Usern**
- Alle Test-Daten aufgeräumt

### Betroffene Dateien (5 Dateien)
- 2 SQL-Migrationen via Supabase MCP
- `src/app/(app)/profile/page.tsx` — Activity UI Handler erweitert
- `src/lib/services/wallet.ts` — deductEntryFee/refundEntryFee mit TX-Logging
- `src/app/(app)/fantasy/FantasyContent.tsx` — Event-Name/ID an wallet calls übergeben

## Session 12.02.2026 (12) – Research Track Record (Phase 5: Content Economy)

### DB Schema (2 Migrationen)
- `add_track_record_columns`: `price_at_creation` (BIGINT), `price_at_resolution` (BIGINT), `outcome` (TEXT CHECK correct/incorrect), `price_change_pct` (NUMERIC 7,2), `resolved_at` (TIMESTAMPTZ) auf `research_posts`
- `add_resolve_expired_research_rpc`: SECURITY DEFINER RPC — findet abgelaufene Calls (24h/7d), holt aktuellen `last_price`, berechnet Preisänderung, setzt outcome (Bullish: >0% = correct, Bearish: <0% = correct, Neutral: ±3% = correct)

### Types
- `ResearchOutcome` = 'correct' | 'incorrect'
- `DbResearchPost` +price_at_creation, +price_at_resolution, +outcome, +price_change_pct, +resolved_at
- `AuthorTrackRecord` = { totalCalls, correctCalls, incorrectCalls, pendingCalls, hitRate }

### Service Layer
- `createResearchPost` erweitert: holt `last_price` als `price_at_creation` Snapshot
- `resolveExpiredResearch()` → RPC call + cache invalidation bei resolved > 0
- `getAuthorTrackRecord(userId)` → cached 2min, zählt correct/incorrect/pending
- `invalidateResearchData()` erweitert: invalidiert auch `trackRecord:` Cache-Prefix

### Components
- `ResearchCard.tsx`: Outcome-Badge neben Horizon-Chip
  - Korrekt: grüner Badge mit CheckCircle + Prozentänderung
  - Falsch: roter Badge mit XCircle + Prozentänderung
  - Ausstehend/nicht auswertbar: kein Badge

### Pages
- **Community:** `resolveExpiredResearch()` fire-and-forget vor Daten-Laden
- **Player Detail:** `resolveExpiredResearch()` fire-and-forget vor Daten-Laden
- **Profile:** Research-Tab komplett neu:
  - Track-Record-Summary-Card: Hit-Rate (%), Progress-Bar, Correct/Incorrect/Pending Counts
  - Eigene Research-Posts als kompakte Liste mit Call-Badge, Outcome-Badge, Preis, Datum
  - `resolveExpiredResearch()` fire-and-forget + `getAuthorTrackRecord()` + `getResearchPosts()` parallel geladen

### Betroffene Dateien (8 Dateien)
- 2 SQL-Migrationen via Supabase MCP
- `src/types/index.ts` — +ResearchOutcome, +AuthorTrackRecord, DbResearchPost erweitert
- `src/lib/services/research.ts` — +resolveExpiredResearch, +getAuthorTrackRecord, createResearchPost erweitert
- `src/lib/cache.ts` — invalidateResearchData + trackRecord: Prefix
- `src/components/community/ResearchCard.tsx` — Outcome-Badge
- `src/app/(app)/community/page.tsx` — auto-resolve
- `src/app/(app)/player/[id]/page.tsx` — auto-resolve
- `src/app/(app)/profile/page.tsx` — Research-Tab mit Track Record

## Session 12.02.2026 (11) – Research Bewertungssystem (Phase 5: Content Economy)

### DB Schema (2 Migrationen)
- `research_ratings` Tabelle: UNIQUE(research_id, user_id), rating 1-5 (SMALLINT + CHECK), RLS (SELECT all, INSERT/UPDATE nur via RPC)
- `rate_research` RPC: atomares Upsert-Rating, Guards (Post existiert, kein Self-Rating, nur Unlocker, Range 1-5), Aggregat-Update (avg_rating + ratings_count in research_posts)
- `avg_rating` (NUMERIC 3,2) + `ratings_count` (INTEGER) Spalten in `research_posts`

### Types
- `DbResearchRating` Type in `types/index.ts`
- `DbResearchPost` +ratings_count, +avg_rating
- `ResearchPostWithAuthor` +user_rating (number | null)

### Service Layer
- `rateResearch(userId, researchId, rating)` → RPC call + cache invalidation
- `getUserResearchRatings(userId, researchIds)` → Map<string, number> (cached 2min)
- `getResearchPosts` erweitert: lädt user_rating parallel zu unlock status

### Components
- `ResearchCard.tsx`: Star-Rating Widget im Footer
  - Interaktiv (5 klickbare Sterne, Hover-Effekt, Gold-Fill) für Unlocker die nicht der Autor sind
  - Read-Only (gedimmte Sterne) für alle anderen
  - avg_rating + ratings_count Anzeige bei >=1 Rating

### Pages
- **Community:** `handleRateResearch` Handler + optimistisches State-Update + `ratingId` Loading-State
- **Player Detail:** Inline `onRate` Handler im Research-Tab + `ratingId` State

### Betroffene Dateien (7 Dateien)
- 2 SQL-Migrationen via Supabase MCP
- `src/types/index.ts` — +DbResearchRating, +avg_rating/ratings_count/user_rating
- `src/lib/services/research.ts` — +rateResearch, +getUserResearchRatings, getResearchPosts erweitert
- `src/components/community/ResearchCard.tsx` — Star-Rating Widget
- `src/app/(app)/community/page.tsx` — Rating-Handler + Props
- `src/app/(app)/player/[id]/page.tsx` — Rating-Handler + Props

## Session 12.02.2026 (10) – Premium Posts / Paywall (Phase 5: Content Economy)

### DB Schema (3 Migrationen)
- `research_posts` Tabelle: Titel, Preview (300 Zeichen), Content (50-10K), Call/Horizon, Preis (1-100K BSD), unlock_count, total_earned
- `research_unlocks` Tabelle: UNIQUE(research_id, user_id), amount_paid, author_earned, platform_fee
- `unlock_research` RPC: atomare 80/20 Transaktion (Buyer→Author), FOR UPDATE Locks, Transaction-Logs beidseitig
- RLS auf beiden Tabellen (SELECT all, INSERT/DELETE own, Unlocks nur via RPC)

### Service Layer
- `src/lib/services/research.ts` — getResearchPosts, createResearchPost, deleteResearchPost, unlockResearch, getUserUnlockedIds
- `src/lib/cache.ts` — +`invalidateResearchData(userId)` (research: + researchUnlocks: + wallet: + transactions:)

### Types
- `DbResearchPost`, `DbResearchUnlock`, `ResearchPostWithAuthor` in `types/index.ts`
- Alte Mock `ResearchPost` Type ersetzt

### Components
- `src/components/community/ResearchCard.tsx` — Player-Tag, Call-Badge, Horizon, Author, Preview (immer sichtbar), Blurred Paywall mit Gold-Button, Footer mit Tags + Unlock-Count + Preis
- `src/components/community/CreateResearchModal.tsx` — Titel, Player, Call (Pill), Horizon (Pill), Preis, Preview, Content, Tags

### Pages
- **Community:** Research-Tab: Coming Soon → echte Feed + "Bericht schreiben" Button + ResearchCard-Liste + Unlock-Handler
- **Player Detail:** ResearchPreview (Overview-Tab) + Research-Tab: Mock → echte DB-Daten + Unlock-Handler
- **Profile:** Neue Transaction-Types: `research_unlock` (FileText, Lila) + `research_earning` (FileText, Grün)

### Cleanup
- `MOCK_RESEARCH` aus `src/lib/mock-data.ts` entfernt
- `ResearchPost` Import aus mock-data entfernt

### Betroffene Dateien (10 Dateien)
- 3 SQL-Migrationen via Supabase MCP
- `src/types/index.ts` — DbResearchPost, DbResearchUnlock, ResearchPostWithAuthor
- `src/lib/services/research.ts` — **NEU**
- `src/lib/cache.ts` — +invalidateResearchData()
- `src/components/community/ResearchCard.tsx` — **NEU**
- `src/components/community/CreateResearchModal.tsx` — **NEU**
- `src/app/(app)/community/page.tsx` — Research-Tab live
- `src/app/(app)/player/[id]/page.tsx` — ResearchPreview + Research-Tab live
- `src/app/(app)/profile/page.tsx` — Neue Transaction-Types
- `src/lib/mock-data.ts` — MOCK_RESEARCH entfernt

## Session 12.02.2026 (9) – Mobile Debugging + Vollständiger Docs-Review

### Mobile-Zugriff untersucht
- **Problem:** App lief auf Desktop, aber Mobile (über LAN IP 192.168.x.x:3000) zeigte TopBar + BottomNav + ErrorState ("Daten konnten nicht geladen werden")
- **Ursache:** Temporäres Netzwerk-Timeout — `npm run dev` bindet auf localhost, LAN-Zugriff ist instabil
- **Lösung:** Problem löste sich selbst, Empfehlung: `npx next dev -H 0.0.0.0` für stabilen Mobile-Zugriff
- **Kein Code geändert** — reiner Diagnose-/Dokumentations-Session

### Vollständiger Projekt-Review
- Alle Docs gelesen und verifiziert (TODO, ROADMAP, STATUS, SCALE, ARCHITECTURE, COMPONENTS, CONTEXT_PACK, PILOT-SPRINT, WORKFLOW)
- Gesamtstatus bestätigt: 28 Migrationen deployed, alle 7 Pages auf echte Daten, Reputation & Engagement komplett

## Session 12.02.2026 (8) – Reputation & Engagement System (7 Phasen)

### Phase A: DB Schema (10 Migrationen)
- 7 neue Tabellen: `user_follows`, `user_achievements`, `user_stats`, `club_votes`, `vote_entries`, `posts`, `post_votes`
- RLS auf allen Tabellen (SELECT all, INSERT/UPDATE/DELETE own)
- 5 RPCs: `follow_user`, `unfollow_user`, `vote_post`, `cast_vote`, `refresh_user_stats`
- `refresh_user_stats`: berechnet Trading/Manager/Scout Scores (0-100), re-ranked alle User, updated profiles.level
- `cast_vote`: atomarer Vote mit Wallet-Deduction (FOR UPDATE Lock) + Transaction-Log

### Phase B: Service Layer (4 neue Dateien + Types)
- `src/lib/services/social.ts` — Follows, Stats, Leaderboard, Achievements (18 Checks)
- `src/lib/services/votes.ts` — Club-Voting (CRUD + castVote RPC)
- `src/lib/services/posts.ts` — Community Posts (CRUD + votePost RPC)
- `src/lib/achievements.ts` — 18 Achievement-Definitionen (trading/manager/scout)
- `src/types/index.ts` — +8 Types (DbUserStats, DbClubVote, DbPost, LeaderboardUser, LevelTier etc.) + LEVEL_TIERS + getLevelTier()
- `src/lib/cache.ts` — +`invalidateSocialData(userId)`

### Phase C: Profile — Scores + Achievements + Follower
- "Scoring kommt bald" → Echte ScoreCircles (Trading/Manager/Scout) + Gesamt-Score + Rang
- Level-Tier-Name (Rookie/Profi/Elite...) + Follower/Following Counts
- Achievements-Grid (Emoji + Label + Description)
- "Aktualisieren"-Button → `refreshUserStats()` + `checkAndUnlockAchievements()`

### Phase D: Club — Echte Abstimmungen
- `MOCK_VOTES_PREVIEW` entfernt → echte `DbClubVote` aus DB
- `ClubVoteCard`: Optionen mit Prozent-Balken, "Abgestimmt"-Chip, Kosten, Countdown
- CreateVote-Modal (Admin): Frage, 2-4 Optionen, Kosten, Laufzeit
- Community-Link zum neuen `/community`

### Phase E: Community Page — Komplett neu (Mock → Real)
- ~855 Zeilen (vorher Mock-Platzhalter)
- 5 Tabs: Für dich, Folge ich, Research (live seit Session 10), Abstimmungen, Leaderboard
- Components: FollowBtn, PostCard, CommunityVoteCard, LeaderboardRow, CreatePostModal
- Feed: Posts mit Author-Info, Player-Tag, Upvote/Downvote, Delete
- Sidebar: Top Scouts Mini + Active Votes Mini
- Relevance: Sortierung nach "new" oder "top", Search-Filter

### Phase F: Home — Scout Score + Leaderboard
- "Manager Level" Stat Card → "Scout Score" (total_score/100 + Rang oder Tier)
- Desktop-Sidebar: "Top Scouts" Leaderboard (Top 5, eigener User gold)

### Phase G: Achievement Engine
- `triggerStatsRefresh()` in `trading.ts` — fire-and-forget nach buyFromMarket, placeSellOrder, buyFromOrder
- Dynamic Import von `social.ts` (vermeidet circular deps)
- `invalidateSocialData(userId)` nach allen Social-Writes

### Betroffene Dateien (12 Dateien)
- 10 SQL-Migrationen via Supabase MCP
- `src/types/index.ts` — +8 Types + LEVEL_TIERS + getLevelTier()
- `src/lib/achievements.ts` — **NEU** (18 Achievements)
- `src/lib/services/social.ts` — **NEU** (Follows + Stats + Leaderboard + Achievements)
- `src/lib/services/votes.ts` — **NEU** (Club-Voting)
- `src/lib/services/posts.ts` — **NEU** (Community Posts)
- `src/lib/cache.ts` — +invalidateSocialData()
- `src/lib/services/trading.ts` — +triggerStatsRefresh() nach Trades
- `src/app/(app)/profile/page.tsx` — Scores, Achievements, Follower
- `src/app/(app)/club/page.tsx` — Echte Votes statt Mocks
- `src/app/(app)/community/page.tsx` — Komplett neu (5 Tabs, echte Daten)
- `src/app/(app)/page.tsx` — Scout Score Card + Leaderboard Sidebar

## Session 11.02.2026 (7) – Echte Daten: Home Events, Market Mein Team, Profile Aktivität

### Mock-Daten eliminiert
- **Home Events:** `MOCK_CONTESTS` entfernt → `getEvents()` aus DB
  - `nextEvent` useMemo: filtert registering/late-reg/running, sortiert nach starts_at
  - `displayEvents` useMemo: sortiert nach Priorität (running→registering→scoring→upcoming), excludes ended
  - Neuer `getTimeUntil()` Helper für relative Zeitanzeige
  - Hero-Card + Sidebar-Events zeigen echte DbEvent-Felder (name, format, prize_pool, entry_fee, current_entries, max_entries)
  - Status-Mapping: running→LIVE, registering/late-reg→Offen, scoring→Auswertung
  - Null-safe: max_entries nullable (∞ Fallback, Progress-Bar nur bei Limit)

- **Market "Mein Team":** Leerer Platzhalter → echte Holdings-Liste
  - `mySquadPlayers` useMemo: `players.filter(p => p.dpc.owned > 0)`
  - Pro Spieler: PositionBadge + Name + Club + DPC-Anzahl + Floor Price
  - Link zu `/player/${id}`
  - Leerer Platzhalter bleibt bei 0 owned

- **Profile "Aktivität":** Platzhalter → echte Transaktionen
  - `getTransactions(uid, 50)` parallel zu Holdings geladen
  - Activity-Helpers: `getActivityIcon()`, `getActivityColor()`, `getActivityLabel()`, `getRelativeTime()`
  - Icons: CircleDollarSign (Trades), Trophy (Events), Award (Rewards), Zap (Deposits), Activity (Fallback)
  - Farbcodierung: Gold (Kauf), Grün (Verkauf), Lila (Event), Emerald (Reward), Sky (Deposit)

### Cleanup
- `MOCK_CONTESTS` aus `src/lib/mock-data.ts` entfernt
- `Contest`, `ContestMode`, `ContestStatus` Types aus `src/types/index.ts` entfernt
- `Contest` Import aus mock-data.ts entfernt

### Betroffene Dateien (5 Dateien)
- `src/app/(app)/page.tsx` — MOCK_CONTESTS → getEvents(), Events-Rendering, getTimeUntil()
- `src/app/(app)/market/page.tsx` — "Mein Team" Tab: mySquadPlayers Holdings-Liste
- `src/app/(app)/profile/page.tsx` — "Aktivität" Tab: getTransactions + Transaktionsliste
- `src/lib/mock-data.ts` — MOCK_CONTESTS entfernt
- `src/types/index.ts` — Contest/ContestMode/ContestStatus entfernt

## Session 11.02.2026 (6) – Performance Hardening

### Runde 1: Timeout + Error-Recovery (Laden hängt nie mehr)
- **Root Cause:** Kein Error-Handling in Auth-Chain + kein Timeout auf Supabase-Calls → `loading=true` für immer
- **`cache.ts`:** Neues `withTimeout()` Utility (8s default), intern in `cached()` 10s Timeout
- **`AuthProvider.tsx`:** `.catch()` auf `getSession()` (Netzwerkfehler → loading=false), Profile-Load non-blocking (nicht mehr awaited), `loadProfile()` mit eigenem try/catch + 5s Timeout
- **`supabaseMiddleware.ts`:** try/catch um `getUser()` — Supabase down = Redirect zu Login statt 500 Error
- **`WalletProvider.tsx`:** `finally { loaded.current = true }` (verhindert stuck-state), Balance-Reset auf 0 bei User-Wechsel, 5s Timeout auf Wallet-Fetch
- **`profiles.ts`:** `getProfile()` gecached (2min TTL), Invalidation bei `createProfile()`/`updateProfile()`
- **4 Seiten (Home, Market, Club, Player):** `Promise.all()` in `withTimeout(10s)` → max 10s bis ErrorState mit Retry-Button

### Runde 2: Re-Render-Optimierung + Service-Caching
- **Provider `useMemo`:** Context Values in AuthProvider, WalletProvider, ToastProvider mit `useMemo` stabilisiert — verhindert Kaskaden-Re-Renders durch neue Object-Identity
- **`React.memo`:** `PlayerDisplay` + `PlayerHoldingRow` in `PlayerRow.tsx` — verhindert unnötige Re-Renders in Listen (Market 25+ Items, Home 10+ Items)
- **`TopBar.tsx`:** `React.memo` + `next/image` für Avatar (statt raw `<img>`)
- **`ToastProvider.tsx`:** Toast-Styles + Icons als Module-Level-Konstanten (nicht mehr in jedem `.map()`-Durchlauf neu erstellt)
- **`players.ts`:** `getPlayersByClub()` + `getPlayersByPosition()` gecached (5min TTL) — Club-Seite spart Supabase-Call pro Navigation
- **`next.config.mjs`:** `remotePatterns` für Supabase-Images (ermöglicht `next/image` für externe Avatare)

### Betroffene Dateien (12 Dateien)
- `src/lib/cache.ts` — `withTimeout()` + interner Timeout in `cached()`
- `src/components/providers/AuthProvider.tsx` — `.catch()`, non-blocking Profile, Timeout, `useMemo`
- `src/components/providers/WalletProvider.tsx` — Error-Recovery, Balance-Reset, Timeout, `useMemo`
- `src/components/providers/ToastProvider.tsx` — Module-Level Styles, `useMemo`
- `src/lib/supabaseMiddleware.ts` — try/catch um `getUser()`
- `src/lib/services/profiles.ts` — `getProfile()` gecached + Invalidation
- `src/lib/services/players.ts` — `getPlayersByClub()` + `getPlayersByPosition()` gecached
- `src/components/player/PlayerRow.tsx` — `React.memo` auf PlayerDisplay + PlayerHoldingRow
- `src/components/layout/TopBar.tsx` — `React.memo` + `next/image` Avatar
- `src/app/(app)/page.tsx` — `withTimeout(Promise.all(), 10s)`
- `src/app/(app)/market/page.tsx` — `withTimeout(Promise.all(), 10s)`
- `src/app/(app)/club/page.tsx` — `withTimeout(Promise.all(), 10s)`
- `src/app/(app)/player/[id]/page.tsx` — `withTimeout(Promise.all(), 10s)`
- `next.config.mjs` — `remotePatterns` für Supabase-Images

## Session 11.02.2026 (5) – Projekt-Audit + Code-Quality Fixes

### Vollständiger Projekt-Audit (3 parallele Agents)
- UI-Konsistenz & Deutsche Labels
- TypeScript & Code Quality
- Services & Data Flow

### Kritische Fixes
- **Deutsche Labels:** Profile-Tabs (Overview→Übersicht, Portfolio, Forschung, Aktivitäten, Einstellungen), Wallet (Guthaben/Einzahlen/Abheben), Market-Tabs (Transferliste, Club Sale, Watchlist, Angebote, Mein Team), Navigation (Markt, Fantasy, Profil), Player (IPO kaufen, Handeln)
- **Navigation:** Toter `/admin`-Link entfernt, Labels eingedeutscht
- **IPOStatus Shadowing:** Lokaler `IPOStatus` in market/page.tsx → `LocalIPOStatus` umbenannt (vermied Konflikt mit globalem Type)
- **LineupSlotPlayer.position:** `string` → `Pos` (korrekter Type)
- **Tote Datei:** `page_.tsx` (Backup) gelöscht

### Cache-Invalidation geschlossen
- `trading.ts`: buyFromMarket, placeSellOrder, buyFromOrder, cancelOrder → `invalidateTradeData()` nach jedem Write
- `ipo.ts`: buyFromIpo → `invalidateTradeData()` (optionaler playerId-Param)
- `lineups.ts`: submitLineup, removeLineup → `invalidate('events:')`
- `cache.ts`: Toten `ipo:player:` Key aus `invalidateTradeData()` entfernt

### Atomare Wallet-Operationen
- **SQL-Migration:** `atomic_wallet_operations` deployed via MCP
  - `deduct_wallet_balance` RPC mit `FOR UPDATE` Row-Lock
  - `refund_wallet_balance` RPC mit `FOR UPDATE` Row-Lock
- **wallet.ts:** Read-then-write Pattern ersetzt durch atomare RPCs

### Error UI
- Neues `ErrorState`-Component in `ui/index.tsx` (AlertTriangle + Retry-Button)
- Hinzugefügt zu: Home, Market, Club, Player — Pattern: `dataError` + `retryCount` State

### Code-Quality
- `console.error` entfernt (8 Stellen in 6 Dateien) — nur Error Boundaries behalten
- `user!.id` Non-Null-Assertions eliminiert (5 Dateien) — `const uid = user.id` Pattern nach Null-Guard
- `ADMIN_USER_IDS` Hardcoded-Set entfernt aus club/page.tsx — `isClubAdmin` vereinfacht
- Unused Catch-Params bereinigt (`catch (err)` → `catch`)

### Betroffene Dateien (13 Dateien)
- `src/components/ui/index.tsx` — ErrorState Component
- `src/components/player/index.tsx` — Deutsche Labels
- `src/components/providers/WalletProvider.tsx` — console.error entfernt
- `src/components/fantasy/EventDetailModal.tsx` — console.error entfernt
- `src/lib/nav.ts` — /admin entfernt, Labels deutsch
- `src/lib/cache.ts` — Toter Cache-Key entfernt
- `src/lib/services/trading.ts` — Cache-Invalidation
- `src/lib/services/wallet.ts` — Atomare RPCs
- `src/lib/services/ipo.ts` — Cache-Invalidation
- `src/lib/services/lineups.ts` — Pos Type + Cache-Invalidation
- `src/app/(app)/market/page.tsx` — LocalIPOStatus + ErrorState + Labels
- `src/app/(app)/page.tsx` — ErrorState + user.id Fix
- `src/app/(app)/club/page.tsx` — ErrorState + ADMIN_USER_IDS entfernt
- `src/app/(app)/player/[id]/page.tsx` — ErrorState + user.id Fix
- `src/app/(app)/profile/page.tsx` — Labels + user.id Fix
- `src/app/(app)/fantasy/FantasyContent.tsx` — console.error + user.id Fix

## Session 11.02.2026 (4) – Mobile Optimierung + Sorare-Redesign

### Mobile Responsive (alle Seiten auf 390px getestet)
- **Fantasy Page:** Sorare-inspiriertes Redesign — Section-basiertes Layout ("DEINE AUFSTELLUNGEN", "IM FOKUS", "ALLE EVENTS"), Segment-Pill-Tabs (Dashboard/Events/Verlauf), LeagueSidebar ersetzt durch inline Category Pills
- **GameweekSelector:** Kompakte Auto-Width Cards statt fester 100px, LIVE-Badge
- **EventDetailModal:** Fullscreen-Sheet auf Mobile, kleinere Pitch-Circles, gestackte Score-Banner
- **DashboardTab:** Responsive Pitch-Circles + Stats, kompakte Summary-Bar
- **HistoryTab:** Mobile Cards statt Tabelle (`md:hidden` / `hidden md:table`)
- **Club Page:** Kompakter Hero (h-300px), responsive Sponsor-Banner, scrollbare Tabs mit shortLabel-Pattern, IPO-Verwaltung gestackte Karten (Player→Progress→Buttons)
- **Market Page:** Pill-Tabs mit Icons — Icon-only auf Mobile (<sm), Icon+Label ab sm, `justify-between` für gleichmäßige Verteilung
- **Profile Page:** Responsive Header (Avatar 16→20, Name xl→3xl), scrollbare Tabs (text-xs auf Mobile), Portfolio Mobile Cards statt Tabelle
- **Home Page:** Responsive Card-Paddings, kompakte Prize-Pool-Anzeige

### Betroffene Dateien (9 Dateien)
- `src/app/(app)/fantasy/FantasyContent.tsx` — Sorare-Lobby-Redesign
- `src/components/fantasy/GameweekSelector.tsx` — kompakte Cards
- `src/components/fantasy/EventDetailModal.tsx` — Fullscreen-Sheet + responsive Pitch
- `src/components/fantasy/DashboardTab.tsx` — responsive Pitch + Stats
- `src/components/fantasy/HistoryTab.tsx` — Mobile Cards
- `src/app/(app)/club/page.tsx` — Hero, Tabs, Sponsor, IPO-Admin
- `src/app/(app)/market/page.tsx` — Icon-Pill-Tabs
- `src/app/(app)/profile/page.tsx` — Header, Tabs, Portfolio Cards
- `src/app/(app)/page.tsx` — responsive Paddings

## Session 11.02.2026 (3) – Dashboard Pitch-Visualisierung

### Aufstellung: Flache Liste → Pitch-Visualisierung
- **Vorher:** Dashboard zeigte letzte Aufstellung als flache Kartenreihe mit Score-Balken
- **Nachher:** Grünes Spielfeld (SVG) mit Spieler-Kreisen, Score-Badges, Formation-Label
- Pitch-Design aus EventDetailModal übernommen (gleiche SVG-Markierungen, Spieler-Circles, Score-Farben)
- Score-Badges: Gold (>=100), Weiß (70-99), Rot (<70) — konsistent mit EventDetailModal
- Seitliche LED-Bandenwerbung (Sponsor-Flächen) links/rechts vom Pitch
- Summary-Bar: Gesamt-Score + Platz + Reward

### Multi-Event Support
- **Vorher:** Nur letztes scored Event geladen (`lastLineupPlayers: LineupSlotPlayer[]`)
- **Nachher:** Alle scored Events parallel geladen (`scoredLineups: ScoredLineupData[]`)
- Neuer Type `ScoredLineupData` in `types.ts` (Event-Metadaten + Lineup-Spieler)
- Pill-Button Event-Switcher (nur bei >1 scored Event) — gold-highlighted aktives Pill
- Sortiert nach `scored_at` desc (neuestes zuerst)

### Betroffene Dateien
- `src/components/fantasy/types.ts` — neuer `ScoredLineupData` Type
- `src/components/fantasy/DashboardTab.tsx` — Pitch + Switcher + LED-Banden (komplett neu)
- `src/app/(app)/fantasy/FantasyContent.tsx` — Lade-Logik für alle scored Lineups

## Session 11.02.2026 (2) – Fantasy Refactoring

### Phase 1: History-Tab Mock → Real Data
- Mock-Daten entfernt (MOCK_USER_PROFILES, CURRENT_USER, PAST_PARTICIPATIONS, LAST_LINEUP_PERFORMANCE)
- Tote Components entfernt (UserProfileModal, LeaderboardModal)
- Tote Types entfernt (PlayerPerformance, EventParticipation, UserProfile, UserStats)
- HistoryTab zeigt jetzt echte DB-Daten (wins, top10, avgPoints, avgRank aus dashboardStats)
- ~600 Zeilen Mock-Code + Dead Code entfernt

### Phase 2: Components extrahiert → `src/components/fantasy/`
- 12 neue Dateien: types.ts, helpers.ts, constants.ts, GameweekSelector, LeagueSidebar, EventCard, EventTableRow, DashboardTab, HistoryTab, CreateEventModal, EventDetailModal, index.ts (barrel)
- FantasyContent.tsx: 3245 → 690 Zeilen (reiner Orchestrator)
- Alle Imports über `@/components/fantasy` barrel export

### Phase 3: Presets → bewusste Pilot-Entscheidung
- localStorage bleibt für Pilot (50 Beta-Tester, eigene Geräte)
- TODO.md aktualisiert

## Session 11.02.2026 – Event Lifecycle Fixes + DB Reset

### Event Lifecycle Fix (8 Fixes + 3 Bugfixes)
- **Doppelte DB-Trigger:** `trg_sync_event_entries` entfernt (Original-Trigger `trg_lineup_entries_insert/delete` behalten)
- **Server-Cache busting:** `/api/events?bust=1` Param + `scoring.ts` ruft nach Score/Reset Server-Cache-Bust auf
- **Bottom Action Bar:** 3 neue ended-States (ausgewertet/ausstehend/Ergebnisse)
- **Event Card Status-Chips:** "Ausgewertet" (lila) / "Beendet" (grau) statt immer "Nimmt teil"
- **Countdown Guards:** "Beendet" statt `formatCountdown()` bei ended Events (3 Stellen)
- **Action Buttons:** "Ergebnisse" (Eye-Icon) für `isJoined && ended` Events
- **Reset-Event Timestamps:** `starts_at = NOW()+1h`, `locks_at = NOW()+55min`, `ends_at = NOW()+4h`
- **Wallet-Cache:** `invalidate('wallet:')` + `invalidate('holdings:')` nach Score/Reset
- **Bugfix `reset_event`:** UUID-Cast Fix (`reference_id = p_event_id` statt `::TEXT`)
- **Bugfix Participant-Count:** Optimistischer Count bei Join/Leave/Update (nur +1 bei Neuanmeldung, nicht bei Aufstellungsänderung)
- **Cleanup:** Debug-Logs aus `lineups.ts` entfernt, `removeLineup` vereinfacht

### DB Reset für sauberes Testing
- Alle Lineups, GW-Scores, Transactions gelöscht
- Wallets auf 10.000 BSD zurückgesetzt
- `perf_l5`/`perf_l15` auf Default 50 (NOT NULL Constraint)
- 5 alte Events gelöscht, 3 neue Test-Events erstellt:
  - Pilot Test #1 — Free (entry_fee: 0)
  - Pilot Test #2 — 100 BSD (entry_fee: 10000)
  - Pilot Test #3 — Premium (entry_fee: 25000)

### 3 neue SQL-Migrationen via MCP deployed
- `drop_duplicate_lineup_trigger` — entfernt `trg_sync_event_entries`
- `reset_event_v2_shift_timestamps` — Reset verschiebt Timestamps in Zukunft
- `fix_reset_event_uuid_cast` — UUID-Vergleich in `reset_event` Fix

### Betroffene Dateien
- `src/app/(app)/fantasy/FantasyContent.tsx` — Action Bar, Chips, Countdown, Buttons, Cache
- `src/app/api/events/route.ts` — `bust` Query-Param für Cache-Skip
- `src/lib/services/scoring.ts` — Server-Cache busting nach Score/Reset
- `src/lib/services/lineups.ts` — Debug-Logs entfernt, `removeLineup` vereinfacht
- `docs/reset-event.sql` — UUID-Cast Fix + Timestamp-Shift

## Session 10.02.2026 (2) – Scoring Engine v2 + Event Reset

### Canonical Player Scores
- **Problem:** `score_event` RPC generierte zufällige Scores PRO LINEUP — derselbe Spieler bekam in verschiedenen User-Lineups unterschiedliche Punkte
- **Lösung:** Neue Tabelle `player_gameweek_scores` mit `UNIQUE(player_id, event_id)` — jeder Spieler bekommt pro Event EINEN kanonischen Score
- Neuer `score_event` RPC v2: sammelt alle unique Player-IDs, generiert einen Score pro Spieler, lookup für Lineups
- `perf_l5` und `perf_l15` werden automatisch nach Scoring aktualisiert (AVG der letzten 5/15 GW-Scores / 1.5)
- SQL: `docs/score-event.sql` (komplett neu geschrieben)
- Type: `DbPlayerGameweekScore` in `types/index.ts`
- Service: `getPlayerGameweekScores()` in `services/scoring.ts`
- UI: Spieltag-Bewertungen Abschnitt auf Spieler-Detailseite (Übersicht-Tab)

### Event Reset für Testing
- Neuer `reset_event` RPC: setzt Event auf 'registering' zurück, löscht Scores/Ranks/Rewards, refunded Wallets
- SQL: `docs/reset-event.sql`
- Service: `resetEvent()` in `services/scoring.ts`
- UI: Orangener "Zurücksetzen"-Button im EventDetailModal (nur sichtbar bei ausgewerteten Events)

### Bug Fix: Anmeldung bei beendeten Events
- `handleJoinEvent` prüft jetzt `event.status` und blockt bei `ended`/`running`
- `submitLineup` prüft Event-Status in der DB bevor Upsert (Backend-Sicherung)

### Supabase MCP Server konfiguriert
- `.claude.json` enthält MCP-Server-Config für direkten Supabase-Zugriff

## Session 10.02.2026 (1) – IPO System, Performance Caching, Trading Fix

### Trading Price Model Fix
- **Kritischer Bug:** `floor_price` wurde als Pool-Preis UND Markt-Minimum missbraucht
- **Fix:** Neue `ipo_price` Spalte — fester Club/IPO-Preis der sich nie durch Marktaktivität ändert
- `floor_price` = MIN(offene User-Sell-Orders) oder `ipo_price` Fallback
- SQL: `docs/fix-trading-price-model.sql`

### IPO System
- Neue Tabellen: `ipos` + `ipo_purchases` mit RLS
- `buy_from_ipo` RPC für atomare IPO-Käufe
- `IPOStatus`: 'none'|'announced'|'early_access'|'open'|'ended'|'cancelled'
- Service: `src/lib/services/ipo.ts`
- UI: IPOBuyWidget (grün) + TransferBuyWidget (blau) auf Spieler-Detailseite
- SQL: `docs/ipo-system.sql`

### Performance Caching
- In-Memory TTL Cache: `src/lib/cache.ts` — `cached()`, `invalidate()`, `invalidateAll()`, `withTimeout()`
- AuthProvider hydrates aus `sessionStorage`, non-blocking Profile-Load
- WalletProvider skippt redundante Fetches, Error-Recovery
- `(app)/loading.tsx` Skeleton für Route-Transitions
- Spieler-Detail: optimistische Updates nach Trades
- Provider Context Values: `useMemo` (Auth, Wallet, Toast)
- Listen-Memoization: `React.memo` auf PlayerDisplay, PlayerHoldingRow, TopBar

## Session 09.02.2026 – Fantasy Mock → Echte Daten
- `services/events.ts` erstellt (getEvents, getEventById, getUserJoinedEventIds)
- `services/lineups.ts` erstellt (getLineup, submitLineup mit Upsert)
- Fantasy Page umgebaut: Events, Holdings, Lineups aus DB statt Mock
- Formation in DB persistieren (lineups.formation Spalte)
- DPC Lock System implementiert
- 5 Pilot-Events geseeded

## Vorherige Sessions (bis 09.02.2026)

### Infrastruktur
- Supabase Projekt erstellt + Live-Credentials in `.env.local`
- `@supabase/supabase-js` + `@supabase/ssr` installiert
- Client + Server Session Management + Middleware

### Auth (komplett)
- Login/Register: Email, Google, Apple, Magic Link
- OAuth Callback, AuthProvider, AuthGuard, Onboarding
- WalletProvider, Providers Composition

### Service Layer (komplett)
- `services/players.ts` – CRUD + Search + Mapper
- `services/wallet.ts` – Wallet, Holdings, Transactions
- `services/trading.ts` – Buy/Sell/Cancel via RPCs
- `services/profiles.ts` – CRUD + Handle-Check
- `services/events.ts` – Events + User-Joins
- `services/lineups.ts` – Lineup CRUD + Participants + Player Usage
- `services/scoring.ts` – scoreEvent, resetEvent, getEventLeaderboard, getPlayerGameweekScores
- `services/ipo.ts` – IPO CRUD + Purchases
- `services/research.ts` – Research Posts CRUD + Unlock + Cache ✅ 12.02.2026
- `services/club.ts` – Club-spezifische Queries
- `lib/cache.ts` – In-Memory TTL Cache

### Pages auf echte Daten
- Home `/` – Spieler, Holdings, Wallet, Transactions, Events aus DB
- Market `/market` – Spieler + Orders + IPOs + Mein Team (Holdings) aus DB
- Player `/player/[id]` – komplett aus DB (inkl. GW-Scores, IPO, Orders, Trades)
- Fantasy `/fantasy` – Events, Holdings, Lineups, Scoring, Leaderboard aus DB
- Club `/club` – Spieler, Follower, Holdings, Trades aus DB
- Profile `/profile` – Wallet, Holdings, Settings, Aktivität (Transaktionen) aus DB
- Community `/community` – 5 Tabs (Posts, Votes, Leaderboard) aus DB ✅ 12.02.2026

### DB Types
- `DbPlayer`, `DbWallet`, `DbHolding`, `DbOrder`, `DbTrade`, `DbEvent`, `DbLineup`, `DbTransaction`, `DbIpo`, `DbIpoPurchase`, `DbPlayerGameweekScore`, `DbUserStats`, `DbUserFollow`, `DbUserAchievement`, `DbClubVote`, `DbVoteEntry`, `DbPost`, `DbPostVote`, `DbResearchPost`, `DbResearchUnlock`, `DbResearchRating`, `DbFeedback`, `DbPbtTreasury`, `DbPbtTransaction`, `DbFeeConfig` in `types/index.ts`

## SQL-Migrationen (Reihenfolge)

| # | Datei | Status | Beschreibung |
|---|-------|--------|-------------|
| 1 | `pilot-schema.sql` | deployed | 8 Tabellen + RLS + Triggers |
| 2 | `seed-players.sql` | deployed | 25 Sakaryaspor-Spieler |
| 3 | `trading-functions.sql` | deployed | 4 atomare Trading RPCs |
| 4 | `fix-trades-seller.sql` | deployed | seller_id nullable |
| 5 | `seed-events.sql` | deployed | 5 Pilot-Events (alte gelöscht, 3 neue) |
| 6 | `add-player-status.sql` | deployed | status Spalte für players |
| 7 | `add-lineup-formation.sql` | deployed | formation Spalte für lineups |
| 8 | `sync-event-state.sql` | deployed | Status-Sync + Triggers |
| 9 | `fix-lineups-delete-policy.sql` | deployed | DELETE RLS Policy |
| 10 | `fix-trading-price-model.sql` | deployed | ipo_price Spalte + Trading RPCs Fix |
| 11 | `ipo-system.sql` | deployed | IPO Tabellen + RPCs |
| 12 | `score-event.sql` | deployed ✅ 10.02 | player_gameweek_scores Tabelle + score_event v2 |
| 13 | `reset-event.sql` | deployed ✅ 10.02 | reset_event RPC (Testing) |
| 14 | MCP: `drop_duplicate_lineup_trigger` | deployed ✅ 11.02 | Doppelten Trigger entfernt |
| 15 | MCP: `reset_event_v2_shift_timestamps` | deployed ✅ 11.02 | Reset verschiebt Timestamps |
| 16 | MCP: `fix_reset_event_uuid_cast` | deployed ✅ 11.02 | UUID-Vergleich Fix |
| 17 | MCP: `atomic_wallet_operations` | deployed ✅ 11.02 | deduct/refund RPCs mit FOR UPDATE Lock |
| 18 | MCP: `create_user_follows` | deployed ✅ 12.02 | Social Graph Tabelle + RLS |
| 19 | MCP: `create_user_achievements` | deployed ✅ 12.02 | Achievements Tabelle + RLS |
| 20 | MCP: `create_user_stats` | deployed ✅ 12.02 | Reputation Scores + Rang + RLS |
| 21 | MCP: `create_club_votes` | deployed ✅ 12.02 | Club-Abstimmungen + RLS |
| 22 | MCP: `create_vote_entries` | deployed ✅ 12.02 | Einzelne Stimmen + RLS |
| 23 | MCP: `create_posts` | deployed ✅ 12.02 | Community Posts + RLS |
| 24 | MCP: `create_post_votes` | deployed ✅ 12.02 | Post Up/Downvotes + RLS |
| 25 | MCP: `create_follow_unfollow_rpcs` | deployed ✅ 12.02 | follow_user + unfollow_user RPCs |
| 26 | MCP: `create_vote_post_rpc` | deployed ✅ 12.02 | Atomarer Post-Vote RPC |
| 27 | MCP: `create_cast_vote_rpc` | deployed ✅ 12.02 | Atomarer Club-Vote RPC mit Wallet-Deduction |
| 28 | MCP: `create_refresh_user_stats_rpc` | deployed ✅ 12.02 | Score-Berechnung + Re-Ranking RPC |
| 29 | MCP: `create_get_club_dashboard_stats_rpc` | deployed ✅ 12.02 | Club Dashboard Stats RPC |
| 30 | MCP: `create_feedback` | deployed ✅ 12.02 | Feedback Tabelle + INSERT-only RLS |
| 31 | MCP: `create_research_posts` | deployed ✅ 12.02 | Research Posts Tabelle + RLS |
| 32 | MCP: `create_research_unlocks` | deployed ✅ 12.02 | Research Unlocks Tabelle + RLS |
| 33 | MCP: `create_unlock_research_rpc` | deployed ✅ 12.02 | Atomarer 80/20 Unlock RPC |
| 34 | MCP: `create_research_ratings_table` | deployed ✅ 12.02 | Research Ratings Tabelle + RLS + Index |
| 35 | MCP: `add_rate_research_rpc` | deployed ✅ 12.02 | rate_research RPC + avg_rating/ratings_count Spalten |
| 36 | MCP: `add_track_record_columns` | deployed ✅ 12.02 | price_at_creation, outcome, price_change_pct, resolved_at Spalten |
| 37 | MCP: `add_resolve_expired_research_rpc` | deployed ✅ 12.02 | Lazy auto-resolve RPC für abgelaufene Research Calls |
| 38 | MCP: `fix_wallet_rpcs_add_transaction_logging` | deployed ✅ 12.02 | deduct/refund RPCs + optionales TX-Logging |
| 39 | MCP: `fix_reset_event_refund_entry_fees` | deployed ✅ 12.02 | reset_event: Entry Fee Erstattung + TX-Log |
| 40 | MCP: `create_pbt_tables` | deployed ✅ 12.02 | PBT Treasury + Transactions + Fee Config Tabellen + Spalten |
| 41 | MCP: `create_credit_pbt_function` | deployed ✅ 12.02 | credit_pbt() SECURITY DEFINER Helper |
| 42 | MCP: `update_trading_rpcs_with_fees` | deployed ✅ 12.02 | 3 Trading RPCs mit Fee-Logik + PBT Credit |
| 43 | MCP: `create_community_poll_tables` | deployed ✅ 12.02 | community_polls + community_poll_votes Tabellen + RLS |
| 44 | MCP: `create_cast_community_poll_vote_rpc` | deployed ✅ 12.02 | Atomarer 70/30 Poll-Vote RPC |
| 45 | MCP: `add_post_replies` | deployed ✅ 12.02 | parent_id + replies_count Trigger |
| 46 | MCP: `add_post_category` | deployed ✅ 12.02 | category TEXT + CHECK Constraint |
| 47 | MCP: `add_research_category` | deployed ✅ 12.02 | category TEXT + CHECK Constraint auf research_posts |
| 48 | MCP: `fix_function_search_path` | deployed ✅ 12.02 | 30 Functions: SET search_path = public |
| 49 | MCP: `fix_rls_auth_uid_initplan` | deployed ✅ 12.02 | 39 RLS Policies: auth.uid() → (select auth.uid()) |
| 50 | MCP: `add_missing_fk_indexes` | deployed ✅ 12.02 | 18 Indexes auf unindexierten Foreign Keys |
| 51 | MCP: `merge_research_unlocks_select_policies` | deployed ✅ 12.02 | 2 SELECT Policies → 1 merged (OR) |
| 52 | MCP: `create_notifications_table` | deployed ✅ 12.02 | notifications Tabelle + RLS + Partial Index |

## Nächste Schritte
- [x] Bezahlte Polls (Phase 5.6) ✅ 12.02.2026
  - community_polls + community_poll_votes Tabellen + RLS + Indices
  - cast_community_poll_vote RPC (70/30 Split, atomic wallet ops)
  - Service + Cache + CommunityPollCard + CreateCommunityPollModal
  - Community Votes-Tab + Profile Activity
- [x] Scoring E2E verifiziert ✅ 11.02.2026
- [x] Mobile grundlegend benutzbar ✅ 11.02.2026
- [x] Error Handling (ErrorState UI auf allen Seiten) ✅ 11.02.2026
- [x] Code-Audit + Quality Fixes ✅ 11.02.2026
- [x] Performance Hardening (Timeouts, Memoization, Caching) ✅ 11.02.2026
- [x] Reputation & Engagement System ✅ 12.02.2026
  - 7 Tabellen + 5 RPCs + 4 Services + 18 Achievements
  - Profile: ScoreCircles + Achievements + Follower
  - Club: Echte Abstimmungen statt Mocks
  - Community: 5 Tabs (Posts, Votes, Leaderboard, Following)
  - Home: Scout Score Card + Top Scouts Leaderboard
  - Achievement Engine: Auto-Trigger nach Trades
- [x] Landing Page mit Invite ✅ 12.02.2026
- [x] Feedback-Kanal (Tabelle + Modal + TopBar-Button) ✅ 12.02.2026
- [x] Premium Posts / Paywall (Phase 5: Content Economy) ✅ 12.02.2026
  - research_posts + research_unlocks + unlock_research RPC
  - Service + Cache + ResearchCard + CreateResearchModal
  - Community + Player-Detail Research-Tabs live
- [x] Bewertungssystem für Research-Berichte ✅ 12.02.2026
  - research_ratings + rate_research RPC + avg_rating/ratings_count
  - Star-Rating Widget (interaktiv für Unlocker, read-only für alle)
- [x] Track Record (verifizierte Research-History) ✅ 12.02.2026
  - price_at_creation Snapshot, resolve_expired_research RPC, Outcome-Badge
  - Profil Research-Tab: Hit-Rate Summary + eigene Posts mit Outcome
- [x] Activity Tracking Audit ✅ 12.02.2026
  - 6 Bugs gefixt: Profile UI + Wallet RPCs TX-Logging + reset_event Refund
  - 10-User-Simulation: alle 11 TX-Types verifiziert, 0 Diskrepanzen
- [x] Vollständiger Projekt-Audit + Dead Code Cleanup ✅ 12.02.2026
  - 2 kritische Bugs gefixt (Cache-Key, Cache-Invalidation)
  - 2 Type-Mismatches gefixt (seller_id, status nullable)
  - 26 Dead-Code-Elemente entfernt + mock-data.ts gelöscht

## Blockiert
- Nichts aktuell

## Entscheidungen (dauerhaft)
- Supabase als Backend (Auth + DB + Realtime)
- Supabase Auth (Email + Google + Apple + Magic Link)
- Geld als BIGINT in Cents, nie Float
- 1 Club für Pilot (Sakaryaspor), 25 Spieler
- Scoring: Supabase RPC (admin-triggered), kanonische Scores pro Spieler
- Kein Realtime für Pilot (Polling + Cache reicht)
- Community + Reputation & Engagement System implementiert (Phase 4)
