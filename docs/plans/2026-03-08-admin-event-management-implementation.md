# Admin Event Management — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Full event management for Platform Admins with configurable reward structures and shared RewardStructureEditor for both admin panels.

**Architecture:** DB migration adds `reward_structure` JSONB + platform_admin RLS. `score_event` RPC reads dynamic rewards. New shared `RewardStructureEditor` component. New `AdminEventsManagementTab` in BeScout Admin. Club Admin gets RewardStructureEditor integration.

**Tech Stack:** Supabase (PostgreSQL, RLS, RPC) | Next.js 14 | TypeScript | Tailwind | React Query | next-intl | lucide-react

**Design Doc:** `docs/plans/2026-03-08-admin-event-management-design.md`

**UI Requirements (apply to ALL UI tasks):**
- All interactive elements: `hover:bg-white/[0.05]`, `active:scale-[0.97]`, `focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold/50`
- Disabled state: `opacity-40 cursor-not-allowed`
- Touch targets: min `44px` (`min-h-[44px] min-w-[44px]`)
- Numeric values: `font-mono tabular-nums`
- `aria-label` on every interactive element
- German UI labels, English code variables
- States: Loading (`Loader2`), Empty (message + CTA), Error (message + retry)

---

## Task 1: DB Migration — `reward_structure` Column

**Context:** Add JSONB column to events table for configurable prize distribution per event.

**Files:**
- DB: Supabase SQL (via MCP execute_sql or migration)

**Step 1: Add column + validation function**

```sql
-- Add nullable JSONB column
ALTER TABLE events ADD COLUMN IF NOT EXISTS reward_structure JSONB DEFAULT NULL;

-- Validation function for reward_structure format
CREATE OR REPLACE FUNCTION validate_reward_structure(rs JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  v_len INT;
  v_sum NUMERIC := 0;
  v_i INT;
  v_rank INT;
  v_pct NUMERIC;
BEGIN
  IF rs IS NULL THEN RETURN TRUE; END IF;
  IF jsonb_typeof(rs) != 'array' THEN RETURN FALSE; END IF;
  v_len := jsonb_array_length(rs);
  IF v_len < 1 OR v_len > 20 THEN RETURN FALSE; END IF;
  FOR v_i IN 0..v_len-1 LOOP
    v_rank := (rs->v_i->>'rank')::INT;
    v_pct := (rs->v_i->>'pct')::NUMERIC;
    IF v_rank != v_i + 1 THEN RETURN FALSE; END IF;  -- sequential from 1
    IF v_pct <= 0 THEN RETURN FALSE; END IF;
    v_sum := v_sum + v_pct;
  END LOOP;
  RETURN v_sum = 100;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- CHECK constraint
ALTER TABLE events ADD CONSTRAINT events_reward_structure_valid
  CHECK (validate_reward_structure(reward_structure));
```

**Step 2: Verify**

```sql
-- Should succeed
UPDATE events SET reward_structure = '[{"rank":1,"pct":50},{"rank":2,"pct":30},{"rank":3,"pct":20}]'::jsonb
WHERE id = (SELECT id FROM events LIMIT 1);

-- Should fail (sum != 100)
UPDATE events SET reward_structure = '[{"rank":1,"pct":50}]'::jsonb
WHERE id = (SELECT id FROM events LIMIT 1);

-- Reset test row
UPDATE events SET reward_structure = NULL
WHERE id = (SELECT id FROM events LIMIT 1);
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat(db): add events.reward_structure JSONB column with validation"
```

---

## Task 2: DB — RLS Policies for Platform Admins

**Context:** Current RLS only allows club_admins to INSERT/UPDATE/DELETE events. Platform admins are locked out. Also blocks global events (club_id=NULL).

**Step 1: Update RLS policies**

```sql
-- DROP and recreate with platform_admin support
DROP POLICY IF EXISTS events_insert ON events;
CREATE POLICY events_insert ON events FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM club_admins ca WHERE ca.user_id = auth.uid() AND ca.club_id = events.club_id)
  OR EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS events_update ON events;
CREATE POLICY events_update ON events FOR UPDATE USING (
  EXISTS (SELECT 1 FROM club_admins ca WHERE ca.user_id = auth.uid() AND ca.club_id = events.club_id)
  OR EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS events_delete ON events;
CREATE POLICY events_delete ON events FOR DELETE USING (
  EXISTS (SELECT 1 FROM club_admins ca WHERE ca.user_id = auth.uid() AND ca.club_id = events.club_id)
  OR EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid())
);
```

