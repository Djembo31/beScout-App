# BeScout - Aktuelle Tasks

> Letzte Aktualisierung: 13.02.2026 (nach Lücken-Implementierung Session 34)
> Modus: PILOT SPRINT (4 Wochen → echte User)

---

## Nächste Session: Phase 7 (Scale)

### Verbleibende Lücken geschlossen ✅ (13.02.2026)
Logik-Check Session 33 identifizierte 12 Lücken, 6 Pilot-Blocker in Session 33 gefixt. Restliche 5 Lücken jetzt geschlossen (Membership-Tiers übersprungen → Phase 7):

- [x] **1. Participant-Limit-Guard** — `handleJoinEvent` in FantasyContent.tsx prüft jetzt `maxParticipants`. EventDetailModal: Button disabled + "Event voll" Text wenn voll
- [x] **2. Fee-Breakdown Sell-Form** — PlayerContent.tsx: Brutto/Gebühr(5%)/Netto-Aufschlüsselung statt nur "Erlös". Kein neuer State/Fetch, hardcoded 5% = DB-Standard
- [x] **3. Admin Event-Erstellung** — AdminEventsTab.tsx komplett rewritten (~270 Zeilen). Event-Liste mit Status-Badges, Create-Modal (Name/Typ/Format/GW/Fees/Daten), Status-Aktionen (Starten/Abbrechen/Beenden). +`getEventsByClubId`, `createEvent`, `updateEventStatus` in events.ts
- [x] **4. Admin Spieler-Anlegen** — AdminPlayersTab.tsx: "Spieler anlegen" Button + Create-Modal (Vorname/Nachname/Position/Trikotnr./Alter/Nationalität/IPO-Preis). +`createPlayer` in players.ts
- [x] **5. Öffentliche Profile** — Shared `ProfileView.tsx` Component. `profile/page.tsx` refactored (nutzt ProfileView mit isSelf=true). Neue Route `profile/[handle]/page.tsx` für öffentliche Profile (404, Redirect bei eigenem Handle, Follow-Button). +`getProfileByHandle` in profiles.ts. Home Leaderboard-Einträge verlinken auf `/profile/{handle}`
- [x] **Build verifiziert** (0 Fehler, 17 Routes inkl. neues `/profile/[handle]`)

### Pilot-Blocker Fixes ✅ (13.02.2026)
Logik-Check: Vision-Dokument gegen Implementierung geprüft, 12 Lücken identifiziert, 6 Pilot-Blocker gefixt:
- [x] **Fix 1: Scout Score auto-berechnen** — `refreshUserStats()` + `checkAndUnlockAchievements()` fire-and-forget in: scoring.ts (alle Teilnehmer nach Event-Auswertung), votes.ts (castVote), bounties.ts (approveBountySubmission → Submitter + Admin), social.ts (followUser → followed User)
- [x] **Fix 2: Achievements auto-triggern** — `podium_3x` jetzt echte DB-Query (lineups WHERE rank<=3), `first_bounty` jetzt echte DB-Query (bounty_submissions WHERE status=approved), lazy-queried nur wenn nicht schon unlocked
- [x] **Fix 3: Research price_at_creation** — `select('last_price')` (oft null→0, Track Record bricht) → `select('floor_price, ipo_price')` mit Fallback-Chain
- [x] **Fix 4: Welcome Page BSD-Betrag** — "500 BSD" → "10.000 BSD" (2 Stellen), passt jetzt zum DB-Startguthaben (1.000.000 Cents)
- [x] **Fix 5: Fantasy Lineup-Lock** — War bereits implementiert (`isReadOnly` in EventDetailModal.tsx blockt Edits bei running/ended, Join/Update Buttons hidden)
- [x] **Fix 6: Trading-Notifications** — Seller wird benachrichtigt wenn DPC-Order angenommen wird (buyFromMarket + buyFromOrder). `'trade'` NotificationType + ArrowLeftRight Icon + Gold-Farbe in NotificationDropdown
- [x] **Build verifiziert** (0 Fehler, 17 Routes)

### Projekt-Audit + Cleanup ✅ (13.02.2026)
- [x] **Smoke Test:** `npx next build` — 0 Fehler, 16 Routes kompilieren
- [x] **Deutsche Labels:** SideNav "Balance"→"Guthaben", "More"→"Mehr", "Logout"→"Abmelden"
- [x] **Duplicate Type entfernt:** `HoldingRow` in profile/page.tsx → importiert von ProfileOverviewTab (Single Source of Truth)
- [x] **Tote Komponente entfernt:** `PlayerHoldingRow` aus PlayerRow.tsx (~60 Zeilen) — war deprecated, nirgends importiert
- [x] **Accessibility:** Club-Logo `alt=""` → `alt={player.club}` auf allen 4 Instanzen in PlayerRow.tsx
- [x] **Verifiziert sauber:** Keine `standard`/`detailed` Varianten-Refs, keine `PlayerCard` Imports, keine `console.log`, Service Layer korrekt genutzt, Empty States + Loading überall vorhanden

