// @vitest-environment node

import { describe, it, expect } from 'vitest';
import { computePlayerFloor, computeHoldingPnL } from '@/lib/playerMath';

describe('computePlayerFloor', () => {
  const baseplayer = {
    listings: [],
    prices: { floor: 0, referencePrice: 0 } as {
      floor?: number | null;
      referencePrice?: number | null;
    },
  };

  it('returns Math.min of listings when listings exist', () => {
    const p = {
      listings: [{ price: 300 }, { price: 150 }, { price: 200 }],
      prices: { floor: 500, referencePrice: 600 },
    };
    expect(computePlayerFloor(p)).toBe(150);
  });

  it('falls back to prices.floor when listings empty', () => {
    const p = { ...baseplayer, prices: { floor: 250, referencePrice: 400 } };
    expect(computePlayerFloor(p)).toBe(250);
  });

  it('falls back to prices.referencePrice when floor is null', () => {
    const p = { ...baseplayer, prices: { floor: null, referencePrice: 400 } };
    expect(computePlayerFloor(p)).toBe(400);
  });

  it('falls back to 0 when both floor and referencePrice are null', () => {
    const p = { ...baseplayer, prices: { floor: null, referencePrice: null } };
    expect(computePlayerFloor(p)).toBe(0);
  });

  it('returns 0 for empty listings and undefined prices', () => {
    const p = { listings: [], prices: {} };
    expect(computePlayerFloor(p)).toBe(0);
  });
});

describe('computeHoldingPnL', () => {
  it('computes positive PnL when floor > avgBuyPrice', () => {
    const result = computeHoldingPnL(500, { avgBuyPriceBsd: 400, quantity: 10 });
    expect(result.pnl).toBe(1000); // (500-400)*10
    expect(result.pnlPct).toBe(25); // ((500-400)/400)*100
    expect(result.up).toBe(true);
  });

  it('computes negative PnL when floor < avgBuyPrice', () => {
    const result = computeHoldingPnL(300, { avgBuyPriceBsd: 400, quantity: 5 });
    expect(result.pnl).toBe(-500); // (300-400)*5
    expect(result.pnlPct).toBe(-25);
    expect(result.up).toBe(false);
  });

  it('returns zero PnL when floor equals avgBuyPrice', () => {
    const result = computeHoldingPnL(400, { avgBuyPriceBsd: 400, quantity: 1 });
    expect(result.pnl).toBe(0);
    expect(result.pnlPct).toBe(0);
    expect(result.up).toBe(true); // pnl >= 0
  });

  it('returns pnlPct=0 when avgBuyPrice is 0 (division guard)', () => {
    const result = computeHoldingPnL(500, { avgBuyPriceBsd: 0, quantity: 5 });
    expect(result.pnl).toBe(2500); // (500-0)*5
    expect(result.pnlPct).toBe(0); // guard: avgBuyPriceBsd=0
    expect(result.up).toBe(true);
  });
});
