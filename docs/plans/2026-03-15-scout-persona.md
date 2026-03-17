# Scout/Content Creator Persona - Player Detail Page Analysis

> Date: 2026-03-15
> Scope: UX research from the Scout/Analyst perspective on the Player Detail page
> Current state: Audited PlayerContent.tsx, CommunityTab.tsx, ScoutConsensus.tsx, SentimentGauge.tsx, CommunityValuation.tsx, ResearchCard.tsx, CreateResearchModal.tsx, AnalystTab.tsx, BountyCard.tsx, TipButton.tsx, and supporting services

---

## 1. Scout Workflow - Current vs. Ideal

### Current Flow (as implemented)

The scout workflow is fragmented: short-form content (player takes, transfer rumors) is created from the player page, but long-form research reports are created from the Community page. There is no direct Write Research Report button on the player page itself.

Current path for short-form: Player Page > Community Tab > Post/Rumor buttons > Modal (500 chars max).
Current path for long-form: Community Page > Research Tab > Write Report > CreateResearchModal (title, preview, paywall content, call, horizon, price).

### Ideal Flow

1. RESEARCH PHASE: Player Page tabs for data gathering (Profil, Statistik, Markt, Community).
2. WRITE PHASE: Write Research Report pre-filled with player context, or side-panel with stats visible.
3. PUBLISH PHASE: Set call, horizon, price. Automatic price snapshot captured.
4. EARN PHASE: 80/20 unlock split, ratings affect analyst score, outcome resolution at horizon expiry.

### Gap Analysis

| Gap | Severity | Detail |
|-----|----------|--------|
| No Write Research button on player page | High | Must navigate to /community and re-find player |
| No data context while writing | High | Full-screen modal with zero data visibility |
| No draft auto-save reminder | Medium | useDraft exists but not obvious |
| No suggested data points | Medium | Must remember key stats |

### Recommendations

1. Add Write Research CTA to CommunityTab with playerId pre-filled.
2. Split-panel writing mode (desktop: data sidebar; mobile: Data tab in modal).
3. Contextual prompts based on recent performance.

---

## 2. Research Quality Signals - Data Availability for Scouts

### Currently Visible

L5/L15 scores, performance trend, gameweek history, radar chart, price chart, orderbook depth, trade history, DPC supply ring, holder count, contract end date, transfer market value.

### Missing (high value)

Fixture difficulty (upcoming opponents), head-to-head data, season stats vs. league average, price-performance correlation, position-peer comparison, contract countdown, injury/suspension status.

### Recommendation

Scout Toolkit card in CommunityTab: Quick Stats, Key Metric, Upcoming Fixtures, Price Context, Contract info.

---

## 3. Content Discovery

### Problems

Player page shows all research chronologically without quality filtering, accuracy sorting, or temporal relevance.

### Recommended Hierarchy

Priority 1: Highlighted Research (top-rated, outcome badges, verified analyst badges).
Priority 2: Sort controls (Most Relevant / Newest / Top Rated / Most Unlocked / Most Accurate).
Priority 3: Filter chips (Call, Category, Outcome).

Relevance scoring: recencyBonus 30%, ratingBonus 20%, accuracyBonus 20%, authorHitRate 20%, unlockSignal 10%.

### Recommendation

Port sorting/filtering from CommunityResearchTab to player CommunityTab. Add Accuracy sort.

---

## 4. Reputation and Trust

### Current Foundation

Hit Rate %, Verified Analyst badge (60%+ hit rate, 5+ calls), Star Ratings 1-5, Scout Score (Elo), Rang Badge, Expert Badges, Top Scouts list.

### Gaps

1. No per-player accuracy (hitRate is global).
2. No consensus accuracy metric.
3. No analyst specialization display.
4. No streak/momentum indicator.
5. No contrarian badge.

### Recommendations

1. AnalystMiniCard on hover/tap over author name.
2. Per-player hit rate tracking.
3. Consensus Accuracy in ScoutConsensus.

---

## 5. Content Creation Flow - Inline vs. Modal

### Assessment

Modal approach is correct for player takes and transfer rumors (quick actions). For research reports, the full-screen modal is problematic: context blindness (no player data visible), no markdown preview, no stat insertion.

### Recommended: Hybrid

Mobile: Full-screen modal + Data tab for condensed player stats.
Desktop (md+): Side panel (right 40%) or full page with player page on left, writing interface on right.
Both: Live markdown preview toggle, stat insertion buttons, auto-suggested tags.

---

## 6. Monetization Display - Earnings Visibility

### Current State

Earnings tracked comprehensively in AnalystTab (total earned per report, content earnings breakdown, creator stats, Creator Fund payouts). ResearchCard shows unlock price and count.

### Gaps and Recommendations

