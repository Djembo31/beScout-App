import { QueryClient, keepPreviousData, isServer } from '@tanstack/react-query';

function makeQueryClient(): QueryClient {
  return new QueryClient({
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
}

let browserQueryClient: QueryClient | undefined;

/**
 * Slice 471 (W6 Phase 1): request-scoped auf dem Server, Singleton im Browser.
 *
 * Server → FRISCHE Instanz pro Render: beim SSR-Prefetch + `<HydrationBoundary>`
 * darf der QueryClient NICHT requestübergreifend geteilt sein (sonst Cross-Request-
 * Daten-Leak + Memory-Akkumulation bei gcTime 24h — Reviewer-Finding 471). React `isServer`.
 * Browser → stabiler Singleton (überlebt Re-Renders; imperatives invalidate/clear bleibt
 * konsistent, weil `queryClient` unten denselben Singleton referenziert).
 */
export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

/**
 * Client-seitiger Singleton für imperative Nutzung (Services/Hooks: invalidate/clear/setQueryData).
 * Im Browser identisch mit `getQueryClient()` → EINE Wahrheit (Provider + Imperatives teilen die Instanz).
 * Auf dem Server existiert die Instanz nach Modul-Load, wird aber von Server-Code nicht genutzt
 * (Imperatives läuft client-only); der Provider nimmt dort via `getQueryClient()` einen frischen Client.
 */
export const queryClient = getQueryClient();
