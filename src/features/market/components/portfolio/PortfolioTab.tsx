'use client';

import { useTranslations } from 'next-intl';
import { Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { SkeletonCard } from '@/components/ui';
import { useMarketStore } from '@/features/market/store/marketStore';
import type { PortfolioSubTab } from '@/features/market/store/marketStore';
import type { Player, DbOrder, OfferWithDetails } from '@/types';
import { TradingDisclaimer } from '@/components/legal/TradingDisclaimer';

const BestandView = dynamic(() => import('./BestandView'), {
  ssr: false,
  loading: () => <div className="space-y-3">{[...Array(4)].map((_, i) => <SkeletonCard key={i} className="h-28" />)}</div>,
});
const OffersTab = dynamic(() => import('./OffersTab'), {
  ssr: false,
  loading: () => <div className="space-y-3">{[...Array(3)].map((_, i) => <SkeletonCard key={i} className="h-24" />)}</div>,
});
type Props = {
  players: Player[];
  mySquadPlayers: Player[];
  holdings: { player_id: string; quantity: number; avg_buy_price: number }[];
  floorMap: Map<string, number>;
  recentOrders: DbOrder[];
  buyOrders: DbOrder[];
  scoresMap?: Map<string, (number | null)[]>;
  lockedMap?: Map<string, number>;
  onSell: (playerId: string, quantity: number, priceCents: number) => Promise<{ success: boolean; error?: string }>;
  onCancelOrder: (orderId: string) => Promise<{ success: boolean; error?: string }>;
  incomingOffers: OfferWithDetails[];
  openBids: OfferWithDetails[];
};

export default function PortfolioTab({
  players, mySquadPlayers, holdings, floorMap, recentOrders, buyOrders,
  scoresMap, lockedMap, onSell, onCancelOrder, incomingOffers, openBids,
}: Props) {
  const t = useTranslations('market');
  const { portfolioSubTab, setPortfolioSubTab } = useMarketStore();

  const subTabs: Array<{ id: PortfolioSubTab; label: string; icon: React.ReactNode | null }> = [
    { id: 'bestand', label: t('bestandTab', { defaultMessage: 'Bestand' }), icon: <Briefcase className="size-3" aria-hidden="true" /> },
    { id: 'angebote', label: t('offers'), icon: null },
  ];

  return (
    <>
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
        {subTabs.map(st => (
          <button
            key={st.id}
            onClick={() => setPortfolioSubTab(st.id)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap flex-shrink-0 min-h-[36px] inline-flex items-center gap-1.5',
              portfolioSubTab === st.id
                ? 'bg-white/[0.12] text-white border border-white/[0.15]'
                : 'text-white/40 hover:text-white/60 border border-transparent'
            )}
          >
            {st.icon}
            {st.label}
          </button>
        ))}
      </div>
      {portfolioSubTab === 'bestand' && (
        <BestandView
          mySquadPlayers={mySquadPlayers}
          holdings={holdings}
          floorMap={floorMap}
          recentOrders={recentOrders}
          buyOrders={buyOrders}
          scoresMap={scoresMap}
          lockedMap={lockedMap}
          onSell={onSell}
          onCancelOrder={onCancelOrder}
          incomingOffers={incomingOffers}
          openBids={openBids}
        />
      )}
      {portfolioSubTab === 'angebote' && (
        <OffersTab players={players} />
      )}
      <TradingDisclaimer variant="card" />
    </>
  );
}
