'use client';

import Link from 'next/link';
import { Briefcase, Zap, ChevronRight } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { PlayerPhoto, PositionBadge } from '@/components/player';
import { posTintColors } from '@/components/player/PlayerRow';
import { fmtScout, cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { SectionHeader } from './helpers';
import type { DpcHolding, Pos } from '@/types';

interface PortfolioStripProps {
  holdings: DpcHolding[];
}

export default function PortfolioStrip({ holdings }: PortfolioStripProps) {
  const t = useTranslations('home');

  // Empty state
  if (holdings.length === 0) {
    return (
      <div>
        <SectionHeader title={t('myRoster')} href="/market?tab=portfolio" />
        <Card className="p-6 text-center mt-3">
          <Briefcase className="size-10 mx-auto mb-2 text-white/20" />
          <div className="text-sm font-medium text-white/50">{t('emptyPortfolioTitle')}</div>
          <div className="text-xs text-white/30 mt-1">{t('emptyPortfolioDesc')}</div>
          <Link href="/market?tab=kaufen" className="inline-block mt-3">
            <Button variant="gold" size="sm" className="gap-1.5">
              <Zap className="size-3.5" />
              {t('buyFirstPlayer')}
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const top6 = holdings.slice(0, 6);

  return (
    <div>
      <SectionHeader title={t('myRoster')} href="/market?tab=portfolio" />
      <div className="mt-3 flex gap-2.5 overflow-x-auto scrollbar-hide pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
        {top6.map((h) => {
          const posColor = posTintColors[h.pos];
          const nameParts = h.player.split(' ');
          const first = nameParts[0] || '';
          const last = nameParts.slice(1).join(' ') || '';
          const isTop = h.change24h >= 5;

          return (
            <Link
              key={h.id}
              href={`/player/${h.playerId}`}
              className={cn(
                'flex-shrink-0 w-[130px] bg-surface-base border border-white/[0.10] rounded-xl p-3 card-lift group relative overflow-hidden',
                isTop && 'foil-shimmer',
              )}
              style={{
                borderLeftColor: posColor,
                borderLeftWidth: 2,
                backgroundImage: `linear-gradient(to bottom right, ${posColor}15, transparent 60%)`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <PlayerPhoto imageUrl={h.imageUrl} first={first} last={last} pos={h.pos} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate">{last || first}</div>
                  <PositionBadge pos={h.pos} size="sm" />
                </div>
              </div>
              <div className="h-px my-1.5" style={{ background: `linear-gradient(90deg, transparent, ${posColor}40, transparent)` }} />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-black gold-glow">
                  {fmtScout(h.floor)}
                </span>
                <span className={cn(
                  'text-[10px] font-mono font-bold',
                  h.change24h >= 0 ? 'text-vivid-green' : 'text-vivid-red'
                )} style={{ textShadow: h.change24h >= 5 ? '0 0 8px rgba(0,230,118,0.4)' : undefined }}>
                  {h.change24h >= 0 ? '+' : ''}{h.change24h.toFixed(1)}%
                </span>
              </div>
              <div className="text-[9px] text-white/30 mt-1 font-mono">{h.qty} DPC</div>
            </Link>
          );
        })}
        {holdings.length > 6 && (
          <Link
            href="/market?tab=portfolio"
            className="flex-shrink-0 w-[100px] flex flex-col items-center justify-center rounded-xl border border-white/[0.08] bg-surface-base hover:bg-surface-elevated transition-colors"
          >
            <ChevronRight className="size-5 text-gold mb-1" />
            <span className="text-[10px] text-gold font-bold">+{holdings.length - 6}</span>
          </Link>
        )}
      </div>
    </div>
  );
}
