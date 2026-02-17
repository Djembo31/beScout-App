'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getAllActiveBounties } from '@/lib/services/bounties';

const TWO_MIN = 2 * 60 * 1000;

export function useActiveBounties(userId: string | undefined, clubId?: string) {
  return useQuery({
    queryKey: qk.bounties.forUser(userId!, clubId),
    queryFn: () => getAllActiveBounties(userId, clubId),
    enabled: !!userId,
    staleTime: TWO_MIN,
  });
}
