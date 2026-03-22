// Streak Compound Benefits — tiered rewards that grow with streak length
//
// Consumption points:
//   dailyTickets           → streaks.ts recordLoginStreak (credits tickets on login)
//   fantasyBonusPct        → TODO: score_event RPC should multiply lineup score by (1 + pct)
//   eloBoostPct            → TODO: calculate_fan_rank RPC should apply boost to score components
//   freeMysteryBoxesPerWeek → MysteryBoxModal hasFreeBox prop (Home + Missions pages)
//   mysteryBoxTicketDiscount→ MysteryBoxModal ticketDiscount prop (Home + Missions pages)
//   getStreakBenefitLabels  → DailyChallengeCard + Missions page streak banner

export interface StreakBenefits {
  dailyTickets: number;
  fantasyBonusPct: number;        // 0 | 0.05 | 0.15
  eloBoostPct: number;            // 0 | 10
  freeMysteryBoxesPerWeek: number; // 0 | 1
  mysteryBoxTicketDiscount: number; // 0 | 1
}

/** Tiers sorted descending by minDays — first match wins */
const STREAK_TIERS: readonly {
  minDays: number;
  dailyTickets: number;
  fantasyBonusPct: number;
  eloBoostPct: number;
  freeMysteryBoxesPerWeek: number;
  mysteryBoxTicketDiscount: number;
}[] = [
  { minDays: 90, dailyTickets: 40, fantasyBonusPct: 0.15, eloBoostPct: 10, freeMysteryBoxesPerWeek: 1, mysteryBoxTicketDiscount: 1 },
  { minDays: 60, dailyTickets: 30, fantasyBonusPct: 0.15, eloBoostPct: 10, freeMysteryBoxesPerWeek: 1, mysteryBoxTicketDiscount: 1 },
  { minDays: 30, dailyTickets: 25, fantasyBonusPct: 0.05, eloBoostPct: 10, freeMysteryBoxesPerWeek: 1, mysteryBoxTicketDiscount: 1 },
  { minDays: 14, dailyTickets: 20, fantasyBonusPct: 0.05, eloBoostPct: 10, freeMysteryBoxesPerWeek: 0, mysteryBoxTicketDiscount: 1 },
  { minDays: 7,  dailyTickets: 15, fantasyBonusPct: 0.05, eloBoostPct: 0,  freeMysteryBoxesPerWeek: 0, mysteryBoxTicketDiscount: 1 },
  { minDays: 4,  dailyTickets: 10, fantasyBonusPct: 0,    eloBoostPct: 0,  freeMysteryBoxesPerWeek: 0, mysteryBoxTicketDiscount: 1 },
  { minDays: 0,  dailyTickets: 5,  fantasyBonusPct: 0,    eloBoostPct: 0,  freeMysteryBoxesPerWeek: 0, mysteryBoxTicketDiscount: 0 },
];

/** Get compound benefits for a given streak length */
export function getStreakBenefits(streakDays: number): StreakBenefits {
  const tier = STREAK_TIERS.find(t => streakDays >= t.minDays) ?? STREAK_TIERS[STREAK_TIERS.length - 1];
  return {
    dailyTickets: tier.dailyTickets,
    fantasyBonusPct: tier.fantasyBonusPct,
    eloBoostPct: tier.eloBoostPct,
    freeMysteryBoxesPerWeek: tier.freeMysteryBoxesPerWeek,
    mysteryBoxTicketDiscount: tier.mysteryBoxTicketDiscount,
  };
}

/** Human-readable list of active benefits for display.
 *  Accepts a translator function t(key, params) for i18n support. */
export function getStreakBenefitLabels(
  streakDays: number,
  t?: (key: string, params?: Record<string, unknown>) => string,
): string[] {
  const b = getStreakBenefits(streakDays);
  const labels: string[] = [];
  const fmt = t ?? ((key: string, p?: Record<string, unknown>) => {
    // Fallback: German hardcoded (backward compat)
    if (key === 'streakTickets') return `+${p?.n} Tickets/Tag`;
    if (key === 'streakFantasy') return `+${p?.n}% Fantasy-Bonus`;
    if (key === 'streakElo') return `+${p?.n}% Elo-Gewinn`;
    if (key === 'streakMysteryBox') return `${p?.n} gratis Mystery Box/Woche`;
    if (key === 'streakMysteryDiscount') return `-${p?.n} Ticket Rabatt auf Mystery Boxes`;
    return key;
  });
  labels.push(fmt('streakTickets', { n: b.dailyTickets }));
  if (b.fantasyBonusPct > 0) labels.push(fmt('streakFantasy', { n: Math.round(b.fantasyBonusPct * 100) }));
  if (b.eloBoostPct > 0) labels.push(fmt('streakElo', { n: b.eloBoostPct }));
  if (b.freeMysteryBoxesPerWeek > 0) labels.push(fmt('streakMysteryBox', { n: b.freeMysteryBoxesPerWeek }));
  if (b.mysteryBoxTicketDiscount > 0) labels.push(fmt('streakMysteryDiscount', { n: b.mysteryBoxTicketDiscount }));
  return labels;
}
