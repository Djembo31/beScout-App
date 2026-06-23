'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getCommunityPolls } from '@/lib/services/communityPolls';

const TWO_MIN = 2 * 60 * 1000;

export function useCommunityPolls(clubId?: string, viewerId?: string) {
  return useQuery({
    // Slice 356: viewerId im Key — exklusive Poll-Sperre (viewer_locked) ist betrachter-spezifisch.
    queryKey: qk.polls.list(clubId, viewerId),
    queryFn: () => getCommunityPolls(clubId, viewerId),
    staleTime: TWO_MIN,
  });
}
