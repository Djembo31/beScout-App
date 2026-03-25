# Event Ownership System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix event type badges, implement configurable per-type fee splits, enforce subscription gates server-side, and clean up event data.

**Architecture:** 4-phase approach. Phase 1 is UI-only (zero risk). Phase 2 adds DB config. Phase 3 updates RPCs. Phase 4 fixes data. Each phase is independently deployable and committable.

**Tech Stack:** TypeScript, React, Supabase PostgreSQL (RPCs + migrations), Tailwind, next-intl

**Design Doc:** `docs/plans/2026-03-25-event-ownership-system-design.md`

---

## Phase 1: Badge Refactor (Tier 2, ~30min)

### Task 1: Rename EventScopeBadge to EventTypeBadge

**Files:**
- Modify: `src/components/ui/EventScopeBadge.tsx` (full rewrite)
- Modify: `src/components/ui/index.tsx:350`
- Modify: `src/components/ui/__tests__/EventScopeBadge.test.tsx` (full rewrite)

**Step 1: Rewrite the component**

Replace `src/components/ui/EventScopeBadge.tsx` with:

```tsx
'use client';

import React from 'react';
import { Globe, Building2, Gift, Star, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EventType } from '@/components/fantasy/types';

interface EventTypeBadgeProps {
  type: EventType;
  clubName?: string;
  clubLogo?: string;
  sponsorName?: string;
  size?: 'sm' | 'md';
}

const sizeClasses = {
  sm: { container: 'px-2 py-0.5 gap-1 text-[11px]', icon: 'size-3', logo: 'size-3.5' },
  md: { container: 'px-2.5 py-1 gap-1.5 text-xs', icon: 'size-3.5', logo: 'size-4' },
};

const TYPE_CONFIG: Record<EventType, { icon: React.ElementType; color: string; bg: string; border: string; label: string }> = {
  bescout: { icon: Globe, color: 'text-gold', bg: 'bg-gold/10', border: 'border-gold/20', label: 'BeScout' },
  club: { icon: Building2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Club Event' },
  sponsor: { icon: Gift, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20', label: 'Sponsor' },
  special: { icon: Star, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', label: 'Special' },
  creator: { icon: UserPlus, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', label: 'Community' },
};

export function EventTypeBadge({ type, clubName, clubLogo, sponsorName, size = 'sm' }: EventTypeBadgeProps) {
  const s = sizeClasses[size];
  const config = TYPE_CONFIG[type] ?? TYPE_CONFIG.bescout;

  // Determine label: club name > sponsor name > default
  const label = type === 'club' && clubName ? clubName
    : type === 'sponsor' && sponsorName ? sponsorName
    : config.label;

  const Icon = config.icon;

  return (
    <span
      className={cn('inline-flex items-center font-bold rounded-full', config.bg, `border ${config.border}`, config.color, s.container)}
      aria-label={label}
    >
      {type === 'club' && clubLogo ? (
        <img src={clubLogo} alt="" className={cn(s.logo, 'rounded-full object-contain')} />
      ) : type === 'bescout' ? (
        <img src="/icons/bescout_icon_premium.svg" alt="" className={cn(s.logo, 'rounded-full object-contain')} />
      ) : (
        <Icon className={s.icon} aria-hidden="true" />
      )}
      {label}
    </span>
  );
}

// Keep backward compat export
export { EventTypeBadge as EventScopeBadge };
```

**Step 2: Update barrel export**

In `src/components/ui/index.tsx` line 350, change:
```tsx
export { EventScopeBadge } from './EventScopeBadge';
```
to:
```tsx
export { EventTypeBadge, EventScopeBadge } from './EventScopeBadge';
```

**Step 3: Update EventCardView**

In `src/components/fantasy/events/EventCardView.tsx`:

Change import (line 6):
```tsx
import { Button, EventTypeBadge } from '@/components/ui';
```

Change usage (line 75):
```tsx
<EventTypeBadge type={event.type} clubName={event.clubName} clubLogo={event.clubLogo} sponsorName={event.sponsorName} size="sm" />
```

Remove the now-redundant `clubName` display from meta row (lines 79-84) since it's already in the badge.

**Step 4: Update EventDetailModal**

In `src/components/fantasy/EventDetailModal.tsx`:

Change import (line 24):
```tsx
import { EventTypeBadge } from '@/components/ui';
```

Change usage (line 458):
```tsx
<EventTypeBadge type={event.type} clubName={event.clubName} clubLogo={event.clubLogo} sponsorName={event.sponsorName} size="sm" />
```

**Step 5: Rewrite test**

Replace `src/components/ui/__tests__/EventScopeBadge.test.tsx`:

```tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EventTypeBadge } from '../EventScopeBadge';

vi.mock('lucide-react', () => ({
  Globe: () => <span data-testid="globe-icon" />,
  Building2: () => <span data-testid="building-icon" />,
  Gift: () => <span data-testid="gift-icon" />,
  Star: () => <span data-testid="star-icon" />,
  UserPlus: () => <span data-testid="user-icon" />,
}));
vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
}));

describe('EventTypeBadge', () => {
  it('renders "BeScout" for bescout type', () => {
    render(<EventTypeBadge type="bescout" />);
    expect(screen.getByLabelText('BeScout')).toBeInTheDocument();
  });

  it('renders club name for club type with clubName', () => {
    render(<EventTypeBadge type="club" clubName="Sakaryaspor" />);
    expect(screen.getByLabelText('Sakaryaspor')).toBeInTheDocument();
    expect(screen.getByText('Sakaryaspor')).toBeInTheDocument();
  });

  it('renders fallback "Club Event" for club type without clubName', () => {
    render(<EventTypeBadge type="club" />);
    expect(screen.getByText('Club Event')).toBeInTheDocument();
  });

  it('renders sponsor name for sponsor type', () => {
    render(<EventTypeBadge type="sponsor" sponsorName="Nike" />);
    expect(screen.getByText('Nike')).toBeInTheDocument();
  });

  it('renders "Special" for special type', () => {
    render(<EventTypeBadge type="special" />);
    expect(screen.getByText('Special')).toBeInTheDocument();
  });

  it('renders "Community" for creator type', () => {
    render(<EventTypeBadge type="creator" />);
    expect(screen.getByText('Community')).toBeInTheDocument();
  });

  it('renders club logo when provided', () => {
    render(<EventTypeBadge type="club" clubName="Sakaryaspor" clubLogo="/clubs/sak.png" />);
    const img = screen.getByRole('img', { hidden: true });
    expect(img).toHaveAttribute('src', '/clubs/sak.png');
  });
});
```

**Step 6: Run tsc + tests**

```bash
npx tsc --noEmit && npx vitest run src/components/ui/__tests__/EventScopeBadge.test.tsx --reporter verbose
```

**Step 7: Commit**

```bash
git add src/components/ui/EventScopeBadge.tsx src/components/ui/index.tsx \
  src/components/ui/__tests__/EventScopeBadge.test.tsx \
  src/components/fantasy/events/EventCardView.tsx \
  src/components/fantasy/EventDetailModal.tsx
git commit -m "feat(events): replace EventScopeBadge with EventTypeBadge

Shows event type (bescout/club/sponsor/special/creator) instead of
scope (global/club). Club events show club name+logo, sponsor events
show sponsor name. Fixes all events showing 'BeScout Event'."
```

---

## Phase 2: Fee Config Table + Admin UI (Tier 3, ~1h)

### Task 2: Create event_fee_config migration

**Files:**
- Create: `supabase/migrations/20260325_event_fee_config.sql`

**Step 1: Write migration**

```sql
-- Event Fee Configuration per Type
-- Configurable via BeScout Admin panel

CREATE TABLE IF NOT EXISTS public.event_fee_config (
  event_type TEXT PRIMARY KEY,
  platform_pct SMALLINT NOT NULL DEFAULT 500,     -- basis points (500 = 5.00%)
  beneficiary_pct SMALLINT NOT NULL DEFAULT 0,    -- club/creator cut in bps
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id),

  CONSTRAINT chk_event_type CHECK (event_type IN ('bescout', 'club', 'sponsor', 'special', 'creator')),
  CONSTRAINT chk_platform_pct CHECK (platform_pct >= 0 AND platform_pct <= 5000),
  CONSTRAINT chk_beneficiary_pct CHECK (beneficiary_pct >= 0 AND beneficiary_pct <= 5000),
  CONSTRAINT chk_total_pct CHECK (platform_pct + beneficiary_pct <= 10000)
);

-- Seed defaults (matching design doc)
INSERT INTO public.event_fee_config (event_type, platform_pct, beneficiary_pct) VALUES
  ('bescout',  500,   0),   -- 5% platform, 0% club     = 95% prize pool
  ('club',     500, 500),   -- 5% platform, 5% club     = 90% prize pool
  ('sponsor',  500, 500),   -- 5% platform, 5% club     = 90% prize pool
  ('special',  500,   0),   -- 5% platform, 0%          = 95% prize pool
  ('creator',  500, 500)    -- 5% platform, 5% creator  = 90% prize pool
ON CONFLICT (event_type) DO NOTHING;

-- RLS: Read for authenticated, write for admin only
ALTER TABLE public.event_fee_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read fee config"
  ON public.event_fee_config FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Only admins can update fee config"
  ON public.event_fee_config FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND top_role = 'Admin'));

-- Helper: tier_rank for subscription gate enforcement
CREATE OR REPLACE FUNCTION public.tier_rank(p_tier TEXT)
RETURNS INT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_tier
    WHEN 'bronze' THEN 1
    WHEN 'silber' THEN 2
    WHEN 'gold'   THEN 3
    ELSE 0
  END;
$$;
```

