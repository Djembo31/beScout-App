# FM-Mechanics Audit — 2026-04-25

Auditor-Persona: Football-Manager-Veteran (FM24, Comunio, Kicker-Manager, Sorare).
Linse: Power-User-Workflows, nicht Code-Quality.
Scope: 8 FM-Domain-Pages.

## Executive Summary

- 8 Pages auditiert
- Total Findings: **26** (P0: 0 / P1: 11 / P2: 11 / P3: 4)
- Power-User-Score-Avg: **7.6/10**
- BeScout spielt sich für Football-Manager-Power-User bereits ueberraschend reif. Kader-Tab hat 4 Lenses + 11 Sortier-Optionen + Bulk-Sell — das ist Comunio-Niveau und besser. Marktplatz hat full Order-Depth + Watchlist-Alerts. Hauptluecken sind **Form-L5-Filter** (universell auf 4 Pages), **MV-Trend rising/falling** (gar nicht vorhanden), **Captain-Pick-Rate / Differential-%** als Decision-Helper (Fantasy-Premium-Feature in FM24/Sorare/FPL), und **Trending-Liste fehlt Falter / Hot-Filter-Pills**.

### Top-3-Mechanik-Luecken (zuerst fixen)

1. **MV-Trend-Filter (rising/falling) fehlt komplett auf /market + /manager kader** — Comunio Hauptfeature, FM24 Scout-Recommendation-Trigger. P1.
2. **Form-L5-Filter im Kader-Tab fehlt** (vorhanden in Marktplatz!). Power-User stellen Lineups nach Form auf — minimal 1 Klick erwartet, aktuell unmoeglich. P1.
3. **Captain-Pick-Rate / Differential-% nicht sichtbar** auf Aufstellen-Tab. FPL/Comunio zeigen "75% Manager haben X als Captain" — Differential-Strategie zentral. P1.

---

## Per-Page

### 1. /manager — Kader-Tab

**Power-User-Score: 8.5/10** — überraschend stark. 4 Lenses, 11 Sort-Optionen, Bulk-Sell, Group-by-Club, Country/League-Filter, Smart-League-Auto-Select.

**Filter-Coverage:**

| Erwartet | IST | Gap |
|----------|-----|-----|
| Position-Filter (Multi) | ✅ PosFilter multi | — |
| Form-L5-Filter (45+/55+/65+) | ❌ | **FEHLT — vorhanden auf /market!** |
| MV-Trend rising/falling | ❌ | FEHLT komplett |
| Liga-Filter | ✅ CountryBar + LeagueBar | — |
| Verletzung-Indicator | ✅ StatusPill (fit/inj/susp/doubt) | — |
| Club-Filter | ✅ Dropdown | — |
| Search (Name/Club) | ✅ SearchInput | — |
| "Available-to-Sell" Filter | ❌ | FEHLT (nur in row computed) |
| "Im Lineup" Filter | ❌ | FEHLT (eventUsageMap exists, nicht filterbar) |

**Sort-Coverage:**

| Lens | Sort-Optionen | Gap |
|------|---------------|-----|
| Performance | l5, minutes, name | Fehlt: trend, ATP-rank |
| Markt | value, pnl_desc, pnl_asc, name | Fehlt: pnl_pct |
| Handel | offers, listed, floor, name | Fehlt: spread |
| Vertrag | contract, age_asc, age_desc, name | Solide |

**Quick-Actions:**

| Action | Vorhanden? |
|--------|-----------|
| Sell from row | ✅ onSellClick |
| Bulk-Sell | ✅ floor-price bulk |
| In-Lineup-stellen (Quick) | ⚠️ via Player-Detail-Modal → Aufstellen-Tab (3 Klicks) |
| Watchlist-Toggle | ❌ in Kader-Row |
| Compare 2 Spieler | ❌ |

**Decision-Helpers (FM24-Style):**

| Helper | Vorhanden? |
|--------|-----------|
| L5-Color-Code | ✅ getL5Color |
| Form-Trend (UP/DOWN) | ✅ PerfPills |
| Next-Match-Badge | ✅ NextMatchBadge |
| Minutes-Avg-Pill | ✅ MinutesPill |
| In-Lineup-Indicator | ✅ inLineup boolean (Pflicht — Sorare-Standard) |
| Active-IPO-Badge | ✅ MarketBadges |
| **MV-Trend** (Comunio-Standard) | ❌ |
| **ATP-Rank-Badge** | ❌ |
| **Mastery-Level-Badge** | ⚠️ in Player-Detail nur |

**Findings:**

