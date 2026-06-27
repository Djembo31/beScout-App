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
  'noMatchingOrders', 'invalidPrice', 'maxPriceExceeded', 'minPriceExceeded', 'eventNotFound', 'eventEnded',
  'eventGameweekNotFound', 'playerLockedRemove', 'playerLockedAdd', 'duplicatePlayer',
  'lineupDeleteFailed', 'lineupSizeMismatch', 'playerNotInClub',
  'walletError', 'bountyCreateFailed', 'bountyCancelFailed',
  'bountyRewardMinimum', 'bountyRewardMaximum', 'bountyDeadlineInvalid',
  'bountyMaxSubmissionsInvalid', 'bountyTitleRequired', 'bountyDescriptionRequired',
  'dailyTradeLimit', 'circularTradeBlocked', 'cancelCooldown', 'orderRateLimit',
  'researchWeeklyCap', 'cosmeticAlreadyOwned', 'cosmeticOutOfStock',
  'ipoMisconfigured',
  // Slice 412 (Welle 1.5f) — Money-RPC Idempotenz-Replay (Rapid-Doppelklick im
  // 300s-Fenster): RPC gibt 'idempotency_pending' zurück → freundliche „wird
  // verarbeitet"-Meldung statt generischem Fehler.
  'idempotencyPending',
  // Mystery Box (J5F-06 / J5B-13 / AR-49)
  'mysteryBoxDailyLimit', 'mysteryBoxNotEnoughTickets', 'mysteryBoxPaidDisabled',
  // Missions (J7B-06 / J7B-13)
  'missionAlreadyClaimed', 'missionNotCompleted', 'missionNotFound', 'notAuthenticated',
  // J8 Healer (FIX-03) — Sell-flow / Cancel-flow raw RPC strings
  'orderCannotBeCancelled',
  // J11 Healer (FIX-07) — Equipment RPC error strings
  'equipmentNotAvailable', 'lineupNotFound', 'slotEmpty', 'positionMismatch',
  'lineupLocked', 'noEquipmentOnSlot', 'equipmentSaveFailed',
  // Slice 192 — Holdings ghost-row defensive guards
  'ghost_holding_row', 'holdings_ghost_all',
  // Slice 195d — Bench + Auto-Sub validation
  'bench_gk_position_mismatch', 'bench_overlaps_starter', 'bench_not_in_holdings',
  'bench_duplicate', 'invalid_bench_order',
  // Slice 347 — Fan-Rang-Schwellen (FRE-5)
  'fanRankThresholdsNotAdmin', 'fanRankThresholdsInvalidValues',
  // Slice 356 — Exklusive Treue-Umfragen + Poll-Vote-Fehler (vorher silent false-success)
  'fanRankTooLow', 'pollAlreadyVoted', 'pollCannotVoteOwn', 'pollClosed',
  // Slice 380 (E-1) — Liga-gebundenes Event: Spieler nicht aus der Event-Liga
  'playerNotInEventLeague',
  // Slice 393 (E-3) — Aufstellungs-Regel-Rejects (rpc_save_lineup, snake_case passthrough)
  'min_per_own_club_not_met', 'age_max_exceeded', 'age_min_not_met',
  'min_per_position_not_met', 'max_per_position_exceeded',
  'mv_max_exceeded', 'mv_min_not_met',
  'nation_not_allowed', 'max_per_nation_exceeded',
  // Slice 395 — restliche rpc_save_lineup-Rejects (Entry-State/Formation/Wildcard/Salary/Bench),
  // snake_case passthrough. Strukturell gleiche Codes sind gruppiert via ERROR_MAP (s.u.).
  'event_locked', 'must_enter_first', 'invalid_event_no_league',
  'gk_required', 'captain_slot_empty',
  'wildcards_not_allowed', 'too_many_wildcards', 'salary_cap_exceeded',
  'max_per_club_exceeded',
  'bench_player_not_found', 'bench_outfield_position_mismatch',
  // Slice 397 (E-4b) — create_user_event / cancel_user_event Rejects (snake_case passthrough).
  // auth_uid_mismatch / insufficient_balance / event_not_found / not_authorized mappen
  // bereits via ERROR_MAP → hier nur die übrigen Form-/State-Codes.
  'name_required', 'invalid_entry_fee', 'invalid_gameweek', 'invalid_locks_at',
  'invalid_reward_structure', 'reward_structure_not_100', 'invalid_min_entries',
  'min_gt_max', 'wallet_not_found', 'not_user_event', 'event_not_open',
  // Slice 399 (E-4b Teil 2): set_user_event_create_fee-Reject (Admin-Gebühr).
  'invalid_amount',
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
  [/min.price.exceeded|preis.*zu.*niedrig|price.*too.*low/i, 'minPriceExceeded'],
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
  [/player.not.in.event.league/i, 'playerNotInEventLeague'],

  // Slice 395 — rpc_save_lineup-Rejects: strukturell gleiche Codes → ein Key.
  // Anker auf exakte snake_case-Codes (kein .*-Wildcard) → kein Fremd-Match.
  [/invalid_formation|extra_slot_for_formation|invalid_slot_count_(def|mid|att)/i, 'lineupFormationInvalid'],
  [/wildcard_slot_invalid|wildcard_slot_empty/i, 'wildcardSlotInvalid'],
  [/unknown_lineup_rule|invalid_lineup_rule_value/i, 'lineupRuleInvalid'],
  // Reuse bestehender Keys (kein neuer String nötig):
  [/auth_mismatch/i, 'permissionDenied'],
  [/insufficient_sc/i, 'notEnoughDpc'],

  // Offers
  [/offer.*expired/i, 'offerExpired'],
  [/offer.*already/i, 'offerAlreadyHandled'],

  // Bounties
  [/bounty.*creat.*fail/i, 'bountyCreateFailed'],
  [/bounty.*cancel.*fail|cancel.*fail/i, 'bountyCancelFailed'],
  [/reward.*at.least|reward.*min(imum)?|min(imum)?.*reward/i, 'bountyRewardMinimum'],
  [/reward.*exceed|reward.*max(imum)?|max(imum)?.*reward/i, 'bountyRewardMaximum'],
  [/deadline.*(must|invalid|range)/i, 'bountyDeadlineInvalid'],
  [/max.*submission.*(must|invalid|range)/i, 'bountyMaxSubmissionsInvalid'],
  [/title.*(is.*required|required)/i, 'bountyTitleRequired'],
  [/description.*(is.*required|required)/i, 'bountyDescriptionRequired'],

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

  // Slice 412 (Welle 1.5f) — Idempotenz-Replay (Money-RPC Doppelklick-Schutz)
  [/idempotency_pending|idempotent.?replay/i, 'idempotencyPending'],

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

  // Slice 331 — Event-Prize-Escrow: Treasury reicht nicht für den Gewinn-Topf
  [/treasury_insufficient_for_event_prize/i, 'eventPrizeTreasuryInsufficient'],

  // Slice 332 — Club-Bounty-Escrow
  [/treasury_insufficient_for_bounty/i, 'bountyTreasuryInsufficient'],
  [/not_club_admin_for_bounty/i, 'bountyNotClubAdmin'],

  // Slice 347 — Fan-Rang-Schwellen (FRE-5)
  [/not_club_admin/i, 'fanRankThresholdsNotAdmin'],
  [/invalid_thresholds/i, 'fanRankThresholdsInvalidValues'],

  // Slice 356 — cast_community_poll_vote wirft jetzt bei !success (vorher silent false-success).
  // RPC-Bodies werfen DE-Prosa — hier auf i18n-Keys mappen.
  [/fan_rank_too_low/i, 'fanRankTooLow'],
  [/nicht.genug.bsd|nicht.genug.sc/i, 'insufficientBalance'],
  [/bereits.abgestimmt|already.voted/i, 'pollAlreadyVoted'],
  [/eigene.umfrage|own.poll/i, 'pollCannotVoteOwn'],
  [/umfrage.*(beendet|nicht.aktiv)|poll.*(ended|not.active)/i, 'pollClosed'],
  [/umfrage.nicht.gefunden|poll.not.found/i, 'notFound'],
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
