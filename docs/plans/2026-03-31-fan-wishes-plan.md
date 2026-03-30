# Fan Wishes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let users request players/clubs they want on BeScout. Admin sees aggregated demand for targeted onboarding.

**Architecture:** New `fan_wishes` table + RPC for insert (spam guard). Service + query hook. Shared `FanWishModal` component rendered from 4 entry points. Admin tab in BeScout Admin with aggregated view.

**Tech Stack:** Supabase (table + RPC + RLS), React + TanStack Query, next-intl

---

### Task 1: DB — Table + RPC + RLS

**Files:**
- Create: `supabase/migrations/20260331_fan_wishes.sql`

**Step 1: Write and apply migration**

```sql
-- ============================================
-- Fan Wishes — users request players/clubs for BeScout
-- ============================================

CREATE TABLE IF NOT EXISTS public.fan_wishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  wish_type TEXT NOT NULL CHECK (wish_type IN ('player', 'club')),
  player_name TEXT,
  club_name TEXT,
  league_name TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'noted', 'onboarded', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fan_wishes_user ON fan_wishes (user_id);
CREATE INDEX idx_fan_wishes_status ON fan_wishes (status);
CREATE INDEX idx_fan_wishes_club ON fan_wishes (club_name) WHERE club_name IS NOT NULL;

ALTER TABLE fan_wishes ENABLE ROW LEVEL SECURITY;

-- Users can read their own wishes
CREATE POLICY fan_wishes_select_own ON fan_wishes FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- Admins can read all
CREATE POLICY fan_wishes_select_admin ON fan_wishes FOR SELECT
  USING (EXISTS (SELECT 1 FROM platform_admins WHERE user_id = (SELECT auth.uid())));

-- Insert via RPC only (no direct insert policy)

-- RPC: submit_fan_wish (with spam guard)
CREATE OR REPLACE FUNCTION public.submit_fan_wish(
  p_wish_type TEXT,
  p_player_name TEXT DEFAULT NULL,
  p_club_name TEXT DEFAULT NULL,
  p_league_name TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_wish_count INT;
  v_existing INT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nicht eingeloggt');
  END IF;

  IF p_wish_type NOT IN ('player', 'club') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ungueltiger Typ');
  END IF;

  IF p_wish_type = 'player' AND (p_player_name IS NULL OR trim(p_player_name) = '') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Spielername erforderlich');
  END IF;

  IF p_wish_type = 'club' AND (p_club_name IS NULL OR trim(p_club_name) = '') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Clubname erforderlich');
  END IF;

  -- Spam guard: max 5 wishes per user
  SELECT COUNT(*) INTO v_wish_count
  FROM fan_wishes WHERE user_id = v_user_id;
  IF v_wish_count >= 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Maximum 5 Wuensche erreicht');
  END IF;

  -- Duplicate guard: same club_name from same user
  IF p_club_name IS NOT NULL THEN
    SELECT COUNT(*) INTO v_existing
    FROM fan_wishes WHERE user_id = v_user_id AND lower(trim(club_name)) = lower(trim(p_club_name));
    IF v_existing > 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Diesen Club hast du bereits gewuenscht');
    END IF;
  END IF;

  INSERT INTO fan_wishes (user_id, wish_type, player_name, club_name, league_name, note)
  VALUES (v_user_id, p_wish_type, trim(p_player_name), trim(p_club_name), trim(p_league_name), trim(p_note));

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Admin RPC: update wish status
CREATE OR REPLACE FUNCTION public.update_fan_wish_status(
  p_wish_id UUID,
  p_status TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM platform_admins WHERE user_id = (SELECT auth.uid())) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nicht berechtigt');
  END IF;

  IF p_status NOT IN ('open', 'noted', 'onboarded', 'declined') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ungueltiger Status');
  END IF;

  UPDATE fan_wishes SET status = p_status WHERE id = p_wish_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
```

Apply via Supabase MCP `apply_migration` with name `fan_wishes`.
Also write the file locally at `supabase/migrations/20260331_fan_wishes.sql`.

**Step 2: Verify**

```sql
SELECT COUNT(*) FROM fan_wishes; -- should return 0
SELECT proname FROM pg_proc WHERE proname IN ('submit_fan_wish', 'update_fan_wish_status');
```

**Step 3: Commit**

```
feat: fan_wishes table + RPCs (submit + admin status update)
```

---

### Task 2: Types + Service + Query Hook

**Files:**
- Modify: `src/types/index.ts` — add `DbFanWish` type
- Create: `src/lib/services/fanWishes.ts` — service functions
- Modify: `src/lib/queries/keys.ts` — add `fanWishes` query key
- Modify: `src/lib/queries/misc.ts` — add hooks