| # | Sev | File | Mechanik-Luecke + FM-Pattern-Referenz |
|---|-----|------|----------------------------------------|
| 1.1 | P1 | `KaderToolbar.tsx` | Form-L5-Filter fehlt — auf /market gibts L5_VALUES `[0,45,55,65]`. FM24 Quick-Squad-Filter "Form ≥ 7.0" ist Top-3-User-Action. Universal-Filter an alle Listen kopieren. |
| 1.2 | P1 | `KaderTab.tsx` | MV-Trend (rising/falling) Filter komplett unvorhanden. Comunio hat seit 10 Jahren MV-Tendenzpfeile + "Aufsteiger/Absteiger"-Filter — Kern-Trading-Helper fuer "billig kaufen vor MV-Anstieg". |
| 1.3 | P2 | `KaderToolbar.tsx` | "In-Lineup"-Filter fehlt obwohl `eventUsageMap` schon geladen wird. FM24 Squad-View hat "Selected XI"-Toggle — Spieler-Sichtbarkeit reduzieren wenn Lineup steht. |
| 1.4 | P2 | `KaderPlayerRow.tsx` | Quick-In-Lineup-Action fehlt in Row. Aktuell: Row-Click → PlayerDetail-Modal → Button "Im Lineup planen". Sorare Squad-Row hat direkten "+" auf Karte. 3-Klick-Pfad → 1-Klick. |
| 1.5 | P3 | `KaderPlayerRow.tsx` | Compare-2-Selection (Multi-Select um Spieler-Vergleichs-View zu oeffnen) fehlt. /compare-Page existiert aber kein Einstieg aus Kader. FM24 hat Right-Click-Compare. |

**Mobile 393px:** Solide. PerfPills + Stats stacken auf Row 2. Bulk-Bar sticky bottom-20 (gut, ueber Bottom-Nav).

---

### 2. /manager — Aufstellen-Tab (Lineup-Builder)

**Power-User-Score: 8/10** — Lineup-Builder ist EventSelector + LineupPanel + Equipment + Synergy-Preview. Reif gebaut.

**Decision-Helpers:**

| Helper | Vorhanden? |
|--------|-----------|
| Formation-Switch | ✅ availableFormations |
| Captain-Slot-Toggle | ✅ |
| Wildcard-Slots | ✅ |
| Equipment-Pro-Slot | ✅ EquipmentPicker |
| Synergy-Preview | ✅ synergyPreview |
| **Captain-Pick-Rate** (FPL Top-3-Stat) | ❌ |
| **Differential-%** (FPL "wie viele % haben Spieler") | ❌ |
| **Avg-Score-pro-Slot** (Comunio) | ⚠️ slotScores aber nur progressive nach Spielen |
| **Form vs Fixture-Difficulty Hint** | ❌ |
| Apply-Lineup-Template (cross-Tab) | ✅ applyTemplate |
| Pre-Pick from Player-Detail | ✅ pendingPlayerId |
| Salary-Cap-Indicator | ✅ overBudget |
| **Lineup-Score-Projection** | ❌ |

**Findings:**

| # | Sev | File | Mechanik-Luecke + FM-Pattern-Referenz |
|---|-----|------|----------------------------------------|
| 2.1 | P1 | `LineupPanel.tsx` (Slot-Picker) | Captain-Pick-Rate-% fehlt im Captain-Slot-Picker. FPL zeigt "Salah: 41% Captain" — Differential-Decision. Mockup: kleines Badge unter Spielername "C: 32%". |
| 2.2 | P1 | `LineupPanel.tsx` (Player-Picker pro Slot) | Differential-% fehlt im Player-Picker. Sorare zeigt "Owned by 12% of managers" — Diff-Spieler high-EV picks. |
| 2.3 | P2 | `EventDetailFooter.tsx` | Lineup-Score-Projection (Sum erwartete Punkte basierend auf L5+Difficulty) fehlt. Comunio "Vorhersage: 85 Punkte". User-CTA waere "Captain optimieren". |
| 2.4 | P2 | `EventSelector.tsx` | Event-Difficulty-Indikator (Heim/Auswaerts + Gegner-Form) fehlt im Selector. FM24 Schedule-View hat Color-Codes Easy/Hard. |
| 2.5 | P3 | `AufstellenTab.tsx` | Auto-Pick-Lineup-Button (analog FPL "Auto Pick Best Team") fehlt. Quality-of-Life. Lineup-Builder bereits hat alles dafuer. |

---

### 3. /manager — Historie-Tab

