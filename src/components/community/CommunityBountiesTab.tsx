'use client';

import React from 'react';
import { Target } from 'lucide-react';
import { Card } from '@/components/ui';
import BountyCard from '@/components/community/BountyCard';
import type { BountyWithCreator } from '@/types';

interface CommunityBountiesTabProps {
  bounties: BountyWithCreator[];
  userId: string;
  onSubmit: (bountyId: string, title: string, content: string) => void;
  submitting: string | null;
}

export default function CommunityBountiesTab({
  bounties,
  userId,
  onSubmit,
  submitting,
}: CommunityBountiesTabProps) {
  if (bounties.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="p-12 text-center">
          <Target className="w-12 h-12 mx-auto mb-4 text-white/20" />
          <div className="text-white/30 mb-2">Keine offenen Aufträge</div>
          <div className="text-xs text-white/20">Clubs können hier Aufträge für Fans erstellen</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Target className="w-5 h-5 text-amber-400" />
        <span className="font-bold">Club-Aufträge</span>
        <span className="text-xs text-white/40">{bounties.length} offen</span>
      </div>
      {bounties.map(bounty => (
        <BountyCard
          key={bounty.id}
          bounty={bounty}
          userId={userId}
          onSubmit={onSubmit}
          submitting={submitting}
        />
      ))}
    </div>
  );
}
