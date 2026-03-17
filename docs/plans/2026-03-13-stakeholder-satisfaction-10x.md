# BeScout Stakeholder Satisfaction 10/10 Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Raise stakeholder satisfaction from 6.2/10 to 10/10 by fixing discoverability, filling real gaps, and polishing the experience.

**Core Insight:** 50%+ of "missing" features already exist but are invisible to users. The highest-ROI work is making existing features discoverable, THEN filling real gaps.

**Architecture:** 5 Waves, ordered by impact-per-hour. Each wave is independently deployable.

**Tech Stack:** Next.js 14 / TypeScript / Tailwind / Supabase / next-intl / lucide-react

---

## Wave 1: DISCOVERABILITY — "Features sichtbar machen" (Impact: 10/10, Effort: S)

> These features EXIST but users can't find them. Highest ROI work in the entire plan.

### Task 1.1: Interactive Guided Tour (Onboarding)

**Problem:** Users land on Home and don't know what to do. Price Charts, Orderbuch, P&L, Predictions, Chips — all exist but nobody finds them.

**Solution:** Add a guided tour using `data-tour-id` attributes + a lightweight tour component.

**Files:**
- Create: `src/components/onboarding/GuidedTour.tsx`
- Modify: `src/app/(app)/page.tsx` (add tour trigger for new users)
- Modify: `src/app/(app)/market/page.tsx` (add data-tour-id to key elements)
- Modify: `src/components/fantasy/FantasyContent.tsx` (add data-tour-id)

**Tour Steps (10 stops):**
1. **Home** — "Das ist dein Dashboard. Hier siehst du dein Portfolio und den naechsten Spieltag."
2. **Balance Pill** — "Dein Guthaben in bCredits. Damit kaufst du DPCs und nimmst an Events teil."
3. **Markt Tab** — "Hier kaufst und verkaufst du Spieler-Vertraege (DPCs)."
4. **Markt → Kaufen** — "Club Verkauf = Neue DPCs vom Verein. Transferliste = Von anderen Usern."
5. **Spieltag** — "Fantasy-Events: Stelle dein Team auf und sammle Punkte am Spieltag."
6. **Spieltag → Predictions** — "Tippe auf Spielergebnisse und verdiene Tickets bei richtigen Vorhersagen."
7. **Spieltag → Chips** — "Chips geben dir Vorteile: Triple Captain, Wildcard und mehr."
8. **Community** — "Schreibe Analysen, verdiene bCredits und baue deine Reputation auf."
9. **Missionen** — "Taegliche Aufgaben, Streak-Belohnungen und Mystery Boxes."
10. **Profil** — "Dein Rang, dein Portfolio-P&L und deine Achievements."

**Implementation:**
- Lightweight: No external library. CSS highlight (box-shadow + backdrop) + tooltip positioned relative to `data-tour-id` elements.
- Trigger: `localStorage.getItem('bescout-tour-completed')` check on Home mount.
- Skip button + progress dots.
- Mobile: Same tour, tooltip positioned above/below element.

**Acceptance:**
- [ ] Tour starts automatically for users without `bescout-tour-completed` flag
- [ ] All 10 steps navigate correctly across pages
- [ ] Mobile: tooltips don't overflow viewport
- [ ] "Ueberspringen" button works, "Fertig" sets localStorage flag
- [ ] Tour restartable from Settings page

---

### Task 1.2: Glossar / Help-System

**Problem:** DPC, bCredits, IPO, PBT, L5, Elo — users don't know these terms.

**Solution:** Glossary modal accessible from every page + inline term tooltips.

**Files:**
- Create: `src/components/help/Glossary.tsx`
- Create: `src/components/help/TermTooltip.tsx`
- Modify: `src/components/layout/TopBar.tsx` (add help icon)
- Modify: `messages/de.json` (add glossary section)
- Modify: `messages/tr.json` (add glossary section)

