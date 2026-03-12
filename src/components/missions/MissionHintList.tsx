'use client';

import React from 'react';
import { useMissionHints } from '@/lib/queries/missions';
import MissionHint from './MissionHint';

type MissionHintListProps = {
  context: 'fantasy' | 'market' | 'community' | 'trading';
};

export default function MissionHintList({ context }: MissionHintListProps) {
  const { hints, isLoading } = useMissionHints(context);

  if (isLoading || hints.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {hints.map(h => (
        <MissionHint
          key={h.missionId}
          title={h.title}
          icon={h.icon}
          reward={h.reward}
          progress={h.progress}
          target={h.target}
        />
      ))}
    </div>
  );
}