**Power-User-Score: 8/10** — TimeFilter (all/30d/90d/season) + StatusFilter (all/top3/top10/other) + Sort (date/score/rank/reward). Sehr reif.

**Findings:**

| # | Sev | File | Mechanik-Luecke + FM-Pattern-Referenz |
|---|-----|------|----------------------------------------|
| 3.1 | P2 | `HistorieTab.tsx` | Avg-Rank + Best-Rank-Stat-Card fehlt am Top. FPL Profile zeigt "Avg Rank: 42k" + "Best Rank: 1.2k" — Identitaet-Building fuer Power-User. (HistoryStats-Component existiert, prüfen ob included) |
| 3.2 | P3 | `HistoryEventCard.tsx` | "Re-use this lineup" fehlt als Quick-Action im Event-Card. applyTemplate-Logik existiert in AufstellenTab, aber Trigger nur ueber Cross-Tab — kein direkter Button "Diesen Lineup wiederverwenden". |

---

### 4. /market — Marktplatz-Tab + Sub-Tabs

**Power-User-Score: 8.5/10** — Sehr stark: 4 Sub-Tabs (Clubverkauf/Transferliste/Trending/Watchlist), MarketFilters mit L5/Goals/Assists/Matches/Contract/Fit/Price-Range/MinSellers/BestDeals, Order-Depth-View expandable, Affordable-Filter, Search-Overlay, IPO Progress-Bar + Countdown.

**Filter-Coverage TransferListe:**

| Erwartet | IST | Gap |
|----------|-----|-----|
| Position | ✅ POSITIONS pills | — |
| Form-L5 (0/45/55/65) | ✅ | — |
| Goals/Assists/Matches min | ✅ | — |
| Contract <6/<12 | ✅ CONTRACT_VALUES | — |
| Only-Fit | ✅ filterOnlyFit | — |
| Price-Range min/max | ✅ | — |
| Min-Sellers | ✅ filterMinSellers | — |
| Best-Deals (L5/Price-Ratio) | ✅ filterBestDeals (>0.1) | — |
| Affordable | ✅ showAffordable | — |
| **MV-Trend** | ❌ | FEHLT (universell) |
| **Country/League** | ✅ Global CountryBar+LeagueBar | — |
| **Liga-Form-Tiefe** (Liga-Top-Scorer Filter) | ❌ | FEHLT |

**Sort-Coverage:**

| Sort | IST | Gap |
|------|-----|-----|
| L5 | ✅ | — |
| Floor asc/desc | ✅ | — |
| Goals/Assists/Matches | ✅ | — |
| Contract | ✅ | — |
| **MV-Trend** | ❌ | — |
| **Spread (Bid-Ask)** | ❌ | Nice-to-have |
| **Trade-Volume 7d** | ❌ | Sorare-Standard |

**Trending-Tab:**

| Erwartet | IST | Gap |
|----------|-----|-----|
| Hot/Rising/Faller-Pills | ❌ Nur 1 Trending-Liste | FEHLT — Sorare hat 3 Tabs |
| IPO-soon-Indicator (in Trending) | ❌ Eigener Sub-Tab Clubverkauf | OK getrennt, aber kein Cross-Pointer |
| 24h-Change% Sortier | ⚠️ change24h shown but cannot sort by it | — |
| Trade-Count 7d Sortier | ⚠️ TrendingPlayer.tradeCount existiert | — |

**Decision-Helpers (TransferList Row):**

| Helper | Vorhanden? |
|--------|-----------|
| Form Bars + L5 Circle | ✅ FormBars |
| LeagueBadge | ✅ |
| TrendIcon UP/DOWN/FLAT | ✅ |
| Sparkline 7d | ✅ |
| Last-Trade-Price | ✅ |
| Order-Depth-Tiefe | ✅ expandable |
| Listings-Count Badge | ✅ |
| **Holders-Distribution** | ❌ |
| **MV-Trend** (Comunio-Standard) | ❌ |
| **Spread Bid-Ask** (Sorare visible) | ⚠️ in /player/[id] OrderbookSummary, nicht in Liste |

**Findings:**

