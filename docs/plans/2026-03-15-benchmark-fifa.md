# Benchmark: FIFA / EA FC Ultimate Team -- Card and Detail System

> BeScout Product Design Research | March 2026
> Purpose: Inform DPC card redesign and mastery-tier visual system

---

## 1. Card Design System -- Rarity Tiers

FIFA Ultimate Team card system is built on a layered rarity hierarchy where **visual design alone communicates value** before any stat is read. Every tier has a distinct color identity, texture language, and emotional register.

### Base Tiers (OVR-based)

| Tier | OVR Range | Color | Visual Character |
|------|-----------|-------|------------------|
| **Bronze Common** | 40-64 | Matte copper | Flat, utilitarian, no sheen |
| **Bronze Rare** | 40-64 | Polished bronze | Subtle metallic shimmer |
| **Silver Common** | 65-74 | Cool grey | Clean, modern |
| **Silver Rare** | 65-74 | Bright silver | Light metallic reflection |
| **Gold Common** | 75-84 | Warm gold | Recognizable but restrained |
| **Gold Rare** | 85+ | Rich, saturated gold | The iconic FUT card -- geometric facets, brighter warmth |

**Key design insight:** Common vs Rare within the same metal tier is differentiated by shimmer and surface treatment, not color change. This teaches us that **surface effects (shimmer, reflection) can encode rarity without changing the base palette**.

### Special / Promo Tiers

| Tier | Color Scheme | Visual Identity | Emotional Register |
|------|-------------|-----------------|-------------------|
| **TOTW** | Black + gold | Dark, bold, geometric shapes. Darker background for sophisticated aesthetic. | Authority, weekly prestige |
| **TOTY** | Royal blue + gold | Vibrant royal blue + shimmering gold. FIFA 19 added shattered-glass backgrounds and filigree. | Ultimate prestige, annual pinnacle |
| **TOTS** | League-specific + gold | Highest stat boosts. Each league gets a thematic color variant. | End-of-season reward |
| **Icons** | White + gold | Clean, premium. Diagonal gold line behind player. Three sub-tiers (Base/Mid/Prime). | Legacy, timelessness |
| **Heroes** | Comic-book, multi-color | Energetic patterns, vivid hues. Different from Icons -- more playful. | Nostalgia, cult status |
| **Future Stars** | Blue/purple gradient | Young talent celebration. Upgraded based on potential. | Hope, excitement |

### Design Pattern: Four Visual Levers

1. **Base color** -- dominant hue (gold, blue, black, white)
2. **Accent treatment** -- gold accent intensity varies by tier
3. **Surface texture** -- flat matte (Bronze) to animated holographic (TOTY)
4. **Background complexity** -- simple geometry to intricate filigree

Hierarchy: **flat -> metallic -> textured -> animated**.

---

## 2. Card Face Layout -- Information Hierarchy

FIFA 14 introduced the modern vertical rectangular format -- instantly recognizable worldwide.

### Element Placement

```
+----------------------------------+
|  [OVR]  [POS]                    |  <- Rating + Position
|  [FLAG]                          |  <- Nation flag
|  [BADGE]                         |  <- Club badge
|        [PLAYER PHOTO]            |  <- ~40% of card
|        PLAYER NAME               |  <- Center-aligned
|  PAC -- SHO    DRI -- DEF        |  <- 2x3 stat grid
|         PAS -- PHY               |
| [CHEM]          [STYLE]          |  <- Chemistry + Style
+----------------------------------+
```

### Information Hierarchy Principles

1. **OVR Rating dominates** -- Largest text, top-left. Primary sort/compare value.
2. **Position** -- Adjacent to OVR. Two data points (93 ST) = instant identification.
3. **Identity cluster** -- Nation flag + club badge stacked vertically. Icons, no labels needed.
4. **Player photo** -- ~40% of card. Primary visual identifier.
5. **Name** -- Below photo, center-aligned. Emotional center of the card.
6. **Six stats** -- 2x3 grid: 2-digit number + 3-letter abbreviation. **Scannable in under 1 second.**
7. **Chemistry + Style** -- Bottom. Secondary squad-building context.

### Why This Layout Works

- **Progressive disclosure:** OVR -> Position -> Identity -> Stats
- **Scannable stats:** 6 abbreviated stats learned once, recognized forever
- **Photo primacy:** Emotional connection through human face
- **Consistent layout:** Same layout Bronze to TOTY -- only frame changes. Rarity = feel, not rearrangement.

