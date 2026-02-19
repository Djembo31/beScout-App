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

  // ── Fixtures (Manager Data) ──
  fixtures: {
    recentMinutes: ['fixtures', 'recentMinutes'] as const,
    recentScores: ['fixtures', 'recentScores'] as const,
    nextByClub: ['fixtures', 'nextByClub'] as const,
    byClub: (cid: string) => ['fixtures', 'club', cid] as const,
  },

  // ── Sponsors ──
  sponsors: {
    all: ['sponsors'] as const,
    byPlacement: (placement: string, scope: string) => ['sponsors', placement, scope] as const,
  },

  // ── Tips ──
  tips: {
    byContent: (type: string, id: string) => ['tips', type, id] as const,
    received: (uid: string) => ['tips', 'received', uid] as const,
  },

  // ── Scout Subscriptions ──
  scoutSubs: {
    isSubscribed: (uid: string, scoutId: string) => ['scoutSubs', uid, scoutId] as const,
    mySubs: (uid: string) => ['scoutSubs', 'my', uid] as const,
    mySubscribers: (uid: string) => ['scoutSubs', 'subscribers', uid] as const,
    subscribedIds: (uid: string) => ['scoutSubs', 'ids', uid] as const,
    config: ['scoutSubs', 'config'] as const,
  },

  // ── Gamification (Scout Scores — 3 Dimensions) ──
  gamification: {
    scoutScores: (uid: string) => ['gamification', 'scoutScores', uid] as const,
    scoreRoad: (uid: string) => ['gamification', 'scoreRoad', uid] as const,
    leaderboardByDim: (dim: string, n: number) => ['gamification', 'leaderboard', dim, n] as const,
  },

  // ── DPC Mastery ──
  mastery: {
    byUserPlayer: (uid: string, pid: string) => ['mastery', uid, pid] as const,
    byUser: (uid: string) => ['mastery', 'all', uid] as const,
  },

  // ── Airdrop ──
  airdrop: {
    score: (uid: string) => ['airdrop', 'score', uid] as const,
    leaderboard: (n: number) => ['airdrop', 'leaderboard', n] as const,
    stats: ['airdrop', 'stats'] as const,
  },

  // ── Creator Fund ──
  creatorFund: {
    stats: ['creatorFund', 'stats'] as const,
    payouts: (uid: string) => ['creatorFund', 'payouts', uid] as const,
  },
} as const;
