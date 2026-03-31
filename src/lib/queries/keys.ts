/**
 * Centralised Query-Key factory.
 * Every React Query cache entry uses keys from here — makes invalidation predictable.
 */

export const qk = {
  // ── Players ──
  players: {
    all: ['players'] as const,
    names: ['players', 'names'] as const,
    byId: (id: string) => ['players', id] as const,
    byClub: (cid: string) => ['players', 'club', cid] as const,
  },

  // ── Holdings / Wallet ──
  holdings: {
    byUser: (uid: string) => ['holdings', uid] as const,
    qty: (uid: string, pid: string) => ['holdings', 'qty', uid, pid] as const,
    holderCount: (pid: string) => ['holdings', 'holderCount', pid] as const,
  },

  // ── Orders ──
  orders: {
    all: ['orders'] as const,
    buy: ['orders', 'buy'] as const,
    byPlayer: (pid: string) => ['orders', pid] as const,
  },

  // ── Events ──
  events: {
    all: ['events', 'list'] as const,
    byClub: (cid: string) => ['events', 'club', cid] as const,
    joinedIds: (uid: string) => ['events', 'joinedIds', uid] as const,
    enteredIds: (uid: string) => ['events', 'enteredIds', uid] as const,
    entry: (eventId: string, uid: string) => ['events', 'entry', eventId, uid] as const,
    usage: (uid: string) => ['events', 'usage', uid] as const,
    holdingLocks: (uid: string) => ['events', 'holdingLocks', uid] as const,
    wildcardBalance: (uid: string) => ['events', 'wildcardBalance', uid] as const,
    activeGw: (cid: string) => ['events', 'activeGw', cid] as const,
    leagueGw: ['events', 'leagueGw'] as const,
  },

  // ── Platform Settings ──
  platformSettings: {
    scoutEvents: ['platform_settings', 'scout_events_enabled'] as const,
  },

  // ── User Stats ──
  userStats: {
    byUser: (uid: string) => ['userStats', uid] as const,
  },

  // ── IPOs ──
  ipos: {
    active: ['ipos', 'active'] as const,
    announced: ['ipos', 'announced'] as const,
    recentlyEnded: ['ipos', 'recently-ended'] as const,
    byPlayer: (pid: string) => ['ipos', 'player', pid] as const,
    purchases: (uid: string, ipoId: string) => ['ipos', 'purchases', uid, ipoId] as const,
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
    stats: (uid: string) => ['social', 'stats', uid] as const,
  },

  // ── Posts ──
  posts: {
    all: ['posts'] as const,
    list: (p?: Record<string, unknown>) => ['posts', p] as const,
  },

  // ── Research ──
  research: {
    all: ['research'] as const,
    list: (p?: Record<string, unknown>) => ['research', p] as const,
    sentiment: (pid: string) => ['research', 'sentiment', pid] as const,
  },

  // ── Bounties ──
  bounties: {
    all: ['bounties'] as const,
    active: ['bounties', 'active'] as const,
    forUser: (uid: string, clubId?: string) => ['bounties', uid, clubId] as const,
  },

  // ── Votes ──
  votes: {
    all: ['votes'] as const,
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
    bids: (pid: string) => ['offers', 'bids', pid] as const,
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
    all: ['polls'] as const,
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

  // ── Fan Wishes ──
  fanWishes: {
    mine: () => ['fanWishes', 'mine'] as const,
    all: () => ['fanWishes', 'all'] as const,
  },

  // ── Liquidation ──
  liquidation: {
    byPlayer: (pid: string) => ['liquidation', pid] as const,
  },

  // ── Scoring ──
  scoring: {
    gwScores: (pid: string) => ['scoring', 'gwScores', pid] as const,
    matchTimeline: (pid: string) => ['scoring', 'matchTimeline', pid] as const,
    batchForm: ['scoring', 'batchForm'] as const,
  },

  // ── Fixtures (Manager Data) ──
  fixtures: {
    recentMinutes: ['fixtures', 'recentMinutes'] as const,
    recentScores: ['fixtures', 'recentScores'] as const,
    nextByClub: ['fixtures', 'nextByClub'] as const,
    next: ['fixtures', 'next'] as const,
    byClub: (cid: string) => ['fixtures', 'club', cid] as const,
  },

  // ── Sponsors ──
  sponsors: {
    all: ['sponsors'] as const,
    byPlacement: (placement: string, scope: string) => ['sponsors', placement, scope] as const,
    stats: (days: number) => ['sponsors', 'stats', days] as const,
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

  // ── Scouting ──
  scouting: {
    summaries: (cid: string) => ['scouting', 'summaries', cid] as const,
    topScouts: (cid: string, n: number) => ['scouting', 'topScouts', cid, n] as const,
    userStats: (uid: string) => ['scouting', 'user-stats', uid] as const,
    prestige: (cid: string) => ['scouting', 'prestige', cid] as const,
    globalTopScouts: (n: number) => ['scouting', 'globalTop', n] as const,
  },

  // ── Predictions ──
  predictions: {
    byUserGw: (uid: string, gw: number) => ['predictions', uid, gw] as const,
    resolved: (uid: string) => ['predictions', 'resolved', uid] as const,
    stats: (uid: string) => ['predictions', 'stats', uid] as const,
    countGw: (uid: string, gw: number) => ['predictions', 'count', uid, gw] as const,
    fixtures: (gw: number) => ['predictions', 'fixtures', gw] as const,
  },

  // ── Founding Passes ──
  foundingPasses: {
    list: (uid: string) => ['founding-passes', uid] as const,
    highest: (uid: string) => ['founding-passes', 'highest', uid] as const,
  },

  // ── Tickets ──
  tickets: {
    balance: (uid: string) => ['tickets', uid] as const,
    transactions: (uid: string, limit?: number) => ['tickets', 'transactions', uid, limit] as const,
  },

  // ── Daily Challenges ──
  dailyChallenge: {
    today: () => ['daily-challenge', 'today'] as const,
    history: (userId: string, limit?: number) => ['daily-challenge', 'history', userId, limit] as const,
  },

  // ── Fan Rankings ──
  fanRanking: {
    user: (userId: string, clubId: string) => ['fan-ranking', userId, clubId] as const,
    leaderboard: (clubId: string, limit?: number) => ['fan-ranking', 'leaderboard', clubId, limit] as const,
  },

  // ── Cosmetics ──
  cosmetics: {
    user: (userId: string) => ['cosmetics', userId] as const,
    equipped: (userId: string) => ['cosmetics', 'equipped', userId] as const,
    all: () => ['cosmetics', 'all'] as const,
  },

  // ── Mystery Box ──
  mysteryBox: {
    history: (userId: string, limit?: number) => ['mystery-box', userId, limit] as const,
  },

  // ── Chips (Gamification v5 Phase C) ──
  chips: {
    event: (eventId: string) => ['chips', 'event', eventId] as const,
    season: (season: string) => ['chips', 'season', season] as const,
  },

  // ── Club Challenges (B10: Fan Rewards) ──
  clubChallenges: {
    byClub: (clubId: string) => ['club-challenges', clubId] as const,
  },

  // ── Economy Config ──
  economy: {
    elo: ['economy', 'elo'] as const,
    rang: ['economy', 'rang'] as const,
    scoreRoad: ['economy', 'scoreRoad'] as const,
    managerPoints: ['economy', 'managerPoints'] as const,
    streak: ['economy', 'streak'] as const,
    missions: ['economy', 'missions'] as const,
  },
} as const;
