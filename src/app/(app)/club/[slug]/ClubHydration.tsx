'use client';

import { HydrationBoundary, type DehydratedState } from '@tanstack/react-query';

/**
 * Slice 476 — Client-Wrapper um `HydrationBoundary`.
 *
 * Bug (Slice 471): `HydrationBoundary` direkt im Server-Component `page.tsx` zu
 * importieren resolved zum **legacy**-Build von @tanstack/react-query, während der
 * `QueryClientProvider` (Client) den **modern**-Build nutzt. Zwei Builds = zwei
 * React-Context-Instanzen → `useQueryClient()` in der legacy-HydrationBoundary
 * findet den modern-Provider nicht → »No QueryClient set« → die gesamte
 * /club/[slug]-Page crasht in die Error-Boundary (seit 471 live, undetektiert).
 *
 * Indem die HydrationBoundary in eine `'use client'`-Datei wandert, resolved sie
 * zum modern-Build (identisch zum Provider) → Context matcht. `dehydrate()` bleibt
 * im Server-Component (braucht den prefetch-befüllten Server-QueryClient); der
 * serialisierte `DehydratedState` ist build-agnostisches JSON und wird vom
 * modern-`hydrate` korrekt konsumiert.
 */
export function ClubHydration({
  state,
  children,
}: {
  state: DehydratedState;
  children: React.ReactNode;
}) {
  return <HydrationBoundary state={state}>{children}</HydrationBoundary>;
}
