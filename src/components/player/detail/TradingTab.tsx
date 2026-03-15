'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TradingDisclaimer } from '@/components/legal/TradingDisclaimer';
import MarktTab from './MarktTab';
import RewardsTab from './RewardsTab';
import type { Player, DbOrder, DbTrade, OfferWithDetails, ResearchPostWithAuthor } from '@/types';

interface TradingTabProps {
  player: Player;
  trades: DbTrade[];
  allSellOrders: DbOrder[];
  tradesLoading: boolean;
  profileMap: Record<string, { handle: string; display_name: string | null }>;
  userId?: string;
  dpcAvailable: number;
  openBids: OfferWithDetails[];
  holdingQty: number;
  onAcceptBid?: (offerId: string) => void;
  acceptingBidId?: string | null;
  onOpenOfferModal?: () => void;
  isRestrictedAdmin: boolean;
  playerResearch: ResearchPostWithAuthor[];
}

export default function TradingTab({
  player, trades, allSellOrders, tradesLoading,
  profileMap, userId, dpcAvailable,
  openBids, holdingQty,
  onAcceptBid, acceptingBidId, onOpenOfferModal,
  isRestrictedAdmin, playerResearch,
}: TradingTabProps) {
  const t = useTranslations('playerDetail');
  const [rewardsOpen, setRewardsOpen] = useState(false);

  return (
    <div className="space-y-4 md:space-y-6">
      <TradingDisclaimer variant="card" className="mb-4" />

      <MarktTab
        player={player}
        trades={trades}
        allSellOrders={allSellOrders}
        tradesLoading={tradesLoading}
        profileMap={profileMap}
        userId={userId}
        dpcAvailable={dpcAvailable}
        openBids={openBids}
        holdingQty={holdingQty}
        onAcceptBid={onAcceptBid}
        acceptingBidId={acceptingBidId}
        onOpenOfferModal={onOpenOfferModal}
        isRestrictedAdmin={isRestrictedAdmin}
        playerResearch={playerResearch}
      />

      {/* Rewards Accordion */}
      <div className="border border-white/[0.06] rounded-xl overflow-hidden">
        <button
          onClick={() => setRewardsOpen(v => !v)}
          className="w-full flex justify-between items-center p-4 hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-green-500" aria-hidden="true" />
            <span className="font-bold text-sm">{t('rewardTiers')}</span>
          </div>
          <ChevronDown className={cn(
            'size-4 text-white/40 transition-transform duration-200',
            rewardsOpen && 'rotate-180'
          )} />
        </button>
        {rewardsOpen && (
          <div className="border-t border-white/[0.06]">
            <RewardsTab player={player} holdingQty={holdingQty} />
          </div>
        )}
      </div>
    </div>
  );
}
