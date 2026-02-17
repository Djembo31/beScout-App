'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getIncomingOffers } from '@/lib/services/offers';

const ONE_MIN = 60 * 1000;

export function useIncomingOffers(userId: string | undefined) {
  return useQuery({
    queryKey: qk.offers.incoming(userId!),
    queryFn: () => getIncomingOffers(userId!),
    enabled: !!userId,
    staleTime: ONE_MIN,
    select: (data) => data.filter(o => o.status === 'pending'),
  });
}