**Step 1: Add type in `src/types/index.ts`**

After the PBT types section (~line 867), add:

```typescript
// ============================================
// FAN WISHES
// ============================================

export type DbFanWish = {
  id: string;
  user_id: string;
  wish_type: 'player' | 'club';
  player_name: string | null;
  club_name: string | null;
  league_name: string | null;
  note: string | null;
  status: 'open' | 'noted' | 'onboarded' | 'declined';
  created_at: string;
};
```

**Step 2: Create service `src/lib/services/fanWishes.ts`**

```typescript
import { supabase } from '@/lib/supabaseClient';
import type { DbFanWish } from '@/types';

export async function submitFanWish(params: {
  wishType: 'player' | 'club';
  playerName?: string;
  clubName?: string;
  leagueName?: string;
  note?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('submit_fan_wish', {
    p_wish_type: params.wishType,
    p_player_name: params.playerName ?? null,
    p_club_name: params.clubName ?? null,
    p_league_name: params.leagueName ?? null,
    p_note: params.note ?? null,
  });
  if (error) return { success: false, error: error.message };
  const result = data as { success: boolean; error?: string };
  return result;
}

export async function getMyWishes(): Promise<DbFanWish[]> {
  const { data } = await supabase
    .from('fan_wishes')
    .select('*')
    .order('created_at', { ascending: false });
  return (data as DbFanWish[]) || [];
}

// Admin functions
export async function getAllWishes(): Promise<DbFanWish[]> {
  const { data } = await supabase
    .from('fan_wishes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  return (data as DbFanWish[]) || [];
}

export async function updateWishStatus(wishId: string, status: string): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('update_fan_wish_status', {
    p_wish_id: wishId,
    p_status: status,
  });
  if (error) return { success: false, error: error.message };
  return data as { success: boolean; error?: string };
}
```

**Step 3: Add query key in `src/lib/queries/keys.ts`**

After the `pbt` section:

```typescript
// ── Fan Wishes ──
fanWishes: {
  mine: () => ['fanWishes', 'mine'] as const,
  all: () => ['fanWishes', 'all'] as const,
},
```

**Step 4: Add hooks in `src/lib/queries/misc.ts`**

Add import:
```typescript
import { getMyWishes } from '@/lib/services/fanWishes';
```

Add hook:
```typescript
export function useMyWishes(active = true) {
  return useQuery({
    queryKey: qk.fanWishes.mine(),
    queryFn: getMyWishes,
    enabled: active,
    staleTime: FIVE_MIN,
  });
}
```

**Step 5: Run tsc, commit**

```
feat: fan wishes types + service + query hook
```

---

### Task 3: FanWishModal Component

**Files:**
- Create: `src/components/fan-wishes/FanWishModal.tsx`
- Modify: `messages/de.json` — add i18n keys
- Modify: `messages/tr.json` — add i18n keys

**Step 1: Add i18n keys**

In `messages/de.json` add new top-level namespace `"fanWishes"`:

```json
"fanWishes": {
  "title": "Wunsch einreichen",
  "tabPlayer": "Spieler",
  "tabClub": "Club",
  "playerName": "Spielername",
  "playerNamePlaceholder": "z.B. Messi, Haaland...",
  "clubName": "Clubname",
  "clubNamePlaceholder": "z.B. Galatasaray, Fenerbahce...",
  "leagueName": "Liga (optional)",
  "leagueNamePlaceholder": "z.B. Süper Lig, Premier League...",
  "note": "Bemerkung (optional)",
  "notePlaceholder": "Warum wünschst du dir diesen Spieler/Club?",
  "submit": "Wunsch senden",
  "success": "Wunsch eingereicht!",
  "maxReached": "Du hast bereits 5 Wünsche eingereicht",
  "clubMissing": "Dein Club fehlt?",
  "playerMissing": "Spieler nicht gefunden?",
  "wishHere": "Wünsch ihn dir!"
}
```

In `messages/tr.json` add same namespace:

```json
"fanWishes": {
  "title": "İstek Gönder",
  "tabPlayer": "Oyuncu",
  "tabClub": "Kulüp",
  "playerName": "Oyuncu Adı",
  "playerNamePlaceholder": "ör. Messi, Haaland...",
  "clubName": "Kulüp Adı",
  "clubNamePlaceholder": "ör. Galatasaray, Fenerbahçe...",
  "leagueName": "Lig (opsiyonel)",
  "leagueNamePlaceholder": "ör. Süper Lig, Premier League...",
  "note": "Not (opsiyonel)",
  "notePlaceholder": "Bu oyuncu/kulübü neden istiyorsun?",
  "submit": "İstek Gönder",
  "success": "İstek gönderildi!",
  "maxReached": "Zaten 5 istek gönderdin",
  "clubMissing": "Kulübün eksik mi?",
  "playerMissing": "Oyuncu bulunamadı mı?",
  "wishHere": "İste!"
}
```

