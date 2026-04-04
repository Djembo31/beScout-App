'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
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

export function AdminFanWishesTab() {
  const { addToast } = useToast();
  const [wishes, setWishes] = useState<DbFanWish[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllWishes().then(data => { setWishes(data); setLoading(false); }).catch((e) => { console.error('[AdminFanWishesTab] Load failed:', e); setLoading(false); });
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
      {clubRanked.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-black text-white/80 uppercase tracking-wide mb-3">Top-Wunsch-Clubs</h3>
          <div className="space-y-2">
            {clubRanked.map(([club, { count, wishes: cw }]) => (
              <div key={club} className="flex items-center justify-between py-2 px-3 bg-white/[0.03] rounded-lg">
                <div>
                  <span className="text-sm font-bold text-white">{cw[0].club_name ?? 'Unbekannt'}</span>
                  {cw[0].league_name && <span className="text-xs text-white/30 ml-2">{cw[0].league_name}</span>}
                </div>
                <span className="font-mono tabular-nums font-bold text-gold">{count}x</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* All Wishes */}
      <Card className="p-4">
        <h3 className="text-sm font-black text-white/80 uppercase tracking-wide mb-3">Alle Wuensche</h3>
        <div className="space-y-2">
          {wishes.map(w => (
            <div key={w.id} className="flex items-start justify-between gap-3 py-2 px-3 bg-white/[0.03] rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase',
                    w.wish_type === 'player' ? 'bg-sky-500/20 text-sky-400' : 'bg-amber-500/20 text-amber-400')}>
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
              <select
                value={w.status}
                onChange={e => handleStatus(w.id, e.target.value)}
                className={cn('px-2 py-1 rounded text-xs font-bold border-0 cursor-pointer flex-shrink-0', STATUS_COLORS[w.status])}
                aria-label="Status"
              >
                <option value="open">Open</option>
                <option value="noted">Noted</option>
                <option value="onboarded">Onboarded</option>
                <option value="declined">Declined</option>
              </select>
            </div>
          ))}
          {wishes.length === 0 && <div className="text-center text-white/30 py-4">Noch keine Wuensche</div>}
        </div>
      </Card>
    </div>
  );
}
