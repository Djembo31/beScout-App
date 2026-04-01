'use client';

import React from 'react';
import Link from 'next/link';
import { TrendingUp, Trophy, Search, Crown, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

type Props = {
  clubColor: string;
};

const FEATURES = [
  { icon: TrendingUp, titleKey: 'featureDpcTitle', descKey: 'featureDpcDesc', href: '/market' },
  { icon: Trophy, titleKey: 'featureFantasyTitle', descKey: 'featureFantasyDesc', href: '/fantasy' },
  { icon: Search, titleKey: 'featureScoutTitle', descKey: 'featureScoutDesc', href: '/community' },
  { icon: Crown, titleKey: 'featureMemberTitle', descKey: 'featureMemberDesc', href: '#membership' },
] as const;

export function FeatureShowcase({ clubColor }: Props) {
  const t = useTranslations('club');

  return (
    <section className="space-y-4">
      <h2 className="font-black text-balance">{t('featureShowcaseTitle')}</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <Link
              key={feature.titleKey}
              href={feature.href}
              className={cn(
                'group rounded-2xl p-4 border border-white/10 transition-colors',
                'hover:border-[var(--club-primary,#FFD700)]/30 hover:-translate-y-0.5',
                'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
              )}
              style={{
                background: `linear-gradient(135deg, ${clubColor}08 0%, transparent 100%)`,
              }}
            >
              <div className="flex flex-col gap-3">
                <div
                  className="size-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${clubColor}15` }}
                >
                  <Icon className="size-5" style={{ color: clubColor }} />
                </div>
                <div>
                  <div className="text-sm font-bold mb-0.5">{t(feature.titleKey)}</div>
                  <div className="text-xs text-white/40 leading-relaxed">{t(feature.descKey)}</div>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: clubColor }}>
                  {t('featureExplore')} <ChevronRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
