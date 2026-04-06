'use client';

import { useTranslations } from 'next-intl';
import { TabBar } from '@/components/ui/TabBar';
import type { Player } from '@/types';
import type { HoldingWithPlayer } from '@/lib/services/wallet';
import type { NextFixtureInfo } from '@/lib/services/fixtures';
import StatsTab from './intel/StatsTab';
import FormTab from './intel/FormTab';
import MarktTab from './intel/MarktTab';

type IntelTab = 'stats' | 'form' | 'markt';

interface IntelPanelProps {
  player: Player | null;
  activeTab: IntelTab;
  onTabChange: (tab: IntelTab) => void;
  scores: (number | null)[] | undefined;
  nextFixture: NextFixtureInfo | undefined;
  eventCount: number;
  holdings: HoldingWithPlayer[];
  getFloor: (p: Player) => number;
}

export default function IntelPanel({
  player,
  activeTab,
  onTabChange,
  scores,
  nextFixture,
  eventCount,
  holdings,
  getFloor,
}: IntelPanelProps) {
  const t = useTranslations('manager');

  const tabs = [
    { id: 'stats' as const, label: t('intelStats') },
    { id: 'form' as const, label: t('intelForm') },
    { id: 'markt' as const, label: t('intelMarkt') },
  ];

  return (
    <div className="flex flex-col h-full">
      <TabBar
        tabs={tabs}
        activeTab={activeTab}
        onChange={(id) => onTabChange(id as IntelTab)}
        className="mb-3"
      />

      {!player ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-white/40">{t('noPlayerSelected')}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'stats' && (
            <StatsTab
              player={player}
              scores={scores}
              nextFixture={nextFixture}
              eventCount={eventCount}
            />
          )}
          {activeTab === 'form' && (
            <FormTab player={player} scores={scores} />
          )}
          {activeTab === 'markt' && (
            <MarktTab player={player} holdings={holdings} getFloor={getFloor} />
          )}
        </div>
      )}
    </div>
  );
}
