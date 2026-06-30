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
  // Slice 469/D-38: THROW statt return [] — sonst cached React Query [] als SUCCESS
  // (kein Retry, kein Error-State; Admin saehe leere Sponsor-Stats ohne Fehler). common-errors §1.
  if (error) throw new Error(error.message);
  return (data ?? []) as SponsorStatsSummary[];
}

export function useSponsorStats(days: number = 30) {
  return useQuery({
    queryKey: qk.sponsors.stats(days),
    queryFn: () => fetchSponsorStats(days),
    staleTime: FIVE_MIN,
  });
}
