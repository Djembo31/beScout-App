import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,       // 2 min — matches current service TTLs
      gcTime: 10 * 60 * 1000,          // 10 min garbage collection
      retry: 1,
      refetchOnWindowFocus: false,      // keep current behaviour
    },
  },
});
