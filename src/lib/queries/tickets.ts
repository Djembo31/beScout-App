'use client';

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getUserTickets, getTicketTransactions } from '@/lib/services/tickets';

const THIRTY_SEC = 30 * 1000;

// ============================================
// Slice 265 — Cold-Start localStorage Mirror (matches useWallet pattern)
// ============================================
// On Mobile-Safari cold-start the ticket-balance fetch hangs in the query-
// storm queue. Mirror last-known balance to localStorage so TopBar shows
// it instantly while the real fetch runs in background. User-Switch-Detect
// in AuthProvider (Slice 260) sweeps `bs_tickets_*` keys via extended
// lsClear().
const LS_TICKETS_PREFIX = 'bs_tickets_';

function lsGetTickets(userId: string): { balance: number } | null {
  try {
    const raw = localStorage.getItem(`${LS_TICKETS_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.balance !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function lsSetTickets(userId: string, balance: number): void {
  try {
    localStorage.setItem(`${LS_TICKETS_PREFIX}${userId}`, JSON.stringify({ balance }));
  } catch (err) {
    console.error('[useUserTickets] lsSetTickets quota exceeded:', err);
  }
}

/** Fetch the user's ticket balance */
export function useUserTickets(userId: string | undefined, active = true) {
  return useQuery({
    queryKey: qk.tickets.balance(userId!),
    queryFn: async () => {
      const result = await getUserTickets(userId!);
      // Slice 265: mirror to localStorage for next cold-start
      if (userId && result?.balance != null) {
        lsSetTickets(userId, result.balance);
      }
      return result;
    },
    // Slice 265: cold-start placeholder — TopBar shows last-known balance
    // instantly instead of empty
    initialData: () => {
      if (!userId) return undefined;
      const cached = lsGetTickets(userId);
      if (!cached) return undefined;
      return { balance: cached.balance };
    },
    initialDataUpdatedAt: 0,
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
