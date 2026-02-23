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

  const top4 = holdings.slice(0, 4);

  return (
    <div>
      <SectionHeader title={t('myRoster')} href="/market?tab=portfolio" />
      <div className="mt-3 grid grid-cols-2 gap-2">
        {top4.map((h) => {
          const posColor = posTintColors[h.pos];
          const nameParts = h.player.split(' ');
          const first = nameParts[0] || '';
          const last = nameParts.slice(1).join(' ') || '';

          return (
            <Link
              key={h.id}
              href={`/player/${h.playerId}`}
              className="bg-surface-base border border-white/[0.10] rounded-xl p-3 card-lift group relative overflow-hidden"
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
      </div>
      {holdings.length > 4 && (
        <Link href="/market?tab=portfolio" className="block text-center py-2.5 mt-1 text-xs text-[#FFD700] hover:underline">
          {t('viewAllRoster', { count: String(holdings.length) })}
        </Link>
      )}
    </div>
  );
}