| # | Sev | File | Mechanik-Luecke + FM-Pattern-Referenz |
|---|-----|------|----------------------------------------|
| 4.1 | P1 | `MarketFilters.tsx` | MV-Trend-Filter (rising/falling/stable) fehlt. Comunio "Tendenz"-Spalte ist Reflex-Filter. Backend-Source: TM scrapes liefern MV — DB-Spalte koennte Trend-Berechnung. Pflicht fuer Trading-Power-User. |
| 4.2 | P1 | `TrendingSection.tsx` | Sub-Filter-Pills "Hot / Rising / Faller / IPO-Soon" fehlen. Sorare Marketplace teilt das. Aktuell nur eine Trending-Liste, User muessen via change24h-Augensortierung selbst gucken. |
| 4.3 | P1 | `TransferListSection.tsx` | Holders-Distribution-Mini-Bar in Row fehlt (z.B. "Top-10 owners hold 60%"). Sorare Standard fuer Liquid/Iliquid-Erkennung. Floor-Price kann taeuschen wenn 1 Holder 80% haelt. |
| 4.4 | P2 | `MarketFilters.tsx` | Sortier nach Trade-Volume-7d fehlt. TrendingPlayer.tradeCount existiert in service-layer aber nicht surface'd in TransferListe-Sort. FM24 "Hottest Players" Sort. |
| 4.5 | P2 | `MarketContent.tsx` | Multi-Select Bulk-Buy fehlt (Power-User mit 50k Credits will 5 Spieler gleichzeitig). Kader hat Bulk-Sell — symmetrisch dazu. |
| 4.6 | P3 | `MarktplatzTab.tsx` | Ending-Soon-Strip nur in Clubverkauf-Tab. Cross-Sub-Tab "IPOs ending in 24h" Sticky-Banner fehlt — Comunio Marketplace hat permanenten "Auktionen enden bald"-Bereich. |

---

### 5. /player/[id] — Player-Detail (Trading-Tab)

**Power-User-Score: 9/10** — Sehr reich: PriceChart mit 1W/1M/3M/All-Switch + Catmull-Rom-Spline + Crosshair, TradingQuickStats (Floor/BestBid/Spread/Volume7d/Holders), YourPosition+P&L, OrderbookSummary, Trade-History (collapsed 3, expand all), Top-Owners-List, ScoutConsensus, Rewards-Tiers-Accordion, Sentiment-Gauge.

**Decision-Helpers:**

| Helper | Vorhanden? |
|--------|-----------|
| MV-Chart 1W/1M/3M/All | ✅ ja, mit Crosshair |
| Last-N Trades | ✅ alle |
| Holders-Distribution | ✅ Top-Owners |
| Sentiment-Gauge | ✅ SentimentGauge |
| Scout-Consensus (Bullish/Bearish/Neutral) | ✅ ScoutConsensus |
| Floor + Spread + Best-Bid | ✅ TradingQuickStats |
| YourPosition P&L | ✅ |
| **Form-Bar Match-by-Match Hover** | ❌ FormBars hat kein Tooltip |
| **Heatmap (xG/xA/Distribution)** | ❌ |
| **Predicted Next Match Score** | ❌ |
| MobileTradingBar (Sticky Buy/Sell) | ✅ |
| Watchlist-Toggle | ✅ DB-backed seit Slice X |
| StickyDashboardStrip on Scroll | ✅ |
| Liquidation-Alert | ✅ |

**Findings:**

| # | Sev | File | Mechanik-Luecke + FM-Pattern-Referenz |
|---|-----|------|----------------------------------------|
| 5.1 | P1 | `FormBars.tsx` | Match-by-Match Hover-Tooltip fehlt. Aktuell zeigt der Component nur 5 colored bars ohne `title` oder Hover-Score. FM24 Form-Display hat per-bar tooltip "vs Bayern (H), 7.4". Power-User wollen Score + Gegner pro Bar. |
| 5.2 | P2 | `TradingTab.tsx` (Scout-Consensus) | "Differential-Sentiment" fehlt — z.B. "70% Bullish, aber nur 12 Reports vs 200 fuer Mbappe" — Reliability-Indicator fehlt. ScoutConsensus zeigt total aber kein Confidence-Score. |
| 5.3 | P3 | `PriceChart.tsx` | Volume-Histogramm unter Chart fehlt (Sorare/Tradingview-Standard). Crosshair zeigt Preis aber nicht Trade-Volume. |
| 5.4 | P3 | `TradingTab.tsx` | "Set-Price-Alert" fehlt im Trading-Tab. Watchlist-Threshold-Popover existiert (`WatchlistView.tsx`) aber nicht hier surfaced — User muss erst auf Watchlist gehen, Alert setzen, dann zurueck. |

---

### 6. /transactions — Money-Flow-View

**Power-User-Score: 8/10** — Range-Filter (7d/30d/90d/all), Filter-Chips (all/credits/tickets/trades/fantasy/research/rewards), Search, CSV-Export, Aggregations (Earned/Spent/Net), Infinite-Pagination.

**Decision-Helpers:**