**Terms (15 essential):**
| Term | DE Erklaerung |
|------|--------------|
| DPC | Digitaler Spieler-Vertrag. Dein Anteil an einem Fussballspieler. |
| bCredits | Plattform-Guthaben zum Kaufen, Handeln und Teilnehmen. |
| IPO | Erstverkauf — der Verein bietet neue DPCs zum Festpreis an. |
| Floor Price | Der niedrigste Preis, zu dem ein DPC gerade angeboten wird. |
| L5 Score | Performance der letzten 5 Spiele (0-10). |
| PBT | Player Bound Treasury — Gebuehren-Pool pro Spieler. |
| Elo Score | Dein Skill-Rating in 3 Dimensionen: Trader, Manager, Analyst. |
| Lineup | Deine Aufstellung fuer ein Fantasy-Event. |
| Prediction | Deine Vorhersage fuer ein Spielergebnis. |
| Chip | Bonus-Karte die dir Vorteile in Fantasy-Events gibt. |
| Streak | Tage in Folge eingeloggt. Laengere Streaks = bessere Belohnungen. |
| Tickets | Zweitwaehrung, verdient durch Aktivitaet. Fuer Mystery Boxes und Chips. |
| Bounty | Auftrag von einem Club oder User — liefere Analyse, verdiene bCredits. |
| Research | Premium-Analyse hinter Paywall. Autor verdient bei jedem Unlock. |
| Success Fee | Belohnung fuer DPC-Halter wenn ein Spieler transferiert wird. |

**Implementation:**
- `<Glossary>` modal with search, grouped by category (Trading, Fantasy, Gamification)
- `<TermTooltip term="DPC">` wrapper component, shows underline-dotted + popover on hover/tap
- Help icon (HelpCircle) in TopBar between Feedback and Profile
- Accessible via Cmd+? keyboard shortcut (desktop)

---

### Task 1.3: Fantasy Scoring Rules Page

**Problem:** Users don't know how points are calculated. "Wie viele Punkte gibt ein Tor?"

**Solution:** Scoring rules component shown in Fantasy page + Event Detail modal.

**Files:**
- Create: `src/components/fantasy/ScoringRules.tsx`
- Modify: `src/components/fantasy/FantasyContent.tsx` (add rules link)
- Modify: `src/components/fantasy/EventDetailModal.tsx` (add rules tab or section)
- Modify: `messages/de.json` + `messages/tr.json`

**Content:**
```
| Aktion | GK | DEF | MID | ATT |
|--------|-----|-----|-----|-----|
| Einsatz >60min | +2 | +2 | +2 | +2 |
| Einsatz <60min | +1 | +1 | +1 | +1 |
| Tor | +10 | +6 | +5 | +4 |
| Assist | +3 | +3 | +3 | +3 |
| Clean Sheet | +5 | +4 | +1 | — |
| Gelbe Karte | -1 | -1 | -1 | -1 |
| Rote Karte | -3 | -3 | -3 | -3 |
| Eigentor | -2 | -2 | -2 | -2 |
| Elfmeter verschossen | -2 | -2 | -2 | -2 |
| Elfmeter gehalten | +5 | — | — | — |
| Bonus: Bewertung >8 | +2 | +2 | +2 | +2 |
| Captain Multiplikator | 1.5x | 1.5x | 1.5x | 1.5x |
```

**Implementation:**
- Collapsible section "Wie werden Punkte berechnet?" with info icon
- Accessible from: Fantasy page header + Event Detail Overview tab
- Responsive table, scrollable on mobile

---

### Task 1.4: Salary Cap Display in Lineup Builder

**Problem:** Events have salary cap but users don't see it during lineup selection.

**Files:**
- Modify: `src/components/fantasy/EventDetailModal.tsx`
- Modify: `src/components/fantasy/LineupPanel.tsx` (if exists)

**Implementation:**
- Show salary cap bar: `Used: 45,000 / 50,000 bCredits` with progress bar
- Color: green → amber → red as cap approaches
- Show per-player "salary" (= floor price or IPO price) next to name in picker

---

### Task 1.5: Watchlist View Page

**Problem:** Users can heart players but can't see all their watchlisted players in one view.

**Files:**
- Create: `src/components/market/WatchlistView.tsx`
- Modify: `src/app/(app)/market/page.tsx` (add Watchlist sub-tab or section)

