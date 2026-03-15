'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, User, Shield, Crown, TrendingUp, Search, Loader2, Activity, Download } from 'lucide-react';
import { Card, SearchInput, Button } from '@/components/ui';
import { cn, downloadCsv } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import {
  getClubFanSegments, getClubFanList, getClubRetentionMetrics,
  type FanSegment, type ClubFanProfile, type RetentionMetrics,
} from '@/lib/services/clubCrm';
import type { ClubWithAdmin } from '@/types';

const SEGMENT_ICONS: Record<string, React.ReactNode> = {
  users: <Users className="w-5 h-5" />,
  user: <User className="w-5 h-5" />,
  shield: <Shield className="w-5 h-5" />,
  crown: <Crown className="w-5 h-5" />,
  'trending-up': <TrendingUp className="w-5 h-5" />,
};

const SEGMENT_COLORS: Record<string, string> = {
  all: 'text-white/60 bg-white/5 border-white/10',
  free: 'text-white/60 bg-white/5 border-white/10',
  bronze: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  silber: 'text-slate-300 bg-slate-400/10 border-slate-400/20',
  gold: 'text-gold bg-gold/10 border-gold/20',
  trader: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

export default function AdminFansTab({ club }: { club: ClubWithAdmin }) {
  const t = useTranslations('adminFans');
  const [segments, setSegments] = useState<FanSegment[]>([]);
  const [fans, setFans] = useState<ClubFanProfile[]>([]);
  const [metrics, setMetrics] = useState<RetentionMetrics | null>(null);
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [fansLoading, setFansLoading] = useState(false);

  // Load segments + metrics on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [segs, ret, fanList] = await Promise.all([
        getClubFanSegments(club.id),
        getClubRetentionMetrics(club.id),
        getClubFanList(club.id, 'all', 50),
      ]);
      if (cancelled) return;
      setSegments(segs);
      setMetrics(ret);
      setFans(fanList);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [club.id]);

  // Reload fans on segment change
  const loadFans = useCallback(async (seg: string) => {
    setFansLoading(true);
    const fanList = await getClubFanList(club.id, seg, 50);
    setFans(fanList);
    setFansLoading(false);
  }, [club.id]);

  const handleSegmentClick = (segId: string) => {
    setSelectedSegment(segId);
    loadFans(segId);
  };

  const filteredFans = search
    ? fans.filter(f =>
        f.handle.toLowerCase().includes(search.toLowerCase()) ||
        (f.displayName ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : fans;

  const handleExport = useCallback(() => {
    if (filteredFans.length === 0) return;
    downloadCsv(
      filteredFans.map(f => ({
        Handle: f.handle,
        Name: f.displayName ?? '',
        Tier: f.tier ?? 'free',
        Holdings: f.holdingsCount,
        'Last Active': f.lastActivity ?? '',
      })),
      `fans-${selectedSegment}-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  }, [filteredFans, selectedSegment]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-24 rounded-2xl bg-white/[0.02] animate-pulse border border-white/[0.06]" />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-white/[0.02] animate-pulse border border-white/[0.06]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Retention KPIs */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: t('totalFollowers'), value: metrics.totalFollowers },
            { label: t('subscribers'), value: metrics.totalSubscribers },
            { label: 'DAU', value: metrics.dau },
            { label: 'WAU', value: metrics.wau },
            { label: 'MAU', value: metrics.mau },
          ].map(kpi => (
            <Card key={kpi.label} className="p-4 text-center">
              <div className="text-2xl font-black font-mono tabular-nums">{kpi.value}</div>
              <div className="text-[10px] text-white/40 font-semibold uppercase mt-1">{kpi.label}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Segment Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {segments.map(seg => {
          const colors = SEGMENT_COLORS[seg.id] ?? SEGMENT_COLORS.all;
          const isActive = selectedSegment === seg.id;
          return (
            <button
              key={seg.id}
              onClick={() => handleSegmentClick(seg.id)}
              aria-label={`${seg.label} (${seg.count})`}
              aria-pressed={isActive}
              className={cn('p-4 rounded-2xl border text-left transition-colors', isActive ? 'border-gold/30 bg-gold/5 ring-1 ring-gold/20' : 'border-white/[0.06] bg-surface-minimal hover:bg-surface-elevated')}
            >
              <div className={cn('size-10 rounded-xl flex items-center justify-center mb-2 border', colors)}>
                {SEGMENT_ICONS[seg.icon] ?? <Users className="w-5 h-5" />}
              </div>
              <div className="text-xl font-black font-mono tabular-nums">{seg.count}</div>
              <div className="text-[10px] text-white/40 font-semibold">{seg.label}</div>
            </button>
          );
        })}
      </div>

      {/* Fan List */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-white/[0.06] flex items-center gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t('searchFans')}
            className="flex-1"
          />
          <div className="text-xs text-white/40 whitespace-nowrap">
            {filteredFans.length} {t('fans')}
          </div>
          <Button variant="ghost" size="sm" onClick={handleExport} disabled={filteredFans.length === 0} aria-label={t('exportCsv')}>
            <Download className="size-3.5 mr-1" aria-hidden="true" />
            CSV
          </Button>
        </div>

        {fansLoading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-white/30" />
          </div>
        ) : filteredFans.length === 0 ? (
          <div className="p-8 text-center text-sm text-white/30">{t('noFans')}</div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filteredFans.map(fan => (
              <div key={fan.userId} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-minimal transition-colors">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/50 shrink-0 overflow-hidden">
                  {fan.avatarUrl ? (
                    <img src={fan.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    fan.handle.substring(0, 2).toUpperCase()
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">
                    {fan.displayName ?? fan.handle}
                  </div>
                  <div className="text-[10px] text-white/40">@{fan.handle}</div>
                </div>

                {/* Tier Badge */}
                {fan.tier && (
                  <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold border', SEGMENT_COLORS[fan.tier])}>
                    {fan.tier.charAt(0).toUpperCase() + fan.tier.slice(1)}
                  </span>
                )}

                {/* Holdings */}
                {fan.holdingsCount > 0 && (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    {fan.holdingsCount} DPC
                  </span>
                )}

                {/* Last Activity */}
                <div className="flex items-center gap-1 text-[10px] text-white/30 shrink-0">
                  <Activity className="w-3 h-3" />
                  {formatRelativeTime(fan.lastActivity)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