**Step 2: Apply migration**

```bash
npx supabase db push
```

### Task 3: Add TypeScript types + service functions

**Files:**
- Modify: `src/types/index.ts` — add `DbEventFeeConfig` type
- Modify: `src/lib/services/platformAdmin.ts` — add get/update functions

**Step 1: Add type**

In `src/types/index.ts`, after `DbFeeConfig` type, add:

```typescript
export type DbEventFeeConfig = {
  event_type: 'bescout' | 'club' | 'sponsor' | 'special' | 'creator';
  platform_pct: number;
  beneficiary_pct: number;
  updated_at: string;
  updated_by: string | null;
};
```

**Step 2: Add service functions**

In `src/lib/services/platformAdmin.ts`, add:

```typescript
export async function getEventFeeConfigs(): Promise<DbEventFeeConfig[]> {
  const { data, error } = await supabase
    .from('event_fee_config')
    .select('*')
    .order('event_type');
  if (error) throw new Error(error.message);
  return (data ?? []) as DbEventFeeConfig[];
}

export async function updateEventFeeConfig(
  adminId: string,
  eventType: string,
  updates: { platform_pct?: number; beneficiary_pct?: number }
): Promise<void> {
  const { error } = await supabase
    .from('event_fee_config')
    .update({ ...updates, updated_by: adminId, updated_at: new Date().toISOString() })
    .eq('event_type', eventType);
  if (error) throw new Error(error.message);
}
```

### Task 4: Build Admin Event Fee Config UI

**Files:**
- Create: `src/app/(app)/bescout-admin/AdminEventFeesSection.tsx`
- Modify: `src/app/(app)/bescout-admin/AdminEventsManagementTab.tsx` — import + render section

**Step 1: Create AdminEventFeesSection**

A simple table showing 5 rows (one per type) with editable platform_pct and beneficiary_pct fields. Prize pool is auto-calculated. Pattern: follow existing `AdminFeesTab.tsx`.

**Step 2: Add to AdminEventsManagementTab**

Import and render `<AdminEventFeesSection adminId={userId} />` at the top of the events tab, before the events list.

**Step 3: Run tsc**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add supabase/migrations/20260325_event_fee_config.sql \
  src/types/index.ts src/lib/services/platformAdmin.ts \
  src/app/(app)/bescout-admin/AdminEventFeesSection.tsx \
  src/app/(app)/bescout-admin/AdminEventsManagementTab.tsx
git commit -m "feat(events): configurable fee splits per event type

New event_fee_config table with admin UI. Platform always 5%, club/creator
get 5% when they organize. All values editable via BeScout Admin."
```

---

## Phase 3: RPC Fee Split + Subscription Gate (Tier 3, ~1.5h)

### Task 5: Update rpc_lock_event_entry

**Files:**
- Create: `supabase/migrations/20260325_event_fee_from_config.sql`

**Step 1: Write migration that replaces the RPC**

The existing `rpc_lock_event_entry` in migration `20260321_unified_event_payment.sql` hardcodes fee splits. Create a new migration that uses `CREATE OR REPLACE FUNCTION` to:

1. Read fee config from `event_fee_config` table instead of hardcoded values
2. Add subscription tier check before allowing entry
3. Update `fee_split` JSONB to `{platform, beneficiary, prize_pool}` format

Key changes in the SCOUT path:
```sql
-- Replace hardcoded fees with config lookup
SELECT platform_pct, beneficiary_pct
INTO v_platform_pct, v_beneficiary_pct
FROM public.event_fee_config
WHERE event_type = v_event.type;

-- Default to 5%/0% if no config found
v_platform_pct := COALESCE(v_platform_pct, 500);
v_beneficiary_pct := COALESCE(v_beneficiary_pct, 0);

v_platform_fee := (v_amount * v_platform_pct) / 10000;
v_beneficiary_fee := (v_amount * v_beneficiary_pct) / 10000;
v_prize_amount := v_amount - v_platform_fee - v_beneficiary_fee;
```

Add subscription gate (after capacity check, before payment):
```sql
-- Subscription tier gate
IF v_event.min_subscription_tier IS NOT NULL AND v_event.club_id IS NOT NULL THEN
  SELECT tier INTO v_user_tier
  FROM public.club_subscriptions
  WHERE user_id = p_user_id
    AND club_id = v_event.club_id
    AND status = 'active'
    AND expires_at > now();

  IF v_user_tier IS NULL
     OR public.tier_rank(v_user_tier) < public.tier_rank(v_event.min_subscription_tier) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'subscription_required',
      'need', v_event.min_subscription_tier
    );
  END IF;
