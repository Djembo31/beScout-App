---
name: User Journey Map
description: SSOT — 12 critical Beta-User-Journeys mit Page-Path, RPCs, Services, Risk-Zones und Status. Generiert fuer Operation Beta Ready Phase 0.
type: project
status: complete
created: 2026-04-15
owner: CTO (Claude) via 2 Explore Agents
---

# User Journey Map — Operation Beta Ready Phase 0

**Mission:** Jede Journey End-to-End verifizierbar, von Page-Entry bis DB-Write, mit allen Layers kartiert. Basis fuer E2E-QA + Regression-Tests.

**Quellen:**
- [feature-map.md](./feature-map.md) — Frontend-Inventar
- [service-map.md](./service-map.md) — Backend-Inventar
- [operation-beta-ready.md](./operation-beta-ready.md) — Phase 2 12-Journey-Definition

---

## Beta-Critical Journeys (8 Critical + 4 High/Medium)

| # | Journey | Pages | Critical | Status (2026-04-15) |
|---|---------|-------|----------|--------------------|
| 1 | Onboarding | /welcome → /onboarding → /home | 🔴 | ✅ J1 done |
| 2 | Erster IPO-Kauf | /market → IPO-Card → BuyConfirm → Bestand | 🔴 | ✅ J2 done |
| 3 | Erster Sekundaer-Trade | /market → /player/[id] → BuyOrder/Buy → Holding | 🔴 | ✅ J3 done |
| 4 | Fantasy-Event | /fantasy → Event → Lineup → Result → Reward | 🔴 | ✅ J4 done (Exploit fixed) |
| 5 | Mystery Box taeglich | /home → Modal → Open → Reward → Daily-Cap | 🟡 | ✅ J5 done (AR-42/46 fixed) |
| 6 | Profile + Following | /profile → /profile/[handle] → Follow → Timeline | 🟡 | ✅ J6 done |
| 7 | Mission/Streak | /missions → Progress → Complete → Claim | 🟡 | ✅ J7 done |
| 8 | Verkaufen + Orderbuch | /market → /player/[id] → SellModal → Match | 🔴 | ✅ J8 done (DRY-Refactor) |
| 9 | Liga-Rang | /home Widget → /profile Rang → Tier-Update | 🟢 | ✅ J9 done |
| 10 | Watchlist + Notifications | Add → Alert → Notify → Click | 🟢 | ✅ J10 done |
| 11 | Equipment + Inventar | MysteryBox → Equip → Lineup-Effekt | 🟡 | ✅ J11 done |
| 12 | Multi-League Discovery | /market Liga-Filter → Cross-League | 🟢 | ✅ Phase 3 Cross-Cutting |

---

## J1 — Onboarding

**Flow:** `/welcome` → OAuth/Email → `/onboarding` → Handle + Name + Avatar + Lang + Referral + Club → `/` (Home)

**Pages:** welcome/page.tsx, (auth)/login/page.tsx, onboarding/page.tsx, (app)/page.tsx
**Key Components:** LoginContent, OnboardingContent, Handle-Validator (debounced), AvatarUpload, Language-Selector, ReferralCode-Lookup, Club-Selection-Grid, OnboardingChecklist
**Services:** auth.ts, profiles.ts (createProfile, checkHandleAvailable), avatars.ts (uploadAvatar), referral.ts (getProfileByReferralCode, applyClubReferral), missions.ts, welcomeBonus.ts, notifications.ts
**RPCs:** create_profile, applyClubReferral, claim_welcome_bonus
**Geo-Logic:** `/onboarding` via middleware, TIER-Check (RESTRICTED blocks Paid)
**Known Risks (J1 live):**
- Contract-Change-Propagation: applyClubReferral throw muss non-blocking wrapped sein (best-effort)
- i18n-Key-Leak: `err.message === 'handleReserved'` im t() resolven
- RESERVED_HANDLES Validierung enforced
- TradingDisclaimer auf 6 Entry-Pages (Welcome+Login+Onboarding+Home+FoundingPass+WelcomeBonusModal)

---

## J2 — Erster IPO-Kauf

**Flow:** `/market` Marktplatz → IPO-Card Click → BuyConfirmModal → Purchase → Holding + TX

**Pages:** market/page.tsx
**Key Components:** MarketContent → MarktplatzTab → PlayerIPOCard, BuyConfirmModal (Fee-Breakdown 10/5/85), ClubVerkaufSection
**Services:** ipo.ts (getActiveIpos, buyFromIpo, getIpoForPlayer), trading.ts (mapRpcError), activityLog.ts, missions.ts, notifications.ts
**RPCs:** buy_from_ipo (SECURITY DEFINER), get_price_cap
**Known Risks (J2 live):**
- 4.263 Spieler post-Bulk-IPO-Launch (AR-5), 4166/4285 Spieler tradebar = 97%
- players.ipo_price ↔ ipos.price sync via trigger (AR-10)
- Zero-Price Guards aktiv (AR-6)
- Fee-Transparenz 10/5/85 im Modal (AR-9)
- IPO-Vokabel "Erstverkauf" (DE) / "Kulüp Satışı" (TR) user-facing, "IPO" code-intern OK (AR-7)
- Multi-League: Liga-Logos in IPO-Components propagiert

