'use client';

import { useQuery } from '@tanstack/react-query';
import { getCronHealthStatus, type CronHealthStatus } from '@/lib/services/cronHealth';
import { qk } from './keys';

/**
 * useCronHealth (Slice 256 — UI-Sentinel)
 *
 * Polls cron-health every 5 minutes. Shared cache across all consumers
 * (StalePipelineBanner on /fantasy + /market) — single Network-Call serves both.
 *
 * - staleTime 5min: minimal Network-Pressure, drift wird in Minuten erkannt nicht Sekunden
 * - refetchOnWindowFocus false: Banner-state-flicker beim Tab-Switch vermeiden
 * - retry 1: Transient Errors graceful (Service returnt healthy bei Error sowieso)
 */
export function useCronHealth() {
  return useQuery<CronHealthStatus>({
    queryKey: qk.system.cronHealth,
    queryFn: getCronHealthStatus,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
