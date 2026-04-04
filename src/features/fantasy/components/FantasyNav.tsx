'use client';

import { Calendar, Users, BarChart3, Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { SpieltagSelector } from '@/components/fantasy/SpieltagSelector';
import type { FantasyTab } from '@/components/fantasy/types';

interface FantasyNavProps {
  currentGw: number;
  activeGw: number;
  gwStatus: 'open' | 'simulated' | 'empty';
  fixtureCount: number;
  eventCount: number;
  mainTab: FantasyTab;
  onTabChange: (tab: FantasyTab) => void;
  onGameweekChange: (gw: number) => void;
}

const TAB_ICONS = {
  paarungen: Calendar,
  events: Globe,
  mitmachen: Users,
  ergebnisse: BarChart3,
} as const;

export function FantasyNav({
  currentGw,
  activeGw,
  gwStatus,
  fixtureCount,
  eventCount,
  mainTab,
  onTabChange,
  onGameweekChange,
}: FantasyNavProps) {
  const t = useTranslations('fantasy');

  const tabs: { id: FantasyTab; label: string }[] = [
    { id: 'paarungen', label: t('tabFixtures') },
    { id: 'events', label: t('events') },
    { id: 'mitmachen', label: t('tabJoined') },
    { id: 'ergebnisse', label: t('tabResults') },
  ];

  return (
    <div className="sticky top-[57px] z-20 -mx-4 px-4 py-2 bg-bg-main/95 backdrop-blur-xl border-b border-white/[0.04] space-y-2 lg:static lg:mx-0 lg:px-0 lg:py-0 lg:bg-transparent lg:backdrop-blur-none lg:border-0 lg:space-y-4">
      <SpieltagSelector
        gameweek={currentGw}
        activeGameweek={activeGw}
        status={gwStatus}
        fixtureCount={fixtureCount}
        eventCount={eventCount}
        onGameweekChange={onGameweekChange}
      />

      {/* SEGMENT TABS -- 4 Tabs, always fit */}
      <div className="flex items-center overflow-x-auto scrollbar-hide gap-1 p-1 bg-surface-subtle border border-divider rounded-xl">
        {tabs.map(tab => {
          const Icon = TAB_ICONS[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn('flex-shrink-0 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap min-h-[44px]',
                mainTab === tab.id
                  ? 'bg-gold/15 text-gold shadow-sm'
                  : 'text-white/50 hover:text-white/70'
              )}
            >
              <Icon className="size-3.5 flex-shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
