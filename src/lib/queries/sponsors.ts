'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getSponsorForPlacement } from '@/lib/services/sponsors';
import type { SponsorPlacement } from '@/types';

const TEN_MIN = 10 * 60 * 1000;

export function useSponsor(placement: SponsorPlacement, clubId?: string | null) {
  const scope = clubId ?? 'global';
  return useQuery({
    queryKey: qk.sponsors.byPlacement(placement, scope),
    queryFn: () => getSponsorForPlacement(placement, clubId),
    staleTime: TEN_MIN,
  });
}
