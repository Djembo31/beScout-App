'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Zap, Search, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { SkeletonCard } from '@/components/ui';
import { useMarketStore } from '@/features/market/store/marketStore';
import type { KaufenSubTab } from '@/features/market/store/marketStore';
import type { Player, DbIpo, DbOrder } from '@/types';
import type { TrendingPlayer } from '@/lib/services/trading';
import type { HoldingWithPlayer } from '@/lib/services/wallet';
import type { OfferWithDetails } from '@/types';
import { TradingDisclaimer } from '@/components/legal/TradingDisclaimer';
import NewUserTip from '@/components/onboarding/NewUserTip';

const ClubVerkaufSection = dynamic(() => import('./ClubVerkaufSection'), {
  ssr: false,
  loading: () => <div className="space-y-3">{[...Array(3)].map((_, i) => <SkeletonCard key={i} className="h-32" />)}</div>,
});
const TransferListSection = dynamic(() => import('./TransferListSection'), {
  ssr: false,
  loading: () => <div className="space-y-2">{[...Array(5)].map((_, i) => <SkeletonCard key={i} className="h-16" />)}</div>,
});
const TrendingSection = dynamic(() => import('./TrendingSection'), { ssr: false });
const MarketSearch = dynamic(() => import('../shared/MarketSearch'), { ssr: false });
const BuyOrdersSection = dynamic(() => import('./BuyOrdersSection'), { ssr: false });
const SponsorBanner = dynamic(() => import('@/components/player/detail/SponsorBanner'), {
  ssr: false,
  loading: () => <div className="h-16 rounded-2xl bg-white/[0.02] animate-pulse motion-reduce:animate-none" />,
});

type Props = {
  players: Player[];
  playerMap: Map<string, Player>;
  floorMap: Map<string, number>;
  ipoList: DbIpo[];
  announcedIpos: DbIpo[];
  endedIpos: DbIpo[];
  trending: TrendingPlayer[];
  recentOrders: DbOrder[];
  buyOrders: DbOrder[];
  holdings: HoldingWithPlayer[];
  incomingOffers: OfferWithDetails[];
  balanceCents: number;
  buyingId: string | null;
  onBuy: (playerId: string) => void;
  onIpoBuy: (playerId: string) => void;
  onCreateBuyOrder: (playerId: string) => void;
};

export default function MarktplatzTab({
  players, playerMap, floorMap, ipoList, announcedIpos, endedIpos,
  trending, recentOrders, buyOrders, holdings, incomingOffers,
  balanceCents, buyingId, onBuy, onIpoBuy, onCreateBuyOrder,
}: Props) {
  const t = useTranslations('market');
  const tt = useTranslations('tips');
  const { kaufenSubTab, setKaufenSubTab, setTab, setPortfolioSubTab } = useMarketStore();
  const [searchOpen, setSearchOpen] = useState(false);

  const getFloor = (p: Player) => floorMap.get(p.id) ?? 0;

  const subTabs: Array<{ id: KaufenSubTab; label: string }> = [
    { id: 'clubverkauf', label: t('clubSale', { defaultMessage: 'Club Verkauf' }) },
    { id: 'transferliste', label: t('transferList', { defaultMessage: 'Transferliste' }) },
    { id: 'trending', label: t('trendingTab', { defaultMessage: 'Trending' }) },
  ];

  return (
    <>
      {/* Sub-Tabs + Search toggle */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1">
          {subTabs.map(st => (
            <button
              key={st.id}
              onClick={() => { setKaufenSubTab(st.id); setSearchOpen(false); }}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap flex-shrink-0 min-h-[36px]',
                kaufenSubTab === st.id && !searchOpen
                  ? 'bg-white/[0.12] text-white border border-white/[0.15]'
                  : 'text-white/40 hover:text-white/60 border border-transparent'
              )}
            >
              {st.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className={cn(
            'p-2 rounded-lg transition-colors min-h-[36px] flex-shrink-0',
            searchOpen ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
          )}
          aria-label={t('searchPlayers', { defaultMessage: 'Spieler suchen' })}
        >
          <Search className="size-4" aria-hidden="true" />
        </button>
      </div>

      {/* Search overlay */}
      {searchOpen && (
        <MarketSearch
          players={players}
          activeIpos={ipoList}
          sellOrders={recentOrders}
          onClose={() => setSearchOpen(false)}
        />
      )}

      <NewUserTip
        tipKey="market-first-buy"
        icon={<Zap className="size-4" />}
        title={tt('marketTitle')}
        description={tt('marketDesc')}
        show={holdings.length === 0}
      />

      {/* P2P Offers hint */}
      {incomingOffers.length > 0 && (
        <button
          onClick={() => { setTab('portfolio'); setPortfolioSubTab('angebote'); }}
          className="w-full flex items-center gap-2 px-3 py-2.5 bg-gold/[0.06] border border-gold/15 rounded-xl text-xs font-bold text-gold hover:bg-gold/10 transition-colors group"
        >
          <Send className="size-3.5 flex-shrink-0" aria-hidden="true" />
          <span>{t('pendingOffers', { defaultMessage: '{count} offene Angebote', count: incomingOffers.length })}</span>
          <span className="ml-auto text-[10px] text-gold/60 group-hover:text-gold transition-colors">{t('viewOffers', { defaultMessage: 'Anzeigen \u2192' })}</span>
        </button>
      )}

      {kaufenSubTab === 'clubverkauf' && (
        <ClubVerkaufSection
          players={players}
          activeIpos={ipoList}
          announcedIpos={announcedIpos}
          endedIpos={endedIpos}
          playerMap={playerMap}
          onIpoBuy={onIpoBuy}
          buyingId={buyingId}
          hasHoldings={holdings.length > 0}
        />
      )}
      {kaufenSubTab === 'trending' && (
        <TrendingSection trending={trending} playerMap={playerMap} />
      )}
      {kaufenSubTab === 'transferliste' && (
        <>
          <TransferListSection
            players={players}
            sellOrders={recentOrders}
            playerMap={playerMap}
            getFloor={getFloor}
            onBuy={onBuy}
            buyingId={buyingId}
            balanceCents={balanceCents}
            onCreateBuyOrder={onCreateBuyOrder}
          />
          <BuyOrdersSection buyOrders={buyOrders} playerMap={playerMap} />
        </>
      )}
      <SponsorBanner placement="market_top" />
      <TradingDisclaimer variant="card" />
    </>
  );
}
