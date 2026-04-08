'use client';

import { Suspense, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Loader2, Users, Briefcase, History } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useUser } from '@/components/providers/AuthProvider';
import { TabBar, TabPanel } from '@/components/ui/TabBar';
import { SkeletonCard } from '@/components/ui';
import { useManagerData } from '../hooks/useManagerData';
import { useManagerStore, type ManagerTab } from '../store/managerStore';
import { useTradeActions } from '@/features/market/hooks/useTradeActions';
import { useOpenEvents } from '../queries/eventQueries';
import PageHeader, { type NextEventInfo } from './PageHeader';

const KaderTab = dynamic(() => import('./kader/KaderTab'), {
  ssr: false,
  loading: () => <div className="space-y-3">{[...Array(4)].map((_, i) => <SkeletonCard key={i} className="h-20" />)}</div>,
});
const PlayerDetailModal = dynamic(() => import('./kader/PlayerDetailModal'), { ssr: false });
const AufstellenTab = dynamic(() => import('./aufstellen/AufstellenTab'), {
  ssr: false,
  loading: () => <div className="space-y-3">{[...Array(3)].map((_, i) => <SkeletonCard key={i} className="h-20" />)}</div>,
});
const HistorieTab = dynamic(() => import('./historie/HistorieTab'), {
  ssr: false,
  loading: () => <div className="space-y-3">{[...Array(4)].map((_, i) => <SkeletonCard key={i} className="h-16" />)}</div>,
});

const VALID_TABS = new Set<ManagerTab>(['aufstellen', 'kader', 'historie']);
const isValidTab = (v: string | null): v is ManagerTab => v !== null && VALID_TABS.has(v as ManagerTab);

function ManagerInner() {
  const t = useTranslations('manager');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, loading: userLoading } = useUser();

  const storeActiveTab = useManagerStore((s) => s.activeTab);
  const setActiveTab = useManagerStore((s) => s.setActiveTab);

  // URL → store sync (URL is source of truth)
  const tabParam = searchParams.get('tab');
  const activeTab: ManagerTab = isValidTab(tabParam) ? tabParam : storeActiveTab;

  const {
    players, mySquadPlayers, healthCounts, playersLoading,
    holdings, ipoList, incomingOffers,
  } = useManagerData(user?.id);

  const { events: openEvents } = useOpenEvents();
  const nextEvent: NextEventInfo = openEvents.length > 0
    ? { id: openEvents[0].id, name: openEvents[0].name, startTime: openEvents[0].startTime }
    : null;

  const { handleSell, handleCancelOrder } = useTradeActions(user?.id, ipoList);

  const handleTabChange = useCallback(
    (id: string) => {
      if (!isValidTab(id)) return;
      setActiveTab(id);
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams, setActiveTab],
  );

  if (userLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-8 animate-spin motion-reduce:animate-none text-gold" aria-hidden="true" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-24 text-white/40 text-sm">
        {t('notSignedIn')}
      </div>
    );
  }

  const tabDefs = [
    {
      id: 'aufstellen',
      label: t('tabAufstellen'),
      icon: <Users className="size-4" aria-hidden="true" />,
    },
    {
      id: 'kader',
      label: t('tabKader'),
      icon: <Briefcase className="size-4" aria-hidden="true" />,
    },
    {
      id: 'historie',
      label: t('tabHistorie'),
      icon: <History className="size-4" aria-hidden="true" />,
    },
  ];

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-6 space-y-4">
      <PageHeader
        squadCount={mySquadPlayers.length}
        healthCounts={healthCounts}
        nextEvent={nextEvent}
        loading={playersLoading}
      />

      <TabBar tabs={tabDefs} activeTab={activeTab} onChange={handleTabChange} />

      <TabPanel id="aufstellen" activeTab={activeTab}>
        <AufstellenTab />
      </TabPanel>

      <TabPanel id="kader" activeTab={activeTab}>
        <KaderTab
          players={players}
          holdings={holdings}
          ipoList={ipoList}
          userId={user?.id}
          incomingOffers={incomingOffers}
          onSell={handleSell}
          onCancelOrder={handleCancelOrder}
        />
      </TabPanel>

      <TabPanel id="historie" activeTab={activeTab}>
        <HistorieTab />
      </TabPanel>

      {/* Player detail modal — opens via setKaderDetailPlayerId from KaderTab row tap */}
      <PlayerDetailModal />
    </div>
  );
}

export default function ManagerContent() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <Loader2 className="size-8 animate-spin motion-reduce:animate-none text-gold" aria-hidden="true" />
        </div>
      }
    >
      <ManagerInner />
    </Suspense>
  );
}