**Step 2: Verify**

```sql
-- Check policies are correct
SELECT polname, polcmd FROM pg_policy WHERE polrelid = 'events'::regclass;
-- Expected: events_select (r), events_insert (a), events_update (w), events_delete (d)
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat(db): add platform_admins to events RLS policies"
```

---

## Task 3: Update `score_event` RPC — Dynamic Reward Structure

**Context:** RPC currently uses hardcoded 50/30/20 for 3 ranks. Must read `reward_structure` from event and support N ranks. Over-distribution bug already fixed with `v_next_slot`.

**Step 1: Update the prize distribution section**

Replace the DECLARE block inside `IF v_prize_pool > 0 AND v_total_entries > 0 THEN` with:

```sql
IF v_prize_pool > 0 AND v_total_entries > 0 THEN
  DECLARE
    v_rs JSONB;
    v_max_rank INT;
    v_rank_rewards BIGINT[];
    v_rk INT;
    v_rk_count INT;
    v_rk_total BIGINT;
    v_rk_per_person BIGINT;
    v_next_slot INT := 1;
  BEGIN
    -- Read dynamic reward structure (default: Top 3)
    v_rs := COALESCE(v_event.reward_structure,
      '[{"rank":1,"pct":50},{"rank":2,"pct":30},{"rank":3,"pct":20}]'::jsonb);
    v_max_rank := jsonb_array_length(v_rs);

    -- Build reward amounts array from percentages
    FOR v_i IN 0..v_max_rank-1 LOOP
      v_rank_rewards[v_i+1] := ROUND(
        v_prize_pool * (v_rs->v_i->>'pct')::NUMERIC / 100
      )::BIGINT;
    END LOOP;

    -- Distribute with position-slot tracking (prevents over-distribution)
    FOR v_rk IN 1..v_max_rank LOOP
      IF v_next_slot > v_max_rank THEN EXIT; END IF;
      SELECT COUNT(*) INTO v_rk_count
      FROM lineups WHERE event_id = p_event_id AND rank = v_rk;
      IF v_rk_count > 0 THEN
        v_rk_total := 0;
        FOR v_i IN v_next_slot..LEAST(v_next_slot + v_rk_count - 1, v_max_rank) LOOP
          v_rk_total := v_rk_total + v_rank_rewards[v_i];
        END LOOP;
        v_next_slot := v_next_slot + v_rk_count;
        v_rk_per_person := FLOOR(v_rk_total / v_rk_count);
        IF v_rk_per_person > 0 THEN
          UPDATE lineups SET reward_amount = v_rk_per_person
          WHERE event_id = p_event_id AND rank = v_rk;
          UPDATE wallets w SET balance = w.balance + v_rk_per_person, updated_at = NOW()
          FROM lineups l
          WHERE l.event_id = p_event_id AND l.rank = v_rk AND w.user_id = l.user_id;
          INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
          SELECT l.user_id, 'fantasy_reward', v_rk_per_person, ww.balance, p_event_id,
            'Platz #' || v_rk || ' — ' || v_event.name
          FROM lineups l JOIN wallets ww ON ww.user_id = l.user_id
          WHERE l.event_id = p_event_id AND l.rank = v_rk;
          v_distributed := v_distributed + (v_rk_per_person * v_rk_count);
        END IF;
      END IF;
    END LOOP;
  END;
END IF;
```

Also remove the now-unused top-level variables: `v_r1_pct`, `v_r2_pct`, `v_r3_pct`.

**Step 2: Verify** — Run the full CREATE OR REPLACE via Supabase MCP, check no errors.

**Step 3: Commit**

```bash
git add -A && git commit -m "feat(db): score_event reads dynamic reward_structure"
```

---

## Task 4: TypeScript Types — Add `reward_structure`

**Context:** `DbEvent` and `FantasyEvent` need the new field.

**Files:**
- Modify: `src/types/index.ts` (DbEvent, around line 575)

**Step 1: Add to DbEvent**

After `salary_cap?: number | null;` add:
```typescript
  reward_structure?: Array<{ rank: number; pct: number }> | null;
```

**Step 2: Add RewardStructure type**

Near the Event types, add:
```typescript
export type RewardTier = { rank: number; pct: number };
```

**Step 3: Verify build**

```bash
npx next build
```

**Step 4: Commit**

```bash
git add src/types/index.ts && git commit -m "feat: add reward_structure to DbEvent type"
```

---

