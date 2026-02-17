'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getActiveIpos } from '@/lib/services/ipo';

const FIVE_MIN = 5 * 60 * 1000;

export function useActiveIpos() {
  return useQuery({
    queryKey: qk.ipos.active,
    queryFn: getActiveIpos,
    staleTime: FIVE_MIN,
  });
}
