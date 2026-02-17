/**
 * Centralised Query-Key factory.
 * Every React Query cache entry uses keys from here — makes invalidation predictable.
 */

export const qk = {
  // ── Players ──
  players: {
    all: ['players'] as const,
    byId: (id: string) => ['players', id] as const,
    byClub: (cid: string) => ['players', 'club', cid] as const,
  },

  // ── Holdings / Wallet ──
  holdings: {
    byUser: (uid: string) => ['holdings', uid] as const,
  },

  // ── Orders ──
  orders: {
    all: ['orders'] as const,
    byPlayer: (pid: string) => ['orders', pid] as const,
  },

  // ── Events ──
  events: {
    all: ['events'] as const,
    byClub: (cid: string) => ['events', 'club', cid] as const,
    joinedIds: (uid: string) => ['events', 'joinedIds', uid] as const,
    usage: (uid: string) => ['events', 'usage', uid] as const,
    activeGw: (cid: string) => ['events', 'activeGw', cid] as const,
  },

  // ── User Stats ──
  userStats: {
    byUser: (uid: string) => ['userStats', uid] as const,
  },

  // ── IPOs ──
  ipos: {
    active: ['ipos', 'active'] as const,
  },

  // ── Watchlist ──
  watchlist: {
    byUser: (uid: string) => ['watchlist', uid] as const,
  },

  // ── Trending ──
  trending: {
    top: (n: number) => ['trending', n] as const,
  },

  // ── Leaderboard ──
  leaderboard: {
    top: (n: number) => ['leaderboard', n] as const,
  },

  // ── Trades ──
  trades: {
    global: (n: number) => ['trades', 'global', n] as const,
    byPlayer: (pid: string) => ['trades', pid] as const,
    topTraders: (n: number) => ['trades', 'topTraders', n] as const,
  },

  // ── Social ──
  social: {
    feed: (uid: string) => ['social', 'feed', uid] as const,
    followerCount: (uid: string) => ['social', 'followerCount', uid] as const,
    followingCount: (uid: string) => ['social', 'followingCount', uid] as const,
    followingIds: (uid: string) => ['social', 'followingIds', uid] as const,
  },

  // ── Posts ──
  posts: {
    list: (p?: Record<string, unknown>) => ['posts', p] as const,
  },

  // ── Research ──
  research: {
    list: (p?: Record<string, unknown>) => ['research', p] as const,
  },

  // ── Bounties ──
  bounties: {
    active: ['bounties', 'active'] as const,
    forUser: (uid: string, clubId?: string) => ['bounties', uid, clubId] as const,
  },

  // ── Votes ──
  votes: {
    byClub: (cid: string) => ['votes', cid] as const,
  },

  // ── Notifications ──
  notifications: {
    byUser: (uid: string) => ['notifications', uid] as const,
    unread: (uid: string) => ['notifications', 'unread', uid] as const,
  },

  // ── Offers ──
  offers: {
    incoming: (uid: string) => ['offers', 'incoming', uid] as const,
    outgoing: (uid: string) => ['offers', 'outgoing', uid] as const,
  },

  // ── Transactions ──
  transactions: {
    byUser: (uid: string, n: number) => ['transactions', uid, n] as const,
  },

  // ── Price Histories ──
  priceHist: {
    all: (n: number) => ['priceHist', n] as const,
  },

  // ── DPC of the Week ──
  dpcOfWeek: ['dpcOfWeek'] as const,

  // ── Missions ──
  missions: {
    scout: ['missions', 'scout'] as const,
    progress: (uid: string, gw: number) => ['missions', uid, gw] as const,
  },

  // ── Polls ──
  polls: {
    list: (clubId?: string) => ['polls', clubId] as const,
  },

  // ── Club Admin ──
  clubAdmin: {
    check: (uid: string, cid: string) => ['clubAdmin', uid, cid] as const,
  },

  // ── Club Detail ──
  clubs: {
    bySlug: (slug: string, uid?: string) => ['clubs', slug, uid] as const,
    followers: (cid: string) => ['clubs', 'followers', cid] as const,
    isFollowing: (uid: string, cid: string) => ['clubs', 'isFollowing', uid, cid] as const,
    recentTrades: (cid: string) => ['clubs', 'recentTrades', cid] as const,
    subscription: (uid: string, cid: string) => ['clubs', 'subscription', uid, cid] as const,
    votedIds: (uid: string) => ['clubs', 'votedIds', uid] as const,
  },

  // ── PBT ──
  pbt: {
    byPlayer: (pid: string) => ['pbt', pid] as const,
  },

  // ── Liquidation ──
  liquidation: {
    byPlayer: (pid: string) => ['liquidation', pid] as const,
  },

  // ── Scoring ──
  scoring: {
    gwScores: (pid: string) => ['scoring', 'gwScores', pid] as const,
  },
} as const;