## Task 5: Service Layer — `updateEvent`, `getAllEventsAdmin`, `bulkUpdateStatus`, `getEventAdminStats`

**Context:** New service functions for admin event management. Pattern: follow existing `events.ts` style.

**Files:**
- Modify: `src/lib/services/events.ts`

**Step 1: Add `updateEvent` function**

Append to `events.ts`:

```typescript
/** Field editability rules per status */
const EDITABLE_FIELDS: Record<string, string[]> = {
  upcoming: ['name', 'prize_pool', 'reward_structure', 'gameweek', 'format', 'starts_at', 'locks_at', 'ends_at', 'max_entries', 'entry_fee', 'sponsor_name', 'sponsor_logo', 'event_tier', 'min_subscription_tier', 'salary_cap'],
  registering: ['name', 'prize_pool', 'reward_structure', 'gameweek', 'format', 'starts_at', 'locks_at', 'ends_at', 'max_entries', 'entry_fee', 'sponsor_name', 'sponsor_logo', 'event_tier', 'min_subscription_tier', 'salary_cap'],
  'late-reg': ['name', 'prize_pool', 'ends_at', 'max_entries', 'sponsor_name', 'sponsor_logo'],
  running: ['name', 'prize_pool', 'ends_at', 'max_entries', 'sponsor_name', 'sponsor_logo'],
  scoring: [],
  ended: [],
  cancelled: [],
};

export async function updateEvent(
  eventId: string,
  fields: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  // Fetch current status
  const { data: event, error: fetchErr } = await supabase
    .from('events').select('status').eq('id', eventId).single();
  if (fetchErr || !event) return { success: false, error: 'Event nicht gefunden' };

  const allowed = EDITABLE_FIELDS[event.status] ?? [];
  const blocked = Object.keys(fields).filter(k => !allowed.includes(k));
  if (blocked.length > 0) {
    return { success: false, error: `Felder nicht editierbar im Status "${event.status}": ${blocked.join(', ')}` };
  }

  const { error } = await supabase.from('events').update(fields).eq('id', eventId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
```

**Step 2: Add `getAllEventsAdmin` function**

```typescript
export async function getAllEventsAdmin(filters: {
  status?: string[];
  type?: string[];
  clubId?: string;
  gameweek?: number;
  search?: string;
} = {}): Promise<DbEvent[]> {
  const supabase = createClient();
  let query = supabase
    .from('events')
    .select('*, clubs(name, slug)')
    .order('created_at', { ascending: false });

  if (filters.status?.length) query = query.in('status', filters.status);
  if (filters.type?.length) query = query.in('type', filters.type);
  if (filters.clubId) query = query.eq('club_id', filters.clubId);
  if (filters.gameweek) query = query.eq('gameweek', filters.gameweek);
  if (filters.search) query = query.ilike('name', `%${filters.search}%`);

  const { data, error } = await query;
  if (error) { console.error('getAllEventsAdmin:', error); return []; }
  return (data ?? []) as DbEvent[];
}
```

**Step 3: Add `bulkUpdateStatus` function**

```typescript
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  upcoming: ['registering', 'cancelled'],
  registering: ['late-reg', 'running', 'cancelled'],
  'late-reg': ['running', 'cancelled'],
  running: ['scoring', 'ended'],
  scoring: ['ended'],
  ended: [],
  cancelled: [],
};

export async function bulkUpdateStatus(
  eventIds: string[],
  newStatus: string
): Promise<{ success: boolean; results: Array<{ eventId: string; ok: boolean; error?: string }> }> {
  const supabase = createClient();
  const results: Array<{ eventId: string; ok: boolean; error?: string }> = [];

  // Fetch current statuses
  const { data: events } = await supabase
    .from('events').select('id, status').in('id', eventIds);

  for (const ev of (events ?? [])) {
    const allowed = ALLOWED_TRANSITIONS[ev.status] ?? [];
    if (!allowed.includes(newStatus)) {
      results.push({ eventId: ev.id, ok: false, error: `${ev.status} → ${newStatus} nicht erlaubt` });
      continue;
    }
    const { error } = await supabase.from('events').update({ status: newStatus }).eq('id', ev.id);
    results.push({ eventId: ev.id, ok: !error, error: error?.message });
  }

  return { success: results.every(r => r.ok), results };
}
```

**Step 4: Add `getEventAdminStats` function**

