'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Eye, MousePointerClick, TrendingUp, Loader2, Megaphone } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui';
import { getClubSponsors } from '@/lib/services/sponsors';
import { useSponsorStats } from '@/lib/queries';
import { cn } from '@/lib/utils';
import type { ClubWithAdmin, DbSponsor } from '@/types';

const PLACEMENT_COLORS: Record<string, string> = {
  club_hero: 'bg-amber-500/15 text-amber-300 border-amber-400/25',
  club_community: 'bg-amber-500/10 text-amber-200 border-amber-400/20',
  club_players: 'bg-amber-500/12 text-amber-300 border-amber-400/22',
  home_hero: 'bg-blue-500/15 text-blue-300 border-blue-400/25',
  home_mid: 'bg-blue-500/10 text-blue-200 border-blue-400/20',
  market_top: 'bg-purple-500/15 text-purple-300 border-purple-400/25',
  player_mid: 'bg-sky-500/15 text-sky-300 border-sky-400/25',
  event: 'bg-gold/15 text-gold border-gold/25',
};

const TIME_RANGES = [7, 30, 0] as const;

export default function AdminSponsorTab({ club }: { club: ClubWithAdmin }) {
  const t = useTranslations('admin');
  const [sponsors, setSponsors] = useState<DbSponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const { data: allStats } = useSponsorStats(days || 365);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getClubSponsors(club.id);
      setSponsors(data);
    } catch (err) {
      console.error('[AdminSponsor] load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [club.id]);

  useEffect(() => { load(); }, [load]);

  // Filter stats to only this club's sponsors
  const sponsorIds = new Set(sponsors.map(s => s.id));
  const stats = (allStats ?? []).filter(s => sponsorIds.has(s.sponsor_id));

  const totalImpressions = stats.reduce((sum, s) => sum + s.total_impressions, 0);
  const totalClicks = stats.reduce((sum, s) => sum + s.total_clicks, 0);
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';
  const activePlacements = sponsors.filter(s => s.is_active).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin motion-reduce:animate-none text-white/30" />
      </div>
    );
  }

  if (sponsors.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-black">{t('sponsors')}</h2>
        <Card className="p-8 text-center">
          <Megaphone className="w-8 h-8 text-white/20 mx-auto mb-3" />
          <div className="text-sm text-white/40">{t('noSponsors')}</div>
          <div className="text-xs text-white/25 mt-1">{t('noSponsorsHint')}</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black">{t('sponsors')}</h2>
        <div className="flex gap-1">
          {TIME_RANGES.map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none',
                days === d
                  ? 'bg-gold/15 text-gold border-gold/25'
                  : 'text-white/50 bg-white/5 border-white/10 hover:bg-white/10'
              )}
            >
              {d === 0 ? t('allTime') : t('daysRange', { days: d })}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={<Eye className="w-4 h-4" />} label={t('impressions')} value={totalImpressions.toLocaleString('de-DE')} color="text-sky-400" />
        <KpiCard icon={<MousePointerClick className="w-4 h-4" />} label={t('clicks')} value={totalClicks.toLocaleString('de-DE')} color="text-gold" />
        <KpiCard icon={<TrendingUp className="w-4 h-4" />} label="CTR" value={`${ctr}%`} color="text-green-500" />
        <KpiCard icon={<Megaphone className="w-4 h-4" />} label={t('activePlacements')} value={String(activePlacements)} color="text-purple-400" />
      </div>

      {/* Per-Placement Breakdown */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <div className="font-bold text-sm">{t('placementBreakdown')}</div>
        </div>
        <div className="divide-y divide-white/[0.06]">
          {sponsors.map(sponsor => {
            const stat = stats.find(s => s.sponsor_id === sponsor.id);
            const imp = stat?.total_impressions ?? 0;
            const clk = stat?.total_clicks ?? 0;
            const placementCtr = imp > 0 ? ((clk / imp) * 100).toFixed(2) : '0.00';

            return (
              <div key={sponsor.id} className="flex items-center gap-3 p-4 min-h-[56px] hover:bg-surface-minimal transition-colors">
                {/* Logo */}
                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {sponsor.logo_url ? (
                    <Image src={sponsor.logo_url} alt={sponsor.name} width={32} height={32} className="object-contain" />
                  ) : (
                    <Megaphone className="w-4 h-4 text-white/20" />
                  )}
                </div>
                {/* Name + Placement */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">{sponsor.name}</div>
                  <span className={cn(
                    'inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border mt-0.5',
                    PLACEMENT_COLORS[sponsor.placement] ?? 'bg-white/5 text-white/50 border-white/10'
                  )}>
                    {sponsor.placement.replace(/_/g, ' ')}
                  </span>
                </div>
                {/* Status */}
                <div className={cn(
                  'w-2 h-2 rounded-full flex-shrink-0',
                  sponsor.is_active ? 'bg-green-500' : 'bg-white/20'
                )} />
                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-white/50 flex-shrink-0">
                  <div className="text-right">
                    <div className="font-mono font-bold text-white/70">{imp.toLocaleString('de-DE')}</div>
                    <div className="text-[10px]">{t('impressions')}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-white/70">{clk.toLocaleString('de-DE')}</div>
                    <div className="text-[10px]">{t('clicks')}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-green-500">{placementCtr}%</div>
                    <div className="text-[10px]">CTR</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <Card className="p-4" role="group" aria-label={`${label}: ${value}`}>
      <div className={cn('flex items-center gap-1.5 mb-1', color)}>
        {icon}
        <span className="text-[10px] font-bold uppercase text-white/40">{label}</span>
      </div>
      <div className={cn('text-2xl font-black font-mono tabular-nums', color)} aria-hidden="true">{value}</div>
    </Card>
  );
}
