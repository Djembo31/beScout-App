'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from '@/lib/queries/keys';
import { getIncomingOffers, getOpenBids } from '@/lib/services/offers';

const ONE_MIN = 60 * 1000;

export function useIncomingOffers(userId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: qk.offers.incoming(userId!),
    queryFn: () => getIncomingOffers(userId!),
    enabled: !!userId && (options?.enabled ?? true),
    staleTime: ONE_MIN,
    select: (data) => data.filter(o => o.status === 'pending'),
  });
}

/** All open public bids (receiver_id = null, pending) — used to show demand in Bestand */
export function useOpenBids() {
  return useQuery({
    queryKey: qk.offers.openBids,
    queryFn: () => getOpenBids(),
    staleTime: ONE_MIN,
  });
}
