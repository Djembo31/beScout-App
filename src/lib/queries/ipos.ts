'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getActiveIpos, getAnnouncedIpos, getRecentlyEndedIpos } from '@/lib/services/ipo';

const FIVE_MIN = 5 * 60 * 1000;

export function useActiveIpos(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: qk.ipos.active,
    queryFn: getActiveIpos,
    staleTime: FIVE_MIN,
    enabled: options?.enabled ?? true,
  });
}

export function useAnnouncedIpos(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: qk.ipos.announced,
    queryFn: getAnnouncedIpos,
    staleTime: FIVE_MIN,
    enabled: options?.enabled ?? true,
  });
}

export function useRecentlyEndedIpos(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: qk.ipos.recentlyEnded,
    queryFn: getRecentlyEndedIpos,
    staleTime: FIVE_MIN,
    enabled: options?.enabled ?? true,
  });
}
