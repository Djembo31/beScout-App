'use client';

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getUserTickets, getTicketTransactions } from '@/lib/services/tickets';
import { writeCached } from '@/lib/utils/cachedQuery';
import { useCachedPlaceholder } from '@/lib/hooks/useCachedPlaceholder';

const THIRTY_SEC = 30 * 1000;

type UserTicketsData = Awaited<ReturnType<typeof getUserTickets>>;

/**
 * Fetch the user's ticket balance.
 *
 * Slice 268: Cold-Start placeholderData aus UID-keyed localStorage-Slot.
 * placeholderData (NICHT initialData) → dataUpdatedAt bleibt 0 bis Real-Fetch.
 * staleTime: 0 stellt sicher dass Background-Refetch immer läuft.
 */
export function useUserTickets(userId: string | undefined, active = true) {
  // Slice 474: post-mount-gated cache read (SSR-safe). See useCachedPlaceholder
  // — Slice 472 made userId present server-side, so a synchronous first-render
  // readCached would diverge (server undefined vs client cached "856") → #418.
  const placeholder = useCachedPlaceholder<UserTicketsData>('bs_tickets', userId);

  return useQuery({
    queryKey: qk.tickets.balance(userId!),
    queryFn: async () => {
      const data = await getUserTickets(userId!);
      if (data && userId) writeCached('bs_tickets', userId, data);
      return data;
    },
    enabled: !!userId && active,
    staleTime: 0,
    placeholderData: placeholder,
  });
}

/** Fetch ticket transaction history */
export function useTicketTransactions(
  userId: string | undefined,
  opts: { limit?: number; enabled?: boolean } = {},
) {
  const { limit = 50, enabled = true } = opts;
  return useQuery({
    queryKey: qk.tickets.transactions(userId!, limit),
    queryFn: () => getTicketTransactions(userId!, limit),
    enabled: !!userId && enabled,
    staleTime: THIRTY_SEC,
  });
}

/** Offset-paginated ticket-transaction history. Use for the /transactions page. */
export function useInfiniteTicketTransactions(
  userId: string | undefined,
  pageSize = 50,
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: qk.tickets.transactionsInfinite(userId!, pageSize),
    queryFn: ({ pageParam }) => getTicketTransactions(userId!, pageSize, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < pageSize ? undefined : allPages.length * pageSize,
    enabled: !!userId && enabled,
    staleTime: THIRTY_SEC,
  });
}