```typescript
export async function getEventAdminStats(): Promise<{
  activeCount: number;
  totalParticipants: number;
  totalPool: number;
}> {
  const supabase = createClient();
  const { data } = await supabase
    .from('events')
    .select('status, current_entries, prize_pool');

  const active = (data ?? []).filter(e =>
    ['registering', 'late-reg', 'running'].includes(e.status)
  );
  return {
    activeCount: active.length,
    totalParticipants: active.reduce((s, e) => s + (e.current_entries ?? 0), 0),
    totalPool: active.reduce((s, e) => s + (e.prize_pool ?? 0), 0),
  };
}
```

**Step 5: Update `createEvent` to accept `rewardStructure`**

In the `createEvent` function params, add:
```typescript
  rewardStructure?: Array<{ rank: number; pct: number }> | null;
```

In the insert object, add:
```typescript
  reward_structure: params.rewardStructure ?? null,
```

**Step 6: Verify build**

```bash
npx next build
```

**Step 7: Commit**

```bash
git add src/lib/services/events.ts && git commit -m "feat: admin event service functions (CRUD, bulk, stats, editability guards)"
```

---

## Task 6: RewardStructureEditor Component

**Context:** Shared component for both BeScout Admin and Club Admin. Template presets + custom editor.

**Files:**
- Create: `src/components/admin/RewardStructureEditor.tsx`

**Step 1: Create the component**

```typescript
'use client';

import React, { useState, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { RewardTier } from '@/types';
import { cn } from '@/lib/utils';

const TEMPLATES: Record<string, RewardTier[]> = {
  top3: [{ rank: 1, pct: 50 }, { rank: 2, pct: 30 }, { rank: 3, pct: 20 }],
  top5: [{ rank: 1, pct: 40 }, { rank: 2, pct: 25 }, { rank: 3, pct: 15 }, { rank: 4, pct: 12 }, { rank: 5, pct: 8 }],
  winner: [{ rank: 1, pct: 100 }],
  top10: [
    { rank: 1, pct: 30 }, { rank: 2, pct: 20 }, { rank: 3, pct: 15 },
    { rank: 4, pct: 10 }, { rank: 5, pct: 8 }, { rank: 6, pct: 5 },
    { rank: 7, pct: 4 }, { rank: 8, pct: 3 }, { rank: 9, pct: 3 }, { rank: 10, pct: 2 },
  ],
};

type Props = {
  value: RewardTier[] | null;
  onChange: (tiers: RewardTier[]) => void;
  disabled?: boolean;
  prizePool?: number; // cents, for preview
};

export function RewardStructureEditor({ value, onChange, disabled, prizePool }: Props) {
  const t = useTranslations('admin');
  const tiers = value ?? TEMPLATES.top3;
  const sum = tiers.reduce((s, tier) => s + tier.pct, 0);
  const isValid = sum === 100;

  const applyTemplate = useCallback((key: string) => {
    if (disabled) return;
    onChange(TEMPLATES[key]);
  }, [disabled, onChange]);

  const updatePct = useCallback((index: number, pct: number) => {
    const next = tiers.map((tier, i) => i === index ? { ...tier, pct } : tier);
    onChange(next);
  }, [tiers, onChange]);

  const addRank = useCallback(() => {
    if (disabled || tiers.length >= 20) return;
    onChange([...tiers, { rank: tiers.length + 1, pct: 0 }]);
  }, [disabled, tiers, onChange]);

  const removeRank = useCallback((index: number) => {
    if (disabled || tiers.length <= 1) return;
    const next = tiers.filter((_, i) => i !== index).map((tier, i) => ({ ...tier, rank: i + 1 }));
    onChange(next);
  }, [disabled, tiers, onChange]);

  return (
    <div className="space-y-3">
      <label className="text-xs font-bold text-white/50 uppercase tracking-wider">
        {t('rewardStructure')}
      </label>

      {/* Template buttons */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(TEMPLATES).map(([key]) => (
          <button
            key={key}
            type="button"
            onClick={() => applyTemplate(key)}
            disabled={disabled}
            aria-label={`${t('rewardTemplate')}: ${t(`rewardTemplate_${key}`)}`}
            className={cn(
              'px-3 min-h-[44px] rounded-lg border text-xs font-bold transition-colors',
              'hover:bg-white/[0.05] active:scale-[0.97]',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold/50',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              JSON.stringify(tiers) === JSON.stringify(TEMPLATES[key])
                ? 'border-gold/30 text-gold bg-gold/[0.06]'
                : 'border-white/10 text-white/50'
            )}
          >
            {t(`rewardTemplate_${key}`)}
          </button>
        ))}
      </div>

      {/* Rank rows */}
      <div className="space-y-2">
        {tiers.map((tier, i) => (
          <div key={tier.rank} className="flex items-center gap-2">
            <span className="text-xs text-white/40 w-16 shrink-0">
              {t('rewardRank')} {tier.rank}
            </span>
            <input
              type="number"
              min={1}
              max={100}
              value={tier.pct}
              onChange={(e) => updatePct(i, parseInt(e.target.value) || 0)}
              disabled={disabled}
              aria-label={`${t('rewardPctFor')} ${tier.rank}`}
              className={cn(
                'w-20 px-3 min-h-[44px] rounded-lg border border-white/10 bg-white/[0.03]',
                'font-mono tabular-nums text-sm text-center',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold/50',
                'disabled:opacity-40 disabled:cursor-not-allowed'
              )}
            />
            <span className="text-xs text-white/30">%</span>
            {prizePool && prizePool > 0 ? (
              <span className="text-xs text-white/20 font-mono tabular-nums">
                ({Math.floor(prizePool * tier.pct / 100 / 100).toLocaleString('de-DE')} $SCOUT)
              </span>
            ) : null}
            {tiers.length > 1 && (
              <button
                type="button"
                onClick={() => removeRank(i)}
                disabled={disabled}
                aria-label={`${t('rewardRemoveRank')} ${tier.rank}`}
                className={cn(
                  'min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg',
                  'text-white/30 hover:text-red-400 hover:bg-red-400/10 active:scale-[0.97]',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold/50',
                  'disabled:opacity-40 disabled:cursor-not-allowed'
                )}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add rank button */}
      <button
        type="button"
        onClick={addRank}
        disabled={disabled || tiers.length >= 20}
        aria-label={t('rewardAddRank')}
        className={cn(
          'flex items-center gap-1.5 px-3 min-h-[44px] rounded-lg border border-dashed border-white/10',
          'text-xs text-white/30 hover:text-white/50 hover:bg-white/[0.03] active:scale-[0.97]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold/50',
          'disabled:opacity-40 disabled:cursor-not-allowed'
        )}
      >
        <Plus className="size-3.5" aria-hidden="true" />
        {t('rewardAddRank')}
      </button>

      {/* Sum indicator */}
      <div className={cn(
        'text-xs font-mono tabular-nums',
        isValid ? 'text-green-500' : 'text-red-400'
      )}>
        {t('rewardSum')}: {sum}% {isValid ? '✓' : `(${t('rewardMust100')})`}
      </div>
    </div>
  );
}
```

