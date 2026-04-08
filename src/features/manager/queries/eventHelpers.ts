import type { FantasyEvent } from '@/features/fantasy/types';

/**
 * Find the default event to auto-select for the Aufstellen tab.
 *
 * Priority order:
 * 1. First event the user already joined AND is currently running
 * 2. First event the user already joined (any status)
 * 3. First running event (anyone can pick it)
 * 4. First registering event
 * 5. First late-reg event
 * 6. First event in the list (degenerate fallback)
 *
 * Returns null only for empty input.
 *
 * Pure function — separated from eventQueries.ts so it can be unit-tested
 * without pulling in React Query / Supabase / providers.
 */
export function pickDefaultEvent(events: FantasyEvent[]): FantasyEvent | null {
  if (events.length === 0) return null;
  return (
    events.find((e) => e.isJoined && e.status === 'running') ||
    events.find((e) => e.isJoined) ||
    events.find((e) => e.status === 'running') ||
    events.find((e) => e.status === 'registering') ||
    events.find((e) => e.status === 'late-reg') ||
    events[0] ||
    null
  );
}