**Implementation:**
- New sub-tab "Watchlist" in Market → Mein Kader section (after Team, Bestand, Angebote)
- Shows all watchlisted players with: Name, Club, Floor Price, 24h Change, L5 Score
- Quick-buy button + remove from watchlist
- Empty state: "Keine Spieler auf der Watchlist. Tippe auf das Herz-Symbol bei einem Spieler."

---

## Wave 2: ONBOARDING & RETENTION — "Erste 7 Tage perfekt machen" (Impact: 9/10, Effort: M)

### Task 2.1: Welcome Bonus UI Flow

**Problem:** Welcome bonus service exists but no UI triggers it. Users get 2,000 bCredits but don't know why or what to do with them.

**Files:**
- Create: `src/components/onboarding/WelcomeBonusModal.tsx`
- Modify: `src/app/(app)/page.tsx` (trigger after first login)

**Implementation:**
- Full-screen celebration modal after first login
- Confetti animation (reuse existing confetti from OnboardingChecklist)
- "Du hast 2.000 bCredits erhalten! Kaufe jetzt deinen ersten Spieler."
- Big gold CTA: "Zum Marktplatz" → navigates to /market?tab=kaufen
- Secondary: "Spaeter" → dismisses
- Trigger: `!localStorage.getItem('bescout-welcome-shown')` + `balanceCents > 0`

---

### Task 2.2: Contextual NewUserTips on ALL Pages

**Problem:** `NewUserTip` component exists but is only used on Home. Deploy it everywhere.

**Files:**
- Modify: `src/app/(app)/market/page.tsx`
- Modify: `src/components/fantasy/FantasyContent.tsx`
- Modify: `src/app/(app)/community/page.tsx`
- Modify: `src/app/(app)/missions/page.tsx`

**Tips to deploy:**

| Page | Tip Key | Title | Description |
|------|---------|-------|-------------|
| Market (Kaufen) | `tip-first-dpc` | Dein erstes DPC | Ein DPC ist dein Anteil an einem Spieler. Kaufe deinen ersten mit dem Startguthaben. |
| Market (Kaufen) | `tip-what-are-dpcs` | Was sind DPCs? | Kaufe digitale Spieler-Vertraege deines Lieblingsvereins. Steigt der Marktwert, profitierst du. |
| Fantasy | `tip-first-event` | Dein erstes Fantasy-Event | Tritt einem Event bei, stelle dein Team auf und sammle Punkte. |
| Fantasy | `tip-predictions` | Predictions | Tippe Spielergebnisse und verdiene Tickets fuer richtige Vorhersagen. |
| Community | `tip-first-post` | Willkommen in der Scouting Zone | Teile deine Meinung, bewerte Spieler oder entdecke Transfer-Geruechte. |
| Missions | `tip-missions` | Taegliche Belohnungen | Erledige Missionen, halte deinen Streak und oeffne Mystery Boxes. |

All dismissible via localStorage, using existing `NewUserTip` component.

---

### Task 2.3: Vereinfachtes Wording (Pilot-Phase)

**Problem:** "DPC", "IPO", "bCredits" — zu viele Fachbegriffe. Casual Fans verstehen nichts.

**Solution:** Add human-readable labels alongside technical terms in key places.

**Files:**
- Modify: `messages/de.json` + `messages/tr.json`
- Modify: Key UI components where terms appear

**Changes:**
| Alt | Neu (mit Erklaerung) |
|-----|---------------------|
| IPO | Club Verkauf (Erstangebot) |
| DPC kaufen | Spieler kaufen |
| Floor Price | Ab-Preis |
| Transferliste | Von Usern (Transferliste) |
| bCredits | bCredits (Guthaben) — bereits so im TopBar |

**Note:** Only change user-facing labels. Code variables and types stay unchanged.

---

## Wave 3: TRADING & MARKET — "Von Prototyp zu Pro" (Impact: 8/10, Effort: M-L)

### Task 3.1: Portfolio P&L Anzeige auf Home Page

**Problem:** P&L exists in Bestand Tab and Trader Tab, but users don't see it on the main dashboard.

**Files:**
- Modify: `src/app/(app)/page.tsx` (Home page hero section)
- Modify: `src/components/home/HomeStoryHeader.tsx` (if exists)

