'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getResearchPosts } from '@/lib/services/research';

const TWO_MIN = 2 * 60 * 1000;

export function useResearchPosts(userId: string | undefined) {
  return useQuery({
    queryKey: qk.research.list({ currentUserId: userId }),
    queryFn: () => getResearchPosts({ currentUserId: userId }),
    enabled: !!userId,
    staleTime: TWO_MIN,
  });
}

export function useClubResearch(clubId: string | undefined, userId?: string) {
  return useQuery({
    queryKey: qk.research.list({ clubId, currentUserId: userId }),
    queryFn: () => getResearchPosts({ clubId, currentUserId: userId }),
    enabled: !!clubId,
    staleTime: TWO_MIN,
  });
}

export function usePlayerResearch(playerId: string | undefined, userId?: string) {
  return useQuery({
    queryKey: qk.research.list({ playerId, currentUserId: userId }),
    queryFn: () => getResearchPosts({ playerId, currentUserId: userId }),
    enabled: !!playerId,
    staleTime: TWO_MIN,
  });
}