---

## J3 — Erster Sekundaer-Trade (BuyOrder/Buy)

**Flow:** `/market` → Player-Card → `/player/[id]` → BuyModal → Submit → Holding-Update

**Pages:** player/[id]/page.tsx, market/page.tsx
**Key Components:** TradingCardFrame (Front+Back mit Liga-Logo), PlayerHero, BuyModal (preventClose), BuyOrderModal, OrderbookDepth (Angebots-Tiefe), TransferListSection
**Services:** trading.ts (buyFromMarket, buyFromOrder, placeBuyOrder), orders.ts, players.ts, social.ts (for achievement trigger)
**RPCs:** buy_from_market, buy_from_order, place_buy_order, get_price_cap
**Known Risks (J3 live):**
- i18n-Key-Leak: handleBuy/handleSell/handleCancelOrder/placeBuyOrder alle t() resolven (J2 hatte nur handleBuy)
- Modal preventClose bei `isPending` (ESC/Backdrop während DB-TX)
- Circular-Trade-Guard, 1-SC-Limit entfernt (AR-19)
- 529 Orphan ipo_id gefixt (AR-20)
- BuyOrder/LimitOrder aus Beta Feature-Flag (AR-11/23)
- Multi-League: LeagueBadge auf TradingCardFrame Front+Back + PlayerHero + TransferListSection

---

## J4 — Fantasy-Event-Teilnahme

**Flow:** `/fantasy` → Event-Card → FixtureDetailModal → LineupBuilder → Save → Scored → Reward

**Pages:** fantasy/page.tsx (GeoGate: TIER_FREE blocks Paid), manager/page.tsx (Aufstellen)
**Key Components:** FantasyContent, EventBrowser, FixtureDetailModal (Formation/Ranking Tabs), LineupBuilder (PitchView + PlayerPicker + FormationSelector), JoinConfirmDialog, ScoreBreakdown, SynergyPreview, ErgebnisseTab, FantasyDisclaimer, ConfirmDialog (statt native alert/confirm), PAID_FANTASY_ENABLED env-flag
**Services:** fantasy.ts, fixtures.ts, scoring.ts, wildcards (features/fantasy NOT in src/lib/services), lockEventEntry
**RPCs:** lock_event_entry, earn_wildcards (FIXED: REVOKE+auth.uid Guard AR-27 AKUT), spend_wildcards, get_wildcard_balance, refund_wildcards_on_leave, admin_grant_wildcards, calculate_event_score, pay_event_rewards
**Cron:** gameweek-sync (AR-26 fixed — Multi-League activeLeagues loop), scoring-cron
**Known Risks (J4 live):**
- SECURITY EXPLOIT (FIXED AR-27): earn_wildcards anon konnte 99.999 Wildcards minten. Alle 5 Wildcard-RPCs jetzt REVOKE+auth.uid
- Multi-League Cron fixed: 7 Ligen, 114 Clubs (AR-26)
- 12 Events phantom pgs_count=0 (AR-29)
- lineups RLS whitelist (AR-30)
- Paid-Fantasy Feature-Flag auf 6 UI-Touchpoints
- Gluecksspiel-Vokabel-Sweep: gewinnen/prize/preis/prämie/kazan* neutralisiert (AR-32+39)
- FantasyDisclaimer auf 7 Integrationen
- Post-Event Reinvest-CTA neutralisiert (AR-36)
- ConfirmDialog statt window.alert/confirm (6 Stellen EventDetailModal + useLineupSave + AufstellenTab)
- Multi-League: FantasyEvent + UserDpcHolding Types haben `league*` Fields (J4 erweitert), LeagueBadge × 4

---

## J5 — Mystery Box taeglich

**Flow:** `/home` MysteryBox-Card → Modal → Open → Reward (equipment/cosmetic/ticket/bcredit) → Daily-Cap