**Step 2: Verify build**

```bash
npx next build
```

**Step 3: Commit**

```bash
git add src/components/admin/RewardStructureEditor.tsx && git commit -m "feat: RewardStructureEditor component with templates and custom editing"
```

---

## Task 7: AdminEventsManagementTab Component

**Context:** New Tab #11 in BeScout Admin. Full CRUD, filters, bulk actions, stats. Uses pattern from AdminFeesTab.

**Files:**
- Create: `src/app/(app)/bescout-admin/AdminEventsManagementTab.tsx`

**Step 1: Create the component**

This is the largest component. Key sections:
1. State: filters, events, loading, selected, modal
2. Data fetch: `useEffect` → `getAllEventsAdmin(filters)`
3. Stats bar: `getEventAdminStats()`
4. Filter bar: Status, Type, Club, GW dropdowns
5. Event list: Table rows with checkboxes, status badge, participants, pool
6. Bulk action bar: Status change dropdown + execute
7. Create/Edit modal: All event fields + RewardStructureEditor

**Structure outline:**

```typescript
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, Plus, Search, Calendar, Filter, Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, Button, Modal } from '@/components/ui';
import { useToast } from '@/components/providers/ToastProvider';
import { RewardStructureEditor } from '@/components/admin/RewardStructureEditor';
import type { DbEvent, RewardTier } from '@/types';
import {
  getAllEventsAdmin,
  updateEvent,
  updateEventStatus,
  createEvent,
  bulkUpdateStatus,
  getEventAdminStats,
} from '@/lib/services/events';
import { fmtScout, bsdToCents, centsToBsd } from '@/lib/format';
import { useAuth } from '@/components/providers/AuthProvider';

// STATUS_CONFIG: same pattern as AdminEventsTab.tsx (club admin)
const STATUS_CONFIG: Record<string, { bg: string; border: string; text: string; label: string }> = {
  upcoming:     { bg: 'bg-white/[0.03]', border: 'border-white/10', text: 'text-white/50', label: 'Geplant' },
  registering:  { bg: 'bg-green-500/[0.06]', border: 'border-green-500/20', text: 'text-green-400', label: 'Anmeldung' },
  'late-reg':   { bg: 'bg-amber-500/[0.06]', border: 'border-amber-500/20', text: 'text-amber-400', label: 'Nachmeldung' },
  running:      { bg: 'bg-sky-500/[0.06]', border: 'border-sky-500/20', text: 'text-sky-400', label: 'Laufend' },
  scoring:      { bg: 'bg-purple-500/[0.06]', border: 'border-purple-500/20', text: 'text-purple-400', label: 'Auswertung' },
  ended:        { bg: 'bg-white/[0.02]', border: 'border-white/[0.06]', text: 'text-white/30', label: 'Beendet' },
  cancelled:    { bg: 'bg-red-500/[0.06]', border: 'border-red-500/20', text: 'text-red-400', label: 'Abgesagt' },
};

export function AdminEventsManagementTab({ adminId }: { adminId: string }) {
  // ... full implementation
  // Follow the exact patterns from AdminEventsTab.tsx (club admin)
  // but with: filters, bulk actions, stats, RewardStructureEditor, club dropdown
}
```