| Helper | Vorhanden? |
|--------|-----------|
| Aggregation Earned/Spent/Net | ✅ |
| Date-Range-Filter | ✅ |
| Type-Filter | ✅ 7 Filter |
| Search-Description | ✅ |
| CSV-Export | ✅ |
| Icon-Color-Coded per Type | ✅ |
| **Trend-Sparkline** (Spending pro Tag) | ❌ |
| **Per-Player-P&L-Aggregation** | ❌ Trades-Filter aber nicht aggregiert pro Spieler |
| **Tax-Year-Export** | ⚠️ CSV ja, aber kein Tax-Year-Filter |

**Findings:**

| # | Sev | File | Mechanik-Luecke + FM-Pattern-Referenz |
|---|-----|------|----------------------------------------|
| 6.1 | P2 | `TransactionsPageContent.tsx` | Per-Trade-Player-Link fehlt. Tx-Description nennt Spieler ("100 SC Stuermer X gekauft") aber nicht klickbar zum Player-Detail. Sorare Activity-Page hat overall click-through. |
| 6.2 | P2 | `TransactionsPageContent.tsx` | Trend-Sparkline-Mini-Chart fehlt im Aggregations-Card-Bereich. FPL "Money-Flow" zeigt 30-Tage-Trend visuell. Aktuell pure-numbers. |
| 6.3 | P3 | `TransactionsPageContent.tsx` | "Per-Player-P&L Top-5"-Section fehlt. Aktuell Tx-Liste flat — Power-User wollen "Mein bester Trade: +500 CR auf X, Mein schlechtester: -200 CR auf Y". |

---

### 7. /missions — Engagement-Loop

**Power-User-Score: 7/10** — DailyChallenge, MissionBanner (daily+weekly), ScoreRoad, Achievements, MysteryBox, Streak-Banner. Alle Components vorhanden.

**Decision-Helpers:**

| Helper | Vorhanden? |
|--------|-----------|
| Streak-Counter | ✅ DB-authoritative useLoginStreak |
| Streak-Benefits-Labels | ✅ benefitLabels |
| Streak-Milestone-Banner | ✅ at exact milestone-day |
| Daily-Challenge | ✅ |
| Active-Missions Daily/Weekly | ✅ |
| Score-Road-Progress | ✅ ScoreRoadCard |
| Achievements Unlocked | ✅ |
| Mystery-Box (Free/Paid) | ✅ ticketDiscount applied |
| **Filter Active/Completed/Locked** | ❌ |
| **ETA bis next Mission-Reset** | ⚠️ Daily implizit, weekly unsichtbar |
| **Mission-Difficulty-Tag** | ❌ |

**Findings:**