1. Add fee split preview to CreateResearchModal: show 80% author / 20% platform split below price input.
2. Add Research Demand indicator to CommunityTab (player page views, unlock activity).
3. Show earnings badge on own research posts in CommunityTab (author-only).
4. Earnings milestone toasts at 5, 10, 25 unlocks.

---

## 7. Transfer Rumors - Differentiation from Analysis

### Current State

Red-tinted cards, categories (Geruecht/Insider/Quelle), target club, source, 500 chars.

### Problems

No credibility scoring, no outcome tracking, no aggregation, unclear category definitions.

### Recommendations

Credibility Tiers: Tier 1 Geruecht (default, low weight), Tier 2 Quelle (must cite source, higher weight), Tier 3 Insider (verified/Gold+ only, highest weight).
Transfer-Radar: Group rumors by target club with weighted confidence percentage.
Rumor Resolution: rumor_outcome field (confirmed/denied/expired) feeding into author credibility.

---

## 8. Community Engagement

### Current Strengths

Upvote/Downvote, Replies (flat), Star Ratings, Tips, Follow, Share - all implemented.

### Recommendations

1. Expandable replies on ResearchCard (player page) for in-context discussion.
2. Hot Take badge for high-engagement posts (>= 5 replies or 40-60% vote ratio).
3. Bull vs. Bear pairing for opposing high-rated research posts side-by-side.
4. Defer threaded replies - flat is sufficient for pilot.

---

## 9. Competitive Analysis

| Feature | Seeking Alpha | StockTwits | BeScout (Current) | BeScout (Recommended) |
|---------|--------------|------------|-------------------|----------------------|
| Track Record | Detailed | None | Basic hitRate | Per-player + streaks |
| Analyst Rating | 1-5 stars | None | 1-5 stars | + accuracy sort |
| Paywall | Subscription | None | Per-article | Same (correct for pilot) |
| Sentiment | No | Yes | Trade-based | + research-based |
| Discovery | Algorithm | Chronological | Chronological+sort | Relevance algorithm |
| Author Profile | Rich | Basic | Good AnalystTab | + specialization |
| Debate Format | Bull/Bear | None | None | Add pairing |
| Editor Data | Rich charts | None | None | + stat insertion |
| Rumor Tracking | N/A | N/A | Basic | + credibility/resolution |

BeScout community scouting is the competitive moat. Sorare has no user-generated research, no analyst reputation, no paid research marketplace.

---

## 10. Implementation Priority Matrix

### Phase 1 - Quick Wins

1. Add Write Research button to CommunityTab (30 min) - eliminates flow break
2. Port sort/filter from CommunityResearchTab (2 hours) - improves discovery
3. Fee split preview in CreateResearchModal (30 min) - earnings expectations
4. Own-post earnings badge in CommunityTab (1 hour) - motivates creation
5. Accuracy sort option (1 hour) - surfaces trust

### Phase 2 - Medium Effort

6. Scout Toolkit card (3 days) - research context
7. Expandable replies on ResearchCard (2 days) - in-context engagement
8. Analyst MiniCard hover/tap (2 days) - trust signal
9. Transfer Rumor aggregation (3 days) - novel feature
10. Markdown live preview (2 days) - writer QoL

### Phase 3 - Significant Investment

11. Split-panel writing desktop (5 days) - premium authoring
12. Per-player hit rate tracking (3 days) - granular trust
13. Bull vs. Bear debate pairing (4 days) - content format
14. Rumor resolution system (5 days) - feedback loop
15. Consensus accuracy history (3 days) - crowd accuracy

### Phase 4 - Post-Launch

16. Stat insertion buttons - scout productivity
17. Research demand indicator - content guidance
18. Analyst specialization badges - trust depth
19. Contrarian badge system - independent thinking
20. Hot Take / Most Discussed surfacing - engagement

---

## 11. Metrics to Track

| Metric | Target | Why |
|--------|--------|-----|
| Research posts per week | 10+ | Content supply |
| Research unlocks per week | 50+ | Demand / monetization |
| Avg rating of research | >= 3.5 | Content quality |
| Research with >= 3 ratings | >= 50% | Reader engagement |
| Analyst retention (2+ reports) | >= 40% | Creator stickiness |
| Player page to research creation | < 5 min | Flow efficiency |

---

## Summary

The BeScout scouting system has a strong foundation: research posts with paywalls, star ratings, hit-rate tracking, analyst scores, and a consensus widget. The primary UX gaps center on three themes:

1. **Context continuity** - the scout loses player context when creating research. The data and the editor are separated across pages and modals.
2. **Content discovery** - the player page shows research chronologically without quality signals. Sorting, filtering, and relevance ranking exist on the Community page but not where the player context is.
3. **Feedback loops** - the system tracks accuracy and earnings, but these signals are not visible where scouts and readers interact with the content.

The recommended changes are additive - they enhance existing components rather than requiring architectural changes. The highest-ROI items (Phase 1) can be shipped in a few days and directly improve the scout experience on the player page.
