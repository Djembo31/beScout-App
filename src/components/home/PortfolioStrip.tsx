'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Briefcase, Zap, ChevronRight } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { PlayerPhoto, PositionBadge } from '@/components/player';
import { posTintColors } from '@/components/player/PlayerRow';
import { fmtScout, cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { SectionHeader } from './helpers';
import type { DpcHolding } from '@/types';

interface PortfolioStripProps {
  holdings: DpcHolding[];
}

function PortfolioStripInner({ holdings }: PortfolioStripProps) {
  const t = useTranslations('home');

  // Empty state
  if (holdings.length === 0) {
    return (
      <div>
        <SectionHeader title={t('myRoster')} href="/market?tab=portfolio" />
        <Link href="/market?tab=kaufen" className="block mt-3">
          <Card className="p-6 text-center bg-card-glow-gold border-gold/10 shadow-card-md">
            <Briefcase className="size-10 mx-auto mb-2 text-gold/40" aria-hidden="true" />
            <div className="text-sm font-bold text-white/70">{t('emptyPortfolioTitle')}</div>
            <div className="text-xs text-white/30 mt-1">{t('emptyPortfolioDesc')}</div>
            <Button variant="gold" size="sm" className="gap-1.5 mt-4">
              <Zap className="size-3.5" aria-hidden="true" />
              {t('buyFirstPlayer')}
            </Button>
          </Card>
        </Link>
      </div>
    );
  }

  const top6 = holdings.slice(0, 6);

  return (
    <div>
      <SectionHeader title={t('myRoster')} href="/market?tab=portfolio" />
      <div aria-live="polite" className="mt-3 flex gap-3 overflow-x-auto scrollbar-hide scroll-touch pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
        {top6.map((h, i) => {
          const posColor = posTintColors[h.pos];
          const nameParts = h.player.split(' ');
          const first = nameParts[0] || '';
          const last = nameParts.slice(1).join(' ') || '';
          const posClass = h.pos === 'GK' ? 'card-pos-gk' : h.pos === 'DEF' ? 'card-pos-def' : h.pos === 'MID' ? 'card-pos-mid' : 'card-pos-att';

          return (
            <Link
              key={h.id}
              href={`/player/${h.playerId}`}
              className={cn(
                'flex-shrink-0 w-[160px] md:w-[176px] rounded-2xl p-3.5 card-showcase card-entrance group relative overflow-hidden card-metallic shadow-card-md',
                posClass,
                `card-stagger-${Math.min(i + 1, 6)}`,
              )}
              style={{
                background: `linear-gradient(to bottom right, ${posColor}12, rgba(255,255,255,0.03) 60%, rgba(255,255,255,0.02))`,
                border: `1px solid ${posColor}25`,
              }}
            >
              {/* Photo + L5 Score */}
              <div className="flex items-start gap-2.5 mb-3">
                <div className="relative">
                  <PlayerPhoto imageUrl={h.imageUrl} first={first} last={last} pos={h.pos} size={48} />
                  <div
                    className="absolute -bottom-1 -right-1 size-7 rounded-full flex items-center justify-center border-2 border-[#0a0a0a]"
                    style={{ backgroundColor: `${posColor}40`, boxShadow: `0 0 8px ${posColor}50` }}
                  >
                    <span className="font-mono font-black text-[10px] tabular-nums text-white">{h.perfL5}</span>
                  </div>
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="text-sm font-bold truncate">{last || first}</div>
                  <PositionBadge pos={h.pos} size="sm" />
                </div>
              </div>

              {/* Divider */}
              <div className="h-px mb-2.5" style={{ background: `linear-gradient(90deg, transparent, ${posColor}30, transparent)` }} />

              {/* Price + Change */}
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-lg font-mono font-black gold-glow leading-none">
                    {fmtScout(h.floor)}
                  </div>
                  <div className="text-[10px] text-white/25 font-mono mt-0.5">{h.qty} SC</div>
                </div>
                <span className={cn(
                  'text-xs font-mono font-bold tabular-nums',
                  h.change24h >= 0 ? 'text-vivid-green' : 'text-vivid-red'
                )} style={{ textShadow: h.change24h >= 5 ? '0 0 8px rgba(0,230,118,0.4)' : undefined }}>
                  {h.change24h >= 0 ? '+' : ''}{h.change24h.toFixed(1)}%
                </span>
              </div>
            </Link>
          );
        })}
        {holdings.length > 6 && (
          <Link
            href="/market?tab=portfolio"
            className="flex-shrink-0 w-[80px] flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-surface-base hover:bg-surface-elevated transition-colors shadow-card-sm"
          >
            <ChevronRight className="size-5 text-gold mb-1" aria-hidden="true" />
            <span className="text-xs text-gold font-bold">+{holdings.length - 6}</span>
          </Link>
        )}
      </div>
    </div>
  );
}

export default memo(PortfolioStripInner);
