# Player Detail UX Polish — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add empty states, clean up hero CTAs, and improve visual breathing room on the Player Detail page.

**Architecture:** Pure UI changes across 6 components + i18n files. No DB/RPC/service changes. All changes are in `src/components/player/detail/` and `messages/`.

**Tech Stack:** React, next-intl, Tailwind, lucide-react

---

### Task 1: i18n Keys (DE + TR)

**Files:**
- Modify: `messages/de.json:4113` (before closing `}` of playerDetail)
- Modify: `messages/tr.json:4113` (same position)

**Step 1: Add new keys to DE**

In `messages/de.json`, inside the `"playerDetail"` namespace, before the closing `}` (line 4113 currently ends with `"moreOrders": "weitere"`), add after that line:

```json
    "moreOrders": "weitere",
    "emptyTradingTitle": "Sei der erste Scout",
    "emptyTradingDesc": "Kaufe die erste Scout Card und starte den Markt fuer diesen Spieler.",
    "emptyTradingBuy": "Jetzt kaufen",
    "emptyChartTitle": "Erster Trade setzt den Kurs",
    "emptyChartIpo": "IPO-Preis: {price} CR",
    "emptyResearchDesc": "Noch keine Analysen — verdiene Credits mit deinem ersten Scout Report",
    "emptyPostsDesc": "Die Community wartet auf deine Einschaetzung",
    "showAllOrders": "Alle {count} Orders anzeigen",
    "sellLabel": "Verkaufen"
```

**Step 2: Add new keys to TR**

Same position in `messages/tr.json`:

```json
    "moreOrders": "daha fazla",
    "emptyTradingTitle": "Ilk Scout sen ol",
    "emptyTradingDesc": "Ilk Scout Card'i al ve bu oyuncunun piyasasini baslat.",
    "emptyTradingBuy": "Simdi al",
    "emptyChartTitle": "Ilk islem fiyati belirler",
    "emptyChartIpo": "IPO Fiyati: {price} CR",
    "emptyResearchDesc": "Henuz analiz yok — ilk Scout Raporu'nla Credits kazan",
    "emptyPostsDesc": "Topluluk senin degerlendirmeni bekliyor",
    "showAllOrders": "Tum {count} emri goster",
    "sellLabel": "Sat"
```

**Step 3: Verify JSON is valid**

Run: `node -e "require('./messages/de.json'); require('./messages/tr.json'); console.log('OK')"`
Expected: `OK`

---

### Task 2: PriceChart Empty State

**Files:**
- Modify: `src/components/player/detail/PriceChart.tsx`

**Step 1: Add ipoPrice and referencePrice props**

Change the interface (line 11-15) to add a `referencePrice` prop:

```typescript
interface PriceChartProps {
  trades: DbTrade[];
  ipoPrice?: number;
  referencePrice?: number;
  className?: string;
}
```

Update the function signature (line 48):

```typescript
export default function PriceChart({ trades, ipoPrice, referencePrice, className = '' }: PriceChartProps) {
```

**Step 2: Replace the early return with empty state**

Currently line 116: `if (!chartData) return null;`

Replace with:

