import { queryClient } from '@/lib/queryClient';
import { qk } from '@/lib/queries/keys';

/** After user joins an event */
export async function invalidateAfterJoin(userId: string): Promise<void> {
  queryClient.invalidateQueries({ queryKey: qk.tickets.balance(userId) });
  queryClient.invalidateQueries({ queryKey: qk.events.usage(userId) });
  queryClient.invalidateQueries({ queryKey: qk.events.holdingLocks(userId) });
  queryClient.invalidateQueries({ queryKey: qk.holdings.byUser(userId) });
  await queryClient.invalidateQueries({ queryKey: qk.events.all });
  fetch('/api/events?bust=1').catch(err => console.error('[Fantasy] Event cache bust failed:', err));
}

/** After user leaves an event */
export async function invalidateAfterLeave(userId: string): Promise<void> {
  queryClient.invalidateQueries({ queryKey: qk.tickets.balance(userId) });
  queryClient.invalidateQueries({ queryKey: qk.events.usage(userId) });
  queryClient.invalidateQueries({ queryKey: qk.events.holdingLocks(userId) });
  queryClient.invalidateQueries({ queryKey: qk.holdings.byUser(userId) });
  await queryClient.invalidateQueries({ queryKey: qk.events.all });
  fetch('/api/events?bust=1').catch(err => console.error('[Fantasy] Event cache bust failed:', err));
}

/** After lineup saved */
export async function invalidateAfterLineupSave(userId: string, clubId?: string): Promise<void> {
  queryClient.invalidateQueries({ queryKey: qk.events.wildcardBalance(userId) });
  await invalidateFantasyQueriesCore(userId, clubId);
}

/** After scoring/reset/simulation */
export async function invalidateAfterScoring(clubId?: string): Promise<void> {
  await invalidateFantasyQueriesCore(undefined, clubId);
}

/** Internal core invalidation */
async function invalidateFantasyQueriesCore(userId?: string, clubId?: string): Promise<void> {
  queryClient.invalidateQueries({ queryKey: qk.events.leagueGw });
  if (clubId) queryClient.invalidateQueries({ queryKey: qk.events.activeGw(clubId) });
  const critical: Promise<void>[] = [queryClient.invalidateQueries({ queryKey: qk.events.all })];
  if (userId) {
    critical.push(
      queryClient.invalidateQueries({ queryKey: qk.events.joinedIds(userId) }),
      queryClient.invalidateQueries({ queryKey: qk.events.enteredIds(userId) }),
      queryClient.invalidateQueries({ queryKey: qk.events.usage(userId) }),
      queryClient.invalidateQueries({ queryKey: qk.events.holdingLocks(userId) }),
      queryClient.invalidateQueries({ queryKey: qk.holdings.byUser(userId) }),
    );
  }
  await Promise.all(critical);
}
