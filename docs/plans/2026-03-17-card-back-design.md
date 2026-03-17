# Card Back — Trading + Performance

## Context
The TradingCardFrame currently has a back face that duplicates front data (same FIFA stats + StatBars).
Replace with a purposeful back showing **trading data + percentile performance bars**.

## Visual Language (MUST match front)
- **Background:** Same `card-carbon` + position-tint gradient (already shared)
- **Single accent color:** Position tint only (`posTintColors[pos]`). NO other colors for stats.
- **Typography:** `font-mono tabular-nums` for numbers, `font-black` for labels
- **Surfaces:** `rgba(255,255,255,0.05)` glassmorphism bars, NOT solid backgrounds
- **Opacity hierarchy:** Values = `white/90`, Labels = `white/35`, Dividers = `tint + gradient`
- **NO multi-color:** No green/red/blue for different stats. Position-tint + white opacities only.

## Layout (aspect-[3/4], 240px / md:280px)

### 1. Trading Data Block (top ~45%)

**Section label** — tiny, top-left:
```
text-[7px] font-bold uppercase tracking-[0.2em] text-white/25
"SCOUT CARD DATA"
```

**2x2 Metric Grid** — glassmorphism cells:
```
┌─────────┬─────────┐
│ Marktwert│  Floor  │  Each cell:
│  1.2M €  │  45 CR  │  - bg: rgba(255,255,255,0.04)
├─────────┼─────────┤  - border: 1px solid tint/15
│ 24h Chg  │ Fee Cap │  - label: text-[7px] white/35 uppercase
│  +3.2%   │ 120 CR  │  - value: text-[14px] md:text-[16px] font-mono font-black white/90
└─────────┴─────────┘
```

- `24h Change`: Value color = `tint` (NOT green/red). Prefix with +/- arrow character.
- `Fee Cap`: Show `—` if null (not yet set by club)
- `Marktwert`: Format as `1.2M €` / `350K €` / `—`
- `Floor`: Format via `fmtScout()`

**Holdings Row** (only if holdingQty > 0):
```
Below the grid, single row, centered:
"3 SC · 1.0% Supply"
text-[9px] font-medium, value in tint color, rest white/40
bg: tint/08, border: tint/15, rounded-lg, px-3 py-1.5
```

If no holdings: skip entirely (no empty state, no placeholder).

### 2. Label-Divider

```
mx-3 my-2
┌────── LEISTUNG ──────┐
```

Implementation:
```tsx
<div className="flex items-center gap-2 mx-3">
  <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, ${tint}40)` }} />
  <span className="text-[7px] font-bold uppercase tracking-[0.3em]" style={{ color: `${tint}60` }}>
    LEISTUNG
  </span>
  <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${tint}40, transparent)` }} />
</div>
```

### 3. Performance Bars Block (bottom ~40%)

**4 percentile bars** — same data source as `StatsBreakdown.tsx`:
- Compares player vs. all players of same position
- Position-dependent stat selection (GK: Saves/CS first, ATT: Goals first, etc.)

**Each bar row:**
```
Label (7px, white/35, uppercase, w-[32px])  |  Bar (flex-1, h-[4px])  |  Value (9px, white/70)  |  Pct (8px, white/25)

Bar track: bg rgba(255,255,255,0.06) rounded-full
Bar fill:  bg tint (single color), rounded-full, min-width 3%
```

**Spacing:** `space-y-2.5` between rows, `px-4` padding.

**Stat selection per position:**

| Pos | Stat 1 | Stat 2 | Stat 3 | Stat 4 |
|-----|--------|--------|--------|--------|
| GK  | SVS (Saves) | CS | SPI (Matches) | MIN |
| DEF | SPI | TOR (Goals) | ASS (Assists) | MIN |
| MID | ASS | TOR | SPI | MIN |
| ATT | TOR | ASS | SPI | MIN |

Labels: 3-letter abbreviations to fit card width.

### 4. Footer

Same as front:
```tsx
<div className="absolute bottom-1.5 inset-x-0 z-10 flex items-center justify-center gap-1.5 pointer-events-none">
  <!-- BeScout logo + "TAP TO FLIP" text -->
</div>
```

Replace current "Tap to flip" with the BeScout branding (same as front), and add a subtle
rotate icon hint instead.

## Props Changes

```typescript
// Extend CardBackStats (already exists)
interface CardBackStats {
  goals: number;
  assists: number;
  matches: number;
  cleanSheets: number;
  minutes: number;
  saves: number;
  l15: number;
  trend: Trend;
  floorPrice?: number;
}

// New: CardBackData replaces backStats
interface CardBackData {
  // Trading
  marketValueEur?: number;      // from player.marketValue
  floorPrice?: number;          // from player.prices.floor
  priceChange24h?: number;      // from player.prices.change24h
  successFeeCap?: number;       // from player.successFeeCap (in $SCOUT)

  // Holdings (personalized)
  holdingQty?: number;          // user's SC count
  supplyTotal: number;          // player.dpc.supply

  // Performance (for percentile bars)
  stats: {
    goals: number;
    assists: number;
    matches: number;
    cleanSheets: number;
    minutes: number;
    saves: number;
  };

  // Percentiles (pre-computed by caller, NOT computed inside card)
  percentiles: {
    goals: number;
    assists: number;
    matches: number;
    cleanSheets: number;
    minutes: number;
    saves: number;
  };
}
```

Percentiles are pre-computed by the parent (PlayerHero) using the same `calcPercentile` logic
from StatsBreakdown. The card itself does NOT receive allPlayers — it only renders.

## i18n Keys

Namespace: `player` (existing)

```json
{
  "cardBack.scoutCardData": "Scout Card Data",
  "cardBack.marketValue": "Marktwert",
  "cardBack.floorPrice": "Floor",
  "cardBack.change24h": "24h",
  "cardBack.feeCap": "Fee Cap",
  "cardBack.holdings": "{count} SC · {pct}% Supply",
  "cardBack.leistung": "Leistung",
  "cardBack.statSVS": "SVS",
  "cardBack.statCS": "CS",
  "cardBack.statSPI": "SPI",
  "cardBack.statTOR": "TOR",
  "cardBack.statASS": "ASS",
  "cardBack.statMIN": "MIN"
}
```

## What NOT to do
- NO RadarChart — removed in previous iteration, don't re-add
- NO multiple accent colors — position tint is THE color
- NO success/error coloring for 24h change — use tint only
- NO duplicating front-face stats (L5, L15 already on front)
- NO empty states for missing data — show `—` dash
- NO extra shadows/glows beyond what the front already has

## Files to Change
1. `src/components/player/detail/TradingCardFrame.tsx` — replace back face
2. `src/components/player/detail/PlayerHero.tsx` — compute percentiles, pass new props
3. `messages/de.json` + `messages/tr.json` — add cardBack.* keys