### Unified PlayerDisplay Refactor ✅ (13.02.2026)
- [x] **PlayerRow.tsx:** `standard`/`detailed` Varianten entfernt → neues `card` (~170px) + erweitertes `compact` (~70px holding)
- [x] **player/index.tsx:** `PlayerCard` Komponente entfernt (~80 Zeilen)
- [x] **market/page.tsx:** 4 Custom-Components entfernt (`ClubLabel`, `PlayerRowTable`, `IPOCardGrid`, `IPORowTable`) → ~450 Zeilen weniger
- [x] **ManagerBestandTab.tsx:** Desktop-Table + Mobile-Cards → PlayerDisplay compact (~150 Zeilen weniger)
- [x] **Home page.tsx:** `PlayerHoldingRow` Table + Mobile-Cards → PlayerDisplay compact (~60 Zeilen weniger)
- [x] **ProfilePortfolioTab.tsx:** Custom Layout → PlayerDisplay compact mit holding
- [x] **ManagerKaderTab.tsx:** Custom Rows → PlayerDisplay compact
- [x] **ClubContent.tsx:** `PlayerCard` → `PlayerDisplay card`, dichteres Grid (5 Spalten xl)
- [x] **DpcHolding erweitert:** +ticket, +age, +perfL5, +matches, +goals, +assists
- [x] **HoldingWithPlayer erweitert:** +shirt_number, +age (Supabase Query erweitert)
- [x] **HoldingRow erweitert:** +shirt_number, +age, +perf_l5, +matches, +goals, +assists (Profile + ProfileOverview)
- [x] **Compact Holding Redesign (Sorare-inspired):**
  - L5 Score-Pill (farbig: grün/amber/rot) + 5-Segment-Bar
  - Stats-Pills: Sp/T/A in Mini-Badges
  - Club-Logo (14px `<img>`) mit Fallback auf farbigen Kreis
  - Alter + Liga in Subtitle
  - Duplicate PositionBadge fix (nur wenn TrikotBadge links)
- [x] **Build verifiziert** (0 Fehler)

### Phase 6.4: Community-Moderation + Streak-Bonus ✅ (13.02.2026)
- [x] **Migration 75: community_moderation** — `clubs.community_guidelines TEXT`, 3 RPCs (admin_delete_post, admin_toggle_pin, update_community_guidelines)
- [x] **Migration 76: streak_bonus_system** — `user_streaks` + `streak_milestones_claimed` Tabellen, `record_login_streak` RPC (auto-claim Milestones: 3d=5 BSD, 7d=15 BSD, 14d=50 BSD, 30d=150 BSD)
- [x] **Types:** `community_guidelines` auf DbClub, `StreakResult` Type
- [x] **Services:** posts.ts (adminDeletePost, adminTogglePin, Pinned-Sort), club.ts (updateCommunityGuidelines), streaks.ts (NEU)
- [x] **Activity:** streak_bonus (Flame icon, orange)
- [x] **Community UI:** PostCard (Admin-Actions, Pin-Badge), CommunityFeedTab (Pinned-Sort, Admin-Props), community/page.tsx (Admin-State)
- [x] **Admin:** AdminModerationTab.tsx (NEU) — Guidelines-Editor + Gepinnte Posts + Post-Liste mit Pin/Delete
- [x] **AdminContent:** 7→8 Tabs (+Moderation mit Shield-Icon)
- [x] **ClubContent:** Community-Richtlinien Info-Card (Gold-Border, Shield-Icon)
- [x] **Home:** Server-Streak via `recordLoginStreak()` fire-and-forget, Milestone-Toast, nächster-Milestone-Hinweis
- [x] **RPC Fix:** `get_club_by_slug` um `community_guidelines` erweitert
- [ ] **Leaked PW Protection:** ⏳ Erfordert Pro Plan (Authentication → Providers → Email → Password Security)
- [x] **Build verifiziert** (0 Fehler), Security Advisors geprüft

### Phase 6.5: Success Fee + Liquidierung ✅ (13.02.2026)
- [x] **DB Schema:** 4 SQL-Migrationen (71-74): `liquidation_events` + `liquidation_payouts` Tabellen, Constraint-Fixes (pbt_transactions, notifications), 2 RPCs (set_success_fee_cap, liquidate_player)
- [x] **Types:** 2 neue Types (DbLiquidationEvent, DbLiquidationPayout), DbPlayer/Player/NotificationType erweitert
- [x] **Service:** `liquidation.ts` (~130 Zeilen) — setSuccessFeeCap, liquidatePlayer (atomic RPC + Notifications + Missions), getLiquidationEvent, getLiquidationPayouts
- [x] **Integration:** players.ts (dbToPlayer), activityHelpers (pbt_liquidation), NotificationDropdown (pbt_liquidation), trading.ts (is_liquidated Guards)
- [x] **Admin UI:** AdminPlayersTab.tsx (Spieler-Verwaltung, Cap-Modal, Liquidation-Confirmation, Status-Badges)
- [x] **Player UI:** PlayerContent.tsx (Liquidation-Banner, Trading gesperrt, PBT-Widget Update, Trade-Widgets hidden)
- [x] **Market Guards:** market/page.tsx (liquidierte Spieler aus Transferliste + Kader ausgeschlossen)
- [x] **Build verifiziert** (0 Fehler), Security Advisors geprüft

### Phase 6.3: Club-Aufträge / Bounties ✅ (13.02.2026)
- [x] **DB Schema:** 5 SQL-Migrationen (66-70): `bounties` + `bounty_submissions` Tabellen, 3 RPCs (submit/approve/reject), auto_close, 2 Mission Seeds
- [x] **Types:** 7 neue Types (DbBounty, BountyWithCreator, DbBountySubmission, etc.), NotificationType erweitert
- [x] **Service:** `bounties.ts` (~300 Zeilen) — CRUD + RPCs + Notifications + Missions
- [x] **Integration:** activityHelpers (bounty_cost/bounty_reward), achievements (first_bounty), NotificationDropdown (3 Types)
- [x] **Admin:** AdminBountiesTab.tsx (~280 Zeilen) + AdminContent.tsx (+bounties Tab)
- [x] **Community:** BountyCard.tsx, CommunityBountiesTab.tsx, community/page.tsx (+bounties Tab)
- [x] **Build verifiziert** (0 Fehler), Security Advisors geprüft

