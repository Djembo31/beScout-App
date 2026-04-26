'use client';

import React from 'react';
import { useMissionHints } from '@/lib/queries/missions';
import MissionHint from './MissionHint';
import FantasyContextHint from './FantasyContextHint';
import { useFantasyContextHints } from '@/features/fantasy/hooks/useFantasyContextHints';
import type { FantasyEvent } from '@/features/fantasy/types';

type MissionHintListProps = {
  context: 'fantasy' | 'market' | 'community' | 'trading';
  /**
   * Slice 201c (M-01): Optional Fantasy-Events fuer kontext-derived Hints.
   * Nur relevant wenn context='fantasy'. Caller (FantasyContent) uebergibt
   * gwEvents oder activeEvents aus useFantasyEvents.
   */
  fantasyEvents?: FantasyEvent[];
};

export default function MissionHintList({ context, fantasyEvents = [] }: MissionHintListProps) {
  const { hints, isLoading } = useMissionHints(context);

  // Slice 201c: Fantasy-Context-Hints (state-derived, kein DB-Query).
  // Hook ist immer geladen aber returnt [] wenn context!='fantasy' oder events leer.
  const contextHints = useFantasyContextHints(
    context === 'fantasy' ? fantasyEvents : [],
  );

  // Early return wenn beides leer
  if (isLoading || (hints.length === 0 && contextHints.length === 0)) return null;

  return (
    <div className="space-y-1.5">
      {/* Context-Hints zuerst (state-derived = höhere Aktionsrelevanz) */}
      {contextHints.map(h => (
        <FantasyContextHint key={h.id} hint={h} />
      ))}
      {/* Generic Mission-Hints */}
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
