import { QueryClient, keepPreviousData } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,       // 2 min — matches current service TTLs
      // Slice 261: gcTime 10min → 24h to align with persist maxAge. The persist-
      // Cache only restores queries that are still in gc-window — without this
      // bump, queries gc'd from memory (10min) would not be re-hydrated even if
      // localStorage still has them.
      gcTime: 24 * 60 * 60 * 1000,    // 24h garbage collection (matches persist maxAge upper bound)
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
      refetchOnWindowFocus: false,      // keep current behaviour
      placeholderData: keepPreviousData, // show stale data instead of skeleton during refetch
    },
  },
});
