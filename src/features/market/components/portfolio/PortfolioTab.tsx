'use client';

import { useTranslations } from 'next-intl';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { SkeletonCard } from '@/components/ui';
import { useMarketStore } from '@/features/market/store/marketStore';
import type { PortfolioSubTab } from '@/features/market/store/marketStore';
import type { Player } from '@/types';
import type { WatchlistEntry } from '@/lib/services/watchlist';
import { TradingDisclaimer } from '@/components/legal/TradingDisclaimer';

const OffersTab = dynamic(() => import('./OffersTab'), {
  ssr: false,
  loading: () => <div className="space-y-3">{[...Array(3)].map((_, i) => <SkeletonCard key={i} className="h-24" />)}</div>,
});
const WatchlistView = dynamic(() => import('./WatchlistView'), {
  ssr: false,
  loading: () => <div className="space-y-2">{[...Array(4)].map((_, i) => <SkeletonCard key={i} className="h-16" />)}</div>,
});
const SponsorBanner = dynamic(() => import('@/components/player/detail/SponsorBanner'), {
  ssr: false,
  loading: () => <div className="h-16 rounded-2xl bg-surface-minimal animate-pulse motion-reduce:animate-none" />,
});

type Props = {
  players: Player[];
  watchlistEntries: WatchlistEntry[];
};

export default function PortfolioTab({ players, watchlistEntries }: Props) {
  const t = useTranslations('market');
  const { portfolioSubTab, setPortfolioSubTab } = useMarketStore();

  const subTabs: Array<{ id: PortfolioSubTab; label: string; icon: React.ReactNode | null }> = [
    { id: 'angebote', label: t('offers'), icon: null },
    { id: 'watchlist', label: t('watchlist'), icon: <Heart className="size-3" /> },
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
      {portfolioSubTab === 'angebote' && (
        <OffersTab players={players} />
      )}
      {portfolioSubTab === 'watchlist' && (
        <WatchlistView players={players} watchlistEntries={watchlistEntries} />
      )}
      <SponsorBanner placement="market_top" />
      <TradingDisclaimer variant="card" />
    </>
  );
}
