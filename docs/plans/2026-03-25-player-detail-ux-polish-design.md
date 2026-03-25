# Player Detail UX Polish — Design

**Date:** 2026-03-25
**Tier:** 3 (Scoped, ~150 LOC across 5 files)
**Scope:** Empty States + Hero CTA Cleanup + Visual Breathing Room

---

## 1. Empty States

### 1A. PriceChart — IPO Placeholder (PriceChart.tsx)

**When:** `trades.length < 2` (currently returns `null`)

**Show instead:**
- Card stays visible with same header ("Preisverlauf")
- Dashed horizontal line at IPO price (or `referencePrice` fallback)
- Centered below: BarChart3 icon + "Erster Trade setzt den Kurs"
- Small text: IPO price value if available
- Time range buttons hidden
- No crosshair handler

### 1B. Trading Tab — Combined Empty State (TradingTab.tsx)

**When:** `trades.length === 0 && allSellOrders.length === 0`

**Show instead of all individual sections:**
- Single Card with ShoppingCart icon
- Headline: "Sei der erste Scout"
- Sub: "Kaufe die erste Scout Card und starte den Markt fuer diesen Spieler."
- Gold Buy CTA button (calls existing onBuyClick from parent via new prop)
- Below: TradingDisclaimer (compliance, always present)
- Skip: PriceChart, QuickStats, Orderbook, History, etc.

**When some data exists:** Individual sections render as-is (existing behavior).

### 1C. Community Tab — Improved Empty Text (CommunityTab.tsx)

**Research empty (already has Card):**
- Change text: "Noch keine Research-Berichte" → "Noch keine Analysen — verdiene Credits mit deinem ersten Scout Report"
- CTA link already exists → keep

**Posts empty (already has Button):**
- Change text: "Noch keine Aussagen" → "Die Community wartet auf deine Einschaetzung"
- Button already exists ("Sei der Erste") → keep

---

## 2. Hero Bottom — CTA Cleanup (PlayerHero.tsx)

**Desktop CTAs (lines 258-268):**
- Buy stays gold + prominent
- Sell stays outline, only when holdingQty > 0
- **Add:** Limit Order button (Clock icon + outline) — same as MobileTradingBar
- Requires new prop: `onLimitClick`

**Mobile Sell Button (MobileTradingBar.tsx):**
- Add text label "Sell" next to Send icon (currently icon-only, unclear)

---

## 3. Visual Breathing Room

### Spacing increases:
- TradingTab: `space-y-4 md:space-y-6` → `space-y-5 md:space-y-8`
- PerformanceTab: `space-y-4 md:space-y-6` → `space-y-5 md:space-y-8`

### Collapsed defaults:
- Trade History: `trades.slice(0, 5)` → `trades.slice(0, 3)`
- Order Book (Section 7, allSellOrders table): collapsed by default when > 5 orders, expand button

### No changes to:
- Card styling (bg-white/[0.02], border-white/10)
- Hero top + middle
- Tab structure
- Community Tab spacing (already okay)

---

## Files Changed

| File | Change |
|------|--------|
| `PriceChart.tsx` | Empty state with IPO line |
| `TradingTab.tsx` | Combined empty state + onBuyClick prop + spacing + collapsed defaults |
| `CommunityTab.tsx` | Improved empty state texts |
| `PlayerHero.tsx` | Add Limit Order CTA on desktop |
| `PlayerContent.tsx` | Pass onBuyClick to TradingTab, onLimitClick to Hero |
| `MobileTradingBar.tsx` | Add "Sell" text label |
| `messages/de.json` | New i18n keys |
| `messages/tr.json` | New i18n keys |

---

## i18n Keys (new)

```
playerDetail.emptyTradingTitle: "Sei der erste Scout" / "İlk Scout sen ol"
playerDetail.emptyTradingDesc: "Kaufe die erste Scout Card und starte den Markt fuer diesen Spieler." / "İlk Scout Card'ı al ve bu oyuncunun piyasasını başlat."
playerDetail.emptyTradingBuy: "Jetzt kaufen" / "Şimdi al"
playerDetail.emptyChartTitle: "Erster Trade setzt den Kurs" / "İlk işlem fiyatı belirler"
playerDetail.emptyChartIpo: "IPO-Preis: {price} CR" / "IPO Fiyatı: {price} CR"
playerDetail.emptyResearchDesc: "Noch keine Analysen — verdiene Credits mit deinem ersten Scout Report" / "Henüz analiz yok — ilk Scout Raporu'nla Credits kazan"
playerDetail.emptyPostsDesc: "Die Community wartet auf deine Einschaetzung" / "Topluluk senin değerlendirmeni bekliyor"
playerDetail.sell: "Verkaufen" / "Sat"
```