**Implementation:**
- Add to portfolio stats strip on Home:
  - `Portfoliowert: 15.420 bC`
  - `P&L: +2.340 bC (+17.8%)` (green if positive, red if negative)
- Already calculated in page.tsx lines 188-191, just needs display.

---

### Task 3.2: Top Movers Widget (Standalone)

**Problem:** Top movers logic exists on Home but only shows holdings. Add global top movers.

**Files:**
- Create: `src/components/home/TopMoversStrip.tsx`
- Modify: `src/app/(app)/page.tsx` (add to Home sections)

**Implementation:**
- Horizontal scroll strip: "Groesste Beweger heute"
- Shows top 5 players by absolute 24h price change (up AND down)
- Mini card: Player photo, name, price, change % (green/red badge)
- Tappable → navigates to player detail
- Data: query all players with non-zero `price_change_24h`, sort by `abs(change)`, limit 5

---

### Task 3.3: Trending Spieler Widget auf Home

**Problem:** Trending tab exists in Market but not visible on Home.

**Files:**
- Create: `src/components/home/TrendingStrip.tsx`
- Modify: `src/app/(app)/page.tsx`

**Implementation:**
- Horizontal scroll: "Trending (meistgehandelt)"
- Reuse `getTrendingPlayers()` service, show top 5
- Mini card: Photo, name, trade count badge, floor price
- Link to Market Trending tab

---

### Task 3.4: Limit Orders (UI + Platzhalter)

**Problem:** Only market orders exist. No limit buy/sell.

**Files:**
- Modify: `src/components/player/detail/trading/TransferBuySection.tsx`
- Modify: `src/components/player/detail/BuyModal.tsx`
- Create: `src/components/player/detail/LimitOrderModal.tsx`

**Phase 1 (UI only):**
- Add "Limit Order" button next to "Kaufen" on player detail
- Modal with: Price input, quantity, order type (buy/sell)
- Submit button → Toast: "Limit Orders kommen bald!" (coming soon)
- Track interest via analytics event

**Phase 2 (Backend, separate plan):**
- DB: `limit_orders` table
- RPC: `place_limit_order`, `cancel_limit_order`, `match_limit_orders`
- Cron: Price matching engine

---

### Task 3.5: Bulk-Sell Feature

**Problem:** No way to sell multiple DPCs at once from portfolio.

**Files:**
- Modify: `src/components/manager/ManagerBestandTab.tsx`

**Implementation:**
- Add "Mehrere verkaufen" toggle
- Checkboxes on each holding row
- "X Spieler verkaufen" floating action button
- Confirmation modal with total expected revenue
- Calls existing `placeSellOrder()` in sequence

---

## Wave 4: CREATOR TOOLS — "Creators binden" (Impact: 7/10, Effort: L)

### Task 4.1: Bild-Upload in Posts

**Problem:** Posts are text-only. Creators can't share charts, screenshots, tactical boards.

**Files:**
- Modify: `src/components/community/CreatePostModal.tsx`
- Modify: `src/components/community/PostCard.tsx`
- Modify: `src/lib/services/posts.ts`
- DB: Add `image_url TEXT` column to `posts` table

**Implementation:**
- Add image upload button (Camera icon) in CreatePostModal
- Upload to Supabase Storage (`post-images` bucket)
- Compress client-side to max 1MB before upload
- Show preview in modal before submit
- Display in PostCard as responsive image above text
- Max 1 image per post (v1)

---

### Task 4.2: Rich Text (Markdown) fuer Research

**Problem:** Research posts are plain text. Analysts need formatting.

**Files:**
- Modify: `src/components/community/CreateResearchModal.tsx`
- Create: `src/components/ui/MarkdownRenderer.tsx`
- Modify: `src/components/community/ResearchCard.tsx`

**Implementation:**
- Replace textarea with Markdown-enabled textarea (simple: bold, italic, headings, lists, links)
- Toolbar: **B** / *I* / ## / - / [link]
- Preview toggle (side-by-side on desktop, tab on mobile)
- Render with `react-markdown` (already in package.json or add ~30KB)
- Store as markdown string in existing `content` column

