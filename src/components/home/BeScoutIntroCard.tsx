'use client';

import Link from 'next/link';
import { TrendingUp, Swords, MessageSquare, Search } from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

const PILLARS = [
  { key: 'introTrading', icon: TrendingUp, href: '/market', color: 'text-gold', bg: 'bg-gold/10 border-gold/20', glow: 'rgba(255,215,0,0.3)' },
  { key: 'introFantasy', icon: Swords, href: '/fantasy', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-400/20', glow: 'rgba(168,85,247,0.3)' },
  { key: 'introCommunity', icon: MessageSquare, href: '/community', color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-400/20', glow: 'rgba(14,165,233,0.3)' },
  { key: 'introScouting', icon: Search, href: '/community?tab=bounties', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-400/20', glow: 'rgba(52,211,153,0.3)' },
] as const;

export default function BeScoutIntroCard() {
  const t = useTranslations('home');

  return (
    <Card surface="elevated" className="p-5 shadow-card-md">
      <h2 className="text-base font-black">{t('introTitle')}</h2>
      <p className="text-xs text-white/40 mt-1">{t('introSubtitle')}</p>

      <div className="grid grid-cols-2 gap-2.5 mt-4">
        {PILLARS.map(({ key, icon: Icon, href, color, bg, glow }) => (
          <Link
            key={key}
            href={href}
            className={cn(
              'flex flex-col gap-2 p-3.5 rounded-xl border card-showcase shadow-card-sm',
              bg,
            )}
          >
            <Icon className={cn('size-5', color)} style={{ filter: `drop-shadow(0 0 6px ${glow})` }} aria-hidden="true" />
            <div>
              <div className="text-sm font-bold">{t(key)}</div>
              <div className="text-[10px] text-white/40 leading-relaxed">{t(`${key}Desc`)}</div>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
