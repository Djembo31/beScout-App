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
  'rateLimited', 'networkError', 'timeout', 'subscriptionRequired', 'earlyAccessRequired', 'tierTooLow',
  'invalidQuantity', 'maxQuantityExceeded', 'playerNotFound', 'clubAdminRestricted',
  'noMatchingOrders', 'invalidPrice', 'maxPriceExceeded', 'eventNotFound', 'eventEnded',
  'eventGameweekNotFound', 'playerLockedRemove', 'playerLockedAdd', 'duplicatePlayer',
  'lineupDeleteFailed', 'lineupSizeMismatch', 'playerNotInClub',
  'walletError', 'bountyCreateFailed', 'bountyCancelFailed',
  'dailyTradeLimit', 'circularTradeBlocked', 'cancelCooldown', 'orderRateLimit',
  'researchWeeklyCap', 'cosmeticAlreadyOwned', 'cosmeticOutOfStock',
  'ipoMisconfigured',
  // Mystery Box (J5F-06 / J5B-13 / AR-49)
  'mysteryBoxDailyLimit', 'mysteryBoxNotEnoughTickets', 'mysteryBoxPaidDisabled',
  // Missions (J7B-06 / J7B-13)
  'missionAlreadyClaimed', 'missionNotCompleted', 'missionNotFound', 'notAuthenticated',
  // J8 Healer (FIX-03) — Sell-flow / Cancel-flow raw RPC strings
  'orderCannotBeCancelled',
  // J11 Healer (FIX-07) — Equipment RPC error strings
  'equipmentNotAvailable', 'lineupNotFound', 'slotEmpty', 'positionMismatch',
  'lineupLocked', 'noEquipmentOnSlot', 'equipmentSaveFailed',
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
  [/max.price.exceeded|preis.*berschreitet|price.*exceeds/i, 'maxPriceExceeded'],
  [/player.not.found/i, 'playerNotFound'],

  // J8 Healer (FIX-03) — Sell-flow + Cancel-flow raw RPC strings → keys
  // RPC-Bodies wirfen DE-Strings wie "Keine SCs zum Verkaufen", "Verkaeufer hat
  // nicht genug SCs", "Nur X SC verfuegbar (Y in Events gesperrt)" — diese
  // wuerden bisher 'generic' werden statt 'notEnoughDpc'.
  [/keine.*sc.*zum.*verkaufen|no.*sc.*to.*sell/i, 'notEnoughDpc'],
  [/verk.{1,3}ufer.*nicht.*genug|seller.*not.*enough/i, 'notEnoughDpc'],
  [/nur.*sc.*verf.{1,3}gbar|in.*events.*gesperrt|locked.*in.*event/i, 'notEnoughDpc'],
  [/order.*kann.*nicht.*storniert|cannot.*cancel.*order/i, 'orderCannotBeCancelled'],

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
  [/ipo_misconfigured/i, 'ipoMisconfigured'],
  [/early.?access/i, 'earlyAccessRequired'],
  [/subscription.*required/i, 'subscriptionRequired'],
  [/min.*tier/i, 'tierTooLow'],

  // Mystery Box (J5F-06 / J5B-13 / AR-49) — raw RPC strings → i18n keys
  [/daily.?free.?limit.?reached|daily.*box.*claimed/i, 'mysteryBoxDailyLimit'],
  [/not.?enough.?tickets|insufficient.?tickets/i, 'mysteryBoxNotEnoughTickets'],
  [/paid.mystery.box.disabled/i, 'mysteryBoxPaidDisabled'],

  // Missions (J7B-06 / J7B-13) — RPC error strings → i18n keys
  // claim_mission_reward returns: "Mission already claimed" | "Mission not completed" |
  // "Mission not found" | "auth_uid_mismatch: Nicht berechtigt" | "Nicht authentifiziert"
  [/mission.*already.*claim|already.*claimed/i, 'missionAlreadyClaimed'],
  [/mission.*not.*completed|not.*yet.*completed/i, 'missionNotCompleted'],
  [/mission.*not.*found/i, 'missionNotFound'],
  [/auth.*uid.*mismatch|nicht.berechtigt|nicht.authentifiziert|not.authenticated/i, 'notAuthenticated'],

  // Equipment (J11F-07 / J11B-03) — RPC error strings from equip_to_slot /
  // unequip_from_slot → i18n keys (J3/J4 pattern). Matches DE+TR+EN.
  [/equipment.*not.*available|ekipman.*bulunamadı|equipment.*nicht.*verfügbar/i, 'equipmentNotAvailable'],
  [/no.*lineup.*found|kadro.*bulunamadı|kein.*lineup.*gefunden/i, 'lineupNotFound'],
  [/no.*equipment.*on.*this.*slot|slotta.*donanım.*yok|kein.*equipment.*auf.*slot/i, 'noEquipmentOnSlot'],
  [/slot.*is.*empty|slot.*boş|slot.*leer/i, 'slotEmpty'],
  [/position.*mismatch|pozisyon.*uyumsuz|position.*passt.*nicht/i, 'positionMismatch'],
  [/lineup.*is.*locked|kadro.*kilitli|lineup.*gesperrt/i, 'lineupLocked'],
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
