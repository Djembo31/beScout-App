---
paths:
  - "src/components/profile/**"
  - "src/app/**/profile/**"
  - "src/lib/services/profiles*"
  - "src/lib/services/social*"
---

## ProfileView (Kern-Component)
- Props: `targetUserId`, `targetProfile`, `isSelf`, `renderSettings?`
- Laedt 11+ Datenquellen parallel via `Promise.allSettled()`
- Cancellation Token Pattern gegen setState nach Unmount
- Retry via `retryCount` State

## isSelf Steuerung
| Feature | Self | Public |
|---------|------|--------|
| Portfolio Tab | ja | nein |
| Settings Tab | ja | nein |
| Wallet Balance | ja | nein |
| Follow Button | nein | ja |
| Transactions | alle Typen | nur PUBLIC_TX_TYPES |
| Level-Up Toast | ja | nein |

```typescript
PUBLIC_TX_TYPES = ['buy', 'sell', 'ipo_buy', 'fantasy_join', 'fantasy_reward',
  'bounty_reward', 'research_earning', 'mission_reward', 'streak_reward',
  'poll_revenue', 'pbt_liquidation', 'tip_receive', 'scout_subscription_earning',
  'creator_fund_payout', 'ad_revenue_payout']
```

## Tabs
```typescript
type ProfileTab = 'overview' | 'portfolio' | 'activity' | 'settings'
// portfolio + settings nur wenn isSelf
visibleTabs = TAB_IDS.filter(t => !t.selfOnly || isSelf)
```

## Handle-System
- Regex: `/^[a-z0-9_]{3,20}$/` (lowercase, alphanumeric + underscore)
- Validation: `handle.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20)`
- Availability Check: debounced 500ms
- States: idle → checking → available | taken | invalid | unchanged

## Follow-System
- `followUser(followerId, followingId)` → RPC + Activity Log + Notification
- `unfollowUser(followerId, followingId)` → RPC + Activity Log
- Optimistic Update: `setFollowerCount(c => Math.max(0, c - 1))` — Guard gegen Underflow
- Follow-Liste: max 50, mit ProfileSummary + Rang Badge + Follow-Toggle

## Portfolio-Berechnungen
```typescript
portfolioValueCents = holdings.reduce((s, h) => s + h.quantity * (h.player?.floor_price ?? 0), 0)
portfolioCostCents = holdings.reduce((s, h) => s + h.quantity * h.avg_buy_price, 0)
pnlCents = portfolioValueCents - portfolioCostCents
```

## Scout Scores (3-Dim Elo)
- Anzeige: RangBadge + DimensionRangStack (3 einzelne Karten)
- Gesamt-Rang = Median der 3 Scores
- Scouting Stats: Reports, Hit-Rate (gold wenn >=60%), Avg Rating, Approved Bounties

## Settings
- Handle: sofortige Validation + 500ms Debounce Availability Check
- Sprache: Cookie `bescout-locale` setzen → `window.location.reload()` (Full Reload fuer i18n)
- Avatar: max 2MB, Supabase Storage

## Activity Tab
- Initial Load: 50 Transactions, PAGE_SIZE = 20 fuer Load-More
- Public Profiles: gefiltert auf PUBLIC_TX_TYPES

## Cross-Domain (bei Bedarf nachladen)
- **Gamification:** RangBadge, ScoreRoad, Achievements, 3-Dim Elo System → `gamification.md`
- **Trading:** Portfolio Holdings, Floor Price, PnL-Berechnung → `trading.md`
- **Community:** Research Track Record, Bounty Stats, Scouting Evaluation → `community.md`

## Haeufige Fehler
- `floor_price ?? 0` — IMMER Null-Guard
- Cancellation Token vergessen → setState auf unmounted Component
- Leere `.catch(() => {})` → mindestens `console.error`
- Public Handle = eigener Handle → Redirect auf /profile (nicht doppelt rendern)