**Pages:** (app)/page.tsx (Home), inventory/page.tsx (?tab=history)
**Key Components:** MysteryBoxModal, MysteryBoxHistorySection, MysteryBoxDisclaimer (legal/), REWARD_PREVIEW (dynamic mit DEFAULT_DROP_PERCENTS)
**Services:** mysteryBox.ts (openMysteryBox, getMysteryBoxConfig, getUserMysteryBoxResults)
**RPCs:** open_mystery_box_v2 (SECURITY DEFINER, FIXED: INSERT user_equipment `rank` AR-42 + transactions `amount`+`balance_after` AR-42b), get_mystery_box_drop_rates (NEU AR-48)
**Env-Flags:** PAID_MYSTERY_BOX_ENABLED (4-Layer Defense-in-Depth AR-49)
**Known Risks (J5 live):**
- AR-42 Equipment-Drops 6d tot fixed (column rank vs equipment_rank)
- AR-42b bCredits-Drops NIE funktional fixed (amount+balance_after)
- AR-46 MysteryBoxRarity 'uncommon' Legacy-Safe (3 Live-Rows, Type-Union + RARITY_CONFIG green-Theme)
- AR-44 REVOKE-Template Pflicht dokumentiert
- AR-45 DROP FUNCTION open_mystery_box(boolean) v1 legacy
- mystery_box_config RLS-Lock (kein public SELECT, service_role bypass)
- Daily-Cap server-authoritative
- useMysteryBoxDropRates Hook staleTime 5min

---

## J6 — Profile + Public + Following

**Flow:** `/profile` → `/profile/[handle]` → FollowBtn → Timeline + Realtime

**Pages:** profile/page.tsx, profile/[handle]/page.tsx, profile/settings/page.tsx
**Key Components:** ProfileView (isSelf), ProfileHero, ProfileStats (Rang Badge, 3-Dim Elo), FollowListModal, FollowBtn
**Services:** profiles.ts (getProfileByHandle), social.ts (followUser, unfollowUser, getUserSocialStats), transactions.ts (PUBLIC_TX_TYPES)
**RPCs:** get_profile_by_handle, follow_user, unfollow_user, get_follower_count, get_following_count
**Known Risks (J6 live):**
- AR-50 holdings public-read policy fix
- AR-53 Realtime-Subscription für Timeline
- transactions Cross-User public-read whitelist (Pattern J4 B3 Commit 9264bb2)
- Wallet-Balance nur self-visible
- Handle-Change Cooldown enforced

---

## J7 — Mission / Streak

**Flow:** `/missions` → Mission-Card → Progress → Complete → Claim Reward

**Pages:** missions/page.tsx, (app)/page.tsx (Home-Widgets)
**Key Components:** DailyChallengeCard, MissionBanner, ScoreRoadCard, AchievementsSection, StreakMilestoneBanner, MissionHintList, MissionDisclaimer
**Services:** missions.ts (getUserMissions, claimMissionReward, invalidateMissionData), dailyChallenge.ts, streaks.ts, gamification.ts, achievements.ts
**RPCs:** claim_mission_reward, submit_daily_challenge, get_user_streak, claim_score_road
**Known Risks (J7 live):**
- AR-53 mission/streak REVOKE-Block
- AR-54 TR-i18n Schema + Backfill 25 Missions (locale-aware title_tr)
- AR-55 Streak-description Gluecksspiel-frei (topla/al statt kazan)
- AR-56 MissionDisclaimer
- Mission-Scoping Wiki-Doku (AR-57 post-Beta done)

---

## J8 — Verkaufen + Orderbuch

**Flow:** `/market` Portfolio → Holding-Click → `/player/[id]` → SellModal → Match → History

**Pages:** market/page.tsx, player/[id]/page.tsx
**Key Components:** SellModalCore (DRY shared, -114 LOC), SellModalWrapper, LimitOrderModal, PlaceSellOrderModal, OrderbookDepth ("Angebots-Tiefe"), Fee-Breakdown
**Services:** trading.ts (placeSellOrder, cancelOrder, sellToOrder, getAllOpenSellOrders), orders.ts
**RPCs:** place_sell_order, sell_to_order, cancel_sell_order, match_sell_order
**Known Risks (J8 live):**
- SellModal DRY-Refactor (AR-57 post-Beta, SellModalCore + Wrapper)
- preventClose + Disclaimer + Fee-Breakdown in beiden Modalen
- AR-53 place_sell_order error-cleanup (orderCannotBeCancelled)
- AR-54 Orderbuch→Angebots-Tiefe Wording
- AR-55 Rate-Limit Tier-based (free=10/20, bronze=15/30, silber=20/50, gold=100/200)
- AR-56 Fee-Breakdown 3.5%/1.5%/1%

---

## J9 — Liga-Rang

**Flow:** `/home` Rang-Widget → `/profile` Rang-Badge → Tier-Update via Elo

**Pages:** (app)/page.tsx, profile/page.tsx, rankings/page.tsx
**Key Components:** RangBadge (3-Dim Elo), SelfRankCard, GlobalLeaderboard, FriendsLeaderboard, ClubLeaderboard, MonthlyWinners, LastEventResults, PlayerRankings
**Services:** gamification.ts (calculateFanRank, getScoreHistory), airdrop.ts
**RPCs:** calculate_fan_rank (sanitized DPC→SC), refresh_airdrop_score (sanitized)
**Known Risks (J9 live):**
- 54+ autonome Healer-Fixes + i18n-Critical in J9-Wave
- Multi-League Rankings-Filter live

