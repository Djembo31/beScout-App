'use client';

import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/components/providers/AuthProvider';
import { getUserMissions } from '@/lib/services/missions';
import { qk } from './keys';
import type { UserMissionWithDef } from '@/types';

type HintContext = 'fantasy' | 'market' | 'community' | 'trading';

const CONTEXT_KEYWORDS: Record<HintContext, string[]> = {
  fantasy: ['event', 'lineup', 'fantasy'],
  market: ['trade', 'buy', 'sell', 'portfolio'],
  community: ['post', 'research', 'upvote', 'vote', 'follow', 'community', 'social'],
  trading: ['trade', 'buy', 'sell', 'portfolio'],
};

export type MissionHintData = {
  missionId: string;
  title: string;
  icon: string;
  reward: number;
  progress: number;
  target: number;
};

function filterByContext(missions: UserMissionWithDef[], context: HintContext): MissionHintData[] {
  const keywords = CONTEXT_KEYWORDS[context];
  return missions
    .filter(m => m.status === 'active')
    .filter(m => {
      const key = m.definition.key.toLowerCase();
      return keywords.some(kw => key.includes(kw));
    })
    .slice(0, 2)
    .map(m => ({
      missionId: m.id,
      title: m.definition.title,
      icon: m.definition.icon,
      reward: Number(m.reward_cents),
      progress: m.progress,
      target: m.target_value,
    }));
}

const THIRTY_SEC = 30 * 1000;

export function useMissionHints(context: HintContext) {
  const { user } = useUser();
  const uid = user?.id;

  const { data: missions = [], isLoading } = useQuery({
    queryKey: [...qk.missions.scout, 'hints', uid] as const,
    queryFn: () => getUserMissions(uid!),
    enabled: !!uid,
    staleTime: THIRTY_SEC,
  });

  const hints = uid ? filterByContext(missions, context) : [];

  return { hints, isLoading };
}