### Phase 6.1 + 6.2: Multi-Club Architektur + Club Dashboard ✅ (13.02.2026)
- [x] **DB Schema:** 10 SQL-Migrationen (56-65): `clubs` + `club_admins` Tabellen, `club_id` FK auf 7 Tabellen (players, club_votes, events, fee_config, posts, research_posts, profiles), 6 RPCs
- [x] **Types:** 4 neue Types (DbClub, ClubWithAdmin, DbClubAdmin, ClubAdminRole), 7 erweiterte Types (+club_id)
- [x] **Services:** 9 Dateien refactored (club.ts komplett rewritten, alle nutzen club_id statt club_name)
- [x] **Routes:** `/club/[slug]` Dynamic Route + `/club/[slug]/admin` Admin-Dashboard
- [x] **Components:** ClubContent.tsx (~1400 Zeilen) + AdminContent.tsx + 6 Admin-Tab-Components
- [x] **Hardcoded Fix:** community/page.tsx 4× 'Sakaryaspor' → dynamisch via profile.favorite_club_id
- [x] **Build verifiziert** (0 Fehler, alle Routes kompiliert)
- [x] **Data verifiziert** (25/25 Spieler mit club_id, 3 Events, 2 Profile backfilled)

### Engagement Wellen 1-4 ✅ (13.02.2026)
- [x] **Welle 1 — Day-1 Retention:** Trending Players Strip, Price Sparklines (Bulk Loader), Welcome-Flow, Quick-Stats, IPO-Highlights, Portfolio-Value, Kader-Link-Fix
- [x] **Welle 2 — Week-1 Retention:** Live Trade Feed (Home Ticker), Login Streak (localStorage), Quick-Actions (Mobile Portfolio), Achievement-Notifications, Leaderboard Rank-Changes, Share-to-Community (Player Detail), Watchlist Persistence + Preis-Notifications + Beobachtet-Filter
- [x] **Welle 3 — Monetarisierung:** Preis-Chart (SVG Line Chart), Preis-Alerts (localStorage), "Unter Wert" Empfehlungen (Home), Research-Einnahmen Dashboard (Profil), Top-Trader Showcase (Home Sidebar), IPO FOMO-Indicators, Portfolio-Insights Widget, Orderbook-Tiefe (Spieler-Seite)
- [x] **Welle 4 — Social & Viral:** Community-Highlights (Home), Reply-Notifications, Social-Proof ("X Scouts halten"), Quick-Share Buttons, Achievement-Badges auf Leaderboard, Plattform-Puls Widget (Home), Follow-Empfehlungen (Sidebar), Einladungs-Banner
- [x] Build verifiziert (0 Fehler, alle 4 Wellen)

### Optimierungen 4–11 ✅ (12.02.2026)
- [x] **Item 4 — Pagination:** LoadMoreButton + wallet.ts offset + ProfileActivityTab Pagination
- [x] **Item 5 — Monolithische Pages splitten:** Community (~1317→~350 Zeilen, 7 Tab-Components) + Profile (~1119→~350, 4 Tab-Components)
- [x] **Item 6 — Promise.allSettled:** 6 Pages + settledHelpers.ts + partielles Error-Rendering
- [x] **Item 7 — Lazy-Loading EventDetailModal:** next/dynamic mit ssr:false + loading skeleton
- [x] **Item 8 — SEO + Open Graph:** Root title template + 5 Route-Layouts + Player generateMetadata (Server/Client Split)
- [x] **Item 9 — Notification-System:** notifications Tabelle (Migration 52) + Service + NotificationDropdown + Triggers (research/follow/fantasy) + TopBar 60s Polling
- [x] **Item 10 — Globale Suche:** search.ts (3 parallele Queries) + SearchDropdown (300ms Debounce) + TopBar Desktop/Mobile Integration
- [x] **Item 11 — Accessibility:** TabBar (role=tablist/tab/tabpanel) + Modal (dialog/aria-modal/focus-trap/ESC/backdrop) + Button focus-ring + TopBar ARIA-Labels
- [x] Build verifiziert (0 Fehler)

### Projekt-Audit #2 ✅ (12.02.2026)
5-Agent-Parallel-Audit (Services, Types/Components, Pages, Business Logic, DB Schema):
- [x] **CRITICAL: ResearchCard Preis-Bug:** `formatBsd(centsToBsd(price))` doppelt durch 100 geteilt → Preise 100x zu klein. Fix: `fmtBSD(centsToBsd(price))`
- [x] **CRITICAL: withTimeout + ErrorState:** Community, Profile, Fantasy Seiten fehlten. Pattern: `withTimeout(Promise.all(...), 10000)` + `dataError`/`retryCount` State + ErrorState UI
- [x] **CRITICAL: Math.min Rank-Bug:** `Math.min(...fantasyResults.map(r => r.rank))` liefert 0 bei unscored. Fix: `.filter(r => r.rank > 0)`
- [x] **Cache-Invalidation:** 6 fehlende Invalidierungen gefixt (scoring.ts, ipo.ts, lineups.ts, social.ts)
- [x] **Deutsche Labels:** 12 englische Labels → deutsch (Free→Gratis, Prize Pool→Preisgeld, Seller→Verkäufer, etc.)
- [x] **Fantasy alert→toast:** 6 `alert()` Calls → `addToast()` mit korrektem Typ (success/error)
- [x] **Community Vote-Error:** Stilles `catch` → `addToast('Fehler beim Abstimmen', 'error')`
- [x] Build verifiziert (0 Fehler)

### Security Hardening ✅ (12.02.2026)
- [x] 30 RPCs: `SET search_path = public` (Migration 48)
- [x] 39 RLS Policies: `auth.uid()` → `(select auth.uid())` (Migration 49)
- [x] 18 fehlende FK-Indexes hinzugefügt (Migration 50)
- [x] `research_unlocks` 2 SELECT Policies → 1 merged (Migration 51)
- [ ] Leaked Password Protection aktivieren (Dashboard → Auth → Providers → Email) ⏳ Erfordert Pro Plan

**Verbleibend (low-risk):**
- [ ] 13 nullable Mismatches in Types (alle haben DEFAULT, kein Runtime-Risiko)