---

## J10 — Watchlist + Notifications

**Flow:** Watchlist-Add → Price-Alert Trigger → In-App + Push Notify → Click → Player-Page

**Pages:** (app)/page.tsx (Home), market/page.tsx (Watchlist-Tab), notifications via Bell
**Key Components:** WatchlistView, PriceAlertModal, NotificationBell, NotifText (locale-aware)
**Services:** watchlist.ts, notifications.ts, priceAlerts.ts, pushSubscriptions.ts
**RPCs:** add_to_watchlist, remove_from_watchlist, set_price_alert
**Trigger:** notify_watchlist_price_change (DB trigger)
**Known Risks (J10 live):**
- priceAlert i18n-Keys fixed (f23db39)
- notifText locale-aware
- Notification-Items Liga-Logo P2

---

## J11 — Equipment + Inventar

**Flow:** MysteryBox-Reward oder Shop → Inventory-Equip auf Player → Lineup-Effekt

**Pages:** inventory/page.tsx, manager/page.tsx (Aufstellen)
**Key Components:** EquipmentSection, CosmeticsSection, WildcardsSection, MysteryBoxHistorySection
**Services:** equipment.ts, cosmetics.ts, inventory.ts
**RPCs:** equip_to_slot, unequip_from_slot, get_user_equipment
**Known Risks (J11 live):**
- AR-42 Equipment-Column rank fixed
- 54+ autonome Fixes J9+J10+J11 Healer-Wave

---

## J12 — Multi-League Discovery

**Flow:** `/market` CountryBar+LeagueBar → Cross-Liga Spieler-Filter + Compare

**Pages:** market/page.tsx, clubs/page.tsx, compare/page.tsx
**Key Components:** CountryBar, LeagueBar, BestandView, KaderTab, MarktplatzTab Liga-Filter, ClubGrid (grouped by league)
**Services:** players.ts, club.ts, fixtures.ts
**RPCs:** get_clubs_with_stats, get_next_fixtures_by_club
**Known Risks (J12 live):**
- 7 Ligen, 134 Clubs, 4.263 Spieler live (Commit 8a5014d)
- CountryBar+LeagueBar in MarktplatzTab+BestandView+KaderTab live
- Clubs-Page Liga-Gruppierung P2 post-Beta
- Cross-Liga Compare P2 post-Beta

---

## Cross-Cutting Blindspots (Phase 0 2026-04-15)

**Frontend:**
1. `/compare` useRawPlayers — evtl. keine Pagination (ALLE Spieler geladen)
2. `/player/[id]` PlayerContent Detail-Implementation nicht vollstaendig verifiziert
3. FantasyContent Child-Tabs (EventsTab/PredictionsTab/HistoryTab/ErgebnisseTab/MitmachenTab) — GeoGate + dynamic import, Full-Verify pending
4. Modal Deep-Linking — Modals persistieren nicht im URL
5. `/notifications`, `/wallet`, `/help` — keine dedizierten Pages

**Backend:**
1. **HIGH-RISK platformAdmin.ts** — Treasury adjust_user_wallet, MUSS audit-logged + RLS-gated
2. **HIGH-RISK Trading 12 RPCs** — ±Millionen cents, alle 12 REVOKE-Schema verifizieren
3. **HIGH-RISK Bounty/Offer Escrow** — Lock-Unlock RPC atomic, E2E Rollback-Test fehlt
4. **Fantasy Leagues — 0 RPCs** (read-only Services): Join/Leave API unklar, Frontend-Agent muss klaeren
5. **Wildcards nicht in src/lib/services/** — nur features/fantasy/ lokal

**Totals (2026-04-15):**
- 61 Services, 93 RPCs, 45 Query-Hooks, 82 DB-Types, ~20 Query-Key Domains
- 22 Geld-Operationen (Trading 12 + IPO 3 + Bounty 5 + Liquidation 2)
- 7 Admin-Only RPCs
- 337 Frontend-Components, 31 Routes, 13 Custom Hooks

---

## Beta-Gate Verification Matrix

Vor 50-Mann closed Beta MUSS pro Journey gruen sein:

| Check | J1 | J2 | J3 | J4 | J5 | J6 | J7 | J8 | J9 | J10 | J11 | J12 |
|-------|----|----|----|----|----|----|----|----|----|----|----|----|
| Page lädt ohne Error | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Alle RPCs REVOKE/GRANT | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| i18n DE+TR gepflegt | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Compliance-Wording | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| E2E Playwright gegen bescout.net | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 |

**🟡 Playwright E2E pending** — nach git push + Vercel deploy in naechster Session.
