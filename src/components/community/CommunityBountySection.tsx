'use client';

import React from 'react';
import { Target } from 'lucide-react';
import BountyCard from '@/components/community/BountyCard';
import type { BountyWithCreator } from '@/types';
import { useTranslations } from 'next-intl';

interface CommunityBountySectionProps {
  bounties: BountyWithCreator[];
  userId: string;
  onSubmit: (bountyId: string, title: string, content: string, evaluation?: Record<string, unknown> | null) => void;
  submitting: string | null;
  userTier?: string | null;
}

export default function CommunityBountySection({
  bounties,
  userId,
  onSubmit,
  submitting,
  userTier,
}: CommunityBountySectionProps) {
  const t = useTranslations('community');
  if (bounties.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-5 h-5 text-amber-400" />
        <span className="font-bold text-sm">{t('bountySection.title')}</span>
        <span className="text-xs text-white/40">{bounties.length} {t('bountySection.open')}</span>
      </div>

      {/* Horizontal scroll on mobile, 2-col grid on desktop */}
      <div className="flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-2 lg:overflow-visible scrollbar-hide">
        {bounties.map(bounty => (
          <div key={bounty.id} className="min-w-[300px] lg:min-w-0 flex-shrink-0 lg:flex-shrink">
            <BountyCard
              bounty={bounty}
              userId={userId}
              onSubmit={onSubmit}
              submitting={submitting}
              userTier={userTier}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