### Phase 5.7: Profil-Erweiterungen ✅ (12.02.2026)
- [x] Types: `UserTradeWithPlayer`, `UserFantasyResult` in `types/index.ts`
- [x] Service: `getUserTrades()` in `trading.ts` (mit Player-Join, cached 2min)
- [x] Service: `getUserFantasyHistory()` in `lineups.ts` (scored Events, cached 2min)
- [x] Cache: `invalidateTradeData()` invalidiert `userTrades:` Prefix
- [x] Profil Übersicht: "Letzte Trades" Card (Buy/Sell Icon + PositionBadge + Kauf/Verkauf Chip + Betrag)
- [x] Profil Übersicht: "Fantasy-Ergebnisse" Card (Summary-Grid + Event-Liste mit Rang/Score/Reward)
- [x] Profil Research: Verifizierungs-Badge (gold bei >=5 Calls + >=60% Hit-Rate, sonst Progress)
- [x] Build verifiziert (0 Fehler)

### Phase 5.1: Research-Kategorien ✅ (12.02.2026)
- [x] SQL Migration 47: `add_research_category` — `category TEXT DEFAULT 'Spieler-Analyse'` + CHECK Constraint
- [x] Types: `ResearchCategory` Type + `category` Feld zu `DbResearchPost`
- [x] Service: `createResearchPost()` bekommt `category` Parameter, `getResearchPosts()` +`clubName` Filter
- [x] ResearchCard: Category badge (farbig, sky/purple/amber/emerald/rose) als erstes Badge
- [x] CreateResearchModal: Category pill selector (5 Kategorien) nach Titel
- [x] Community Research Tab: Kategorie-Filter-Pills (toggle on/off), kombinierbar mit Sort + Call
- [x] Club Community Tab: Research-Vorschau (top 5 ResearchCards + unlock/rate Handler)
- [x] Build verifiziert (0 Fehler)

### Phase 5.1: Research Sortierung + Filter ✅ (12.02.2026)
- [x] `ResearchSort` Type + `RESEARCH_SORTS` Konstanten (Neueste/Top bewertet/Meistverkauft)
- [x] `RESEARCH_CALLS` Konstanten (Bullish/Bearish/Neutral mit Farben)
- [x] `researchSort` + `researchCallFilter` State
- [x] `sortedResearchPosts` useMemo (Call-Filter + Sort-Logik)
- [x] Research Tab UI: Sort-Pills + Call-Filter-Pills + gefilterte Count-Anzeige
- [x] Kontextsensitive Empty-States (Filter aktiv vs. keine Berichte)
- [x] Build verifiziert (0 Fehler)

### Phase 4.3: Content-Kategorien für Posts ✅ (12.02.2026)
- [x] SQL Migration 46: `add_post_category` — `category TEXT DEFAULT 'Meinung'` + CHECK Constraint
- [x] Types: `PostCategory` Type + `category` Feld zu `DbPost`
- [x] Service: `createPost()` bekommt `category` Parameter (Default 'Meinung')
- [x] Community Page: Kategorie-Pills im CreatePostModal, Kategorie-Badge im PostCard, Filter-Pills im Feed
- [x] Build verifiziert (0 Fehler)

### Vision & Roadmap dokumentiert ✅ (12.02.2026)
- [x] `docs/VISION.md` erstellt — vollständige Produktvision (B2B2C, Fan-Ökonomie, 7 Verdienst-Wege, Flywheel, Pitch)
- [x] `docs/ROADMAP.md` aktualisiert — Phase 4-7 (Pilot → Content Economy → Club Tools → Scale)
- [x] `CLAUDE.md` aktualisiert — Projektbeschreibung auf B2B2C-Vision angepasst

### Phase 4: Pilot Launch (In Arbeit)
- [x] Landing Page (erklärt BeScout, Invite-Flow) ✅ 12.02.2026
- [x] Basis Club Dashboard (Read-Only: Revenue + Fan-Metriken) ✅ 12.02.2026
- [ ] 10 Beta-Tester einladen
- [x] Feedback-Kanal ✅ 12.02.2026
- [ ] 50 Beta-Tester erreichen

### Phase 5: Content Economy (In Arbeit)
- [x] Premium Posts / Paywall (BSD) ✅ 12.02.2026
  - `research_posts` + `research_unlocks` Tabellen + RLS
  - `unlock_research` RPC (atomare 80/20 Transaktion)
  - `services/research.ts` (CRUD + unlock + Cache)
  - `ResearchCard` + `CreateResearchModal` Components
  - Community Research-Tab live (kein "Coming Soon" mehr)
  - Player-Detail Research-Tab + ResearchPreview live
  - Profile: Neue Transaction-Types (research_unlock, research_earning)
  - `MOCK_RESEARCH` entfernt
- [x] Bewertungssystem für Berichte ✅ 12.02.2026
  - `research_ratings` Tabelle + RLS + `rate_research` RPC
  - `avg_rating`/`ratings_count` Spalten in `research_posts`
  - Star-Rating Widget in `ResearchCard` (interaktiv für Unlocker, read-only für alle)
  - Community + Player-Detail: Rating-Handler integriert
- [x] Track Record (verifizierte History) ✅ 12.02.2026
  - 2 SQL-Migrationen: `add_track_record_columns` + `add_resolve_expired_research_rpc`
  - `price_at_creation` Snapshot beim Erstellen, `outcome` (correct/incorrect), `price_change_pct`
  - `resolve_expired_research` RPC: lazy auto-resolve (24h/7d Horizonte)
  - `resolveExpiredResearch()` fire-and-forget auf Community/Player/Profile
  - `getAuthorTrackRecord()` für Hit-Rate-Statistik
  - Outcome-Badge (Korrekt/Falsch) auf ResearchCard
  - Profil Research-Tab: Track-Record-Summary + eigene Posts mit Outcome
- [x] Activity Tracking Audit + Fixes ✅ 12.02.2026
  - 6 Bugs gefunden und gefixt:
  - Profile Activity UI: Handler für `ipo_buy`, `fantasy_reward`, `vote_fee`, `entry_fee`, `entry_refund` + Legacy `buy`/`sell`
  - `deduct_wallet_balance` RPC: TX-Logging mit optionalem `p_type`/`p_description`/`p_reference_id`
  - `refund_wallet_balance` RPC: TX-Logging mit optionalem `p_type`/`p_description`/`p_reference_id`
  - `reset_event` RPC: Entry Fee Erstattung + TX-Log bei Reset
  - `wallet.ts` + `FantasyContent.tsx`: Event-Name + Event-ID an deduct/refund Calls übergeben
  - 2 SQL-Migrationen deployed: `fix_wallet_rpcs_add_transaction_logging` + `fix_reset_event_refund_entry_fees`
  - 10-User-Simulation: alle 11 TX-Types getestet, 0 Diskrepanzen