**Key differences from Club Admin:**
- No `club` prop — has club filter dropdown instead
- Filter bar with 5 filters (status, type, club, GW, search)
- Stats bar (3 numbers)
- Checkbox selection + bulk action bar
- Create modal includes club dropdown (optional for global events)
- Create modal includes RewardStructureEditor
- Edit modal with field-disable logic per status (Section 2.1 of design)

**Implementation detail:**
- Events fetched via `getAllEventsAdmin(filters)` — refetch on filter change
- Stats fetched once via `getEventAdminStats()`
- Club list for dropdown: `supabase.from('clubs').select('id, name').order('name')`
- GW range: 1-38 for dropdown
- Loading: `<Loader2>` centered
- Empty: "Keine Events gefunden" + Create CTA button
- Error: Error message + Retry button

**Full component code:** Too large for plan — implementer should build following the patterns above and the Club Admin `AdminEventsTab.tsx` as reference (570 lines). Target: ~500-700 lines.

**Step 2: Verify build**

```bash
npx next build
```

**Step 3: Commit**

```bash
git add src/app/(app)/bescout-admin/AdminEventsManagementTab.tsx && git commit -m "feat: AdminEventsManagementTab for BeScout Admin"
```

---

## Task 8: Integrate Tab #11 into BescoutAdminContent

**Context:** Wire up the new tab.

**Files:**
- Modify: `src/app/(app)/bescout-admin/BescoutAdminContent.tsx`

**Step 1: Add imports**

At line ~24 area:
```typescript
import { AdminEventsManagementTab } from './AdminEventsManagementTab';
```

Add `Trophy` to lucide imports (if not already).

**Step 2: Update tab configuration**

Line 30 — Add to AdminTab type:
```typescript
type AdminTab = 'overview' | 'users' | 'clubs' | 'fees' | 'ipos' | 'gameweeks' | 'events' | 'airdrop' | 'sponsors' | 'creator_fund' | 'debug';
```

Line 32 — Add to TAB_ICONS:
```typescript
events: Trophy,
```

Line 37 — Add to TAB_ORDER (after 'gameweeks'):
```typescript
const TAB_ORDER: AdminTab[] = ['overview', 'users', 'clubs', 'fees', 'ipos', 'gameweeks', 'events', 'airdrop', 'sponsors', 'creator_fund', 'debug'];
```

**Step 3: Add label**

In TAB_LABELS object (~line 225):
```typescript
events: 'Events',
```

**Step 4: Add render conditional**

After the gameweeks line (~line 261):
```typescript
{tab === 'events' && user && <AdminEventsManagementTab adminId={user.id} />}
```

**Step 5: Verify build**

```bash
npx next build
```

**Step 6: Commit**

```bash
git add src/app/(app)/bescout-admin/BescoutAdminContent.tsx && git commit -m "feat: add Events tab (#11) to BeScout Admin"
```

---

## Task 9: Integrate RewardStructureEditor into Club Admin

**Context:** Existing Club Admin event creation gets RewardStructureEditor.

**Files:**
- Modify: `src/components/admin/AdminEventsTab.tsx`

**Step 1: Add import**

```typescript
import { RewardStructureEditor } from './RewardStructureEditor';
import type { RewardTier } from '@/types';
```

**Step 2: Add state**

