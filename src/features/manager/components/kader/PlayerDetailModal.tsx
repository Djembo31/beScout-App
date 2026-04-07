'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Users, Tag } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { TabBar, TabPanel } from '@/components/ui/TabBar';
import { useManagerStore } from '../../store/managerStore';
import { useManagerData } from '../../hooks/useManagerData';
import { useUser } from '@/components/providers/AuthProvider';

// Lazy-load the 3 detail sections (recycled from old IntelPanel)
const StatsTab = dynamic(() => import('../intel/StatsTab'), { ssr: false });
const FormTab = dynamic(() => import('../intel/FormTab'), { ssr: false });
const MarktTab = dynamic(() => import('../intel/MarktTab'), { ssr: false });

type DetailTab = 'stats' | 'form' | 'markt';

export default function PlayerDetailModal() {
  const t = useTranslations('manager');
  const tMarket = useTranslations('market');
  const { user } = useUser();
  const playerId = useManagerStore((s) => s.kaderDetailPlayerId);
  const setPlayerId = useManagerStore((s) => s.setKaderDetailPlayerId);
  const setKaderSellPlayerId = useManagerStore((s) => s.setKaderSellPlayerId);
  const setActiveTab = useManagerStore((s) => s.setActiveTab);

  const {
    playerMap, holdings, getFloor,
    getScores, getNextFixture, getEventCount,
  } = useManagerData(user?.id);

  const [activeTab, setActiveDetailTab] = useState<DetailTab>('stats');

  const player = useMemo(
    () => (playerId ? playerMap.get(playerId) ?? null : null),
    [playerId, playerMap],
  );

  if (!player) return null;

  const scores = getScores(player.id);
  const nextFixture = player.clubId ? getNextFixture(player.clubId) : undefined;
  const eventCount = getEventCount(player.id);

  const handleClose = () => setPlayerId(null);

  const handlePlanInLineup = () => {
    handleClose();
    setActiveTab('aufstellen');
  };

  const handleSell = () => {
    handleClose();
    setKaderSellPlayerId(player.id);
  };

  const tabDefs = [
    { id: 'stats', label: t('detailStats', { defaultValue: 'Stats' }) },
    { id: 'form', label: t('detailForm', { defaultValue: 'Form' }) },
    { id: 'markt', label: t('detailMarkt', { defaultValue: 'Markt' }) },
  ];

  return (
    <Modal
      open={!!playerId}
      onClose={handleClose}
      title={`${player.first} ${player.last}`}
      size="md"
    >
      <div className="space-y-4">
        <TabBar
          tabs={tabDefs}
          activeTab={activeTab}
          onChange={(id) => setActiveDetailTab(id as DetailTab)}
        />

        <TabPanel id="stats" activeTab={activeTab}>
          <StatsTab
            player={player}
            scores={scores}
            nextFixture={nextFixture}
            eventCount={eventCount}
          />
        </TabPanel>
        <TabPanel id="form" activeTab={activeTab}>
          <FormTab player={player} scores={scores} />
        </TabPanel>
        <TabPanel id="markt" activeTab={activeTab}>
          <MarktTab player={player} holdings={holdings} getFloor={getFloor} />
        </TabPanel>

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2 border-t border-white/[0.06]">
          <Button
            variant="ghost"
            onClick={handlePlanInLineup}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <Users className="size-4" aria-hidden="true" />
            {t('planInLineup', { defaultValue: 'Im Lineup planen' })}
          </Button>
          <Button
            variant="gold"
            onClick={handleSell}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <Tag className="size-4" aria-hidden="true" />
            {tMarket('bestandSellShort')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