---

### Task 4.3: Draft System

**Problem:** No way to save work-in-progress posts.

**Files:**
- Modify: `src/components/community/CreatePostModal.tsx`
- Modify: `src/components/community/CreateResearchModal.tsx`

**Implementation (localStorage-based, no DB change):**
- Auto-save to `localStorage` every 30s while modal is open
- Key: `bescout-draft-post` / `bescout-draft-research`
- On modal open: check for draft, offer "Entwurf wiederherstellen?"
- On publish: clear draft
- On close without publish: "Entwurf speichern?" confirm

---

### Task 4.4: Creator Earnings Dashboard

**Problem:** Creators can't see total earnings, unlock counts, tip revenue.

**Files:**
- Create: `src/components/profile/CreatorDashboard.tsx`
- Modify: `src/components/profile/ProfileView.tsx` (add tab or section in Analyst tab)

**Implementation:**
- Section in Analyst Tab (or new "Einnahmen" tab):
  - Total earned (all time, this month)
  - Research unlocks (count + revenue)
  - Tips received (count + total)
  - Bounty earnings
  - Chart: Monthly earnings trend (bar chart, last 6 months)
- Data: Aggregate from existing `creator_fund_payouts`, research `total_earned`, tips tables

---

### Task 4.5: OG Meta Tags fuer Social Sharing

**Problem:** Sharing links to WhatsApp/Twitter shows no preview (no title, no image, no description).

**Files:**
- Modify: `src/app/(app)/player/[id]/page.tsx` (generateMetadata)
- Modify: `src/app/(app)/profile/[handle]/page.tsx` (generateMetadata)
- Modify: `src/app/(app)/club/[slug]/page.tsx` (generateMetadata)
- Modify: `src/app/(app)/community/page.tsx` (generateMetadata for ?post= param)

**Implementation:**
- Use Next.js `generateMetadata` with dynamic OG tags:
  - Player: "Spielername — Floor Price: X bC | BeScout"
  - Profile: "@handle — Rang: Gold | 45 DPCs | BeScout"
  - Club: "Sakaryaspor — 31 Spieler | 3 Fans | BeScout"
  - Post: "Post title — by @author | BeScout"
- OG Image: Use existing player photos or club logos
- Twitter card type: `summary_large_image`

---

## Wave 5: CLUB/B2B POLISH — "Clubs ueberzeugen" (Impact: 6/10, Effort: M)

### Task 5.1: Sponsor Dashboard im Admin

**Problem:** Sponsor tracking backend existiert, aber Clubs sehen keine Daten.

**Files:**
- Create: `src/components/clubAdmin/AdminSponsorTab.tsx`
- Modify: `src/components/clubAdmin/AdminContent.tsx` (add tab)

**Implementation:**
- New tab "Sponsoren" in Club Admin
- KPI cards: Total Impressions, Total Clicks, CTR, Active Placements
- Per-placement breakdown table: Name, Impressions, Clicks, CTR
- Time range selector (7d, 30d, All)
- Data: Query existing `sponsor_events` table

---

### Task 5.2: Club Branding UI

**Problem:** Clubs can't edit their colors/branding despite DB fields existing.

**Files:**
- Modify: `src/components/clubAdmin/AdminSettingsTab.tsx`

**Implementation:**
- Add "Branding" section to Settings tab
- Color picker for primary_color + secondary_color
- Logo upload (Supabase Storage)
- Preview card showing how club page will look
- Save to existing DB columns

---

### Task 5.3: Subscriber Management View

**Problem:** Clubs see subscriber COUNT but not WHO subscribes or at what tier.

**Files:**
- Modify: `src/components/clubAdmin/AdminFansTab.tsx` (add subscriber section)

**Implementation:**
- New section "Abonnenten" in Fans tab
- Table: Handle, Display Name, Tier (Bronze/Silber/Gold), Since, Auto-Renew status
- Filter by tier
- CSV export
- KPI: Monthly Recurring Revenue (MRR) from subscriptions

---

### Task 5.4: Engagement-Benachrichtigungen fuer Clubs

**Problem:** Clubs can't proactively reach their followers.

