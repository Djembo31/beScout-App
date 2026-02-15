'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui';
import ResearchCard from '@/components/community/ResearchCard';
import type { ResearchPostWithAuthor } from '@/types';
import SentimentGauge from './SentimentGauge';
import type { DbTrade } from '@/types';

interface CommunityTabProps {
  playerResearch: ResearchPostWithAuthor[];
  trades: DbTrade[];
  userId?: string;
  unlockingId: string | null;
  ratingId: string | null;
  onUnlock: (id: string) => void;
  onRate: (id: string, rating: number) => void;
}

export default function CommunityTab({
  playerResearch, trades, userId,
  unlockingId, ratingId, onUnlock, onRate,
}: CommunityTabProps) {
  // Compute sentiment from trades
  const recentTrades = trades.filter(t => {
    const diff = Date.now() - new Date(t.executed_at).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000; // last 7 days
  });
  const buyCount = recentTrades.length;
  const sellCount = recentTrades.filter(t => t.seller_id !== null).length;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Sentiment Gauge */}
      <Card className="p-4 md:p-6">
        <h3 className="font-black text-lg mb-4">Community-Stimmung</h3>
        <div className="flex justify-center">
          <SentimentGauge buyCount={buyCount} sellCount={sellCount} />
        </div>
        <div className="text-center mt-2 text-xs text-white/40">
          Basiert auf {recentTrades.length} Trades der letzten 7 Tage
        </div>
      </Card>

      {/* Research Posts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-white/50" />
            Research-Berichte
          </h3>
          <Link href="/community" className="text-xs text-[#FFD700] flex items-center gap-1 hover:underline">
            Alle anzeigen <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {playerResearch.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="w-10 h-10 mx-auto mb-3 text-white/20" />
            <div className="text-white/50 text-sm">Noch keine Research-Berichte</div>
          </Card>
        ) : (
          playerResearch.map(post => (
            <ResearchCard
              key={post.id}
              post={post}
              onUnlock={(id) => onUnlock(id)}
              unlockingId={unlockingId}
              onRate={(id, rating) => onRate(id, rating)}
              ratingId={ratingId}
            />
          ))
        )}
      </div>

    </div>
  );
}
