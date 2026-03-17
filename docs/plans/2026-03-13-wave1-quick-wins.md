# Wave 1: Quick Wins Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 5 schnelle Verbesserungen für Pilot-Readiness — Welcome Bonus Banner, Research Rang-Gate entfernen, Profil-Settings verlinken, Compare erweitern (5 Slots + Links), Mystery Box Reward-Preview.

**Architecture:** Alle 5 Items sind unabhängig voneinander. Kein DB-Schema-Change nötig. Rein Frontend-Änderungen in bestehenden Components.

**Tech Stack:** Next.js 14, TypeScript strict, Tailwind (Dark Mode only), next-intl, lucide-react

---

### Task 1: Welcome Bonus Banner

Neuer Banner auf Home Page wenn User 0 Holdings hat. Nutzt bestehendes `NewUserTip` Pattern (dismissable, gold styling).

**Files:**
- Modify: `src/app/(app)/page.tsx:9,274-277`
- Modify: `messages/de.json` (i18n keys)
- Modify: `messages/tr.json` (i18n keys)

**Step 1: Add i18n keys**

In `messages/de.json`, unter `"home"` Sektion:
```json
"welcomeBonusTitle": "Willkommen bei BeScout!",
"welcomeBonusDesc": "Du hast {balance} bCredits zum Starten. Kaufe deinen ersten Spieler und werde Teil der Community.",
"welcomeBonusAction": "Zum Marktplatz"
```

In `messages/tr.json`, unter `"home"` Sektion:
```json
"welcomeBonusTitle": "BeScout'a hoş geldin!",
"welcomeBonusDesc": "Başlamak için {balance} bCredits'in var. İlk oyuncunu satın al ve topluluğun parçası ol.",
"welcomeBonusAction": "Pazar yerine git"
```

**Step 2: Add WalletProvider import + Welcome Banner to Home Page**

In `src/app/(app)/page.tsx`:

Add import (after line 8):
```typescript
import { useWallet } from '@/components/providers/WalletProvider';
```

Add import (after line 5, with existing lucide imports, add `Coins`):
```typescript
import { Coins } from 'lucide-react';
```

Add wallet hook inside component (after line 71, `const { followedClubs } = useClub();`):
```typescript
const { balanceCents } = useWallet();
```

Add banner between OnboardingChecklist and PortfolioStrip (after line 277, before `{/* ── 2. PORTFOLIO STRIP`):
```tsx
{/* ── 1d. WELCOME BONUS — First-time users with 0 holdings ── */}
{holdings.length === 0 && balanceCents != null && balanceCents > 0 && (
  <NewUserTip
    tipKey="welcome-bonus"
    icon={<Coins className="size-5" />}
    title={t('welcomeBonusTitle')}
    description={t('welcomeBonusDesc', { balance: fmtScout(centsToBsd(balanceCents)) })}
    action={{ label: t('welcomeBonusAction'), href: '/market' }}
    show={true}
  />
)}
```

Add dynamic import for NewUserTip (near other dynamic imports, around line 50):
```typescript
const NewUserTip = dynamic(() => import('@/components/onboarding/NewUserTip'), { ssr: false });
```

**Step 3: Build + verify**

Run: `npx next build`
Expected: 0 errors

**Step 4: Commit**

```bash
git add src/app/(app)/page.tsx messages/de.json messages/tr.json
git commit -m "feat: welcome bonus banner on Home for new users with 0 holdings"
```

---

### Task 2: Research Rang-Gate entfernen

Research Posts erfordern aktuell Bronze II (tier >= 2). Für Pilot: komplett entfernen (Frontend-only Gate).

**Files:**
- Modify: `src/app/(app)/community/page.tsx:303,472-476`

**Step 1: Remove rang check in handleCreateResearch callback**

In `src/app/(app)/community/page.tsx`, line 303:

Replace:
```typescript
if (userRangTier < 2) { addToast(t('research.rangRequired'), 'error'); return; }
```
With: (delete the line entirely)

**Step 2: Remove rang check in CommunityHero onClick**

Lines 472-476, replace:
```typescript
onCreateResearch={() => {
  if (userRangTier < 2) { addToast(t('research.rangRequired'), 'error'); return; }
  setCreateResearchOpen(true);
}}
researchLocked={userRangTier < 2}
```
With:
```typescript
onCreateResearch={() => setCreateResearchOpen(true)}
researchLocked={false}
```