**Step 2: Create `src/components/fan-wishes/FanWishModal.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles, Loader2 } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { submitFanWish } from '@/lib/services/fanWishes';
import { useToast } from '@/components/providers/ToastProvider';
import { useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queries/keys';

interface FanWishModalProps {
  open: boolean;
  onClose: () => void;
  defaultTab?: 'player' | 'club';
  defaultClubName?: string;
  defaultPlayerName?: string;
}

export function FanWishModal({ open, onClose, defaultTab = 'club', defaultClubName = '', defaultPlayerName = '' }: FanWishModalProps) {
  const t = useTranslations('fanWishes');
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<'player' | 'club'>(defaultTab);
  const [playerName, setPlayerName] = useState(defaultPlayerName);
  const [clubName, setClubName] = useState(defaultClubName);
  const [leagueName, setLeagueName] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = tab === 'player'
    ? playerName.trim().length >= 2
    : clubName.trim().length >= 2;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const result = await submitFanWish({
        wishType: tab,
        playerName: tab === 'player' ? playerName.trim() : undefined,
        clubName: clubName.trim() || undefined,
        leagueName: leagueName.trim() || undefined,
        note: note.trim() || undefined,
      });
      if (result.success) {
        addToast(t('success'), 'success');
        queryClient.invalidateQueries({ queryKey: qk.fanWishes.mine() });
        onClose();
        setPlayerName(''); setClubName(''); setLeagueName(''); setNote('');
      } else {
        addToast(result.error ?? 'Error', 'error');
      }
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('title')}>
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1">
          {(['player', 'club'] as const).map(tabId => (
            <button
              key={tabId}
              onClick={() => setTab(tabId)}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-bold transition-colors min-h-[44px]',
                tab === tabId ? 'bg-gold/10 text-gold' : 'text-white/40 hover:text-white/60',
              )}
            >
              {tabId === 'player' ? t('tabPlayer') : t('tabClub')}
            </button>
          ))}
        </div>

        {/* Player Name (player tab) */}
        {tab === 'player' && (
          <div>
            <label className="text-xs text-white/50 mb-1 block">{t('playerName')}</label>
            <input
              type="text"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder={t('playerNamePlaceholder')}
              maxLength={100}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm min-h-[44px]"
            />
          </div>
        )}

        {/* Club Name (always shown) */}
        <div>
          <label className="text-xs text-white/50 mb-1 block">{t('clubName')}</label>
          <input
            type="text"
            value={clubName}
            onChange={e => setClubName(e.target.value)}
            placeholder={t('clubNamePlaceholder')}
            maxLength={100}
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm min-h-[44px]"
          />
        </div>

        {/* League (optional) */}
        <div>
          <label className="text-xs text-white/50 mb-1 block">{t('leagueName')}</label>
          <input
            type="text"
            value={leagueName}
            onChange={e => setLeagueName(e.target.value)}
            placeholder={t('leagueNamePlaceholder')}
            maxLength={100}
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm min-h-[44px]"
          />
        </div>

        {/* Note (optional) */}
        <div>
          <label className="text-xs text-white/50 mb-1 block">{t('note')}</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={t('notePlaceholder')}
            maxLength={300}
            rows={2}
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm resize-none"
          />
        </div>

        {/* Submit */}
        <Button onClick={handleSubmit} disabled={!canSubmit || submitting} className="w-full">
          {submitting
            ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            : <><Sparkles className="size-4" aria-hidden="true" /> {t('submit')}</>
          }
        </Button>
      </div>
    </Modal>
  );
}
```

**Step 3: Run tsc, commit**

```
feat: FanWishModal component + i18n DE/TR
```

---

### Task 4: Entry Points — Club Discovery + SideNav + Empty Search

**Files:**
- Modify: `src/app/(app)/clubs/page.tsx` — add CTA button + empty state link
- Modify: `src/components/layout/SideNav.tsx` — add wish link in footer

**Step 1: Club Discovery page**

In `src/app/(app)/clubs/page.tsx`:

1. Add imports:
```tsx
import { Sparkles } from 'lucide-react';
import { FanWishModal } from '@/components/fan-wishes/FanWishModal';
```