END IF;
```

**Step 2: Update unlock and cancel RPCs similarly**

`rpc_unlock_event_entry` and `rpc_cancel_event_entries` use the stored `fee_split` from `event_entries` to reverse, so they only need the new JSONB key names (`beneficiary` instead of `pbt`+`club`).

**Step 3: Apply migration**

```bash
npx supabase db push
```

### Task 6: Update TypeScript service layer

**Files:**
- Modify: `src/lib/services/events.ts:7-9` — update `isClubEvent()`
- Modify: `src/lib/services/lineups.ts:214` — update club-scope guard

**Step 1: Update isClubEvent**

```typescript
/** Check if an event is club-scoped (restricted to club members' players) */
export function isClubEvent(event: { type?: string; scope?: string; club_id?: string | null }): boolean {
  return event.type === 'club' || event.scope === 'club';
}
```

**Step 2: Update lineups.ts club-scope guard**

Change line 214:
```typescript
if ((ev.scope === 'club' || ev.type === 'club') && ev.club_id) {
```

**Step 3: Update service tests**

Update `src/lib/services/__tests__/events-v2.test.ts`:
```typescript
describe('isClubEvent', () => {
  it('returns true for type=club', () => {
    expect(isClubEvent({ type: 'club' })).toBe(true);
  });
  it('returns true for scope=club', () => {
    expect(isClubEvent({ scope: 'club' })).toBe(true);
  });
  it('returns false for type=bescout scope=global', () => {
    expect(isClubEvent({ type: 'bescout', scope: 'global' })).toBe(false);
  });
});
```

**Step 4: Handle subscription_required error in UI**

In `src/app/(app)/fantasy/FantasyContent.tsx`, in the `handleJoin` error handler, add case for `subscription_required`:

```typescript
if (result.error === 'subscription_required') {
  addToast(t('subscriptionRequired', { tier: result.need }), 'error');
  return;
}
```

Add i18n key `fantasy.subscriptionRequired` in both locale files:
- DE: `"Mindestens {tier}-Abo benötigt"`
- TR: `"En az {tier} abonelik gerekli"`

**Step 5: Run tsc + tests**

```bash
npx tsc --noEmit && npx vitest run --reporter verbose
```

**Step 6: Commit**

```bash
git add supabase/migrations/20260325_event_fee_from_config.sql \
  src/lib/services/events.ts src/lib/services/lineups.ts \
  src/lib/services/__tests__/events-v2.test.ts \
  src/app/(app)/fantasy/FantasyContent.tsx \
  messages/de.json messages/tr.json
git commit -m "feat(events): configurable RPC fee splits + subscription gate

lock_event_entry reads fee config from event_fee_config table.
Subscription tier now enforced server-side (not just UI).
isClubEvent checks type OR scope for backward compat."
```

---

## Phase 4: Data Cleanup + Verification (Tier 2, ~30min)

### Task 7: Review and fix event type assignments

**Step 1: Query current state**

```sql
SELECT id, name, type, scope, club_id IS NOT NULL as has_club,
       sponsor_name IS NOT NULL as has_sponsor
FROM events
ORDER BY type, name;
```

**Step 2: Fix misassigned events**

Any event with `sponsor_name` set but `type != 'sponsor'` should be updated.
Any event clearly created by a club (name contains club name) but `type = 'bescout'` should be reviewed.

Run targeted UPDATEs via Supabase SQL editor.

### Task 8: Visual verification

**Step 1: Check each type badge**

Open `/fantasy` and verify:
- BeScout events → gold "BeScout" badge with icon
- Club events → emerald badge with club name + logo
- Sponsor events → sky badge with sponsor name
- Special events → purple "Special" badge

**Step 2: Test subscription gate**

1. Set an event's `min_subscription_tier = 'silber'`
2. Try joining as user without subscription → expect `subscription_required` error
3. Subscribe to bronze → still rejected
4. Subscribe to silber → allowed

**Step 3: Test fee config admin**

1. Open BeScout Admin → Events tab
2. Change club platform_pct from 500 to 600
3. Verify the value persists after page reload
4. Reset to 500

**Step 4: Commit data fixes**

```bash
git commit --allow-empty -m "chore(events): verify event type assignments + subscription gate"
```
