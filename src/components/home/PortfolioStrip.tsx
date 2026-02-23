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
          <Briefcase className="w-10 h-10 mx-auto mb-2 text-white/20" />
          <div className="text-sm font-medium text-white/50">{t('emptyPortfolioTitle')}</div>
          <div className="text-xs text-white/30 mt-1">{t('emptyPortfolioDesc')}</div>
          <Link href="/market?tab=kaufen" className="inline-block mt-3">
            <Button variant="gold" size="sm" className="gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              {t('buyFirstPlayer')}
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const top3 = holdings.slice(0, 3);

  return (
    <div>
      <SectionHeader title={t('myRoster')} href="/market?tab=portfolio" />
      <div className="mt-3 flex gap-2.5 overflow-x-auto scrollbar-hide pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
        {top3.map((h) => {
          const posColor = posTintColors[h.pos];
          const nameParts = h.player.split(' ');
          const first = nameParts[0] || '';
          const last = nameParts.slice(1).join(' ') || '';

          return (
            <Link
              key={h.id}
              href={`/player/${h.playerId}`}
              className="flex-shrink-0 w-[140px] bg-surface-base border border-white/[0.10] rounded-xl p-3 card-lift group relative overflow-hidden"
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
              <div className="h-px bg-white/[0.06] my-1.5" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-[#FFD700]" style={{ textShadow: '0 0 10px rgba(255,215,0,0.4)' }}>
                  {fmtScout(h.floor)}
                </span>
                <span className={cn(
                  'text-[10px] font-mono font-bold',
                  h.change24h >= 0 ? 'text-[#00E676]' : 'text-[#FF3B69]'
                )}>
                  {h.change24h >= 0 ? '+' : ''}{h.change24h.toFixed(1)}%
                </span>
              </div>
              <div className="text-[9px] text-white/30 mt-1">{h.qty} DPC</div>
            </Link>
          );
        })}

        {/* "Show all" ghost card */}
        {holdings.length > 3 && (
          <Link
            href="/market?tab=portfolio"
            className="flex-shrink-0 w-[100px] flex flex-col items-center justify-center bg-white/[0.02] border border-white/[0.06] border-dashed rounded-xl p-3 hover:bg-white/[0.04] transition-all"
          >
            <ChevronRight className="w-5 h-5 text-white/20 mb-1" />
            <span className="text-[10px] text-white/40 text-center">{t('viewAllRoster', { count: String(holdings.length) })}</span>
          </Link>
        )}
      </div>
    </div>
  );
}