2. Add state inside component (after other useState calls):
```tsx
const [wishOpen, setWishOpen] = useState(false);
const tw = useTranslations('fanWishes');
```

3. Add CTA button after the page title/header area (before the clubs grid):
```tsx
<button
  onClick={() => setWishOpen(true)}
  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gold bg-gold/10 hover:bg-gold/20 rounded-lg transition-colors min-h-[44px]"
>
  <Sparkles className="size-3.5" aria-hidden="true" />
  {tw('clubMissing')}
</button>
```

4. In the EmptyState (line ~112), add action that opens the modal:
```tsx
<EmptyState
  icon={<Search />}
  title={searchQuery ? t('noClubsSearch', { query: searchQuery }) : t('noClubsAvailable')}
  action={searchQuery
    ? { label: tw('wishHere'), onClick: () => setWishOpen(true) }
    : undefined
  }
/>
```

5. Add modal at end of JSX (before closing fragment):
```tsx
<FanWishModal open={wishOpen} onClose={() => setWishOpen(false)} defaultClubName={searchQuery} />
```

**Step 2: SideNav footer link**

In `src/components/layout/SideNav.tsx`, add a small link in the footer area:

1. Add imports:
```tsx
import { Sparkles } from 'lucide-react';
import { FanWishModal } from '@/components/fan-wishes/FanWishModal';
```

2. Add state + modal rendering. Find the nav footer area and add:
```tsx
<button
  onClick={() => setWishOpen(true)}
  className="flex items-center gap-2 px-3 py-2 text-xs text-white/30 hover:text-gold transition-colors min-h-[44px] w-full"
>
  <Sparkles className="size-3.5" aria-hidden="true" />
  <span>Wunsch einreichen</span>
</button>
<FanWishModal open={wishOpen} onClose={() => setWishOpen(false)} />
```

**Step 3: Run tsc, commit**

```
feat: fan wish entry points — club discovery + SideNav
```

---

### Task 5: Admin Tab — Aggregated Fan Wishes

**Files:**
- Create: `src/app/(app)/bescout-admin/AdminFanWishesTab.tsx`
- Modify: `src/app/(app)/bescout-admin/BescoutAdminContent.tsx` — add tab

**Step 1: Create `AdminFanWishesTab.tsx`**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Sparkles, CheckCircle2, XCircle, BookOpen } from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/providers/ToastProvider';
import { getAllWishes, updateWishStatus } from '@/lib/services/fanWishes';
import type { DbFanWish } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-sky-500/20 text-sky-400',
  noted: 'bg-amber-500/20 text-amber-400',
  onboarded: 'bg-green-500/20 text-green-400',
  declined: 'bg-red-500/20 text-red-400',
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  open: Sparkles,
  noted: BookOpen,
  onboarded: CheckCircle2,
  declined: XCircle,
};