- [x] Vollständiger Projekt-Audit + Dead Code Cleanup ✅ 12.02.2026
  - 5-Agent-Parallel-Audit: Services, Types/Components, Pages, Providers/Utils, DB-Schema
  - 2 kritische Bugs gefixt: Cache-Key Bug (research ratings), fehlende Cache-Invalidation (club follow)
  - 2 Type-Mismatches gefixt: `DbTrade.seller_id` + `DbPlayer.status` → nullable
  - `dbToPlayer()` nutzt jetzt echten DB-Status statt hardcoded `'fit'`
  - SideNav Settings-Button: Dead button → Link zu `/profile`
  - 26 Dead-Code-Elemente entfernt (10 Service-Exports, 6 Types, 4 Functions, 2 Components, 2 Utils)
  - `mock-data.ts` komplett gelöscht (keine Imports mehr)
  - `DbFeedback` Type hinzugefügt
  - Duplicate `posTintColors` → single source in PlayerRow.tsx
  - Build: 0 Fehler
- [x] PBT + Fee Split ✅ 12.02.2026
  - 3 SQL-Migrationen: `create_pbt_tables` + `create_credit_pbt_function` + `update_trading_rpcs_with_fees`
  - `pbt_treasury` (pro Spieler), `pbt_transactions` (Audit Log), `fee_config` (pro Club, Global Default)
  - `credit_pbt()` Helper-Funktion (SECURITY DEFINER)
  - `buy_from_order`, `buy_player_dpc`, `buy_from_ipo` RPCs mit Fee-Logik
  - Trade Fee: 5% Gesamt → 3.5% BeScout, 1.5% PBT, 0% Club
  - IPO Fee: 85% Club, 10% BeScout, 5% PBT
  - Seller zahlt Trade-Fee (bekommt Netto)
  - `services/pbt.ts` (PBT-Queries + Fee-Config + Cache)
  - `cache.ts` erweitert: `invalidateTradeData()` + PBT-Invalidation
  - Player-Detailseite: echte PBT-Daten in PBTWidget
  - Types: `DbPbtTreasury`, `DbPbtTransaction`, `DbFeeConfig`, `DbTrade`/`DbIpoPurchase` erweitert
- [x] Bezahlte Polls ✅ 12.02.2026
  - `community_polls` + `community_poll_votes` Tabellen + RLS
  - `cast_community_poll_vote` RPC (atomare 70/30 Transaktion)
  - `services/communityPolls.ts` (CRUD + RPC + Cache)
  - `CommunityPollCard` + `CreateCommunityPollModal` Components
  - Community Votes-Tab: Polls + Club-Votes + "Umfrage erstellen"
  - Profile Activity: `poll_vote_cost` (amber) + `poll_earning` (grün)
- [x] Kommentare / Replies ✅ 12.02.2026
  - `parent_id` Spalte auf `posts` (self-referencing FK) + Trigger für `replies_count`
  - `getReplies()`, `createReply()` in `posts.ts`, `getPosts()` filtert Replies aus
  - `PostReplies.tsx` Component (Expand/Collapse, Inline Reply, Voting, Delete)
  - Community PostCard: MessageSquare-Button togglet Replies

---

## Bisherige Sessions

### Reputation & Engagement System ✅ (12.02.2026)
- [x] Phase A: DB Schema — 7 Tabellen + 5 RPCs (10 Migrationen deployed)
- [x] Phase B: Service Layer — `social.ts`, `votes.ts`, `posts.ts`, `achievements.ts` + Types
- [x] Phase C: Profile — ScoreCircles (T/M/S), Achievements-Grid, Follower/Following Counts
- [x] Phase D: Club — Echte Abstimmungen (ClubVoteCard + CreateVote-Modal, BSD-Abzug)
- [x] Phase E: Community — 5 Tabs (Posts, Following, Research, Abstimmungen, Leaderboard)
- [x] Phase F: Home — Scout Score Stat Card + Top Scouts Leaderboard Sidebar
- [x] Phase G: Achievement Engine — Auto-Trigger nach Trades (fire-and-forget)
- [x] Build verifiziert (0 TypeScript-Fehler)
- [x] Security verifiziert (RLS auf allen 7 neuen Tabellen)

### Echte Daten: Home Events, Market Mein Team, Profile Aktivität ✅ (11.02.2026)
- [x] Home: `MOCK_CONTESTS` entfernt → `getEvents()` aus DB, Events-Rendering mit echten `DbEvent`-Feldern
- [x] Home: `nextEvent` useMemo (registering/late-reg/running, sortiert nach starts_at)
- [x] Home: Events-Sidebar mit Status-Mapping (running→LIVE, registering→Offen, scoring→Auswertung)
- [x] Home: `getTimeUntil()` Helper für relative Zeitanzeige (starts_at/ends_at)
- [x] Market: "Mein Team" Tab zeigt eigene Spieler (players mit dpc.owned > 0) + DPC-Anzahl + Floor Price
- [x] Profile: "Aktivität" Tab zeigt echte Transaktionen aus `getTransactions()` (Icons, Labels, Beträge, Zeitstempel)
- [x] Cleanup: `MOCK_CONTESTS` aus mock-data.ts entfernt, `Contest`/`ContestMode`/`ContestStatus` aus types/index.ts entfernt

