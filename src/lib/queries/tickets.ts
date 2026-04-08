'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getUserTickets, getTicketTransactions } from '@/lib/services/tickets';

const THIRTY_SEC = 30 * 1000;

/** Fetch the user's ticket balance */
export function useUserTickets(userId: string | undefined, active = true) {
  return useQuery({
    queryKey: qk.tickets.balance(userId!),
    queryFn: () => getUserTickets(userId!),
    enabled: !!userId && active,
    staleTime: THIRTY_SEC,
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
