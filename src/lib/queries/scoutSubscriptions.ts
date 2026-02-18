'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { isSubscribedToScout, getSubscribedScoutIds, getCreatorConfig } from '@/lib/services/scoutSubscriptions';

const FIVE_MIN = 5 * 60 * 1000;

/** Check if user is subscribed to a specific scout */
export function useIsSubscribedToScout(userId: string | undefined, scoutId: string) {
  return useQuery({
    queryKey: qk.scoutSubs.isSubscribed(userId ?? '', scoutId),
    queryFn: () => isSubscribedToScout(userId!, scoutId),
    staleTime: FIVE_MIN,
    enabled: !!userId && !!scoutId && userId !== scoutId,
  });
}

/** Get all scout IDs user is subscribed to (for content blanking) */
export function useSubscribedScoutIds(userId: string | undefined) {
  return useQuery({
    queryKey: qk.scoutSubs.subscribedIds(userId ?? ''),
    queryFn: () => getSubscribedScoutIds(userId!),
    staleTime: FIVE_MIN,
    enabled: !!userId,
  });
}

/** Get creator config */
export function useCreatorConfig() {
  return useQuery({
    queryKey: qk.scoutSubs.config,
    queryFn: getCreatorConfig,
    staleTime: FIVE_MIN,
  });
}
