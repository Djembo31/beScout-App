/**
 * Maps raw error strings (from RPCs, Supabase, etc.) to i18n keys.
 * Used by useErrorToast hook to show user-friendly German/Turkish messages.
 */

const ERROR_MAP: [RegExp, string][] = [
  // Trading
  [/insufficient.balance|nicht.gen[üu]gend|not.enough.funds/i, 'insufficientBalance'],
  [/player.is.liquidated|spieler.liquidiert/i, 'playerLiquidated'],
  [/not.enough.dpc|keine.dpc/i, 'notEnoughDpc'],
  [/order.not.found/i, 'orderNotFound'],
  [/cannot.buy.own/i, 'cannotBuyOwn'],

  // Fantasy
  [/already.joined|bereits.angemeldet/i, 'alreadyJoined'],
  [/event.*(full|voll)|max.*participant/i, 'eventFull'],
  [/event.*closed|anmeldung.*geschlossen/i, 'eventClosed'],
  [/lineup.*incomplete|aufstellung.*unvollst/i, 'lineupIncomplete'],

  // Offers
  [/offer.*expired|angebot.*abgelaufen/i, 'offerExpired'],
  [/offer.*already/i, 'offerAlreadyHandled'],

  // Auth / General
  [/already.exists|existiert.bereits/i, 'alreadyExists'],
  [/not.found|nicht.gefunden/i, 'notFound'],
  [/permission.denied|keine.berechtigung|not.authorized/i, 'permissionDenied'],
  [/rate.limit|zu.viele/i, 'rateLimited'],
  [/network|netzwerk|fetch.failed|failed.to.fetch/i, 'networkError'],
  [/timeout/i, 'timeout'],

  // Subscription
  [/subscription.*required|abo.*ben[öo]tigt/i, 'subscriptionRequired'],
  [/min.*tier/i, 'tierTooLow'],
];

/**
 * Maps a raw error string to an i18n key in the `errors` namespace.
 * Returns the key (without namespace prefix).
 */
export function mapErrorToKey(raw: string): string {
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
