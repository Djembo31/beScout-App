// ============================================
// In-memory TTL cache with request deduplication
// ============================================

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

/** Race a promise against a timeout. Rejects with Error('Timeout') on expiry. */
export function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout')), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

/**
 * Return cached data if fresh, otherwise call fn() and cache result.
 * Deduplicates: if the same key is requested while a fetch is in-flight,
 * all callers share the same Promise instead of firing N requests.
 * Internal 10s timeout prevents hanging fetches.
 */
export async function cached<T>(key: string, fn: () => Promise<T>, ttlMs: number): Promise<T> {
  // 1. Cache hit
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (entry && Date.now() < entry.expiresAt) {
    return entry.data;
  }

  // 2. Deduplicate: reuse in-flight request
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  // 3. Cache miss — fetch with timeout, cache, clean up
  const promise = withTimeout(fn(), 10000)
    .then((data) => {
      store.set(key, { data, expiresAt: Date.now() + ttlMs });
      inflight.delete(key);
      return data;
    })
    .catch((err) => {
      inflight.delete(key);
      throw err;
    });

  inflight.set(key, promise);
  return promise;
}

/** Delete all cache entries whose key starts with prefix */
export function invalidate(prefix: string): void {
  Array.from(store.keys()).forEach((key) => {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  });
}

/** Clear entire cache */
export function invalidateAll(): void {
  store.clear();
}

/** Invalidate caches affected by social/reputation actions */
export function invalidateSocialData(userId: string): void {
  invalidate(`userStats:${userId}`);
  invalidate(`achievements:${userId}`);
  invalidate(`followers:${userId}`);
  invalidate(`following:${userId}`);
  invalidate('leaderboard:');
  invalidate(`profile:${userId}`);
}

/** Invalidate caches affected by research actions */
export function invalidateResearchData(userId?: string): void {
  invalidate('research:');
  invalidate('trackRecord:');
  if (userId) {
    invalidate(`researchUnlocks:${userId}`);
    invalidate(`wallet:${userId}`);
    invalidate(`transactions:${userId}`);
  }
}

/** Invalidate caches affected by community poll actions */
export function invalidatePollData(userId?: string): void {
  invalidate('communityPolls:');
  if (userId) {
    invalidate(`pollVotedIds:${userId}`);
    invalidate(`wallet:${userId}`);
    invalidate(`transactions:${userId}`);
  }
}

/** Invalidate caches affected by notification actions */
export function invalidateNotifications(userId: string): void {
  invalidate(`notifications:${userId}`);
  invalidate(`unreadCount:${userId}`);
}

/** Invalidate caches affected by club data changes */
export function invalidateClubData(clubId?: string): void {
  if (clubId) {
    invalidate(`club:${clubId}`);
    invalidate(`clubDashboard:${clubId}`);
    invalidate(`votes:${clubId}`);
    invalidate(`players:club:${clubId}`);
  } else {
    invalidate('club:');
    invalidate('clubs:');
    invalidate('clubDashboard:');
  }
}

/** Invalidate caches affected by a trade action */
export function invalidateTradeData(playerId: string, userId?: string): void {
  // Player data — always invalidate list caches
  invalidate('players:');
  if (playerId) {
    invalidate(`player:${playerId}`);
    invalidate(`sellOrders:${playerId}`);
    invalidate(`pbt:${playerId}`);
    invalidate(`pbtTx:${playerId}`);
  }
  // Orders
  invalidate('orders:');
  // Wallet & holdings
  if (userId) {
    invalidate(`wallet:${userId}`);
    invalidate(`holdings:${userId}`);
    invalidate(`transactions:${userId}`);
    invalidate(`userTrades:${userId}`);
  }
  // IPO
  invalidate('ipos:');
}