---

## 3. Player Detail View -- Full Stats Breakdown

When you tap a card in FUT, the 6 face stats expand into 29+ sub-attributes.

### Stat Decomposition (6 -> 29+)

| Face Stat | Sub-Attributes (Weight) |
|-----------|------------------------|
| **PAC** | Sprint Speed (55%), Acceleration (45%) |
| **SHO** | Finishing (45%), Shot Power (20%), Long Shots (20%), Att. Position (5%), Volleys (5%), Penalties (5%) |
| **PAS** | Short Pass (35%), Crossing (20%), Vision (20%), Long Pass (15%), Curve (5%), FK Acc. (5%) |
| **DRI** | Dribbling (50%), Ball Control (35%), Agility (10%), Balance (5%) |
| **DEF** | Stand Tackle (30%), Def. Awareness (30%), Interceptions (20%), Slide Tackle (10%), Heading (10%) |
| **PHY** | Strength (50%), Stamina (25%), Aggression (20%), Jumping (5%) |

### Detail View Organization

1. Card preview with face stats
2. Full 29+ attributes grouped by category with bars
3. PlayStyles -- skill traits with descriptions
4. Roles -- tactical fit indicators
5. Bio -- age, height, foot, weak foot, skill moves, work rates
6. Market info -- price, trend

**Key UX Insight:** Summary -> detail pattern. Card face = quick decisions. Detail view = optimization.

---

## 4. Market Integration -- Transfer Market Data on Cards

### In-Game Transfer Market

- Auction-based: Start Price + Buy Now (BIN) + duration
- Card face unchanged -- market data displayed *around* it
- **Compare Price feature** for checking current listings
- EA-enforced price ranges prevent manipulation
- 5% seller tax on all transactions
- Two buy modes: Bid (auction) or Buy Now (instant)
- Watch feature for tracking without bidding

### Third-Party Data (FUTBIN, FUT.GG)

- 30-day price history graphs
- Per-platform pricing
- Supply indicators (listing count)
- Community price predictions

**Key Insight:** FIFA keeps market data **separate from card identity**. Card = product; market data = context. Cards feel like collectibles first, financial instruments second.

---

## 5. Chemistry and Synergy -- Visual Connection System

### Chemistry Points (0-3)

Displayed as **blue diamonds** on card. Three link types:

| Link | Requirement |
|------|------------|
| **Club** | 4 same club -> +2; 7 -> +3 |
| **League** | 3 same league -> +1; 8 -> +3 |
| **Nationality** | 2 same country -> +1; 5 -> +2; 8 -> +3 |

- Icons: always full 3 chemistry
- 0 chemistry: base stats (no penalty, no bonus)
- 3 chemistry: full style boost applied
- Chemistry styles direct bonuses: Hunter (+Pace/Shooting), Shadow (+Pace/Defending), etc.

**Relevance to BeScout:** Club synergy in Fantasy should use diamond indicators. Key: no-penalty design -- reward synergy, never punish absence.

---

## 6. Card Evolution / Upgrades -- Dynamic Progression

### Evolution System

- Complete objectives -> permanent stat boosts (with caps)
- Card appearance changes as it evolves
- Multiple chained evolutions create unique versions

### Cosmetic Evolution (FC 25)

- Change card color/palette
- Add animated backgrounds, sound effects, badges
- Purely visual, earned through gameplay

### TOTW Dynamic Items

- Real-world performance -> card upgrades weekly
- In-Form cards: black + gold, +1 to +3 OVR boost
- Multiple IFs stack over season

### Visual Progression

1. Border elaboration at higher levels
2. Static -> subtle motion -> full animation
3. Color saturation deepens
4. Unique badges/effects unlock

### Mapping to BeScout DPC Mastery (1-5)

| Level | FIFA Equivalent | Visual Treatment |
|-------|----------------|------------------|
| **1** | Gold Common | Clean card, position color, standard border |
| **2** | Gold Rare | Metallic shimmer, subtle glow |
| **3** | TOTW | Dark premium background, gold accent |
| **4** | Special Promo | Animated background, enhanced glow ring |
| **5** | TOTY / Icon | Full holographic, animated border, unique texture |

---

## 7. Emotional Design -- The Dopamine Architecture

### Pack Opening Animation Hierarchy

