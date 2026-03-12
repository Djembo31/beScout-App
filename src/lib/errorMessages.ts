/**
 * Maps raw error strings (from RPCs, Supabase, etc.) to i18n keys.
 * Used by useErrorToast hook to show user-friendly translated messages.
 *
 * Service layer throws error KEY strings directly (e.g. 'invalidQuantity').
 * mapErrorToKey() passes known keys through, or regex-matches raw errors.
 */

/** All known error keys in the `errors` i18n namespace */
const KNOWN_KEYS = new Set([
  'generic', 'insufficientBalance', 'playerLiquidated', 'notEnoughDpc', 'orderNotFound',
  'cannotBuyOwn', 'alreadyJoined', 'eventFull', 'eventClosed', 'lineupIncomplete',
  'offerExpired', 'offerAlreadyHandled', 'alreadyExists', 'notFound', 'permissionDenied',
  'rateLimited', 'networkError', 'timeout', 'subscriptionRequired', 'tierTooLow',
  'invalidQuantity', 'maxQuantityExceeded', 'playerNotFound', 'clubAdminRestricted',
  'noMatchingOrders', 'invalidPrice', 'maxPriceExceeded', 'eventNotFound', 'eventEnded',
  'eventGameweekNotFound', 'playerLockedRemove', 'playerLockedAdd', 'duplicatePlayer',
  'lineupDeleteFailed', 'lineupSizeMismatch', 'playerNotInClub',
  'walletError', 'bountyCreateFailed', 'bountyCancelFailed',
  'dailyTradeLimit', 'circularTradeBlocked', 'cancelCooldown', 'orderRateLimit',
  'researchWeeklyCap', 'cosmeticAlreadyOwned', 'cosmeticOutOfStock',
]);

const ERROR_MAP: [RegExp, string][] = [
  // Trading
  [/insufficient.balance|not.enough.funds/i, 'insufficientBalance'],
  [/player.is.liquidated/i, 'playerLiquidated'],
  [/not.enough.dpc/i, 'notEnoughDpc'],
  [/order.not.found/i, 'orderNotFound'],
  [/cannot.buy.own/i, 'cannotBuyOwn'],
  [/club.?admin.*restrict/i, 'clubAdminRestricted'],
  [/no.matching.orders|no.open.orders/i, 'noMatchingOrders'],
  [/t.gliches.handelslimit|daily.*trade.*limit|max.*20.*trades/i, 'dailyTradeLimit'],
  [/verd.chtiges.handelsmuster|circular.*trade|same.*partner/i, 'circularTradeBlocked'],
  [/erst.nach.*sekunden|erst.nach.*minuten|cancel.*cooldown/i, 'cancelCooldown'],
  [/max.*10.*verkaufsorders|order.*rate.*limit/i, 'orderRateLimit'],
  [/invalid.quantity/i, 'invalidQuantity'],
  [/max.quantity.exceeded|exceeds.*limit/i, 'maxQuantityExceeded'],
  [/invalid.price/i, 'invalidPrice'],
  [/max.price.exceeded/i, 'maxPriceExceeded'],
  [/player.not.found/i, 'playerNotFound'],

  // Fantasy / Lineups
  [/already.joined/i, 'alreadyJoined'],
  [/event.*full|max.*participant/i, 'eventFull'],
  [/event.*closed/i, 'eventClosed'],
  [/event.*ended/i, 'eventEnded'],
  [/event.*not.found/i, 'eventNotFound'],
  [/event.*gameweek.*not.found/i, 'eventGameweekNotFound'],
  [/lineup.*incomplete/i, 'lineupIncomplete'],
  [/lineup.*delete.*fail/i, 'lineupDeleteFailed'],
  [/player.*locked.*remove|cannot.*remove.*locked/i, 'playerLockedRemove'],
  [/player.*locked.*add|cannot.*add.*locked/i, 'playerLockedAdd'],
  [/duplicate.player/i, 'duplicatePlayer'],
  [/lineup.*size.*mismatch/i, 'lineupSizeMismatch'],
  [/player.*not.*in.*club/i, 'playerNotInClub'],

  // Offers
  [/offer.*expired/i, 'offerExpired'],
  [/offer.*already/i, 'offerAlreadyHandled'],

  // Bounties
  [/bounty.*creat.*fail/i, 'bountyCreateFailed'],
  [/bounty.*cancel.*fail|cancel.*fail/i, 'bountyCancelFailed'],

  // Wallet
  [/wallet.*error|wallet.*fail/i, 'walletError'],

  // Auth / General
  [/already.exists/i, 'alreadyExists'],
  [/not.found/i, 'notFound'],
  [/permission.denied|not.authorized/i, 'permissionDenied'],
  [/rate.limit/i, 'rateLimited'],
  [/network|fetch.failed|failed.to.fetch/i, 'networkError'],
  [/timeout/i, 'timeout'],

  // Economy / Limits
  [/research.weekly.cap|max.*3.*research.*post/i, 'researchWeeklyCap'],
  [/already.owned/i, 'cosmeticAlreadyOwned'],
  [/out.of.stock/i, 'cosmeticOutOfStock'],

  // Subscription
  [/subscription.*required/i, 'subscriptionRequired'],
  [/min.*tier/i, 'tierTooLow'],
];

/**
 * Maps a raw error string to an i18n key in the `errors` namespace.
 * If the input is already a known key, returns it as-is (pass-through).
 * Otherwise regex-matches against ERROR_MAP.
 */
export function mapErrorToKey(raw: string): string {
  if (KNOWN_KEYS.has(raw)) return raw;
  for (const [pattern, key] of ERROR_MAP) {
    if (pattern.test(raw)) return key;
  }
  return 'generic';
}

/**
 * Normalizes an unknown error into a string.
 */
export function normalizeError(err: unknown): string {
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
  return 'Unknown error';
}
