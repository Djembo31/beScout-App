'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { supabase } from '@/lib/supabaseClient';
import type { SponsorStatsSummary } from '@/types';

const FIVE_MIN = 5 * 60 * 1000;

async function fetchSponsorStats(days: number): Promise<SponsorStatsSummary[]> {
  const { data, error } = await supabase.rpc('get_sponsor_stats_summary', {
    p_days: days,
  });
  if (error) {
    console.error('[SponsorStats] fetch failed:', error);
    return [];
  }
  return (data ?? []) as SponsorStatsSummary[];
}

export function useSponsorStats(days: number = 30) {
  return useQuery({
    queryKey: qk.sponsors.stats(days),
    queryFn: () => fetchSponsorStats(days),
    staleTime: FIVE_MIN,
  });
}