| OVR | Animation | Anticipation |
|-----|-----------|-------------|
| <80 | No cutscene, immediate reveal | None |
| 81-85 (Board) | Hallway walk, sequential reveal (position/nation/league/club) | Moderate |
| 86+ (Walkout) | Gold lines flare to ceiling, triangle lights, player walks out | High |
| 90+ (Elite) | All walkout + personalized animations, fireworks | Maximum |

### The Reveal Sequence

1. Pack appears -- anticipation begins
2. Tunnel view -- dark silhouette
3. Sequential drip: Position -> Flag -> League -> Club
4. Card flip -- full reveal with stats
5. Audio crescendo peaks at reveal

Designed to let imagination fill gaps -- each info piece narrows possibilities while maximizing the unknown.

### Psychology (5 Triggers)

1. **Variable Reward Schedules** -- unpredictable intervals drive engagement
2. **Anticipation > Reward** -- dopamine spikes during anticipation, not receipt
3. **Social Comparison** -- YouTube/TikTok pack opening creates FOMO
4. **Sunk Cost Escalation** -- financial commitment drives continued spending
5. **Illusion of Control** -- pack choice/timing creates false agency

### Emotional Attachment

- **Personal narrative** -- how you got the card
- **Performance memories** -- clutch in-game moments
- **Scarcity signaling** -- limited-time promos
- **Visual prestige** -- opponents notice rare designs
- **Evolution investment** -- evolved cards feel more personal

---

## 8. What BeScout Should Steal

### 8.1 Card Rarity Visual System -> DPC Mastery Levels

Rarity through **surface treatment, not layout change**. Keep position colors (GK=emerald, DEF=amber, MID=sky, ATT=rose). Layer mastery ON TOP:

```
Mastery 1: Matte surface, position color at 8% opacity (current)
Mastery 2: Metallic shimmer (CSS animation), border glow +50%
Mastery 3: card-carbon intensified, gold accent lines appear
Mastery 4: Animated gradient background, holographic activated
Mastery 5: Full holographic + animated border + particle effect
```

Existing card-metallic and card-holographic CSS classes can be gated by mastery level.

### 8.2 Stat Shape -> Radar Chart

Show **mini radar silhouette** on card front (5-axis, no labels, 40px) as stat fingerprint. Position color fill, gold outline. Shape alone communicates: balanced/specialist/scorer.

### 8.3 Quick-Scan Stats (6 at a Glance)

2x3 grid with large number + tiny label (FifaStat component). Refinement options:

| Current | Proposed | Why |
|---------|----------|-----|
| L5 | SCR | Clearer abbreviation for score |
| L15 | TRD | Trend with directional arrow |
| GOL | GOL | Keep |
| AST | AST | Keep |
| MAT | MIN | Minutes more granular than matches |
| FLOOR | MKT | Shorter at small size |

### 8.4 Border/Glow Per Tier

```
Mastery 1: 1.5px solid tint/40 (current)
Mastery 2: 2px solid tint/60, outer glow
Mastery 3: 2px gold/60, double-border
Mastery 4: 2.5px gold/80, animated gradient
Mastery 5: 3px animated gold + particle sparkle
```

### 8.5 Sequential Reveal for DPC Acquisitions

On purchase/IPO allocation (2-3 seconds):
1. Card face-down with position glow
2. Position pill animates in
3. Club badge fades in
4. Photo mask-wipe from center
5. Name + stats animate from bottom
6. Final glow pulse settles

### 8.6 Chemistry -> Synergy Diamonds

0-3 gold-filled diamonds per player in Fantasy lineup showing club/league synergy bonus.

---

## 9. What BeScout Should Adapt Differently

### 9.1 Real Money = Real Trust

FIFA: in-game currency, no real value. BeScout: real credits, real floor prices.
- Market data **prominent, not hidden** (floor price, trend arrow on card)
- No gamified price animations. Green up, red down. Factual.
- TradingDisclaimer within 1 tap of any market value display

### 9.2 No Loot Box / Pack Mechanics

BeScout users buy specific DPCs intentionally. No randomness.
- Reveal animation = celebration of **choice**, not chance
- Never add mystery packs or random bundles (gambling territory)
- Achievement/mission rewards CAN use reveals (genuinely surprising)

### 9.3 No Artificial Scarcity Theater

DPC supply is real (fixed IPO tranches, max 10,000 per player).
- Communicate honestly: "847 / 2,500 available"
- IPO countdowns are legitimate -- never fake urgency
- No FOMO dark patterns

### 9.4 Value = Performance, Not Rarity