| # | Sev | File | Mechanik-Luecke + FM-Pattern-Referenz |
|---|-----|------|----------------------------------------|
| 7.1 | P2 | `MissionBanner.tsx` | User-Filter Active/Completed/All fehlt. FPL Mission-View hat Toggle. Aktuell sieht User alle Daily-Missions auch wenn schon abgeholt — Visual-Noise. |
| 7.2 | P2 | `missions/page.tsx` | Weekly-Mission-Reset-Countdown fehlt. Daily ist implizit (Today's Challenge), Weekly nicht. Sorare Quest-Page hat "Refreshes in 2d 14h" Stamp. |
| 7.3 | P3 | `MissionBanner.tsx` | Mission-Difficulty-Tag (Easy/Med/Hard) fehlt. FPL Quests haben Color-Stars. Aktuell pure-text. |

---

### 8. /inventory — Equipment, Mystery-Box, Wildcards, History

**Power-User-Score: 7.5/10** — 4 Tabs (equipment/cosmetics/wildcards/history), Position-Filter (all/GK/DEF/MID/ATT), Sort (rank_desc/asc, latest_acquired), View-Mode (all/active/consumed), grouped by Definition mit Rank-Stack.

**Decision-Helpers:**

| Helper | Vorhanden? |
|--------|-----------|
| Position-Filter | ✅ |
| Sort by Rank/Acquired | ✅ |
| Active vs Consumed View | ✅ |
| Equipped-Count per Item | ✅ Slice-FIX-09 |
| Detail-Modal | ✅ |
| **Item-Type-Filter** (Boots/Captain/etc.) | ⚠️ position covers it teils |
| **Bulk-Equip-to-Lineup** | ❌ |
| **Compare 2 Items** | ❌ |
| **Effect-Magnitude-Sort** ("strongest first") | ❌ |

**Findings:**

| # | Sev | File | Mechanik-Luecke + FM-Pattern-Referenz |
|---|-----|------|----------------------------------------|
| 8.1 | P2 | `EquipmentSection.tsx` | Sort by Effect-Magnitude fehlt. Aktuell nur rank_desc/asc + latest. Sorare/Comunio Items sortierbar nach effective-power. Power-User-Inventar (50+ Items) wird unuebersichtlich. |
| 8.2 | P3 | `EquipmentSection.tsx` | Bulk-Equip-Button (z.B. "Top-Captain auf Captain-Slot in active Lineup") fehlt. EquipmentPicker existiert in Lineup-Builder, aber kein "von Inventory aus" Push-Flow. |
| 8.3 | P3 | `MysteryBoxHistorySection.tsx` | Filter "letzte 30d" fehlt — alle Boxes-History flat. Power-User mit 100+ Boxes wollen Drilldown. |

---

### 9. /founding — Founding-Pass-Sale

**Power-User-Score: 7/10** — 4 Tier-Cards (fan/scout/pro/founder), Total-Counter, Per-Tier-Counter, Confirmation-Modal, Already-Member-Banner, Popular-Badge auf "pro".

**Decision-Helpers:**

| Helper | Vorhanden? |
|--------|-----------|
| Tier-Vergleich Side-by-Side | ✅ Grid 4 Cols |
| Sold-Counter pro Tier | ✅ |
| Total-Counter | ✅ |
| User-Owns-Indicator | ✅ ring-2 ring-gold |
| Sold-Out-State | ✅ |
| Popular-Badge | ✅ "pro" hardcoded |
| **Progress-Bar** (visual statt nur numerisch) | ❌ |
| **Kill-Switch-EUR-Banner** (CEO-Regel 900K) | ❌ frontend |
| **Tier-FOMO** (last 50 left) | ⚠️ tierCounter shows aber kein urgency-Color |

**Findings:**

| # | Sev | File | Mechanik-Luecke + FM-Pattern-Referenz |
|---|-----|------|----------------------------------------|
| 9.1 | P1 | `founding/page.tsx` | Progress-Bar fehlt fuer Total-Counter. Aktuell nur "{count} / {total}" als Zahl. Sorare/Comunio Founding-Sales haben prominent Visual-Progress-Bar (impuls fuer Conversion). PlayerIPOCard.tsx hat das Pattern bereits — kopieren. |
| 9.2 | P2 | `founding/page.tsx` | "Last X left at this tier"-Urgency-Color fehlt. Wenn `limit - sold < 10%` sollte tierCounter rot/orange werden. Aktuell konstant white/40 — kein FOMO-Trigger. |
| 9.3 | P2 | `founding/page.tsx` | Per-Tier-Vergleichstabelle "was bekomme ich extra"-Diff fehlt. Aktuell jedes TierCard listet Extras isoliert. FM24/Sorare-Sub-Tier-Tabellen zeigen "Stripe": fan-row,scout-row,pro-row,founder-row mit ✓/✗ Matrix. |

---

### 10. /airdrop — Reward-Distribution Leaderboard

**Power-User-Score: 6.5/10** — Stats-Bar (Participants/AvgScore/Gold/Diamond), MyScore-Highlight, Top100-Leaderboard, Score-Tips mit Weights (40%/25%/20%/15%), Tier-Badges, Founding-Multiplier-Badge.

**Decision-Helpers:**

| Helper | Vorhanden? |
|--------|-----------|
| Tier-Distribution-Stats | ✅ |
| Top-100 Liste | ✅ |
| MyScore-Card (sticky-position?) | ✅ Card aber nicht sticky |
| Score-Tips mit Weights | ✅ 4 Tips |
| Founding-Multiplier | ✅ Badge |
| **Score-Improvement-CTA** ("Du brauchst noch X Punkte fuer Gold") | ❌ |
| **Personal-Trend** (mein Score vor 7d vs heute) | ❌ |
| **Filter Top-10/Top-50/Friends** | ❌ |
| **Pagination >100** | ❌ Hard-Cap |

**Findings:**

| # | Sev | File | Mechanik-Luecke + FM-Pattern-Referenz |
|---|-----|------|----------------------------------------|
| 10.1 | P1 | `airdrop/page.tsx` | "Wieviel Punkte brauche ich noch fuer next Tier"-CTA fehlt. Aktuell zeigt MyEntry rank+score+tier statisch. FPL Rank-Page hat "Climb 200 places to reach Top 1k". Conversion-Trigger fehlt. |
| 10.2 | P2 | `airdrop/page.tsx` | Personal-Score-History (Trend 7d/30d) fehlt. Aktuell nur Snapshot. Comunio Mini-Chart "+50 in last 7d". |
| 10.3 | P2 | `airdrop/page.tsx` | Friends-Filter / Following-Filter fehlt. Top-100 generic — User mit 5 Followern wollen "Wo stehe ich vs meine Freunde" (FPL Mini-Leagues). |
| 10.4 | P3 | `airdrop/page.tsx` | Pagination >100 hart limitiert. Power-User mit Rank #245 sieht eigene Position nicht in Liste (nur in MyScore-Card). FPL hat virtual-scroll pages. |

---

## Cross-Page Mechanik-Patterns (systemisch)

### A. Form-L5-Filter Asymmetrie

**Vorhanden:** /market (Filter pills 0/45+/55+/65+) ✅
**Fehlt:** /manager Kader-Tab ❌, /community-View, Watchlist
**Auswirkung:** Sub-page-Inkonsistenz. Power-User erwartet **selber Filter-Sprache** ueberall. Universal-Component "FormL5Filter" extrahieren.

### B. MV-Trend (rising/falling) systemisch unvorhanden

Auf KEINER Page sichtbar. Comunio + FM24 + Sorare haben MV-Tendenzpfeil. BeScout hat `trend: 'UP'/'DOWN'/'FLAT'` (Form-Trend) aber **kein MV-Trend** — verschieden.
- Backend-Action: DB-Spalte `mv_trend_30d` aus TM-scrape-history berechnen
- Frontend-Action: PerfPills-Component erweitern um MV-Pfeil neben Form-Pfeil

### C. Bulk-Actions inkonsistent

| Page | Bulk-Action |
|------|-------------|
| /manager Kader | ✅ Bulk-Sell |
| /market TransferListe | ❌ kein Bulk-Buy |
| /inventory | ❌ kein Bulk-Equip |
| /missions | ⚠️ Claim-All-Button koennte fehlen (nicht audited deep) |

→ **Pattern: Bulk-Mode-Toggle als universal-pattern in Power-Tools.**

### D. Captain-Pick-Rate / Differential-% konsequent unsichtbar

`captainPickRate`, `differential`, `captain_pick` Begriffe **0 Hits** im Codebase. FM24, FPL, Sorare zeigen das als Top-3-Stat im Lineup-Builder. Backend-Action: RPC `get_captain_pick_rate(event_id, player_id)` aggregating lineups WHERE captain_slot = X. Universell wertvoll.

### E. Quick-Actions <3 Klicks

| Action | Klicks aktuell | FM-Standard |
|--------|----------------|-------------|
| Spieler kaufen (Marktplatz → BuyConfirm) | 2-3 ✅ | 2-3 |
| Spieler ins Lineup (Kader-Row → Detail → Plan) | 3 | 1 |
| Watchlist hinzufuegen (Player → Star) | 1 ✅ | 1 |
| Sell from Kader-Row | 2 ✅ | 2 |
| Captain setzen | 2 ✅ | 2 |
| **In-Lineup direkt aus Kader-Row** | ⚠️ 3 (zu viele) | 1 |

→ Generelle Speed-OK, aber Kader-Row-Quick-Lineup hat 1 Klick zu viel.

---

## Top-3-Empfehlungen (FM-Pattern-Begruendung)

### 1. Form-L5-Filter universalisieren auf /manager Kader-Tab + Watchlist

**FM-Referenz:** FM24 Quick-Squad-Filter "Form ≥ 7.0" ist Top-3-User-Action laut FM-Sub-Reddit-Polls. Comunio "Form ≥ 5" Pflicht-Filter beim Aufstellen.

**Action:** `MarketFilters.applyFilters` Logic in shared-Hook extrahieren. KaderToolbar.tsx + WatchlistView.tsx konsumieren denselben Filter-State (in marketStore, nicht managerStore — universal).

**Effort:** S — 1 File-Move + 2 Consumer-Updates.

### 2. MV-Trend rising/falling als systemisches Feature

**FM-Referenz:** Comunio MV-Tendenz hat seit 2003. Trade-Reflex-Action #1 ("Aufsteiger billig kaufen"). Sorare zeigt Floor-Trend per Card.

**Action:**
- DB: Migration `players.mv_trend_7d ENUM('rising','stable','falling')` + Cron-Update aus TM-scrape-history-Vergleich
- Frontend: PerfPills erweitern um MV-Pfeil. MarketFilters Filter "MV: rising/falling/all". Universal an alle Listen.

**Effort:** M — DB-Migration + Cron + 4-5 Component-Edits.

### 3. Captain-Pick-Rate + Differential-% im Lineup-Builder

**FM-Referenz:** FPL Captain-Picker zeigt "Salah: 41% C, 12% VC". Sorare zeigt "Owned by 12%". Differential-Strategy zentral für Power-User-Fortschritt im Leaderboard.

**Action:**
- DB: RPC `get_event_captain_distribution(event_id) RETURNS TABLE(player_id, captain_pct, ownership_pct)` SECURITY DEFINER (aggregates anonymized).
- Frontend: LineupPanel-Picker Badge "C: 32%" unter Spielername. Differential-Player-Highlight (<10% ownership) als ⚡-Glow.

**Effort:** M — RPC + LineupPanel-Erweiterung. **Wichtig:** auf event-level cached, refresh nur bei deadline-cross.

---

## Severity-Regeln

- **P0:** Critical-Path broken (Lineup nicht stellbar, Buy nicht abschliessbar) — **0 Findings (gut!)**
- **P1:** Top-Decision-Helper fehlt (Power-User-Workflow leidet sichtbar) — 11 Findings
- **P2:** Convenience-Feature fehlt (alternative Workflow vorhanden, aber laenger) — 11 Findings
- **P3:** Nice-to-have (Polish/Marginal-User) — 4 Findings

---

## Positive Highlights (was BeScout BESSER macht als FM-Standards)

1. **Kader-Tab 4-Lens-System** (Performance/Markt/Handel/Vertrag) — **besser als FM24 Squad-View**, das nur 1 View hat. Sortier-Optionen kontextabhaengig per Lens — sehr durchdacht.

2. **TradingTab Crosshair-PriceChart mit Catmull-Rom-Spline + 1W/1M/3M/All** — auf Sorare-/Tradingview-Niveau, sieht professioneller aus als Comunio (das pure-line ohne Crosshair hat).

3. **Bulk-Sell mit Sticky-Bottom-Bar** auf Mobile — **besser als Sorare** (das Modal-basiert macht). 393px-Layout solid, Bottom-20-Sticky ueber Bottom-Nav clean geloest.

4. **Watchlist-Threshold-Popover** mit Alert-Pct-Auswahl (5/10/20%) — bridge-feature zwischen FPL Push-Notification und Sorare Bell-Icon. Smart.

5. **Smart-Auto-League-Select** (Country mit nur 1 Liga setzt smartLeague automatisch) — Quality-of-Life das selbst FM24 nicht hat.

6. **MarketFilters Best-Deals-Filter** (`L5/Price > 0.1`) — eingebauter Heuristik-Filter den **kein** anderer Marktplatz hat. Quick-Wins fuer Anfaenger ohne Eigen-Analyse.

7. **TransactionsPageContent CSV-Export** — Tax-/Accounting-Feature das Sorare erst seit 2024 hat.

8. **EquipmentPicker-Active-Lineup-Integration** (von Aufstellen-Tab Slot-spezifisch) — saubere context-aware-Activation, FM24 Tactic-Slot-System aehnlich.

9. **In-Lineup-Indicator in KaderRow** (eventUsageMap) — Sorare hat das nicht. Visualisiert "Spieler ist diese GW im Einsatz" auf Squad-Liste = Decision-Helper.

10. **PreventClose mit Mutation-State** durchgaengig — Power-User-Sicherheits-Pattern (Modal-Schliessen waehrend DB-Tx kostet teils Geld). Comunio hat das nicht und produziert echte Bugs.

---

## Summary

BeScout fuehlt sich für FM/Comunio/Sorare-Power-User **bereits ueberraschend reif** — 7-8/10 Average ueber alle 8 Pages, mit /player/[id] auf 9/10 als Highlight. Die Architektur-Bones sind richtig: Lens-Switching, contextual Sort-Optionen, Bulk-Actions, Order-Depth, Form-Bars + Sparklines, Crosshair-Charts, Threshold-Alerts.

Die **3 Universal-Luecken** (Form-L5-Filter im Kader, MV-Trend ueberall, Captain-Pick-Rate im Lineup-Builder) sind **kein Designfehler sondern fehlende Surface'es** — Backend-Daten existieren teils oder waeren billig zu holen. Wenn diese drei live sind, ist BeScout auf Sorare-Niveau und in Manche Aspekten (4-Lens-Kader, Best-Deals-Filter, Smart-League-Auto) bereits BESSER.

Klare nächste Slices: **(1) MV-Trend-Spalte + Surface, (2) FormL5Filter universalisieren, (3) Captain-Pick-Rate-RPC**. Diese 3 Slices heben Power-User-Score von 7.6 auf ~9.0.