**Step 3: Build + verify**

Run: `npx next build`
Expected: 0 errors

**Step 4: Commit**

```bash
git add src/app/(app)/community/page.tsx
git commit -m "feat: remove research rang-gate for pilot (all users can post research)"
```

---

### Task 3: Profil-Settings verlinken

SideNav Settings-Button linkt aktuell auf `/profile` statt `/profile/settings`.

**Files:**
- Modify: `src/components/layout/SideNav.tsx:258`

**Step 1: Fix Settings href**

In `src/components/layout/SideNav.tsx`, line 258:

Replace:
```typescript
href="/profile"
```
With:
```typescript
href="/profile/settings"
```

**Step 2: Build + verify**

Run: `npx next build`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/components/layout/SideNav.tsx
git commit -m "fix: settings nav link points to /profile/settings instead of /profile"
```

---

### Task 4: Compare erweitern — 5 Slots + Link von Player Detail

Aktuell 3 Slots hardcoded. Erweitern auf 5 + Compare-Button im Player Detail Overflow-Menu.

**Files:**
- Modify: `src/app/(app)/compare/page.tsx:17,34-42,58-67,158-191,194`
- Modify: `src/components/player/detail/PlayerHero.tsx:100-125`
- Modify: `messages/de.json` (i18n keys)
- Modify: `messages/tr.json` (i18n keys)

**Step 1: Expand COLORS array to 5**

In `src/app/(app)/compare/page.tsx`, line 17:

Replace:
```typescript
const COLORS = ['#38bdf8', '#fb7185', '#fbbf24'];
```
With:
```typescript
const COLORS = ['#38bdf8', '#fb7185', '#fbbf24', '#a78bfa', '#34d399'];
```

**Step 2: Expand URL param parsing to p1-p5**

Lines 34-42, replace:
```typescript
const ids: string[] = [];
const p1 = searchParams.get('p1');
const p2 = searchParams.get('p2');
const p3 = searchParams.get('p3');
if (p1) ids.push(p1);
if (p2) ids.push(p2);
if (p3) ids.push(p3);
if (ids.length > 0) setSelectedIds(ids);
```
With:
```typescript
const ids: string[] = [];
for (let i = 1; i <= 5; i++) {
  const val = searchParams.get(`p${i}`);
  if (val) ids.push(val);
}
if (ids.length > 0) setSelectedIds(ids);
```

**Step 3: Fix handleAddPlayer slot limit**

Line 67, replace:
```typescript
setSelectedIds(prev => [...prev.slice(0, 2), id]);
```
With:
```typescript
setSelectedIds(prev => prev.length < 5 ? [...prev, id] : prev);
```

**Step 4: Expand player slots grid from 3 to 5**

Lines 158-191, replace the grid:
```tsx
<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
  {[0, 1, 2].map(idx => {
```
With:
```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
  {Array.from({ length: Math.max(selectedPlayers.length + 1, 3) }, (_, i) => i).filter(i => i < 5).map(idx => {
```

**Step 5: Fix search visibility condition**

Line 194, replace:
```typescript
{(activeSlot !== null || selectedPlayers.length < 3) && (
```
With:
```typescript
{(activeSlot !== null || selectedPlayers.length < 5) && (
```

**Step 6: Update share link generation**

Find the `handleShare` function and update to include p4/p5. Look for the URL construction and replace:
```typescript
const params = selectedIds.map((id, i) => `p${i + 1}=${id}`).join('&');
```
This line should already work dynamically — verify it builds correctly.

**Step 7: Add Compare button to Player Detail overflow menu**

In `src/components/player/detail/PlayerHero.tsx`, add i18n key first.

In `messages/de.json` under `"player"`:
```json
"hero.compare": "Vergleichen"
```

In `messages/tr.json` under `"player"`:
```json
"hero.compare": "Karşılaştır"
```

Then in `PlayerHero.tsx`, add import at top:
```typescript
import { ArrowLeftRight } from 'lucide-react';
```

After the Price Alert button in the overflow menu (after line 122, before the closing `</div>`):
```tsx
<Link
  href={`/compare?p1=${player.id}`}
  onClick={() => setShowOverflow(false)}
  className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/5 transition-colors min-h-[44px]"
>
  <ArrowLeftRight className="size-4" /> {t('hero.compare')}
</Link>
```

Make sure `Link` is imported from `next/link` (should already be).

**Step 8: Build + verify**

Run: `npx next build`
Expected: 0 errors

**Step 9: Commit**

```bash
git add src/app/(app)/compare/page.tsx src/components/player/detail/PlayerHero.tsx messages/de.json messages/tr.json
git commit -m "feat: expand compare to 5 slots + add compare link in player detail"
```

---

### Task 5: Mystery Box Reward-Preview

Zeige im `idle` State eine Vorschau der möglichen Rewards nach Rarity-Tier.

**Files:**
- Modify: `src/components/gamification/MysteryBoxModal.tsx:161-202`
- Modify: `messages/de.json` (i18n keys)
- Modify: `messages/tr.json` (i18n keys)

**Step 1: Add i18n keys**

In `messages/de.json` under `"gamification"`:
```json
"possibleRewards": "Mögliche Gewinne",
"rewardTickets": "{min}–{max} Tickets",
"rewardCosmetic": "Cosmetic Item",
"dropRate": "{pct}%"
```

In `messages/tr.json` under `"gamification"`:
```json
"possibleRewards": "Olası Ödüller",
"rewardTickets": "{min}–{max} Bilet",
"rewardCosmetic": "Kozmetik Ürün",
"dropRate": "{pct}%"
```

**Step 2: Add reward preview data + UI**

In `MysteryBoxModal.tsx`, add reward preview config after `RARITY_CONFIG` (after line 62):

```typescript
const REWARD_PREVIEW: { rarity: CosmeticRarity; ticketRange: [number, number]; cosmeticChance: boolean; dropPct: number }[] = [
  { rarity: 'common', ticketRange: [5, 15], cosmeticChance: false, dropPct: 45 },
  { rarity: 'uncommon', ticketRange: [15, 40], cosmeticChance: true, dropPct: 30 },
  { rarity: 'rare', ticketRange: [40, 100], cosmeticChance: true, dropPct: 15 },
  { rarity: 'epic', ticketRange: [100, 250], cosmeticChance: true, dropPct: 8 },
  { rarity: 'legendary', ticketRange: [250, 500], cosmeticChance: true, dropPct: 2 },
];
```

Then in the `idle` state section (between the ticket balance display at line 198-201 and the closing `</>`), add the preview:

After line 201 (`</div>`), before the closing `</>` of the idle state:

```tsx
{/* Reward Preview */}
<div className="w-full mt-5 pt-4 border-t border-white/[0.06]">
  <p className="text-[11px] text-white/30 font-bold uppercase tracking-wider mb-2.5">
    {t('possibleRewards')}
  </p>
  <div className="space-y-1.5">
    {REWARD_PREVIEW.map(rp => (
      <div
        key={rp.rarity}
        className={cn(
          'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px]',
          RARITY_CONFIG[rp.rarity].bgClass,
        )}
      >
        <span className={cn('font-black w-[72px] flex-shrink-0', RARITY_CONFIG[rp.rarity].textClass)}>
          {RARITY_CONFIG[rp.rarity].label}
        </span>
        <span className="text-white/40 flex-1 font-mono tabular-nums">
          {t('rewardTickets', { min: rp.ticketRange[0], max: rp.ticketRange[1] })}
          {rp.cosmeticChance && ` + ${t('rewardCosmetic')}`}
        </span>
        <span className="text-white/25 font-mono tabular-nums flex-shrink-0">
          {t('dropRate', { pct: rp.dropPct })}
        </span>
      </div>
    ))}
  </div>
</div>
```

**Step 3: Build + verify**

Run: `npx next build`
Expected: 0 errors

**Step 4: Commit**

```bash
git add src/components/gamification/MysteryBoxModal.tsx messages/de.json messages/tr.json
git commit -m "feat: mystery box reward preview with rarity tiers and drop rates"
```

---

## Verification Checklist (nach allen 5 Tasks)

- [ ] `npx next build` → 0 errors
- [ ] Home Page: Banner erscheint bei 0 Holdings + Balance > 0
- [ ] Home Page: Banner dismissable (X Button), verschwindet nach Reload
- [ ] Community: Research erstellen ohne Rang-Einschränkung
- [ ] SideNav: Settings-Link führt zu `/profile/settings`
- [ ] Compare: 5 Slots sichtbar, URL mit p1-p5
- [ ] Player Detail: "Vergleichen" im Overflow-Menu → navigiert zu `/compare?p1=ID`
- [ ] Mystery Box: Reward-Preview im idle State sichtbar
