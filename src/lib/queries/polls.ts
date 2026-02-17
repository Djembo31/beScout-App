'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getCommunityPolls } from '@/lib/services/communityPolls';

const TWO_MIN = 2 * 60 * 1000;

export function useCommunityPolls(clubId?: string) {
  return useQuery({
    queryKey: qk.polls.list(clubId),
    queryFn: () => getCommunityPolls(clubId),
    staleTime: TWO_MIN,
  });
}