```tsx
if (!chartData) {
  const placeholderPrice = ipoPrice ? centsToBsd(ipoPrice) : referencePrice ? centsToBsd(referencePrice) : null;
  return (
    <Card className={`p-4 md:p-6 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-black text-lg flex items-center gap-2 text-balance">
          <BarChart3 className="size-5 text-gold" aria-hidden="true" />
          {t('priceHistory')}
        </h3>
      </div>
      <div className="relative h-[160px] flex items-center justify-center">
        {placeholderPrice != null && (
          <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-gold/30" />
        )}
        <div className="relative z-10 text-center">
          <BarChart3 className="size-8 mx-auto mb-2 text-white/15" aria-hidden="true" />
          <p className="text-sm text-white/40 font-medium">{tpd('emptyChartTitle')}</p>
          {placeholderPrice != null && (
            <p className="text-xs text-gold/60 font-mono tabular-nums mt-1">
              {tpd('emptyChartIpo', { price: fmtScout(placeholderPrice) })}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
```

**Step 3: Pass referencePrice from TradingTab**

In `TradingTab.tsx` line 80-83, add the new prop:

```tsx
<PriceChart
  trades={trades}
  ipoPrice={player.prices.ipoPrice ? Math.round(player.prices.ipoPrice * 100) : undefined}
  referencePrice={player.prices.referencePrice ? Math.round(player.prices.referencePrice * 100) : undefined}
/>
```

---

### Task 3: Trading Tab — Combined Empty State + Spacing + Collapsed Defaults

**Files:**
- Modify: `src/components/player/detail/TradingTab.tsx`

**Step 1: Add onBuyClick prop**

Add to TradingTabProps interface (after line 40):

```typescript
  onBuyClick?: () => void;
```

Add to destructured props (line 48):

```typescript
  onBuyClick,
```

**Step 2: Add combined empty state at top of return**

After the admin restriction block (line 77) and before the PriceChart (line 79), add:

```tsx
{/* ── Combined Empty State (no trades AND no orders) ── */}
{trades.length === 0 && allSellOrders.length === 0 && !isRestrictedAdmin && (
  <>
    <PriceChart
      trades={trades}
      ipoPrice={player.prices.ipoPrice ? Math.round(player.prices.ipoPrice * 100) : undefined}
      referencePrice={player.prices.referencePrice ? Math.round(player.prices.referencePrice * 100) : undefined}
    />
    <Card className="p-8 text-center">
      <ShoppingCart className="size-10 mx-auto mb-3 text-white/15" aria-hidden="true" />
      <h3 className="font-black text-lg mb-1">{t('emptyTradingTitle')}</h3>
      <p className="text-sm text-white/40 mb-4 max-w-xs mx-auto">{t('emptyTradingDesc')}</p>
      {onBuyClick && (
        <button
          onClick={onBuyClick}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#FFE44D] to-[#E6B800] text-black font-bold text-sm active:scale-[0.97] transition-transform"
        >
          <ShoppingCart className="size-4" />
          {t('emptyTradingBuy')}
        </button>
      )}
    </Card>
    <TradingDisclaimer variant="card" />
  </>
)}
```

**Step 3: Wrap existing sections in condition**

Wrap everything from the existing PriceChart (line 79) down to `<TradingDisclaimer />` (line 434) in:

```tsx
{(trades.length > 0 || allSellOrders.length > 0) && (
  <>
    {/* all existing sections 1-11 + disclaimer */}
  </>
)}
```

**Step 4: Increase spacing**

Change the root div (line 69):

```tsx
<div className="space-y-5 md:space-y-8">
```

**Step 5: Trade History — show 3 instead of 5**

Line 66, change:

```typescript
const visibleTrades = historyExpanded ? trades : trades.slice(0, 3);
```

Line 363, change threshold:

```tsx
{trades.length > 3 && (
```

**Step 6: Order Book — collapsed by default when > 5**

Add state at top of component (after line 54):

```typescript
const [ordersExpanded, setOrdersExpanded] = useState(false);
```

In section 7 (line 229-279), after `allSellOrders.map(...)` block, limit visible orders:

Replace the map (line 253):
```tsx
{(ordersExpanded ? allSellOrders : allSellOrders.slice(0, 5)).map((order) => {
```

Add expand button after the orders list (before closing `</div>` of section 7, around line 276):

```tsx
{allSellOrders.length > 5 && (
  <div className="border-t border-white/[0.06] mt-2">
    <button
      onClick={() => setOrdersExpanded(v => !v)}
      className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-white/40 hover:text-white/60 transition-colors"
    >
      {ordersExpanded ? t('showLess') : t('showAllOrders', { count: allSellOrders.length })}
      <ChevronDown className={cn('size-3.5 transition-transform', ordersExpanded && 'rotate-180')} />
    </button>
  </div>
)}
```

---

### Task 4: Community Tab — Improved Empty Texts

**Files:**
- Modify: `src/components/player/detail/CommunityTab.tsx`

**Step 1: Update research empty state text**

Line 220, change:

```tsx
<div className="text-white/50 text-sm">{t('emptyResearchDesc')}</div>
```

**Step 2: Update posts empty state text**

Line 289, change:

```tsx
<div className="text-white/50 text-sm mb-2">{t('emptyPostsDesc')}</div>
```

---

### Task 5: Hero Bottom — Add Limit Order CTA

**Files:**
- Modify: `src/components/player/detail/PlayerHero.tsx`

**Step 1: Add onLimitClick prop**

Add to PlayerHeroProps interface (after line 35):

```typescript
  onLimitClick?: () => void;
```

Add to destructured props in PlayerHeroInner (line 47):

```typescript
  onLimitClick,
```

**Step 2: Add Limit Order button to desktop CTAs**

Import Clock icon — add to lucide imports (line 8):

```typescript
import {
  ArrowLeft, Star, Share2, Bell, TrendingUp, TrendingDown,
  Users, MoreVertical, ShoppingCart, Send, XCircle, ArrowLeftRight, Clock,
} from 'lucide-react';
```

Lines 258-268, update the desktop CTA block:

```tsx
{!player.isLiquidated && (
  <div className="hidden md:flex gap-2 mt-4 w-full">
    <Button variant="gold" className="text-sm font-bold px-6" onClick={onBuyClick}>
      <ShoppingCart className="size-4" /> {t('hero.buy')}
    </Button>
    {onLimitClick && (
      <Button variant="outline" className="text-sm font-bold px-3" onClick={onLimitClick} aria-label={t('hero.limitOrder')}>
        <Clock className="size-4" />
      </Button>
    )}
    {holdingQty > 0 && (
      <Button variant="outline" className="text-sm font-bold px-6" onClick={onSellClick}>
        <Send className="size-4" /> {t('hero.sell')}
      </Button>
    )}
  </div>
)}
```

Note: `t('hero.limitOrder')` should use existing key from `player` namespace. Check if it exists — if not, use the `playerDetail.limitOrderTitle` key via a second `useTranslations('playerDetail')`.

---

### Task 6: MobileTradingBar — Add Sell Text Label

**Files:**
- Modify: `src/components/player/detail/MobileTradingBar.tsx`

**Step 1: Add sell text**

Line 75-81, change the Sell button:

```tsx
{holdingQty > 0 && (
  <Button
    variant="outline"
    className="text-sm font-bold min-h-[44px] px-4"
    onClick={onSellClick}
  >
    <Send className="size-4" aria-hidden="true" />
    {t('sell')}
  </Button>
)}
```

---

### Task 7: PlayerContent — Wire New Props

**Files:**
- Modify: `src/app/(app)/player/[id]/PlayerContent.tsx`

**Step 1: Pass onBuyClick to TradingTab**

Line 287-305, add the prop:

```tsx
<TradingTab
  player={player}
  trades={trades}
  allSellOrders={allSellOrders}
  tradesLoading={tradesLoading}
  profileMap={profileMap}
  userId={uid}
  dpcAvailable={dpcAvailable}
  openBids={openBids}
  holdingQty={holdingQty}
  holderCount={holderCount}
  mastery={masteryData && holdingQty > 0 ? { level: masteryData.level, xp: masteryData.xp } : null}
  onAcceptBid={trading.handleAcceptBid}
  acceptingBidId={trading.acceptingBidId}
  onOpenOfferModal={trading.openOfferModal}
  isRestrictedAdmin={isRestrictedAdmin}
  playerResearch={playerResearch}
  onBuyClick={guardedBuy}
/>
```

**Step 2: Pass onLimitClick to PlayerHero**

Line 263-279, add the prop:

```tsx
<PlayerHero
  player={player}
  isIPO={trading.isIPO}
  activeIpo={activeIpo ?? null}
  holderCount={holderCount}
  holdingQty={holdingQty}
  isWatchlisted={isWatchlisted}
  priceAlert={alerts.priceAlert}
  onToggleWatchlist={() => setIsWatchlisted(!isWatchlisted)}
  onShare={handleShare}
  onBuyClick={guardedBuy}
  onSellClick={guardedSell}
  onLimitClick={() => setShowLimitOrder(true)}
  onSetPriceAlert={alerts.handleSetPriceAlert}
  onRemovePriceAlert={alerts.handleRemovePriceAlert}
  masteryLevel={masteryData?.level ?? 0}
  matchTimeline={matchTimelineData ?? []}
/>
```

---

### Task 8: Performance Tab — Spacing

**Files:**
- Modify: `src/components/player/detail/PerformanceTab.tsx`

**Step 1: Increase spacing**

Line 92, change:

```tsx
<div className="space-y-5 md:space-y-8">
```

---

### Task 9: Verify Build

**Step 1: TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 2: Visual spot check**

Check player detail page for:
- Player with 0 trades → empty chart + combined empty trading state visible
- Player with trades → all sections render normally with new spacing
- Desktop hero → Buy + Limit + Sell buttons
- Mobile → Sell button has text label
- Community tab empty → improved texts

---

### Task 10: Commit

```bash
git add src/components/player/detail/PriceChart.tsx \
  src/components/player/detail/TradingTab.tsx \
  src/components/player/detail/CommunityTab.tsx \
  src/components/player/detail/PlayerHero.tsx \
  src/components/player/detail/MobileTradingBar.tsx \
  src/components/player/detail/PerformanceTab.tsx \
  src/app/\(app\)/player/\[id\]/PlayerContent.tsx \
  messages/de.json messages/tr.json
git commit -m "feat: player detail UX polish — empty states, hero CTAs, breathing room"
```