After existing form state (~line 56):
```typescript
const [rewardStructure, setRewardStructure] = useState<RewardTier[] | null>(null);
```

**Step 3: Add to form**

After the prize pool input section (~line 492), before times section:
```typescript
<RewardStructureEditor
  value={rewardStructure}
  onChange={setRewardStructure}
  prizePool={bsdToCents(parseFloat(prizePool) || 0)}
/>
```

**Step 4: Pass to createEvent**

In `handleCreate()` (~line 140), add to the `createEvent()` params:
```typescript
rewardStructure: rewardStructure,
```

**Step 5: Reset on form reset**

In the form reset section (~line 160), add:
```typescript
setRewardStructure(null);
```

**Step 6: Verify build**

```bash
npx next build
```

**Step 7: Commit**

```bash
git add src/components/admin/AdminEventsTab.tsx && git commit -m "feat: add RewardStructureEditor to Club Admin events"
```

---

## Task 10: User-Facing Reward Display in EventDetailModal

**Context:** Replace hardcoded placeholder rewards with actual `reward_structure` data.

**Files:**
- Modify: `src/components/fantasy/EventDetailModal.tsx` (around line 640-654)

**Step 1: Update rewards section**

Replace the hardcoded `event.rewards.map()` block with dynamic calculation:

```typescript
{/* Rewards */}
<div>
  <h3 className="font-bold mb-2">{t('rewardsTitle')}</h3>
  <div className="space-y-2">
    {(event.rewardStructure ?? [
      { rank: 1, pct: 50 }, { rank: 2, pct: 30 }, { rank: 3, pct: 20 }
    ]).map((tier, i) => {
      const amount = event.prizePool > 0
        ? Math.floor(event.prizePool * tier.pct / 100)
        : 0;
      return (
        <div key={tier.rank} className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg">
          <div className="flex items-center gap-2">
            <Medal aria-hidden="true" className={`size-4 ${i === 0 ? 'text-gold' : i === 1 ? 'text-white/70' : i === 2 ? 'text-orange-400' : 'text-white/20'}`} />
            <span className="font-bold">{t('rewardRankLabel', { rank: tier.rank })}</span>
          </div>
          <span className="text-white/70 font-mono tabular-nums">
            {tier.pct}%{amount > 0 ? ` (${fmtScout(amount / 100)})` : ''}
          </span>
        </div>
      );
    })}
  </div>
</div>
```

**Step 2: Ensure FantasyEvent mapping includes rewardStructure**

Check `FantasyContent.tsx` where `DbEvent` → `FantasyEvent` mapping happens. Add:
```typescript
rewardStructure: e.reward_structure ?? null,
```

And add to `FantasyEvent` type:
```typescript
rewardStructure?: Array<{ rank: number; pct: number }> | null;
```

**Step 3: Verify build**

```bash
npx next build
```

**Step 4: Commit**

```bash
git add src/components/fantasy/EventDetailModal.tsx src/app/(app)/fantasy/FantasyContent.tsx && git commit -m "feat: show dynamic reward structure in EventDetailModal"
```

---

## Task 11: i18n Keys

**Context:** New German + Turkish labels for admin events and reward editor.

**Files:**
- Modify: `messages/de.json`
- Modify: `messages/tr.json`

**Step 1: Add admin namespace keys to de.json**

```json
"admin": {
  "rewardStructure": "Belohnungsstruktur",
  "rewardTemplate": "Vorlage",
  "rewardTemplate_top3": "Top 3",
  "rewardTemplate_top5": "Top 5",
  "rewardTemplate_winner": "Winner",
  "rewardTemplate_top10": "Top 10",
  "rewardRank": "Rang",
  "rewardPctFor": "Prozent fuer Rang",
  "rewardAddRank": "Rang hinzufuegen",
  "rewardRemoveRank": "Rang entfernen",
  "rewardSum": "Summe",
  "rewardMust100": "muss 100% ergeben",
  "eventsTitle": "Events verwalten",
  "eventsCreate": "Neues Event",
  "eventsSearch": "Events durchsuchen",
  "eventsFilterStatus": "Filter: Status",
  "eventsFilterType": "Filter: Typ",
  "eventsFilterClub": "Filter: Verein",
  "eventsFilterGw": "Filter: Spieltag",
  "eventsEmpty": "Keine Events gefunden",
  "eventsEmptyCta": "Jetzt Event erstellen",
  "eventsError": "Fehler beim Laden",
  "eventsRetry": "Erneut versuchen",
  "eventsBulkAction": "Aktion fuer ausgewaehlte Events",
  "eventsBulkExecute": "Ausfuehren",
  "eventsSelectEvent": "Event auswaehlen",
  "eventsEditEvent": "Event bearbeiten",
  "eventsStatsActive": "Aktiv",
  "eventsStatsParticipants": "Teilnehmer",
  "eventsStatsPool": "Pool gesamt",
  "eventsClubOptional": "Verein (optional)",
  "eventsGlobal": "Global (kein Verein)"
}
```

