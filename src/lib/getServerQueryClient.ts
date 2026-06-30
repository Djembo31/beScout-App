import { QueryClient } from '@tanstack/react-query';
import { cache } from 'react';

/**
 * Per-Request Server-QueryClient für RSC-Server-Prefetch (Slice 471, W6 Phase 1).
 *
 * React `cache()` ist **per-Request-scoped** → kein Daten-Leak zwischen Requests
 * (im Gegensatz zum Client-Singleton in `queryClient.ts`, der pro Browser-Tab lebt).
 * Server-Components rufen `getServerQueryClient()` → `prefetchQuery(...)` → `dehydrate(qc)`
 * und reichen das via `<HydrationBoundary state={...}>` an die Client-Komponente; deren
 * `useQuery` mit demselben Key hydratet sofort ohne Netzwerk-Roundtrip.
 *
 * Pattern: TanStack-v5 advanced-ssr (context7-verifiziert, 2026-06-30).
 */
export const getServerQueryClient = cache(() => new QueryClient());