FIFA TOTY is valuable because rare. DPC is valuable because real performance.
- Mastery = **engagement depth**, not artificial rarity
- Visual upgrades earned through activity, never purchased
- L5/L15 scores are **real data** -- BeScout advantage over FIFA

### 9.5 Professional, Not Playful

FIFA is a game. BeScout involves real money.
- Subtle, purposeful animations (3D tilt, smooth transitions)
- Financial typography: font-mono tabular-nums (already in place)
- Dark restrained palette (#0a0a0a). Gold = premium, not playful.
- No comic-book aesthetics. Luxury collectible, not trading card.

### 9.6 Stat Transparency Over Inflation

FIFA: chemistry silently boosts stats. BeScout: all data verifiable.
- Every number = real, auditable data point
- Synergy bonuses shown explicitly: "Base 7.2 + Synergy +0.8 = 8.0"
- Detail view shows sources: "L5 from GW24-28, API-Football"

---

## 10. Implementation Priorities

### Phase 1: Quick Wins

1. **Mastery tier visuals** -- Gate card-holographic/card-metallic CSS by mastery level
2. **Border glow scaling** -- boxShadow intensity per mastery in TradingCardFrame
3. **Mini radar silhouette** -- 40px RadarChart on card front

### Phase 2: Card Polish

4. **Stat abbreviation refinement** -- optimize 6-stat grid
5. **DPC acquisition reveal** -- 2-3s animation for purchases/IPOs
6. **Synergy diamonds** -- 0-3 gold diamonds in Fantasy lineup

### Phase 3: Premium Experience

7. **Mastery 4-5 animations** -- CSS/WebGL borders and particles
8. **Cosmetic evolution** -- accent color customization
9. **Card comparison** -- side-by-side radar overlay

---

## Sources

- [EA FC 25 Card Designs](https://www.mrgeek.net/blog/every-thing-about-ea-fc-25-card-designs)
- [FC 25 Player Cards Guide](https://fifauteam.com/fc-25-player-cards-guide/)
- [FC 25 Chemistry](https://fifauteam.com/fc-25-chemistry/)
- [FC 25 Chemistry (ESTNN)](https://estnn.com/ea-fc-25-chemistry-system-explained/)
- [FC 25 Attributes](https://supercoinsy.com/article/ea-sports-fc-25-player-attributes)
- [FC 25 Attributes Guide](https://fifauteam.com/fc-25-attributes/)
- [FC 25 Evolutions (Dexerto)](https://www.dexerto.com/ea-sports-fc/ea-fc-25-evolutions-explained-entry-requirements-and-cosmetic-changes-2900802/)
- [FC 25 Evolutions (FUTBIN)](https://www.futbin.com/news/articles/1349/how-do-evolutions-work-in-fc-25)
- [FC 25 Pack Animations (Dexerto)](https://www.dexerto.com/ea-sports-fc/ea-fc-25-pack-animations-boards-walkouts-2903536/)
- [FC 25 Walkouts (SuperCoinsy)](https://supercoinsy.com/article/ea-sports-fc-25-walkouts)
- [Pack Opening Psychology (FIFA Infinity)](https://www.fifa-infinity.com/ea-sports-fc/the-psychology-behind-pack-opening-in-ultimate-team/)
- [FUT Card Design History (FutGraphics)](https://futgraphics.com/articles/the-evolution-of-fut-cards-a-visual-history-from-fifa-09-to-ea-fc-24)
- [FC 25 Transfer Market (SuperCoinsy)](https://supercoinsy.com/article/ea-sports-fc-25-transfer-market-complete-guide)
- [Transfer Market (FIFPlay)](https://www.fifplay.com/encyclopedia/transfer-market/)
- [FUT Price Ranges (EA)](https://www.easports.com/fifa/ultimate-team/news/2015/fut-price-ranges-faq)
- [FUT Player Cards (FIFPlay)](https://www.fifplay.com/encyclopedia/fut-player-cards/)
- [FUT Card Template](https://gbradhopkins.com/graphic/design/2020/02/18/FUT-illustrator-template.html)
- [FC 25 TOTY (EA)](https://www.ea.com/games/ea-sports-fc/fc-25/news/fc-25-toty)
- [FC 25 Ultimate Team (EA)](https://www.ea.com/en/games/ea-sports-fc/fc-25/features/ultimate-team)
- [FC 25 FC IQ Deep Dive (EA)](https://www.ea.com/en/games/ea-sports-fc/fc-25/news/pitch-notes-fc-25-fc-iq-deep-dive)