**Files:**
- Create: `src/components/clubAdmin/AdminAnnouncementSection.tsx`
- Modify: `src/components/clubAdmin/AdminOverviewTab.tsx`

**Implementation:**
- "Club News" section in Overview tab (already partially exists)
- Enhance: All followers receive push notification when club publishes news
- Notification type: `club_news` with club logo + title
- Max 1 news push per day per club (spam protection)

---

## Wave 6: QUALITY OF LIFE — "Kleine Dinge die viel ausmachen" (Impact: 5/10, Effort: S)

### Task 6.1: Keyboard Shortcuts Overlay (Desktop)

**Files:**
- Create: `src/components/help/ShortcutsModal.tsx`

**Shortcuts:**
- `Cmd+K` / `Ctrl+K` — Suche
- `Cmd+?` — Glossar
- `G H` — Home
- `G M` — Markt
- `G F` — Fantasy
- `G C` — Community
- Show with `?` key press

---

### Task 6.2: Tuerkische Uebersetzung polieren

**Files:**
- Modify: `messages/tr.json`

**Approach:**
- Review all UI-visible strings with native TR speaker
- Fix reported issues: "Guthaben" → "Bakiye", "Tage" → "Gün"
- Ensure DEADLINE_OPTIONS in CreateBountyModal are translated
- Check all hardcoded German strings in components

---

### Task 6.3: Performance auf Budget-Handys

**Problem:** Samsung Galaxy A14 user reported 4-5s load time.

**Files:**
- Audit all pages for: unnecessary re-renders, large images, unoptimized bundles

**Quick wins:**
- Ensure all player photos use `next/image` with `width/height` props
- Add `loading="lazy"` to below-fold images
- Check bundle size with `@next/bundle-analyzer`
- Add `fetchPriority="high"` to above-fold content

---

### Task 6.4: Logout Button Safety

**Problem:** User accidentally logged out — button too close to Settings.

**Files:**
- Modify: `src/components/layout/SideNav.tsx`

**Implementation:**
- Add confirmation dialog on logout: "Wirklich abmelden?"
- Or: Add visual separation (divider + color change) between Settings and Logout

---

## IMPACT-MATRIX

| Wave | Tasks | Est. Impact | Wer profitiert |
|------|-------|-------------|----------------|
| **Wave 1** | 5 Tasks | Satisfaction +2.0 | ALLE Stakeholder |
| **Wave 2** | 3 Tasks | Satisfaction +1.0 | Casual Fans, TR Fans |
| **Wave 3** | 5 Tasks | Satisfaction +0.8 | Trader, Fantasy-Veteranen |
| **Wave 4** | 5 Tasks | Satisfaction +0.5 | Content Creators |
| **Wave 5** | 4 Tasks | Satisfaction +0.3 | Clubs (B2B) |
| **Wave 6** | 4 Tasks | Satisfaction +0.2 | Alle (QoL) |
| **TOTAL** | **26 Tasks** | **+4.8 → 10/10** | |

## NICHT IM SCOPE (loest sich spaeter)

- **Cash-Out / Auszahlung** — Kommt mit $SCOUT Token (Post-Pilot)
- **Superlig / Bundesliga** — Kommt mit Club-Expansion (Post-Pilot)
- **White-Label** — Enterprise-Feature, Sampiyon-Paket
- **Native App** — Post-MVP, erst nach Web-Product-Market-Fit
- **Head-to-Head Fantasy** — Nice-to-have, kein Core-Feature
- **Expected Points (xPts)** — Requires ML pipeline, Phase 2+
- **Advanced Analytics (xG, Heatmaps)** — Requires StatsBomb/Opta license
- **Email Campaigns** — Requires ESP integration, Phase 2+

## EXECUTION

**Empfehlung: Subagent-Driven, Wave fuer Wave.**

- Wave 1 zuerst (groesster Impact, kleinster Effort)
- Wave 2-3 parallel moeglich (unterschiedliche Dateien)
- Wave 4-5 nach Feedback auf Wave 1-3
- Wave 6 laeuft nebenbei

**Pro Wave:** 1 Plan-Session → Agents implementieren → Review → Merge → QA → Deploy