### Performance Hardening ✅ (11.02.2026)
- [x] `withTimeout()` Utility in `cache.ts` (8s default, 10s in `cached()`)
- [x] AuthProvider: `.catch()` auf `getSession()`, non-blocking Profile-Load, 5s Timeout
- [x] Middleware: try/catch um `getUser()` — kein 500 bei Supabase-Ausfall
- [x] WalletProvider: Error-Recovery (`finally { loaded.current = true }`), Balance-Reset bei User-Wechsel, 5s Timeout
- [x] `getProfile()` gecached (2min TTL), Invalidation bei Create/Update
- [x] Alle Seiten-Daten: `Promise.all()` in `withTimeout(10s)` — max 10s bis Error/Retry
- [x] Provider Context Values: `useMemo` auf Auth/Wallet/Toast (verhindert Kaskaden-Re-Renders)
- [x] `React.memo` auf `PlayerDisplay` + `PlayerHoldingRow` (Listen-Performance)
- [x] `React.memo` auf `TopBar` + `next/image` für Avatar
- [x] ToastProvider: Styles als Module-Level-Konstanten (nicht in `.map()` re-created)
- [x] `getPlayersByClub()` + `getPlayersByPosition()` gecached (5min TTL)
- [x] `next.config.mjs`: `remotePatterns` für Supabase-Images

### Priorität 1: Scoring E2E ✅ (11.02.2026 verifiziert)
- [x] 2 User in "Pilot Test #1 — Free" angemeldet (djembo + kede5)
- [x] Gleicher Score pro Spieler in verschiedenen Lineups verifiziert (5 gemeinsame Spieler = identische Scores)
- [x] `perf_l5`/`perf_l15` korrekt berechnet (Score / 1.5)
- [x] Spieler-Detailseite: Spieltag-Bewertungen sichtbar
- [x] Rewards korrekt: djembo +300 BSD (Platz 1), kede5 +200 BSD (Platz 2)
- [x] Wallet-Balance + Transactions stimmen

### Dashboard: Pitch-Visualisierung ✅ (11.02.2026)
- [x] Dashboard Aufstellung: flache Liste → Pitch-Visualisierung (SVG Spielfeld + Spieler-Kreise)
- [x] Multi-Event Support: alle scored Events laden + Pill-Button Event-Switcher
- [x] Neuer Type `ScoredLineupData` (Event-Metadaten + Lineup-Spieler)
- [x] Seitliche LED-Bandenwerbung (Sponsor-Flächen) am Pitch
- [x] Summary-Bar: Gesamt-Score + Platzierung + Reward

### Mobile Optimierung ✅ (11.02.2026)
- [x] Alle Seiten auf 390px (iPhone) getestet und optimiert
- [x] Fantasy: Sorare-inspiriertes Redesign (Section-Layout, Pill-Tabs, Category Pills)
- [x] Market: Icon-Pill-Tabs (Icon-only auf Mobile, Icon+Label ab sm)
- [x] Club: Responsive Hero, Tabs mit shortLabel, IPO-Admin gestackte Cards
- [x] Profile: Responsive Header/Tabs, Portfolio Mobile Cards statt Tabelle
- [x] Tabellen→Cards Pattern auf Mobile (HistoryTab, Portfolio)

### Projekt-Audit + Code-Quality ✅ (11.02.2026)
- [x] Vollständiger Audit: UI-Konsistenz, TypeScript, Services & Data Flow
- [x] Deutsche Labels überall (Profile, Market, Nav, Player, Wallet)
- [x] Cache-Invalidation nach allen Write-Operationen geschlossen
- [x] Atomare Wallet-RPCs (deduct/refund mit FOR UPDATE Lock)
- [x] ErrorState UI auf allen Datenseiten (Home, Market, Club, Player)
- [x] console.error entfernt, user!.id Assertions eliminiert, toten Code bereinigt
- [x] SQL-Migration: `atomic_wallet_operations` deployed via MCP

### Priorität 2: Polish + Launch (Woche 4)
- [x] Error Handling (ErrorState Component auf allen Seiten) ✅ 11.02.2026
- [x] Loading States + Timeout Protection ✅ 11.02.2026
- [x] Mobile grundlegend benutzbar ✅ 11.02.2026
- [x] Performance Hardening (Timeouts, Memoization, Caching) ✅ 11.02.2026
- [x] Landing Page mit Invite ✅ 12.02.2026
- [ ] 10 Beta-Tester einladen

---

## Fertig (verifiziert im Code)

### Infrastruktur
- [x] Supabase Projekt erstellt + Credentials
- [x] Client + SSR + Middleware + Route Protection
- [x] `.env.local` mit Supabase URL + Anon Key
- [x] In-Memory TTL Cache (`lib/cache.ts`)
- [x] Supabase MCP Server für Claude Code konfiguriert

### Auth (komplett)
- [x] Login/Register (Email + Google + Apple + Magic Link)
- [x] OAuth Callback + AuthProvider + AuthGuard
- [x] Onboarding Flow (Handle, Name, Avatar, Sprache, Club)
- [x] WalletProvider + Providers Composition
- [x] Session Hydration aus sessionStorage

### Service Layer (komplett)
- [x] `services/players.ts` (CRUD + Search + Mapper + createPlayer + Cache 5min)
- [x] `services/wallet.ts` (Wallet + Holdings + Transactions + Cache 2min)
- [x] `services/trading.ts` (Buy/Sell/Cancel via RPCs + Cache Invalidation)
- [x] `services/profiles.ts` (CRUD + Handle-Check + getByHandle + Cache 2min)
- [x] `services/events.ts` (Events + User-Joins + createEvent + updateStatus + Cache 10min)
- [x] `services/lineups.ts` (CRUD + Participants + Player Usage + Status-Check)
- [x] `services/scoring.ts` (scoreEvent, resetEvent, getEventLeaderboard, getPlayerGameweekScores)
- [x] `services/ipo.ts` (IPO CRUD + Purchases + Cache 5min)
- [x] `services/research.ts` (Research Posts CRUD + Unlock + Cache 2min) ✅ 12.02.2026
- [x] `services/club.ts` (Club-spezifische Queries)