**Step 2: Add same keys to tr.json (Turkish)**

```json
"admin": {
  "rewardStructure": "Odul Yapisi",
  "rewardTemplate": "Sablon",
  "rewardTemplate_top3": "Ilk 3",
  "rewardTemplate_top5": "Ilk 5",
  "rewardTemplate_winner": "Kazanan",
  "rewardTemplate_top10": "Ilk 10",
  "rewardRank": "Siralama",
  "rewardPctFor": "Yuzde, siralama",
  "rewardAddRank": "Siralama ekle",
  "rewardRemoveRank": "Siralamayi kaldir",
  "rewardSum": "Toplam",
  "rewardMust100": "%100 olmali",
  "eventsTitle": "Etkinlikleri yonet",
  "eventsCreate": "Yeni Etkinlik",
  "eventsSearch": "Etkinlik ara",
  "eventsFilterStatus": "Filtre: Durum",
  "eventsFilterType": "Filtre: Tur",
  "eventsFilterClub": "Filtre: Kulup",
  "eventsFilterGw": "Filtre: Hafta",
  "eventsEmpty": "Etkinlik bulunamadi",
  "eventsEmptyCta": "Simdi etkinlik olustur",
  "eventsError": "Yukleme hatasi",
  "eventsRetry": "Tekrar dene",
  "eventsBulkAction": "Secili etkinlikler icin islem",
  "eventsBulkExecute": "Uygula",
  "eventsSelectEvent": "Etkinlik sec",
  "eventsEditEvent": "Etkinligi duzenle",
  "eventsStatsActive": "Aktif",
  "eventsStatsParticipants": "Katilimci",
  "eventsStatsPool": "Toplam Havuz",
  "eventsClubOptional": "Kulup (istege bagli)",
  "eventsGlobal": "Global (kulupsuz)"
}
```

Also add to `fantasy` namespace:
```json
"rewardRankLabel": "Platz {rank}"
```

**Step 3: Verify build**

```bash
npx next build
```

**Step 4: Commit**

```bash
git add messages/ && git commit -m "feat(i18n): add admin event management labels (DE + TR)"
```

---

## Task 12: Final Build + Push

**Step 1: Full build verification**

```bash
npx next build
```

Expected: Green build, no errors.

**Step 2: Push**

```bash
git push
```

---

## Execution Order & Dependencies

```
Task 1 (DB column) ──┐
Task 2 (RLS)     ────┤── DB layer (no code deps)
Task 3 (RPC)     ────┘
                      │
Task 4 (Types)   ─────┤── Foundation
                      │
Task 5 (Services) ────┤── Logic layer
                      │
Task 6 (RewardEditor) ┤── Shared UI
                      │
Task 7 (Admin Tab) ───┤── Main feature (depends on 5+6)
Task 8 (Tab wire-up) ─┤── Integration (depends on 7)
Task 9 (Club Admin) ──┤── Integration (depends on 6)
Task 10 (User display) ┤── User-facing (depends on 4)
Task 11 (i18n) ────────┤── Labels (depends on 6+7)
                       │
Task 12 (Build+Push) ──┘── Final
```

Tasks 1-3 can run in parallel (all DB).
Tasks 4+6 can run in parallel (no deps on each other).
Task 7 depends on 5+6.
Tasks 8-11 can run after 7.

---

## Notes for Implementer

- **Read design doc first:** `docs/plans/2026-03-08-admin-event-management-design.md`
- **Pattern reference:** `src/components/admin/AdminEventsTab.tsx` (Club Admin, 572 lines)
- **Tab pattern reference:** `src/app/(app)/bescout-admin/BescoutAdminContent.tsx`
- **UI baseline:** All interactive elements need hover/active/focus-visible/disabled states, 44px touch targets, aria-labels, tabular-nums on numbers
- **German labels** for UI, **English** for code variables
- **Loading/Empty/Error states** required on every data-fetching component
- **Record new insights** during implementation in `memory/features/admin-event-management.md`
