import { describe, it, expect } from 'vitest';
import { getStreakBenefits, getStreakBenefitLabels } from './streakBenefits';

// ============================================
// getStreakBenefits — tier boundary tests
// ============================================

describe('getStreakBenefits', () => {
  it('day 0: 5 tickets, no bonuses', () => {
    const b = getStreakBenefits(0);
    expect(b.dailyTickets).toBe(5);
    expect(b.fantasyBonusPct).toBe(0);
    expect(b.eloBoostPct).toBe(0);
    expect(b.freeMysteryBoxesPerWeek).toBe(0);
    expect(b.mysteryBoxTicketDiscount).toBe(0);
  });

  it('day 3: still base tier (5 tickets)', () => {
    const b = getStreakBenefits(3);
    expect(b.dailyTickets).toBe(5);
    expect(b.fantasyBonusPct).toBe(0);
    expect(b.mysteryBoxTicketDiscount).toBe(0);
  });

  it('day 4: 10 tickets + mystery box discount', () => {
    const b = getStreakBenefits(4);
    expect(b.dailyTickets).toBe(10);
    expect(b.fantasyBonusPct).toBe(0);
    expect(b.eloBoostPct).toBe(0);
    expect(b.freeMysteryBoxesPerWeek).toBe(0);
    expect(b.mysteryBoxTicketDiscount).toBe(1);
  });

  it('day 7: 15 tickets + 5% fantasy bonus + mystery box discount', () => {
    const b = getStreakBenefits(7);
    expect(b.dailyTickets).toBe(15);
    expect(b.fantasyBonusPct).toBe(0.05);
    expect(b.eloBoostPct).toBe(0);
    expect(b.freeMysteryBoxesPerWeek).toBe(0);
    expect(b.mysteryBoxTicketDiscount).toBe(1);
  });

  it('day 14: 20 tickets + 10% elo boost', () => {
    const b = getStreakBenefits(14);
    expect(b.dailyTickets).toBe(20);
    expect(b.fantasyBonusPct).toBe(0.05);
    expect(b.eloBoostPct).toBe(10);
    expect(b.freeMysteryBoxesPerWeek).toBe(0);
    expect(b.mysteryBoxTicketDiscount).toBe(1);
  });

  it('day 30: 25 tickets + free mystery box', () => {
    const b = getStreakBenefits(30);
    expect(b.dailyTickets).toBe(25);
    expect(b.fantasyBonusPct).toBe(0.05);
    expect(b.eloBoostPct).toBe(10);
    expect(b.freeMysteryBoxesPerWeek).toBe(1);
    expect(b.mysteryBoxTicketDiscount).toBe(1);
  });

  it('day 60: 30 tickets + 15% fantasy bonus', () => {
    const b = getStreakBenefits(60);
    expect(b.dailyTickets).toBe(30);
    expect(b.fantasyBonusPct).toBe(0.15);
    expect(b.eloBoostPct).toBe(10);
    expect(b.freeMysteryBoxesPerWeek).toBe(1);
    expect(b.mysteryBoxTicketDiscount).toBe(1);
  });

  it('day 90: 40 tickets + all benefits', () => {
    const b = getStreakBenefits(90);
    expect(b.dailyTickets).toBe(40);
    expect(b.fantasyBonusPct).toBe(0.15);
    expect(b.eloBoostPct).toBe(10);
    expect(b.freeMysteryBoxesPerWeek).toBe(1);
    expect(b.mysteryBoxTicketDiscount).toBe(1);
  });

  it('day 365: same as 90+ tier', () => {
    const b = getStreakBenefits(365);
    expect(b.dailyTickets).toBe(40);
    expect(b.fantasyBonusPct).toBe(0.15);
    expect(b.eloBoostPct).toBe(10);
    expect(b.freeMysteryBoxesPerWeek).toBe(1);
    expect(b.mysteryBoxTicketDiscount).toBe(1);
  });

  it('mid-tier values (day 10 = day 7 tier)', () => {
    const b = getStreakBenefits(10);
    expect(b.dailyTickets).toBe(15);
    expect(b.fantasyBonusPct).toBe(0.05);
  });

  it('mid-tier values (day 45 = day 30 tier)', () => {
    const b = getStreakBenefits(45);
    expect(b.dailyTickets).toBe(25);
    expect(b.freeMysteryBoxesPerWeek).toBe(1);
  });
});

// ============================================
// getStreakBenefitLabels — German labels
// ============================================

describe('getStreakBenefitLabels', () => {
  it('base tier: only ticket label', () => {
    const labels = getStreakBenefitLabels(0);
    expect(labels).toEqual(['+5 Tickets/Tag']);
  });

  it('day 4: tickets + mystery box discount', () => {
    const labels = getStreakBenefitLabels(4);
    expect(labels).toEqual([
      '+10 Tickets/Tag',
      '-1 Ticket Rabatt auf Mystery Boxes',
    ]);
  });

  it('day 7: tickets + fantasy bonus + discount', () => {
    const labels = getStreakBenefitLabels(7);
    expect(labels).toEqual([
      '+15 Tickets/Tag',
      '+5% Fantasy-Bonus',
      '-1 Ticket Rabatt auf Mystery Boxes',
    ]);
  });

  it('day 14: adds elo boost', () => {
    const labels = getStreakBenefitLabels(14);
    expect(labels).toContain('+10% Elo-Gewinn');
    expect(labels).toHaveLength(4);
  });

  it('day 90: all 5 labels', () => {
    const labels = getStreakBenefitLabels(90);
    expect(labels).toEqual([
      '+40 Tickets/Tag',
      '+15% Fantasy-Bonus',
      '+10% Elo-Gewinn',
      '1 gratis Mystery Box/Woche',
      '-1 Ticket Rabatt auf Mystery Boxes',
    ]);
  });
});