### Trading ✅
- [x] Buy from Market (ipo_price, nicht floor_price)
- [x] Place Sell Order (atomare RPC)
- [x] Buy from Order (User-to-User RPC)
- [x] Cancel Order (+ Floor recalc)
- [x] ipo_price Spalte (fester Preis, unabhängig von Markt)
- [x] Trade-/Transaction-Logs (append-only)

### IPO System ✅
- [x] `ipos` + `ipo_purchases` Tabellen + RLS
- [x] `buy_from_ipo` RPC (atomarer Kauf)
- [x] IPOBuyWidget + TransferBuyWidget auf Spieler-Detailseite
- [x] Market Page: IPO-Karten aus DB

### Fantasy ✅
- [x] Events in DB (3 Pilot-Test-Events)
- [x] Lineup-Builder mit echten Spielern aus DB
- [x] Lineup speichern (Upsert + Formation)
- [x] DPC Lock System (Spieler in aktiven Lineups gesperrt)
- [x] Scoring RPC v2 (kanonische Scores pro Spieler)
- [x] `player_gameweek_scores` Tabelle für Score-History
- [x] `perf_l5`/`perf_l15` Update nach Scoring
- [x] Event Reset RPC für Testing (mit Timestamp-Shift)
- [x] Leaderboard aus DB
- [x] Spieltag-Bewertungen auf Spieler-Detailseite
- [x] Status-Check: Anmeldung bei beendeten Events geblockt
- [x] **SQL deployed:** `score-event.sql` + `reset-event.sql` ✅ 10.02.2026
- [x] **Dashboard Pitch-Visualisierung** ✅ 11.02.2026
  - Aufstellung als SVG-Spielfeld mit Spieler-Kreisen + Score-Badges
  - Multi-Event Switcher (Pill-Buttons)
  - LED-Bandenwerbung seitlich
  - Neuer `ScoredLineupData` Type + paralleles Laden aller scored Lineups
- [x] **Event Lifecycle Fixes** ✅ 11.02.2026
  - Doppelte DB-Trigger entfernt (`trg_sync_event_entries`)
  - Server-Cache busting nach Score/Reset/Join/Leave
  - Bottom Action Bar: ended-States (ausgewertet, ausstehend, Ergebnisse)
  - Event Card Status-Chips: "Ausgewertet" (lila) / "Beendet" (grau)
  - Countdown Guards für ended Events
  - Action Buttons für ended+joined Events
  - Wallet-Cache Invalidierung nach Score/Reset
  - `reset_event` UUID-Cast Fix
  - Optimistischer Participant-Count (Join/Leave/Update)

### Pages auf echte Daten
- [x] Home `/` – Spieler, Holdings, Wallet, Transactions, Events
- [x] Market `/market` – Spieler, Orders, IPOs, Mein Team (Holdings)
- [x] Player `/player/[id]` – komplett (inkl. GW-Scores, IPO, Orders, Trades)
- [x] Fantasy `/fantasy` – Events, Holdings, Lineups, Scoring, Leaderboard
- [x] Club `/club` – Spieler, Follower, Holdings, Trades
- [x] Profile `/profile` – Wallet, Holdings, Settings, Aktivität (Transaktionen)
- [x] Profile `/profile/[handle]` – Öffentliches Profil (Übersicht, Research, Aktivität, Follow-Button) ✅ 13.02.2026
- [x] Community `/community` – Posts, Votes, Leaderboard, Following aus DB ✅ 12.02.2026

### Reputation & Engagement ✅
- [x] `services/social.ts` (Follows + Stats + Leaderboard + Achievements + Cache)
- [x] `services/votes.ts` (Club-Voting + castVote RPC)
- [x] `services/posts.ts` (Community Posts + votePost RPC)
- [x] `lib/achievements.ts` (18 Achievement-Definitionen)
- [x] Profile: ScoreCircles + Achievements + Follower ✅ 12.02.2026
- [x] Club: Echte Abstimmungen + CreateVote-Modal ✅ 12.02.2026
- [x] Community: 5 Tabs (Posts, Following, Votes, Leaderboard) ✅ 12.02.2026
- [x] Home: Scout Score + Leaderboard Sidebar ✅ 12.02.2026
- [x] Achievement Engine (auto-trigger nach Trades) ✅ 12.02.2026