export function AdminFanWishesTab() {
  const t = useTranslations('bescoutAdmin');
  const { addToast } = useToast();
  const [wishes, setWishes] = useState<DbFanWish[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllWishes().then(data => { setWishes(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleStatus = async (id: string, status: string) => {
    const result = await updateWishStatus(id, status);
    if (result.success) {
      setWishes(prev => prev.map(w => w.id === id ? { ...w, status: status as DbFanWish['status'] } : w));
      addToast('Status aktualisiert', 'success');
    } else {
      addToast(result.error ?? 'Fehler', 'error');
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin motion-reduce:animate-none text-white/30" aria-hidden="true" /></div>;

  // Aggregate by club_name
  const clubAgg = new Map<string, { count: number; wishes: DbFanWish[] }>();
  for (const w of wishes) {
    const key = (w.club_name ?? 'Unbekannt').toLowerCase().trim();
    const existing = clubAgg.get(key) ?? { count: 0, wishes: [] };
    existing.count++;
    existing.wishes.push(w);
    clubAgg.set(key, existing);
  }
  const clubRanked = Array.from(clubAgg.entries())
    .sort((a, b) => b[1].count - a[1].count);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 text-center">
          <div className="font-mono tabular-nums text-2xl font-black text-gold">{wishes.length}</div>
          <div className="text-xs text-white/40">Gesamt</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="font-mono tabular-nums text-2xl font-black text-sky-400">{wishes.filter(w => w.status === 'open').length}</div>
          <div className="text-xs text-white/40">Offen</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="font-mono tabular-nums text-2xl font-black text-white">{clubAgg.size}</div>
          <div className="text-xs text-white/40">Clubs</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="font-mono tabular-nums text-2xl font-black text-green-400">{wishes.filter(w => w.status === 'onboarded').length}</div>
          <div className="text-xs text-white/40">Onboarded</div>
        </Card>
      </div>

      {/* Club Ranking */}
      <Card className="p-4">
        <h3 className="text-sm font-black text-white/80 uppercase tracking-wide mb-3">Top-Wunsch-Clubs</h3>
        <div className="space-y-2">
          {clubRanked.map(([club, { count, wishes: cw }]) => (
            <div key={club} className="flex items-center justify-between py-2 px-3 bg-surface-base rounded-lg">
              <div>
                <span className="text-sm font-bold text-white">{cw[0].club_name ?? 'Unbekannt'}</span>
                {cw[0].league_name && <span className="text-xs text-white/30 ml-2">{cw[0].league_name}</span>}
              </div>
              <span className="font-mono tabular-nums font-bold text-gold">{count}x</span>
            </div>
          ))}
        </div>
      </Card>

      {/* All Wishes */}
      <Card className="p-4">
        <h3 className="text-sm font-black text-white/80 uppercase tracking-wide mb-3">Alle Wuensche</h3>
        <div className="space-y-2">
          {wishes.map(w => {
            const Icon = STATUS_ICONS[w.status] ?? Sparkles;
            return (
              <div key={w.id} className="flex items-start justify-between gap-3 py-2 px-3 bg-surface-base rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold uppercase', w.wish_type === 'player' ? 'bg-sky-500/20 text-sky-400' : 'bg-amber-500/20 text-amber-400')}>
                      {w.wish_type}
                    </span>
                    <span className="text-sm font-bold text-white truncate">
                      {w.wish_type === 'player' ? w.player_name : w.club_name}
                    </span>
                    {w.wish_type === 'player' && w.club_name && (
                      <span className="text-xs text-white/30">({w.club_name})</span>
                    )}
                  </div>
                  {w.note && <div className="text-xs text-white/40 truncate">{w.note}</div>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <select
                    value={w.status}
                    onChange={e => handleStatus(w.id, e.target.value)}
                    className={cn('px-2 py-1 rounded text-xs font-bold border-0 cursor-pointer', STATUS_COLORS[w.status])}
                    aria-label="Status"
                  >
                    <option value="open">Open</option>
                    <option value="noted">Noted</option>
                    <option value="onboarded">Onboarded</option>
                    <option value="declined">Declined</option>
                  </select>
                </div>
              </div>
            );
          })}
          {wishes.length === 0 && <div className="text-center text-white/30 py-4">Noch keine Wuensche</div>}
        </div>
      </Card>
    </div>
  );
}
```

**Step 2: Wire into BescoutAdminContent**

In `src/app/(app)/bescout-admin/BescoutAdminContent.tsx`:

1. Add import (~line 32):
```typescript
import { AdminFanWishesTab } from './AdminFanWishesTab';
```

2. Add `'wishes'` to the `AdminTab` type (line 39):
```typescript
type AdminTab = 'overview' | 'users' | 'clubs' | 'founding_passes' | 'treasury' | 'fees' | 'economy' | 'ipos' | 'gameweeks' | 'events' | 'airdrop' | 'sponsors' | 'creator_fund' | 'wishes' | 'debug';
```

3. Add icon (line 42, import `Heart` from lucide-react):
```typescript
wishes: Heart,
```

4. Add to TAB_ORDER (line 46), before `'debug'`:
```typescript
..., 'creator_fund', 'wishes', 'debug'
```

5. Add label in TAB_LABELS (~line 305):
```typescript
wishes: 'Fan Wishes',
```

6. Add tab content render (~line 351, before debug):
```tsx
{tab === 'wishes' && <AdminFanWishesTab />}
```

**Step 3: Run tsc, commit**

```
feat: Admin Fan Wishes tab — aggregated view + status management
```

---

## Execution Order

1. **Task 1** (DB) — no dependencies
2. **Task 2** (Types + Service) — depends on Task 1
3. **Task 3** (Modal Component) — depends on Task 2
4. **Task 4** (Entry Points) — depends on Task 3
5. **Task 5** (Admin Tab) — depends on Task 2, parallel with Task 3-4

Tasks 3-4 (user UI) and Task 5 (admin UI) can run in parallel after Task 2.

## Verification

After all tasks:
1. `npx tsc --noEmit` — PASS
2. DB: `SELECT COUNT(*) FROM fan_wishes` — 0 (empty, ready)
3. UI: Open `/clubs` → see "Dein Club fehlt?" button → click → modal opens → submit → toast
4. Admin: Open `/bescout-admin` → Fan Wishes tab → see aggregated view
5. SideNav: See wish link in footer area