### SQL Scripts (76 Migrationen deployed)
- [x] `pilot-schema.sql` – 8 Tabellen + RLS + Triggers
- [x] `seed-players.sql` – 25 Sakaryaspor-Spieler
- [x] `trading-functions.sql` – 4 atomare Trading RPCs
- [x] `fix-trades-seller.sql` – seller_id nullable
- [x] `seed-events.sql` – 5 Pilot-Events (alte gelöscht, 3 neue erstellt)
- [x] `add-player-status.sql` – status Spalte
- [x] `add-lineup-formation.sql` – formation Spalte
- [x] `sync-event-state.sql` – Status-Sync + Triggers
- [x] `fix-lineups-delete-policy.sql` – DELETE RLS Policy
- [x] `fix-trading-price-model.sql` – ipo_price + Trading Fix
- [x] `ipo-system.sql` – IPO Tabellen + RPCs
- [x] `score-event.sql` – deployed ✅ 10.02.2026
- [x] `reset-event.sql` – deployed ✅ 10.02.2026
- [x] `drop_duplicate_lineup_trigger` – deployed via MCP ✅ 11.02.2026
- [x] `reset_event_v2_shift_timestamps` – deployed via MCP ✅ 11.02.2026
- [x] `fix_reset_event_uuid_cast` – deployed via MCP ✅ 11.02.2026
- [x] `atomic_wallet_operations` – deployed via MCP ✅ 11.02.2026
- [x] `create_user_follows` – deployed via MCP ✅ 12.02.2026
- [x] `create_user_achievements` – deployed via MCP ✅ 12.02.2026
- [x] `create_user_stats` – deployed via MCP ✅ 12.02.2026
- [x] `create_club_votes` – deployed via MCP ✅ 12.02.2026
- [x] `create_vote_entries` – deployed via MCP ✅ 12.02.2026
- [x] `create_posts` – deployed via MCP ✅ 12.02.2026
- [x] `create_post_votes` – deployed via MCP ✅ 12.02.2026
- [x] `create_follow_unfollow_rpcs` – deployed via MCP ✅ 12.02.2026
- [x] `create_vote_post_rpc` – deployed via MCP ✅ 12.02.2026
- [x] `create_cast_vote_rpc` – deployed via MCP ✅ 12.02.2026
- [x] `create_refresh_user_stats_rpc` – deployed via MCP ✅ 12.02.2026
- [x] `create_get_club_dashboard_stats_rpc` – deployed via MCP ✅ 12.02.2026
- [x] `create_feedback` – deployed via MCP ✅ 12.02.2026
- [x] `create_research_posts` – deployed via MCP ✅ 12.02.2026
- [x] `create_research_unlocks` – deployed via MCP ✅ 12.02.2026
- [x] `create_unlock_research_rpc` – deployed via MCP ✅ 12.02.2026
- [x] `create_research_ratings_table` – deployed via MCP ✅ 12.02.2026
- [x] `add_rate_research_rpc` – deployed via MCP ✅ 12.02.2026
- [x] `add_track_record_columns` – deployed via MCP ✅ 12.02.2026
- [x] `add_resolve_expired_research_rpc` – deployed via MCP ✅ 12.02.2026
- [x] `fix_wallet_rpcs_add_transaction_logging` – deployed via MCP ✅ 12.02.2026
- [x] `fix_reset_event_refund_entry_fees` – deployed via MCP ✅ 12.02.2026
- [x] `create_pbt_tables` – deployed via MCP ✅ 12.02.2026
- [x] `create_credit_pbt_function` – deployed via MCP ✅ 12.02.2026
- [x] `update_trading_rpcs_with_fees` – deployed via MCP ✅ 12.02.2026
- [x] `create_community_poll_tables` – deployed via MCP ✅ 12.02.2026
- [x] `create_cast_community_poll_vote_rpc` – deployed via MCP ✅ 12.02.2026
- [x] `add_post_replies` – deployed via MCP ✅ 12.02.2026
- [x] `add_post_category` – deployed via MCP ✅ 12.02.2026
- [x] `add_research_category` – deployed via MCP ✅ 12.02.2026
- [x] `fix_function_search_path` – deployed via MCP ✅ 12.02.2026
- [x] `fix_rls_auth_uid_initplan` – deployed via MCP ✅ 12.02.2026
- [x] `add_missing_fk_indexes` – deployed via MCP ✅ 12.02.2026
- [x] `merge_research_unlocks_select_policies` – deployed via MCP ✅ 12.02.2026
- [x] `create_notifications_table` – deployed via MCP ✅ 12.02.2026
- [x] `create_mission_tables` – deployed via MCP ✅ 13.02.2026
- [x] `create_mission_rpcs` – deployed via MCP ✅ 13.02.2026
- [x] `seed_mission_definitions` – deployed via MCP ✅ 13.02.2026
- [x] `create_clubs_table` – deployed via MCP ✅ 13.02.2026
- [x] `create_club_admins_table` – deployed via MCP ✅ 13.02.2026
- [x] `seed_sakaryaspor_club` – deployed via MCP ✅ 13.02.2026
- [x] `add_club_id_to_players` – deployed via MCP ✅ 13.02.2026
- [x] `add_club_id_to_club_votes` – deployed via MCP ✅ 13.02.2026
- [x] `add_club_id_to_events` – deployed via MCP ✅ 13.02.2026
- [x] `add_club_id_to_fee_config` – deployed via MCP ✅ 13.02.2026
- [x] `add_club_id_to_content_tables` – deployed via MCP ✅ 13.02.2026
- [x] `add_club_id_to_profiles` – deployed via MCP ✅ 13.02.2026
- [x] `create_club_admin_rpcs` – deployed via MCP ✅ 13.02.2026
- [x] `create_bounties_table` – deployed via MCP ✅ 13.02.2026
- [x] `create_bounty_submissions_table` – deployed via MCP ✅ 13.02.2026
- [x] `create_bounty_rpcs` – deployed via MCP ✅ 13.02.2026
- [x] `create_bounty_auto_close` – deployed via MCP ✅ 13.02.2026
- [x] `seed_bounty_missions` – deployed via MCP ✅ 13.02.2026
- [x] `add_liquidation_columns` – deployed via MCP ✅ 13.02.2026
- [x] `create_liquidation_tables` – deployed via MCP ✅ 13.02.2026
- [x] `fix_constraints_for_liquidation` – deployed via MCP ✅ 13.02.2026
- [x] `create_liquidation_rpcs` – deployed via MCP ✅ 13.02.2026
- [x] `community_moderation` – deployed via MCP ✅ 13.02.2026
- [x] `streak_bonus_system` – deployed via MCP ✅ 13.02.2026

---

## Bekannte Bugs
- ~~TypeScript `any` an mehreren Stellen~~ ✅ (11.02.2026 — 0 `any` in src/)
- ~~Mobile: Layout teilweise gebrochen~~ ✅ (11.02.2026 — alle Seiten mobile-optimiert)
- ~~Fantasy Page: ~3.000 Zeilen (FantasyContent.tsx), Refactoring nötig~~ ✅ (11.02.2026 — 12 Dateien in `src/components/fantasy/`, Orchestrator ~690 Zeilen)
- ~~Fantasy: History-Tab noch Mock-Daten~~ ✅ (11.02.2026 — echte Daten aus DB, Mock-Daten + tote Components entfernt)
- Fantasy: Presets nur in localStorage — **bewusste Pilot-Entscheidung** (50 Beta-Tester auf eigenen Geräten, Post-Pilot DB evaluieren)
- ~~Market Page hat noch lokale Player-Components statt shared PlayerDisplay~~ ✅ (11.02.2026 — shared PlayerDisplay genutzt)
